type GeoapifyFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    properties?: { place_id?: string; name?: string; formatted?: string; categories?: string[] };
    geometry?: { type: 'Point'; coordinates?: [number, number] };
  }>;
};

import { fetchWithTimeout as clientFetchWithTimeout } from './fetchWithTimeout';
import { getEncryptedItem, setEncryptedItem, removeEncryptedItem } from '../utils/encryption';
import { logInfo, logWarn, logError } from '../utils/logger';

// Geocoding cache helpers (1 hour TTL to reduce API costs and improve UX)
const GEOCODE_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface CacheData {
  lat: number;
  lon: number;
  formatted?: string;
  timestamp: number;
}

const getGeocodeCache = (text: string): GeoPoint | null => {
  try {
    const cacheKey = `geocode_${text.toLowerCase().trim()}`;
    
    // Try to get encrypted cache first
    const cached = getEncryptedItem<CacheData>(cacheKey);
    
    if (!cached) {
      return null;
    }

    // Check if cache expired
    if (Date.now() - cached.timestamp > GEOCODE_CACHE_TTL) {
      removeEncryptedItem(cacheKey);
      return null;
    }
    
    logInfo('Geoapify', 'Cache hit', `${text} → cached result`);
    return { lat: cached.lat, lon: cached.lon, formatted: cached.formatted };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logWarn('Geoapify', 'Cache retrieval failed', errorMsg);
    return null;
  }
};

const setGeocodeCache = (text: string, result: GeoPoint): void => {
  try {
    const cacheKey = `geocode_${text.toLowerCase().trim()}`;
    const cacheData: CacheData = { ...result, timestamp: Date.now() };
    
    // Store encrypted to protect location data
    const stored = setEncryptedItem(cacheKey, cacheData);
    
    if (stored) {
      logInfo('Geoapify', 'Cache stored encrypted', text);
    } else {
      logWarn('Geoapify', 'Failed to cache result', text);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logWarn('Geoapify', 'Cache storage failed', errorMsg);
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

/**
 * Geocode a location using server-side API endpoint
 * 
 * SECURITY: API key is handled server-side, never exposed to browser
 * - Browser sends: { text: "destination" }
 * - Server uses: GEOAPIFY_API_KEY (environment variable)
 * - Browser receives: { lat, lon, formatted }
 * 
 * @param text - Destination to geocode
 * @param opts - Additional options (e.g., turnstileToken)
 * @returns GeoPoint with coordinates
 * @throws Error if geocoding fails
 */
export const geoapifyGeocode = async (text: string, opts?: { turnstileToken?: string }): Promise<GeoPoint> => {
  const q = (text || '').trim();
  if (!q) throw new Error('Destination is required.');

  // Try cache first to avoid unnecessary API calls
  const cached = getGeocodeCache(q);
  if (cached) {
    return cached;
  }

  logInfo('Geoapify', 'Requesting geocoding from server', q);

  try {
    // Call server endpoint instead of direct Geoapify API
    // This hides the API key from browser
    const response = await clientFetchWithTimeout('/api/geoapify/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: q }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError('Geoapify', `Server geocoding failed (${response.status})`, errorText);
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    type GeocodeResponseBody = {
      error?: string;
      lat?: number;
      lon?: number;
      formatted?: string;
    };

    const data = (await response.json()) as GeocodeResponseBody;

    if (data.error) {
      logError('Geoapify', 'Server returned error', data.error);
      throw new Error(data.error);
    }

    if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
      logError('Geoapify', 'Invalid response from server', 'Missing lat/lon');
      throw new Error('Could not geocode the selected destination.');
    }

    const result: GeoPoint = {
      lat: data.lat,
      lon: data.lon,
      formatted: data.formatted,
    };

    // Cache the result (encrypted)
    setGeocodeCache(q, result);
    logInfo('Geoapify', 'Geocoding successful', `${q} → [${data.lat}, ${data.lon}]`);
    return result;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Geoapify', 'Geocoding failed', errorMsg);
    throw err;
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

  logInfo('Geoapify Places', 'Requesting nearby places', `Center: [${center.lat}, ${center.lon}]`);

  try {
    // Call server endpoint (API key hidden server-side)
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

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMsg = typeof data === 'object' && data !== null && 'error' in data ? data.error : `Status ${res.status}`;
      logError('Geoapify Places', 'Server request failed', String(errorMsg));
      throw new Error(String(errorMsg));
    }

    type PlacesResponse = {
      error?: string;
      places?: GeoapifyPlace[];
    };

    const data = (await res.json()) as PlacesResponse;

    if (data?.error) {
      logError('Geoapify Places', 'Server returned error', data.error);
      throw new Error(data.error);
    }

    const places = Array.isArray(data?.places) ? data.places : [];
    logInfo('Geoapify Places', 'Found places', `${places.length} results`);
    return places;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    logError('Geoapify Places', 'Places search failed', errorMsg);
    throw err;
  }
};
