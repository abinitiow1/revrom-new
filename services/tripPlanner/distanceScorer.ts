import type { GeoPoint } from '../geoapifyService';
import { haversineKm } from './geoMath';
import { normalizeText } from './text';

export const scoreLegPenalty = (from: string, to: string, coords: Map<string, GeoPoint>) => {
  const A = coords.get(normalizeText(from));
  const B = coords.get(normalizeText(to));
  if (!A || !B) return 0;
  const d = haversineKm(A, B);
  // Penalize very long jumps heavily to avoid unrealistic route compression.
  const soft = Math.max(0, d - 80);
  return (soft / 40) * 12; // ~12 points per 40km beyond first 80km
};

