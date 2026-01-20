
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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, destination..."
                        className="w-full pl-12 pr-4 py-4 border border-border/20 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-brand-primary focus:border-brand-primary bg-slate-50 dark:bg-black/60 text-foreground dark:text-dark-foreground text-sm font-medium outline-none transition-all shadow-inner"
                    />
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-50" />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 gap-4">
                    <select
                        id="destination"
                        value={destinationFilter}
                        onChange={(e) => setDestinationFilter(e.target.value)}
                        className={inputClass}
                    >
                        <option value="all">All Destinations</option>
                        {destinations.map(dest => (
                            <option key={dest} value={dest}>{dest}</option>
                        ))}
                    </select>

                    <select
                        id="duration"
                        value={durationFilter}
                        onChange={(e) => setDurationFilter(e.target.value)}
                        className={inputClass}
                    >
                        <option value="all">All Durations</option>
                        <option value="1-7">Up to 7 Days</option>
                        <option value="8-14">8 - 14 Days</option>
                        <option value="15-999">15+ Days</option>
                    </select>

                    <select
                        id="difficulty"
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className={inputClass}
                    >
                        <option value="all">All Difficulties</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                    </select>
                </div>
            </div>
            
            <div className="flex justify-end pt-2">
                <button
                    onClick={onClearFilters}
                    className="text-xs font-black uppercase tracking-widest text-brand-primary hover:text-brand-primary-dark transition-colors"
                >
                    Clear Filters
                </button>
            </div>
        </div>
    );
};

export default SearchAndFilter;
