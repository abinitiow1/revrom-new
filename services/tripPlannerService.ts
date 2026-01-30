import type { ItineraryDay, Trip } from '../types';
import { geoapifyGeocode, geoapifyPlacesNearby, type GeoapifyPlace } from './geoapifyService';

export type InterestTag =
  | 'mountain'
  | 'valley'
  | 'river'
  | 'lakes'
  | 'monasteries'
  | 'culture'
  | 'adventure'
  | 'photography';

export type PlanItemSource = 'admin' | 'geoapify' | 'placeholder';

export type PlannedStop = {
  name: string;
  description?: string;
  source: PlanItemSource;
  lat?: number;
  lon?: number;
  distanceKmFromCenter?: number;
};

export type PlannedDay = {
  day: number;
  title: string;
  stops: PlannedStop[];
};

export type PlannedItinerary = {
  destination: string;
  requestedDays: number;
  baseTripId?: string;
  baseTripTitle?: string;
  days: PlannedDay[];
  notices?: string[];
};

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

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

const toPlannedDaysFromAdmin = (baseTrip: Trip, requestedDays: number): PlannedDay[] => {
  const sorted = (baseTrip.itinerary || [])
    .slice()
    .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
    .filter((d) => (d.day ?? 0) >= 1);

  const limited = sorted.slice(0, Math.min(sorted.length, requestedDays));
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

  return days;
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

const scoreBaseTrip = (trip: Trip, destination: string, requestedDays: number) => {
  const destOk = normalize(trip.destination) === normalize(destination);
  if (!destOk) return -Infinity;

  const itineraryDays = getAdminItineraryDayCount(trip);
  // Prefer the longest trip that does not exceed requested days; otherwise prefer the closest.
  if (itineraryDays <= requestedDays) return 1000 + itineraryDays;
  return 500 - Math.abs(itineraryDays - requestedDays);
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
  const baseTrip =
    (args.baseTripId ? trips.find((t) => t.id === args.baseTripId) : undefined) ||
    trips
      .slice()
      .sort((a, b) => scoreBaseTrip(b, destination, requestedDays) - scoreBaseTrip(a, destination, requestedDays))[0];

  if (!baseTrip) throw new Error('No admin-created trips found. Create a trip in Admin first.');

  const notices: string[] = [];
  const baseAvailableDays = getAdminItineraryDayCount(baseTrip);
  const adminDays = toPlannedDaysFromAdmin(baseTrip, requestedDays);
  const baseCount = adminDays.length;
  const remaining = Math.max(0, requestedDays - baseCount);

  if (baseAvailableDays > 0 && requestedDays < baseAvailableDays) {
    notices.push(`Showing the first ${requestedDays} day(s) from the ${baseAvailableDays}-day base itinerary.`);
  }

  if (remaining === 0) {
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
    // Fetch in increasing radii to reduce "generic" placeholder days.
    const radii = [75_000, 150_000, 250_000];
    const want = Math.max(30, remaining * 12);
    const combined: GeoapifyPlace[] = [];
    const seen = new Set<string>();
    for (const radiusMeters of radii) {
      const batch = await geoapifyPlacesNearby({
        center,
        radiusMeters,
        interestTags: args.interestTags || [],
        limit: want,
      });
      for (const p of batch) {
        if (!p?.id) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        combined.push(p);
      }
      if (combined.length >= want) break;
    }
    candidates = combined;
  } catch (e: any) {
    // Do not fail the whole planner if Geoapify is down/misconfigured.
    // We still return a complete day count using placeholders.
    notices.push('Could not fetch extra places right now. Added flexible placeholder days instead.');
  }

  const existing = new Set<string>();
  for (const d of adminDays) {
    existing.add(normalize(d.title));
    for (const s of d.stops) existing.add(normalize(s.name));
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

  uniquePlaces.sort((a, b) => a.distanceKm - b.distanceKm);

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
    relaxed.sort((a, b) => a.distanceKm - b.distanceKm);
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
              name: `Explore near ${destination}`,
              description:
                (interestTagsToHuman(args.interestTags || [])
                  ? `Flexible day focused on: ${interestTagsToHuman(args.interestTags || [])}.`
                  : 'Flexible day for local exploration and rest.') +
                (args.notes ? ` Notes: ${String(args.notes).trim()}` : ''),
              source: 'placeholder' as const,
            },
          ];

    const title = dayPlaces[0]?.name ? `Day ${dayNumber}: ${dayPlaces[0].name}` : `Day ${dayNumber}: Explore`;

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
