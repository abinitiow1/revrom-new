type GeoapifyFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    properties?: { place_id?: string; name?: string; formatted?: string; categories?: string[] };
    geometry?: { type: 'Point'; coordinates?: [number, number] };
  }>;
};

const getClientGeoapifyKeyIfPresent = () =>
  ((import.meta as any).env?.VITE_GEOAPIFY_API_KEY as string | undefined) || undefined;

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
    return { lat, lon, formatted: feature?.properties?.formatted };
  }

  // Otherwise, use server-side proxy (Vercel /api/*).
  const res = await fetch('/api/geoapify/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: q }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Geoapify geocode failed (${res.status}).`);
  return { lat: data.lat, lon: data.lon, formatted: data.formatted };
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
  turnstileToken?: string;
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
  const res = await fetch('/api/geoapify/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: center.lat,
      lon: center.lon,
      radiusMeters,
      limit,
      interestTags: args.interestTags || [],
      turnstileToken: args.turnstileToken,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Geoapify places failed (${res.status}).`);

  const places = Array.isArray(data?.places) ? data.places : [];
  return places as GeoapifyPlace[];
};
