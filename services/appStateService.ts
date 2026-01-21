import type {
  BlogPost,
  CustomPage,
  Departure,
  GalleryPhoto,
  GoogleReview,
  InstagramPost,
  ItineraryQuery,
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
  itineraryQueries: ItineraryQuery[];
  customPages: CustomPage[];
};

type AppStateRow = {
  id: string;
  state: AppStateSnapshot;
  updated_at?: string;
};

const TABLE = 'app_state';
const DEFAULT_ID = 'default';

export const loadAppState = async (): Promise<AppStateSnapshot | null> => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from(TABLE)
    .select('id,state,updated_at')
    .eq('id', DEFAULT_ID)
    .maybeSingle<AppStateRow>();

  if (error) throw error;
  if (!data?.state) return null;
  return data.state;
};

export const saveAppState = async (snapshot: AppStateSnapshot): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: DEFAULT_ID, state: snapshot }, { onConflict: 'id' });

  if (error) throw error;
};

// Debounced save helper so Admin edits don't spam the DB.
export const createDebouncedStateSaver = (delayMs: number = 1200) => {
  let timer: number | null = null;
  let pending: AppStateSnapshot | null = null;

  const flush = async () => {
    if (!pending) return;
    const snapshot = pending;
    pending = null;
    await saveAppState(snapshot);
  };

  const schedule = (snapshot: AppStateSnapshot) => {
    pending = snapshot;
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      flush().catch((err) => {
        console.error('Failed to save app state to Supabase:', err);
      });
    }, delayMs);
  };

  return { schedule, flush };
};
