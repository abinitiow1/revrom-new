import React, { useRef, useState } from 'react';
import type { Trip } from '../types';
import { buildTripPlan, type InterestTag, type PlannedItinerary } from '../services/tripPlannerService';
import { destinationsMatch } from '../services/destinationNormalizer';
import LoadingSpinner from '../components/LoadingSpinner';

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm6 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-3.75 7.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-6-3a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm12-3a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-3.75 10.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-6-3a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm12-3a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
    </svg>
);


interface CustomizePageProps {
    onNavigateContact: () => void;
    trips: Trip[];
}

const CustomizePage: React.FC<CustomizePageProps> = ({ onNavigateContact, trips }) => {
    const destinationOptions = Array.from(new Set((trips || []).map(t => (t.destination || '').trim()).filter(Boolean))).sort();
    const initialDestination = destinationOptions[0] || '';
    const initialTripId = (trips || []).find(t => (t.destination || '').trim() === initialDestination)?.id || (trips?.[0]?.id || '');

    const [formData, setFormData] = useState({
        destination: initialDestination,
        tripId: initialTripId,
        travelers: '2',
        duration: '10',
        startDate: '',
        endDate: '',
        style: 'Adventure Focused',
        interestTags: ['adventure', 'mountain', 'lakes'] as InterestTag[],
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [generatedPlan, setGeneratedPlan] = useState<PlannedItinerary | null>(null);
    const [error, setError] = useState('');
    const [isEndDateAuto, setIsEndDateAuto] = useState(true);
    const startDateRef = useRef<HTMLInputElement | null>(null);
    const endDateRef = useRef<HTMLInputElement | null>(null);

    const todayLocal = (() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    })();

    const computeEndDate = (startDate: string, durationStr: string) => {
        // Use YYYY-MM-DD (what <input type="date"> expects).
        const days = Math.max(1, parseInt(durationStr || '0', 10) || 1);
        if (!startDate) return '';
        const base = new Date(`${startDate}T00:00:00`);
        if (Number.isNaN(base.getTime())) return '';
        // Inclusive end date: Day 1 is startDate => add (days - 1).
        base.setDate(base.getDate() + Math.max(0, days - 1));
        const yyyy = base.getFullYear();
        const mm = String(base.getMonth() + 1).padStart(2, '0');
        const dd = String(base.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const openDatePicker = (ref: React.RefObject<HTMLInputElement>) => {
        const el = ref.current;
        if (!el) return;
        // showPicker is supported in Chromium-based browsers.
        const anyEl = el as any;
        if (typeof anyEl.showPicker === 'function') anyEl.showPicker();
        else el.focus();
    };

    const getTripDayCount = (trip: Trip | undefined) => {
        if (!trip) return 0;
        const itineraryDays = (trip.itinerary || []).filter((d: any) => (d.day ?? 0) >= 1).length;
        return itineraryDays || Number(trip.duration) || 0;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'endDate') setIsEndDateAuto(false);
        if (name === 'startDate') setIsEndDateAuto(true);

        setFormData(prev => {
            const next: any = { ...prev, [name]: value };

            if (name === 'startDate') {
                if (!value) {
                    if (isEndDateAuto) next.endDate = '';
                } else {
                    next.endDate = computeEndDate(value, String(next.duration || prev.duration || ''));
                }
            }

            if (name === 'duration') {
                const start = String(prev.startDate || '');
                if (start && isEndDateAuto) next.endDate = computeEndDate(start, String(value));
            }

            return next;
        });
    };

    const handleDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const destination = e.target.value;
        const requestedDays = Number(formData.duration || 0);
        const nextTripId =
            (trips || []).find(t => destinationsMatch(t.destination || '', destination) && (t.duration || 0) <= requestedDays)?.id ||
            (trips || []).find(t => destinationsMatch(t.destination || '', destination))?.id ||
            '';
        setFormData(prev => ({ ...prev, destination, tripId: nextTripId || prev.tripId }));
    };

    const handleInterestToggle = (tag: InterestTag) => {
        setFormData(prev => {
            const set = new Set(prev.interestTags || []);
            if (set.has(tag)) set.delete(tag);
            else set.add(tag);
            return { ...prev, interestTags: Array.from(set) as InterestTag[] };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setGeneratedPlan(null);
        try {
            const plan = await buildTripPlan({
                destination: formData.destination,
                requestedDays: Number(formData.duration),
                baseTripId: formData.tripId,
                interestTags: formData.interestTags,
                notes: formData.notes,
                trips,
            });
            setGeneratedPlan(plan);
        } catch (err: any) {
            console.error(err);
            const raw = err?.message || err?.toString() || '';
            if (raw.toLowerCase().includes('geoapify') || raw.toLowerCase().includes('api key')) setError(raw);
            else setError('An unexpected error occurred while building the itinerary. Please try again.');
        } finally {
            setIsLoading(false);
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        }
    };
    
    const handleStartOver = () => {
        setGeneratedPlan(null);
        setError('');
    };

    const buildQuotePrefillMessage = () => {
        const trip = trips.find(t => t.id === formData.tripId);
        const notes = (formData.notes || '').replace(/\s+/g, ' ').trim();
        const dateRange = formData.startDate && formData.endDate
            ? `${formData.startDate} to ${formData.endDate}`
            : (formData.startDate ? `Starting ${formData.startDate}` : (formData.endDate ? `Until ${formData.endDate}` : 'Flexible'));

        const itineraryHint = generatedPlan
            ? 'I also generated an initial itinerary in your Trip Planner. Please review and suggest the best option.'
            : 'Please suggest the best itinerary for these preferences.';

        const planLines = generatedPlan
            ? [
                '',
                'Draft plan:',
                ...generatedPlan.days.map(d => {
                    const first = d.stops?.[0];
                    const stopNames = (d.stops || []).map(s => s.name).filter(Boolean).join(', ');
                    const extra = first?.distanceKmFromCenter ? ` (~${first.distanceKmFromCenter} km from ${generatedPlan.destination})` : '';
                    return `- Day ${d.day}: ${stopNames || d.title}${extra}`;
                }),
            ]
            : [];

        return [
            'Hello Revrom, I would like a quote for my trip:',
            '',
            `- Destination: ${formData.destination || 'N/A'}`,
            `- Base trip: ${trip?.title || 'Custom plan'}`,
            `- People: ${formData.travelers || '1'} rider(s)`,
            `- Duration: ${formData.duration || 'N/A'} days`,
            `- Dates: ${dateRange}`,
            `- Style: ${formData.style || 'N/A'}`,
            `- Interests: ${(formData.interestTags || []).join(', ') || 'N/A'}`,
            `- Notes: ${notes || 'N/A'}`,
            '',
            itineraryHint,
            ...planLines,
        ].join('\n');
    };
    
    const filteredTrips = (trips || []).filter(t => destinationsMatch(t.destination || '', formData.destination || ''));
    const baseTripOptions = filteredTrips.slice().sort((a, b) => (b.duration || 0) - (a.duration || 0));

    const renderPlan = (plan: PlannedItinerary) => {
        const interestLabel = (formData.interestTags || [])
            .map((t) => (t || '').trim())
            .filter(Boolean)
            .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
            .join(', ');
        const notesLabel = (formData.notes || '').trim();

        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground dark:text-dark-foreground">Your Draft Itinerary</h2>
                    <p className="mt-2 text-muted-foreground dark:text-dark-muted-foreground">
                        Destination: <span className="font-semibold text-foreground dark:text-dark-foreground">{plan.destination}</span>
                        {plan.baseTripTitle ? <> | Base: <span className="font-semibold text-foreground dark:text-dark-foreground">{plan.baseTripTitle}</span></> : null}
                    </p>
                    {(interestLabel || notesLabel) ? (
                        <div className="mt-3 rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-sm text-muted-foreground dark:text-dark-muted-foreground">
                            {interestLabel ? (
                                <div>
                                    <span className="font-semibold text-foreground dark:text-dark-foreground">Preferences:</span> {interestLabel}
                                </div>
                            ) : null}
                            {notesLabel ? (
                                <div className={interestLabel ? 'mt-1' : ''}>
                                    <span className="font-semibold text-foreground dark:text-dark-foreground">Notes:</span> {notesLabel}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    {plan.notices?.length ? (
                        <div className="mt-3 space-y-2">
                            {plan.notices.map((n, i) => (
                                <div key={i} className="rounded-xl border border-border dark:border-dark-border bg-slate-50 dark:bg-slate-900/40 px-4 py-3 text-sm text-muted-foreground dark:text-dark-muted-foreground">
                                    {n}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="divide-y divide-border dark:divide-dark-border rounded-2xl border border-border dark:border-dark-border overflow-hidden">
                    {plan.days.map((d) => (
                        <div key={d.day} className="p-5 md:p-6 bg-background dark:bg-dark-background">
                            {(() => {
                                const hasGeoapify = (d.stops || []).some(s => s.source === 'geoapify');
                                const hasPlaceholder = (d.stops || []).some(s => s.source === 'placeholder');
                                const badgeText = hasGeoapify ? 'Additional stops' : (hasPlaceholder ? 'Flexible day' : 'Base plan');
                                const badgeClass = hasGeoapify
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                                    : (hasPlaceholder ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200');

                                const cleanedTitle = d.title.replace(/^Day\s+\d+\s*:\s*/i, '');

                                return (
                                  <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg md:text-xl font-extrabold text-foreground dark:text-dark-foreground">
                                        Day {d.day}: {cleanedTitle}
                                    </h3>
                                    <p className="mt-2 text-sm md:text-base text-muted-foreground dark:text-dark-muted-foreground">
                                        {(d.stops || []).map((s) => s.name).filter(Boolean).join(', ')}
                                    </p>
                                </div>
                                <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${badgeClass}`}>
                                    {badgeText}
                                </div>
                            </div>
                                );
                            })()}

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(d.stops || []).map((s, i) => (
                                    <div key={`${d.day}-${i}`} className="rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="text-sm font-extrabold text-foreground dark:text-dark-foreground">{s.name}</div>
                                            {s.source === 'placeholder' ? (
                                                <div className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200">
                                                    Flexible
                                                </div>
                                            ) : null}
                                        </div>
                                        {s.description ? (
                                            <div className="mt-1 text-sm text-muted-foreground dark:text-dark-muted-foreground">{s.description}</div>
                                        ) : null}
                                        {typeof s.distanceKmFromCenter === 'number' ? (
                                            <div className="mt-2 text-xs text-muted-foreground dark:text-dark-muted-foreground">
                                                Approx {s.distanceKmFromCenter} km from {plan.destination}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };


        return (
                <div className="bg-background dark:bg-dark-background pb-24">
                        <header className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent pointer-events-none"></div>
                            <div className="relative">
                                <div className="h-32vh-dvh sm:h-38vh-dvh md:h-48vh-dvh lg:h-56vh-dvh bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=2000')" }}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60"></div>
                                    <div className="container mx-auto px-4 sm:px-6 h-full flex items-center">
                                        <div className="max-w-4xl text-white relative z-10">
                                            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold font-display leading-tight drop-shadow-lg">Trip Planner</h1>
                                            <p className="mt-3 sm:mt-4 text-sm md:text-lg text-white/90 max-w-2xl">Start from the admin itinerary, then adjust it based on your preferences.</p>
                                            <div className="mt-6 flex gap-4">
                                                <button onClick={() => document.getElementById('trip-planner-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-black px-5 py-3 rounded-full shadow-xl">
                                                    Get Started
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <svg className="w-full -mt-1" viewBox="0 0 1440 80" preserveAspectRatio="none"><path d="M0,32 C240,96 480,0 720,32 C960,64 1200,16 1440,48 L1440 80 L0 80 Z" fill="#fff" opacity="0.95"></path></svg>
                            </div>
                        </header>

                        <div id="trip-planner-form" className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-4xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-display text-foreground dark:text-dark-foreground">Design Your Dream Adventure</h2>
                    <p className="mt-4 text-lg text-muted-foreground dark:text-dark-muted-foreground">Start from an admin-created base itinerary, then extend it with nearby places based on your interests.</p>
                </div>
                                <div className="w-full">
                                        {!generatedPlan && (
                                            <form onSubmit={handleSubmit} className="bg-gradient-to-br from-white/60 to-slate-50 dark:from-black/60 dark:to-neutral-900 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 border border-border dark:border-dark-border">
                                                <div className="flex items-center justify-between gap-4 mb-2">
                                                    <div>
                                                        <h3 className="text-xl font-extrabold tracking-tight">Customize Your Trip</h3>
                                                        <p className="text-sm text-muted-foreground">Fill the basics and get a draft day-by-day itinerary.</p>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground font-black uppercase tracking-wider">Step 1 of 2</div>
                                                </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="travelers" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Number of Riders</label>
                                <input type="number" name="travelers" id="travelers" value={formData.travelers} onChange={handleInputChange} min="1" required className="mt-1 block w-full px-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                            </div>
                             <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Desired Trip Duration (days)</label>
                                <input type="number" name="duration" id="duration" value={formData.duration} onChange={handleInputChange} min="3" max="30" required className="mt-1 block w-full px-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="destination" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Destination / Region</label>
                            <select
                                name="destination"
                                id="destination"
                                value={formData.destination}
                                onChange={handleDestinationChange}
                                required
                                className="mt-1 block w-full px-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"
                            >
                                {destinationOptions.length === 0 ? (
                                    <option value="">No destinations yet (create a trip in Admin)</option>
                                ) : null}
                                {destinationOptions.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground dark:text-dark-muted-foreground">
                                This dropdown is built from destinations on trips created by admin.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="tripId" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Base trip (admin itinerary)</label>
                            <select
                                name="tripId"
                                id="tripId"
                                value={formData.tripId}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"
                            >
                                {(baseTripOptions.length ? baseTripOptions : trips).map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.duration} days)
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground dark:text-dark-muted-foreground">
                                We start from the itinerary set by admin for this trip, then adjust based on your preferences.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Start date (optional)</label>
                                <div className="relative mt-1">
                                  <input
                                    ref={startDateRef}
                                    type="date"
                                    name="startDate"
                                    id="startDate"
                                    value={formData.startDate}
                                    min={todayLocal}
                                    onChange={handleInputChange}
                                    className="date-input block w-full pr-12 pl-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openDatePicker(startDateRef)}
                                    className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground dark:text-dark-muted-foreground hover:text-foreground dark:hover:text-dark-foreground pointer-events-none"
                                    aria-label="Open start date picker"
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M8 2v2M16 2v2" />
                                      <path d="M3 10h18" />
                                      <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                                    </svg>
                                  </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">End date (optional)</label>
                                <div className="relative mt-1">
                                  <input
                                    ref={endDateRef}
                                    type="date"
                                    name="endDate"
                                    id="endDate"
                                    value={formData.endDate}
                                    min={formData.startDate && formData.startDate > todayLocal ? formData.startDate : todayLocal}
                                    onChange={handleInputChange}
                                    className="date-input block w-full pr-12 pl-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openDatePicker(endDateRef)}
                                    className="absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground dark:text-dark-muted-foreground hover:text-foreground dark:hover:text-dark-foreground pointer-events-none"
                                    aria-label="Open end date picker"
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M8 2v2M16 2v2" />
                                      <path d="M3 10h18" />
                                      <path d="M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                                    </svg>
                                  </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="style" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Preferred Travel Style</label>
                            <select name="style" id="style" value={formData.style} onChange={handleInputChange} className="mt-1 block w-full px-4 py-3 sm:py-2 border border-border dark:border-dark-border rounded-lg text-base sm:text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground">
                                <option>Adventure Focused</option>
                                <option>Leisure & Sightseeing</option>
                                <option>Cultural Immersion</option>
                                <option>Photography Focused</option>
                                <option>A Mix of Everything</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Interests</label>
                            <div className="mt-3 flex flex-wrap gap-3">
                                {(['mountain','valley','river','lakes','monasteries','culture','adventure','photography'] as InterestTag[]).map((tag) => {
                                    const checked = (formData.interestTags || []).includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => handleInterestToggle(tag)}
                                            className={`px-4 py-2.5 sm:py-2 rounded-full font-semibold text-sm border-2 transition-all active:scale-95 ${
                                                checked
                                                    ? 'bg-brand-primary border-brand-primary text-white shadow-lg'
                                                    : 'bg-white dark:bg-neutral-800 border-border dark:border-dark-border text-foreground dark:text-dark-foreground hover:border-brand-primary'
                                            }`}
                                        >
                                            <span className="capitalize">{tag}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground dark:text-dark-muted-foreground">
                                Used to extend your itinerary when the base plan is shorter than your requested duration.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Notes (optional)</label>
                            <textarea name="notes" id="notes" value={formData.notes} onChange={handleInputChange} placeholder="Any must-see places or special requests (optional)." rows={4} className="mt-1 block w-full px-4 py-3 border border-border dark:border-dark-border rounded-lg text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"></textarea>
                        </div>
                                                <div>
                                                        <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-4 sm:py-3 px-8 rounded-full transition-all duration-300 text-base sm:text-lg disabled:bg-brand-primary/50 shadow-xl active:scale-95">
                                                                <SparklesIcon className="w-6 h-6"/>
                                                                {isLoading ? 'Building...' : 'Build My Itinerary'}
                                                        </button>
                                                </div>
                                            </form>
                                        )}

                                        {generatedPlan && (
                                            <div className="mt-6 bg-card dark:bg-dark-card p-6 md:p-8 rounded-3xl shadow-2xl border border-border">
                                                {renderPlan(generatedPlan)}

                                                <div className="mt-10 pt-10 border-t border-border dark:border-dark-border text-center">
                                                        <h3 className="text-2xl sm:text-3xl font-bold font-display text-foreground dark:text-dark-foreground">Ready for the Next Step?</h3>
                                                        <p className="mt-4 text-base sm:text-lg text-muted-foreground dark:text-dark-muted-foreground max-w-2xl mx-auto leading-relaxed">Like what you see? Contact our experts to get a detailed quote, make adjustments, and book your unforgettable Himalayan adventure.</p>
                                                        <div className="mt-8 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-4">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            try {
                                                                            localStorage.setItem('lastItinerary', buildQuotePrefillMessage());
                                                                            } catch (e) {}
                                                                            onNavigateContact();
                                                                        }}
                                                                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 sm:py-3 px-8 rounded-full transition-all duration-300 active:scale-95 shadow-lg text-base sm:text-base"
                                                                    >
                                                                        Request a Quote
                                                                    </button>
                                                                 <button 
                                                                        type="button"
                                                                        onClick={handleStartOver}
                                                                        className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-800 text-white font-bold py-4 sm:py-3 px-8 rounded-full transition-all duration-300 active:scale-95 shadow-lg text-base sm:text-base"
                                                                >
                                                                        Start Over
                                                                </button>
                                                        </div>
                                                </div>
                                            </div>
                                        )}
                                </div>
                
                <div id="results-section" className="mt-8 sm:mt-6">
                    {isLoading && <LoadingSpinner />}
                    {error && (
                         <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-5 sm:p-4 rounded-lg text-center space-y-3">
                            <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Something went wrong</h3>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                            <button type="button" onClick={handleStartOver} className="text-sm font-semibold text-red-800 dark:text-red-200 hover:underline active:opacity-50">Try Again</button>
                         </div>
                    )}
                </div>
                
                
            </div>
        </div>
    );
};

export default CustomizePage;
