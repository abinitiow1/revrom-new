
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trip, Departure, BlogPost, GalleryPhoto, SiteContent, ItineraryQuery, CustomPage, InstagramPost, GoogleReview, SectionConfig, ContactMessage, NewsletterSubscriber } from '../types';
import type { Theme } from '../App';
import { getSupabase } from '../services/supabaseClient';

interface AdminPageProps {
  trips: Trip[];
  departures: Departure[];
  blogPosts: BlogPost[];
  galleryPhotos: GalleryPhoto[];
  instagramPosts: InstagramPost[];
  googleReviews: GoogleReview[];
  siteContent: SiteContent;
  itineraryQueries: ItineraryQuery[];
  onUpdateLeadStatus?: (id: string, status: ItineraryQuery['status']) => void | Promise<void>;
  contactMessages: ContactMessage[];
  newsletterSubscribers: NewsletterSubscriber[];
  customPages: CustomPage[];
  isSupabaseMode?: boolean;
  autoSaveEnabled?: boolean;
  saveStatus?: 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
  onToggleAutoSave?: (enabled: boolean) => void;
  onSaveNow?: () => void | Promise<void>;
  onAddTrip: (trip: Omit<Trip, 'id' | 'reviews'>) => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onAddDeparture: (departure: Omit<Departure, 'id'>) => void;
  onUpdateDeparture: (updatedDeparture: Departure) => void;
  onDeleteDeparture: (departureId: string) => void;
  onAddBlogPost: (post: Omit<BlogPost, 'id'>) => Promise<void>;
  onUpdateBlogPost: (post: BlogPost) => void;
  onDeleteBlogPost: (id: string) => void;
  onAddGalleryPhoto: (photo: Omit<GalleryPhoto, 'id'>) => void;
  onUpdateGalleryPhoto: (photo: GalleryPhoto) => void;
  onDeleteGalleryPhoto: (id: string) => void;
  onAddInstagramPost: (post: Omit<InstagramPost, 'id'>) => void;
  onUpdateInstagramPost: (post: InstagramPost) => void;
  onDeleteInstagramPost: (id: string) => void;
  onAddGoogleReview: (review: Omit<GoogleReview, 'id'>) => void;
  onUpdateGoogleReview: (review: GoogleReview) => void;
  onDeleteGoogleReview: (id: string) => void;
  onUpdateSiteContent: (newContent: Partial<SiteContent>) => void;
  onAddCustomPage: (page: Omit<CustomPage, 'id'>) => void;
  onUpdateCustomPage: (updatedPage: CustomPage) => void;
  onDeleteCustomPage: (pageId: string) => void;
  onExitAdmin?: () => void;
  onLogout: () => void;
  theme: Theme;
}

type AdminTab = 'TOURS' | 'DATES' | 'INBOX' | 'SUBSCRIBERS' | 'BLOG' | 'PAGES' | 'VISUALS' | 'SOCIAL' | 'LAYOUT' | 'HOMEPAGE' | 'SETTINGS';

type DepartureDraft = Omit<Departure, 'id'> & { id?: string };

const AdminPage: React.FC<AdminPageProps> = (props) => {
  const { trips, departures, blogPosts, galleryPhotos, instagramPosts, googleReviews, siteContent, itineraryQueries, customPages, onUpdateSiteContent, contactMessages, newsletterSubscribers } = props;
  const [activeTab, setActiveTab] = useState<AdminTab>('TOURS');
  const [inboxType, setInboxType] = useState<'all' | 'lead' | 'message'>('all');
  const [inboxStatus, setInboxStatus] = useState<'all' | 'new' | 'contacted' | 'closed'>('all');
  const [inboxQuery, setInboxQuery] = useState('');
  const [inboxFromDate, setInboxFromDate] = useState('');
  const [inboxToDate, setInboxToDate] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itineraryInput, setItineraryInput] = useState('');
  const [itineraryInputError, setItineraryInputError] = useState<string>('');
  const [routeCoordinatesInput, setRouteCoordinatesInput] = useState('');
  const [routeCoordinatesError, setRouteCoordinatesError] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState<{ isOpen: boolean; onSelect: (url: string) => void }>({ isOpen: false, onSelect: () => {} });
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [captionModal, setCaptionModal] = useState<{ isOpen: boolean; photo: GalleryPhoto | null }>({ isOpen: false, photo: null });
  const [captionInput, setCaptionInput] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [tourDestinationFilter, setTourDestinationFilter] = useState<string>('all');
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [blogSearch, setBlogSearch] = useState('');
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [editingDirty, setEditingDirty] = useState(false);
  const editingInitializedRef = React.useRef(false);
  const [tourDepartureDraft, setTourDepartureDraft] = useState<DepartureDraft | null>(null);
  const [tourDepartureValidationAttempted, setTourDepartureValidationAttempted] = useState(false);
  const [tourDepartureDirty, setTourDepartureDirty] = useState(false);
  const tourDepartureInitializedRef = React.useRef(false);
  const [uploadUi, setUploadUi] = useState<{ fileName: string; progress: number } | null>(null);
  const uploadProgressTimerRef = React.useRef<number | null>(null);
  const noticeTimerRef = React.useRef<number | null>(null);

  const showNotice = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setAdminNotice({ text, type });
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    // auto-clear after 2500ms
    noticeTimerRef.current = window.setTimeout(() => setAdminNotice(null), 2500);
  };

  const parseDayFromToken = (s: string): number => {
    const m = String(s || '').match(/(\d{1,3})/);
    if (!m) return NaN;
    return Number(m[1]);
  };

  const formatItineraryLines = (itinerary: Trip['itinerary']): string => {
    const rows = Array.isArray(itinerary) ? itinerary : [];
    return rows
      .slice()
      .sort((a, b) => (a.day ?? 0) - (b.day ?? 0))
      .map((d) => `${d.day} | ${String(d.title || '').trim()} | ${String(d.description || '').trim()}`.trim())
      .join('\n');
  };

  const normalizeTripItinerary = (value: unknown): Trip['itinerary'] | null => {
    const extractArray = (v: any): any[] | null => {
      if (Array.isArray(v)) {
        // Common copy-paste format: [{ state: "...", itinerary: [...] }]
        if (v.length === 1 && v[0] && typeof v[0] === 'object' && Array.isArray((v[0] as any).itinerary)) {
          return (v[0] as any).itinerary as any[];
        }
        return v as any[];
      }
      if (v && typeof v === 'object' && Array.isArray((v as any).itinerary)) {
        // Common format: { state: "...", itinerary: [...] }
        return (v as any).itinerary as any[];
      }
      return null;
    };

    const arr = extractArray(value);
    if (!arr) return null;

    const mapped = arr
      .map((raw: any, idx: number) => {
        if (!raw || typeof raw !== 'object') return null;
        const dayNum = Number((raw as any).day ?? (idx + 1));
        if (!Number.isFinite(dayNum) || dayNum < 1) return null;

        const title = String((raw as any).title || (raw as any).name || (raw as any).stay || `Day ${dayNum}`).trim();
        if (!title) return null;

        const descriptionRaw =
          typeof (raw as any).description === 'string'
            ? (raw as any).description
            : (() => {
                const parts: string[] = [];
                if ((raw as any).stay) parts.push(`Stay: ${String((raw as any).stay).trim()}`);
                if ((raw as any).state) parts.push(`State: ${String((raw as any).state).trim()}`);
                const activities = Array.isArray((raw as any).activities) ? (raw as any).activities : null;
                if (activities && activities.length) {
                  parts.push('Activities:');
                  parts.push(...activities.map((a: any) => `- ${String(a).trim()}`));
                }
                return parts.join('\n').trim();
              })();

        return {
          day: dayNum,
          title,
          description: String(descriptionRaw || '').trim(),
        };
      })
      .filter(Boolean) as Trip['itinerary'];

    mapped.sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    return mapped;
  };

  const parseItineraryText = (text: string): { itinerary: Trip['itinerary']; error: string | null } => {
    const raw = String(text || '').trim();
    if (!raw) return { itinerary: [], error: null };

    // Power users can still paste JSON.
    if (raw.startsWith('[') || raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        const normalized = normalizeTripItinerary(parsed);
        if (!normalized) return { itinerary: [], error: 'Invalid JSON itinerary. Expected an array of {day,title,description} or an object with { itinerary: [...] }.' };
        return { itinerary: normalized, error: null };
      } catch {
        return { itinerary: [], error: 'Invalid JSON: could not parse.' };
      }
    }

    // Human-friendly format: `1 | Title | Description`
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const out: Trip['itinerary'] = [];
    const seenDays = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split('|').map((p) => p.trim());
      if (parts.length < 2) {
        return { itinerary: [], error: `Line ${i + 1} is invalid. Use: Day | Title | Description` };
      }
      const day = parseDayFromToken(parts[0]);
      if (!Number.isFinite(day) || day < 1) {
        return { itinerary: [], error: `Line ${i + 1} has invalid day. Use "1" or "Day 1".` };
      }
      if (seenDays.has(day)) {
        return { itinerary: [], error: `Duplicate day "${day}" on line ${i + 1}.` };
      }
      seenDays.add(day);

      const title = String(parts[1] || '').trim();
      if (!title) return { itinerary: [], error: `Line ${i + 1} is missing a title.` };
      const description = String(parts.slice(2).join(' | ') || '').trim();
      out.push({ day, title, description });
    }

    out.sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
    return { itinerary: out, error: null };
  };

  const formatRouteCoordinates = (coords: Trip['routeCoordinates']): string => {
    if (!Array.isArray(coords) || coords.length === 0) return '';
    return coords.map(([lat, lon]) => `${lat}, ${lon}`).join('\n');
  };

  const parseRouteCoordinates = (text: string): { coords: Trip['routeCoordinates']; error: string | null } => {
    const raw = String(text || '').trim();
    if (!raw) return { coords: [], error: null };

    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const out: Trip['routeCoordinates'] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) {
        return { coords: [], error: `Line ${i + 1} is invalid. Use: latitude, longitude` };
      }
      const lat = Number(parts[0]);
      const lon = Number(parts[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return { coords: [], error: `Line ${i + 1} has invalid numbers.` };
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return { coords: [], error: `Line ${i + 1} is out of range (lat -90..90, lon -180..180).` };
      }
      out.push([lat, lon]);
    }

    return { coords: out, error: null };
  };

  const parseDateInput = (value: string): Date | null => {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateInput = (date: Date): string => {
    const yyyy = date.getFullYear().toString().padStart(4, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const addDays = (date: Date, days: number): Date => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  };

  useEffect(() => {
    if (activeTab !== 'TOURS') {
      setTourDepartureDraft(null);
      setTourDepartureValidationAttempted(false);
      return;
    }

    setTourDepartureDraft(null);
    setTourDepartureValidationAttempted(false);
  }, [activeTab, editingItem?.id]);

  const getDepartureValidationError = (draft: any): string | null => {
    if (!draft?.tripId) return 'Select a tour for this departure.';
    const start = parseDateInput(draft.startDate);
    const end = parseDateInput(draft.endDate);
    if (!start) return 'Start date is required.';
    if (!end) return 'End date is required.';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (start.getTime() < today.getTime()) return 'Start date cannot be in the past.';
    if (end.getTime() <= start.getTime()) return 'End date must be after the start date.';

    const slots = Number(draft.slots);
    if (!Number.isFinite(slots) || slots <= 0) return 'Slots must be a number greater than 0.';

    return null;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  useEffect(() => {
    setValidationAttempted(false);
  }, [activeTab, editingItem]);

  useEffect(() => {
    if (!editingItem) {
      editingInitializedRef.current = false;
      setEditingDirty(false);
      return;
    }

    if (!editingInitializedRef.current) {
      editingInitializedRef.current = true;
      setEditingDirty(false);
      return;
    }

    setEditingDirty(true);
  }, [editingItem]);

  useEffect(() => {
    if (!tourDepartureDraft) {
      tourDepartureInitializedRef.current = false;
      setTourDepartureDirty(false);
      return;
    }

    if (!tourDepartureInitializedRef.current) {
      tourDepartureInitializedRef.current = true;
      setTourDepartureDirty(false);
      return;
    }

    setTourDepartureDirty(true);
  }, [tourDepartureDraft]);

  const itinerarySeedRef = React.useRef<string | null>(null);
  const routeSeedRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (activeTab !== 'TOURS') return;
    if (!editingItem) {
      itinerarySeedRef.current = null;
      setItineraryInput('');
      setItineraryInputError('');
      routeSeedRef.current = null;
      setRouteCoordinatesInput('');
      setRouteCoordinatesError('');
      return;
    }

    const key = String(editingItem?.id || '__new__');
    if (itinerarySeedRef.current !== key) {
      itinerarySeedRef.current = key;
      const current = Array.isArray(editingItem?.itinerary) ? (editingItem.itinerary as Trip['itinerary']) : [];
      setItineraryInput(formatItineraryLines(current));
      setItineraryInputError('');
    }

    if (routeSeedRef.current !== key) {
      routeSeedRef.current = key;
      const coords = Array.isArray(editingItem?.routeCoordinates) ? (editingItem.routeCoordinates as Trip['routeCoordinates']) : [];
      setRouteCoordinatesInput(formatRouteCoordinates(coords));
      setRouteCoordinatesError('');
    }
  }, [activeTab, editingItem]);

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

  const uploadToSupabaseStorage = async (file: File): Promise<string> => {
    const supabase = getSupabase();
    const bucket = 'site-assets';
    const safeName = (file.name || 'upload').replace(/[^\w.\-]+/g, '_');
    const path = `uploads/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Failed to get public URL');
    return data.publicUrl;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (url: string) => void,
    options?: { addToGallery?: boolean }
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const addToGallery = options?.addToGallery ?? true;

    const startProgressUi = () => {
      if (uploadProgressTimerRef.current) window.clearInterval(uploadProgressTimerRef.current);
      setUploadUi({ fileName: file.name || 'upload', progress: 5 });

      uploadProgressTimerRef.current = window.setInterval(() => {
        setUploadUi((prev) => {
          if (!prev) return prev;
          const next = Math.min(90, prev.progress + Math.max(1, Math.round(Math.random() * 7)));
          return next === prev.progress ? prev : { ...prev, progress: next };
        });
      }, 180);
    };

    const finishProgressUi = (ok: boolean) => {
      if (uploadProgressTimerRef.current) {
        window.clearInterval(uploadProgressTimerRef.current);
        uploadProgressTimerRef.current = null;
      }

      if (!ok) {
        setUploadUi(null);
        return;
      }

      setUploadUi((prev) => (prev ? { ...prev, progress: 100 } : { fileName: file.name || 'upload', progress: 100 }));
      window.setTimeout(() => setUploadUi(null), 900);
    };

    startProgressUi();

    try {
      if (props.isSupabaseMode) {
        const url = await uploadToSupabaseStorage(file);
        callback(url);
        if (addToGallery) {
          const exists = props.galleryPhotos.some(p => p.imageUrl === url);
          if (!exists) {
            props.onAddGalleryPhoto({ imageUrl: url, caption: 'Uploaded Visual', category: 'Landscapes' });
            showNotice('Image added to Gallery');
          } else {
            showNotice('Image already exists in Gallery', 'info');
          }
        }
        finishProgressUi(true);
        return;
      }
    } catch (err) {
      finishProgressUi(false);
      showNotice('Upload failed. Using a local image (may be large).', 'info');
    }

    const url = await readFileAsDataUrl(file);
    callback(url);
    finishProgressUi(true);
    if (!addToGallery) return;

    try {
      const exists = props.galleryPhotos.some(p => p.imageUrl === url);
      if (!exists) {
        props.onAddGalleryPhoto({ imageUrl: url, caption: 'Uploaded Visual', category: 'Landscapes' });
        showNotice('Image added to Gallery');
      } else {
        showNotice('Image already exists in Gallery', 'info');
      }
    } catch (err) {}
  };

  const handleAddGalleryUrl = () => {
    if (!galleryUrlInput.trim()) return;
    props.onAddGalleryPhoto({ 
        imageUrl: galleryUrlInput, 
        caption: 'Imported Visual', 
        category: 'Landscapes' 
    });
    setGalleryUrlInput('');
  };

  const toggleTripSelection = (tripId: string, checked?: boolean) => {
    setSelectedTripIds((prev) => {
      const isSelected = prev.includes(tripId);
      const nextChecked = checked ?? !isSelected;
      if (nextChecked && !isSelected) return [...prev, tripId];
      if (!nextChecked && isSelected) return prev.filter((id) => id !== tripId);
      return prev;
    });
  };

  const clearTripSelection = () => setSelectedTripIds([]);

  const toggleLayoutVisibility = (sectionId: string) => {
    const updatedLayout = siteContent.homePageLayout.map(section => 
        section.id === sectionId ? { ...section, isVisible: !section.isVisible } : section
    );
    onUpdateSiteContent({ homePageLayout: updatedLayout });
  };

  const updateLayoutOpacity = (sectionId: string, opacity: number) => {
    const updatedLayout = siteContent.homePageLayout.map(section => 
        section.id === sectionId ? { ...section, backgroundOpacity: opacity } : section
    );
    onUpdateSiteContent({ homePageLayout: updatedLayout });
  };

  const renderImageField = (label: string, value: string, onChange: (val: string) => void, invalid?: boolean) => (
    <div className="flex flex-col gap-2 mb-8">
      <label className="text-[10px] font-black uppercase tracking-widest opacity-60 block leading-tight mb-1">{label}</label>
      <div className="flex flex-col gap-3">
        <input 
          value={value || ''} 
          onChange={e => onChange(e.target.value)} 
          data-invalid={invalid ? 'true' : undefined}
          placeholder="Paste URL (e.g. from Google)..." 
          className="w-full bg-background dark:bg-dark-background p-4 rounded-xl border border-border dark:border-dark-border outline-none text-xs font-bold focus:border-brand-primary text-foreground dark:text-dark-foreground" 
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const url = (value || '').trim();
              if (url) {
                onChange(url);
                try {
                  const exists = props.galleryPhotos.some(p => p.imageUrl === url);
                  if (!exists) {
                    props.onAddGalleryPhoto({ imageUrl: url, caption: 'Imported URL', category: 'Landscapes' });
                    showNotice('Image added to Gallery');
                  } else {
                    showNotice('Image already exists in Gallery', 'info');
                  }
                } catch (err) {}
              } else {
                // fallback: open gallery picker when no URL present
                setIsGalleryPickerOpen({ isOpen: true, onSelect: (u) => { onChange(u); setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} }); } });
              }
            }}
            className="flex-1 bg-brand-primary text-white px-4 py-3 rounded-xl hover:bg-brand-primary/90 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            IMPORT URL
          </button>
          <button
            type="button"
            onClick={() => {
              if (!props.galleryPhotos?.length) {
                showNotice('Gallery is empty. Add visuals first.', 'info');
                return;
              }
              setIsGalleryPickerOpen({
                isOpen: true,
                onSelect: (u) => {
                  onChange(u);
                  setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} });
                },
              });
            }}
            className="px-4 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
          >
            GALLERY
          </button>
        </div>
      </div>
      {value && (
        <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden border border-border dark:border-dark-border mt-3 shadow-inner bg-slate-100 dark:bg-black">
          <img src={value} alt="Image preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'TOURS': {
        const filteredTrips = trips
          .filter(t => {
            const q = tourSearch.trim().toLowerCase();
            const destOk = tourDestinationFilter === 'all' || t.destination === tourDestinationFilter;
            if (!destOk) return false;
            if (!q) return true;
            return (
              t.title?.toLowerCase().includes(q) ||
              t.destination?.toLowerCase().includes(q) ||
              t.shortDescription?.toLowerCase().includes(q)
            );
          });

        const allFilteredSelected = filteredTrips.length > 0 && filteredTrips.every((t) => selectedTripIds.includes(t.id));
        const anyFilteredSelected = filteredTrips.some((t) => selectedTripIds.includes(t.id));

        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Manage Tours</h3>
              <button onClick={() => setEditingItem({ title: '', destination: '', shortDescription: '', longDescription: '', price: 0, duration: 1, difficulty: 'Intermediate', itinerary: [], inclusions: [], exclusions: [], activities: [], imageUrl: '', gallery: [], routeCoordinates: [] })} className="w-full sm:w-auto adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">ADD NEW TOUR</button>
            </div>
            <div className="bg-card dark:bg-dark-card rounded-3xl border border-border dark:border-dark-border p-4 sm:p-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <input
                  value={tourSearch}
                  onChange={(e) => setTourSearch(e.target.value)}
                  placeholder="Search tours..."
                  className="w-full sm:w-72 bg-background dark:bg-dark-background p-4 rounded-xl border border-border dark:border-dark-border outline-none text-xs font-bold focus:border-brand-primary text-foreground dark:text-dark-foreground"
                />
                <select
                  title="Filter tours by destination"
                  value={tourDestinationFilter}
                  onChange={(e) => setTourDestinationFilter(e.target.value)}
                  className="w-full sm:w-64 bg-background dark:bg-dark-background p-4 rounded-xl border border-border dark:border-dark-border outline-none text-xs font-bold focus:border-brand-primary text-foreground dark:text-dark-foreground"
                >
                  <option value="all">All destinations</option>
                  {Array.from(new Set(trips.map(t => t.destination).filter(Boolean))).sort().map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background text-[10px] font-black uppercase tracking-widest shadow-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    aria-label="Select all filtered tours"
                    checked={allFilteredSelected}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (!checked) {
                        // Unselect only the filtered items, keep any selections from other filters.
                        setSelectedTripIds((prev) => prev.filter((id) => !filteredTrips.some((t) => t.id === id)));
                        return;
                      }
                      setSelectedTripIds((prev) => {
                        const set = new Set(prev);
                        for (const t of filteredTrips) set.add(t.id);
                        return Array.from(set);
                      });
                    }}
                    className="h-4 w-4"
                  />
                  Select all
                </label>

                <button
                  type="button"
                  disabled={selectedTripIds.length === 0}
                  onClick={() => {
                    const ids = selectedTripIds.slice();
                    if (ids.length === 0) return;
                    const ok = window.confirm(`Delete ${ids.length} selected tour(s)? This cannot be undone.`);
                    if (!ok) return;
                    for (const id of ids) props.onDeleteTrip(id);
                    clearTripSelection();
                    showNotice('Selected tours deleted', 'info');
                  }}
                  className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
                    selectedTripIds.length === 0
                      ? 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Delete selected ({selectedTripIds.length})
                </button>

                {(selectedTripIds.length > 0 || anyFilteredSelected) && (
                  <button
                    type="button"
                    onClick={clearTripSelection}
                    className="px-5 py-3 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredTrips.map(trip => (
                <div key={trip.id} className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-3xl border border-border dark:border-dark-border flex flex-col sm:flex-row justify-between items-center gap-4 group hover:border-brand-primary transition-all">
                  <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTripIds.includes(trip.id)}
                        onChange={(e) => toggleTripSelection(trip.id, e.target.checked)}
                        aria-label={`Select tour ${trip.title || ''}`}
                        className="h-4 w-4"
                      />
                    </label>
                    <img src={trip.imageUrl} alt={trip.title || 'Tour image'} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0" />
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-base sm:text-lg italic leading-tight">{trip.title}</h4>
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">{trip.destination} - {trip.duration} DAYS</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setEditingItem(trip)} className="flex-1 sm:flex-none text-brand-primary font-black text-[10px] uppercase px-4 py-2 bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg">EDIT</button>
                    <button onClick={() => props.onDeleteTrip(trip.id)} className="flex-1 sm:flex-none text-red-500 font-black text-[10px] uppercase px-4 py-2 bg-red-500/5 hover:bg-red-50 rounded-lg">DELETE</button>
                  </div>
                </div>
              ))}

              {filteredTrips.length === 0 && (
                <div className="text-xs text-muted-foreground">No tours match your filters.</div>
              )}
            </div>
          </div>
        );
      }

      case 'DATES':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Departure Dates</h3>
              <button onClick={() => setEditingItem({ tripId: trips[0]?.id || '', startDate: '', endDate: '', slots: 10, status: 'Available' })} className="w-full sm:w-auto adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">ADD NEW DATE</button>
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-border dark:border-dark-border">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-black border-b">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Tour</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Date Range</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Slots</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {departures.map(dep => {
                      const trip = trips.find(t => t.id === dep.tripId);
                      return (
                        <tr key={dep.id}>
                          <td className="px-6 py-6 font-bold text-xs">{trip?.title}</td>
                          <td className="px-6 py-6 text-xs">{dep.startDate} to {dep.endDate}</td>
                          <td className="px-6 py-6 text-center font-black">{dep.slots}</td>
                          <td className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-brand-primary">{dep.status}</td>
                          <td className="px-6 py-6 text-right space-x-4">
                             <button onClick={() => setEditingItem(dep)} className="text-brand-primary text-[10px] font-black">EDIT</button>
                             <button onClick={() => props.onDeleteDeparture(dep.id)} className="text-red-500 text-[10px] font-black">DELETE</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

            case 'INBOX': {
        type InboxItem =
          | { type: 'lead'; id: string; name: string; contact: string; source: string; date: string; status: ItineraryQuery['status']; raw: ItineraryQuery }
          | { type: 'message'; id: string; name: string; contact: string; source: string; date: string; status: null; raw: ContactMessage };

        const parseDateOnly = (value: string): number | null => {
          if (!value) return null;
          const parts = value.split('-').map(Number);
          if (parts.length !== 3) return null;
          const [y, m, d] = parts;
          if (!y || !m || !d) return null;
          const dt = new Date(y, m - 1, d);
          return Number.isNaN(dt.getTime()) ? null : dt.getTime();
        };

        const fromTs = parseDateOnly(inboxFromDate);
        const toTs = parseDateOnly(inboxToDate);
        const q = inboxQuery.trim().toLowerCase();

        const items: InboxItem[] = [
          ...(itineraryQueries || []).map((lead) => ({
            type: 'lead' as const,
            id: lead.id,
            name: lead.name,
            contact: lead.whatsappNumber,
            source: lead.tripTitle || 'Trip inquiry',
            date: lead.date,
            status: lead.status || 'new',
            raw: lead,
          })),
          ...(contactMessages || []).map((m) => ({
            type: 'message' as const,
            id: m.id,
            name: m.name,
            contact: m.email,
            source: 'Contact page',
            date: m.createdAt,
            status: null,
            raw: m,
          })),
        ];

        const filtered = items
          .filter((it) => {
            if (inboxType !== 'all' && it.type !== inboxType) return false;
            if (it.type === 'lead' && inboxStatus !== 'all' && it.status !== inboxStatus) return false;

            if (q) {
              const hay = [
                it.type,
                it.name,
                it.contact,
                it.source,
                it.type === 'message'
                  ? (it.raw as ContactMessage).message
                  : (it.raw as ItineraryQuery).planningTime,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
              if (!hay.includes(q)) return false;
            }

            if (fromTs || toTs) {
              const dt = new Date(it.date);
              const t = Number.isNaN(dt.getTime()) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
              if (t === null) return false;
              if (fromTs !== null && t < fromTs) return false;
              if (toTs !== null && t > toTs) return false;
            }

            return true;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const exportCsv = () => {
          const escapeCsv = (value: unknown) => {
            const s = String(value ?? '');
            return `"${s.replace(/"/g, '""')}"`;
          };

          const header = ['type', 'id', 'name', 'contact', 'source', 'date', 'status', 'message_or_planning_time'].join(',');
          const rows = filtered.map((it) =>
            [
              escapeCsv(it.type),
              escapeCsv(it.id),
              escapeCsv(it.name),
              escapeCsv(it.contact),
              escapeCsv(it.source),
              escapeCsv(it.date),
              escapeCsv(it.type === 'lead' ? (it.status || 'new') : ''),
              escapeCsv(it.type === 'message' ? (it.raw as ContactMessage).message : (it.raw as ItineraryQuery).planningTime),
            ].join(','),
          );

          const csv = [header, ...rows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);

          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const fileName = `inbox-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;

          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        };

        const badgeClass = (type: InboxItem['type']) =>
          type === 'lead'
            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
            : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';

        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Inbox</h3>
                <p className="text-xs text-muted-foreground dark:text-dark-muted-foreground mt-1">Leads + contact messages in one place.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card text-[10px] font-black uppercase tracking-widest hover:border-brand-primary transition-all"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={filtered.length === 0}
                  className="px-6 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card text-[10px] font-black uppercase tracking-widest disabled:opacity-60 hover:border-brand-primary transition-all"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-border dark:border-dark-border p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-2 xl:col-span-4 min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Search</label>
                  <input
                    value={inboxQuery}
                    onChange={(e) => setInboxQuery(e.target.value)}
                    placeholder="Name, contact, trip, message..."
                    className="mt-1 w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary text-foreground dark:text-dark-foreground"
                  />
                </div>
                <div className="xl:col-span-2 min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Type</label>
                  <select
                    title="Inbox item type"
                    value={inboxType}
                    onChange={(e) => setInboxType(e.target.value as any)}
                    className="mt-1 w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-black uppercase tracking-widest text-[10px] outline-none focus:border-brand-primary"
                  >
                    <option value="all">All</option>
                    <option value="lead">Lead</option>
                    <option value="message">Message</option>
                  </select>
                </div>
                <div className="xl:col-span-2 min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status (leads)</label>
                  <select
                    title="Lead status filter"
                    value={inboxStatus}
                    onChange={(e) => setInboxStatus(e.target.value as any)}
                    disabled={inboxType === 'message'}
                    className="mt-1 w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-black uppercase tracking-widest text-[10px] outline-none focus:border-brand-primary disabled:opacity-60"
                  >
                    <option value="all">All</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="xl:col-span-2 min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">From</label>
                  <input
                    type="date"
                    title="Filter from date"
                    value={inboxFromDate}
                    onChange={(e) => setInboxFromDate(e.target.value)}
                    className="mt-1 w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary text-foreground dark:text-dark-foreground"
                  />
                </div>
                <div className="xl:col-span-2 min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">To</label>
                  <input
                    type="date"
                    title="Filter to date"
                    value={inboxToDate}
                    onChange={(e) => setInboxToDate(e.target.value)}
                    className="mt-1 w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary text-foreground dark:text-dark-foreground"
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">No inbox items match your filters.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filtered.map((it) => (
                  <div key={`${it.type}-${it.id}`} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-border dark:border-dark-border shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="min-w-0">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeClass(it.type)}`}>
                          {it.type === 'lead' ? 'Lead' : 'Message'}
                        </div>
                        <h4 className="mt-3 text-lg font-black italic uppercase truncate">{it.name}</h4>
                        <div className="mt-1 text-xs text-muted-foreground dark:text-dark-muted-foreground break-all">{it.contact} - {it.source}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">{new Date(it.date).toLocaleString()}</div>

                        <div className="mt-4 text-sm text-muted-foreground dark:text-dark-muted-foreground whitespace-pre-wrap">
                          {it.type === 'message'
                            ? (it.raw as ContactMessage).message
                            : `Planning time: ${(it.raw as ItineraryQuery).planningTime}`}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                        {it.type === 'lead' && (
                          <select
                            title="Update lead status"
                            value={it.status || 'new'}
                            onChange={(e) => props.onUpdateLeadStatus?.(it.id, e.target.value as any)}
                            className="px-4 py-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border text-[10px] font-black uppercase tracking-widest outline-none focus:border-brand-primary"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="closed">Closed</option>
                          </select>
                        )}

                        {it.type === 'lead' ? (
                          <a
                            href={`https://wa.me/${(it.raw as ItineraryQuery).whatsappNumber.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center"
                          >
                            Reply WhatsApp
                          </a>
                        ) : (
                          <a
                            href={`mailto:${(it.raw as ContactMessage).email}?subject=${encodeURIComponent('Revrom inquiry')}`}
                            className="px-6 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card text-[10px] font-black uppercase tracking-widest hover:border-brand-primary transition-all text-center"
                          >
                            Reply Email
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }case 'SUBSCRIBERS':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Newsletter subscribers</h3>
              <button
                type="button"
                onClick={() => {
                  const escapeCsv = (value: unknown) => {
                    const s = String(value ?? '');
                    return `"${s.replace(/\"/g, '\"\"')}"`;
                  };

                  const header = ['email', 'created_at'].join(',');
                  const rows = (newsletterSubscribers || []).map((s) => [escapeCsv(s.email), escapeCsv(s.createdAt)].join(','));
                  const csv = [header, ...rows].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                  const url = URL.createObjectURL(blob);

                  const now = new Date();
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const fileName = `newsletter-subscribers-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;

                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
                disabled={!newsletterSubscribers || newsletterSubscribers.length === 0}
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card text-[10px] font-black uppercase tracking-widest disabled:opacity-60 hover:border-brand-primary transition-all"
              >
                Export CSV
              </button>
            </div>

            {(!newsletterSubscribers || newsletterSubscribers.length === 0) ? (
              <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">No subscribers yet.</div>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-border dark:border-dark-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[520px]">
                    <thead className="bg-slate-50 dark:bg-black border-b">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Email</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {newsletterSubscribers.map((s) => (
                        <tr key={s.email}>
                          <td className="px-6 py-5 text-xs font-bold break-all">{s.email}</td>
                          <td className="px-6 py-5 text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                          <td className="px-6 py-5 text-right">
                            <a className="text-[10px] font-black uppercase tracking-widest text-brand-primary" href={`mailto:${s.email}`}>Email</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'BLOG':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Blog posts</h3>
              <button onClick={() => setEditingItem({ title: '', author: '', date: new Date().toISOString().split('T')[0], imageUrl: '', excerpt: '', content: '' })} className="w-full sm:w-auto adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">New post</button>
            </div>
            <div className="bg-card dark:bg-dark-card rounded-3xl border border-border dark:border-dark-border p-4 sm:p-6">
              <input
                value={blogSearch}
                onChange={(e) => setBlogSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full md:w-96 bg-background dark:bg-dark-background p-4 rounded-xl border border-border dark:border-dark-border outline-none text-xs font-bold focus:border-brand-primary text-foreground dark:text-dark-foreground"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {blogPosts
                .filter(p => {
                  const q = blogSearch.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    p.title?.toLowerCase().includes(q) ||
                    p.author?.toLowerCase().includes(q) ||
                    p.excerpt?.toLowerCase().includes(q)
                  );
                })
                .map(post => (
                <div key={post.id} className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-border dark:border-dark-border group">
                  <img src={post.imageUrl} alt={post.title || 'Blog post image'} className="w-full h-40 object-cover" />
                  <div className="p-6">
                    <h4 className="font-black uppercase text-sm mb-4 leading-tight">{post.title}</h4>
                    <div className="flex justify-between border-t pt-4">
                      <button onClick={() => setEditingItem(post)} className="text-[10px] font-black text-brand-primary">EDIT</button>
                      <button onClick={() => props.onDeleteBlogPost(post.id)} className="text-[10px] font-black text-red-500">DELETE</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'PAGES':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Custom Pages</h3>
              <button onClick={() => setEditingItem({ title: '', slug: '', content: '', isVisible: true })} className="w-full sm:w-auto adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">NEW PAGE</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {customPages.map(page => (
                <div key={page.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-border dark:border-dark-border flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="text-lg font-black italic uppercase">{page.title}</h4>
                    <p className="text-[10px] font-bold text-brand-primary uppercase">Slug: /{page.slug}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setEditingItem(page)} className="text-brand-primary text-[10px] font-black uppercase">EDIT</button>
                    <button onClick={() => props.onDeleteCustomPage(page.id)} className="text-red-500 text-[10px] font-black uppercase">DELETE</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'LAYOUT':
        return (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Homepage Structure</h3>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-10">Control visibility and background intensity of each section</p>
            
            <div className="space-y-6">
              {siteContent.homePageLayout.map((section) => (
                <div key={section.id} className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-border dark:border-dark-border flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[10px] ${section.isVisible ? 'bg-brand-primary text-white shadow-lg' : 'bg-slate-100 text-muted-foreground opacity-30'}`}>
                      {section.isVisible ? 'ON' : 'OFF'}
                    </div>
                    <div>
                      <h4 className="font-black uppercase italic text-sm">{section.label}</h4>
                      <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">Section ID: {section.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-8 w-full sm:w-auto">
                    <div className="flex flex-col gap-2 w-full sm:w-48">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-black uppercase tracking-widest opacity-60">BG Intensity</label>
                            <span className="text-[9px] font-black text-brand-primary">{Math.round((section.backgroundOpacity || 0) * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.05" 
                          title="Background intensity"
                          aria-label="Background intensity"
                          value={section.backgroundOpacity || 0} 
                          onChange={(e) => updateLayoutOpacity(section.id, parseFloat(e.target.value))}
                          className="accent-brand-primary cursor-pointer"
                        />
                    </div>
                    <button 
                      onClick={() => toggleLayoutVisibility(section.id)}
                      className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${section.isVisible ? 'bg-neutral-100 dark:bg-neutral-800 text-foreground' : 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20'}`}
                    >
                      {section.isVisible ? 'HIDE SECTION' : 'SHOW SECTION'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'VISUALS':
        return (
          <div className="space-y-12 animate-fade-in">
             <section className="space-y-10">
                <div className="flex-grow">
                    <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-1">Gallery Archive</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Manage your expedition visuals</p>
                </div>

                <div className="bg-background/60 dark:bg-dark-background/30 border border-border dark:border-dark-border p-8 rounded-[2.5rem] space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Add new photo</h4>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase tracking-widest opacity-60">Direct Image Link</label>
                            <input 
                              value={galleryUrlInput}
                              onChange={e => setGalleryUrlInput(e.target.value)}
                              placeholder="Paste image URL from Google..."
                              className="w-full bg-white dark:bg-neutral-900 p-4 rounded-xl border border-border dark:border-dark-border outline-none text-xs font-bold focus:border-brand-primary shadow-sm"
                            />
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={handleAddGalleryUrl}
                                className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-black px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
                            >
                                SAVE LINK TO GALLERY
                            </button>
                            <label className="flex-1 adventure-gradient text-white px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg cursor-pointer hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center text-center">
                                UPLOAD LOCAL FILE
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, url => props.onAddGalleryPhoto({ imageUrl: url, caption: 'Expedition Discovery', category: 'Landscapes' }))} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {galleryPhotos.map(photo => (
                    <div key={photo.id} className="relative group rounded-3xl overflow-hidden aspect-square border border-border dark:border-dark-border shadow-md">
                      <img src={photo.imageUrl} alt={photo.caption || 'Gallery photo'} className="w-full h-full object-cover transition-transform group-hover:scale-110" onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=200')} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button aria-label="Edit caption" onClick={() => {
                          setCaptionModal({ isOpen: true, photo });
                          setCaptionInput(photo.caption || '');
                        }} className="bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground p-3 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z"/></svg>
                        </button>
                        <button aria-label="Delete photo" onClick={() => props.onDeleteGalleryPhoto(photo.id)} className="bg-red-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[11px] font-black uppercase tracking-widest p-2 text-center">{photo.caption}</div>
                      )}
                    </div>
                  ))}
                  {galleryPhotos.length === 0 && (
                      <div className="col-span-full py-20 text-center opacity-30 italic">Gallery is empty. Use the tools above to add photos.</div>
                  )}
                </div>
             </section>
          </div>
        );

      case 'SOCIAL':
        return (
          <div className="space-y-12 animate-fade-in">
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Instagram Posts</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Manage the Instagram strip on the homepage</p>
                </div>
                <button
                  onClick={() => setEditingItem({ __type: 'instagram', imageUrl: '', type: 'photo', likes: 0, comments: 0 })}
                  className="w-full sm:w-auto adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  ADD POST
                </button>
              </div>
              {instagramPosts.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">No Instagram posts yet.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {instagramPosts.map((post) => (
                    <div key={post.id} className="bg-white dark:bg-neutral-900 rounded-3xl overflow-hidden border border-border dark:border-dark-border">
                      <img src={post.imageUrl} alt={`Instagram ${post.type} post`} className="w-full h-40 object-cover" />
                      <div className="p-4 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-primary">{post.type}</div>
                        <div className="text-xs text-muted-foreground">❤ {post.likes} · 💬 {post.comments}</div>
                        <div className="flex justify-between border-t pt-3">
                          <button onClick={() => setEditingItem({ __type: 'instagram', ...post })} className="text-[10px] font-black text-brand-primary">EDIT</button>
                          <button onClick={() => props.onDeleteInstagramPost(post.id)} className="text-[10px] font-black text-red-500">DELETE</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Google Reviews</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Manage reviews displayed on the homepage</p>
                </div>
                <button
                  onClick={() => setEditingItem({ __type: 'review', authorName: '', rating: 5, text: '', profilePhotoUrl: '', isFeatured: false })}
                  className="w-full sm:w-auto adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                >
                  ADD REVIEW
                </button>
              </div>
              {googleReviews.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">No reviews yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {googleReviews.map((review) => (
                    <div key={review.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-border dark:border-dark-border">
                      <div className="flex items-center gap-3">
                        <img src={review.profilePhotoUrl} alt={`${review.authorName}'s profile photo`} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="text-sm font-black">{review.authorName}</div>
                          <div className="text-[10px] text-muted-foreground">Rating: {review.rating} / 5</div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground dark:text-dark-muted-foreground line-clamp-3">{review.text}</p>
                      <div className="mt-4 flex justify-between border-t pt-3">
                        <button onClick={() => setEditingItem({ __type: 'review', ...review })} className="text-[10px] font-black text-brand-primary">EDIT</button>
                        <button onClick={() => props.onDeleteGoogleReview(review.id)} className="text-[10px] font-black text-red-500">DELETE</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        );

      case 'HOMEPAGE':
      case 'SETTINGS': {
        const settingsMode: 'homepage' | 'global' = activeTab === 'HOMEPAGE' ? 'homepage' : 'global';

        return (
          <div className="space-y-12 animate-fade-in">
            <section className="space-y-12">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">
                {settingsMode === 'homepage' ? 'Homepage Settings' : 'Global Site Settings'}
              </h3>

              <div className="grid grid-cols-1 gap-20">
                {settingsMode === 'homepage' && (
                <div className="space-y-12">
                    <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Hero Visuals</h4>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Main Impact Title</label>
                        <input title="Main impact title" value={siteContent.heroTitle} onChange={e => onUpdateSiteContent({heroTitle: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Sub-Impact Title</label>
                        <textarea title="Sub-impact title" value={siteContent.heroSubtitle} onChange={e => onUpdateSiteContent({heroSubtitle: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-medium outline-none h-32 resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Hero badge text</label>
                        <input title="Hero badge text" value={siteContent.heroBadgeText || ''} onChange={e => onUpdateSiteContent({ heroBadgeText: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Primary CTA label</label>
                          <input title="Primary CTA label" value={siteContent.heroPrimaryCtaLabel || ''} onChange={e => onUpdateSiteContent({ heroPrimaryCtaLabel: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Secondary CTA label</label>
                          <input title="Secondary CTA label" value={siteContent.heroSecondaryCtaLabel || ''} onChange={e => onUpdateSiteContent({ heroSecondaryCtaLabel: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>
                      {renderImageField('Hero Background Banner', siteContent.heroBgImage, url => onUpdateSiteContent({ heroBgImage: url }))}
                    </div>

                    <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">About Us (Roots)</h4>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Kicker (small heading)</label>
                        <input
                          value={(siteContent as any).rootsKicker || ''}
                          onChange={(e) => onUpdateSiteContent({ rootsKicker: e.target.value } as any)}
                          placeholder="e.g. Born in Chushul"
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Title</label>
                        <input
                          title="Roots section title"
                          value={siteContent.rootsTitle || ''}
                          onChange={(e) => onUpdateSiteContent({ rootsTitle: e.target.value })}
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Body</label>
                        <textarea
                          title="Roots section body"
                          value={siteContent.rootsBody || ''}
                          onChange={(e) => onUpdateSiteContent({ rootsBody: e.target.value })}
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-medium outline-none h-36 resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Button label</label>
                        <input
                          title="Roots button label"
                          value={siteContent.rootsButton || ''}
                          onChange={(e) => onUpdateSiteContent({ rootsButton: e.target.value })}
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Button action</label>
                        <select
                          title="Roots button action"
                          value={(siteContent as any).rootsCtaTarget || 'blogFirstPost'}
                          onChange={(e) => onUpdateSiteContent({ rootsCtaTarget: e.target.value } as any)}
                          className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        >
                          <option value="blogFirstPost">Open first blog post</option>
                          <option value="blog">Open blog</option>
                          <option value="tours">Open tours</option>
                          <option value="customize">Open plan-your-trip</option>
                          <option value="contact">Open contact</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Side image (right photo)</label>
                        <div className="flex flex-col gap-3">
                          <input
                            value={(siteContent as any).rootsImageUrl || ''}
                            onChange={(e) => onUpdateSiteContent({ rootsImageUrl: e.target.value } as any)}
                            placeholder="Paste URL..."
                            className="w-full bg-background dark:bg-dark-background p-4 rounded-xl border border-border dark:border-dark-border outline-none text-xs font-bold focus:border-brand-primary text-foreground dark:text-dark-foreground"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setIsGalleryPickerOpen({
                                  isOpen: true,
                                  onSelect: (url) => {
                                    onUpdateSiteContent({ rootsImageUrl: url } as any);
                                    setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} });
                                  },
                                })
                              }
                              className="flex-1 px-4 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
                            >
                              GALLERY
                            </button>
                            <label className="flex-1 px-4 py-3 rounded-xl bg-brand-primary/10 text-brand-primary text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center justify-center border border-brand-primary/20">
                              UPLOAD
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, (url) => onUpdateSiteContent({ rootsImageUrl: url } as any))}
                              />
                            </label>
                          </div>
                        </div>
                      {!!(siteContent as any).rootsImageUrl && (
                        <div className="relative w-full max-w-sm aspect-video rounded-2xl overflow-hidden border border-border dark:border-dark-border mt-3 shadow-inner bg-slate-100 dark:bg-black">
                          <img src={(siteContent as any).rootsImageUrl} alt="Roots section image preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      </div>
                   </div>

                   <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Homepage Copy</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Trips kicker</label>
                          <input title="Trips kicker" value={siteContent.adventuresKicker || ''} onChange={e => onUpdateSiteContent({ adventuresKicker: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Trips CTA label</label>
                          <input title="Trips CTA label" value={siteContent.adventuresCtaLabel || ''} onChange={e => onUpdateSiteContent({ adventuresCtaLabel: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Trips title</label>
                        <input title="Trips title" value={siteContent.adventuresTitle || ''} onChange={e => onUpdateSiteContent({ adventuresTitle: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Trips subtitle</label>
                        <textarea title="Trips subtitle" value={siteContent.adventuresSubtitle || ''} onChange={e => onUpdateSiteContent({ adventuresSubtitle: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-medium outline-none h-28 resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Why choose us kicker</label>
                          <input title="Why choose us kicker" value={siteContent.whyChooseUsKicker || ''} onChange={e => onUpdateSiteContent({ whyChooseUsKicker: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Why choose us title</label>
                          <input title="Why choose us title" value={siteContent.whyChooseUsTitle || ''} onChange={e => onUpdateSiteContent({ whyChooseUsTitle: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Why choose us cards</div>
                        {(siteContent.whyChooseUsCards || []).map((card, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-border dark:border-dark-border bg-background/50 dark:bg-dark-background/30">
                            <div className="flex flex-col gap-2">
                              <label className="text-[9px] font-black uppercase tracking-widest opacity-60">Icon</label>
                              <input
                                title="Why choose us card icon"
                                value={card.icon || ''}
                                onChange={(e) => {
                                  const next = (siteContent.whyChooseUsCards || []).map((c, i) => (i === idx ? { ...c, icon: e.target.value } : c));
                                  onUpdateSiteContent({ whyChooseUsCards: next });
                                }}
                                className="w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[9px] font-black uppercase tracking-widest opacity-60">Title</label>
                              <input
                                title="Why choose us card title"
                                value={card.title || ''}
                                onChange={(e) => {
                                  const next = (siteContent.whyChooseUsCards || []).map((c, i) => (i === idx ? { ...c, title: e.target.value } : c));
                                  onUpdateSiteContent({ whyChooseUsCards: next });
                                }}
                                className="w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[9px] font-black uppercase tracking-widest opacity-60">Description</label>
                              <input
                                title="Why choose us card description"
                                value={card.desc || ''}
                                onChange={(e) => {
                                  const next = (siteContent.whyChooseUsCards || []).map((c, i) => (i === idx ? { ...c, desc: e.target.value } : c));
                                  onUpdateSiteContent({ whyChooseUsCards: next });
                                }}
                                className="w-full p-3 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => onUpdateSiteContent({ whyChooseUsCards: [...(siteContent.whyChooseUsCards || []), { icon: '*', title: 'New benefit', desc: 'Describe it here.' }] })}
                            className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-widest"
                          >
                            Add card
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateSiteContent({ whyChooseUsCards: (siteContent.whyChooseUsCards || []).slice(0, -1) })}
                            disabled={(siteContent.whyChooseUsCards || []).length <= 1}
                            className="flex-1 px-4 py-3 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            Remove last
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Reviews kicker</label>
                          <input title="Reviews kicker" value={siteContent.reviewsKicker || ''} onChange={e => onUpdateSiteContent({ reviewsKicker: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Reviews title</label>
                          <input title="Reviews title" value={siteContent.reviewsTitle || ''} onChange={e => onUpdateSiteContent({ reviewsTitle: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Blog kicker</label>
                          <input title="Blog kicker" value={siteContent.blogKicker || ''} onChange={e => onUpdateSiteContent({ blogKicker: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Blog title</label>
                          <input title="Blog title" value={siteContent.blogTitle || ''} onChange={e => onUpdateSiteContent({ blogTitle: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Gallery kicker</label>
                          <input title="Gallery kicker" value={siteContent.galleryKicker || ''} onChange={e => onUpdateSiteContent({ galleryKicker: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Gallery CTA label</label>
                          <input title="Gallery CTA label" value={siteContent.galleryCtaLabel || ''} onChange={e => onUpdateSiteContent({ galleryCtaLabel: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Instagram kicker</label>
                          <input title="Instagram kicker" value={siteContent.instagramKicker || ''} onChange={e => onUpdateSiteContent({ instagramKicker: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Instagram title</label>
                          <input title="Instagram title" value={siteContent.instagramTitle || ''} onChange={e => onUpdateSiteContent({ instagramTitle: e.target.value })} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                        </div>
                      </div>
                    </div>
                 </div>
                )}

                {settingsMode === 'global' && (
                <div className="space-y-12">
                  <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Contact</h4>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Admin WhatsApp</label>
                        <input title="Admin WhatsApp number" value={siteContent.adminWhatsappNumber} onChange={e => onUpdateSiteContent({adminWhatsappNumber: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Contact email</label>
                        <input title="Contact email" value={siteContent.contactEmail} onChange={e => onUpdateSiteContent({contactEmail: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Contact phone</label>
                        <input title="Contact phone" value={siteContent.contactPhone || ''} onChange={e => onUpdateSiteContent({contactPhone: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Contact address</label>
                        <textarea title="Contact address" value={siteContent.contactAddress || ''} onChange={e => onUpdateSiteContent({contactAddress: e.target.value})} rows={3} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                   </div>

                   <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Social links</h4>
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Instagram URL</label>
                        <input
                          value={siteContent.instagramUrl || ''}
                          onChange={e => onUpdateSiteContent({ instagramUrl: e.target.value })}
                          placeholder="https://instagram.com/yourpage"
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Facebook URL</label>
                        <input
                          value={siteContent.facebookUrl || ''}
                          onChange={e => onUpdateSiteContent({ facebookUrl: e.target.value })}
                          placeholder="https://facebook.com/yourpage"
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">YouTube URL</label>
                        <input
                          value={siteContent.youtubeUrl || ''}
                          onChange={e => onUpdateSiteContent({ youtubeUrl: e.target.value })}
                          placeholder="https://youtube.com/@yourchannel"
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                      <div className="flex flex-col gap-2 mb-6">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Google reviews URL</label>
                        <input
                          value={siteContent.googleReviewsUrl || ''}
                          onChange={e => onUpdateSiteContent({ googleReviewsUrl: e.target.value })}
                          placeholder="https://g.page/r/...."
                          className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                        />
                      </div>
                   </div>

                   <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Branding Assets</h4>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Site logo (transparent)</label>
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                          <label className="px-5 py-3 rounded-xl bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm hover:bg-brand-primary/90 transition-all">
                            Upload from device
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) =>
                                handleFileUpload(e, (url) => {
                                  onUpdateSiteContent({ logoUrl: url });
                                  showNotice('Logo updated');
                                }, { addToGallery: false })
                              }
                            />
                          </label>
                          {!!siteContent.logoUrl && (
                            <button
                              type="button"
                              onClick={() => onUpdateSiteContent({ logoUrl: '' })}
                              className="px-5 py-3 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {!!siteContent.logoUrl && (
                          <div className="mt-3 flex items-center gap-4">
                            <div className="w-28 h-16 rounded-xl overflow-hidden border border-border dark:border-dark-border bg-white/60 dark:bg-black/30 flex items-center justify-center">
                              <img src={siteContent.logoUrl} alt="Site logo preview" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] text-muted-foreground truncate">
                                {siteContent.logoUrl.startsWith('data:') ? 'Stored as a local image (data URL)' : siteContent.logoUrl}
                              </div>
                              {!siteContent.logoUrl.startsWith('data:') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      void navigator.clipboard.writeText(siteContent.logoUrl);
                                      showNotice('Link copied');
                                    } catch {}
                                  }}
                                  className="mt-2 px-4 py-2 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
                                >
                                  Copy link
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Footer tagline</label>
                        <input title="Footer tagline" value={siteContent.footerTagline} onChange={e => onUpdateSiteContent({footerTagline: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                   </div>
                </div>
                )}
              </div>
            </section>

            {settingsMode === 'homepage' && (
              <>
                {/* Section Backgrounds - full width rows */}
                <div className="mt-4 w-full">
                  <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-2 mb-3">Section Backgrounds</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'adventuresBgImage', label: 'Adventures background' },
                      { key: 'departuresBgImage', label: 'Departures background' },
                      { key: 'whyChooseUsBgImage', label: 'Why Choose Us BG' },
                      { key: 'rootsBgImage', label: 'Roots / About Us BG' },
                      { key: 'reviewsBgImage', label: 'Reviews background' },
                      { key: 'blogBgImage', label: 'Blog background' },
                      { key: 'galleryBgImage', label: 'Gallery background' },
                      { key: 'instagramBgImage', label: 'Instagram background' }
                    ].map(field => (
                      <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white dark:bg-neutral-900 p-3 sm:px-2 sm:py-1 rounded-xl sm:rounded-sm border border-border dark:border-dark-border w-full">
                        <div className="w-full sm:w-48 text-xs font-black uppercase tracking-widest opacity-60 sm:pr-2">{field.label}</div>

                        <input
                          value={(siteContent as any)[field.key] || ''}
                          onChange={e => onUpdateSiteContent({ [field.key]: e.target.value } as any)}
                          placeholder="Paste URL (e.g. from Google)..."
                          className="w-full sm:flex-1 sm:min-w-0 bg-background dark:bg-dark-background px-3 py-2 sm:px-2 sm:py-1 rounded-xl sm:rounded-sm border border-border dark:border-dark-border outline-none text-sm font-bold focus:border-brand-primary text-foreground dark:text-dark-foreground"
                        />

                        <div className="w-full sm:w-44 flex items-center justify-between sm:justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsGalleryPickerOpen({ isOpen: true, onSelect: (url) => { onUpdateSiteContent({ [field.key]: url } as any); setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} }); } })}
                            className="flex-1 sm:flex-none px-3 py-2 sm:px-2 sm:py-1 bg-neutral-800 text-white rounded-xl sm:rounded-sm hover:bg-neutral-700 transition-all text-[10px] font-black uppercase"
                          >
                            GALLERY
                          </button>

                          <label className="flex-1 sm:flex-none px-3 py-2 sm:px-2 sm:py-1 bg-brand-primary/10 text-brand-primary rounded-xl sm:rounded-sm text-[10px] font-black uppercase cursor-pointer flex items-center justify-center border border-brand-primary/20">
                            UPLOAD
                            <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, url => onUpdateSiteContent({ [field.key]: url } as any))} />
                          </label>

                          {(siteContent as any)[field.key] && (
                            <div className="w-8 h-8 rounded-lg sm:rounded-sm overflow-hidden border border-border sm:ml-2">
                              <img src={(siteContent as any)[field.key]} alt={`${field.label} preview`} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const menuItems: AdminTab[] = ['TOURS', 'DATES', 'INBOX', 'SUBSCRIBERS', 'BLOG', 'PAGES', 'VISUALS', 'SOCIAL', 'LAYOUT', 'HOMEPAGE', 'SETTINGS'];

  const isSupabaseMode = !!props.isSupabaseMode;
  // In Supabase mode, saving is controlled by App.tsx. We expose a UI toggle here.
  const autoSaveEnabled = !!props.autoSaveEnabled;
  const saveStatus = props.saveStatus ?? 'idle';
  const isDirty = saveStatus === 'dirty' || saveStatus === 'error';
  const isSaving = saveStatus === 'saving';

  const requestCloseModal = () => {
    if (isSupabaseMode && isDirty && typeof window !== 'undefined') {
      const ok = window.confirm('You have unsaved changes. Close anyway?');
      if (!ok) return false;
    }
    return true;
  };

  const validateEditingItem = (): string | null => {
    if (!editingItem) return null;

    const shouldValidate = validationAttempted || editingDirty;

    if (activeTab === 'TOURS') {
      if (shouldValidate && !editingItem.title?.trim()) return 'Tour title is required.';
      if (shouldValidate && !editingItem.destination?.trim()) return 'Destination is required.';
      if (!Number.isFinite(Number(editingItem.duration)) || Number(editingItem.duration) <= 0) return 'Duration must be > 0.';
      if (shouldValidate && !editingItem.imageUrl?.trim()) return 'Tour main image is required.';
      if (itineraryInputError) return itineraryInputError;
      if (routeCoordinatesError) return routeCoordinatesError;
      if (editingItem.itinerary != null && !Array.isArray(editingItem.itinerary)) {
        return 'Itinerary must be a JSON array (or an object with { itinerary: [...] }).';
      }
      if (Array.isArray(editingItem.itinerary)) {
        for (const d of editingItem.itinerary) {
          if (!d || typeof d !== 'object') return 'Itinerary items must be objects.';
          if (!Number.isFinite(Number((d as any).day)) || Number((d as any).day) < 1) return 'Each itinerary item must have a valid "day" number.';
          if (!String((d as any).title || '').trim()) return 'Each itinerary item must have a "title".';
          if (typeof (d as any).description !== 'string') return 'Each itinerary item must have a "description" string (can be empty).';
        }
      }
      return null;
    }

    if (activeTab === 'DATES') {
      return getDepartureValidationError(editingItem);
    }

    if (activeTab === 'BLOG') {
      if (!editingItem.title?.trim()) return 'Post title is required.';
      if (!editingItem.author?.trim()) return 'Author is required.';
      if (!editingItem.date?.trim()) return 'Date is required.';
      if (!editingItem.imageUrl?.trim()) return 'Post image is required.';
      if (!editingItem.excerpt?.trim()) return 'Excerpt is required.';
      if (!editingItem.content?.trim()) return 'Content is required.';
      return null;
    }

    if (activeTab === 'SOCIAL') {
      if (editingItem.__type === 'instagram') {
        if (!editingItem.imageUrl?.trim()) return 'Instagram image URL is required.';
        return null;
      }
      if (editingItem.__type === 'review') {
        if (!editingItem.authorName?.trim()) return 'Review author is required.';
        if (!editingItem.text?.trim()) return 'Review text is required.';
        const rating = Number(editingItem.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) return 'Rating must be between 1 and 5.';
        return null;
      }
    }

    if (activeTab === 'PAGES') {
      if (!editingItem.title?.trim()) return 'Page title is required.';
      if (!editingItem.slug?.trim()) return 'Slug is required.';
      if (!editingItem.content?.trim()) return 'Content is required.';
      return null;
    }

    return null;
  };

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen pb-20 selection:bg-brand-primary selection:text-white relative">
      {adminNotice && (
        <div className={`fixed top-20 sm:top-6 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-[999] px-4 py-2 rounded-md shadow-lg max-w-[90vw] text-center ${adminNotice.type === 'success' ? 'bg-emerald-600 text-white' : adminNotice.type === 'info' ? 'bg-slate-700 text-white' : 'bg-red-600 text-white'}`}>
          {adminNotice.text}
        </div>
      )}
      {uploadUi && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[999] w-[92vw] sm:w-[420px] rounded-2xl border border-border dark:border-dark-border bg-card dark:bg-dark-card shadow-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Uploading</div>
              <div className="text-xs font-bold truncate">{uploadUi.fileName}</div>
            </div>
            <div className="text-[11px] font-black tabular-nums">{Math.round(uploadUi.progress)}%</div>
          </div>
          <progress
            value={Math.max(0, Math.min(100, uploadUi.progress))}
            max={100}
            className="mt-3 w-full h-2"
            aria-label="Upload progress"
          />
        </div>
      )}
      {/* Gallery Picker Modal - Higher Z-Index */}
      {isGalleryPickerOpen.isOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex items-start sm:items-center justify-center p-4 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-[2rem] sm:rounded-[3rem] border border-border dark:border-dark-border flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 sm:p-8 border-b flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Choose from Gallery</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Select an existing photo for your content</p>
              </div>
              <button onClick={() => setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} })} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 text-2xl font-black transition-transform hover:rotate-90">X</button>
            </div>
            <div className="flex-grow overflow-y-auto p-5 sm:p-8 no-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {galleryPhotos.map(photo => (
                  <button 
                    key={photo.id} 
                    onClick={() => isGalleryPickerOpen.onSelect(photo.imageUrl)}
                    aria-label={`Select ${photo.caption || 'gallery photo'}`}
                    className="aspect-square rounded-3xl overflow-hidden border-4 border-transparent hover:border-brand-primary transition-all group relative shadow-md"
                  >
                    <img src={photo.imageUrl} alt={photo.caption || 'Gallery photo'} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-brand-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                ))}
                {galleryPhotos.length === 0 && (
                  <div className="col-span-full py-20 text-center opacity-30 italic">Gallery is empty. Upload some photos first.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Caption Edit Modal */}
      {captionModal.isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-2xl p-4 sm:p-6 shadow-2xl border border-border pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black">Edit caption for this photo</h3>
              <button onClick={() => setCaptionModal({ isOpen: false, photo: null })} className="text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">X</button>
            </div>
            {captionModal.photo && (
              <div className="space-y-4">
                <div className="w-full h-52 rounded-md overflow-hidden border border-border">
                  <img src={captionModal.photo.imageUrl} alt={captionModal.photo.caption || 'Gallery photo'} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Caption</label>
                  <input autoFocus value={captionInput} onChange={e => setCaptionInput(e.target.value)} placeholder="Photo caption" className="w-full p-3 rounded-xl border border-border bg-background dark:bg-dark-background outline-none text-foreground dark:text-dark-foreground" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Category</label>
                  <select 
                    title="Photo category"
                    value={captionModal.photo.category} 
                    onChange={e => {
                      if (captionModal.photo) {
                        setCaptionModal({ isOpen: true, photo: { ...captionModal.photo, category: e.target.value as any } });
                      }
                    }}
                    className="w-full p-3 rounded-xl border border-border bg-background dark:bg-dark-background outline-none text-foreground dark:text-dark-foreground font-bold text-sm"
                  >
                    <option value="Landscapes">Landscapes</option>
                    <option value="Riders">Riders</option>
                    <option value="Culture">Culture</option>
                    <option value="Behind the Scenes">Behind the Scenes</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setCaptionModal({ isOpen: false, photo: null })} className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button>
                  <button onClick={() => {
                      if (captionModal.photo) {
                        props.onUpdateGalleryPhoto({ ...captionModal.photo, caption: captionInput });
                        showNotice('Caption updated');
                      }
                      setCaptionModal({ isOpen: false, photo: null });
                    }} className="px-4 py-2 rounded-xl bg-brand-primary text-white font-black text-sm">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Admin Mobile Navigation - Higher Z-Index than global header */}
      <div className="lg:hidden sticky top-0 z-[320] bg-card dark:bg-dark-card backdrop-blur-xl border-b border-border dark:border-dark-border px-4 py-4 flex items-center gap-3 shadow-md">
         <button
           type="button"
           onClick={() => {
             if (editingItem && !requestCloseModal()) return;
             props.onExitAdmin?.();
           }}
           className="px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-background/60 dark:bg-dark-background/40 border border-border dark:border-dark-border text-foreground dark:text-dark-foreground active:scale-95 transition-transform"
         >
          ← Site
         </button>
         <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">ADMIN</span>
            <span className="text-lg font-black italic tracking-tighter uppercase leading-none truncate">{activeTab}</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMobileMenuOpen ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:scale-[1.05] active:scale-95'}`}>{isMobileMenuOpen ? 'Close' : 'Menu'}</button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[310] bg-black/95 backdrop-blur-2xl pt-24 p-4 sm:p-6 animate-fade-in overflow-y-auto">
           <div className="space-y-3">
              {menuItems.map(tab => (
                <button key={tab} onClick={() => { if (editingItem && !requestCloseModal()) return; setActiveTab(tab); setEditingItem(null); setIsMobileMenuOpen(false); }} className={`w-full text-left px-8 py-6 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{tab}</button>
              ))}
              <div className="h-px bg-white/10 my-4"></div>
              <button onClick={props.onLogout} className="w-full text-left px-8 py-6 rounded-2xl text-[12px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all">Logout</button>
           </div>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 py-6 sm:py-10 lg:py-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28 bg-card dark:bg-dark-card rounded-[3rem] border border-border dark:border-dark-border shadow-adventure-dark overflow-hidden flex flex-col">
              <div className="p-10 text-center border-b border-border/50 dark:border-dark-border/50 bg-background/60 dark:bg-dark-background/20">
                <h2 className="text-2xl font-black font-display uppercase italic tracking-tighter mb-1">Admin</h2>
                <p className="text-[9px] font-black opacity-30 tracking-[0.3em] uppercase">Control Center</p>
                {props.onExitAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingItem && !requestCloseModal()) return;
                      props.onExitAdmin?.();
                    }}
                    className="mt-6 w-full px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-background dark:bg-dark-background border border-border dark:border-dark-border hover:border-brand-primary/30 transition-colors"
                  >
                    View site
                  </button>
                )}
              </div>
              <nav className="p-6 space-y-1.5">
                {menuItems.map(tab => (
                  <button key={tab} onClick={() => { if (editingItem && !requestCloseModal()) return; setActiveTab(tab); setEditingItem(null); }} className={`w-full text-left px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 scale-[1.02]' : 'text-muted-foreground hover:bg-background/60 dark:hover:bg-dark-background/60'}`}>{tab}</button>
                ))}
                <div className="h-px bg-border/50 dark:bg-dark-border/50 my-6 mx-4"></div>
                <button onClick={props.onLogout} className="w-full text-left px-6 py-4 rounded-2xl text-[11px] font-black uppercase text-red-500 hover:bg-red-500/5 transition-all">Logout</button>
              </nav>
            </div>
          </aside>

          <main className="flex-grow w-full bg-card dark:bg-dark-card rounded-[3rem] lg:rounded-[4rem] p-5 sm:p-8 lg:p-16 border border-border dark:border-dark-border shadow-adventure-dark min-h-[700px]">
            {isSupabaseMode && (
              <div className="mb-8 rounded-[2rem] border border-border dark:border-dark-border bg-card/90 dark:bg-dark-card/80 backdrop-blur-md p-4 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6 md:items-center md:justify-between shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Save changes</div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          saveStatus === 'saving'
                            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
                            : saveStatus === 'saved'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                              : saveStatus === 'error'
                                ? 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20'
                                : isDirty
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/20'
                                  : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            saveStatus === 'saving'
                              ? 'bg-brand-primary animate-pulse'
                              : saveStatus === 'saved'
                                ? 'bg-emerald-500'
                                : saveStatus === 'error'
                                  ? 'bg-red-500'
                                  : isDirty
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                          }`}
                        />
                        {saveStatus === 'saving'
                          ? 'Saving...'
                          : saveStatus === 'saved'
                            ? 'Saved'
                          : saveStatus === 'error'
                            ? 'Save failed'
                          : isDirty
                            ? 'Unsaved'
                            : 'Saved'}
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground">
                        {autoSaveEnabled ? 'Auto-save is ON. You can also click Save now.' : 'Auto-save is OFF. Click Save to publish.'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isSupabaseMode) return;
                      props.onToggleAutoSave?.(!autoSaveEnabled);
                    }}
                    disabled={!isSupabaseMode}
                    className={`w-full md:w-auto px-6 py-3.5 sm:py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      !isSupabaseMode
                        ? 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-slate-500 border-transparent cursor-not-allowed'
                        : autoSaveEnabled
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 hover:scale-[1.01] active:scale-95'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/20 hover:scale-[1.01] active:scale-95'
                    }`}
                  >
                    Auto-save: {autoSaveEnabled ? 'ON' : 'OFF'}
                  </button>

                  <button
                    type="button"
                    onClick={() => props.onSaveNow?.()}
                    disabled={!isDirty || isSaving}
                    className={`w-full md:w-auto px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      !isDirty || isSaving
                        ? 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                      : 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isSaving ? 'Saving...' : 'Save now'}
                  </button>
                </div>
              </div>
            )}
            {renderTabContent()}
          </main>
          </div>
        </div>
      </div>

      {/* Editing Dialog - Maximum Z-Index */}
      {editingItem && (
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-start sm:items-center justify-center p-4 overflow-y-auto">
           <div className="bg-white dark:bg-neutral-900 w-full h-[100dvh] p-6 sm:p-10 lg:p-16 rounded-none sm:rounded-[2.5rem] border border-border dark:border-dark-border relative animate-fade-up shadow-2xl max-h-none flex flex-col">
            <button aria-label="Close editor" onClick={() => { if (requestCloseModal()) setEditingItem(null); }} className="absolute top-4 right-4 sm:top-10 sm:right-10 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-background dark:bg-dark-background hover:bg-red-500 hover:text-white transition-all text-2xl sm:text-3xl font-black z-[10] active:scale-90">X</button>
              <h3 className="text-3xl sm:text-5xl font-black tracking-tight mb-10 leading-none">
                {activeTab === 'TOURS'
                  ? 'Edit tour'
                  : activeTab === 'DATES'
                    ? 'Edit date'
                    : activeTab === 'BLOG'
                      ? 'Edit post'
                      : activeTab === 'PAGES'
                        ? 'Edit page'
                        : 'Edit'}
              </h3>
              
              <div className="flex-grow overflow-y-auto pr-0 sm:pr-8 no-scrollbar pb-10">
                 {activeTab === 'TOURS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                       <div className="space-y-10">
                          <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-4 mb-8">Basic info</h4>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Title</label>
                              <input
                                data-invalid={(validationAttempted || editingDirty) && !editingItem.title?.trim() ? 'true' : undefined}
                                title="Tour title"
                                value={editingItem.title}
                                onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Destination</label>
                              <input
                                data-invalid={(validationAttempted || editingDirty) && !editingItem.destination?.trim() ? 'true' : undefined}
                                title="Tour destination"
                                value={editingItem.destination}
                                onChange={e => setEditingItem({...editingItem, destination: e.target.value})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Short description</label>
                              <textarea
                                title="Short description"
                                value={editingItem.shortDescription}
                                onChange={e => setEditingItem({...editingItem, shortDescription: e.target.value})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground h-24"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-8 mb-6">
                             <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Duration (days)</label>
                                 <input
                                   data-invalid={(validationAttempted || editingDirty) && (!Number.isFinite(Number(editingItem.duration)) || Number(editingItem.duration) <= 0) ? 'true' : undefined}
                                   type="number"
                                   title="Duration (days)"
                                   value={editingItem.duration}
                                   onChange={e => setEditingItem({...editingItem, duration: parseInt(e.target.value)})}
                                   className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                                 />
                             </div>
                             <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Difficulty</label>
                                <select title="Difficulty" value={editingItem.difficulty} onChange={e => setEditingItem({...editingItem, difficulty: e.target.value})} className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground">
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="Expert">Expert</option>
                                 </select>
                             </div>
                          </div>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Price</label>
                              <input
                                type="number"
                                min={0}
                                title="Price"
                                value={editingItem.price}
                                onChange={e => setEditingItem({...editingItem, price: Number.parseFloat(e.target.value) || 0})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>
                          {renderImageField('Main tour image', editingItem.imageUrl, url => {
                            const normalized = url?.trim();
                            const prevGallery = Array.isArray(editingItem?.gallery) ? editingItem.gallery : [];
                            const already = normalized && prevGallery.some((p: any) => p.imageUrl === normalized);
                            setEditingItem((prev: any) => {
                              if (!prev) return prev;
                              const gallery = Array.isArray(prev.gallery) ? prev.gallery.slice() : [];
                              if (normalized && !already) {
                                const newItem = { id: `tmp-${Date.now()}`, imageUrl: normalized, caption: '', category: 'Landscapes' };
                                gallery.push(newItem as any);
                              }
                              return { ...prev, imageUrl: normalized || prev.imageUrl, gallery } as any;
                            });
                            if (normalized) {
                              if (!already) showNotice('Image added to trip gallery');
                              else showNotice('Image already in trip gallery', 'info');
                            }
                          }, (validationAttempted || editingDirty) && !editingItem.imageUrl?.trim())}

                          <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Gallery Images</h4>
                            <div className="flex items-center gap-3 flex-wrap">
                              {(editingItem.gallery || []).map((g: any, idx: number) => (
                                <div key={(g && g.id) || idx} className="flex flex-col items-start gap-2">
                                  <div className="relative w-28 h-16 rounded-md overflow-hidden border border-border">
                                    <img src={g.imageUrl} alt={g.caption || `Gallery image ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button aria-label="Remove from gallery" onClick={() => setEditingItem({...editingItem, gallery: (editingItem.gallery || []).filter((_: any, i: number) => i !== idx)})} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">X</button>
                                  </div>
                                  <input value={g.caption || ''} onChange={e => {
                                      const next = (editingItem.gallery || []).map((item: any, i: number) => i === idx ? { ...item, caption: e.target.value } : item);
                                      setEditingItem({ ...editingItem, gallery: next });
                                  }} placeholder="Caption (shown below image)" className="text-xs p-1 rounded-md border border-border w-28" />
                                </div>
                              ))}

                              <button type="button" onClick={() => setIsGalleryPickerOpen({ isOpen: true, onSelect: (url) => {
                                  const found = props.galleryPhotos.find(p => p.imageUrl === url);
                                  const prevGallery = Array.isArray(editingItem?.gallery) ? editingItem.gallery : [];
                                  const already = prevGallery.some((p: any) => p.imageUrl === url);
                                  if (!already) {
                                    if (found) {
                                      setEditingItem({ ...editingItem, gallery: [...prevGallery, { ...found }] });
                                    } else {
                                      setEditingItem({ ...editingItem, gallery: [...prevGallery, { id: `tmp-${Date.now()}`, imageUrl: url, caption: '', category: 'Landscapes' }] });
                                    }
                                    showNotice('Image added to trip gallery');
                                  } else {
                                    showNotice('Image already in trip gallery', 'info');
                                  }
                                  setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} });
                                } })} className="px-3 py-2 bg-neutral-800 text-white rounded-md text-[12px] font-black uppercase">ADD FROM GALLERY</button>

                              <label className="px-3 py-2 bg-brand-primary/10 text-brand-primary rounded-md text-[12px] font-black uppercase cursor-pointer flex items-center">
                                UPLOAD
                                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, url => {
                                  const prevGallery = Array.isArray(editingItem?.gallery) ? editingItem.gallery : [];
                                  const already = prevGallery.some((p: any) => p.imageUrl === url);
                                  if (!already) {
                                    const newItem = { id: `tmp-${Date.now()}`, imageUrl: url, caption: '', category: 'Landscapes' };
                                    setEditingItem({ ...editingItem, gallery: [...prevGallery, newItem] });
                                    showNotice('Image added to trip gallery');
                                  } else {
                                    showNotice('Image already in trip gallery', 'info');
                                  }
                                })} />
                              </label>
                            </div>
                          </div>
                       </div>
                       <div className="space-y-10">
                          <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-4 mb-8">Details</h4>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Description (Markdown)</label>
                              <textarea title="Tour description (Markdown)" value={editingItem.longDescription} onChange={e => setEditingItem({...editingItem, longDescription: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-56 outline-none resize-none text-sm focus:border-brand-primary shadow-sm leading-relaxed text-foreground dark:text-dark-foreground" />
                          </div>
                           <div className="flex flex-col gap-4 mb-8">
                             <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Itinerary Plan</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = Array.isArray(editingItem.itinerary) ? [...editingItem.itinerary] : [];
                                    const nextDay = current.length > 0 ? (Number(current[current.length - 1].day) || 0) + 1 : 1;
                                    setEditingItem({
                                      ...editingItem,
                                      itinerary: [...current, { day: nextDay, title: '', description: '' }]
                                    });
                                  }}
                                  className="text-[9px] font-black uppercase tracking-widest bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-lg hover:bg-brand-primary/20 transition-colors"
                                >
                                  + Add Day
                                </button>
                             </div>
                             
                             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {(Array.isArray(editingItem.itinerary) ? editingItem.itinerary : []).map((dayItem: any, idx: number) => (
                                  <div key={idx} className="p-4 rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-white/5 relative group">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...(editingItem.itinerary || [])];
                                        next.splice(idx, 1);
                                        setEditingItem({ ...editingItem, itinerary: next });
                                      }}
                                      className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-black rounded-lg shadow-sm z-10"
                                      title="Remove day"
                                    >
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>

                                    <div className="flex gap-4 items-start">
                                       <div className="w-16 flex-shrink-0">
                                         <label className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">Day</label>
                                         <input
                                            type="number"
                                            value={dayItem.day}
                                            placeholder="1"
                                            title="Day number"
                                            onChange={e => {
                                              const val = parseInt(e.target.value);
                                              const next = [...editingItem.itinerary];
                                              next[idx] = { ...next[idx], day: isNaN(val) ? 0 : val };
                                              setEditingItem({ ...editingItem, itinerary: next });
                                            }}
                                            className="w-full p-2 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-black font-bold text-center outline-none text-xs focus:ring-1 focus:ring-brand-primary shadow-sm"
                                         />
                                       </div>
                                       <div className="flex-grow">
                                         <label className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-1">Title</label>
                                         <input
                                            value={dayItem.title}
                                            onChange={e => {
                                              const next = [...editingItem.itinerary];
                                              next[idx] = { ...next[idx], title: e.target.value };
                                              setEditingItem({ ...editingItem, itinerary: next });
                                            }}
                                            className="w-full p-2 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-black font-bold outline-none text-xs focus:ring-1 focus:ring-brand-primary mb-2 shadow-sm"
                                            placeholder="e.g. Arrival in Leh"
                                         />
                                         <textarea
                                            value={dayItem.description}
                                            onChange={e => {
                                               const next = [...editingItem.itinerary];
                                               next[idx] = { ...next[idx], description: e.target.value };
                                               setEditingItem({ ...editingItem, itinerary: next });
                                            }}
                                            className="w-full p-2 rounded-lg border border-border dark:border-dark-border bg-white dark:bg-black text-xs text-muted-foreground outline-none resize-none h-20 focus:ring-1 focus:ring-brand-primary shadow-sm"
                                            placeholder="Description of activities..."
                                         />
                                       </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {(!editingItem.itinerary || editingItem.itinerary.length === 0) && (
                                   <div className="p-8 text-center text-muted-foreground border-2 border-dashed border-border dark:border-dark-border rounded-xl">
                                     <p className="text-xs mb-2">No itinerary days added yet.</p>
                                     <button
                                        type="button"
                                        onClick={() => setEditingItem({ ...editingItem, itinerary: [{ day: 1, title: '', description: '' }] })}
                                        className="text-xs font-bold text-brand-primary hover:underline"
                                     >
                                       Start adding days
                                     </button>
                                   </div>
                                )}
                             </div>
                          </div>

                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">What's Included (one per line)</label>
                              <textarea
                                value={(editingItem.inclusions || []).join('\n')}
                                onChange={e => setEditingItem({...editingItem, inclusions: e.target.value.split('\n').filter(l => l.trim())})}
                                placeholder="Royal Enfield Himalayan Bike&#10;Support Vehicle&#10;Expert Mechanic&#10;Comfortable Stays"
                                className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-32 outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                              <div className="text-[11px] text-muted-foreground dark:text-dark-muted-foreground">
                                Items shown with green checkmarks on trip detail page.
                              </div>
                          </div>

                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">What's NOT Included (one per line)</label>
                              <textarea
                                value={(editingItem.exclusions || []).join('\n')}
                                onChange={e => setEditingItem({...editingItem, exclusions: e.target.value.split('\n').filter(l => l.trim())})}
                                placeholder="Flights&#10;Fuel&#10;Lunch&#10;Personal expenses"
                                className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-32 outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                              <div className="text-[11px] text-muted-foreground dark:text-dark-muted-foreground">
                                Items shown with red X marks on trip detail page.
                              </div>
                          </div>

                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Activities (one per line)</label>
                              <textarea
                                value={(editingItem.activities || []).join('\n')}
                                onChange={e => setEditingItem({...editingItem, activities: e.target.value.split('\n').filter(l => l.trim())})}
                                placeholder="Scenic mountain riding&#10;Visiting local villages&#10;Photography stops"
                                className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-28 outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>

                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Route Description</label>
                              <input
                                value={editingItem.route || ''}
                                onChange={e => setEditingItem({...editingItem, route: e.target.value})}
                                placeholder="Manali - Jispa - Sarchu - Leh - Srinagar"
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>

                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Route Coordinates (one per line)</label>
                              <textarea
                                value={routeCoordinatesInput}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setRouteCoordinatesInput(next);
                                  const parsed = parseRouteCoordinates(next);
                                  setRouteCoordinatesError(parsed.error || '');
                                  if (!parsed.error) setEditingItem({ ...editingItem, routeCoordinates: parsed.coords });
                                }}
                                placeholder="32.2396, 77.1887\n32.6533, 77.2000"
                                className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-mono text-[12px] h-28 outline-none resize-none focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                              {routeCoordinatesError ? (
                                <div className="text-[11px] font-bold text-red-600 dark:text-red-300">{routeCoordinatesError}</div>
                              ) : (
                                <div className="text-[11px] text-muted-foreground dark:text-dark-muted-foreground">
                                  Format: <span className="font-mono">latitude, longitude</span> per line.
                                </div>
                              )}
                          </div>

                          <div className="space-y-6 border-t border-border/50 pt-8 mb-2">
                            <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest">Trip SEO (Optional)</h4>
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Title</label>
                              <input
                                value={editingItem.seo?.title || ''}
                                onChange={e => setEditingItem({ ...editingItem, seo: { ...editingItem.seo, title: e.target.value } })}
                                placeholder="Leave empty to use trip title"
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Description</label>
                              <textarea
                                value={editingItem.seo?.description || ''}
                                onChange={e => setEditingItem({ ...editingItem, seo: { ...editingItem.seo, description: e.target.value } })}
                                placeholder="Leave empty to use short description"
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm h-24 text-foreground dark:text-dark-foreground"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Keywords (comma separated)</label>
                              <input
                                value={editingItem.seo?.keywords || ''}
                                onChange={e => setEditingItem({ ...editingItem, seo: { ...editingItem.seo, keywords: e.target.value } })}
                                placeholder="e.g. ladakh, motorcycle tour, himalayas"
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Image (OG Image)</label>
                              <input
                                value={editingItem.seo?.ogImage || ''}
                                onChange={e => setEditingItem({ ...editingItem, seo: { ...editingItem.seo, ogImage: e.target.value } })}
                                placeholder="Leave empty to use main tour image"
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Departure dates</h4>
                              <button
                                type="button"
                                disabled={!editingItem?.id}
                                onClick={() => {
                                  if (!editingItem?.id) return;
                                  setTourDepartureValidationAttempted(false);
                                  setTourDepartureDraft({
                                    tripId: editingItem.id,
                                    startDate: '',
                                    endDate: '',
                                    slots: 10,
                                    status: 'Available',
                                  });
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  !editingItem?.id
                                    ? 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                                    : 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-sm'
                                }`}
                              >
                                Add date
                              </button>
                            </div>

                            {!editingItem?.id && (
                              <div className="text-xs text-muted-foreground">
                                Save the tour first, then add dates.
                              </div>
                            )}

                            {!!editingItem?.id && (
                              <div className="space-y-3">
                                {departures
                                  .filter(d => d.tripId === editingItem.id)
                                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                                  .map(dep => (
                                    <div key={dep.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border dark:border-dark-border bg-background/40 dark:bg-dark-background/40">
                                      <div className="min-w-0">
                                        <div className="text-xs font-black text-foreground dark:text-dark-foreground truncate">
                                          {dep.startDate} → {dep.endDate}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground">
                                          {dep.status} · {dep.slots} slots
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setTourDepartureValidationAttempted(false);
                                            setTourDepartureDraft({ ...dep });
                                          }}
                                          className="px-3 py-2 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const ok = window.confirm('Delete this date?');
                                            if (!ok) return;
                                            props.onDeleteDeparture(dep.id);
                                            showNotice('Date deleted', 'info');
                                          }}
                                          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                {departures.filter(d => d.tripId === editingItem.id).length === 0 && (
                                  <div className="text-xs text-muted-foreground">No dates yet.</div>
                                )}
                              </div>
                            )}

                            {tourDepartureDraft && (
                              <div className="mt-4 p-5 rounded-3xl border border-border dark:border-dark-border bg-card dark:bg-dark-card space-y-4">
                                {(() => {
                                  const err = getDepartureValidationError(tourDepartureDraft);
                                  if (!err || !(tourDepartureValidationAttempted || tourDepartureDirty)) return null;
                                  return (
                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-200 rounded-2xl p-4 text-xs font-bold">
                                      {err}
                                    </div>
                                  );
                                })()}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Start date</label>
                                    <input
                                      type="date"
                                      title="Departure start date"
                                      min={formatDateInput(new Date())}
                                      value={tourDepartureDraft.startDate}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), startDate: e.target.value })}
                                      data-invalid={(tourDepartureValidationAttempted || tourDepartureDirty) && !tourDepartureDraft.startDate ? 'true' : undefined}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">End date</label>
                                    <input
                                      type="date"
                                      title="Departure end date"
                                      min={(() => {
                                        const start = parseDateInput(tourDepartureDraft.startDate);
                                        const minDate = start ? addDays(start, 1) : new Date();
                                        return formatDateInput(minDate);
                                      })()}
                                      value={tourDepartureDraft.endDate}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), endDate: e.target.value })}
                                      data-invalid={(tourDepartureValidationAttempted || tourDepartureDirty) && !tourDepartureDraft.endDate ? 'true' : undefined}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slots</label>
                                    <input
                                      type="number"
                                      title="Departure slots"
                                      min={1}
                                      value={tourDepartureDraft.slots}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), slots: Number.parseInt(e.target.value, 10) || 0 })}
                                      data-invalid={(tourDepartureValidationAttempted || tourDepartureDirty) && (!Number.isFinite(Number(tourDepartureDraft.slots)) || Number(tourDepartureDraft.slots) <= 0) ? 'true' : undefined}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</label>
                                    <select
                                      title="Departure status"
                                      value={tourDepartureDraft.status}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), status: e.target.value as any })}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                                    >
                                      <option value="Available">Available</option>
                                      <option value="Limited">Limited</option>
                                      <option value="Sold Out">Sold Out</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTourDepartureValidationAttempted(true);
                                      const err = getDepartureValidationError(tourDepartureDraft);
                                      if (err) return;

                                      if (tourDepartureDraft.id) {
                                        props.onUpdateDeparture(tourDepartureDraft as Departure);
                                      } else {
                                        props.onAddDeparture(tourDepartureDraft as Omit<Departure, 'id'>);
                                      }

                                      showNotice('Date saved');
                                      setTourDepartureDraft(null);
                                      setTourDepartureValidationAttempted(false);
                                    }}
                                    className="flex-1 bg-brand-primary text-white px-6 py-4 rounded-2xl hover:bg-brand-primary/90 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm"
                                  >
                                    Save date
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTourDepartureDraft(null);
                                      setTourDepartureValidationAttempted(false);
                                    }}
                                    className="flex-1 px-6 py-4 rounded-2xl border border-border dark:border-dark-border bg-background dark:bg-dark-background hover:bg-background/60 dark:hover:bg-dark-background/60 transition-all text-[10px] font-black uppercase tracking-widest shadow-sm text-foreground dark:text-dark-foreground"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                 )}
                  {activeTab === 'DATES' && (
                    <div className="space-y-12 max-w-2xl mx-auto">
                      {(() => {
                        const err = getDepartureValidationError(editingItem);
                        if (!err) return null;
                        return (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-200 rounded-2xl p-4 text-xs font-bold">
                            {err}
                          </div>
                        );
                      })()}
                       <div className="flex flex-col gap-2 mb-8">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Tour</label>
                               <select title="Tour" data-invalid={(validationAttempted || editingDirty) && !editingItem.tripId ? 'true' : undefined} value={editingItem.tripId} onChange={e => setEditingItem({...editingItem, tripId: e.target.value})} className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground">
                              {trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                           </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-8">
                         <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Start date</label>
                              <input
                                type="date"
                                title="Start date"
                                min={formatDateInput(new Date())}
                                value={editingItem.startDate}
                                onChange={e => setEditingItem({...editingItem, startDate: e.target.value})}
                                data-invalid={(validationAttempted || editingDirty) && !editingItem.startDate ? 'true' : undefined}
                                className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                              />
                          </div>
                          <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">End date</label>
                              <input
                                type="date"
                                title="End date"
                                min={(() => {
                                  const start = parseDateInput(editingItem.startDate);
                                  const minDate = start ? addDays(start, 1) : new Date();
                                  return formatDateInput(minDate);
                                })()}
                                value={editingItem.endDate}
                                onChange={e => setEditingItem({...editingItem, endDate: e.target.value})}
                                data-invalid={(validationAttempted || editingDirty) && !editingItem.endDate ? 'true' : undefined}
                                className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                              />
                          </div>
                       </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-8">
                         <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slots</label>
                              <input title="Slots" data-invalid={(validationAttempted || editingDirty) && (!Number.isFinite(Number(editingItem.slots)) || Number(editingItem.slots) <= 0) ? 'true' : undefined} type="number" min={1} value={editingItem.slots} onChange={e => setEditingItem({...editingItem, slots: Number.parseInt(e.target.value, 10) || 0})} className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                          </div>
                         <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</label>
                              <select title="Status" value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground">
                                <option value="Available">Available</option>
                                <option value="Limited">Limited</option>
                                <option value="Sold Out">Sold Out</option>
                             </select>
                         </div>
                      </div>
                   </div>
                 )}
                 {(activeTab === 'BLOG' || activeTab === 'PAGES') && (
                    <div className="space-y-12 max-w-4xl mx-auto">
                       <div className="flex flex-col gap-2 mb-8">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Title</label>
                               <input title="Title" data-invalid={(validationAttempted || editingDirty) && !editingItem.title?.trim() ? 'true' : undefined} value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                       </div>
                       {activeTab === 'BLOG' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Author</label>
                             <input title="Author" data-invalid={(validationAttempted || editingDirty) && !editingItem.author?.trim() ? 'true' : undefined} value={editingItem.author} onChange={e => setEditingItem({...editingItem, author: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</label>
                             <input title="Date" data-invalid={(validationAttempted || editingDirty) && !editingItem.date?.trim() ? 'true' : undefined} type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input" />
                           </div>
                         </div>
                       )}
                       {activeTab === 'BLOG' && (
                         <div className="flex flex-col gap-2 mb-8">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Excerpt</label>
                           <textarea title="Excerpt" data-invalid={(validationAttempted || editingDirty) && !editingItem.excerpt?.trim() ? 'true' : undefined} value={editingItem.excerpt} onChange={e => setEditingItem({...editingItem, excerpt: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground h-28" />
                         </div>
                       )}
                       {activeTab === 'PAGES' && (
                         <>
                           <div className="flex flex-col gap-2 mb-8">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slug (URL)</label>
                             <input title="Slug (URL)" data-invalid={(validationAttempted || editingDirty) && !editingItem.slug?.trim() ? 'true' : undefined} value={editingItem.slug} onChange={e => setEditingItem({...editingItem, slug: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                           </div>
                           
                           <div className="flex items-center gap-4 mb-8 p-4 rounded-xl border border-border dark:border-dark-border bg-background/50 dark:bg-dark-background/30">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60 flex-1">Page Visibility</label>
                             <button
                               type="button"
                               onClick={() => setEditingItem({...editingItem, isVisible: !editingItem.isVisible})}
                               className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                 editingItem.isVisible 
                                   ? 'bg-brand-primary text-white shadow-lg' 
                                   : 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-slate-400'
                               }`}
                             >
                               {editingItem.isVisible ? 'VISIBLE' : 'HIDDEN'}
                             </button>
                           </div>
                           
                           {renderImageField('Page Header Image (Optional)', editingItem.imageUrl || '', url => setEditingItem({...editingItem, imageUrl: url}))}
                         </>
                       )}
                       {activeTab === 'BLOG' && renderImageField('Post image', editingItem.imageUrl, url => setEditingItem({...editingItem, imageUrl: url}), validationAttempted && !editingItem.imageUrl?.trim())}
                       <div className="flex flex-col gap-2 mb-8">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Content (Markdown)</label>
                           <textarea title="Content (Markdown)" data-invalid={(validationAttempted || editingDirty) && !editingItem.content?.trim() ? 'true' : undefined} value={editingItem.content} onChange={e => setEditingItem({...editingItem, content: e.target.value})} className="w-full p-8 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-[450px] outline-none resize-none text-sm focus:border-brand-primary shadow-sm leading-relaxed text-foreground dark:text-dark-foreground" />
                       </div>
                       
                       {activeTab === 'BLOG' && (
                         <div className="space-y-6 border-t border-border/50 pt-8">
                           <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest">SEO Settings (Optional)</h4>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Title</label>
                             <input 
                               value={editingItem.seo?.title || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, title: e.target.value }})} 
                               placeholder="Leave empty to use post title"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Description</label>
                             <textarea 
                               value={editingItem.seo?.description || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, description: e.target.value }})} 
                               placeholder="Leave empty to use excerpt"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm h-24 text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Keywords (comma separated)</label>
                             <input 
                               value={editingItem.seo?.keywords || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, keywords: e.target.value }})} 
                               placeholder="e.g. himalayan travel, motorcycle tour, ladakh"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Image (OG Image)</label>
                             <input 
                               value={editingItem.seo?.ogImage || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, ogImage: e.target.value }})} 
                               placeholder="Leave empty to use post image"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                         </div>
                       )}
                       
                       {activeTab === 'PAGES' && (
                         <div className="space-y-6 border-t border-border/50 pt-8">
                           <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest">SEO Settings (Optional)</h4>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Title</label>
                             <input 
                               value={editingItem.seo?.title || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, title: e.target.value }})} 
                               placeholder="Leave empty to use page title"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Description</label>
                             <textarea 
                               value={editingItem.seo?.description || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, description: e.target.value }})} 
                               placeholder="Description for search engines"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm h-24 text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Keywords (comma separated)</label>
                             <input 
                               value={editingItem.seo?.keywords || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, keywords: e.target.value }})} 
                               placeholder="e.g. terms and conditions, privacy policy"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">SEO Image (OG Image)</label>
                             <input 
                               value={editingItem.seo?.ogImage || ''} 
                               onChange={e => setEditingItem({...editingItem, seo: { ...editingItem.seo, ogImage: e.target.value }})} 
                               placeholder="Leave empty to use page header image"
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
                           </div>
                         </div>
                       )}
                    </div>
                 )}
                 {activeTab === 'SOCIAL' && (
                   <div className="space-y-10 max-w-3xl mx-auto">
                     {editingItem?.__type === 'instagram' && (
                       <>
                         <div className="flex flex-col gap-2">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Image URL</label>
                           <input
                             title="Image URL"
                             value={editingItem.imageUrl || ''}
                             onChange={e => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                             className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                           />
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Type</label>
                             <select
                               title="Post type"
                               value={editingItem.type || 'photo'}
                               onChange={e => setEditingItem({ ...editingItem, type: e.target.value })}
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                             >
                               <option value="photo">Photo</option>
                               <option value="reel">Reel</option>
                             </select>
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Likes</label>
                             <input
                               type="number"
                               min={0}
                               title="Likes"
                               value={editingItem.likes ?? 0}
                               onChange={e => setEditingItem({ ...editingItem, likes: Number.parseInt(e.target.value, 10) || 0 })}
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                             />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Comments</label>
                             <input
                               type="number"
                               min={0}
                               title="Comments"
                               value={editingItem.comments ?? 0}
                               onChange={e => setEditingItem({ ...editingItem, comments: Number.parseInt(e.target.value, 10) || 0 })}
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                             />
                           </div>
                         </div>
                       </>
                     )}

                     {editingItem?.__type === 'review' && (
                       <>
                         <div className="flex flex-col gap-2">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Author Name</label>
                           <input
                             title="Author name"
                             value={editingItem.authorName || ''}
                             onChange={e => setEditingItem({ ...editingItem, authorName: e.target.value })}
                             className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                           />
                         </div>
                         <div className="flex flex-col gap-2">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Review Text</label>
                           <textarea
                             title="Review text"
                             value={editingItem.text || ''}
                             onChange={e => setEditingItem({ ...editingItem, text: e.target.value })}
                             className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm h-28 text-foreground dark:text-dark-foreground"
                           />
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Rating (1-5)</label>
                             <input
                               type="number"
                               min={1}
                               max={5}
                               title="Rating (1-5)"
                               value={editingItem.rating ?? 5}
                               onChange={e => setEditingItem({ ...editingItem, rating: Number.parseInt(e.target.value, 10) || 1 })}
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                             />
                           </div>
                           <div className="flex flex-col gap-2 sm:col-span-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Profile Photo URL</label>
                             <input
                               title="Profile photo URL"
                               value={editingItem.profilePhotoUrl || ''}
                               onChange={e => setEditingItem({ ...editingItem, profilePhotoUrl: e.target.value })}
                               className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                             />
                           </div>
                         </div>
                         <div className="flex items-center gap-4">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Featured</label>
                           <button
                             type="button"
                             onClick={() => setEditingItem({ ...editingItem, isFeatured: !editingItem.isFeatured })}
                             className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                               editingItem.isFeatured ? 'bg-brand-primary text-white shadow-lg' : 'bg-slate-200 dark:bg-neutral-800 text-slate-600 dark:text-slate-400'
                             }`}
                           >
                             {editingItem.isFeatured ? 'FEATURED' : 'NOT FEATURED'}
                           </button>
                         </div>
                       </>
                     )}
                   </div>
                 )}
              </div>

              <div className="flex flex-col sm:flex-row gap-5 mt-10 border-t border-border/50 pt-10">
                 <button onClick={() => {
                    setValidationAttempted(true);
                    const err = validateEditingItem();
                    if (err) return showNotice(err, 'error');
                    if (activeTab === 'TOURS') editingItem.id ? props.onUpdateTrip(editingItem) : props.onAddTrip(editingItem);
                     if (activeTab === 'DATES') {
                       editingItem.id ? props.onUpdateDeparture(editingItem) : props.onAddDeparture(editingItem);
                     }
                    if (activeTab === 'BLOG') editingItem.id ? props.onUpdateBlogPost(editingItem) : props.onAddBlogPost(editingItem);
                    if (activeTab === 'PAGES') editingItem.id ? props.onUpdateCustomPage(editingItem) : props.onAddCustomPage(editingItem);
                    if (activeTab === 'SOCIAL') {
                      if (editingItem.__type === 'instagram') {
                        editingItem.id ? props.onUpdateInstagramPost(editingItem) : props.onAddInstagramPost(editingItem);
                      }
                      if (editingItem.__type === 'review') {
                        editingItem.id ? props.onUpdateGoogleReview(editingItem) : props.onAddGoogleReview(editingItem);
                      }
                    }
                    setEditingItem(null);
                 }} className="flex-1 adventure-gradient text-white px-10 py-6 rounded-3xl font-black tracking-widest text-[12px] shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] active:scale-95 transition-all">Apply changes</button>
                 <button onClick={() => { if (requestCloseModal()) setEditingItem(null); }} className="flex-1 bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground px-10 py-6 rounded-3xl font-black tracking-widest text-[12px] hover:bg-background/60 dark:hover:bg-dark-background/60 transition-colors border border-border dark:border-dark-border">Cancel</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        input[data-invalid="true"], textarea[data-invalid="true"], select[data-invalid="true"] { border-color: rgb(239 68 68) !important; }
        .admin-date-input { color-scheme: light; }
        .dark .admin-date-input { color-scheme: dark; }
        .dark .admin-date-input::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.9; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default AdminPage;

