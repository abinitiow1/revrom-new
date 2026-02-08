import type { GeoPoint } from '../geoapifyService';
import { normalizeText } from './text';
import type { ExtractedRoute, LocationHint } from './routeExtractor';
import { scoreLegPenalty } from './distanceScorer';

export type CompressedRoute = {
  locations: string[];
  legsVia: string[][];
  hints: Map<string, LocationHint>;
  notices: string[];
};

const nodeScore = (loc: string, extracted: ExtractedRoute) => {
  const k = normalizeText(loc);
  const w = extracted.weights.get(k) || 0;
  const hint = extracted.hints.get(k);
  const hintBonus = hint === 'highlight' ? 1.5 : 1.0;
  return w * 10 * hintBonus;
};

const aggregateVia = (extracted: ExtractedRoute, fromIdx: number, toIdx: number) => {
  const out: string[] = [];
  for (let i = fromIdx; i < toIdx; i++) {
    const leg = extracted.legsVia[i] || [];
    for (const w of leg) out.push(w);
  }
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const w of out) {
    const k = normalizeText(w);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(w);
  }
  return deduped.slice(0, 5);
};

export const compressRoute = (extracted: ExtractedRoute, requestedDays: number, coords: Map<string, GeoPoint>): CompressedRoute => {
  const notices: string[] = [];
  const raw = extracted.locations.slice().filter(Boolean);
  const n = raw.length;
  if (n <= 1) return { locations: raw.length ? raw : ['Destination'], legsVia: [], hints: extracted.hints, notices };

  const d = Math.max(1, Math.floor(requestedDays || 0));
  if (d <= 1) return { locations: [raw[0]], legsVia: [], hints: extracted.hints, notices };

  const k = Math.min(n, Math.max(2, d));
  if (k >= n) return { locations: raw, legsVia: extracted.legsVia, hints: extracted.hints, notices };

  // Short-loop compression (common in real itineraries): preserve the first stops in order.
  // Examples:
  // 3 days: Start → first main stop → Start
  // 4 days: Start → stop1 → stop2 → Start
  const startKey = normalizeText(raw[0]);
  const endKey = normalizeText(raw[n - 1]);
  const isLoop = !!startKey && startKey === endKey;

  if (isLoop && (d === 3 || d === 4) && n >= 3) {
    const distinct = raw
      .slice(1, n - 1)
      .filter((l) => normalizeText(l) && normalizeText(l) !== startKey);

    const pick = (idx: number) => distinct[idx] || distinct[distinct.length - 1] || raw[1];
    const selectedLocs = d === 3 ? [raw[0], pick(0), raw[n - 1]] : [raw[0], pick(0), pick(1), raw[n - 1]];

    // Map selected locations back to indices for via aggregation.
    const indices = selectedLocs.map((loc, j) => {
      if (j === 0) return 0;
      if (j === selectedLocs.length - 1) return n - 1;
      const k = normalizeText(loc);
      const i = raw.findIndex((x, idx) => idx > 0 && idx < n - 1 && normalizeText(x) === k);
      return i >= 0 ? i : Math.min(n - 2, j);
    });
    indices[0] = 0;
    indices[indices.length - 1] = n - 1;

    const legsVia: string[][] = [];
    for (let i = 0; i < indices.length - 1; i++) legsVia.push(aggregateVia(extracted, indices[i], indices[i + 1]));

    notices.push(`Compressed loop route to fit ${requestedDays} day(s) while keeping core stops.`);
    return { locations: selectedLocs, legsVia, hints: extracted.hints, notices };
  }

  // DP to choose k nodes including first and last.
  const NEG = -1e15;
  const dp: number[][] = Array.from({ length: k + 1 }, () => Array(n).fill(NEG));
  const parent: number[][] = Array.from({ length: k + 1 }, () => Array(n).fill(-1));

  dp[1][0] = nodeScore(raw[0], extracted) + 50;

  for (let count = 2; count <= k; count++) {
    for (let j = 1; j < n; j++) {
      // Force last node only at final count.
      if (count !== k && j === n - 1) continue;
      if (count === k && j !== n - 1) continue;

      let best = NEG;
      let bestI = -1;
      for (let i = count - 2; i < j; i++) {
        if (dp[count - 1][i] <= NEG / 2) continue;
        const s = dp[count - 1][i] + nodeScore(raw[j], extracted) - scoreLegPenalty(raw[i], raw[j], coords);
        if (s > best) {
          best = s;
          bestI = i;
        }
      }
      dp[count][j] = best;
      parent[count][j] = bestI;
    }
  }

  // Reconstruct selected indices.
  const selected: number[] = [];
  let cur = n - 1;
  let count = k;
  while (count >= 2 && cur >= 0) {
    selected.push(cur);
    cur = parent[count][cur];
    count--;
  }
  selected.push(0);
  selected.sort((a, b) => a - b);

  const locations = selected.map((i) => raw[i]).filter(Boolean);
  const legsVia: string[][] = [];
  for (let i = 0; i < selected.length - 1; i++) {
    legsVia.push(aggregateVia(extracted, selected[i], selected[i + 1]));
  }

  notices.push(`Compressed route to fit ${requestedDays} day(s) without dropping the movement narrative.`);

  return { locations, legsVia, hints: extracted.hints, notices };
};
