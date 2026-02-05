import {
  cacheGet,
  cacheSet,
  getGeoapifyApiKey,
  getQuery,
  mapInterestTagsToGeoapifyCategories,
  rateLimitOrThrow,
  readJsonBody,
  sendJson,
  type InterestTag,
} from './shared.js';
import { fetchWithTimeout } from './fetchWithTimeout.js';

// Ensure Vercel runs this as a Node.js Serverless Function (not Edge).
export const config = { runtime: 'nodejs' };

type GeoapifyFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    properties?: {
      place_id?: string;
      name?: string;
      formatted?: string;
      categories?: string[];
    };
    geometry?: { type: 'Point'; coordinates?: [number, number] };
  }>;
};

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed.' });

    await rateLimitOrThrow(req, 60, 5 * 60 * 1000, 'geoapify:places'); // 60 requests / 5 minutes / IP

    const q = getQuery(req);
    const body = await readJsonBody(req);

    const lat = Number(q.get('lat') || body?.lat);
    const lon = Number(q.get('lon') || body?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return sendJson(res, 400, { error: 'Missing or invalid "lat"/"lon".' });
    }

    const radiusMeters = Number(q.get('radiusMeters') || body?.radiusMeters || 150000);
    const limit = Number(q.get('limit') || body?.limit || 40);
    const interestTags = (body?.interestTags || body?.interests || []) as InterestTag[];
    const categories = Array.isArray(body?.categories) && body.categories.length
      ? (body.categories as string[])
      : mapInterestTagsToGeoapifyCategories(interestTags);

    const cacheKey = `places:${lat.toFixed(5)},${lon.toFixed(5)}:${radiusMeters}:${limit}:${categories.join(',')}`;
    const cached = cacheGet<any>(cacheKey);
    if (cached) return sendJson(res, 200, cached);

    const apiKey = getGeoapifyApiKey();
    const url =
      `https://api.geoapify.com/v2/places?` +
      new URLSearchParams({
        categories: categories.join(','),
        filter: `circle:${lon},${lat},${radiusMeters}`,
        bias: `proximity:${lon},${lat}`,
        limit: String(limit),
        apiKey,
      }).toString();

    const upstream = await fetchWithTimeout(url, { method: 'GET' }, 4000, 1);
    if (!upstream.ok) {
      if (upstream.status === 401) {
        console.error('Geoapify returned 401 (invalid key). Set GEOAPIFY_API_KEY (server env) with your Geoapify API key.');
        return sendJson(res, 502, { error: `Geoapify places failed (401). Check GEOAPIFY_API_KEY on the server.` });
      }
      return sendJson(res, 502, { error: `Geoapify places failed (${upstream.status}).` });
    }
    const data = (await upstream.json()) as GeoapifyFeatureCollection;

    const places = (data?.features || [])
      .map((f) => {
        const coords = f?.geometry?.coordinates;
        if (!coords) return null;
        const [plon, plat] = coords;
        const name = String(f?.properties?.name || f?.properties?.formatted || '').trim();
        if (!name) return null;
        const id = String(f?.properties?.place_id || `${plat},${plon},${name}`).trim();
        return {
          id,
          name,
          formatted: String(f?.properties?.formatted || '').trim(),
          categories: Array.isArray(f?.properties?.categories) ? f.properties!.categories : [],
          lat: plat,
          lon: plon,
        };
      })
      .filter(Boolean);

    const payload = { places, usedCategories: categories };
    cacheSet(cacheKey, payload, 30 * 60 * 1000); // 30m cache
    return sendJson(res, 200, payload);
  } catch (e: any) {
    const status = e?.statusCode || 500;
    const headers: Record<string, string> = {};
    if (status === 429 && e?.retryAfterSec) headers['Retry-After'] = String(e.retryAfterSec);
    return sendJson(res, status, { error: e?.message || 'Server error.' }, headers);
  }
}
