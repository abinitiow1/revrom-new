import type {
  BlogPost,
  CustomPage,
  Departure,
  GalleryPhoto,
  GoogleReview,
  InstagramPost,
  SiteContent,
  Trip,
} from '../types';
import { getSupabase } from './supabaseClient';

export type AppStateSnapshot = {
  trips: Trip[];
  departures: Departure[];
  blogPosts: BlogPost[];
  galleryPhotos: GalleryPhoto[];
  instagramPosts: InstagramPost[];
  googleReviews: GoogleReview[];
  siteContent: SiteContent;
  customPages: CustomPage[];
};

type AppStateRow = {
  id: string;
  state: AppStateSnapshot;
  updated_at?: string;
};

export type AppStateLoadResult = {
  snapshot: AppStateSnapshot;
  updatedAt: string | null;
};

const TABLE = 'app_state';
const DEFAULT_ID = 'default';

export const loadAppState = async (): Promise<AppStateLoadResult | null> => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,state,updated_at')
    .eq('id', DEFAULT_ID)
    .maybeSingle<AppStateRow>();

  if (error) throw error;
  if (!data?.state) return null;
  return { snapshot: data.state, updatedAt: data.updated_at ?? null };
};

export const saveAppState = async (
  snapshot: AppStateSnapshot,
  expectedUpdatedAt?: string | null,
): Promise<string | null> => {
  const supabase = getSupabase();

  if (expectedUpdatedAt) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ state: snapshot })
      .eq('id', DEFAULT_ID)
      .eq('updated_at', expectedUpdatedAt)
      .select('updated_at')
      .maybeSingle<AppStateRow>();

    if (error) throw error;
    if (!data?.updated_at) {
      throw new Error('Save conflict: remote content changed. Please reload the admin and try again.');
    }
    return data.updated_at ?? null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ id: DEFAULT_ID, state: snapshot }, { onConflict: 'id' })
    .select('updated_at')
    .maybeSingle<AppStateRow>();

  if (error) throw error;
  return data?.updated_at ?? null;
};

type DebouncedSaverCallbacks<TMeta> = {
  onStart?: (meta: TMeta) => void;
  onSuccess?: (meta: TMeta, updatedAt: string | null) => void;
  onError?: (err: unknown, meta: TMeta) => void;
};

// Debounced save helper so Admin edits don't spam the DB.
export const createDebouncedStateSaver = <TMeta = undefined>(
  delayMs: number = 1200,
  callbacks?: DebouncedSaverCallbacks<TMeta>,
) => {
  let timer: number | null = null;
  let pending: AppStateSnapshot | null = null;
  let pendingMeta: TMeta = undefined as TMeta;

  const flush = async () => {
    if (!pending) return;
    const snapshot = pending;
    const meta = pendingMeta;
    pending = null;
    pendingMeta = undefined as TMeta;

    callbacks?.onStart?.(meta);
    const updatedAt = await saveAppState(snapshot, (meta as any)?.expectedUpdatedAt);
    callbacks?.onSuccess?.(meta, updatedAt);
  };

  const schedule = (snapshot: AppStateSnapshot, meta: TMeta = undefined as TMeta) => {
    pending = snapshot;
    pendingMeta = meta;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      flush().catch((err) => {
        callbacks?.onError?.(err, meta);
        if (!callbacks?.onError) {
          console.error('Failed to save app state to Supabase:', err);
        }
      });
    }, delayMs);
  };

  return { schedule, flush };
};
