import React, { useEffect, useMemo, useState } from 'react';
import type { Trip, SiteContent } from '../../../types';
import TripCard from '../../../components/TripCard';
import SearchAndFilter from '../../../components/SearchAndFilter';
import { destinationsMatch } from '../../../services/destinationNormalizer';
import { getActiveBgStyle } from '../activeBgStyle';
import { useDisableMarqueeMotion } from '../../../utils/useDisableMarqueeMotion';

type Props = {
  trips: Trip[];
  siteContent: SiteContent;
  sectionConfig: SiteContent['homePageLayout'][number];
  onSelectTrip: (trip: Trip) => void;
  onBookNow: (trip: Trip) => void;
  onNavigateToTours: (destination: string | null) => void;
  initialDestinationFilter: string | null;
  onClearInitialFilter: () => void;
};

const AdventuresSection: React.FC<Props> = ({
  trips,
  siteContent,
  sectionConfig,
  onSelectTrip,
  onBookNow,
  onNavigateToTours,
  initialDestinationFilter,
  onClearInitialFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [destFilter, setDestFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [diffFilter, setDifficultyFilter] = useState('all');
  const disableMarqueeMotion = useDisableMarqueeMotion();

  useEffect(() => {
    if (!initialDestinationFilter) return;
    setDestFilter((prev) => (prev === 'all' ? initialDestinationFilter : prev));
  }, [initialDestinationFilter]);

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchSearch =
        trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDest = destFilter === 'all' || destinationsMatch(trip.destination, destFilter);
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

  // Keep marquee infinite by duplicating once (2x). On mobile / reduced motion, keep it static & scrollable.
  const marqueeRow1 = useMemo(() => (disableMarqueeMotion ? row1Trips : row1Trips.concat(row1Trips)), [row1Trips, disableMarqueeMotion]);
  const marqueeRow2 = useMemo(() => (disableMarqueeMotion ? row2Trips : row2Trips.concat(row2Trips)), [row2Trips, disableMarqueeMotion]);

  const adventuresHasBg = !!siteContent.adventuresBgImage;
  const bgStyle = getActiveBgStyle(siteContent.adventuresBgImage, sectionConfig.backgroundOpacity);

  const destinations = useMemo(() => [...new Set(trips.map((t) => t.destination))], [trips]);

  return (
    <section
      id="adventures"
      className="py-24 overflow-hidden"
      style={bgStyle}
    >
      <div className="container mx-auto px-6 mb-16">
        <div className="flex flex-col items-center text-center gap-10">
          <div className="max-w-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">
              {siteContent.adventuresKicker || 'Upcoming Tours'}
            </h2>
            <h3
              className={[
                'text-5xl md:text-7xl font-black font-display italic tracking-tighter uppercase leading-none',
                adventuresHasBg ? 'text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]' : '',
              ].join(' ')}
            >
              {siteContent.adventuresTitle}
            </h3>
            {!!siteContent.adventuresSubtitle && (
              <p
                className={[
                  'mt-4 text-sm font-bold uppercase tracking-widest opacity-70',
                  adventuresHasBg ? 'text-white' : 'text-muted-foreground dark:text-dark-muted-foreground',
                ].join(' ')}
              >
                {siteContent.adventuresSubtitle}
              </p>
            )}

            {!!initialDestinationFilter && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                  Filtered: {initialDestinationFilter}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDestFilter('all');
                    onClearInitialFilter();
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="w-full max-w-3xl">
            <SearchAndFilter
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              destinationFilter={destFilter}
              setDestinationFilter={(v) => {
                setDestFilter(v);
                if (initialDestinationFilter) onClearInitialFilter();
              }}
              durationFilter={durationFilter}
              setDurationFilter={setDurationFilter}
              difficultyFilter={diffFilter}
              setDifficultyFilter={setDifficultyFilter}
              destinations={destinations}
              onClearFilters={() => {
                setSearchTerm('');
                setDestFilter('all');
                setDurationFilter('all');
                setDifficultyFilter('all');
                if (initialDestinationFilter) onClearInitialFilter();
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <div className="relative w-full group/row1">
          <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-8 px-6 pb-4">
            <div className={disableMarqueeMotion ? 'flex gap-8' : 'flex animate-marquee-left-infinite whitespace-nowrap gap-8 group-hover/row1:[animation-play-state:paused]'}>
              {marqueeRow1.map((trip, idx) => (
                <div key={`${trip.id}-${idx}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                  <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative w-full group/row2">
          <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-8 px-6 pb-4">
            <div className={disableMarqueeMotion ? 'flex gap-8' : 'flex animate-marquee-right-infinite whitespace-nowrap gap-8 group-hover/row2:[animation-play-state:paused]'}>
              {marqueeRow2.map((trip, idx) => (
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
          <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
            No tours found for your filters.
          </p>
        </div>
      )}

      {/* View All Trips CTA positioned above departures */}
      <div className="container mx-auto px-6 mt-16 flex justify-center">
        <button
          type="button"
          onClick={() => onNavigateToTours(null)}
          className="adventure-gradient text-white px-12 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
        >
          {siteContent.adventuresCtaLabel || 'View All Tours'}
        </button>
      </div>
    </section>
  );
};

export default AdventuresSection;
