type GeoapifyFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    properties?: { place_id?: string; name?: string; formatted?: string; categories?: string[] };
    geometry?: { type: 'Point'; coordinates?: [number, number] };
  }>;
};

import { fetchWithTimeout as clientFetchWithTimeout } from './fetchWithTimeout';

const getClientGeoapifyKeyIfPresent = () =>
  ((import.meta as any).env?.VITE_GEOAPIFY_API_KEY as string | undefined) || undefined;

// Geocoding cache helpers (1 hour TTL to reduce API costs and improve UX)
const GEOCODE_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

const getGeocodeCache = (text: string): GeoPoint | null => {
  try {
    const cacheKey = `geocode_${text.toLowerCase().trim()}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { lat, lon, formatted, timestamp } = JSON.parse(cached);
    
    // Check if cache expired
    if (Date.now() - timestamp > GEOCODE_CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return { lat, lon, formatted };
  } catch {
    return null;
  }
};

const setGeocodeCache = (text: string, result: GeoPoint): void => {
  try {
    const cacheKey = `geocode_${text.toLowerCase().trim()}`;
    const cacheData = { ...result, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch {
    // Cache failed (quota exceeded or disabled), continue without caching
  }
};

const mapInterestTagsToSafeCategories = (interestTags: string[]) => {
  const tags = (interestTags || []).map((t) => String(t || '').toLowerCase().trim()).filter(Boolean);
  const set = new Set<string>([
    'tourism.attraction',
    'tourism.sights',
    'natural.mountain',
    'natural.water',
  ]);

  // Keep mapping conservative; invalid categories cause upstream 400s.
  if (tags.includes('lakes') || tags.includes('river')) set.add('natural.water');
  if (tags.includes('mountain') || tags.includes('valley')) set.add('natural.mountain');
  if (tags.includes('culture') || tags.includes('monasteries')) set.add('tourism.attraction');
  // NOTE: Geoapify Places v2 does not support "tourism.viewpoint" (returns 400).
  // Keep photography within tourism.sights/attraction.

  return Array.from(set);
};

export type GeoPoint = { lat: number; lon: number; formatted?: string };

export const geoapifyGeocode = async (text: string, opts?: { turnstileToken?: string }): Promise<GeoPoint> => {
  const q = (text || '').trim();
  if (!q) throw new Error('Destination is required.');

  // Try cache first to avoid unnecessary API calls
  const cached = getGeocodeCache(q);
  if (cached) {
    return cached;
  }

  const clientKey = getClientGeoapifyKeyIfPresent();
  // If a client key is present, prefer direct calls to avoid noisy /api 404s on Vite dev.
  if (clientKey) {
    const url =
      `https://api.geoapify.com/v1/geocode/search?` +
      new URLSearchParams({
        text: q,
        limit: '1',
        format: 'geojson',
        apiKey: clientKey,
      }).toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geoapify geocoding failed (${res.status}).`);
    const data = (await res.json()) as GeoapifyFeatureCollection;
    const feature = data?.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords) throw new Error('Could not geocode the selected destination.');

    const [lon, lat] = coords;
    const result = { lat, lon, formatted: feature?.properties?.formatted };
    setGeocodeCache(q, result);
    return result;
  }

  // Otherwise, use server-side proxy (Vercel /api/*).

  const res = await clientFetchWithTimeout('/api/geoapify/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: q }),
  }, 4000, 1);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Geoapify geocode failed (${res.status}).`);
  const result = { lat: data.lat, lon: data.lon, formatted: data.formatted };
  setGeocodeCache(q, result);
  return result;
};

export type GeoapifyPlace = {
  id: string;
  name: string;
  formatted?: string;
  categories?: string[];
  lat: number;
  lon: number;
};

export const geoapifyPlacesNearby = async (args: {
  center: GeoPoint;
  radiusMeters: number;
  interestTags: string[];
  limit: number;
  // Optional free-text to help relevance (Geoapify supports it as "name" filter only indirectly, so we keep it for future).
}): Promise<GeoapifyPlace[]> => {
  const { center, radiusMeters, limit } = args;

  const clientKey = getClientGeoapifyKeyIfPresent();
  // If a client key is present, prefer direct calls to avoid noisy /api 404s on Vite dev.
  if (clientKey) {
    const categories = mapInterestTagsToSafeCategories(args.interestTags || []);
    const url =
      `https://api.geoapify.com/v2/places?` +
      new URLSearchParams({
        categories: categories.join(','),
        filter: `circle:${center.lon},${center.lat},${radiusMeters}`,
        bias: `proximity:${center.lon},${center.lat}`,
        limit: String(limit),
        apiKey: clientKey,
      }).toString();

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geoapify places search failed (${res.status}).`);
    const data = (await res.json()) as GeoapifyFeatureCollection;

    return (data?.features || [])
      .map((f) => {
        const coords = f?.geometry?.coordinates;
        if (!coords) return null;
        const [lon, lat] = coords;
        const name = (f.properties?.name || f.properties?.formatted || '').trim();
        const id = (f.properties?.place_id || `${lat},${lon},${name}`).trim();
        if (!name) return null;
        return {
          id,
          name,
          formatted: f.properties?.formatted,
          categories: f.properties?.categories,
          lat,
          lon,
        } satisfies GeoapifyPlace;
      })
      .filter(Boolean) as GeoapifyPlace[];
  }

  // Otherwise, use server-side proxy (Vercel /api/*).
  const res = await clientFetchWithTimeout('/api/geoapify/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: center.lat,
      lon: center.lon,
      radiusMeters,
      limit,
      interestTags: args.interestTags || [],
    }),
  }, 5000, 1);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Geoapify places failed (${res.status}).`);

  const places = Array.isArray(data?.places) ? data.places : [];
  return places as GeoapifyPlace[];
};
