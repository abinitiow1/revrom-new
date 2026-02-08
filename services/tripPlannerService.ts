import type { ItineraryDay, Trip } from '../types';
import { geoapifyGeocode, geoapifyPlacesNearby, type GeoapifyPlace } from './geoapifyService';
import type { GeoPoint } from './geoapifyService';
import { extractRouteFromAdminItinerary } from './tripPlanner/routeExtractor';
import { compressRoute } from './tripPlanner/routeCompressor';
import { buildDayPlans, buildHumanTitle } from './tripPlanner/narrativeGenerator';
import { attachRequestedPlaces } from './tripPlanner/suggestionEngine';
import { allocatePois } from './tripPlanner/poiAllocator';
import { geocodeCached as geocodeCachedV2 } from './tripPlanner/geoCache';
import { normalizeText } from './tripPlanner/text';
import type { InterestTag, PlannedDay, PlannedItinerary, PlannedStop } from './tripPlanner/plannerTypes';

export type { InterestTag, PlanItemSource, PlannedDay, PlannedItinerary, PlannedStop } from './tripPlanner/plannerTypes';

type RouteDayType = 'arrival' | 'stay' | 'transfer' | 'departure';
type RouteDaySlot = { type: RouteDayType; location: string };

const isGeoPoint = (v: unknown): v is GeoPoint => {
  if (!v || typeof v !== 'object') return false;
  const anyV = v as any;
  return typeof anyV.lat === 'number' && Number.isFinite(anyV.lat) && typeof anyV.lon === 'number' && Number.isFinite(anyV.lon);
};

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const withTimeout = async <T>(p: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const stripParens = (s: string) => String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();

const cleanLocationFragment = (s: string) => {
  let out = stripParens(s);
  out = out.split(/\bvia\b/i)[0]?.trim() || out;
  out = out.replace(/[|/\\]+/g, ' ');
  out = out.replace(/^(day\s*\d+\s*[:\\-]\s*)/i, '');
  out = out.replace(/^(arrival|arrive|drive|ride|transfer|travel|journey|return|back|explore|visit)\b[:\\-–—]?\s*/i, '');
  out = out.replace(/^(to|in|at|from)\b[:\\-–—]?\s*/i, '');
  out = out.replace(/\s+/g, ' ').trim();
  if (out.length > 70) out = out.slice(0, 70).trim();
  return out;
};

const isMeaningfulLocationText = (s: string) => {
  const t = String(s || '').trim();
  if (t.length < 2) return false;
  if (!/[a-zA-Z]/.test(t)) return false;
  const bad = ['day', 'explore', 'arrival', 'departure', 'ride', 'transfer', 'journey', 'travel', 'acclimatization'];
  if (bad.includes(normalize(t))) return false;
  return true;
};

const parseTransferTitle = (title: string): { from?: string; to: string } | null => {
  const t = stripParens(title);
  if (!t) return null;

  let m = t.match(/^(.+?)\s*(?:→|->)\s*(.+?)$/);
  if (m) {
    const from = cleanLocationFragment(m[1]);
    const to = cleanLocationFragment(m[2]);
    if (to) return { from: from || undefined, to };
    return null;
  }

  m = t.match(/^(.+?)\s+\bto\b\s+(.+?)$/i);
  if (m) {
    const from = cleanLocationFragment(m[1]);
    const to = cleanLocationFragment(m[2]);
    if (to) return { from: from || undefined, to };
    return null;
  }

  m = t.match(/\b(return|back)\s+\bto\b\s+(.+?)$/i);
  if (m) {
    const to = cleanLocationFragment(m[2]);
    if (to) return { to };
  }

  return null;
};

const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
};

const sampleIndicesEvenly = (availableCount: number, takeCount: number): number[] => {
  if (availableCount <= 0 || takeCount <= 0) return [];
  if (takeCount >= availableCount) return Array.from({ length: availableCount }).map((_, i) => i);
  if (takeCount === 1) return [Math.floor(availableCount / 2)];

  const out: number[] = [];
  for (let i = 0; i < takeCount; i++) {
    const t = i / (takeCount - 1);
    const idx = Math.round(t * (availableCount - 1));
    out.push(idx);
  }

  // De-dupe + fill in any gaps deterministically.
  const uniq = Array.from(new Set(out)).sort((a, b) => a - b);
  if (uniq.length === takeCount) return uniq;

  const used = new Set(uniq);
  for (let i = 0; i < availableCount && uniq.length < takeCount; i++) {
    if (used.has(i)) continue;
    uniq.push(i);
  }
  uniq.sort((a, b) => a - b);
  return uniq.slice(0, takeCount);
};

const selectAdminItineraryDays = (baseTrip: Trip, requestedDays: number): { days: PlannedDay[]; total: number; sampled: boolean } => {
  const sorted = (baseTrip.itinerary || [])
    .slice()
    .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
    .filter((d) => (d.day ?? 0) >= 1);

  const total = sorted.length;
  const take = Math.min(total, Math.max(1, requestedDays));

  // If we need to shorten an admin itinerary, keep the first and last day (often "arrival"/"departure")
  // and sample the middle days evenly to avoid dropping the "departure" day.
  const sampled = take < total;
  const selectedIndices = (() => {
    if (!sampled) return Array.from({ length: take }).map((_, i) => i);
    if (take === 1) return [0];
    if (take === 2) return [0, total - 1];

    const middleCount = total - 2;
    const needFromMiddle = take - 2;
    const middlePick = sampleIndicesEvenly(middleCount, needFromMiddle).map((i) => i + 1);
    return [0, ...middlePick, total - 1].sort((a, b) => a - b);
  })();

  const limited = selectedIndices.map((i) => sorted[i]).filter(Boolean);
  const days: PlannedDay[] = [];

  for (let i = 0; i < limited.length; i++) {
    const d: ItineraryDay = limited[i];
    days.push({
      day: i + 1,
      title: d.title || `Day ${i + 1}`,
      stops: [
        {
          name: d.title || `Day ${i + 1}`,
          description: d.description || '',
          source: 'admin',
        },
      ],
    });
  }

  return { days, total, sampled };
};

const getAdminItineraryDayCount = (trip: Trip) => {
  const count = (trip.itinerary || []).filter((d) => (d.day ?? 0) >= 1).length;
  return count || Number(trip.duration) || 0;
};

const interestTagsToHuman = (tags: InterestTag[]) => {
  const cleaned = (tags || []).map((t) => t.trim()).filter(Boolean);
  if (!cleaned.length) return '';
  return cleaned.join(', ');
};

const inferRouteLocationsFromAdminItinerary = (baseTrip: Trip, destination: string) => {
  const sorted = (baseTrip.itinerary || [])
    .slice()
    .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
    .filter((d) => (d.day ?? 0) >= 1);

  const notices: string[] = [];
  const route: string[] = [];
  const weights = new Map<string, number>(); // key: normalize(location) -> weight

  const bump = (loc: string, amt: number) => {
    const k = normalize(loc);
    if (!k) return;
    weights.set(k, (weights.get(k) || 0) + amt);
  };

  let currentLoc = '';

  const pushLoc = (loc: string) => {
    const clean = cleanLocationFragment(loc);
    if (!isMeaningfulLocationText(clean)) return;
    if (!route.length) {
      route.push(clean);
      return;
    }
    if (normalize(route[route.length - 1]) === normalize(clean)) return;
    route.push(clean);
  };

  for (const d of sorted) {
    const title = String(d.title || '').trim();
    const parsed = parseTransferTitle(title);
    if (parsed) {
      const from = parsed.from ? cleanLocationFragment(parsed.from) : '';
      const to = cleanLocationFragment(parsed.to);

      if (!currentLoc && from) {
        currentLoc = from;
        pushLoc(from);
      }

      if (!currentLoc && to) {
        currentLoc = to;
        pushLoc(to);
        bump(to, 2);
        continue;
      }

      if (to) {
        pushLoc(to);
        currentLoc = to;
        bump(to, 2);
      }

      continue;
    }

    if (currentLoc) bump(currentLoc, 1);
  }

  if (route.length === 0) {
    const fallback = (destination || baseTrip.destination || '').trim();
    if (fallback) {
      route.push(fallback);
      notices.push('Could not infer route transitions from the base itinerary; using the destination as a single hub.');
    }
  }

  if (route.length === 0) route.push((destination || '').trim() || 'Destination');

  return { routeLocations: route, weights, notices };
};

const distributeStayDays = (routeLocations: string[], weights: Map<string, number>, remainingStayDays: number) => {
  const stayDays = new Map<string, number>();
  const locKeys = routeLocations.map((l) => normalize(l)).filter(Boolean);
  for (const k of locKeys) stayDays.set(k, 0);

  for (let i = 0; i < remainingStayDays; i++) {
    let bestKey = locKeys[0] || '';
    let bestScore = -Infinity;
    for (const k of locKeys) {
      const target = weights.get(k) || 0;
      const assigned = stayDays.get(k) || 0;
      const score = target - assigned * 1.5;
      if (score > bestScore) {
        bestScore = score;
        bestKey = k;
      }
    }
    stayDays.set(bestKey, (stayDays.get(bestKey) || 0) + 1);
  }

  return stayDays;
};

const buildDaySlots = (routeLocations: string[], requestedDays: number, weights: Map<string, number>) => {
  const notices: string[] = [];
  const hops = Math.max(0, routeLocations.length - 1);
  const minDays = 2 + hops;

  let locs = routeLocations.slice();
  if (requestedDays < minDays) {
    const maxLocations = Math.max(1, requestedDays - 1);
    locs = locs.slice(0, maxLocations);
    notices.push(`Requested duration (${requestedDays} day(s)) is shorter than the full route skeleton; showing a shortened route segment.`);
  }

  const effectiveHops = Math.max(0, locs.length - 1);
  const baseDays = 2 + effectiveHops;
  const remainingStayDays = Math.max(0, requestedDays - baseDays);

  const stayDays = distributeStayDays(locs, weights, remainingStayDays);

  const slots: RouteDaySlot[] = [];
  const start = locs[0];
  const last = locs[locs.length - 1];

  slots.push({ type: 'arrival', location: start });
  for (let i = 0; i < (stayDays.get(normalize(start)) || 0); i++) slots.push({ type: 'stay', location: start });

  for (let i = 1; i < locs.length; i++) {
    slots.push({ type: 'transfer', location: locs[i] });
    const k = normalize(locs[i]);
    for (let j = 0; j < (stayDays.get(k) || 0); j++) slots.push({ type: 'stay', location: locs[i] });
  }

  slots.push({ type: 'departure', location: last });

  if (slots.length > requestedDays) {
    let over = slots.length - requestedDays;
    for (let i = slots.length - 2; i >= 1 && over > 0; i--) {
      if (slots[i].type === 'stay') {
        slots.splice(i, 1);
        over--;
      }
    }
  } else if (slots.length < requestedDays) {
    const need = requestedDays - slots.length;
    const insertAt = Math.max(1, slots.length - 1);
    for (let i = 0; i < need; i++) slots.splice(insertAt, 0, { type: 'stay', location: last });
  }

  return { slots, effectiveRouteLocations: locs, notices };
};

const buildHumanDayTitle = (slot: RouteDaySlot, prevLocation: string | null, seenLocations: Set<string>) => {
  const loc = slot.location;
  const locKey = normalize(loc);

  switch (slot.type) {
    case 'arrival':
      return loc ? `Arrival & acclimatization in ${loc}` : 'Arrival & acclimatization';
    case 'transfer': {
      const isReturn = seenLocations.has(locKey);
      if (isReturn) return `Return to ${loc}`;
      if (prevLocation && normalize(prevLocation) !== locKey) return `Transfer to ${loc}`;
      return `Travel to ${loc}`;
    }
    case 'stay':
      return loc ? `Explore ${loc}` : 'Explore';
    case 'departure':
      return loc ? `Departure from ${loc}` : 'Departure';
    default:
      return 'Day';
  }
};

const buildAdminStopDescription = (slot: RouteDaySlot, interestTags: InterestTag[], notes?: string) => {
  const interest = interestTagsToHuman(interestTags || []);
  const notesText = String(notes || '').trim();
  const tail = [interest ? `Focus: ${interest}.` : '', notesText ? `Notes: ${notesText}` : ''].filter(Boolean).join(' ');

  if (slot.type === 'arrival') return `Arrive, settle in, and get ready for the trip.${tail ? ` ${tail}` : ''}`;
  if (slot.type === 'transfer') return `Travel day with scenic stops along the way. Reach ${slot.location} and check in.${tail ? ` ${tail}` : ''}`;
  if (slot.type === 'stay') return `Sightseeing and experiences around ${slot.location}.${tail ? ` ${tail}` : ''}`;
  if (slot.type === 'departure') return `Wrap up and depart from ${slot.location}.${tail ? ` ${tail}` : ''}`;
  return tail || '';
};

const scoreBaseTrip = (trip: Trip, destination: string, requestedDays: number) => {
  const destOk = normalize(trip.destination) === normalize(destination);
  if (!destOk) return -Infinity;

  const itineraryDays = getAdminItineraryDayCount(trip);
  // Prefer the longest trip that does not exceed requested days; otherwise prefer the closest.
  if (itineraryDays <= requestedDays) return 1000 + itineraryDays;
  return 500 - Math.abs(itineraryDays - requestedDays);
};

const extractRequestedPlaces = (notes: string | undefined): string[] => {
  const raw = String(notes || '').trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: string[] = [];

  const takeAfterPrefix = (line: string, prefixes: string[]) => {
    for (const p of prefixes) {
      if (line.toLowerCase().startsWith(p)) return line.slice(p.length).trim();
    }
    return '';
  };

  for (const line of lines) {
    const after = takeAfterPrefix(line, [
      'place:',
      'places:',
      'must visit:',
      'must-visit:',
      'must see:',
      'must-see:',
      'include:',
      'visit:',
      'want to visit:',
      'need to visit:',
    ]);
    if (!after) continue;
    // Allow comma-separated list; keep each item short.
    for (const part of after.split(',').map((p) => p.trim()).filter(Boolean)) {
      if (part.length >= 2 && part.length <= 80) candidates.push(part);
    }
  }

  // If no explicit prefix but notes are short, treat them as a single requested place (best-effort).
  if (candidates.length === 0 && raw.length <= 60) candidates.push(raw);

  return Array.from(new Set(candidates)).slice(0, 3);
};

// Module-level in-memory caches (client-side) to reduce repeated Geoapify calls during a session.
const GEOCODE_MEM_TTL_MS = 10 * 60 * 1000;
const PLACES_MEM_TTL_MS = 10 * 60 * 1000;
const geocodeMem = new Map<string, { value: { lat: number; lon: number; formatted?: string }; expiresAt: number }>();
const placesMem = new Map<string, { value: GeoapifyPlace[]; expiresAt: number }>();

const getFromMemCache = <T>(map: Map<string, { value: T; expiresAt: number }>, key: string): T | null => {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    map.delete(key);
    return null;
  }
  return hit.value;
};

const setMemCache = <T>(map: Map<string, { value: T; expiresAt: number }>, key: string, value: T, ttlMs: number) => {
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const geocodeCached = async (text: string, destinationHint?: string) => {
  const q = String(text || '').trim();
  if (!isMeaningfulLocationText(q)) throw new Error('Invalid location text');

  const attemptKey = normalize(destinationHint ? `${q}, ${destinationHint}` : q);
  const cached = getFromMemCache(geocodeMem, attemptKey);
  if (cached) return cached;

  const attempt1 = destinationHint ? `${q}, ${destinationHint}` : q;
  const result = await withTimeout(geoapifyGeocode(attempt1).catch(async () => geoapifyGeocode(q)), 4500, 'Geocoding');
  setMemCache(geocodeMem, attemptKey, result, GEOCODE_MEM_TTL_MS);
  return result;
};

const placesNearbyCached = async (args: {
  center: { lat: number; lon: number };
  radiusMeters: number;
  interestTags: string[];
  limit: number;
}): Promise<GeoapifyPlace[]> => {
  const key = `${args.center.lat.toFixed(4)},${args.center.lon.toFixed(4)}|r=${args.radiusMeters}|l=${args.limit}|t=${(args.interestTags || [])
    .slice()
    .sort()
    .join(',')}`;

  const cached = getFromMemCache(placesMem, key);
  if (cached) return cached;

  const places = await withTimeout(
    geoapifyPlacesNearby({
      center: { lat: args.center.lat, lon: args.center.lon },
      radiusMeters: args.radiusMeters,
      interestTags: args.interestTags || [],
      limit: args.limit,
    }),
    5500,
    'Places lookup',
  ).catch(() => [] as GeoapifyPlace[]);

  setMemCache(placesMem, key, places, PLACES_MEM_TTL_MS);
  return places;
};

const dedupePlacesByDistance = (places: GeoapifyPlace[], thresholdKm: number) => {
  const out: GeoapifyPlace[] = [];
  for (const p of places) {
    if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') continue;
    let ok = true;
    for (const existing of out) {
      const d = haversineKm({ lat: existing.lat, lon: existing.lon }, { lat: p.lat, lon: p.lon });
      if (d < thresholdKm) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(p);
  }
  return out;
};

export const buildTripPlan = async (args: {
  destination: string;
  requestedDays: number;
  baseTripId?: string;
  interestTags: InterestTag[];
  notes?: string;
  trips: Trip[];
}): Promise<PlannedItinerary> => {
  const destination = (args.destination || '').trim();
  const requestedDays = Number(args.requestedDays || 0);
  if (!destination) throw new Error('Destination is required.');
  if (!Number.isFinite(requestedDays) || requestedDays < 1) throw new Error('Trip duration must be at least 1 day.');

  const trips = args.trips || [];
  const destTrips = trips.filter((t) => normalize(t.destination) === normalize(destination));
  const baseTrip =
    (args.baseTripId ? destTrips.find((t) => t.id === args.baseTripId) : undefined) ||
    destTrips
      .slice()
      .sort((a, b) => scoreBaseTrip(b, destination, requestedDays) - scoreBaseTrip(a, destination, requestedDays))[0];

  if (!baseTrip) throw new Error(`No admin-created trips found for "${destination}". Create a trip in Admin first.`);

  const notices: string[] = [];
  const adminItineraryCount = (baseTrip.itinerary || []).filter((d) => (d.day ?? 0) >= 1).length;
  const baseAvailableDays = getAdminItineraryDayCount(baseTrip);
  const requestedPlaces = extractRequestedPlaces(args.notes);

  // --- Human route planner (preferred) ---
  // Route-first, movement narrative, per-hub POIs, requested-place attachment by distance-to-route.
  if (adminItineraryCount > 0) {
    try {
      const extracted = extractRouteFromAdminItinerary(baseTrip, destination);
      notices.push(...(extracted.notices || []));

      const hubCoords = new Map<string, GeoPoint>();
      const uniqueHubs = Array.from(new Set((extracted.locations || []).map((l) => String(l || '').trim()).filter(Boolean)));
      const hubSettled = await Promise.allSettled(
        uniqueHubs.map(async (loc) => {
          const geo = await geocodeCachedV2(loc, destination);
          return { loc, geo };
        }),
      );

      for (const r of hubSettled) {
        if (r.status !== 'fulfilled') continue;
        hubCoords.set(normalizeText(r.value.loc), r.value.geo);
      }
      if (hubCoords.size < uniqueHubs.length) {
        notices.push('Some route locations could not be geocoded; route feasibility and "along route" matching may be less accurate.');
      }

      const destinationCenter = await geocodeCachedV2(destination).catch(() => null);

      const compressed = compressRoute(extracted, requestedDays, hubCoords);
      notices.push(...(compressed.notices || []));

      const schedule = buildDayPlans({
        locations: compressed.locations,
        legsVia: compressed.legsVia,
        hints: compressed.hints,
        weights: extracted.weights,
        requestedDays,
      });
      notices.push(...(schedule.notices || []));
      if (!Array.isArray(schedule.days) || schedule.days.length !== requestedDays) {
        throw new Error('Planner schedule did not match the requested day count.');
      }

      const routeCoords = compressed.locations
        .map((l) => hubCoords.get(normalizeText(l)))
        .filter(isGeoPoint)
        .map((p) => ({ lat: p.lat, lon: p.lon }));
      if (routeCoords.length < 2) {
        notices.push('Route path is approximate (not enough geocoded hubs); requested-place matching will fall back to nearest hub.');
      }

      const requested = await attachRequestedPlaces({
        requestedPlaces,
        destination,
        destinationCenter,
        dayPlans: schedule.days,
        hubCoords,
        routeCoords,
      });
      notices.push(...(requested.notices || []));

      const titles: string[] = [];
      const seen = new Set<string>();
      const startKey = normalizeText(schedule.days[0]?.location || destination);

      for (let i = 0; i < schedule.days.length; i++) {
        const title = buildHumanTitle(schedule.days[i], { seen, startKey, isLast: i === schedule.days.length - 1 });
        titles.push(title);
        if (schedule.days[i]?.location) seen.add(normalizeText(schedule.days[i].location));
      }

      const allocated = await allocatePois({
        destination,
        destinationCenter,
        dayPlans: schedule.days,
        titles,
        hubCoords,
        interestTags: args.interestTags || [],
        notes: args.notes,
        requestedStopsByDayIndex: requested.stopsByDayIndex,
      });
      notices.push(...(allocated.notices || []));

      return {
        destination,
        requestedDays,
        baseTripId: baseTrip.id,
        baseTripTitle: baseTrip.title,
        days: allocated.days,
        notices,
      };
    } catch (e: any) {
      notices.push(`Route-based planning unavailable right now; using fallback planner. ${e?.message ? `(${e.message})` : ''}`.trim());
    }
  }

  /*
  // --- Route-aware planner (preferred) ---
  // If the admin itinerary includes location transitions like "Leh to Nubra",
  // build a believable plan that moves along the inferred route and fetches POIs per hub.
  if (adminItineraryCount > 0 && false) {
    try {
      const inferred = inferRouteLocationsFromAdminItinerary(baseTrip, destination);
      notices.push(...(inferred.notices || []));

      const dist = buildDaySlots(inferred.routeLocations, requestedDays, inferred.weights);
      notices.push(...(dist.notices || []));
      if (dist.effectiveRouteLocations.length) {
        notices.push(`Route: ${dist.effectiveRouteLocations.join(' → ')}`);
      }

      const slots = dist.slots;
      const hubs = Array.from(
        new Set(dist.effectiveRouteLocations.map((l) => cleanLocationFragment(l)).filter(isMeaningfulLocationText)),
      );

      const hubCoords = new Map<string, { lat: number; lon: number; formatted?: string }>();
      const hubSettled = await Promise.allSettled(
        hubs.map(async (loc) => {
          const geo = await geocodeCached(loc, destination);
          return { loc, geo };
        }),
      );
      for (const r of hubSettled) {
        if (r.status !== 'fulfilled') continue;
        hubCoords.set(normalize(r.value.loc), r.value.geo);
      }

      const destinationCenter = await geocodeCached(destination).catch(() => null);

      // Requested places: attach to closest hub day if along the route; otherwise list as optional suggestions.
      const requestedGeos = await Promise.allSettled(
        requestedPlaces.map(async (p) => {
          const geo = await geocodeCached(p, destination);
          return { name: p, geo };
        }),
      );

      const requestedStopsByDayIndex = new Map<number, PlannedStop[]>();
      const optionalSuggestions: string[] = [];

      const findBestDayForLocation = (loc: string) => {
        const locKey = normalize(loc);
        const candidates = slots
          .map((s, idx) => ({ s, idx }))
          .filter(({ s }) => normalize(s.location) === locKey && s.type !== 'departure');
        const stay = candidates.find((c) => c.s.type === 'stay');
        if (stay) return stay.idx;
        const arrival = candidates.find((c) => c.s.type === 'arrival');
        if (arrival) return arrival.idx;
        const transfer = candidates.find((c) => c.s.type === 'transfer');
        if (transfer) return transfer.idx;
        return 0;
      };

      for (const r of requestedGeos) {
        if (r.status !== 'fulfilled') continue;
        const name = r.value.name;
        const geo = r.value.geo;

        let bestHub = '';
        let bestDist = Infinity;
        for (const hub of hubs) {
          const hc = hubCoords.get(normalize(hub));
          if (!hc) continue;
          const d = haversineKm({ lat: hc.lat, lon: hc.lon }, { lat: geo.lat, lon: geo.lon });
          if (d < bestDist) {
            bestDist = d;
            bestHub = hub;
          }
        }

        const stop: PlannedStop = {
          name,
          description: geo.formatted || '',
          source: 'geoapify',
          lat: geo.lat,
          lon: geo.lon,
          distanceKmFromCenter: destinationCenter ? Math.round(haversineKm(destinationCenter, geo)) : undefined,
        };

        const ALONG_ROUTE_KM = 80;
        if (!bestHub || !Number.isFinite(bestDist) || bestDist > ALONG_ROUTE_KM) {
          optionalSuggestions.push(name);
          continue;
        }

        const idx = findBestDayForLocation(bestHub);
        requestedStopsByDayIndex.set(idx, [...(requestedStopsByDayIndex.get(idx) || []), stop]);
      }

      if (optionalSuggestions.length) {
        notices.push(`Optional suggestions (far from the inferred route): ${optionalSuggestions.join(', ')}`);
      }

      // Fetch POIs per hub (arrival/stay days only), in parallel.
      const daysPerHub = new Map<string, number>();
      for (const slot of slots) {
        if (slot.type === 'departure') continue;
        if (slot.type !== 'arrival' && slot.type !== 'stay') continue;
        const k = normalize(slot.location);
        daysPerHub.set(k, (daysPerHub.get(k) || 0) + 1);
      }

      const hubPlaces = new Map<string, GeoapifyPlace[]>();
      const placeSettled = await Promise.allSettled(
        hubs.map(async (hub) => {
          const k = normalize(hub);
          const hc = hubCoords.get(k);
          if (!hc) return { hub, places: [] as GeoapifyPlace[] };
          const dayCount = daysPerHub.get(k) || 0;
          const want = Math.max(12, dayCount * 6);
          const radiusMeters = 80_000;
          const raw = await placesNearbyCached({ center: { lat: hc.lat, lon: hc.lon }, radiusMeters, interestTags: args.interestTags || [], limit: want });
          const deduped = dedupePlacesByDistance(raw, 1.2);
          return { hub, places: deduped };
        }),
      );

      for (const r of placeSettled) {
        if (r.status !== 'fulfilled') continue;
        hubPlaces.set(normalize(r.value.hub), r.value.places);
      }

      const usedPlaceIds = new Set<string>();
      const usedNames = new Set<string>();

      const nextPoiForHub = (hub: string) => {
        const list = hubPlaces.get(normalize(hub)) || [];
        for (const p of list) {
          if (!p?.id || !p?.name) continue;
          if (usedPlaceIds.has(p.id)) continue;
          const nk = normalize(p.name);
          if (usedNames.has(nk)) continue;
          usedPlaceIds.add(p.id);
          usedNames.add(nk);
          return p;
        }
        return null;
      };

      const days: PlannedDay[] = [];
      let prevLoc: string | null = null;
      const seenLocs = new Set<string>();

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const title = buildHumanDayTitle(slot, prevLoc, seenLocs);

        const baseStop: PlannedStop = {
          name: title,
          description: buildAdminStopDescription(slot, args.interestTags || [], args.notes),
          source: 'admin',
        };

        const stops: PlannedStop[] = [baseStop];
        const requestedStops = requestedStopsByDayIndex.get(i) || [];
        if (requestedStops.length) stops.push(...requestedStops);

        if (slot.type === 'arrival' || slot.type === 'stay') {
          const poi = nextPoiForHub(slot.location);
          if (poi) {
            stops.push({
              name: poi.name,
              description: poi.formatted || '',
              source: 'geoapify',
              lat: poi.lat,
              lon: poi.lon,
              distanceKmFromCenter: destinationCenter ? Math.round(haversineKm(destinationCenter, { lat: poi.lat, lon: poi.lon })) : undefined,
            });
          } else if ((args.interestTags || []).length || String(args.notes || '').trim()) {
            stops.push({
              name: `Flexible time in ${slot.location}`,
              description:
                (interestTagsToHuman(args.interestTags || [])
                  ? `Flexible time focused on: ${interestTagsToHuman(args.interestTags || [])}.`
                  : 'Flexible time for rest and local exploration.') + (args.notes ? ` Notes: ${String(args.notes).trim()}` : ''),
              source: 'placeholder',
            });
          }
        }

        days.push({ day: i + 1, title, stops });
        prevLoc = slot.location || prevLoc;
        if (slot.location) seenLocs.add(normalize(slot.location));
      }

      return {
        destination,
        requestedDays,
        baseTripId: baseTrip.id,
        baseTripTitle: baseTrip.title,
        days,
        notices,
      };
    } catch (e: any) {
      notices.push(`Route-aware planning unavailable right now; using fallback planner. ${e?.message ? `(${e.message})` : ''}`.trim());
    }
  }
  */

  // If the admin trip doesn't have an itinerary (common when only `duration` is set),
  // treat `duration` as the base and avoid calling Geoapify for "missing" days.
  const adminSelection =
    adminItineraryCount > 0 ? selectAdminItineraryDays(baseTrip, requestedDays) : null;
  const adminDays = adminSelection
    ? adminSelection.days
    : Array.from({ length: Math.min(requestedDays, baseAvailableDays) }).map((_, i) => ({
          day: i + 1,
          title: `Day ${i + 1}`,
          stops: [
            {
              name: baseTrip.title ? `${baseTrip.title} - Day ${i + 1}` : `Day ${i + 1}`,
              description: '',
              source: 'admin' as const,
            },
          ],
        }));
  const baseCount = adminDays.length;
  const remaining = Math.max(0, requestedDays - baseCount);

  if (adminSelection?.sampled) {
    notices.push(
      `Base itinerary is ${adminSelection.total} days; showing ${requestedDays} days (kept first + last day, sampled the middle).`,
    );
  } else if (baseAvailableDays > 0 && requestedDays < baseAvailableDays) {
    notices.push(`Showing ${requestedDays} day(s) from the ${baseAvailableDays}-day base itinerary.`);
  }

  const existing = new Set<string>();
  for (const d of adminDays) {
    existing.add(normalize(d.title));
    for (const s of d.stops) existing.add(normalize(s.name));
  }

  // Always try to include requested places (if any), even when we don't need extra days.
  // Best-effort: geocode the place and attach it as an additional stop.
  const requestedStops: PlannedStop[] = [];
  for (const place of requestedPlaces) {
    const key = normalize(place);
    if (!key || existing.has(key)) continue;

    try {
      // Disambiguate by including the destination when possible.
      const geo = await geoapifyGeocode(`${place}, ${destination}`).catch(async () => geoapifyGeocode(place));
      requestedStops.push({
        name: place,
        description: geo.formatted || `Requested stop near ${destination}.`,
        source: 'geoapify',
        lat: geo.lat,
        lon: geo.lon,
      });
      notices.push(`Included requested place: ${place}.`);
    } catch {
      requestedStops.push({
        name: place,
        description: `Requested stop: ${place}. ${args.notes ? `Notes: ${String(args.notes).trim()}` : ''}`.trim(),
        source: 'placeholder',
      });
      notices.push(`Added requested place as a note: ${place} (could not geocode).`);
    }
    existing.add(key);
  }

  if (remaining === 0) {
    if (requestedStops.length) {
      // Attach requested stops to an early day so they are visible even for short trips.
      const targetIdx = adminDays.length >= 2 ? 1 : 0;
      if (adminDays[targetIdx]) {
        adminDays[targetIdx] = {
          ...adminDays[targetIdx],
          stops: [...adminDays[targetIdx].stops, ...requestedStops],
        };
      }
    }

    return {
      destination,
      requestedDays,
      baseTripId: baseTrip.id,
      baseTripTitle: baseTrip.title,
      days: adminDays,
      notices,
    };
  }

  let candidates: GeoapifyPlace[] = [];
  let center: { lat: number; lon: number; formatted?: string } | null = null;
  try {
    center = await geoapifyGeocode(destination);
    const centerPoint = center;
    if (!centerPoint) throw new Error('Geocoding failed to return coordinates.');
    // Fetch in multiple radii in parallel with per-call client timeout to reduce tail latency.
    // Search in 3 concentric circles to find enough points of interest:
    // - 75km: Very close attractions (core itinerary, <1 hour drive)
    // - 150km: Day trip distance (~2 hours drive)
    // - 250km: Multi-day excursion range
    const radii = [75_000, 150_000, 250_000]; // in meters
    
    // Fetch 12x more candidates than needed because:
    // 1. Geoapify returns generic POIs (hotels, cafes) that we filter out
    // 2. Duplicates need to be removed (same place with different names)
    // 3. Admin itinerary stops need to be excluded
    // Example: 3 remaining days * 12 = 36 candidates → filter to ~6-9 usable places
    const want = Math.max(30, remaining * 12);
    const combined: GeoapifyPlace[] = [];
    const seen = new Set<string>();

    const promises = radii.map((radiusMeters) =>
      (async () => {
        try {
          const batch = await geoapifyPlacesNearby({ center: centerPoint, radiusMeters, interestTags: args.interestTags || [], limit: want });
          return Array.isArray(batch) ? batch : [];
        } catch {
          return [] as GeoapifyPlace[];
        }
      })(),
    );

    const settled = await Promise.all(promises);
    for (const batch of settled) {
      for (const p of batch) {
        if (!p?.id) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        combined.push(p);
      }
      if (combined.length >= want) break;
    }
    // Assign the combined results to `candidates` on success.
    candidates = combined;
  } catch (err) {
    // Do not fail the whole planner if Geoapify is down/misconfigured.
    // We still return a complete day count using placeholders.
    notices.push('Could not fetch extra places right now. Added flexible placeholder days instead.');
    candidates = [];
  }

  const uniquePlaces: (GeoapifyPlace & { distanceKm: number })[] = [];
  const seenPlaceIds = new Set<string>();

  for (const p of candidates) {
    if (!p?.name) continue;
    if (seenPlaceIds.has(p.id)) continue;
    seenPlaceIds.add(p.id);

    const key = normalize(p.name);
    if (!key) continue;
    if (existing.has(key)) continue;

    const distanceKm = center ? haversineKm(center, { lat: p.lat, lon: p.lon }) : 0;
    uniquePlaces.push({ ...p, distanceKm });
  }

  uniquePlaces.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    const ak = normalize(a.name || '');
    const bk = normalize(b.name || '');
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // If the user requested specific places, ensure they appear first in the extra-day allocation (best-effort).
  // We do this after sorting so requested stops are prioritized, but still keep other places ordered by distance.
  if (requestedStops.length) {
    const toGeoPlace = (s: PlannedStop): (GeoapifyPlace & { distanceKm: number }) | null => {
      if (typeof s.lat !== 'number' || typeof s.lon !== 'number') return null;
      const distanceKm = center ? haversineKm(center, { lat: s.lat, lon: s.lon }) : 0;
      return {
        id: `requested:${normalize(s.name)}:${s.lat},${s.lon}`,
        name: s.name,
        formatted: s.description,
        categories: [],
        lat: s.lat,
        lon: s.lon,
        distanceKm,
      };
    };

    const requestedPlacesGeo = requestedStops.map(toGeoPlace).filter(Boolean) as (GeoapifyPlace & { distanceKm: number })[];
    if (requestedPlacesGeo.length) {
      // Prepend unique requested places (by normalized name).
      const seenNames = new Set<string>();
      for (const p of requestedPlacesGeo) seenNames.add(normalize(p.name));
      const rest = uniquePlaces.filter((p) => !seenNames.has(normalize(p.name)));
      uniquePlaces.splice(0, uniquePlaces.length, ...requestedPlacesGeo, ...rest);
    }
  }

  // If we still don't have enough places, relax filters slightly (but keep them last).
  if (uniquePlaces.length < remaining) {
    const relaxed: (GeoapifyPlace & { distanceKm: number })[] = [];
    for (const p of candidates) {
      if (!p?.name) continue;
      const key = normalize(p.name);
      if (!key || existing.has(key)) continue;
      // Only include obvious commercial POIs if we are short on options.
      if (!(key.includes('hotel') || key.includes('restaurant') || key.includes('cafe'))) continue;
      const distanceKm = center ? haversineKm(center, { lat: p.lat, lon: p.lon }) : 0;
      relaxed.push({ ...p, distanceKm });
    }
    relaxed.sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      const ak = normalize(a.name || '');
      const bk = normalize(b.name || '');
      if (ak < bk) return -1;
      if (ak > bk) return 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    for (const p of relaxed) {
      if (uniquePlaces.length >= remaining * 2) break;
      // Avoid duplicates by name.
      const k = normalize(p.name);
      if (!k) continue;
      if (uniquePlaces.some((x) => normalize(x.name) === k)) continue;
      uniquePlaces.push(p);
    }
  }

  const extraDays: PlannedDay[] = [];
  const startDay = baseCount + 1;
  let cursor = 0;

  for (let d = 0; d < remaining; d++) {
    const dayNumber = startDay + d;
    const dayPlaces = uniquePlaces.slice(cursor, cursor + 2);
    cursor += dayPlaces.length;

    const stops: PlannedStop[] =
      dayPlaces.length > 0
        ? dayPlaces.map((p) => ({
            name: p.name,
            description: p.formatted || '',
            source: 'geoapify' as const,
            lat: p.lat,
            lon: p.lon,
            distanceKmFromCenter: center ? Math.round(p.distanceKm) : undefined,
          }))
        : [
            {
              name: `Explore ${destination}`,
              description:
                (interestTagsToHuman(args.interestTags || [])
                  ? `Flexible day focused on: ${interestTagsToHuman(args.interestTags || [])}.`
                  : `Flexible day to explore ${destination} at a relaxed pace.`) +
                (args.notes ? ` Notes: ${String(args.notes).trim()}` : ''),
              source: 'placeholder' as const,
            },
          ];

    const title = dayPlaces[0]?.name ? `Day ${dayNumber}: ${dayPlaces[0].name}` : `Day ${dayNumber}: Explore ${destination}`;

    extraDays.push({
      day: dayNumber,
      title,
      stops,
    });
  }

  const merged: PlannedDay[] = [];
  for (let i = 0; i < adminDays.length; i++) {
    merged.push({ ...adminDays[i], day: i + 1 });
  }
  merged.push(...extraDays);

  // Ensure day numbering is continuous.
  for (let i = 0; i < merged.length; i++) merged[i] = { ...merged[i], day: i + 1 };

  return {
    destination,
    requestedDays,
    baseTripId: baseTrip.id,
    baseTripTitle: baseTrip.title,
    days: merged,
    notices,
  };
};
