// Note: Vercel runs API routes as ESM; relative imports must include the file extension at runtime.
// TypeScript will resolve this to `shared.ts` locally and emit an import to `shared.js` for the deployed function.
import { cacheGet, cacheSet, getGeoapifyApiKey, getQuery, rateLimitOrThrow, readJsonBody, sendJson } from './shared.js';

// Ensure Vercel runs this as a Node.js Serverless Function (not Edge).
export const config = { runtime: 'nodejs' };

type GeoapifyFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    properties?: { formatted?: string };
    geometry?: { type: 'Point'; coordinates?: [number, number] };
  }>;
};

export default async function handler(req: any, res: any) {
  try {
    rateLimitOrThrow(req, 60, 5 * 60 * 1000, 'geoapify:geocode'); // 60 requests / 5 minutes / IP

    const q = getQuery(req);
    const body = await readJsonBody(req);
    const text = String(q.get('text') || body?.text || '').trim();
    if (!text) return sendJson(res, 400, { error: 'Missing "text" parameter.' });

    const cacheKey = `geocode:${text.toLowerCase()}`;
    const cached = cacheGet<any>(cacheKey);
    if (cached) return sendJson(res, 200, cached);

    const apiKey = getGeoapifyApiKey();
    const url =
      `https://api.geoapify.com/v1/geocode/search?` +
      new URLSearchParams({
        text,
        limit: '1',
        format: 'geojson',
        apiKey,
      }).toString();

    const upstream = await fetch(url);
    if (!upstream.ok) return sendJson(res, 502, { error: `Geoapify geocode failed (${upstream.status}).` });
    const data = (await upstream.json()) as GeoapifyFeatureCollection;
    const feature = data?.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!coords) return sendJson(res, 404, { error: 'No geocode result found.' });

    const [lon, lat] = coords;
    const payload = { lat, lon, formatted: feature?.properties?.formatted || '' };
    cacheSet(cacheKey, payload, 24 * 60 * 60 * 1000); // 24h cache
    return sendJson(res, 200, payload);
  } catch (e: any) {
    const status = e?.statusCode || 500;
    const headers: Record<string, string> = {};
    if (status === 429 && e?.retryAfterSec) headers['Retry-After'] = String(e.retryAfterSec);
    return sendJson(res, status, { error: e?.message || 'Server error.' }, headers);
  }
}
