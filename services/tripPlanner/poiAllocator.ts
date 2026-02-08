import type { GeoPoint, GeoapifyPlace } from '../geoapifyService';
import type { InterestTag, PlannedDay, PlannedStop } from './plannerTypes';
import { haversineKm } from './geoMath';
import { normalizeText } from './text';
import type { DayPlan, DayType } from './narrativeGenerator';
import { placesNearbyCached } from './geoCache';

const interestTagsToHuman = (tags: InterestTag[]) => {
  const cleaned = (tags || []).map((t) => t.trim()).filter(Boolean);
  if (!cleaned.length) return '';
  return cleaned.join(', ');
};

const isCommercialPoi = (p: GeoapifyPlace) => {
  const name = normalizeText(p.name || '');
  if (!name) return true;
  if (name.includes('hotel') || name.includes('restaurant') || name.includes('cafe')) return true;
  const cats = (p.categories || []).map((c) => normalizeText(c));
  if (cats.some((c) => c.includes('accommodation') || c.includes('catering'))) return true;
  return false;
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

const stablePoiSort = (center: GeoPoint, places: GeoapifyPlace[]) => {
  const withDist = places.map((p) => ({
    p,
    d: haversineKm(center, { lat: p.lat, lon: p.lon }),
    k: normalizeText(p.name || ''),
  }));
  withDist.sort((a, b) => {
    if (a.d !== b.d) return a.d - b.d;
    if (a.k < b.k) return -1;
    if (a.k > b.k) return 1;
    return (a.p.id || '').localeCompare(b.p.id || '');
  });
  return withDist.map((x) => x.p);
};

const buildNarrativeDescription = (day: DayPlan, interestTags: InterestTag[], notes?: string) => {
  const interest = interestTagsToHuman(interestTags || []);
  const notesText = String(notes || '').trim();
  const tail = [interest ? `Focus: ${interest}.` : '', notesText ? `Notes: ${notesText}` : ''].filter(Boolean).join(' ');

  const join = (body: string) => (tail ? `${body} ${tail}` : body);

  if (day.type === 'arrival') return join('Arrive, settle in, and get ready for the journey.');
  if (day.type === 'transfer') {
    const via = (day.via || []).filter(Boolean);
    const viaText = via.length ? ` En-route: ${via.join(', ')}.` : '';
    return join(`Scenic travel day from ${day.from || 'your start'} to ${day.to || day.location}.${viaText} Check in and unwind.`);
  }
  if (day.type === 'stay') return join(`Explore experiences around ${day.location}.`);
  if (day.type === 'highlight') return join(`A highlight day focused on ${day.location}.`);
  if (day.type === 'departure') return join(`Wrap up and depart from ${day.location}.`);
  return tail || '';
};

const poiCountForType = (type: DayType) => {
  if (type === 'arrival') return 1;
  if (type === 'stay') return 3;
  return 0;
};

export const allocatePois = async (args: {
  destination: string;
  destinationCenter: GeoPoint | null;
  dayPlans: DayPlan[];
  titles: string[];
  hubCoords: Map<string, GeoPoint>;
  interestTags: InterestTag[];
  notes?: string;
  requestedStopsByDayIndex: Map<number, PlannedStop[]>;
}) => {
  const notices: string[] = [];

  const shouldDedupStop = (s: PlannedStop) => s?.source === 'geoapify';

  const dedupeStops = (stops: PlannedStop[]) => {
    if (!Array.isArray(stops) || stops.length <= 1) return Array.isArray(stops) ? stops : [];

    const kept: PlannedStop[] = [];
    const seen: Array<{ nameKey: string; lat?: number; lon?: number }> = [];

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s) continue;

      // Always keep the first "base" stop (narrative/admin).
      if (i === 0) {
        kept.push(s);
        continue;
      }

      const nameKey = normalizeText(s.name || '');
      if (!nameKey || !shouldDedupStop(s)) {
        kept.push(s);
        continue;
      }

      const lat = typeof s.lat === 'number' ? s.lat : undefined;
      const lon = typeof s.lon === 'number' ? s.lon : undefined;

      let isDup = false;
      for (const prev of seen) {
        if (prev.nameKey !== nameKey) continue;

        const prevHas = typeof prev.lat === 'number' && typeof prev.lon === 'number';
        const curHas = typeof lat === 'number' && typeof lon === 'number';

        // If both have coords, only treat as dup when truly co-located (avoid false positives).
        if (prevHas && curHas) {
          const d = haversineKm({ lat: prev.lat!, lon: prev.lon! }, { lat, lon });
          if (Number.isFinite(d) && d <= 1.0) {
            isDup = true;
            break;
          }
        } else {
          // Geoapify stops should be unique by name even if coords are missing.
          isDup = true;
          break;
        }
      }

      if (isDup) continue;
      seen.push({ nameKey, lat, lon });
      kept.push(s);
    }

    return kept;
  };

  const needByHub = new Map<string, number>();
  for (let i = 0; i < args.dayPlans.length; i++) {
    const d = args.dayPlans[i];
    const k = normalizeText(d.location);
    const need = poiCountForType(d.type);
    if (need <= 0) continue;
    needByHub.set(k, (needByHub.get(k) || 0) + need);
  }

  const hubsToFetch = Array.from(needByHub.entries())
    .filter(([k, need]) => need > 0 && args.hubCoords.get(k))
    .map(([k]) => k);

  const hubPlaces = new Map<string, GeoapifyPlace[]>();
  const settled = await Promise.allSettled(
    hubsToFetch.map(async (k) => {
      const center = args.hubCoords.get(k)!;
      const need = needByHub.get(k) || 0;
      const limit = Math.max(12, Math.min(40, need * 5));
      const radiusMeters = 70_000;
      const raw = await placesNearbyCached({
        center: { lat: center.lat, lon: center.lon },
        radiusMeters,
        interestTags: args.interestTags || [],
        limit,
      });
      const filtered = (raw || []).filter((p) => p?.id && p?.name && !isCommercialPoi(p));
      // Deterministic ordering: sort by distance then name before distance de-dupe.
      const sorted = stablePoiSort(center, filtered);
      const deduped = dedupePlacesByDistance(sorted, 1.2);
      return { k, places: deduped };
    }),
  );

  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    hubPlaces.set(r.value.k, r.value.places);
  }

  const usedPlaceIds = new Set<string>();
  const usedNames = new Set<string>();
  const cursorByHub = new Map<string, number>();

  const takeNext = (hubKey: string, count: number) => {
    const list = hubPlaces.get(hubKey) || [];
    let cursor = cursorByHub.get(hubKey) || 0;
    const out: GeoapifyPlace[] = [];
    while (cursor < list.length && out.length < count) {
      const p = list[cursor];
      cursor++;
      if (!p?.id || !p?.name) continue;
      if (usedPlaceIds.has(p.id)) continue;
      const nk = normalizeText(p.name);
      if (!nk || usedNames.has(nk)) continue;
      usedPlaceIds.add(p.id);
      usedNames.add(nk);
      out.push(p);
    }
    cursorByHub.set(hubKey, cursor);
    return out;
  };

  const days: PlannedDay[] = [];
  for (let i = 0; i < args.dayPlans.length; i++) {
    const d = args.dayPlans[i];
    const title = args.titles[i] || `Day ${i + 1}`;
    const hubKey = normalizeText(d.location);
    const hub = args.hubCoords.get(hubKey) || null;

    const baseStop: PlannedStop = {
      name: title,
      description: buildNarrativeDescription(d, args.interestTags || [], args.notes),
      source: 'admin',
    };

    const stops: PlannedStop[] = [baseStop];

    // Travel waypoints for transfer days.
    if (d.type === 'transfer') {
      const via = (d.via || []).filter(Boolean).slice(0, 3);
      if (via.length) {
        for (const w of via) stops.push({ name: w, description: 'Scenic stop en-route.', source: 'admin' });
      } else {
        stops.push({ name: 'Scenic viewpoints en-route', description: 'Photo stops and breaks along the drive.', source: 'placeholder' });
      }
    }

    // Highlight day: show the highlight as the main attraction (no extra POIs).
    if (d.type === 'highlight') {
      if (hub) {
        stops.push({
          name: d.location,
          description: hub.formatted || '',
          source: 'geoapify',
          lat: hub.lat,
          lon: hub.lon,
          distanceKmFromCenter: args.destinationCenter ? Math.round(haversineKm(args.destinationCenter, hub)) : undefined,
        });
      } else if (d.location) {
        stops.push({
          name: d.location,
          description: 'Main highlight for the day.',
          source: 'placeholder',
        });
      }
    }

    // Requested stops attached to this day.
    const requested = args.requestedStopsByDayIndex.get(i) || [];
    if (requested.length) {
      stops.push(...requested);
      // Prevent POI allocation from duplicating requested places by name.
      for (const s of requested) {
        const nk = normalizeText(s.name || '');
        if (nk) usedNames.add(nk);
      }
    }

    const poiCount = poiCountForType(d.type);
    if (poiCount > 0) {
      const picks = takeNext(hubKey, poiCount);
      for (const p of picks) {
        stops.push({
          name: p.name,
          description: p.formatted || '',
          source: 'geoapify',
          lat: p.lat,
          lon: p.lon,
          distanceKmFromCenter: args.destinationCenter ? Math.round(haversineKm(args.destinationCenter, { lat: p.lat, lon: p.lon })) : undefined,
        });
      }

      if (!picks.length) {
        stops.push({
          name: `Flexible time in ${d.location}`,
          description:
            (interestTagsToHuman(args.interestTags || [])
              ? `Flexible time focused on: ${interestTagsToHuman(args.interestTags || [])}.`
              : `Flexible time to explore ${d.location}.`) + (args.notes ? ` Notes: ${String(args.notes).trim()}` : ''),
          source: 'placeholder',
        });
      }
    }

    // Departure day: keep it clean (requested stops are already included above).
    days.push({ day: i + 1, title, stops: dedupeStops(stops) });
  }

  if (!hubsToFetch.length) notices.push('No hub POIs fetched (route has no stay/arrival hubs).');
  return { days, notices };
};
