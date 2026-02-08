import type { ItineraryDay, Trip } from '../../types';
import { cleanLocationFragment, isMeaningfulLocationText, normalizeText, splitWaypoints, stripParens } from './text';

export type LocationHint = 'hub' | 'highlight';

export type ExtractedRoute = {
  locations: string[]; // ordered, including start and end if known
  legsVia: string[][]; // legsVia[i] corresponds to travel from locations[i] -> locations[i+1]
  weights: Map<string, number>; // normalize(location) -> weight
  hints: Map<string, LocationHint>; // normalize(location) -> hint
  notices: string[];
};

const bump = (weights: Map<string, number>, loc: string, amt: number) => {
  const k = normalizeText(loc);
  if (!k) return;
  weights.set(k, (weights.get(k) || 0) + amt);
};

const markHint = (hints: Map<string, LocationHint>, loc: string, hint: LocationHint) => {
  const k = normalizeText(loc);
  if (!k) return;
  const existing = hints.get(k);
  if (!existing) hints.set(k, hint);
  // If any extraction says "hub", treat as hub (more conservative for overnights).
  else if (existing === 'highlight' && hint === 'hub') hints.set(k, 'hub');
};

const parseVia = (title: string) => {
  const t = stripParens(title);
  const m = t.match(/\bvia\b\s+(.+?)$/i);
  if (!m) return [];
  return splitWaypoints(m[1]);
};

const parseTransfer = (title: string): { from?: string; to: string; via: string[] } | null => {
  const t = stripParens(title);
  if (!t) return null;

  // "Leh -> Nubra" or "Leh → Nubra"
  let m = t.match(/^(.+?)\s*(?:→|->)\s*(.+?)$/);
  if (m) {
    const from = cleanLocationFragment(m[1]);
    const to = cleanLocationFragment(m[2]);
    const via = parseVia(t);
    if (isMeaningfulLocationText(to)) return { from: isMeaningfulLocationText(from) ? from : undefined, to, via };
    return null;
  }

  // "Leh to Nubra"
  m = t.match(/^(.+?)\s+\bto\b\s+(.+?)$/i);
  if (m) {
    const from = cleanLocationFragment(m[1]);
    const to = cleanLocationFragment(m[2]);
    const via = parseVia(t);
    if (isMeaningfulLocationText(to)) return { from: isMeaningfulLocationText(from) ? from : undefined, to, via };
    return null;
  }

  // "Drive to Nubra Valley ..."
  m = t.match(/\b(?:drive|travel|transfer|ride|journey)\s+\bto\b\s+(.+?)$/i);
  if (m) {
    const to = cleanLocationFragment(m[1]);
    const via = parseVia(t);
    if (isMeaningfulLocationText(to)) return { to, via };
  }

  // "Return to Leh"
  m = t.match(/\b(return|back)\s+\bto\b\s+(.+?)$/i);
  if (m) {
    const to = cleanLocationFragment(m[2]);
    if (isMeaningfulLocationText(to)) return { to, via: [] };
  }

  return null;
};

const extractStandaloneLocations = (title: string): Array<{ loc: string; hint: LocationHint; weight: number }> => {
  const raw = stripParens(title);
  const t = String(raw || '').trim();
  if (!t) return [];

  const out: Array<{ loc: string; hint: LocationHint; weight: number }> = [];

  // If the whole title is basically a place name (e.g. "Leh", "Nubra Valley"), keep it.
  const whole = cleanLocationFragment(t);
  const looksLikePureLocationTitle = (() => {
    const k = normalizeText(whole);
    if (!isMeaningfulLocationText(whole)) return false;
    if (whole.length > 40) return false;
    // Avoid treating activities as places.
    const banned = [
      'arrival',
      'acclimatization',
      'breakfast',
      'lunch',
      'dinner',
      'briefing',
      'permit',
      'rest',
      'sightseeing',
      'excursion',
      'day trip',
      'drive',
      'transfer',
      'travel',
      'ride',
      'journey',
      'explore',
      'visit',
      'shopping',
      'market',
      'check in',
      'checkout',
      'hotel',
      'camp',
      'kms',
      'km',
    ];
    if (banned.some((b) => k.includes(b))) return false;
    // Keep it conservative: a "pure place title" should be short.
    const wordCount = whole.split(/\s+/g).filter(Boolean).length;
    if (wordCount > 4) return false;
    return true;
  })();

  if (looksLikePureLocationTitle) out.push({ loc: whole, hint: 'hub', weight: 1 });

  // "Pangong Lake excursion"
  let m = t.match(/^(.+?)\s+(excursion|day\s*trip|daytrip|tour|sightseeing)\b/i);
  if (m) {
    const loc = cleanLocationFragment(m[1]);
    if (isMeaningfulLocationText(loc)) out.push({ loc, hint: 'highlight', weight: 3 });
  }

  // "Explore X", "Visit X", "In X"
  m = t.match(/\b(?:explore|visit|in|at)\b\s+(.+?)$/i);
  if (m) {
    const loc = cleanLocationFragment(m[1]);
    if (isMeaningfulLocationText(loc)) out.push({ loc, hint: 'hub', weight: 2 });
  }

  // Location keywords inside the title (best-effort extraction).
  const keyword = [
    'Lake',
    'Valley',
    'Pass',
    'Monastery',
    'Temple',
    'Fort',
    'Palace',
    'Village',
    'City',
    'Town',
    'Glacier',
    'Waterfall',
    'Hot Springs',
    'Museum',
    'Market',
    'Dunes',
    'National Park',
    'Sanctuary',
  ].join('|');

  const re = new RegExp(`\\b([A-Za-z][A-Za-z.'-]*(?:\\s+[A-Za-z][A-Za-z.'-]*)*\\s+(?:${keyword}))\\b`, 'g');
  const matches = Array.from(t.matchAll(re)).map((x) => cleanLocationFragment(x[1] || '')).filter(isMeaningfulLocationText);
  for (const loc of matches) out.push({ loc, hint: 'highlight', weight: 2 });

  // Region-specific but safe: "Khardung La", "Pangong Tso", "Diskit Gompa"
  const re2 = /\b([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)*\s+(La|Tso|Gompa))\b/g;
  const matches2 = Array.from(t.matchAll(re2)).map((x) => cleanLocationFragment(x[1] || '')).filter(isMeaningfulLocationText);
  for (const loc of matches2) out.push({ loc, hint: 'highlight', weight: 1 });

  // De-dupe by normalized key, keep max weight and "hub" if any says hub.
  const merged = new Map<string, { loc: string; hint: LocationHint; weight: number }>();
  for (const item of out) {
    const k = normalizeText(item.loc);
    if (!k) continue;
    const prev = merged.get(k);
    if (!prev) merged.set(k, item);
    else {
      merged.set(k, {
        loc: prev.loc.length >= item.loc.length ? prev.loc : item.loc,
        hint: prev.hint === 'hub' || item.hint === 'hub' ? 'hub' : 'highlight',
        weight: Math.max(prev.weight, item.weight),
      });
    }
  }
  return Array.from(merged.values()).slice(0, 3);
};

export const extractRouteFromAdminItinerary = (baseTrip: Trip, destination: string): ExtractedRoute => {
  const sorted = (baseTrip.itinerary || [])
    .slice()
    .sort((a: ItineraryDay, b: ItineraryDay) => (a.day ?? 0) - (b.day ?? 0))
    .filter((d: ItineraryDay) => (d.day ?? 0) >= 1);

  const notices: string[] = [];
  const weights = new Map<string, number>();
  const hints = new Map<string, LocationHint>();

  const destinationFallback = (destination || baseTrip.destination || '').trim();

  const startFromFirstTitle = (() => {
    const first = sorted[0]?.title || '';
    const parts = extractStandaloneLocations(first);
    const arrival = parts.find((p) => p.hint === 'hub') || parts[0];
    return arrival?.loc || '';
  })();

  const start = isMeaningfulLocationText(startFromFirstTitle) ? startFromFirstTitle : destinationFallback || 'Destination';

  const locations: string[] = [];
  const legsVia: string[][] = [];

  let currentLoc = start;
  locations.push(start);
  bump(weights, start, 2);
  markHint(hints, start, 'hub');

  for (const d of sorted) {
    const title = String(d.title || '').trim();
    const transfer = parseTransfer(title);

    if (transfer) {
      const from = transfer.from ? cleanLocationFragment(transfer.from) : '';
      const to = cleanLocationFragment(transfer.to);
      const via = transfer.via || [];

      if (!currentLoc && isMeaningfulLocationText(from)) currentLoc = from;
      if (isMeaningfulLocationText(from)) {
        bump(weights, from, 1);
        markHint(hints, from, 'hub');
      }

      if (isMeaningfulLocationText(to)) {
        bump(weights, to, 3);
        markHint(hints, to, 'hub');

        if (!locations.length) {
          locations.push(to);
          currentLoc = to;
          continue;
        }

        if (normalizeText(locations[locations.length - 1]) !== normalizeText(to)) {
          legsVia.push(via);
          locations.push(to);
          currentLoc = to;
        }
      }

      continue;
    }

    const standalone = extractStandaloneLocations(title);
    if (standalone.length) {
      const best = standalone[0];
      bump(weights, best.loc, best.weight);
      markHint(hints, best.loc, best.hint);

      if (normalizeText(locations[locations.length - 1]) !== normalizeText(best.loc)) {
        legsVia.push([]); // treat as a movement/highlight day (no explicit "via" waypoints)
        locations.push(best.loc);
        currentLoc = best.loc;
      } else {
        // same location day: bump current location weight
        bump(weights, currentLoc, 1);
      }

      continue;
    }

    // Non-movement day: count as time spent in current location.
    if (isMeaningfulLocationText(currentLoc)) bump(weights, currentLoc, 1);
  }

  if (locations.length === 1 && destinationFallback) {
    notices.push('Base itinerary did not contain clear location transitions; planning as a single hub.');
  }

  // If the itinerary ends in a highlight (e.g. "Pangong Lake excursion") without an explicit return,
  // close the loop back to the starting hub so the narrative includes "return → departure".
  if (locations.length >= 2) {
    const firstKey = normalizeText(locations[0]);
    const lastKey = normalizeText(locations[locations.length - 1]);
    if (firstKey && lastKey && firstKey !== lastKey) {
      const firstHint = hints.get(firstKey);
      const lastHint = hints.get(lastKey);
      if (firstHint === 'hub' && lastHint === 'highlight') {
        legsVia.push([]);
        locations.push(locations[0]);
        bump(weights, locations[0], 1);
      }
    }
  }

  // Ensure legsVia length matches locations-1
  while (legsVia.length < Math.max(0, locations.length - 1)) legsVia.push([]);

  return { locations, legsVia, weights, hints, notices };
};
