
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
    'local';
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
  const [trips, setTrips] = useState<Trip[]>(() => (isSupabaseMode ? initialTrips : getStored('trips', initialTrips)));
  const [departures, setDepartures] = useState<Departure[]>(() => (isSupabaseMode ? initialDepartures : getStored('departures', initialDepartures)));
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => (isSupabaseMode ? initialBlogPosts : getStored('blogPosts', initialBlogPosts)));
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(() => (isSupabaseMode ? initialGalleryPhotos : getStored('galleryPhotos', initialGalleryPhotos)));
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>(() => (isSupabaseMode ? initialInstagramPosts : getStored('instagramPosts', initialInstagramPosts)));
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[]>(() => (isSupabaseMode ? initialGoogleReviews : getStored('googleReviews', initialGoogleReviews)));
  const [siteContent, setSiteContent] = useState<SiteContent>(() => {
    if (isSupabaseMode) return initialSiteContent;
    const stored = getStored('siteContent', initialSiteContent) as any;
    return { ...initialSiteContent, ...(stored || {}) };
  });
  const [itineraryQueries, setItineraryQueries] = useState<ItineraryQuery[]>(() => (isSupabaseMode ? [] : getStored('itineraryQueries', initialItineraryQueries)));
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => []);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>(() => []);
  const [customPages, setCustomPages] = useState<CustomPage[]>(() => (isSupabaseMode ? initialCustomPages : getStored('customPages', initialCustomPages)));

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

  // Initial Loading Simulator
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 2500); 
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
        // Fallback to local mock/localStorage if Supabase isn't configured yet.
        console.error('Failed to load from Supabase (falling back to local):', err);
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
      const lead: ItineraryQuery = {
        ...q,
        id: makeId(),
        date: new Date().toISOString(),
        status: 'new',
      };

      // Always submit to Supabase in Supabase mode (public insert); keep local fallback otherwise.
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

  const updateHashFromState = () => {
    if (suppressHashUpdateRef.current) return;
    const params: Record<string, string | null> = { view };
    if (selectedTrip) params.tripId = selectedTrip.id;
    if (selectedBlogPost) params.blogId = selectedBlogPost.id;
    if (currentCustomPageSlug) params.custom = currentCustomPageSlug;
    if (initialDestinationFilter) params.dest = initialDestinationFilter;
    const newHash = buildHash(params);
    if (window.location.hash === newHash) return;
    // On first initialization replaceState to avoid cluttering history, afterwards pushState
    if (initializedRef.current) window.history.pushState(null, '', newHash);
    else window.history.replaceState(null, '', newHash);
  };

  const applyHashToState = () => {
    // Prevent updateHashFromState while we apply hash to state
    suppressHashUpdateRef.current = true;
    const hash = window.location.hash.replace(/^#/, '');
    const sp = new URLSearchParams(hash);
    const hView = sp.get('view');
    const tripId = sp.get('tripId');
    const blogId = sp.get('blogId');
    const custom = sp.get('custom');
    const dest = sp.get('dest');

    if (dest) setInitialDestinationFilter(dest);
    if (custom) { setCurrentCustomPageSlug(custom); setView('customPage'); return; }
    if (blogId) {
      const found = blogPosts.find(b => b.id === blogId);
      if (found) { setSelectedBlogPost(found); setView('blogDetail'); return; }
    }
    if (tripId) {
      const found = trips.find(t => t.id === tripId);
      if (found) { setSelectedTrip(found); setView('tripDetail'); return; }
    }
    if (hView) setView(hView as View);
    // allow updates again and mark initialized
    suppressHashUpdateRef.current = false;
    initializedRef.current = true;
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

  // ---------------------------------------------------------------------------

  const renderContent = () => {
    switch (view) {
      case 'tripDetail':
        return selectedTrip && <TripDetailPage trip={selectedTrip} onBookNow={t => { setSelectedTrip(t); setView('booking'); }} onBack={() => setView('home')} theme={theme} />;
      case 'allTours':
        return <AllToursPage trips={trips} onSelectTrip={t => { setSelectedTrip(t); setView('tripDetail'); }} onBookNow={t => { setSelectedTrip(t); setView('booking'); }} onNavigateContact={() => setView('contact')} initialDestinationFilter={initialDestinationFilter} />;
      case 'booking':
        return selectedTrip && <BookingPage trip={selectedTrip} onBack={() => setView('tripDetail')} siteContent={siteContent} onAddInquiry={addInquiry} />;
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
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {!hideSiteChrome && (
        <Header 
          onNavigateHome={() => setView('home')} onNavigateContact={() => setView('contact')} 
          onNavigateBlog={() => setView('blog')} onNavigateGallery={() => setView('gallery')}
          onNavigateCustomize={() => setView('customize')} onNavigateToTours={d => { setInitialDestinationFilter(d); setView('allTours'); }}
          onNavigateCustomPage={s => { setCurrentCustomPageSlug(s); setView('customPage'); }}
          onNavigateAdmin={() => setView(isLoggedIn && isAdmin ? 'admin' : 'login')}
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
          onNavigateAdmin={() => setView(isLoggedIn && isAdmin ? 'admin' : 'login')} 
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

        /* Improve contrast for the calendar/clock icons in dark mode on WebKit-based browsers. */
        html.dark input[type="date"]::-webkit-calendar-picker-indicator,
        html.dark input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default App;
