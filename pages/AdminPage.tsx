
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Trip, Departure, BlogPost, GalleryPhoto, SiteContent, ItineraryQuery, CustomPage, InstagramPost, SectionConfig } from '../types';
import type { Theme } from '../App';
import { getSupabase } from '../services/supabaseClient';

interface AdminPageProps {
  trips: Trip[];
  departures: Departure[];
  blogPosts: BlogPost[];
  galleryPhotos: GalleryPhoto[];
  instagramPosts: InstagramPost[];
  googleReviews: any[];
  siteContent: SiteContent;
  itineraryQueries: ItineraryQuery[];
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
  onUpdateSiteContent: (newContent: Partial<SiteContent>) => void;
  onAddCustomPage: (page: Omit<CustomPage, 'id'>) => void;
  onUpdateCustomPage: (updatedPage: CustomPage) => void;
  onDeleteCustomPage: (pageId: string) => void;
  onLogout: () => void;
  theme: Theme;
}

type AdminTab = 'TOURS' | 'DATES' | 'LEADS' | 'BLOG' | 'PAGES' | 'VISUALS' | 'LAYOUT' | 'SETTINGS';

type DepartureDraft = Omit<Departure, 'id'> & { id?: string };

const AdminPage: React.FC<AdminPageProps> = (props) => {
  const { trips, departures, blogPosts, galleryPhotos, siteContent, itineraryQueries, customPages, onUpdateSiteContent } = props;
  const [activeTab, setActiveTab] = useState<AdminTab>('TOURS');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState<{ isOpen: boolean; onSelect: (url: string) => void }>({ isOpen: false, onSelect: () => {} });
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [adminNotice, setAdminNotice] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [captionModal, setCaptionModal] = useState<{ isOpen: boolean; photo: GalleryPhoto | null }>({ isOpen: false, photo: null });
  const [captionInput, setCaptionInput] = useState('');
  const [tourSearch, setTourSearch] = useState('');
  const [tourDestinationFilter, setTourDestinationFilter] = useState<string>('all');
  const [blogSearch, setBlogSearch] = useState('');
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [tourDepartureDraft, setTourDepartureDraft] = useState<DepartureDraft | null>(null);
  const [tourDepartureValidationAttempted, setTourDepartureValidationAttempted] = useState(false);
  const noticeTimerRef = React.useRef<number | null>(null);

  const showNotice = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setAdminNotice({ text, type });
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    // auto-clear after 2500ms
    noticeTimerRef.current = window.setTimeout(() => setAdminNotice(null), 2500);
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
        return;
      }
    } catch (err) {
      showNotice('Upload failed. Using a local image (may be large).', 'info');
    }

    const url = await readFileAsDataUrl(file);
    callback(url);
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
          <img src={value} className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'TOURS':
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
            </div>
            <div className="grid grid-cols-1 gap-4">
              {trips
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
                })
                .map(trip => (
                <div key={trip.id} className="bg-white dark:bg-neutral-900 p-4 sm:p-6 rounded-3xl border border-border dark:border-dark-border flex flex-col sm:flex-row justify-between items-center gap-4 group hover:border-brand-primary transition-all">
                  <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                    <img src={trip.imageUrl} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0" />
                    <div>
                      <h4 className="font-black uppercase tracking-tight text-base sm:text-lg italic leading-tight">{trip.title}</h4>
                      <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase">{trip.destination} • {trip.duration} DAYS</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setEditingItem(trip)} className="flex-1 sm:flex-none text-brand-primary font-black text-[10px] uppercase px-4 py-2 bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg">EDIT</button>
                    <button onClick={() => props.onDeleteTrip(trip.id)} className="flex-1 sm:flex-none text-red-500 font-black text-[10px] uppercase px-4 py-2 bg-red-500/5 hover:bg-red-50 rounded-lg">DELETE</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

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

      case 'LEADS':
        return (
          <div className="space-y-8 animate-fade-in">
            <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Leads</h3>
            <div className="grid grid-cols-1 gap-4">
              {itineraryQueries.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem]">No leads captured yet.</div>
              ) : (
                itineraryQueries.map(lead => (
                  <div key={lead.id} className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-border dark:border-dark-border flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1">{lead.tripTitle}</p>
                      <h4 className="text-lg font-black italic uppercase">{lead.name}</h4>
                      <p className="text-xs text-muted-foreground">{lead.whatsappNumber} • {new Date(lead.date).toLocaleDateString()}</p>
                    </div>
                    <a href={`https://wa.me/${lead.whatsappNumber.replace(/\D/g,'')}`} target="_blank" className="bg-[#25D366] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Reply</a>
                  </div>
                ))
              )}
            </div>
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
                  <img src={post.imageUrl} className="w-full h-40 object-cover" />
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
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Add New Visual Intel</h4>
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
                      <img src={photo.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=200')} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button onClick={() => {
                          setCaptionModal({ isOpen: true, photo });
                          setCaptionInput(photo.caption || '');
                        }} className="bg-card dark:bg-dark-card text-foreground dark:text-dark-foreground p-3 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z"/></svg>
                        </button>
                        <button onClick={() => props.onDeleteGalleryPhoto(photo.id)} className="bg-red-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform active:scale-90">
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

      case 'SETTINGS':
        return (
          <div className="space-y-12 animate-fade-in">
            <section className="space-y-12">
              <h3 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Global Site Settings</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                <div className="space-y-12">
                   <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Hero Visuals</h4>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Main Impact Title</label>
                        <input value={siteContent.heroTitle} onChange={e => onUpdateSiteContent({heroTitle: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Sub-Impact Title</label>
                        <textarea value={siteContent.heroSubtitle} onChange={e => onUpdateSiteContent({heroSubtitle: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-medium outline-none h-32 resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      {renderImageField('Hero Background Banner', siteContent.heroBgImage, url => onUpdateSiteContent({ heroBgImage: url }))}
                   </div>
                </div>

                <div className="space-y-12">
                   <div className="space-y-8">
                      <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-3 mb-8">Contact</h4>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Admin WhatsApp</label>
                        <input value={siteContent.adminWhatsappNumber} onChange={e => onUpdateSiteContent({adminWhatsappNumber: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                      <div className="flex flex-col gap-2 mb-8">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Contact email</label>
                        <input value={siteContent.contactEmail} onChange={e => onUpdateSiteContent({contactEmail: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
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
                              <img src={siteContent.logoUrl} className="max-w-full max-h-full object-contain" />
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
                        <input value={siteContent.footerTagline} onChange={e => onUpdateSiteContent({footerTagline: e.target.value})} className="w-full p-4 rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                      </div>
                   </div>
                </div>
              </div>
            </section>

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
                          <img src={(siteContent as any)[field.key]} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const menuItems: AdminTab[] = ['TOURS', 'DATES', 'LEADS', 'BLOG', 'PAGES', 'VISUALS', 'LAYOUT', 'SETTINGS'];

  const isSupabaseMode = !!props.isSupabaseMode;
  const autoSaveEnabled = props.autoSaveEnabled ?? true;
  const saveStatus = props.saveStatus ?? 'idle';
  const isDirty = saveStatus === 'dirty' || saveStatus === 'error';
  const isSaving = saveStatus === 'saving';

  const requestCloseModal = () => {
    if (isSupabaseMode && isDirty && !autoSaveEnabled && typeof window !== 'undefined') {
      const ok = window.confirm('You have unsaved changes. Close anyway?');
      if (!ok) return false;
    }
    if (isSupabaseMode && isDirty && autoSaveEnabled) {
      try {
        props.onSaveNow?.();
      } catch {}
    }
    return true;
  };

  const validateEditingItem = (): string | null => {
    if (!editingItem) return null;

    if (activeTab === 'TOURS') {
      if (!editingItem.title?.trim()) return 'Tour title is required.';
      if (!editingItem.destination?.trim()) return 'Destination is required.';
      if (!Number.isFinite(Number(editingItem.duration)) || Number(editingItem.duration) <= 0) return 'Duration must be > 0.';
      if (!editingItem.imageUrl?.trim()) return 'Tour main image is required.';
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
        <div className={`fixed top-6 right-6 z-[999] px-4 py-2 rounded-md shadow-lg ${adminNotice.type === 'success' ? 'bg-emerald-600 text-white' : adminNotice.type === 'info' ? 'bg-slate-700 text-white' : 'bg-red-600 text-white'}`}>
          {adminNotice.text}
        </div>
      )}
      {/* Gallery Picker Modal - Higher Z-Index */}
      {isGalleryPickerOpen.isOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl h-[85vh] rounded-[3rem] border border-border dark:border-dark-border flex flex-col overflow-hidden shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Choose from Gallery</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Select an existing photo for your content</p>
              </div>
              <button onClick={() => setIsGalleryPickerOpen({ isOpen: false, onSelect: () => {} })} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800 text-2xl font-black transition-transform hover:rotate-90">×</button>
            </div>
            <div className="flex-grow overflow-y-auto p-8 no-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {galleryPhotos.map(photo => (
                  <button 
                    key={photo.id} 
                    onClick={() => isGalleryPickerOpen.onSelect(photo.imageUrl)}
                    className="aspect-square rounded-3xl overflow-hidden border-4 border-transparent hover:border-brand-primary transition-all group relative shadow-md"
                  >
                    <img src={photo.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
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
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-2xl p-6 shadow-2xl border border-border pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black">Edit caption for this photo</h3>
              <button onClick={() => setCaptionModal({ isOpen: false, photo: null })} className="text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-800">×</button>
            </div>
            {captionModal.photo && (
              <div className="space-y-4">
                <div className="w-full h-52 rounded-md overflow-hidden border border-border">
                  <img src={captionModal.photo.imageUrl} alt={captionModal.photo.caption || 'Gallery photo'} className="w-full h-full object-cover" />
                </div>
                <input autoFocus value={captionInput} onChange={e => setCaptionInput(e.target.value)} placeholder="Caption" className="w-full p-3 rounded-xl border border-border bg-background dark:bg-dark-background outline-none text-foreground dark:text-dark-foreground" />
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
      <div className="lg:hidden sticky top-0 z-[200] bg-card dark:bg-dark-card backdrop-blur-xl border-b border-border dark:border-dark-border px-6 py-5 flex items-center justify-between shadow-md">
         <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1">ADMIN</span>
            <span className="text-xl font-black italic tracking-tighter uppercase leading-none">{activeTab}</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMobileMenuOpen ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:scale-[1.05] active:scale-95'}`}>{isMobileMenuOpen ? 'Close' : 'Menu'}</button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[190] bg-black/95 backdrop-blur-2xl pt-[100px] p-6 animate-fade-in overflow-y-auto">
           <div className="space-y-3">
              {menuItems.map(tab => (
                <button key={tab} onClick={() => { if (editingItem && !requestCloseModal()) return; setActiveTab(tab); setEditingItem(null); setIsMobileMenuOpen(false); }} className={`w-full text-left px-8 py-6 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-brand-primary text-white shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{tab}</button>
              ))}
              <div className="h-px bg-white/10 my-4"></div>
              <button onClick={props.onLogout} className="w-full text-left px-8 py-6 rounded-2xl text-[12px] font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all">Logout</button>
           </div>
        </div>
      )}

      <div className="w-full px-6 py-10 lg:py-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28 bg-card dark:bg-dark-card rounded-[3rem] border border-border dark:border-dark-border shadow-adventure-dark overflow-hidden flex flex-col">
              <div className="p-10 text-center border-b border-border/50 dark:border-dark-border/50 bg-background/60 dark:bg-dark-background/20">
                <h2 className="text-2xl font-black font-display uppercase italic tracking-tighter mb-1">Admin</h2>
                <p className="text-[9px] font-black opacity-30 tracking-[0.3em] uppercase">Control Center</p>
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

          <main className="flex-grow w-full bg-card dark:bg-dark-card rounded-[3rem] lg:rounded-[4rem] p-8 sm:p-12 lg:p-16 border border-border dark:border-dark-border shadow-adventure-dark min-h-[700px]">
            {isSupabaseMode && (
              <div className="mb-10 rounded-[2rem] border border-border dark:border-dark-border bg-card/90 dark:bg-dark-card/80 backdrop-blur-md p-6 flex flex-col md:flex-row gap-6 md:items-center md:justify-between sticky top-24 lg:top-6 z-[300] shadow-lg">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Website Publishing</div>
                  <div className="text-sm font-black">
                    {saveStatus === 'saving'
                      ? 'Saving to Supabase…'
                      : saveStatus === 'saved'
                        ? 'Saved'
                        : saveStatus === 'error'
                          ? 'Save failed (check Console)'
                          : isDirty
                            ? 'Unsaved changes'
                            : 'No pending changes'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Changes affect tours, blog, pages, visuals and settings.
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                  <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => props.onToggleAutoSave?.(e.target.checked)}
                      className="accent-brand-primary w-4 h-4"
                    />
                    Auto-save
                  </label>
                  <button
                    onClick={() => props.onSaveNow?.()}
                    disabled={!isDirty || isSaving}
                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      !isDirty || isSaving
                        ? 'bg-slate-200 dark:bg-neutral-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-brand-primary text-white shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isSaving ? 'Saving…' : 'Save now'}
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
        <div className="fixed inset-0 z-[5000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white dark:bg-neutral-900 w-full max-w-5xl p-6 sm:p-10 lg:p-16 rounded-[2.5rem] sm:rounded-[4rem] border border-border dark:border-dark-border relative animate-fade-up shadow-2xl max-h-[92vh] flex flex-col">
              <button onClick={() => { if (requestCloseModal()) setEditingItem(null); }} className="absolute top-4 right-4 sm:top-10 sm:right-10 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-background dark:bg-dark-background hover:bg-red-500 hover:text-white transition-all text-2xl sm:text-3xl font-black z-[10] active:scale-90">×</button>
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
              
              <div className="flex-grow overflow-y-auto pr-8 no-scrollbar pb-10">
                 {activeTab === 'TOURS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                       <div className="space-y-10">
                          <h4 className="text-xs font-black uppercase text-brand-primary tracking-widest border-b border-border/50 pb-4 mb-8">Basic info</h4>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Title</label>
                              <input
                                data-invalid={validationAttempted && !editingItem.title?.trim() ? 'true' : undefined}
                                value={editingItem.title}
                                onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Destination</label>
                              <input
                                data-invalid={validationAttempted && !editingItem.destination?.trim() ? 'true' : undefined}
                                value={editingItem.destination}
                                onChange={e => setEditingItem({...editingItem, destination: e.target.value})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>
                          <div className="flex flex-col gap-2 mb-6">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Short description</label>
                              <textarea
                                value={editingItem.shortDescription}
                                onChange={e => setEditingItem({...editingItem, shortDescription: e.target.value})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground h-24"
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-8 mb-6">
                             <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Duration (days)</label>
                                 <input
                                   data-invalid={validationAttempted && (!Number.isFinite(Number(editingItem.duration)) || Number(editingItem.duration) <= 0) ? 'true' : undefined}
                                   type="number"
                                   value={editingItem.duration}
                                   onChange={e => setEditingItem({...editingItem, duration: parseInt(e.target.value)})}
                                   className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                                 />
                             </div>
                             <div className="flex flex-col gap-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Difficulty</label>
                                 <select value={editingItem.difficulty} onChange={e => setEditingItem({...editingItem, difficulty: e.target.value})} className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground">
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
                                value={editingItem.price}
                                onChange={e => setEditingItem({...editingItem, price: Number.parseFloat(e.target.value) || 0})}
                                className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                              />
                          </div>
                          {renderImageField('Mission Master Banner', editingItem.imageUrl, url => {
                            const normalized = url?.trim();
                            const prevGallery = Array.isArray(editingItem?.gallery) ? editingItem.gallery : [];
                            const already = normalized && prevGallery.some((p: any) => p.imageUrl === normalized);
                            setEditingItem(prev => {
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
                          }, validationAttempted && !editingItem.imageUrl?.trim())}

                          <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary">Gallery Images</h4>
                            <div className="flex items-center gap-3 flex-wrap">
                              {(editingItem.gallery || []).map((g: any, idx: number) => (
                                <div key={(g && g.id) || idx} className="flex flex-col items-start gap-2">
                                  <div className="relative w-28 h-16 rounded-md overflow-hidden border border-border">
                                    <img src={g.imageUrl} className="w-full h-full object-cover" />
                                    <button onClick={() => setEditingItem({...editingItem, gallery: (editingItem.gallery || []).filter((_: any, i: number) => i !== idx)})} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">×</button>
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
                              <textarea value={editingItem.longDescription} onChange={e => setEditingItem({...editingItem, longDescription: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-56 outline-none resize-none text-sm focus:border-brand-primary shadow-sm leading-relaxed text-foreground dark:text-dark-foreground" />
                          </div>
                          <div className="flex flex-col gap-2 mb-6">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Itinerary (JSON)</label>
                             <textarea 
                               value={JSON.stringify(editingItem.itinerary, null, 2)} 
                               onChange={e => { try { setEditingItem({...editingItem, itinerary: JSON.parse(e.target.value)}); } catch(err) {} }} 
                               className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-mono text-[11px] h-56 outline-none resize-none focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" 
                             />
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
                                  if (!err || !tourDepartureValidationAttempted) return null;
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
                                      min={formatDateInput(new Date())}
                                      value={tourDepartureDraft.startDate}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), startDate: e.target.value })}
                                      data-invalid={tourDepartureValidationAttempted && !tourDepartureDraft.startDate ? 'true' : undefined}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">End date</label>
                                    <input
                                      type="date"
                                      min={(() => {
                                        const start = parseDateInput(tourDepartureDraft.startDate);
                                        const minDate = start ? addDays(start, 1) : new Date();
                                        return formatDateInput(minDate);
                                      })()}
                                      value={tourDepartureDraft.endDate}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), endDate: e.target.value })}
                                      data-invalid={tourDepartureValidationAttempted && !tourDepartureDraft.endDate ? 'true' : undefined}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slots</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={tourDepartureDraft.slots}
                                      onChange={e => setTourDepartureDraft({ ...(tourDepartureDraft as any), slots: Number.parseInt(e.target.value, 10) || 0 })}
                                      data-invalid={tourDepartureValidationAttempted && (!Number.isFinite(Number(tourDepartureDraft.slots)) || Number(tourDepartureDraft.slots) <= 0) ? 'true' : undefined}
                                      className="w-full p-4 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</label>
                                    <select
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
                           <select data-invalid={validationAttempted && !editingItem.tripId ? 'true' : undefined} value={editingItem.tripId} onChange={e => setEditingItem({...editingItem, tripId: e.target.value})} className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground">
                              {trips.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                           </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-8">
                         <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Start date</label>
                              <input
                                type="date"
                                min={formatDateInput(new Date())}
                                value={editingItem.startDate}
                                onChange={e => setEditingItem({...editingItem, startDate: e.target.value})}
                                data-invalid={validationAttempted && !editingItem.startDate ? 'true' : undefined}
                                className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                              />
                          </div>
                          <div className="flex flex-col gap-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-60">End date</label>
                              <input
                                type="date"
                                min={(() => {
                                  const start = parseDateInput(editingItem.startDate);
                                  const minDate = start ? addDays(start, 1) : new Date();
                                  return formatDateInput(minDate);
                                })()}
                                value={editingItem.endDate}
                                onChange={e => setEditingItem({...editingItem, endDate: e.target.value})}
                                data-invalid={validationAttempted && !editingItem.endDate ? 'true' : undefined}
                                className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input"
                              />
                          </div>
                       </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 mb-8">
                         <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slots</label>
                              <input data-invalid={validationAttempted && (!Number.isFinite(Number(editingItem.slots)) || Number(editingItem.slots) <= 0) ? 'true' : undefined} type="number" min={1} value={editingItem.slots} onChange={e => setEditingItem({...editingItem, slots: Number.parseInt(e.target.value, 10) || 0})} className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                          </div>
                         <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Status</label>
                             <select value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})} className="w-full p-5 rounded-xl border border-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground">
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
                           <input data-invalid={validationAttempted && !editingItem.title?.trim() ? 'true' : undefined} value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                       </div>
                       {activeTab === 'BLOG' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Author</label>
                             <input data-invalid={validationAttempted && !editingItem.author?.trim() ? 'true' : undefined} value={editingItem.author} onChange={e => setEditingItem({...editingItem, author: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                           </div>
                           <div className="flex flex-col gap-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</label>
                             <input data-invalid={validationAttempted && !editingItem.date?.trim() ? 'true' : undefined} type="date" value={editingItem.date} onChange={e => setEditingItem({...editingItem, date: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground admin-date-input" />
                           </div>
                         </div>
                       )}
                       {activeTab === 'BLOG' && (
                         <div className="flex flex-col gap-2 mb-8">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Excerpt</label>
                           <textarea data-invalid={validationAttempted && !editingItem.excerpt?.trim() ? 'true' : undefined} value={editingItem.excerpt} onChange={e => setEditingItem({...editingItem, excerpt: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium outline-none resize-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground h-28" />
                         </div>
                       )}
                       {activeTab === 'PAGES' && (
                         <div className="flex flex-col gap-2 mb-8">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Slug (URL)</label>
                             <input data-invalid={validationAttempted && !editingItem.slug?.trim() ? 'true' : undefined} value={editingItem.slug} onChange={e => setEditingItem({...editingItem, slug: e.target.value})} className="w-full p-5 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-bold outline-none text-sm focus:border-brand-primary shadow-sm text-foreground dark:text-dark-foreground" />
                         </div>
                       )}
                       {activeTab === 'BLOG' && renderImageField('Post image', editingItem.imageUrl, url => setEditingItem({...editingItem, imageUrl: url}), validationAttempted && !editingItem.imageUrl?.trim())}
                       <div className="flex flex-col gap-2 mb-8">
                           <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Content (Markdown)</label>
                           <textarea data-invalid={validationAttempted && !editingItem.content?.trim() ? 'true' : undefined} value={editingItem.content} onChange={e => setEditingItem({...editingItem, content: e.target.value})} className="w-full p-8 rounded-xl border border-border dark:border-dark-border bg-background dark:bg-dark-background font-medium h-[450px] outline-none resize-none text-sm focus:border-brand-primary shadow-sm leading-relaxed text-foreground dark:text-dark-foreground" />
                       </div>
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
