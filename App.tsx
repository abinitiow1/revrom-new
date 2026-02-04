
import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from 'react';
import type { Trip, Departure, BlogPost, GalleryPhoto, InstagramPost, Review, GoogleReview, SiteContent, ItineraryQuery, ThemeColors, CustomPage, ContactMessage, NewsletterSubscriber } from './types';
import { trips as initialTrips, departures as initialDepartures, blogPosts as initialBlogPosts, galleryPhotos as initialGalleryPhotos, instagramPosts as initialInstagramPosts, googleReviews as initialGoogleReviews, initialSiteContent, itineraryQueries as initialItineraryQueries, initialCustomPages } from './data/mockData';
import { themes } from './data/themes';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/TripDetailPage';
import BookingPage from './pages/BookingPage';
import Preloader from './components/Preloader';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import ErrorBoundary from './components/ErrorBoundary';
import { createDebouncedStateSaver, loadAppState, saveAppState, type AppStateSnapshot } from './services/appStateService';
import { getSupabase } from './services/supabaseClient';
import { listItineraryQueries, submitItineraryQuery, updateItineraryQueryStatus } from './services/itineraryQueryService';
import { listContactMessages } from './services/contactMessageService';
import { listNewsletterSubscribers } from './services/newsletterService';
import { getIsAdmin } from './services/adminService';

const ContactPage = lazy(() => import('./pages/ContactPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const CustomizePage = lazy(() => import('./pages/CustomizePage'));
const DynamicPage = lazy(() => import('./pages/DynamicPage'));
const AllToursPage = lazy(() => import('./pages/AllToursPage'));

type View = 'home' | 'tripDetail' | 'booking' | 'contact' | 'admin' | 'login' | 'blog' | 'blogDetail' | 'gallery' | 'customize' | 'customPage' | 'allTours';
export type Theme = 'light' | 'dark';

const makeId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const App: React.FC = () => {
  const DATA_MODE =
    ((import.meta as any).env?.VITE_DATA_MODE as string | undefined) ||
    ((window as any).__REVROM_DATA_MODE__ as string | undefined) ||
    (((import.meta as any).env?.PROD as boolean | undefined) ? 'supabase' : 'local');
  const isSupabaseMode = DATA_MODE === 'supabase';
  const [isRemoteReady, setIsRemoteReady] = useState(!isSupabaseMode);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const saveSeqRef = React.useRef(0);
  const skipNextDirtyRef = React.useRef(false);
  const autoSaveEnabledRef = React.useRef(autoSaveEnabled);
  useEffect(() => {
    autoSaveEnabledRef.current = autoSaveEnabled;
  }, [autoSaveEnabled]);

  const [view, setView] = useState<View>(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const sp = new URLSearchParams(hash);
      const hView = sp.get('view');
      if (hView) return hView as View;
    } catch (err) {}

    // Support direct /admin access (production rewrite serves the SPA entry).
    // We start at login and let the existing auth flow switch to 'admin' after successful sign-in.
    try {
      const path = window.location.pathname.replace(/\/+$/, '');
      if (path === '/admin') return 'login';
    } catch {}
    return 'home';
  });
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPost | null>(null);
  const [currentCustomPageSlug, setCurrentCustomPageSlug] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(!isSupabaseMode);
  const [initialDestinationFilter, setInitialDestinationFilter] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState<string | null>(null);
  const remoteUpdatedAtRef = React.useRef<string | null>(null);
  useEffect(() => {
    remoteUpdatedAtRef.current = remoteUpdatedAt;
  }, [remoteUpdatedAt]);
  const saver = useMemo(
    () =>
      isSupabaseMode
        ? createDebouncedStateSaver<{ seq: number; expectedUpdatedAt: string | null }>(1200, {
            onStart: () => setSaveStatus('saving'),
            onSuccess: (meta, updatedAt) => {
              setRemoteUpdatedAt(updatedAt);
              if (meta?.seq === saveSeqRef.current) setSaveStatus('saved');
              else setSaveStatus('dirty');
            },
            onError: (err) => {
              setSaveStatus('error');
              console.error('Failed to save app state to Supabase:', err);
              try {
                console.error('Supabase error details:', JSON.stringify(err, Object.getOwnPropertyNames(err as any)));
              } catch {}
            },
          })
        : null,
    [isSupabaseMode],
  );

  // If the user hits /admin directly and already has an active admin session, auto-enter the admin view.
  useEffect(() => {
    try {
      const path = window.location.pathname.replace(/\/+$/, '');
      if (path === '/admin' && view === 'login' && isLoggedIn && isAdmin) {
        setView('admin');
      }
    } catch {}
  }, [isAdmin, isLoggedIn, view]);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const t = window.setTimeout(() => {
      setSaveStatus((s) => (s === 'saved' ? 'idle' : s));
    }, 1800);
    return () => window.clearTimeout(t);
  }, [saveStatus]);

  // Persistence Helpers
  const getStored = <T,>(key: string, initial: T): T => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initial;
  };

  const setStored = <T,>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Persistent States
  // In Supabase mode, the DB is the source of truth (do not hydrate/sync from localStorage).
  const [trips, setTrips] = useState<Trip[]>(() => (isSupabaseMode ? [] : getStored('trips', initialTrips)));
  const [departures, setDepartures] = useState<Departure[]>(() => (isSupabaseMode ? [] : getStored('departures', initialDepartures)));
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => (isSupabaseMode ? [] : getStored('blogPosts', initialBlogPosts)));
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() => (isSupabaseMode ? [] : getStored('galleryPhotos', initialGalleryPhotos)));
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>(() => (isSupabaseMode ? [] : getStored('instagramPosts', initialInstagramPosts)));
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>(() => (isSupabaseMode ? [] : getStored('googleReviews', initialGoogleReviews)));
  const [siteContent, setSiteContent] = useState<SiteContent>(() => {
    if (isSupabaseMode) return initialSiteContent;
    const stored = getStored('siteContent', initialSiteContent) as any;
    return { ...initialSiteContent, ...(stored || {}) };
  });
  const [itineraryQueries, setItineraryQueries] = useState<ItineraryQuery[]>(() => (isSupabaseMode ? [] : getStored('itineraryQueries', initialItineraryQueries)));
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => []);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>(() => []);
  const [customPages, setCustomPages] = useState<CustomPage[]>(() => (isSupabaseMode ? [] : getStored('customPages', initialCustomPages)));

  const buildSnapshot = useCallback(
    (): AppStateSnapshot => ({
      trips,
      departures,
      blogPosts,
      galleryPhotos,
      instagramPosts,
      googleReviews,
      siteContent,
      customPages,
    }),
    [trips, departures, blogPosts, galleryPhotos, instagramPosts, googleReviews, siteContent, customPages],
  );

  // Initial Loading Simulator - reduced from 2500ms to 800ms for faster load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800); 
    return () => clearTimeout(timer);
  }, []);

  // Auto-sync to localStorage (local mode only)
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('trips', trips);
  }, [isSupabaseMode, trips]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('departures', departures);
  }, [isSupabaseMode, departures]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('blogPosts', blogPosts);
  }, [isSupabaseMode, blogPosts]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('galleryPhotos', galleryPhotos);
  }, [isSupabaseMode, galleryPhotos]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('instagramPosts', instagramPosts);
  }, [isSupabaseMode, instagramPosts]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('googleReviews', googleReviews);
  }, [isSupabaseMode, googleReviews]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('siteContent', siteContent);
  }, [isSupabaseMode, siteContent]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('itineraryQueries', itineraryQueries);
  }, [isSupabaseMode, itineraryQueries]);
  useEffect(() => {
    if (isSupabaseMode) return;
    setStored('customPages', customPages);
  }, [isSupabaseMode, customPages]);

  // Supabase Auth: keep isLoggedIn in sync with real session.
  useEffect(() => {
    if (!isSupabaseMode) return;
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        setIsLoggedIn(!!data.session);
        if (data.session) {
          try {
            setIsAdmin(await getIsAdmin());
          } catch {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        unsub = supabase.auth.onAuthStateChange((_event, session) => {
          setIsLoggedIn(!!session);
          if (!session) {
            setIsAdmin(false);
            return;
          }
          getIsAdmin()
            .then((ok) => setIsAdmin(ok))
            .catch(() => setIsAdmin(false));
        }) as any;
      } catch (err) {
        console.error('Supabase auth init failed:', err);
      }
    })();

    return () => {
      unsub?.data?.subscription?.unsubscribe?.();
    };
  }, [isSupabaseMode]);

  // Supabase: hydrate initial state (once) when enabled.
  useEffect(() => {
    if (!isSupabaseMode) return;
    let canceled = false;

    (async () => {
      try {
        const loaded = await loadAppState();
        if (canceled) return;
        if (loaded?.snapshot) {
          skipNextDirtyRef.current = true;
          setRemoteUpdatedAt(loaded.updatedAt ?? null);
          setTrips(loaded.snapshot.trips || []);
          setDepartures(loaded.snapshot.departures || []);
          setBlogPosts(loaded.snapshot.blogPosts || []);
          setGalleryPhotos(loaded.snapshot.galleryPhotos || []);
          setInstagramPosts(loaded.snapshot.instagramPosts || []);
          setGoogleReviews(loaded.snapshot.googleReviews || []);
          setSiteContent({ ...initialSiteContent, ...((loaded.snapshot.siteContent as any) || {}) });
          setCustomPages(loaded.snapshot.customPages || []);
        }
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
      } finally {
        if (!canceled) setIsRemoteReady(true);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [isSupabaseMode]);

  // Supabase: persist changes (debounced) after initial hydration.
  useEffect(() => {
    if (!isSupabaseMode) return;
    if (!isRemoteReady) return;
    if (!saver) return;
    if (!isLoggedIn) return;
    if (!isAdmin) return;

    if (skipNextDirtyRef.current) {
      skipNextDirtyRef.current = false;
      return;
    }

    const snapshot = buildSnapshot();
    saveSeqRef.current += 1;
    const seq = saveSeqRef.current;
    setSaveStatus('dirty');

    if (autoSaveEnabledRef.current) {
      saver.schedule(snapshot, { seq, expectedUpdatedAt: remoteUpdatedAtRef.current });
    }
  }, [
    isSupabaseMode,
    isRemoteReady,
    isLoggedIn,
    isAdmin,
    saver,
    buildSnapshot,
    trips,
    departures,
    blogPosts,
    galleryPhotos,
    instagramPosts,
    googleReviews,
    siteContent,
    customPages,
  ]);

  const saveNow = useCallback(async () => {
    if (!isSupabaseMode) return;
    if (!isLoggedIn) return;
    if (!isAdmin) return;
    const snapshot = buildSnapshot();
    const seq = saveSeqRef.current;
    setSaveStatus('saving');
    try {
      const updatedAt = await saveAppState(snapshot, remoteUpdatedAtRef.current);
      setRemoteUpdatedAt(updatedAt);
      if (seq === saveSeqRef.current) setSaveStatus('saved');
      else setSaveStatus('dirty');
    } catch (err) {
      setSaveStatus('error');
      console.error('Manual save failed:', err);
      try {
        console.error('Supabase error details:', JSON.stringify(err, Object.getOwnPropertyNames(err as any)));
      } catch {}
    }
  }, [buildSnapshot, isAdmin, isLoggedIn, isSupabaseMode]);

  // Supabase: load leads (admin only).
  useEffect(() => {
    if (!isSupabaseMode) return;
    if (!isLoggedIn) return;
    if (!isAdmin) return;
    let canceled = false;

    (async () => {
      try {
        const leads = await listItineraryQueries();
        if (!canceled) setItineraryQueries(leads);
      } catch (err) {
        console.error('Failed to load leads from Supabase:', err);
        try {
          console.error('Supabase error details:', JSON.stringify(err, Object.getOwnPropertyNames(err as any)));
        } catch {}
      }
    })();

    return () => {
      canceled = true;
    };
  }, [isSupabaseMode, isAdmin, isLoggedIn]);

  // Supabase: load contact messages + newsletter subscribers (admin only).
  useEffect(() => {
    if (!isSupabaseMode) return;
    if (!isLoggedIn) return;
    if (!isAdmin) return;
    let canceled = false;

    (async () => {
      try {
        const [messages, subs] = await Promise.all([listContactMessages(), listNewsletterSubscribers()]);
        if (canceled) return;
        setContactMessages(messages);
        setNewsletterSubscribers(subs);
      } catch (err) {
        console.error('Failed to load inbox data from Supabase:', err);
        try {
          console.error('Supabase error details:', JSON.stringify(err, Object.getOwnPropertyNames(err as any)));
        } catch {}
      }
    })();

    return () => {
      canceled = true;
    };
  }, [isSupabaseMode, isAdmin, isLoggedIn]);

  // Warn on navigation if there are unsaved admin changes.
  useEffect(() => {
    if (!isSupabaseMode) return;
    if (!isAdmin) return;
    const shouldBlock = saveStatus === 'dirty' || saveStatus === 'saving';
    if (!shouldBlock) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isSupabaseMode, isAdmin, saveStatus]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
    const selectedThemeName = siteContent.activeTheme;
    let themeColors: ThemeColors;
    if (selectedThemeName === 'Custom') {
        themeColors = siteContent.customThemeColors;
    } else {
        const foundTheme = themes.find(t => t.name === selectedThemeName);
        themeColors = foundTheme ? foundTheme.colors : themes.find(t => t.name === 'Default')!.colors;
    }

    const root = document.documentElement;
    const colors = theme === 'dark' ? themeColors.dark : themeColors.light;
    const colorMap = {
        '--color-brand-primary': colors.primary,
        '--color-brand-primary-dark': colors.primaryDark,
        '--color-brand-accent-gold': colors.accentGold,
        '--color-background': colors.background,
        '--color-foreground': colors.foreground,
        '--color-card': colors.card,
        '--color-muted-foreground': colors.mutedForeground,
        '--color-border': colors.border,
        '--color-dark-background': themeColors.dark.background,
        '--color-dark-foreground': themeColors.dark.foreground,
        '--color-dark-card': themeColors.dark.card,
        '--color-dark-muted-foreground': themeColors.dark.mutedForeground,
        '--color-dark-border': themeColors.dark.border,
    };
    for (const [property, value] of Object.entries(colorMap)) {
      root.style.setProperty(property, value);
    }
  }, [siteContent.activeTheme, siteContent.customThemeColors, theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  
  const addInquiry = useCallback(
    (q: Omit<ItineraryQuery, 'id' | 'date'>) => {
      const hasContact = Boolean(q.whatsappNumber || q.email);
      if (!hasContact) return;

      const lead: ItineraryQuery = {
        ...q,
        id: makeId(),
        date: new Date().toISOString(),
        status: 'new',
      };

      // In Supabase mode, submit the lead via server API (Service Role insert). Keep local fallback otherwise.
      if (isSupabaseMode) {
        submitItineraryQuery(lead).catch((err) => {
          console.error('Failed to submit lead to Supabase:', err);
          try {
            console.error('Supabase error details:', JSON.stringify(err, Object.getOwnPropertyNames(err as any)));
          } catch {}
        });
      } else {
        setItineraryQueries((prev) => [lead, ...prev]);
      }
    },
    [isSupabaseMode],
  );

  const setLeadStatus = useCallback(
    async (id: string, status: ItineraryQuery['status']) => {
      if (!status) return;
      // Optimistic UI update (works for both local + supabase mode).
      setItineraryQueries((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));

      if (!isSupabaseMode) return;
      if (!isLoggedIn) return;
      if (!isAdmin) return;
      try {
        await updateItineraryQueryStatus(id, status);
      } catch (err) {
        console.error('Failed to update lead status:', err);
        // Best-effort rollback by refetching leads
        try {
          const leads = await listItineraryQueries();
          setItineraryQueries(leads);
        } catch {}
      }
    },
    [isAdmin, isLoggedIn, isSupabaseMode],
  );

  // ----- URL hash sync (preserve view on reload / back-forward navigation) -----
  const buildHash = (params: Record<string, string | null | undefined>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) sp.set(k, String(v));
    });
    return `#${sp.toString()}`;
  };

  // refs to manage initial load vs user navigation and avoid update loops
  const initializedRef = React.useRef(false);
  const suppressHashUpdateRef = React.useRef(false);
  const lastTripIdRef = React.useRef<string | null>(null);
  const lastBlogIdRef = React.useRef<string | null>(null);
  const lastCustomSlugRef = React.useRef<string | null>(null);

  const updateHashFromState = () => {
    if (suppressHashUpdateRef.current) return;
    const params: Record<string, string | null> = { view };
    const current = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    // Preserve admin-only UI state in the hash so browser back/forward stays inside admin when modals/tabs are open.
    if (view === 'admin') {
      const tab = current.get('tab');
      const modal = current.get('modal');
      if (tab) params.tab = tab;
      if (modal) params.modal = modal;
    }

    // Only encode detail IDs when that view is active; otherwise back/exit can "snap" into a detail page.
    // If selected objects aren't loaded yet, preserve IDs from the existing hash so refresh during load doesn't strip them.
    if (view === 'tripDetail' || view === 'booking') {
      if (selectedTrip) params.tripId = selectedTrip.id;
      else if (current.get('tripId')) params.tripId = current.get('tripId');
      else if (lastTripIdRef.current) params.tripId = lastTripIdRef.current;
    }
    if (view === 'blogDetail') {
      if (selectedBlogPost) params.blogId = selectedBlogPost.id;
      else if (current.get('blogId')) params.blogId = current.get('blogId');
      else if (lastBlogIdRef.current) params.blogId = lastBlogIdRef.current;
    }
    if (view === 'customPage') {
      if (currentCustomPageSlug) params.custom = currentCustomPageSlug;
      else if (current.get('custom')) params.custom = current.get('custom');
      else if (lastCustomSlugRef.current) params.custom = lastCustomSlugRef.current;
    }

    // Destination filter is relevant when browsing tours.
    if (view === 'allTours' && initialDestinationFilter) params.dest = initialDestinationFilter;
    const newHash = buildHash(params);

    // If we're currently on /admin, keep that path only for admin/login views.
    // When leaving admin, canonicalize back to "/" so public navigation doesn't live under /admin#...
    const normalizedPath = window.location.pathname.replace(/\/+$/, '');
    const shouldKeepAdminPath = normalizedPath === '/admin' && (view === 'admin' || view === 'login');
    const desiredPath = shouldKeepAdminPath ? window.location.pathname : '/';
    const targetUrl = `${desiredPath}${window.location.search || ''}${newHash}`;
    const currentUrl = `${window.location.pathname}${window.location.search || ''}${window.location.hash}`;
    if (currentUrl === targetUrl) return;

    // On first initialization replaceState to avoid cluttering history, afterwards pushState.
    if (initializedRef.current) window.history.pushState(null, '', targetUrl);
    else window.history.replaceState(null, '', targetUrl);
  };

  const applyHashToState = () => {
    // Prevent updateHashFromState while we apply hash to state
    suppressHashUpdateRef.current = true;

    try {
      const hash = window.location.hash.replace(/^#/, '');
      const sp = new URLSearchParams(hash);
      const hView = sp.get('view');
      const tripId = sp.get('tripId');
      const blogId = sp.get('blogId');
      const custom = sp.get('custom');
      const dest = sp.get('dest');

      if (tripId) lastTripIdRef.current = tripId;
      if (blogId) lastBlogIdRef.current = blogId;
      if (custom) lastCustomSlugRef.current = custom;

      if (dest) setInitialDestinationFilter(dest);

      if (custom) {
        setCurrentCustomPageSlug(custom);
        setView('customPage');
        return;
      }

      if (blogId) {
        const found = blogPosts.find((b) => b.id === blogId);
        if (found) {
          setSelectedBlogPost(found);
          setView('blogDetail');
          return;
        }
      }

      if (tripId) {
        const found = trips.find((t) => t.id === tripId);
        if (found) {
          setSelectedTrip(found);
          // Respect explicit view for shareable URLs like #view=booking&tripId=...
          if (hView === 'booking' || hView === 'tripDetail') setView(hView as View);
          else setView('tripDetail');
          return;
        }
      }

      if (hView) setView(hView as View);
    } finally {
      // allow updates again and mark initialized, even when we early-return above
      suppressHashUpdateRef.current = false;
      initializedRef.current = true;
    }
  };

  // update hash whenever relevant state changes
  useEffect(() => {
    updateHashFromState();
  }, [view, selectedTrip, selectedBlogPost, currentCustomPageSlug, initialDestinationFilter]);

  // apply hash on first trips/blogs load or when hash changes (back/forward)
  useEffect(() => {
    applyHashToState();
    const onHash = () => applyHashToState();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [trips, blogPosts]);

  // Scroll to top on view changes (except on initial load to preserve page position)
  useEffect(() => {
    // Skip scroll on first render to avoid interrupting browser's native scroll restoration
    if (!initializedRef.current) return;
    
    // Scroll to top smoothly when view changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // ---------------------------------------------------------------------------

  const renderContent = () => {
    switch (view) {
      case 'tripDetail':
        return selectedTrip ? (
          <TripDetailPage
            trip={selectedTrip}
            onBookNow={(t) => {
              setSelectedTrip(t);
              setView('booking');
            }}
            onBack={() => setView('home')}
            theme={theme}
          />
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <div className="text-sm font-bold">Loading trip…</div>
            <button
              type="button"
              onClick={() => setView('home')}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border hover:border-brand-primary/40 transition-colors text-xs font-black uppercase tracking-widest"
            >
              Go Home
            </button>
          </div>
        );
      case 'allTours':
        return <AllToursPage trips={trips} onSelectTrip={t => { setSelectedTrip(t); setView('tripDetail'); }} onBookNow={t => { setSelectedTrip(t); setView('booking'); }} onNavigateContact={() => setView('contact')} initialDestinationFilter={initialDestinationFilter} />;
      case 'booking':
        return selectedTrip ? (
          <BookingPage
            trip={selectedTrip}
            onBack={() => setView('tripDetail')}
            siteContent={siteContent}
            onAddInquiry={addInquiry}
          />
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <div className="text-sm font-bold">Loading booking…</div>
            <button
              type="button"
              onClick={() => setView('home')}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-border hover:border-brand-primary/40 transition-colors text-xs font-black uppercase tracking-widest"
            >
              Go Home
            </button>
          </div>
        );
      case 'contact':
        return <ContactPage siteContent={siteContent} />;
      case 'blog':
        return <BlogPage posts={blogPosts} onSelectPost={p => { setSelectedBlogPost(p); setView('blogDetail'); }} />;
      case 'blogDetail':
        return selectedBlogPost && <BlogDetailPage post={selectedBlogPost} onBack={() => setView('blog')} />;
      case 'gallery':
        return <GalleryPage photos={galleryPhotos} />;
      case 'customize':
        return <CustomizePage onNavigateContact={() => setView('contact')} trips={trips} />;
      case 'customPage':
        const activePage = customPages.find(p => p.slug === currentCustomPageSlug);
        return activePage ? <DynamicPage page={activePage} /> : <div>Page Not Found</div>;
      case 'login':
        return (
          <LoginPage
            onLoginSuccess={() => {
              if (!isSupabaseMode) setIsLoggedIn(true);
              setView('admin');
            }}
          />
        );
      case 'admin':
        if (!isLoggedIn) {
          return (
            <LoginPage
              onLoginSuccess={() => {
                if (!isSupabaseMode) setIsLoggedIn(true);
                setView('admin');
              }}
            />
          );
        }
        if (isSupabaseMode && !isAdmin) {
          return (
            <div className="container mx-auto px-4 sm:px-6 py-16">
              <div className="max-w-xl mx-auto bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-8 text-center">
                <h2 className="text-2xl font-extrabold font-display text-foreground dark:text-dark-foreground">Not authorized</h2>
                <p className="mt-2 text-sm text-muted-foreground dark:text-dark-muted-foreground">
                  This account is signed in but is not an admin.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    className="px-5 py-2 rounded-md bg-brand-primary text-white font-bold"
                    onClick={async () => {
                      try {
                        await getSupabase().auth.signOut();
                      } finally {
                        setIsLoggedIn(false);
                        setIsAdmin(false);
                        setView('home');
                      }
                    }}
                  >
                    Sign out
                  </button>
                  <button
                    className="px-5 py-2 rounded-md border border-border dark:border-dark-border font-bold text-foreground dark:text-dark-foreground"
                    onClick={() => setView('home')}
                  >
                    Go home
                  </button>
                </div>
              </div>
            </div>
          );
        }
        return <AdminPage 
                    trips={trips} departures={departures} blogPosts={blogPosts}
                    galleryPhotos={galleryPhotos} instagramPosts={instagramPosts}
                    googleReviews={googleReviews} siteContent={siteContent}
                    itineraryQueries={itineraryQueries} customPages={customPages}
                    contactMessages={contactMessages}
                    newsletterSubscribers={newsletterSubscribers}
                    onUpdateLeadStatus={setLeadStatus}
                    isSupabaseMode={isSupabaseMode}
                    autoSaveEnabled={autoSaveEnabled}
                    saveStatus={saveStatus}
                    onToggleAutoSave={setAutoSaveEnabled}
                    onSaveNow={saveNow}
                    onExitAdmin={() => setView('home')}
                    onAddTrip={t => setTrips(p => [{...t, id: makeId(), reviews: []}, ...p])}
                    onUpdateTrip={t => setTrips(p => p.map(x => x.id === t.id ? t : x))}
                    onDeleteTrip={id => setTrips(p => p.filter(x => x.id !== id))}
                    onAddDeparture={d => setDepartures(p => [{...d, id: makeId()}, ...p])}
                    onUpdateDeparture={d => setDepartures(p => p.map(x => x.id === d.id ? d : x))}
                    onDeleteDeparture={id => setDepartures(p => p.filter(x => x.id !== id))}
                    onAddBlogPost={async p => setBlogPosts(prev => [{...p, id: makeId()}, ...prev])}
                    onUpdateBlogPost={p => setBlogPosts(prev => prev.map(x => x.id === p.id ? p : x))}
                    onDeleteBlogPost={id => setBlogPosts(prev => prev.filter(x => x.id !== id))}
                    onAddGalleryPhoto={p => setGalleryPhotos(prev => [{...p, id: makeId()}, ...prev])}
                    onUpdateGalleryPhoto={p => setGalleryPhotos(prev => prev.map(x => x.id === p.id ? p : x))}
                    onDeleteGalleryPhoto={id => setGalleryPhotos(prev => prev.filter(x => x.id !== id))}
                    onAddInstagramPost={p => setInstagramPosts(prev => [{...p, id: makeId()}, ...prev])}
                    onUpdateInstagramPost={p => setInstagramPosts(prev => prev.map(x => x.id === p.id ? p : x))}
                    onDeleteInstagramPost={id => setInstagramPosts(prev => prev.filter(x => x.id !== id))}
                    onAddGoogleReview={r => setGoogleReviews(prev => [{...r, id: makeId()}, ...prev])}
                    onUpdateGoogleReview={r => setGoogleReviews(prev => prev.map(x => x.id === r.id ? r : x))}
                    onDeleteGoogleReview={id => setGoogleReviews(prev => prev.filter(x => x.id !== id))}
                    onUpdateSiteContent={c => setSiteContent(p => ({...p, ...c}))}
                    onAddCustomPage={page => setCustomPages(prev => [{...page, id: makeId()}, ...prev])}
                    onUpdateCustomPage={page => setCustomPages(prev => prev.map(x => x.id === page.id ? page : x))}
                    onDeleteCustomPage={id => setCustomPages(prev => prev.filter(x => x.id !== id))}
                    onLogout={async () => {
                      try {
                        if (isSupabaseMode) await getSupabase().auth.signOut();
                      } catch (err) {
                        console.error('Logout failed:', err);
                      } finally {
                        setIsLoggedIn(false);
                        setIsAdmin(false);
                        setView('home');
                      }
                    }}
                    theme={theme}
                />;
      case 'home':
      default:
        return <HomePage 
                  trips={trips} departures={departures} onSelectTrip={t => { setSelectedTrip(t); setView('tripDetail'); }} 
                  onBookNow={t => { setSelectedTrip(t); setView('booking'); }} blogPosts={blogPosts} galleryPhotos={galleryPhotos}
                  instagramPosts={instagramPosts} googleReviews={googleReviews} siteContent={siteContent}
                  onSelectBlogPost={p => { setSelectedBlogPost(p); setView('blogDetail'); }}
                  onNavigateGallery={() => setView('gallery')} onNavigateCustomize={() => setView('customize')}
                  initialDestinationFilter={initialDestinationFilter} onClearInitialFilter={() => setInitialDestinationFilter(null)}
                  onAddInquiry={addInquiry}
                  onNavigateContact={() => setView('contact')}
                  onNavigateBlog={() => setView('blog')}
                  onNavigateToTours={(dest) => { setInitialDestinationFilter(dest); setView('allTours'); }}
               />;
    }
  };

  if (isInitialLoading) {
    return <Preloader />;
  }

  const hideSiteChrome = view === 'admin';

  return (
    <ErrorBoundary>
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {!hideSiteChrome && (
        <Header 
          onNavigateHome={() => setView('home')} onNavigateContact={() => setView('contact')} 
          onNavigateBlog={() => setView('blog')} onNavigateGallery={() => setView('gallery')}
          onNavigateCustomize={() => setView('customize')} onNavigateToTours={d => { setInitialDestinationFilter(d); setView('allTours'); }}
          onNavigateCustomPage={s => { setCurrentCustomPageSlug(s); setView('customPage'); }}
          destinations={[...new Set(trips.map(t => t.destination))]} siteContent={siteContent} theme={theme} toggleTheme={toggleTheme} customPages={customPages}
        />
      )}
      <main className="flex-grow">
        <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading...</div>}>
          {renderContent()}
        </Suspense>
      </main>
      {!hideSiteChrome && (
        <Footer 
          onNavigateHome={() => setView('home')} onNavigateContact={() => setView('contact')} 
          onNavigateBlog={() => setView('blog')} onNavigateGallery={() => setView('gallery')}
          onNavigateCustomize={() => setView('customize')} onNavigateCustomPage={s => { setCurrentCustomPageSlug(s); setView('customPage'); }}
          siteContent={siteContent}
        />
      )}
      
      {/* Floating Action Buttons */}
      {view !== 'admin' && (
        <FloatingWhatsApp
          phoneNumber={siteContent.adminWhatsappNumber}
          bottomOffsetPx={view === 'tripDetail' || view === 'booking' ? 110 : 20}
        />
      )}

      <style>{`
        /* Match native date/time picker styling to the app theme.
           Using "light dark" can cause the UA to pick an unexpected scheme vs our toggle. */
        html:not(.dark) input[type="date"],
        html:not(.dark) input[type="time"] {
          color-scheme: light;
        }

        html.dark input[type="date"],
        html.dark input[type="time"] {
          color-scheme: dark;
        }

        /* Improve contrast for the calendar/clock icons on WebKit-based browsers.
           Some UAs ignore color-scheme for the indicator; force contrast explicitly. */
        html:not(.dark) input[type="date"]::-webkit-calendar-picker-indicator,
        html:not(.dark) input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0) !important;
          opacity: 0.85;
        }

        html.dark input[type="date"]::-webkit-calendar-picker-indicator,
        html.dark input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1) !important;
          opacity: 0.9;
        }

        /* Use a custom calendar icon on specific inputs where native icons become inconsistent. */
        .date-input::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
          display: block;
          width: 0;
          height: 0;
        }
      `}</style>
    </div>
    </ErrorBoundary>
  );
};

export default App;
