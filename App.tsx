
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Trip, Departure, BlogPost, GalleryPhoto, InstagramPost, Review, GoogleReview, SiteContent, ItineraryQuery, ThemeColors, CustomPage } from './types';
import { trips as initialTrips, departures as initialDepartures, blogPosts as initialBlogPosts, galleryPhotos as initialGalleryPhotos, instagramPosts as initialInstagramPosts, googleReviews as initialGoogleReviews, initialSiteContent, itineraryQueries as initialItineraryQueries, initialCustomPages } from './data/mockData';
import { themes } from './data/themes';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import TripDetailPage from './pages/TripDetailPage';
import BookingPage from './pages/BookingPage';
import ContactPage from './pages/ContactPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import GalleryPage from './pages/GalleryPage';
import CustomizePage from './pages/CustomizePage';
import DynamicPage from './pages/DynamicPage';
import AllToursPage from './pages/AllToursPage';
import Preloader from './components/Preloader';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import { createDebouncedStateSaver, loadAppState, type AppStateSnapshot } from './services/appStateService';
import { getSupabase } from './services/supabaseClient';
import { listItineraryQueries, submitItineraryQuery } from './services/itineraryQueryService';

type View = 'home' | 'tripDetail' | 'booking' | 'contact' | 'admin' | 'login' | 'blog' | 'blogDetail' | 'gallery' | 'customize' | 'customPage' | 'allTours';
export type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const DATA_MODE =
    ((import.meta as any).env?.VITE_DATA_MODE as string | undefined) ||
    ((window as any).__REVROM_DATA_MODE__ as string | undefined) ||
    'local';
  const isSupabaseMode = DATA_MODE === 'supabase';
  const [isRemoteReady, setIsRemoteReady] = useState(!isSupabaseMode);

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
  const [initialDestinationFilter, setInitialDestinationFilter] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const saver = useMemo(() => (isSupabaseMode ? createDebouncedStateSaver(1200) : null), [isSupabaseMode]);

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
  const [siteContent, setSiteContent] = useState<SiteContent>(() => (isSupabaseMode ? initialSiteContent : getStored('siteContent', initialSiteContent)));
  const [itineraryQueries, setItineraryQueries] = useState<ItineraryQuery[]>(() => (isSupabaseMode ? [] : getStored('itineraryQueries', initialItineraryQueries)));
  const [customPages, setCustomPages] = useState<CustomPage[]>(() => (isSupabaseMode ? initialCustomPages : getStored('customPages', initialCustomPages)));

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
        unsub = supabase.auth.onAuthStateChange((_event, session) => {
          setIsLoggedIn(!!session);
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
        const snapshot = await loadAppState();
        if (canceled) return;
        if (snapshot) {
          setTrips(snapshot.trips || []);
          setDepartures(snapshot.departures || []);
          setBlogPosts(snapshot.blogPosts || []);
          setGalleryPhotos(snapshot.galleryPhotos || []);
          setInstagramPosts(snapshot.instagramPosts || []);
          setGoogleReviews(snapshot.googleReviews || []);
          setSiteContent(snapshot.siteContent || initialSiteContent);
          setCustomPages(snapshot.customPages || []);
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

    const snapshot: AppStateSnapshot = {
      trips,
      departures,
      blogPosts,
      galleryPhotos,
      instagramPosts,
      googleReviews,
      siteContent,
      customPages,
    };
    saver.schedule(snapshot);
  }, [
    isSupabaseMode,
    isRemoteReady,
    isLoggedIn,
    saver,
    trips,
    departures,
    blogPosts,
    galleryPhotos,
    instagramPosts,
    googleReviews,
    siteContent,
    customPages,
  ]);

  // Supabase: load leads (admin only).
  useEffect(() => {
    if (!isSupabaseMode) return;
    if (!isLoggedIn) return;
    let canceled = false;

    (async () => {
      try {
        const leads = await listItineraryQueries();
        if (!canceled) setItineraryQueries(leads);
      } catch (err) {
        console.error('Failed to load leads from Supabase:', err);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [isSupabaseMode, isLoggedIn]);

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
        id: Date.now().toString(),
        date: new Date().toISOString(),
      };

      // Always submit to Supabase in Supabase mode (public insert); keep local fallback otherwise.
      if (isSupabaseMode) {
        submitItineraryQuery(lead).catch((err) => {
          console.error('Failed to submit lead to Supabase:', err);
        });
      } else {
        setItineraryQueries((prev) => [lead, ...prev]);
      }
    },
    [isSupabaseMode],
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
        return selectedTrip && <TripDetailPage trip={selectedTrip} onBookNow={t => { setSelectedTrip(t); setView('booking'); }} onBack={() => setView('home')} onAddQuery={addInquiry} theme={theme} />;
      case 'allTours':
        return <AllToursPage trips={trips} onSelectTrip={t => { setSelectedTrip(t); setView('tripDetail'); }} onBookNow={t => { setSelectedTrip(t); setView('booking'); }} onNavigateContact={() => setView('contact')} initialDestinationFilter={initialDestinationFilter} />;
      case 'booking':
        return selectedTrip && <BookingPage trip={selectedTrip} onBack={() => setView('tripDetail')} siteContent={siteContent} />;
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
        return <LoginPage onLoginSuccess={() => { setIsLoggedIn(true); setView('admin'); }} />;
      case 'admin':
        if (!isLoggedIn) {
          return <LoginPage onLoginSuccess={() => { setIsLoggedIn(true); setView('admin'); }} />;
        }
        return <AdminPage 
                    trips={trips} departures={departures} blogPosts={blogPosts}
                    galleryPhotos={galleryPhotos} instagramPosts={instagramPosts}
                    googleReviews={googleReviews} siteContent={siteContent}
                    itineraryQueries={itineraryQueries} customPages={customPages}
                    onAddTrip={t => setTrips(p => [{...t, id: Date.now().toString(), reviews: []}, ...p])}
                    onUpdateTrip={t => setTrips(p => p.map(x => x.id === t.id ? t : x))}
                    onDeleteTrip={id => setTrips(p => p.filter(x => x.id !== id))}
                    onAddDeparture={d => setDepartures(p => [{...d, id: Date.now().toString()}, ...p])}
                    onUpdateDeparture={d => setDepartures(p => p.map(x => x.id === d.id ? d : x))}
                    onDeleteDeparture={id => setDepartures(p => p.filter(x => x.id !== id))}
                    onAddBlogPost={async p => setBlogPosts(prev => [{...p, id: Date.now().toString()}, ...prev])}
                    onUpdateBlogPost={p => setBlogPosts(prev => prev.map(x => x.id === p.id ? p : x))}
                    onDeleteBlogPost={id => setBlogPosts(prev => prev.filter(x => x.id !== id))}
                    onAddGalleryPhoto={p => setGalleryPhotos(prev => [{...p, id: Date.now().toString()}, ...prev])}
                    onUpdateGalleryPhoto={p => setGalleryPhotos(prev => prev.map(x => x.id === p.id ? p : x))}
                    onDeleteGalleryPhoto={id => setGalleryPhotos(prev => prev.filter(x => x.id !== id))}
                    onUpdateSiteContent={c => setSiteContent(p => ({...p, ...c}))}
                    onAddCustomPage={page => setCustomPages(prev => [{...page, id: Date.now().toString()}, ...prev])}
                    onUpdateCustomPage={page => setCustomPages(prev => prev.map(x => x.id === page.id ? page : x))}
                    onDeleteCustomPage={id => setCustomPages(prev => prev.filter(x => x.id !== id))}
                    onLogout={async () => {
                      try {
                        if (isSupabaseMode) await getSupabase().auth.signOut();
                      } catch (err) {
                        console.error('Logout failed:', err);
                      } finally {
                        setIsLoggedIn(false);
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
                  onNavigateToTours={(dest) => { setInitialDestinationFilter(dest); setView('allTours'); }}
               />;
    }
  };

  if (isInitialLoading) {
    return <Preloader />;
  }

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <Header 
        onNavigateHome={() => setView('home')} onNavigateContact={() => setView('contact')} 
        onNavigateBlog={() => setView('blog')} onNavigateGallery={() => setView('gallery')}
        onNavigateCustomize={() => setView('customize')} onNavigateToTours={d => { setInitialDestinationFilter(d); setView('allTours'); }}
        onNavigateCustomPage={s => { setCurrentCustomPageSlug(s); setView('customPage'); }}
        onNavigateAdmin={() => setView(isLoggedIn ? 'admin' : 'login')}
        destinations={[...new Set(trips.map(t => t.destination))]} siteContent={siteContent} theme={theme} toggleTheme={toggleTheme} customPages={customPages}
      />
      <main className="flex-grow">{renderContent()}</main>
      <Footer 
        onNavigateHome={() => setView('home')} onNavigateContact={() => setView('contact')} 
        onNavigateAdmin={() => setView(isLoggedIn ? 'admin' : 'login')} 
        onNavigateBlog={() => setView('blog')} onNavigateGallery={() => setView('gallery')}
        onNavigateCustomize={() => setView('customize')} onNavigateCustomPage={s => { setCurrentCustomPageSlug(s); setView('customPage'); }}
        siteContent={siteContent}
      />
      
      {/* Floating Action Buttons */}
      {view !== 'admin' && (
        <FloatingWhatsApp
          phoneNumber={siteContent.adminWhatsappNumber}
          bottomOffsetPx={view === 'tripDetail' || view === 'booking' ? 110 : 20}
        />
      )}
    </div>
  );
};

export default App;
