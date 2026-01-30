type GeoapifyFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    properties?: { place_id?: string; name?: string; formatted?: string; categories?: string[] };
    geometry?: { type: 'Point'; coordinates?: [number, number] };
  }>;
};

const getClientGeoapifyKeyIfPresent = () =>
  ((import.meta as any).env?.VITE_GEOAPIFY_API_KEY as string | undefined) || undefined;

export type GeoPoint = { lat: number; lon: number; formatted?: string };

export const geoapifyGeocode = async (text: string): Promise<GeoPoint> => {
  const q = (text || '').trim();
  if (!q) throw new Error('Destination is required.');

  // Prefer server-side proxy (Vercel /api/*). Fallback to direct only if a client key exists (local dev).
  try {
    const res = await fetch('/api/geoapify/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Geoapify geocode failed (${res.status}).`);
    return { lat: data.lat, lon: data.lon, formatted: data.formatted };
  } catch (e) {
    const key = getClientGeoapifyKeyIfPresent();
    if (!key) {
      throw new Error(
        'Geoapify server API is not reachable locally. Use `vercel dev` for local API routes, or temporarily set VITE_GEOAPIFY_API_KEY for direct calls.'
      );
    }

    const url =
      `https://api.geoapify.com/v1/geocode/search?` +
      new URLSearchParams({
        text: q,
        limit: '1',
        format: 'geojson',
        apiKey: key,
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

  // Prefer server-side proxy (Vercel /api/*). Fallback to direct only if a client key exists (local dev).
  try {
    const res = await fetch('/api/geoapify/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: center.lat,
        lon: center.lon,
        radiusMeters,
        limit,
        interestTags: args.interestTags || [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Geoapify places failed (${res.status}).`);

    const places = Array.isArray(data?.places) ? data.places : [];
    return places as GeoapifyPlace[];
  } catch (e) {
    const key = getClientGeoapifyKeyIfPresent();
    if (!key) {
      throw new Error(
        'Geoapify server API is not reachable locally. Use `vercel dev` for local API routes, or temporarily set VITE_GEOAPIFY_API_KEY for direct calls.'
      );
    }

    // Direct-call fallback (client key): use broad categories to keep behavior consistent with server mapping.
    const categories = ['tourism.sights', 'natural'];
    const url =
      `https://api.geoapify.com/v2/places?` +
      new URLSearchParams({
        categories: categories.join(','),
        filter: `circle:${center.lon},${center.lat},${radiusMeters}`,
        bias: `proximity:${center.lon},${center.lat}`,
        limit: String(limit),
        apiKey: key,
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
};
