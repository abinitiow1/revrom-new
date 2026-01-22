import React, { useState } from 'react';
import type { Trip } from '../types';
import { generateCustomItinerary } from '../services/geminiService';
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
    const [formData, setFormData] = useState({
        tripId: trips?.[0]?.id || '',
        travelers: '2',
        duration: '10',
        startDate: '',
        endDate: '',
        destinations: 'Ladakh, Spiti Valley',
        style: 'Adventure Focused',
        interests: 'High passes like Khardung La, ancient monasteries like Key & Diskit, and pristine lakes like Pangong Tso.'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [generatedItinerary, setGeneratedItinerary] = useState('');
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setGeneratedItinerary('');
        try {
            const itinerary = await generateCustomItinerary(formData, trips);
            setGeneratedItinerary(itinerary);
        } catch (err: any) {
            // Friendly error mapping for common API/key failures
            console.error(err);
            const raw = err?.message || err?.toString() || '';
            if (raw.includes('API key not valid') || raw.includes('API_KEY_INVALID') || raw.includes('INVALID_ARGUMENT')) {
                setError('AI service unavailable: your Google GenAI API key is missing or invalid. Configure a valid API key for the app (see docs).');
            } else if (raw.includes('quota') || raw.includes('insufficient')) {
                setError('AI service limit reached or quota exhausted. Please check your Google Cloud usage and quotas.');
            } else {
                setError('An unexpected error occurred while generating the itinerary. Please try again.');
            }
        } finally {
            setIsLoading(false);
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        }
    };
    
    const handleStartOver = () => {
        setGeneratedItinerary('');
        setError('');
    };

    const buildQuotePrefillMessage = () => {
        const trip = trips.find(t => t.id === formData.tripId);
        const interests = (formData.interests || '').replace(/\s+/g, ' ').trim();
        const dateRange = formData.startDate && formData.endDate
            ? `${formData.startDate} to ${formData.endDate}`
            : (formData.startDate ? `Starting ${formData.startDate}` : (formData.endDate ? `Until ${formData.endDate}` : 'Flexible'));

        const itineraryHint = generatedItinerary
            ? 'I also generated an initial itinerary in your Trip Planner. Please review and suggest the best option.'
            : 'Please suggest the best itinerary for these preferences.';

        return [
            'Hello Revrom, I would like a quote for my trip:',
            '',
            `- Trip: ${trip?.title || formData.destinations || 'Custom plan'}`,
            `- People: ${formData.travelers || '1'} rider(s)`,
            `- Duration: ${formData.duration || 'N/A'} days`,
            `- Dates: ${dateRange}`,
            `- Style: ${formData.style || 'N/A'}`,
            `- Interests: ${interests || 'N/A'}`,
            '',
            itineraryHint,
        ].join('\\n');
    };
    
    const renderMarkdown = (text: string) => {
        const parts = text.split(/(\n)/).map(part => part.trim());
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];
    
        const flushList = () => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-4 text-muted-foreground dark:text-dark-muted-foreground">
                        {listItems.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                );
                listItems = [];
            }
        };
    
        parts.forEach((line, index) => {
            if (line.startsWith('# ')) {
                elements.push(<h1 key={index} className="text-3xl font-bold font-display text-foreground dark:text-dark-foreground mb-4">{line.substring(2)}</h1>);
            } else if (line.startsWith('### ')) {
                elements.push(<h3 key={index} className="text-xl font-semibold text-foreground dark:text-dark-foreground mt-6 mb-2">{line.substring(4)}</h3>);
            } else if (line.startsWith('* ')) {
                listItems.push(line.substring(2));
            } else if (line) {
                flushList();
                elements.push(<p key={index} className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed mb-4">{line}</p>);
            }
        });
    
        flushList();
        return elements;
    };


        return (
                <div className="bg-background dark:bg-dark-background">
                        <header className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent pointer-events-none"></div>
                            <div className="relative">
                                <div className="h-[40vh] md:h-[48vh] lg:h-[56vh] bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80&w=2000')" }}>
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60"></div>
                                    <div className="container mx-auto px-4 sm:px-6 h-full flex items-center">
                                        <div className="max-w-4xl text-white relative z-10">
                                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold font-display leading-tight drop-shadow-lg">AI-Powered Trip Planner</h1>
                                            <p className="mt-4 text-sm md:text-lg text-white/90 max-w-2xl">Design a Himalayan motorcycle adventure tailored to your pace, interests and comfort — our AI drafts a ready-to-review itinerary in seconds.</p>
                                            <div className="mt-6 flex gap-4">
                                                <button onClick={() => window.scrollTo({ top: document.body.scrollHeight / 3, behavior: 'smooth' })} className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-black px-5 py-3 rounded-full shadow-xl">
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

                        <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-7xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-display text-foreground dark:text-dark-foreground">Design Your Dream Adventure</h2>
                    <p className="mt-4 text-lg text-muted-foreground dark:text-dark-muted-foreground">Tell our AI assistant your vision for the perfect Himalayan motorcycle tour. It will craft a custom-tailored preliminary itinerary just for you.</p>
                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                                    <div className="md:col-span-2">
                                        {!generatedItinerary && (
                                            <form onSubmit={handleSubmit} className="bg-gradient-to-br from-white/60 to-slate-50 dark:from-black/60 dark:to-neutral-900 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 border border-border dark:border-dark-border">
                                                <div className="flex items-center justify-between gap-4 mb-2">
                                                    <div>
                                                        <h3 className="text-xl font-extrabold tracking-tight">Customize Your Trip</h3>
                                                        <p className="text-sm text-muted-foreground">Fill the basics and let the AI draft an itinerary.</p>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground font-black uppercase tracking-wider">Step 1 of 2</div>
                                                </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="travelers" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Number of Riders</label>
                                <input type="number" name="travelers" id="travelers" value={formData.travelers} onChange={handleInputChange} min="1" required className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                            </div>
                             <div>
                                <label htmlFor="duration" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Desired Trip Duration (days)</label>
                                <input type="number" name="duration" id="duration" value={formData.duration} onChange={handleInputChange} min="3" max="30" required className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="tripId" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Base trip (admin itinerary)</label>
                            <select
                                name="tripId"
                                id="tripId"
                                value={formData.tripId}
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"
                            >
                                {trips.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title}
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
                                <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">End date (optional)</label>
                                <input type="date" name="endDate" id="endDate" value={formData.endDate} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="destinations" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Preferred Destinations / Regions</label>
                            <input type="text" name="destinations" id="destinations" value={formData.destinations} onChange={handleInputChange} placeholder="e.g., Ladakh, Spiti, Zanskar, Kashmir" required className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"/>
                        </div>
                        <div>
                            <label htmlFor="style" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Preferred Travel Style</label>
                            <select name="style" id="style" value={formData.style} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground">
                                <option>Adventure Focused</option>
                                <option>Leisure & Sightseeing</option>
                                <option>Cultural Immersion</option>
                                <option>Photography Focused</option>
                                <option>A Mix of Everything</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="interests" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">What are you most excited to see or do?</label>
                            <textarea name="interests" id="interests" value={formData.interests} onChange={handleInputChange} placeholder="Tell us about your must-see places, activities, or any special requests." rows={4} required className="mt-1 block w-full px-3 py-2 border border-border dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground"></textarea>
                        </div>
                                                <div>
                                                        <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white font-bold py-3 px-8 rounded-full transition-colors duration-300 text-lg disabled:bg-brand-primary/50 shadow-xl">
                                                                <SparklesIcon className="w-6 h-6"/>
                                                                {isLoading ? 'Crafting Your Adventure...' : 'Generate My Itinerary'}
                                                        </button>
                                                </div>
                                            </form>
                                        )}

                                        {generatedItinerary && (
                                            <div className="mt-6 bg-card dark:bg-dark-card p-6 md:p-8 rounded-3xl shadow-2xl border border-border">
                                                {renderMarkdown(generatedItinerary)}

                                                <div className="mt-8 pt-8 border-t border-border dark:border-dark-border text-center">
                                                        <h3 className="text-2xl font-bold font-display text-foreground dark:text-dark-foreground">Ready for the Next Step?</h3>
                                                        <p className="mt-4 text-lg text-muted-foreground dark:text-dark-muted-foreground max-w-2xl mx-auto">Like what you see? Contact our experts to get a detailed quote, make adjustments, and book your unforgettable Himalayan adventure.</p>
                                                        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                                                                    <button 
                                                                        onClick={() => {
                                                                            try {
                                                                            localStorage.setItem('lastItinerary', buildQuotePrefillMessage());
                                                                            } catch (e) {}
                                                                            onNavigateContact();
                                                                        }}
                                                                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-transform duration-300 transform hover:scale-105 shadow-lg"
                                                                    >
                                                                        Request a Quote
                                                                    </button>
                                                                 <button 
                                                                        onClick={handleStartOver}
                                                                        className="bg-slate-500 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-full transition-transform duration-300 transform hover:scale-105 shadow-lg"
                                                                >
                                                                        Start Over
                                                                </button>
                                                        </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    
                                </div>
                
                <div id="results-section" className="mt-6">
                    {isLoading && <LoadingSpinner />}
                    {error && (
                         <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md text-center">
                            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Something went wrong</h3>
                            <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
                            <button onClick={handleStartOver} className="mt-4 text-sm font-semibold text-red-800 dark:text-red-200 hover:underline">Try Again</button>
                         </div>
                    )}
                </div>
                
                
            </div>
        </div>
    );
};

export default CustomizePage;
