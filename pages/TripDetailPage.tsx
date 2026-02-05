
import React, { useMemo, useState, useCallback } from 'react';
import type { Trip, ItineraryDay } from '../types';
import type { Theme } from '../App';
import TripRouteMap from '../components/TripRouteMap';
import SEOHead from '../components/SEOHead';

interface TripDetailPageProps {
  trip: Trip;
  onBookNow: (trip: Trip) => void;
  onBack: () => void;
  theme: Theme;
}

const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

const XCircleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const ChevronLeftIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 1 1 1.06 1.06L9.31 12l6.97 6.97a.75.75 0 1 1-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
    </svg>
);

const ChevronRightIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 0 1 1.06-1.06l7.5 7.5z" clipRule="evenodd" />
    </svg>
);

const PlusIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const MinusIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
    </svg>
);

const ItineraryDayAccordion: React.FC<{
  item: ItineraryDay;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ item, isOpen, onToggle }) => {
  return (
    <div className={`border border-border dark:border-dark-border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'ring-2 ring-brand-primary/20 bg-brand-primary/[0.02]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}>
        <button 
            onClick={onToggle}
            className="w-full flex items-center justify-between p-5 sm:p-8 md:p-10 text-left outline-none transition-colors hover:bg-slate-100/50 dark:hover:bg-white/5 active:bg-slate-200/50 dark:active:bg-white/10"
        >
            <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                <span className={`flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-[9px] sm:text-[11px] md:text-sm font-black transition-all ${isOpen ? 'bg-brand-primary text-white shadow-lg scale-105' : 'bg-slate-100 dark:bg-neutral-800 text-muted-foreground'}`}>
                    DAY {item.day}
                </span>
                <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight italic leading-snug flex-1">{item.title}</h3>
            </div>
            {isOpen ? <MinusIcon className="w-6 h-6 sm:w-7 sm:h-7 text-brand-primary flex-shrink-0" /> : <PlusIcon className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground opacity-40 flex-shrink-0" />}
        </button>
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
            <div className="px-6 md:px-8 pb-8 pt-4 pl-16 sm:pl-[4.5rem] md:pl-[5.5rem] text-[13px] sm:text-sm md:text-base text-muted-foreground dark:text-dark-muted-foreground leading-relaxed border-t border-brand-primary/5 italic">
                {item.description}
            </div>
        </div>
    </div>
  );
};

const TripDetailPage: React.FC<TripDetailPageProps> = ({ trip, onBookNow, onBack, theme }) => {
  const gallery = Array.isArray(trip.gallery) ? trip.gallery : [];
  const galleryCount = gallery.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDay, setActiveDay] = useState<number | null>(1);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      if (galleryCount <= 1) return 0;
      return prev === 0 ? galleryCount - 1 : prev - 1;
    });
  }, [galleryCount]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (galleryCount <= 1) return 0;
      return prev === galleryCount - 1 ? 0 : prev + 1;
    });
  }, [galleryCount]);

  // Render only the current + adjacent images to reduce DOM/memory on mobile devices.
  const visibleGalleryIndices = useMemo(() => {
    if (galleryCount === 0) return [] as number[];
    if (galleryCount === 1) return [0];
    const prev = (currentIndex - 1 + galleryCount) % galleryCount;
    const next = (currentIndex + 1) % galleryCount;
    return Array.from(new Set([prev, currentIndex, next]));
  }, [currentIndex, galleryCount]);

  const difficultyColors = {
    Intermediate: 'bg-yellow-500/10 text-yellow-600',
    Advanced: 'bg-orange-500/10 text-orange-600',
    Expert: 'bg-red-500/10 text-red-600',
  };

  const seoTitle = trip.seo?.title || `${trip.title} | ${trip.destination} (${trip.difficulty} Adventure) | Revrom.in`;
  const seoDescription = trip.seo?.description || trip.shortDescription;
  const seoKeywords = trip.seo?.keywords || `${trip.title}, ${trip.destination}, ${trip.difficulty}, motorcycle tour, Himalayan journey, adventure travel, Revrom`;
  const seoImage = trip.seo?.ogImage || trip.imageUrl;

  return (
    <div className="bg-background dark:bg-dark-background pb-28 lg:pb-0 min-h-screen">
      <SEOHead 
        title={seoTitle} 
        description={seoDescription} 
        keywords={seoKeywords}
        image={seoImage}
      />

      <section className="relative h-45vh-dvh sm:h-55vh-dvh md:h-65vh-dvh lg:h-75vh-dvh w-full overflow-hidden bg-black">
        {visibleGalleryIndices.map((index) => {
          const photo = gallery[index];
          if (!photo) return null;
          const isActive = currentIndex === index;
          return (
            <img
              key={index}
              src={photo.imageUrl}
              alt={photo.caption || `Gallery ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              loading={isActive ? 'eager' : 'lazy'}
              decoding="async"
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
        
        <button onClick={onBack} className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 bg-black/40 backdrop-blur-md px-5 py-3 sm:px-6 sm:py-3 rounded-lg text-white text-xs sm:text-[10px] font-black uppercase tracking-widest border border-white/20 hover:bg-black/60 transition-all shadow-lg active:scale-95">
          ← BACK
        </button>

        <div className="absolute inset-y-0 left-2 sm:left-4 flex items-center z-30 opacity-100 md:opacity-60 md:hover:opacity-100">
          <button onClick={goToPrevious} aria-label="Previous image" title="Previous image" className="p-4 sm:p-5 md:p-6 rounded-full text-white transition-all bg-black/30 sm:bg-black/20 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none hover:bg-black/50 md:hover:bg-white/10 active:scale-90"><ChevronLeftIcon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"/></button>
        </div>
        <div className="absolute inset-y-0 right-2 sm:right-4 flex items-center z-30 opacity-100 md:opacity-60 md:hover:opacity-100">
          <button onClick={goToNext} aria-label="Next image" title="Next image" className="p-4 sm:p-5 md:p-6 rounded-full text-white transition-all bg-black/30 sm:bg-black/20 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none hover:bg-black/50 md:hover:bg-white/10 active:scale-90"><ChevronRightIcon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"/></button>
        </div>

        <div className="absolute bottom-6 sm:bottom-12 left-0 right-0 z-20 px-4 sm:px-6">
          <div className="container mx-auto">
            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-xl`}>{trip.difficulty}</span>
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-black text-white font-display italic tracking-tighter leading-tight mb-2 drop-shadow-lg">{trip.title}</h1>
            <p className="text-white/80 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs drop-shadow-md">{trip.destination} - {trip.duration} days</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-8 space-y-16">
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-6">About This Trip</h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground dark:text-dark-muted-foreground leading-relaxed">
                {trip.longDescription.split('\n\n').map((p, i) => (
                    <p key={i} className="mb-4 text-sm md:text-base">{p.replace(/### |#### |/g, '')}</p>
                ))}
              </div>
            </section>

            <section id="itinerary">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-6">The Itinerary</h2>
              <div className="space-y-4">
                {trip.itinerary.map((item) => (
                  <ItineraryDayAccordion 
                    key={item.day}
                    item={item}
                    isOpen={activeDay === item.day}
                    onToggle={() => setActiveDay(activeDay === item.day ? null : item.day)}
                  />
                ))}
              </div>
            </section>

            {trip.routeCoordinates && trip.routeCoordinates.length > 0 && (
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-6">The Route</h2>
                    <div className="h-[350px] sm:h-[450px] md:h-[500px] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50 dark:border-dark-border">
                        <TripRouteMap coordinates={trip.routeCoordinates} theme={theme} />
                    </div>
                </section>
            )}

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-green-500/[0.03] p-7 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-green-500/10">
                <h3 className="text-xs sm:text-[11px] font-black uppercase tracking-widest text-green-600 mb-7 sm:mb-8 italic">What's Included</h3>
                <ul className="space-y-4 sm:space-y-5">
                    {trip.inclusions.map(item => (
                        <li key={item} className="flex items-start gap-4 sm:gap-5 text-sm sm:text-base font-semibold text-muted-foreground dark:text-dark-muted-foreground leading-relaxed">
                            <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0 mt-1" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
              </div>
              <div className="bg-red-500/[0.03] p-7 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-red-500/10">
                <h3 className="text-xs sm:text-[11px] font-black uppercase tracking-widest text-red-600 mb-7 sm:mb-8 italic">What's Not Included</h3>
                <ul className="space-y-4 sm:space-y-5">
                    {trip.exclusions.map(item => (
                        <li key={item} className="flex items-start gap-4 sm:gap-5 text-sm sm:text-base font-semibold text-muted-foreground dark:text-dark-muted-foreground leading-relaxed">
                            <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0 mt-1" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
              </div>
            </section>
          </div>

          <div className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-28 bg-card dark:bg-dark-card p-10 rounded-[3rem] border border-border dark:border-dark-border shadow-adventure-dark">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Trip Details</h2>
              <div className="text-3xl font-black italic tracking-tighter mb-8 uppercase leading-tight">Price shared via WhatsApp</div>
              
              <div className="space-y-6 mb-10">
                 <div className="flex justify-between items-center py-4 border-b border-border/50">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-40">Difficulty Level</span>
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${difficultyColors[trip.difficulty]}`}>{trip.difficulty}</span>
                 </div>
                 <div className="flex justify-between items-center py-4 border-b border-border/50">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-40">Duration</span>
                    <span className="text-xs font-bold uppercase">{trip.duration} DAYS</span>
                 </div>
                 <div className="flex justify-between items-center py-4 border-b border-border/50">
                    <span className="text-[11px] font-black uppercase tracking-widest opacity-40">Activities</span>
                    <span className="text-xs font-bold uppercase">{trip.activities.length} SECTIONS</span>
                 </div>
              </div>

              <button onClick={() => onBookNow(trip)} className="w-full adventure-gradient text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                INQUIRE NOW
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden animate-fade-up">
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-border/30 px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)]">
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary mb-0.5">Booking Info</p>
                <h4 className="text-xl font-black italic text-foreground dark:text-dark-foreground">BOOK / INQUIRE</h4>
            </div>
            <button onClick={() => onBookNow(trip)} className="adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                BOOK / INQUIRE
            </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-up { animation: fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default TripDetailPage;
