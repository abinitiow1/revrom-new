const HAV_MEM_MAX = 4000;
const havMem = new Map<string, number>();

const keyForPair = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const aKey = `${a.lat},${a.lon}`;
  const bKey = `${b.lat},${b.lon}`;
  return aKey <= bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
};

export const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  if (!a || !b) return 0;
  if (!Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) return 0;

  const k = keyForPair(a, b);
  const hit = havMem.get(k);
  if (hit !== undefined) return hit;

  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  const out = R * c;

  havMem.set(k, out);
  while (havMem.size > HAV_MEM_MAX) {
    const kk = havMem.keys().next().value as string | undefined;
    if (!kk) break;
    havMem.delete(kk);
  }

  return out;
};

// Equirectangular projection: good enough for "how far from route" at itinerary scale.
const toXY = (p: { lat: number; lon: number }, lat0Deg: number) => {
  const R = 6371;
  const lat = (p.lat * Math.PI) / 180;
  const lon = (p.lon * Math.PI) / 180;
  const lat0 = (lat0Deg * Math.PI) / 180;
  return {
    x: R * lon * Math.cos(lat0),
    y: R * lat,
  };
};

export const distancePointToSegmentKm = (
  p: { lat: number; lon: number },
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) => {
  const lat0 = (a.lat + b.lat + p.lat) / 3;
  const P = toXY(p, lat0);
  const A = toXY(a, lat0);
  const B = toXY(b, lat0);

  const abx = B.x - A.x;
  const aby = B.y - A.y;
  const apx = P.x - A.x;
  const apy = P.y - A.y;

  const ab2 = abx * abx + aby * aby;
  if (ab2 <= 1e-9) {
    const dx = P.x - A.x;
    const dy = P.y - A.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const projx = A.x + t * abx;
  const projy = A.y + t * aby;
  const dx = P.x - projx;
  const dy = P.y - projy;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distancePointToRouteKm = (p: { lat: number; lon: number }, route: Array<{ lat: number; lon: number }>) => {
  if (route.length === 0) return Infinity;
  if (route.length === 1) return haversineKm(p, route[0]);

  let best = Infinity;
  for (let i = 0; i < route.length - 1; i++) {
    const d = distancePointToSegmentKm(p, route[i], route[i + 1]);
    if (d < best) best = d;
  }
  return best;
};
