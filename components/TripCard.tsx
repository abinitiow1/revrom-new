
import React from 'react';
import type { Trip } from '../types';

interface TripCardProps {
  trip: Trip;
  onSelectTrip: (trip: Trip) => void;
  onBookNow: (trip: Trip) => void;
}

const CalendarIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.75 3a.75.75 0 0 1 .75.75V4h7V3.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V3.75A.75.75 0 0 1 5.75 3zM4.5 8.25a.75.75 0 0 0 0 1.5h11a.75.75 0 0 0 0-1.5h-11z" clipRule="evenodd" />
    </svg>
);

const TripCard: React.FC<TripCardProps> = ({ trip, onSelectTrip, onBookNow }) => {
    const difficultyColors = {
        Intermediate: 'bg-yellow-500/10 text-yellow-600 ring-yellow-500/20',
        Advanced: 'bg-orange-500/10 text-orange-600 ring-orange-500/20',
        Expert: 'bg-red-500/10 text-red-600 ring-red-500/20',
    };

  return (
    <div 
      role="button"
      tabIndex={0}
      aria-label={`View details for ${trip.title}`}
      className="bg-card dark:bg-dark-card rounded-2xl shadow-adventure-dark overflow-hidden transform transition-all duration-500 cursor-pointer group flex flex-col border border-border/50 dark:border-dark-border hover:border-brand-primary active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
      onClick={() => onSelectTrip(trip)}
      onKeyDown={(e) => {
        // Only treat Enter/Space as "open" when the card itself is focused (not nested controls).
        if (e.target !== e.currentTarget) return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        onSelectTrip(trip);
      }}
    >
      <div className="relative overflow-hidden h-64">
        <img src={trip.imageUrl} alt={trip.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        <div className="absolute top-4 left-4 flex flex-col gap-2">
           <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest backdrop-blur-md ring-1 ${difficultyColors[trip.difficulty]}`}>
             {trip.difficulty}
           </span>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-primary mb-1 drop-shadow-sm">{trip.destination}</p>
            <h3 className="text-2xl font-black font-display text-white leading-tight mb-2 italic tracking-tighter">
                {trip.title}
            </h3>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-white/80 text-[10px] font-bold bg-white/10 backdrop-blur-md px-2 py-1 rounded">
                    <CalendarIcon className="w-3 h-3" />
                    {trip.duration} DAYS
                </div>
                <div className="text-white/60 font-black text-[10px] uppercase tracking-widest">Pricing on Request</div>
            </div>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-grow bg-white dark:bg-dark-card border-t border-border/10">
        <p className="text-muted-foreground dark:text-dark-muted-foreground text-xs font-medium leading-relaxed mb-6 line-clamp-2">
            {trip.shortDescription}
        </p>
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onBookNow(trip);
            }}
            className="mt-auto group/btn flex items-center justify-center gap-2 w-full adventure-gradient text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg hover:shadow-adventure active:scale-95"
        >
            INQUIRE NOW
            <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TripCard;
