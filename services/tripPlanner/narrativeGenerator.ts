import { normalizeText } from './text';
import type { LocationHint } from './routeExtractor';

export type DayType = 'arrival' | 'transfer' | 'stay' | 'highlight' | 'departure';

export type DayPlan = {
  type: DayType;
  location: string;
  from?: string;
  to?: string;
  via?: string[];
};

export const buildDayPlans = (args: {
  locations: string[];
  legsVia: string[][];
  hints: Map<string, LocationHint>;
  weights: Map<string, number>;
  requestedDays: number;
}) => {
  const notices: string[] = [];
  const requestedDays = Math.max(1, Math.floor(args.requestedDays || 0));
  const locations = args.locations.slice().filter(Boolean);
  if (!locations.length) return { days: [] as DayPlan[], notices: ['No route locations found.'] };

  const start = locations[0];
  const startKey = normalizeText(start);

  if (locations.length === 1) {
    const days: DayPlan[] = [];
    if (requestedDays === 1) {
      days.push({ type: 'arrival', location: start });
      return { days, notices: [] };
    }
    days.push({ type: 'arrival', location: start });
    for (let i = 0; i < Math.max(0, requestedDays - 2); i++) days.push({ type: 'stay', location: start });
    days.push({ type: 'departure', location: start });
    return { days, notices: [] };
  }

  const base: DayPlan[] = [];
  base.push({ type: 'arrival', location: start });

  for (let i = 1; i < locations.length; i++) {
    const to = locations[i];
    const from = locations[i - 1];
    const isLast = i === locations.length - 1;
    const hint = args.hints.get(normalizeText(to));
    const type: DayType = isLast ? 'departure' : hint === 'highlight' ? 'highlight' : 'transfer';
    base.push({ type, location: to, from, to, via: args.legsVia[i - 1] || [] });
  }

  const extra = Math.max(0, requestedDays - base.length);
  if (extra === 0) {
    notices.push(`Route: ${locations.join(' → ')}`);
    return { days: base, notices };
  }

  // Distribute extra "stay" days across hubs by weight (avoid overloading one place).
  const assigned = new Map<string, number>();
  const candidates = locations.map((l) => normalizeText(l)).filter(Boolean);
  for (const k of candidates) assigned.set(k, 0);

  const pickBestKey = () => {
    let bestKey = candidates[0] || startKey;
    let bestScore = -Infinity;
    for (const k of candidates) {
      const baseW = args.weights.get(k) || 0;
      const hint = args.hints.get(k);
      const hubBonus = hint === 'hub' ? 2 : 0;
      const score = baseW + hubBonus - (assigned.get(k) || 0) * 1.6;
      if (score > bestScore) {
        bestScore = score;
        bestKey = k;
      }
    }
    assigned.set(bestKey, (assigned.get(bestKey) || 0) + 1);
    return bestKey;
  };

  const insertAfterFirstVisit = (days: DayPlan[], locKey: string) => {
    const idx = days.findIndex((d, i) => i < days.length - 1 && normalizeText(d.location) === locKey);
    if (idx >= 0) return idx + 1;
    return Math.max(1, days.length - 1);
  };

  const out = base.slice();
  for (let i = 0; i < extra; i++) {
    const k = pickBestKey();
    const locName = locations.find((l) => normalizeText(l) === k) || start;
    const insertAt = insertAfterFirstVisit(out, k);
    out.splice(insertAt, 0, { type: 'stay', location: locName });
  }

  // Ensure exact length.
  while (out.length > requestedDays) {
    const idx = out.findIndex((d) => d.type === 'stay');
    if (idx >= 0) out.splice(idx, 1);
    else break;
  }
  while (out.length < requestedDays) out.splice(Math.max(1, out.length - 1), 0, { type: 'stay', location: out[out.length - 1]?.location || start });

  notices.push(`Route: ${locations.join(' → ')}`);
  return { days: out, notices };
};

export const buildHumanTitle = (day: DayPlan, ctx: { seen: Set<string>; startKey: string; isLast: boolean }) => {
  const loc = day.location;
  const locKey = normalizeText(loc);

  switch (day.type) {
    case 'arrival':
      if (ctx.isLast) return loc ? `Arrival & departure in ${loc}` : 'Arrival & departure';
      return loc ? `Arrival & acclimatization in ${loc}` : 'Arrival & acclimatization';
    case 'transfer':
      if (loc) {
        const isReturn = ctx.seen.has(locKey) || (ctx.startKey && ctx.startKey === locKey);
        return isReturn ? `Return to ${loc}` : `Scenic transfer to ${loc}`;
      }
      return 'Scenic transfer';
    case 'highlight':
      return loc ? `Explore ${loc}` : 'Explore highlight';
    case 'stay':
      return loc ? `Explore ${loc}` : 'Explore';
    case 'departure': {
      const fromKey = normalizeText(day.from || '');
      const isReturn = ctx.seen.has(locKey) || (ctx.startKey && ctx.startKey === locKey);
      if (fromKey && fromKey !== locKey) {
        if (isReturn) return `Return to ${loc}${ctx.isLast ? ' & departure' : ''}`;
        return `Transfer to ${loc}${ctx.isLast ? ' & departure' : ''}`;
      }
      return loc ? `Departure from ${loc}` : 'Departure';
    }
    default:
      return loc ? `Day in ${loc}` : 'Day';
  }
};
