import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Keep marquee on everywhere (including mobile), but still respect prefers-reduced-motion.
  // To avoid "jank" on touch devices, we pause marquee immediately on user interaction.
  const disableMarqueeMotion = useDisableMarqueeMotion({ disableOnMobile: false });

  const makeMarqueeInteraction = () => {
    const resumeTimerRef = { current: null as number | null };
    const pauseRef = { current: false };
    return { resumeTimerRef, pauseRef };
  };

  const row1InteractionRef = useRef(makeMarqueeInteraction());
  const row2InteractionRef = useRef(makeMarqueeInteraction());
  const [row1Paused, setRow1Paused] = useState(false);
  const [row2Paused, setRow2Paused] = useState(false);

  const pauseMarquee = useCallback((row: 1 | 2) => {
    if (disableMarqueeMotion) return;

    const interaction = row === 1 ? row1InteractionRef.current : row2InteractionRef.current;
    if (interaction.resumeTimerRef.current) window.clearTimeout(interaction.resumeTimerRef.current);
    interaction.pauseRef.current = true;
    if (row === 1) setRow1Paused(true);
    else setRow2Paused(true);
  }, [disableMarqueeMotion]);

  const resumeMarqueeSoon = useCallback((row: 1 | 2, delayMs = 1800) => {
    if (disableMarqueeMotion) return;

    const interaction = row === 1 ? row1InteractionRef.current : row2InteractionRef.current;
    if (interaction.resumeTimerRef.current) window.clearTimeout(interaction.resumeTimerRef.current);
    interaction.resumeTimerRef.current = window.setTimeout(() => {
      interaction.pauseRef.current = false;
      if (row === 1) setRow1Paused(false);
      else setRow2Paused(false);
    }, delayMs);
  }, [disableMarqueeMotion]);

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

  // Only enable the animated marquee when there are enough unique cards for BOTH rows.
  // If there are too few items, repetition looks like "overlap" and one-row animation feels inconsistent.
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const minTripsForMarquee = isMobile ? 6 : 8;
  const enableMarquee = !disableMarqueeMotion && filteredTrips.length >= minTripsForMarquee;
  const row1EnableMarquee = enableMarquee;
  const row2EnableMarquee = enableMarquee;

  // If filters change and the list shrinks to 0/1, avoid "stuck paused" state.
  useEffect(() => {
    if (disableMarqueeMotion) {
      setRow1Paused(false);
      setRow2Paused(false);
    }
  }, [disableMarqueeMotion]);

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
          <div
            role="region"
            aria-label="Explore tours carousel (row 1)"
            tabIndex={0}
            className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 pb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
            onPointerDown={() => {
              if (!row1EnableMarquee) return;
              pauseMarquee(1);
              resumeMarqueeSoon(1);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              if (row1EnableMarquee) {
                pauseMarquee(1);
                resumeMarqueeSoon(1);
              }
              e.preventDefault();
              e.currentTarget.scrollBy({
                left: e.key === 'ArrowRight' ? 360 : -360,
                behavior: 'smooth',
              });
            }}
            onTouchStart={() => {
              if (!row1EnableMarquee) return;
              pauseMarquee(1);
              resumeMarqueeSoon(1);
            }}
            onWheel={() => {
              if (!row1EnableMarquee) return;
              pauseMarquee(1);
              resumeMarqueeSoon(1);
            }}
            onScroll={() => {
              if (!row1EnableMarquee) return;
              pauseMarquee(1);
              resumeMarqueeSoon(1, 2200);
            }}
            onFocusCapture={() => {
              if (!row1EnableMarquee) return;
              pauseMarquee(1);
            }}
            onBlurCapture={() => {
              if (!row1EnableMarquee) return;
              resumeMarqueeSoon(1, 1200);
            }}
          >
            <div
              className={
                !row1EnableMarquee
                  ? 'flex gap-8'
                  : 'flex animate-marquee-left-infinite whitespace-nowrap group-hover/row1:[animation-play-state:paused]'
              }
              style={row1EnableMarquee ? { animationPlayState: row1Paused ? 'paused' : 'running', willChange: 'transform' } : undefined}
            >
              {!row1EnableMarquee ? (
                row1Trips.map((trip) => (
                  <div key={trip.id} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                    <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                  </div>
                ))
              ) : (
                <>
                  {/* Keep an end padding equal to the gap so the loop seam doesn't "crush" cards together. */}
                  <div className="flex gap-8 pr-8">
                    {row1Trips.map((trip) => (
                      <div key={`a-${trip.id}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                        <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-8 pr-8" aria-hidden="true">
                    {row1Trips.map((trip) => (
                      <div key={`b-${trip.id}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                        <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="relative w-full group/row2">
          <div
            role="region"
            aria-label="Explore tours carousel (row 2)"
            tabIndex={0}
            className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 pb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
            onPointerDown={() => {
              if (!row2EnableMarquee) return;
              pauseMarquee(2);
              resumeMarqueeSoon(2);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              if (row2EnableMarquee) {
                pauseMarquee(2);
                resumeMarqueeSoon(2);
              }
              e.preventDefault();
              e.currentTarget.scrollBy({
                left: e.key === 'ArrowRight' ? 360 : -360,
                behavior: 'smooth',
              });
            }}
            onTouchStart={() => {
              if (!row2EnableMarquee) return;
              pauseMarquee(2);
              resumeMarqueeSoon(2);
            }}
            onWheel={() => {
              if (!row2EnableMarquee) return;
              pauseMarquee(2);
              resumeMarqueeSoon(2);
            }}
            onScroll={() => {
              if (!row2EnableMarquee) return;
              pauseMarquee(2);
              resumeMarqueeSoon(2, 2200);
            }}
            onFocusCapture={() => {
              if (!row2EnableMarquee) return;
              pauseMarquee(2);
            }}
            onBlurCapture={() => {
              if (!row2EnableMarquee) return;
              resumeMarqueeSoon(2, 1200);
            }}
          >
            <div
              className={
                !row2EnableMarquee
                  ? 'flex gap-8'
                  : 'flex animate-marquee-right-infinite whitespace-nowrap group-hover/row2:[animation-play-state:paused]'
              }
              style={row2EnableMarquee ? { animationPlayState: row2Paused ? 'paused' : 'running', willChange: 'transform' } : undefined}
            >
              {!row2EnableMarquee ? (
                row2Trips.map((trip) => (
                  <div key={trip.id} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                    <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                  </div>
                ))
              ) : (
                <>
                  <div className="flex gap-8 pr-8">
                    {row2Trips.map((trip) => (
                      <div key={`a-${trip.id}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                        <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-8 pr-8" aria-hidden="true">
                    {row2Trips.map((trip) => (
                      <div key={`b-${trip.id}`} className="w-[300px] md:w-[380px] flex-shrink-0 snap-center">
                        <TripCard trip={trip} onSelectTrip={onSelectTrip} onBookNow={onBookNow} />
                      </div>
                    ))}
                  </div>
                </>
              )}
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
