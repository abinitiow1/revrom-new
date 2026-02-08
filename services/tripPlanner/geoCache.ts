import { getEncryptedItem, setEncryptedItem, removeEncryptedItem } from '../../utils/encryption';
import { geoapifyGeocode, geoapifyPlacesNearby, type GeoapifyPlace, type GeoPoint } from '../geoapifyService';
import { normalizeText } from './text';
import { withTimeout } from './promiseUtils';

type CacheEntry<T> = { value: T; expiresAt: number };

const TTL_7D_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const geocodeMem = new Map<string, CacheEntry<GeoPoint>>();
const placesMem = new Map<string, CacheEntry<GeoapifyPlace[]>>();
const geocodeInFlight = new Map<string, Promise<GeoPoint>>();
const placesInFlight = new Map<string, Promise<GeoapifyPlace[]>>();

const now = () => Date.now();

const pruneMap = <T>(map: Map<string, T>, max: number) => {
  while (map.size > max) {
    const oldestKey = map.keys().next().value as string | undefined;
    if (!oldestKey) break;
    map.delete(oldestKey);
  }
};

const memGet = <T>(map: Map<string, CacheEntry<T>>, key: string): T | null => {
  const hit = map.get(key);
  if (!hit) return null;
  if (now() > hit.expiresAt) {
    map.delete(key);
    return null;
  }
  return hit.value;
};

const memSet = <T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) => {
  map.set(key, { value, expiresAt: now() + ttlMs });
  pruneMap(map, MAX_CACHE_ENTRIES);
};

const safeGetEncrypted = <T>(key: string): T | null => {
  try {
    return getEncryptedItem<T>(key);
  } catch {
    return null;
  }
};

const safeSetEncrypted = <T>(key: string, data: T) => {
  try {
    setEncryptedItem<T>(key, data);
  } catch {
    // ignore (private browsing, quota exceeded, etc.)
  }
};

const safeRemoveEncrypted = (key: string) => {
  try {
    removeEncryptedItem(key);
  } catch {
    // ignore
  }
};

export const geocodeCached = async (text: string, destinationHint?: string) => {
  const q = String(text || '').trim();
  if (!q) throw new Error('Invalid location text');

  const attempt1 = destinationHint ? `${q}, ${destinationHint}` : q;
  const key = `tripplanner_geocode_v1:${normalizeText(attempt1)}`;

  const mem = memGet(geocodeMem, key);
  if (mem) return mem;

  const inFlight = geocodeInFlight.get(key);
  if (inFlight) return inFlight;

  const stored = safeGetEncrypted<CacheEntry<GeoPoint>>(key);
  if (stored?.value && typeof stored.expiresAt === 'number' && typeof stored.value.lat === 'number' && typeof stored.value.lon === 'number') {
    if (now() <= stored.expiresAt) {
      memSet(geocodeMem, key, stored.value, Math.max(1, stored.expiresAt - now()));
      return stored.value;
    }
    safeRemoveEncrypted(key);
  }

  const p = withTimeout(geoapifyGeocode(attempt1).catch(async () => geoapifyGeocode(q)), 4500, 'Geocoding')
    .then((value) => {
      if (typeof value?.lat !== 'number' || typeof value?.lon !== 'number') throw new Error('Invalid geocode result');
      const entry: CacheEntry<GeoPoint> = { value, expiresAt: now() + TTL_7D_MS };
      memSet(geocodeMem, key, value, TTL_7D_MS);
      safeSetEncrypted(key, entry);
      return value;
    })
    .finally(() => {
      geocodeInFlight.delete(key);
    });

  geocodeInFlight.set(key, p);
  pruneMap(geocodeInFlight, MAX_CACHE_ENTRIES);
  return p;
};

export const placesNearbyCached = async (args: {
  center: { lat: number; lon: number };
  radiusMeters: number;
  interestTags: string[];
  limit: number;
}): Promise<GeoapifyPlace[]> => {
  const key = `tripplanner_places_v1:${args.center.lat.toFixed(4)},${args.center.lon.toFixed(4)}|r=${args.radiusMeters}|l=${
    args.limit
  }|t=${(args.interestTags || [])
    .slice()
    .sort()
    .join(',')}`;

  const mem = memGet(placesMem, key);
  if (mem) return mem;

  const inFlight = placesInFlight.get(key);
  if (inFlight) return inFlight;

  const stored = safeGetEncrypted<CacheEntry<GeoapifyPlace[]>>(key);
  if (stored?.value && typeof stored.expiresAt === 'number') {
    if (now() <= stored.expiresAt) {
      memSet(placesMem, key, stored.value, Math.max(1, stored.expiresAt - now()));
      return stored.value;
    }
    safeRemoveEncrypted(key);
  }

  const p = withTimeout(
    geoapifyPlacesNearby({
      center: { lat: args.center.lat, lon: args.center.lon },
      radiusMeters: args.radiusMeters,
      interestTags: args.interestTags || [],
      limit: args.limit,
    }),
    5500,
    'Places lookup',
  )
    .catch(() => [] as GeoapifyPlace[])
    .then((places) => {
      const safe = Array.isArray(places) ? places : ([] as GeoapifyPlace[]);
      const entry: CacheEntry<GeoapifyPlace[]> = { value: safe, expiresAt: now() + TTL_7D_MS };
      memSet(placesMem, key, safe, TTL_7D_MS);
      safeSetEncrypted(key, entry);
      return safe;
    })
    .finally(() => {
      placesInFlight.delete(key);
    });

  placesInFlight.set(key, p);
  pruneMap(placesInFlight, MAX_CACHE_ENTRIES);
  return p;
};
