import React, { useMemo, useState } from 'react';
import type { Departure, ItineraryQuery, SiteContent, Trip } from '../../../types';
import { destinationsMatch } from '../../../services/destinationNormalizer';
import { getActiveBgStyle } from '../activeBgStyle';

type Props = {
  trips: Trip[];
  departures: Departure[];
  siteContent: SiteContent;
  sectionConfig: SiteContent['homePageLayout'][number];
  onAddInquiry: (query: Omit<ItineraryQuery, 'id' | 'date'>) => void;
};

const DeparturesSection: React.FC<Props> = ({ trips, departures, siteContent, sectionConfig, onAddInquiry }) => {
  const [depDestFilter, setDepDestFilter] = useState('all');
  const [depMonthFilter, setDepMonthFilter] = useState('all');

  const filteredDepartures = useMemo(() => {
    const deps = [...departures].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    return deps.filter((dep) => {
      const trip = trips.find((t) => t.id === dep.tripId);
      if (!trip) return false;
      const matchDest = depDestFilter === 'all' || destinationsMatch(trip.destination, depDestFilter);
      const matchMonth =
        depMonthFilter === 'all' || new Date(dep.startDate).getMonth().toString() === depMonthFilter;
      return matchDest && matchMonth;
    });
  }, [departures, trips, depDestFilter, depMonthFilter]);

  const handleInquiry = (trip: Trip, departure: Departure) => {
    onAddInquiry({
      tripId: trip.id,
      tripTitle: trip.title,
      name: 'Web User Inquiry',
      whatsappNumber: 'Awaiting Response',
      planningTime: `${new Date(departure.startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })} Expedition`,
    });

    const adminPhone = siteContent.adminWhatsappNumber.replace(/\D/g, '');
    const message = `REVROM EXPEDITION INQUIRY:
Tour Name: ${trip.title}
Departure Date: ${new Date(departure.startDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}
Status: ${departure.status.toUpperCase()}

I'm interested in this tour. Please share pricing and details.`;
    const w = window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    try {
      if (w) (w as any).opener = null;
    } catch {}
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const departureDestinations = [...new Set(trips.map((t) => t.destination))];
  const departuresHasBg = !!siteContent.departuresBgImage;
  const bgStyle = getActiveBgStyle(siteContent.departuresBgImage, sectionConfig.backgroundOpacity);

  return (
    <section
      id="departures"
      className="py-24 bg-slate-50 dark:bg-black/20"
      style={bgStyle}
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h3
            className={[
              'text-5xl md:text-6xl font-black font-display italic tracking-tight',
              departuresHasBg
                ? 'text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)]'
                : 'text-[#112340] dark:text-foreground',
            ].join(' ')}
          >
            {siteContent.departuresTitle}
          </h3>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 md:p-8 rounded-[1.5rem] shadow-xl border border-border dark:border-dark-border mb-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-5/12">
            <label htmlFor="departuresDestination" className="sr-only">
              Destination
            </label>
            <select
              id="departuresDestination"
              name="destination"
              value={depDestFilter}
              onChange={(e) => setDepDestFilter(e.target.value)}
              className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-black text-foreground dark:text-dark-foreground font-bold outline-none appearance-none shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <option value="all">All Destinations</option>
              {departureDestinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-5/12">
            <label htmlFor="departuresMonth" className="sr-only">
              Month
            </label>
            <select
              id="departuresMonth"
              name="month"
              value={depMonthFilter}
              onChange={(e) => setDepMonthFilter(e.target.value)}
              className="w-full p-4 rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-black text-foreground dark:text-dark-foreground font-bold outline-none appearance-none shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <option value="all">All Months</option>
              {months.map((m, i) => (
                <option key={m} value={i.toString()}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-2/12 flex justify-center md:justify-end">
            <button
              type="button"
              onClick={() => {
                setDepDestFilter('all');
                setDepMonthFilter('all');
              }}
              className="text-brand-primary font-black uppercase text-[11px] tracking-widest hover:text-brand-primary-dark transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl border border-border/50 dark:border-dark-border/50 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-border/50">
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">
                    TOUR NAME
                  </th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">
                    DATE
                  </th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280] text-center">
                    SLOTS
                  </th>
                  <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b7280]">
                    STATUS
                  </th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 dark:divide-dark-border/30">
                {filteredDepartures.map((departure) => {
                  const dTrip = trips.find((t) => t.id === departure.tripId);
                  if (!dTrip) return null;
                  const slotColor =
                    departure.slots === 0
                      ? 'text-red-500'
                      : departure.slots <= 4
                        ? 'text-orange-500'
                        : 'text-green-600';
                  const statusColors = {
                    Available: 'bg-green-50 text-green-700 border-green-100',
                    Limited: 'bg-orange-50 text-orange-700 border-orange-100',
                    'Sold Out': 'bg-red-50 text-red-700 border-red-100',
                  };
                  const statusDotColors = {
                    Available: 'bg-green-500',
                    Limited: 'bg-orange-500',
                    'Sold Out': 'bg-red-500',
                  };
                  return (
                    <tr key={departure.id} className="group hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-all">
                      <td className="px-8 py-8">
                        <h4 className="font-black text-[#112340] dark:text-foreground text-[15px] tracking-tight italic">
                          {dTrip.title}
                        </h4>
                      </td>
                      <td className="px-8 py-8 whitespace-nowrap">
                        <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">
                          {new Date(departure.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          -{' '}
                          {new Date(departure.endDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className={`text-base font-black ${slotColor}`}>{departure.slots}</span>
                      </td>
                      <td className="px-8 py-8 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusColors[departure.status as keyof typeof statusColors]}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusDotColors[departure.status as keyof typeof statusDotColors]}`}
                          ></span>
                          <span className="text-[10px] font-black uppercase tracking-widest">{departure.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <button
                          type="button"
                          onClick={() => handleInquiry(dTrip, departure)}
                          className={`text-[13px] font-black uppercase tracking-widest transition-all ${departure.status === 'Sold Out' ? 'text-slate-300 pointer-events-none' : 'text-brand-primary hover:text-brand-primary-dark hover:translate-x-1'}`}
                        >
                          Inquire {departure.status !== 'Sold Out' && 'Now'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/30 dark:divide-dark-border/30">
            {filteredDepartures.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground italic">
                No departures found for the selected filters.
              </div>
            ) : (
              filteredDepartures.map((departure) => {
                const dTrip = trips.find((t) => t.id === departure.tripId);
                if (!dTrip) return null;
                const slotColor =
                  departure.slots === 0
                    ? 'text-red-500'
                    : departure.slots <= 4
                      ? 'text-orange-500'
                      : 'text-green-600';
                const statusColors = {
                  Available: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
                  Limited: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
                  'Sold Out': 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
                };
                const statusDotColors = {
                  Available: 'bg-green-500',
                  Limited: 'bg-orange-500',
                  'Sold Out': 'bg-red-500',
                };
                return (
                  <div key={departure.id} className="p-6 sm:p-8 space-y-5 sm:space-y-6">
                    {/* Tour Name & Status Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="font-black text-[#112340] dark:text-foreground text-base sm:text-lg tracking-tight italic leading-tight flex-1">
                        {dTrip.title}
                      </h4>
                      <div
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusColors[departure.status as keyof typeof statusColors]}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${statusDotColors[departure.status as keyof typeof statusDotColors]}`}
                        ></span>
                        <span>{departure.status}</span>
                      </div>
                    </div>

                    {/* Date & Slots Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between bg-slate-50 dark:bg-white/[0.02] rounded-xl p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm sm:text-[13px] font-bold text-muted-foreground uppercase tracking-wide">
                          {new Date(departure.startDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          -{' '}
                          {new Date(departure.endDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className={`text-base sm:text-sm font-black ${slotColor}`}>{departure.slots} <span className="hidden sm:inline">slots</span></span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <button
                      type="button"
                      onClick={() => handleInquiry(dTrip, departure)}
                      disabled={departure.status === 'Sold Out'}
                      className={`w-full py-4 sm:py-3.5 rounded-lg font-black uppercase text-sm sm:text-[11px] tracking-widest transition-all ${
                        departure.status === 'Sold Out'
                          ? 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-500 cursor-not-allowed'
                          : 'adventure-gradient text-white shadow-lg hover:shadow-xl active:scale-95'
                      }`}
                    >
                      {departure.status === 'Sold Out' ? 'Sold Out' : 'Inquire Now →'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeparturesSection;
