
import React, { useState, useMemo, useEffect } from 'react';
import type { Trip } from '../types';
import TripCard from '../components/TripCard';
import SearchAndFilter from '../components/SearchAndFilter';
import SEOHead from '../components/SEOHead';

interface AllToursPageProps {
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onBookNow: (trip: Trip) => void;
  onNavigateContact: () => void;
  initialDestinationFilter: string | null;
}

const AllToursPage: React.FC<AllToursPageProps> = ({ trips, onSelectTrip, onBookNow, onNavigateContact, initialDestinationFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [destFilter, setDestFilter] = useState(initialDestinationFilter || 'all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [diffFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (initialDestinationFilter) {
        setDestFilter(initialDestinationFilter);
    }
  }, [initialDestinationFilter]);

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

  const onClearFilters = () => {
    setSearchTerm('');
    setDestFilter('all');
    setDurationFilter('all');
    setDifficultyFilter('all');
  };

  const destinations = useMemo(() => [...new Set(trips.map(t => t.destination))], [trips]);

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen">
      <SEOHead title="All Expeditions | Revrom.in" description="Explore all native-led motorcycle missions and tours through the Himalayas." />
      
      <section className="bg-slate-50 dark:bg-neutral-900 border-b border-border dark:border-dark-border py-20">
        <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">Tactical Archive</h2>
                <h1 className="text-5xl md:text-7xl font-black font-display italic tracking-tighter uppercase mb-8">Expedition Catalog</h1>
                <p className="text-lg text-muted-foreground dark:text-dark-muted-foreground mb-12 leading-relaxed">Browse our full range of Himalayan missions. From technical passes to cultural sanctuaries, select your next deployment.</p>
                
                <div className="max-w-2xl mx-auto">
                    <SearchAndFilter 
                        searchTerm={searchTerm} 
                        setSearchTerm={setSearchTerm} 
                        destinationFilter={destFilter} 
                        setDestinationFilter={setDestFilter} 
                        durationFilter={durationFilter} 
                        setDurationFilter={setDurationFilter} 
                        difficultyFilter={diffFilter} 
                        setDifficultyFilter={setDifficultyFilter} 
                        destinations={destinations} 
                        onClearFilters={onClearFilters} 
                    />
                </div>
            </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
            {filteredTrips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {filteredTrips.map(trip => (
                        <TripCard 
                            key={trip.id} 
                            trip={trip} 
                            onSelectTrip={onSelectTrip} 
                            onBookNow={onBookNow} 
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 space-y-6">
                    <div className="text-6xl opacity-10">🕵️</div>
                    <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tight mb-2">No Matching Missions</h3>
                        <p className="text-muted-foreground">Adjust your filters or search terms to find available deployments.</p>
                    </div>
                    <button onClick={onClearFilters} className="text-brand-primary font-black uppercase tracking-widest text-[11px] border border-brand-primary/20 px-6 py-3 rounded-xl hover:bg-brand-primary/5">Reset All Intel Filters</button>
                </div>
            )}
        </div>
      </section>

      {/* Decorative Contact CTA */}
      <section className="container mx-auto px-6 py-12">
        <div className="bg-neutral-900 dark:bg-neutral-800 rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
             <div className="relative z-10 max-w-xl">
                <h3 className="text-3xl md:text-5xl font-black font-display text-white italic tracking-tighter mb-4">Don't See What You're Looking For?</h3>
                <p className="text-white/60 font-medium">Our native scouts can design a specialized route just for your squad. Initialize a custom build today.</p>
             </div>
             <button onClick={onNavigateContact} className="relative z-10 bg-brand-primary text-white font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl hover:scale-105 transition-transform">Consult With Scouts</button>
             <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                 <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" /></svg>
             </div>
        </div>
      </section>
    </div>
  );
};

export default AllToursPage;
