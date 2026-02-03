
import React from 'react';

interface SearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  destinationFilter: string;
  setDestinationFilter: (value: string) => void;
  durationFilter: string;
  setDurationFilter: (value: string) => void;
  difficultyFilter: string;
  setDifficultyFilter: (value: string) => void;
  destinations: string[];
  onClearFilters: () => void;
}

const SearchIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
    </svg>
);

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
    searchTerm,
    setSearchTerm,
    destinationFilter,
    setDestinationFilter,
    durationFilter,
    setDurationFilter,
    difficultyFilter,
    setDifficultyFilter,
    destinations,
    onClearFilters,
}) => {
    const inputClass = "w-full p-4 border border-border/20 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-slate-50 dark:bg-black/60 text-foreground dark:text-dark-foreground text-sm font-medium outline-none transition-all shadow-inner";
    
    return (
        <div className="bg-card dark:bg-[#0A0A0A] p-6 sm:p-8 rounded-[2rem] shadow-2xl space-y-4 border border-border/50 dark:border-white/5 w-full mx-auto">
            <div className="flex flex-col gap-4">
                {/* Search Bar */}
                <div className="relative w-full">
                    <label htmlFor="search" className="sr-only">Search tours</label>
                    <input
                        type="text"
                        id="search"
                        name="search"
                        autoComplete="off"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, destination..."
                        className="w-full pl-12 pr-4 py-3 sm:py-4 border border-border/20 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-slate-50 dark:bg-black/60 text-foreground dark:text-dark-foreground text-base sm:text-sm font-medium outline-none transition-all shadow-inner"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-50" />
                </div>

                {/* Filters - Horizontal scroll on mobile, grid on desktop */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-4 scrollbar-hide">
                    <select
                        id="destination"
                        name="destination"
                        value={destinationFilter}
                        onChange={(e) => setDestinationFilter(e.target.value)}
                        className="min-w-[160px] sm:min-w-0 flex-shrink-0 w-full p-4 py-3 sm:py-4 border border-border/20 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-slate-50 dark:bg-black/60 text-foreground dark:text-dark-foreground text-sm font-medium outline-none transition-all shadow-inner"
                    >
                        <option value="all">All Destinations</option>
                        {destinations.map(dest => (
                            <option key={dest} value={dest}>{dest}</option>
                        ))}
                    </select>

                    <select
                        id="duration"
                        name="duration"
                        value={durationFilter}
                        onChange={(e) => setDurationFilter(e.target.value)}
                        className="min-w-[140px] sm:min-w-0 flex-shrink-0 w-full p-4 py-3 sm:py-4 border border-border/20 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-slate-50 dark:bg-black/60 text-foreground dark:text-dark-foreground text-sm font-medium outline-none transition-all shadow-inner"
                    >
                        <option value="all">All Durations</option>
                        <option value="1-7">Up to 7 Days</option>
                        <option value="8-14">8 - 14 Days</option>
                        <option value="15-999">15+ Days</option>
                    </select>

                    <select
                        id="difficulty"
                        name="difficulty"
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className="min-w-[150px] sm:min-w-0 flex-shrink-0 w-full p-4 py-3 sm:py-4 border border-border/20 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-slate-50 dark:bg-black/60 text-foreground dark:text-dark-foreground text-sm font-medium outline-none transition-all shadow-inner"
                    >
                        <option value="all">All Difficulties</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                    </select>
                </div>
            </div>
            
            <div className="flex justify-center sm:justify-end pt-2">
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-xs font-black uppercase tracking-widest px-4 py-2 sm:px-0 sm:py-0 border border-brand-primary/30 sm:border-0 rounded-lg sm:rounded-none bg-brand-primary/5 sm:bg-transparent text-brand-primary hover:bg-brand-primary/10 sm:hover:bg-transparent active:scale-95 sm:active:scale-100 transition-all"
                >
                    Clear All Filters
                </button>
            </div>
        </div>
    );
};

export default SearchAndFilter;
