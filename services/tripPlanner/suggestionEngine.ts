import type { PlannedStop } from './plannerTypes';
import type { GeoPoint } from '../geoapifyService';
import { distancePointToRouteKm, haversineKm, distancePointToSegmentKm } from './geoMath';
import { normalizeText } from './text';
import type { DayPlan } from './narrativeGenerator';
import { geocodeCached } from './geoCache';

export const attachRequestedPlaces = async (args: {
  requestedPlaces: string[];
  destination: string;
  destinationCenter: GeoPoint | null;
  dayPlans: DayPlan[];
  hubCoords: Map<string, GeoPoint>;
  routeCoords: Array<{ lat: number; lon: number }>;
}) => {
  const notices: string[] = [];
  const stopsByDayIndex = new Map<number, PlannedStop[]>();

  const requested = (args.requestedPlaces || []).map((p) => String(p || '').trim()).filter(Boolean).slice(0, 3);
  if (!requested.length) return { stopsByDayIndex, notices };

  const routeIsUsable = (args.routeCoords || []).length >= 2;

  const settled = await Promise.allSettled(
    requested.map(async (p) => {
      const geo = await geocodeCached(p, args.destination);
      return { name: p, geo };
    }),
  );

  const optional: string[] = [];
  const unresolved: string[] = [];

  const ALONG_ROUTE_KM = 35;
  const NEAR_ROUTE_KM = 70;

  const firstAttachableDayIndex = () => {
    const idx = args.dayPlans.findIndex((d) => d.type !== 'departure');
    return idx >= 0 ? idx : 0;
  };

  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const requestedName = requested[i] || '';

    if (r.status !== 'fulfilled') {
      if (requestedName) {
        unresolved.push(requestedName);
        const idx = firstAttachableDayIndex();
        const stop: PlannedStop = {
          name: requestedName,
          description: 'Requested place (could not locate on the map).',
          source: 'placeholder',
        };
        stopsByDayIndex.set(idx, [...(stopsByDayIndex.get(idx) || []), stop]);
      }
      continue;
    }

    const { name, geo } = r.value;

    const dRoute = routeIsUsable ? distancePointToRouteKm({ lat: geo.lat, lon: geo.lon }, args.routeCoords) : Infinity;

    const stop: PlannedStop = {
      name,
      description: geo.formatted || '',
      source: 'geoapify',
      lat: geo.lat,
      lon: geo.lon,
      distanceKmFromCenter: args.destinationCenter ? Math.round(haversineKm(args.destinationCenter, geo)) : undefined,
    };

    const pushToDay = (idx: number) => {
      stopsByDayIndex.set(idx, [...(stopsByDayIndex.get(idx) || []), stop]);
    };

    if (routeIsUsable && Number.isFinite(dRoute) && dRoute <= ALONG_ROUTE_KM) {
      // Prefer the travel segment it lies closest to.
      let bestIdx = 0;
      let best = Infinity;
      for (let i = 0; i < args.dayPlans.length; i++) {
        const d = args.dayPlans[i];
        if (!(d.type === 'transfer' || d.type === 'highlight')) continue;
        const from = d.from ? args.hubCoords.get(normalizeText(d.from)) : null;
        const to = d.to ? args.hubCoords.get(normalizeText(d.to)) : args.hubCoords.get(normalizeText(d.location));
        if (!from || !to) continue;
        const dist = distancePointToSegmentKm({ lat: geo.lat, lon: geo.lon }, from, to);
        if (dist < best) {
          best = dist;
          bestIdx = i;
        }
      }
      pushToDay(bestIdx);
      continue;
    }

    // If we can't build a reliable route polyline, fall back to nearest-hub attachment.
    if (!routeIsUsable || (Number.isFinite(dRoute) && dRoute <= NEAR_ROUTE_KM)) {
      // Attach to nearest hub day (prefer "stay" days first, then arrival/highlight/transfer).
      const bestIndexForTypes = (types: Array<DayPlan['type']>) => {
        let bestIdx = -1;
        let best = Infinity;
        for (let i = 0; i < args.dayPlans.length; i++) {
          const d = args.dayPlans[i];
          if (d.type === 'departure') continue;
          if (!types.includes(d.type)) continue;
          const hub = args.hubCoords.get(normalizeText(d.location));
          if (!hub) continue;
          const dist = haversineKm(hub, geo);
          if (dist < best) {
            best = dist;
            bestIdx = i;
          }
        }
        return bestIdx;
      };

      const stayIdx = bestIndexForTypes(['stay']);
      if (stayIdx >= 0) pushToDay(stayIdx);
      else {
        const anyIdx = bestIndexForTypes(['arrival', 'highlight', 'transfer']);
        pushToDay(anyIdx >= 0 ? anyIdx : firstAttachableDayIndex());
      }
      continue;
    }

    optional.push(name);
  }

  if (unresolved.length) {
    notices.push(`Requested place(s) added as notes (could not geocode): ${unresolved.join(', ')}`);
  }
  if (optional.length) {
    notices.push(`Optional suggestions (far from your route): ${optional.join(', ')}`);
  }

  return { stopsByDayIndex, notices };
};
