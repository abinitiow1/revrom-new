
import React, { useState } from 'react';
import type { ItineraryQuery, SiteContent, Trip } from '../types';
import Turnstile from '../components/Turnstile';

interface BookingPageProps {
  trip: Trip;
  onBack: () => void;
  siteContent: SiteContent;
  onAddInquiry: (query: Omit<ItineraryQuery, 'id' | 'date'>) => void;
}

const WhatsAppIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.77.46 3.45 1.29 4.93L2 22l5.25-1.38c1.41.78 2.99 1.21 4.68 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM16.88 15.18c-.3-.15-1.76-.86-2.03-1.02-.27-.15-.47-.15-.67.15-.2.29-.76.96-.94 1.15-.17.19-.34.22-.64.07-.3-.15-1.31-.48-2.5-1.54-1.2-1.06-1.55-1.84-1.71-2.14-.15-.3-.02-.46.13-.61.13-.13.29-.35.44-.52.15-.17.2-.22.3-.37.1-.15.05-.29-.02-.44-.08-.15-.67-1.61-.92-2.19-.24-.58-.49-.5-.67-.5h-.4c-.2 0-.5.08-.76.33-.26.25-.98.96-.98 2.37 0 1.41.93 2.78 1.06 2.96.13.19 1.91 3.01 4.63 4.1.72.29 1.28.46 1.71.58.71.2 1.35.17 1.86.1.56-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.45-.08-.15-.28-.22-.58-.38z" />
    </svg>
);

const UserGroupIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-2.533-3.676 2.25 2.25 0 01-1.341-2.146c0-.527.115-1.026.315-1.48a4.5 4.5 0 00-6.101-5.917 4.5 4.5 0 00-5.871 5.869 2.25 2.25 0 011.34 2.147 4.125 4.125 0 00-2.533 3.676 9.337 9.337 0 004.121.952 9.38 9.38 0 002.625-.372" />
    </svg>
);

const HomeIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
);

const BookingPage: React.FC<BookingPageProps> = ({ trip, onBack, siteContent, onAddInquiry }) => {
  const [travelers, setTravelers] = useState(1);
  const [roomType, setRoomType] = useState<'double' | 'single'>('double');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');

  const turnstileSiteKey = String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '').trim();
  const isLocalhost = typeof window !== 'undefined' && window.location?.hostname === 'localhost';
  const isProduction = typeof window !== 'undefined' && (window.location?.hostname === 'revrom.in' || window.location?.hostname === 'www.revrom.in' || window.location?.hostname === 'revrom.vercel.app');
  const requiresTurnstile = isProduction && !!turnstileSiteKey;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTurnstileError('');

    // Do not block WhatsApp on missing fields (keep conversion flow).
    // We only use these fields to improve the message + optionally save a lead.
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setFormNotice('Tip: add your name, email, and WhatsApp number for faster follow-up.');
    }

    // Save a lead for admin visibility when we have usable details.
    // (Supabase schema enforces 8-15 digits for whatsapp_number.)
    try {
      const normalizedPhone = (phone || '').replace(/\\D/g, '');
      const normalizedName = (name || '').trim();
      if (normalizedPhone.length >= 8 && normalizedPhone.length <= 15) {
        const needsVerification = isProduction && !!turnstileSiteKey;
        if (needsVerification && !turnstileToken) {
          // Do not block WhatsApp; just skip saving the lead if verification is missing.
          setTurnstileError('Please complete verification.');
        } else {
          onAddInquiry({
            tripId: trip.id,
            tripTitle: trip.title,
            name: normalizedName.length >= 2 ? normalizedName : 'Web User',
            whatsappNumber: normalizedPhone,
            planningTime: `${travelers} traveler(s), ${roomType === 'double' ? 'Twin Sharing' : 'Single Room'}`,
            // Pass token through for server-side save; not persisted in DB.
            ...(turnstileToken ? ({ turnstileToken } as any) : {}),
          } as any);
          setTurnstileToken('');
        }
      }
    } catch {}

    const adminPhone = siteContent.adminWhatsappNumber.replace(/\D/g, '');
    const message = `TRIP INQUIRY:
Adventure: ${trip.title}
Region: ${trip.destination}
Name: ${name}
Email: ${email}
WhatsApp: ${phone}
Number of Travelers: ${travelers}
Room Type: ${roomType === 'double' ? 'Twin Sharing' : 'Single Room'}

I'm interested in joining this trip. Please send me more details. Thank you!`;
    
    const w = window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    try {
      if (w) (w as any).opener = null;
    } catch {}
  };

  return (
    <div className="bg-background dark:bg-dark-background min-h-screen pb-24 lg:pb-0">
      <div className="container mx-auto px-6 py-12 md:py-20 max-w-7xl">
          <button onClick={onBack} className="text-xs sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary active:text-brand-primary-dark px-4 py-2 sm:py-1 mb-12 flex items-center gap-2 transition-all group bg-slate-50 dark:bg-neutral-900/50 rounded-lg active:scale-95">
            <span className="group-hover:-translate-x-1 active:-translate-x-1 transition-transform">&larr;</span> BACK
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            <div className="lg:col-span-8">
              <h1 className="text-4xl md:text-5xl font-black font-display italic tracking-tight mb-4 uppercase leading-none">Book Your Trip</h1>
              <p className="text-muted-foreground dark:text-dark-muted-foreground mb-12 text-sm md:text-base max-w-2xl leading-relaxed">Let us know you're interested in the {trip.title}. Share your details below and we'll get back to you with all the information you need.</p>

              <form onSubmit={handleSubmit} className="space-y-12">
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-8">Traveler Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card dark:bg-dark-card p-6 sm:p-8 rounded-3xl border border-border dark:border-dark-border shadow-sm group hover:border-brand-primary/30 transition-all">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 sm:opacity-40 block mb-6">Number of Travelers</label>
                            <div className="flex items-center gap-6">
                                <button type="button" onClick={() => setTravelers(Math.max(1, travelers - 1))} className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center font-black hover:bg-slate-200 transition-colors shadow-sm active:scale-90">-</button>
                                <span className="text-2xl font-black min-w-[20px] text-center">{travelers}</span>
                                <button type="button" onClick={() => setTravelers(travelers + 1)} className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center font-black hover:bg-slate-200 transition-colors shadow-sm active:scale-90">+</button>
                                <UserGroupIcon className="hidden sm:block w-6 h-6 text-brand-primary ml-auto opacity-20 group-hover:opacity-60 transition-opacity" />
                            </div>
                        </div>

                        <div className="bg-card dark:bg-dark-card p-6 sm:p-8 rounded-3xl border border-border dark:border-dark-border shadow-sm flex flex-col justify-between group hover:border-brand-primary/30 transition-all">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 sm:opacity-40 block mb-6">Accommodation Preference</label>
                            <div className="flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setRoomType('double')}
                                    className={`flex-1 p-3 sm:p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center ${roomType === 'double' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-inner' : 'border-border dark:border-dark-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-neutral-800'}`}
                                >
                                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Twin Sharing</div>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setRoomType('single')}
                                    className={`flex-1 p-3 sm:p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center ${roomType === 'single' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-inner' : 'border-border dark:border-dark-border text-muted-foreground hover:bg-slate-50 dark:hover:bg-neutral-800'}`}
                                >
                                    <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Single Room</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-8">Your Contact Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 sm:opacity-40 block mb-3 pl-1">Full Name</label>
                            <input 
                                id="bookingName"
                                name="name"
                                autoComplete="name"
                                autoCapitalize="words"
                                required 
                                value={name} 
                                onChange={e => { setName(e.target.value); if (formNotice) setFormNotice(''); }} 
                                placeholder="Your full name" 
                                className="w-full bg-slate-50 dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-border/50 focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black outline-none transition-all text-sm font-bold shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-60 sm:opacity-40 block mb-3 pl-1">Email Address</label>
                            <input 
                                id="bookingEmail"
                                name="email"
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                required 
                                type="email" 
                                value={email} 
                                onChange={e => { setEmail(e.target.value); if (formNotice) setFormNotice(''); }} 
                                placeholder="hello@example.com" 
                                className="w-full bg-slate-50 dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-border/50 focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black outline-none transition-all text-sm font-bold shadow-sm"
                            />
                        </div>
                        <div className="md:col-span-2">
                             <label className="text-[10px] font-black uppercase tracking-widest opacity-60 sm:opacity-40 block mb-3 pl-1">WhatsApp Number</label>
                             <input 
                                id="bookingWhatsapp"
                                name="tel"
                                autoComplete="tel"
                                inputMode="tel"
                                autoCapitalize="none"
                                required 
                                type="tel" 
                                value={phone} 
                                onChange={e => { setPhone(e.target.value); if (formNotice) setFormNotice(''); }} 
                                placeholder="+91 00000 00000" 
                                className="w-full bg-slate-50 dark:bg-neutral-900 p-4 sm:p-5 rounded-2xl border border-border/50 focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black outline-none transition-all text-sm font-bold shadow-sm"
                            />
                        </div>
                    </div>
                    {formNotice ? (
                      <div className="text-[12px] font-bold text-amber-700 dark:text-amber-200">{formNotice}</div>
                    ) : null}
                </section>

                {requiresTurnstile ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Verification</div>
                    <Turnstile
                      siteKey={turnstileSiteKey}
                      theme="auto"
                      size="compact"
                      onToken={(t) => setTurnstileToken(t)}
                      onError={(m) => setTurnstileError(m)}
                    />
                    {turnstileError ? (
                      <div className="text-sm text-red-600 dark:text-red-300">{turnstileError}</div>
                    ) : null}
                    <div className="text-[11px] text-muted-foreground dark:text-dark-muted-foreground">
                      This helps prevent spam. Your WhatsApp message will still open even if verification fails.
                    </div>
                  </div>
                ) : null}

                <button 
                    type="submit" 
                    className="w-full hidden lg:flex adventure-gradient text-white py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black focus:ring-brand-primary transition-all items-center justify-center gap-3"
                >
                    <WhatsAppIcon className="w-5 h-5" />
                    INQUIRE VIA WHATSAPP
                </button>
              </form>
            </div>

            <aside className="lg:col-span-4">
               <div className="bg-card dark:bg-dark-card p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-border dark:border-dark-border shadow-adventure-dark overflow-hidden group transition-all hover:shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110 pointer-events-none">
                        <HomeIcon className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-primary mb-6">Trip Summary</h2>
                        <div className="flex justify-between items-start mb-10 pb-10 border-b border-border/50">
                            <div>
                                <h4 className="text-xl sm:text-2xl font-black italic tracking-tighter leading-none mb-2">{trip.title}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{trip.destination}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                <span className="font-black uppercase tracking-widest opacity-40">Travelers</span>
                                <span className="font-bold">{travelers} Person(s)</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] sm:text-xs">
                                <span className="font-black uppercase tracking-widest opacity-40">Room Choice</span>
                                <span className="font-bold">{roomType === 'double' ? 'Twin Sharing' : 'Single Room'}</span>
                            </div>
                            <div className="pt-8 mt-4 border-t border-dashed border-border/50 flex flex-col gap-2">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Pricing Information</span>
                                <div className="flex justify-between items-end">
                                    <span className="text-xl sm:text-2xl font-black italic text-foreground dark:text-dark-foreground tracking-tighter leading-none">PRICING UPON REQUEST</span>
                                </div>
                            </div>
                        </div>
                    </div>
               </div>
            </aside>
          </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden animate-fade-up">
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-border/30 px-6 py-4 flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)]">
            <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Pricing Info</span>
                <span className="text-xl font-black italic tracking-tighter">REQ. PRICING</span>
            </div>
            <button 
                type="button"
                onClick={() => handleSubmit()}
                className="adventure-gradient text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-black focus:ring-brand-primary transition-all flex items-center gap-2"
                aria-label="Send inquiry via WhatsApp"
            >
                <WhatsAppIcon className="w-4 h-4" />
                INQUIRE
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

export default BookingPage;
