
import React, { useState, useMemo } from 'react';
import type { Trip, Departure, BlogPost, GalleryPhoto, InstagramPost, GoogleReview, SiteContent, ItineraryQuery } from '../types';
import TripCard from '../components/TripCard';
import BlogPostCard from '../components/BlogPostCard';
import SearchAndFilter from '../components/SearchAndFilter';
import SEOHead from '../components/SEOHead';

interface HomePageProps {
  trips: Trip[];
  departures: Departure[];
  onSelectTrip: (trip: Trip) => void;
  onBookNow: (trip: Trip) => void;
  blogPosts: BlogPost[];
  galleryPhotos: GalleryPhoto[];
  instagramPosts: InstagramPost[];
  googleReviews: GoogleReview[];
  siteContent: SiteContent;
  onSelectBlogPost: (post: BlogPost) => void;
  onNavigateGallery: () => void;
  onNavigateCustomize: () => void;
  initialDestinationFilter: string | null;
  onClearInitialFilter: () => void;
  onAddInquiry: (query: Omit<ItineraryQuery, 'id' | 'date'>) => void;
  onNavigateToTours: (destination: string | null) => void;
}

const HomePage: React.FC<HomePageProps> = (props) => {
  const { trips, departures, siteContent, onSelectTrip, onBookNow, blogPosts, googleReviews, galleryPhotos, instagramPosts, onAddInquiry } = props;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [diffFilter, setDifficultyFilter] = useState('all');

  const [depDestFilter, setDepDestFilter] = useState('all');
  const [depMonthFilter, setDepMonthFilter] = useState('all');

  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      const matchSearch = trip.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDest = destFilter === 'all' || trip.destination === destFilter;
      const matchDiff = diffFilter === 'all' || trip.difficulty === diffFilter;
      let matchDur = true;
      if (durationFilter === '1-7') matchDur = trip.duration <= 7;
      else if (durationFilter === '8-14') matchDur = trip.duration >= 8 && trip.duration <= 14;
      else if (durationFilter === '15-999') matchDur = trip.duration >= 15;
      return matchSearch && matchDest && matchDiff && matchDur;
    });
  }, [trips, searchTerm, destFilter, durationFilter, diffFilter]);

  const row1Trips = useMemo(() => filteredTrips.filter((_, i) => i % 2 === 0), [filteredTrips]);
  const row2Trips = useMemo(() => filteredTrips.filter((_, i) => i % 2 !== 0), [filteredTrips]);

  const filteredDepartures = useMemo(() => {
    let deps = [...departures].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return deps.filter(dep => {
      const trip = trips.find(t => t.id === dep.tripId);
      if (!trip) return false;
      const matchDest = depDestFilter === 'all' || trip.destination === depDestFilter;
      const matchMonth = depMonthFilter === 'all' || new Date(dep.startDate).getMonth().toString() === depMonthFilter;
      return matchDest && matchMonth;
    });
  }, [departures, trips, depDestFilter, depMonthFilter]);

  const handleInquiry = (trip: Trip, departure: Departure) => {
    onAddInquiry({
        tripId: trip.id,
        tripTitle: trip.title,
        name: 'Web User Inquiry',
        whatsappNumber: 'Awaiting Response',
        planningTime: `${new Date(departure.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} Expedition`
    });

    const adminPhone = siteContent.adminWhatsappNumber.replace(/\D/g, '');
    const message = `REVRON EXPEDITION INQUIRY:
Tour Name: ${trip.title}
Departure Date: ${new Date(departure.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
Status: ${departure.status.toUpperCase()}

I'm interested in joining this mission. Please send pricing and briefing docs.`;
    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderSection = (sectionId: string) => {
    const sectionConfig = siteContent.homePageLayout.find(s => s.id === sectionId);
    if (!sectionConfig || sectionConfig.isVisible === false) return null;

    const activeBgStyle = (url?: string, opacity: number = 0.95) => {
        if (!url) return {};
        const isDark = document.documentElement.classList.contains('dark');
        const overlayOpacity = 1 - opacity;
        return {
          backgroundImage: `linear-gradient(${isDark ? `rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${overlayOpacity})` : `rgba(255,255,255,${overlayOpacity}), rgba(255,255,255,${overlayOpacity})`}), url(${url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        };
    };

    switch (sectionId) {
      case 'HERO':
        return (
          <section key="hero" className="relative h-[85vh] flex items-center overflow-hidden">
            <div className="absolute inset-0">
               <img src={siteContent.heroBgImage || "https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=2000"} className="w-full h-full object-cover scale-105" />
               <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            </div>
            <div className="container mx-auto px-6 relative z-10">
              <div className="max-w-3xl">
                <span className="inline-block bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.5em] px-5 py-2 rounded-full mb-6 shadow-xl">Est. 2024 • Chushul Native</span>
                <h1 className="text-6xl md:text-8xl font-black font-display text-white leading-none italic tracking-tighter mb-6">{siteContent.heroTitle}</h1>
                <p className="text-lg md:text-xl text-white/80 font-medium mb-10 max-w-xl leading-relaxed">{siteContent.heroSubtitle}</p>
                <div className="flex flex-wrap gap-4">
                   <button onClick={() => document.getElementById('adventures')?.scrollIntoView({behavior:'smooth'})} className="adventure-gradient text-white font-black uppercase text-xs tracking-widest px-10 py-5 rounded-2xl shadow-adventure">Browse Tours</button>
                   <button onClick={props.onNavigateCustomize} className="bg-white/10 backdrop-blur-md border border-white/30 text-white font-black uppercase text-xs tracking-widest px-10 py-5 rounded-2xl">Plan a Custom Trip</button>
                </div>
              </div>
            </div>
          </section>
        );
      case 'ADVENTURES':
        return (
          <section key="adventures" id="adventures" className="py-24 overflow-hidden" style={activeBgStyle(siteContent.adventuresBgImage, sectionConfig.backgroundOpacity)}>
            <div className="container mx-auto px-6 mb-16">
                <div className="flex flex-col items-center text-center gap-10">
                    <div className="max-w-2xl">
                        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">Upcoming Tours</h2>
                        <h3 className="text-5xl md:text-7xl font-black font-display italic tracking-tighter uppercase leading-none">{siteContent.adventuresTitle}</h3>
                    </div>
                    <div className="w-full max-w-3xl">
                      <SearchAndFilter searchTerm={searchTerm} setSearchTerm={setSearchTerm} destinationFilter={destFilter} setDestinationFilter={setDestFilter} durationFilter={durationFilter} setDurationFilter={setDurationFilter} difficultyFilter={diffFilter} setDifficultyFilter={setDifficultyFilter} destinations={[...new Set(trips.map(t => t.destination))]} onClearFilters={() => { setSearchTerm(''); setDestFilter('all'); setDurationFilter('all'); setDifficultyFilter('all'); }} />
                    </div>
                </div>
            </div>

            <div className="space-y-12">
              <div className="relative w-full group/row1">
                <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-8 px-6 pb-4">
                  <div className="flex animate-marquee-left-infinite whitespace-nowrap gap-8 group-hover/row1:[animation-play-state:paused]">
                    {[...row1Trips, ...row1Trips, ...row1Trips].map((trip, idx) => (
                      <div key={`${trip.id}-${idx}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                        <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative w-full group/row2">
                <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-8 px-6 pb-4">
                  <div className="flex animate-marquee-right-infinite whitespace-nowrap gap-8 group-hover/row2:[animation-play-state:paused]">
                    {[...row2Trips, ...row2Trips, ...row2Trips].map((trip, idx) => (
                      <div key={`${trip.id}-${idx}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                        <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {filteredTrips.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No active missions matching your search.</p>
                </div>
            )}

            {/* View All Trips CTA positioned above departures */}
            <div className="container mx-auto px-6 mt-16 flex justify-center">
                <button 
                    onClick={() => props.onNavigateToTours(null)}
                    className="adventure-gradient text-white px-12 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                    View All Tours
                </button>
            </div>
          </section>
        );
      case 'DEPARTURES':
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const departureDestinations = [...new Set(trips.map(t => t.destination))];
        
        return (
          <section key="departures" id="departures" className="py-24 bg-slate-50 dark:bg-black/20" style={activeBgStyle(siteContent.departuresBgImage, sectionConfig.backgroundOpacity)}>
            <div className="container mx-auto px-6 max-w-6xl">
              <div className="text-center mb-16">
                <h3 className="text-5xl md:text-6xl font-black font-display text-[#112340] dark:text-foreground italic tracking-tight">{siteContent.departuresTitle}</h3>
              </div>

                <div className="bg-white dark:bg-neutral-900 p-4 md:p-8 rounded-[1.5rem] shadow-xl border border-border dark:border-dark-border mb-10 flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-5/12">
                  <label htmlFor="departuresDestination" className="sr-only">Destination</label>
                  <select id="departuresDestination" name="destination" value={depDestFilter} onChange={e => setDepDestFilter(e.target.value)} className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-black text-foreground dark:text-dark-foreground font-bold outline-none appearance-none shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                    <option value="all">All Destinations</option>
                    {departureDestinations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="w-full md:w-5/12">
                   <label htmlFor="departuresMonth" className="sr-only">Month</label>
                   <select id="departuresMonth" name="month" value={depMonthFilter} onChange={e => setDepMonthFilter(e.target.value)} className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-black text-foreground dark:text-dark-foreground font-bold outline-none appearance-none shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                    <option value="all">All Months</option>
                    {months.map((m, i) => <option key={m} value={i.toString()}>{m}</option>)}
                  </select>
                </div>
                <div className="w-full md:w-2/12 flex justify-center md:justify-end">
                   <button onClick={() => { setDepDestFilter('all'); setDepMonthFilter('all'); }} className="text-brand-primary font-black uppercase text-[11px] tracking-widest hover:text-brand-primary-dark transition-colors">Clear Filters</button>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl border border-border/50 dark:border-dark-border/50 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-border/50">
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">TOUR NAME</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">DATE</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280] text-center">SLOTS</th>
                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">STATUS</th>
                        <th className="px-8 py-6"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 dark:divide-dark-border/30">
                      {filteredDepartures.map(departure => {
                        const dTrip = trips.find(t => t.id === departure.tripId);
                        if (!dTrip) return null;
                        const slotColor = departure.slots === 0 ? 'text-red-500' : departure.slots <= 4 ? 'text-orange-500' : 'text-green-600';
                        const statusColors = {
                          Available: 'bg-green-50 text-green-700 border-green-100',
                          Limited: 'bg-orange-50 text-orange-700 border-orange-100',
                          'Sold Out': 'bg-red-50 text-red-700 border-red-100'
                        };
                        const statusDotColors = {
                            Available: 'bg-green-500',
                            Limited: 'bg-orange-500',
                            'Sold Out': 'bg-red-500'
                        };
                        return (
                          <tr key={departure.id} className="group hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-all">
                            <td className="px-8 py-8">
                                <h4 className="font-black text-[#112340] dark:text-foreground text-[15px] tracking-tight italic">{dTrip.title}</h4>
                            </td>
                            <td className="px-8 py-8 whitespace-nowrap">
                                <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">
                                  {new Date(departure.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - 
                                  {new Date(departure.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </td>
                            <td className="px-8 py-8 text-center">
                                <span className={`text-base font-black ${slotColor}`}>{departure.slots}</span>
                            </td>
                            <td className="px-8 py-8 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColors[departure.status as keyof typeof statusColors]}`}>
                                   <span className={`w-1.5 h-1.5 rounded-full ${statusDotColors[departure.status as keyof typeof statusDotColors]}`}></span>
                                   <span className="text-[10px] font-black uppercase tracking-widest">{departure.status}</span>
                                </div>
                            </td>
                            <td className="px-8 py-8 text-right">
                                <button onClick={() => handleInquiry(dTrip, departure)} className={`text-[13px] font-black uppercase tracking-widest transition-all ${departure.status === 'Sold Out' ? 'text-slate-300 pointer-events-none' : 'text-brand-primary hover:text-brand-primary-dark hover:translate-x-1'}`}>
                                    Inquire {departure.status !== 'Sold Out' && 'Now'}
                                </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        );
      case 'CUSTOMIZE':
        return (
          <section key="customize" className="py-16 container mx-auto px-6">
            <div className="adventure-gradient rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
               <div className="relative z-10 max-w-xl"><h3 className="text-3xl md:text-5xl font-black font-display text-white italic tracking-tighter mb-4">{siteContent.customizeTitle}</h3><p className="text-white/80 font-medium">{siteContent.customizeSubtitle}</p></div>
               <button onClick={props.onNavigateCustomize} className="relative z-10 bg-white text-brand-primary font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl">Initialize Custom Build</button>
            </div>
          </section>
        );
      case 'WHY_CHOOSE_US':
        return (
          <section key="why_choose" className="py-24" style={activeBgStyle(siteContent.whyChooseUsBgImage, sectionConfig.backgroundOpacity)}>
            <div className="container mx-auto px-6 text-center mb-16">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">The Revrom Edge</h2>
                <h3 className="text-4xl font-black font-display italic tracking-tight">Why We Lead the Pack</h3>
            </div>
            <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
               {[
                   { title: 'Local Expertise', desc: 'We know these mountains inside out.', icon: '🏔️' },
                   { title: 'Safety First', desc: 'Support and backup on every trip.', icon: '🛡️' },
                   { title: 'Elite Fleet', desc: 'Prepped Royal Enfields tuned for high-altitude performance.', icon: '🏍️' },
               ].map(perk => (
                <div key={perk.title} className="text-center p-8 rounded-[2rem] bg-slate-50 dark:bg-neutral-900 border border-border dark:border-dark-border hover:border-brand-primary transition-all">
                    <div className="text-5xl mb-6">{perk.icon}</div>
                    <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">{perk.title}</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">{perk.desc}</p>
                </div>
               ))}
            </div>
          </section>
        );
      case 'ROOTS':
        return (
          <section key="roots" className="py-24 relative overflow-hidden bg-black" style={activeBgStyle(siteContent.rootsBgImage, sectionConfig.backgroundOpacity)}>
            <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
               <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Born in Chushul</h2>
                  <h3 className="text-4xl md:text-6xl font-black font-display text-white italic leading-tight mb-8">{siteContent.rootsTitle}</h3>
                  <p className="text-lg text-white/60 leading-relaxed mb-8">{siteContent.rootsBody}</p>
                  <button onClick={() => props.onSelectBlogPost(blogPosts[0])} className="text-brand-primary font-black uppercase tracking-[0.3em] text-xs hover:gap-4 flex items-center gap-2 transition-all">{siteContent.rootsButton} <span className="text-xl">→</span></button>
               </div>
               <div className="relative"><img src="https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=1200" className="rounded-[3rem] relative z-10 shadow-2xl grayscale" /></div>
            </div>
          </section>
        );
      case 'REVIEWS':
        return (
          <section key="reviews" className="py-24 border-y border-border dark:border-dark-border overflow-hidden" style={activeBgStyle(siteContent.reviewsBgImage, sectionConfig.backgroundOpacity)}>
             <div className="container mx-auto px-6">
                <div className="text-center mb-16"><h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">Rider Feedback</h2><h3 className="text-4xl font-black font-display italic tracking-tight">Debriefings from the Road</h3></div>
                <div className="flex gap-8 overflow-x-auto pb-12 no-scrollbar px-4 -mx-4 snap-x snap-mandatory">
                   {googleReviews.map(review => (
                      <div key={review.id} className="min-w-[320px] md:min-w-[450px] bg-white dark:bg-neutral-900 p-8 rounded-[2rem] shadow-sm border flex flex-col justify-between hover:shadow-xl transition-all snap-center">
                         <p className="text-lg font-medium italic mb-8 opacity-80 leading-relaxed">"{review.text}"</p>
                         <div className="flex items-center gap-4">
                            <img src={review.profilePhotoUrl} className="w-12 h-12 rounded-full ring-2 ring-brand-primary" />
                            <div><h4 className="font-black text-sm uppercase tracking-tight">{review.authorName}</h4></div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </section>
        );
      case 'BLOG':
        return (
          <section key="blog" className="py-24 overflow-hidden" style={activeBgStyle(siteContent.blogBgImage, sectionConfig.backgroundOpacity)}>
             <div className="container mx-auto px-6 mb-16">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">Contact</h2>
                <h3 className="text-4xl font-black font-display italic tracking-tight">{siteContent.blogTitle}</h3>
             </div>
             <div className="w-full">
                <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-8 px-6 pb-8">
                  <div className="flex animate-marquee-left-infinite whitespace-nowrap gap-8 hover:[animation-play-state:paused]">
                    {[...blogPosts, ...blogPosts].map((post, idx) => (
                        <div key={`${post.id}-${idx}`} className="w-[300px] md:w-[400px] flex-shrink-0 snap-center">
                            <BlogPostCard post={post} onSelectPost={props.onSelectBlogPost} />
                        </div>
                    ))}
                  </div>
                </div>
             </div>
          </section>
        );
      case 'GALLERY':
        return (
          <section key="gallery" className="py-24 overflow-hidden" style={activeBgStyle(siteContent.galleryBgImage, sectionConfig.backgroundOpacity)}>
             <div className="container mx-auto px-6 mb-12">
                <div className="flex justify-between items-end">
                    <div><h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">Gallery</h2><h3 className="text-4xl font-black font-display italic tracking-tight">{siteContent.galleryTitle}</h3></div>
                    <button onClick={props.onNavigateGallery} className="text-xs font-black uppercase tracking-widest hover:text-brand-primary">Open Archive &rarr;</button>
                </div>
            </div>
            <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 px-6 pb-4">
              <div className="flex animate-marquee-right-infinite whitespace-nowrap gap-4 hover:[animation-play-state:paused]">
                {[...galleryPhotos, ...galleryPhotos].map((photo, idx) => (
                    <div key={`${photo.id}-${idx}`} className="relative group overflow-hidden rounded-3xl h-[400px] w-[300px] flex-shrink-0 snap-center shadow-lg border border-border/10">
                        <img src={photo.imageUrl} alt={photo.caption} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8"><p className="text-white text-xs font-black uppercase tracking-widest leading-relaxed">{photo.caption}</p></div>
                    </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'INSTAGRAM':
        return (
          <section key="instagram" className="py-24 overflow-hidden" style={activeBgStyle(siteContent.instagramBgImage, sectionConfig.backgroundOpacity)}>
            <div className="container mx-auto px-6 text-center mb-16">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">Live Feed</h2>
              <h3 className="text-4xl font-black font-display italic tracking-tight mb-4">{siteContent.instagramTitle}</h3>
              <a href={siteContent.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-brand-primary font-black uppercase tracking-[0.3em] text-[10px] inline-block hover:underline">{siteContent.instagramSubtitle}</a>
            </div>
            <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 px-6 pb-12">
               <div className="flex animate-marquee-left-infinite whitespace-nowrap gap-6 hover:[animation-play-state:paused]">
                {instagramPosts.concat(instagramPosts).map((post, idx) => (
                  <a key={`${post.id}-${idx}`} href={siteContent.instagramUrl} target="_blank" rel="noopener noreferrer" className="aspect-square w-[250px] md:w-[320px] rounded-[2.5rem] overflow-hidden relative group flex-shrink-0 snap-center shadow-2xl">
                    <img src={post.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <div className="flex gap-4">
                          <span className="text-white font-black text-xs">❤️ {post.likes}</span>
                          <span className="text-white font-black text-xs">💬 {post.comments}</span>
                       </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-background dark:bg-dark-background">
      <SEOHead title={siteContent.globalSeo?.title} description={siteContent.globalSeo?.description} keywords={siteContent.globalSeo?.keywords} />
      {siteContent.homePageLayout.map(section => renderSection(section.id))}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left-infinite {
          display: flex;
          width: max-content;
          animation: marquee-left 60s linear infinite;
        }
        .animate-marquee-right-infinite {
          display: flex;
          width: max-content;
          animation: marquee-right 60s linear infinite;
        }
        @media (max-width: 768px) {
          .animate-marquee-left-infinite, .animate-marquee-right-infinite {
            animation-duration: 90s;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
