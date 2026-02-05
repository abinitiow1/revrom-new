
import React, { useEffect, useRef, useState } from 'react';
import type { SiteContent } from '../types';
import { submitContactMessage } from '../services/contactMessageService';
import TurnstileAuthModal from '../components/TurnstileAuthModal';
import { safeMailtoHref } from '../utils/sanitizeUrl';

interface ContactPageProps {
    siteContent: SiteContent;
}

const MailIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const PhoneIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z" />
    </svg>
);

const LocationIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
);


const ContactPage: React.FC<ContactPageProps> = ({ siteContent }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [message, setMessage] = useState(() => {
        try {
            return localStorage.getItem('lastItinerary') || '';
        } catch (e) {
            return '';
        }
    });
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string; whatsappNumber?: string; message?: string }>({});
    const [honeypot, setHoneypot] = useState('');
    const [notice, setNotice] = useState<string>('');
    const [authOpen, setAuthOpen] = useState(false);
    const authAuthorizeRef = useRef<((token: string) => Promise<void>) | null>(null);
    const postAuthActionRef = useRef<(() => void) | null>(null);
    const wasAuthOpenRef = useRef(false);
    const pendingTabRef = useRef<Window | null>(null);
    const contactEmailHref = safeMailtoHref(siteContent.contactEmail);

    const turnstileSiteKey = String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '').trim();

    useEffect(() => {
        // Run "post-auth" actions only after the modal is fully closed (so the widget is destroyed first).
        const wasOpen = wasAuthOpenRef.current;
        if (wasOpen && !authOpen) {
            const fn = postAuthActionRef.current;
            postAuthActionRef.current = null;
            try { fn?.(); } finally {
                // Always clear pending tab ref after we attempt the post-auth action.
                pendingTabRef.current = null;
            }
        }
        wasAuthOpenRef.current = authOpen;
    }, [authOpen]);

    const cancelAuth = () => {
        postAuthActionRef.current = null;
        authAuthorizeRef.current = null;
        try {
            const w = pendingTabRef.current;
            if (w && !w.closed) w.close();
        } catch {}
        pendingTabRef.current = null;
        setIsSubmitting(false);
        setAuthOpen(false);
    };

    const validateForm = () => {
        const newErrors: { name?: string; email?: string; whatsappNumber?: string; message?: string } = {};

        if (!name.trim()) {
            newErrors.name = 'Name is required.';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email address is invalid.';
        }

        if (whatsappNumber.trim()) {
            const digits = whatsappNumber.replace(/\D/g, '');
            if (digits.length < 8 || digits.length > 15) newErrors.whatsappNumber = 'WhatsApp number looks invalid.';
        }

        if (!message.trim()) {
            newErrors.message = 'Message is required.';
        } else if (message.trim().length < 10) {
            newErrors.message = 'Message must be at least 10 characters long.';
        }

        return newErrors;
    };

    const buildWhatsAppUrl = (payload: { name: string; email: string; whatsappNumber?: string; message: string }) => {
        const adminNumber = (siteContent.adminWhatsappNumber || '').replace(/\D/g, '');
        const text = `New website message\n\nName: ${payload.name}\nEmail: ${payload.email}\nWhatsApp: ${payload.whatsappNumber || ''}\n\n${payload.message}`;
        const encoded = encodeURIComponent(text);
        return adminNumber ? `https://wa.me/${adminNumber}?text=${encoded}` : '';
    };

    const buildEmailHref = (payload: { name: string; email: string; whatsappNumber?: string; message: string }) => {
        if (!contactEmailHref) return '';
        const subject = 'Revrom inquiry';
        const body = `Name: ${payload.name}\nEmail: ${payload.email}\nWhatsApp: ${payload.whatsappNumber || ''}\n\n${payload.message}`;
        return `${contactEmailHref}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotice('');

        if (honeypot.trim()) {
            setSubmitted(true);
            return;
        }

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        const whatsappUrl = buildWhatsAppUrl({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message });
        if (!whatsappUrl) {
            setErrors({ message: 'WhatsApp number is not configured. Please try again later.' });
            return;
        }

        // Always authorize via Turnstile modal before opening WhatsApp.
        // Do not open a blank tab before authorization (avoids about:blank on failed verification).
        pendingTabRef.current = null;

        authAuthorizeRef.current = async (token: string) => {
            await submitContactMessage({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message, turnstileToken: token });
        };

        postAuthActionRef.current = () => {
            try {
                window.location.href = whatsappUrl;
            } catch {
                window.location.href = whatsappUrl;
            }
        };

        setIsSubmitting(true);
        setAuthOpen(true);
        return;
    };

    const emailConfigured = !!contactEmailHref;

    const handleEmailInstead = async () => {
        setNotice('');

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        const href = buildEmailHref({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message });
        if (!href) {
            setNotice('Email is not available right now. Please use WhatsApp.');
            return;
        }

        // Always authorize via Turnstile modal before opening email.
        authAuthorizeRef.current = async (token: string) => {
            await submitContactMessage({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message, turnstileToken: token });
        };

        postAuthActionRef.current = () => {
            try { window.location.href = href; } catch {}
        };

        setIsSubmitting(true);
        setAuthOpen(true);
        return;
    };

    return (
        <div className="bg-background dark:bg-dark-background pb-40 sm:pb-24">
            {authOpen ? (
                <TurnstileAuthModal
                    siteKey={turnstileSiteKey}
                    action="forms_contact"
                    title="Verify to continue"
                    description="Complete verification to send your message."
                    onCancel={cancelAuth}
                    authorize={async (token) => {
                        const fn = authAuthorizeRef.current;
                        if (!fn) throw new Error('Verification is not ready. Please try again.');
                        await fn(token);
                    }}
                    onAuthorized={() => {
                        setSubmitted(true);
                        setName('');
                        setEmail('');
                        setWhatsappNumber('');
                        setMessage('');
                        try { localStorage.removeItem('lastItinerary'); } catch (e) {}
                        setErrors({});
                        setNotice('');
                        authAuthorizeRef.current = null;
                        setIsSubmitting(false);
                        setAuthOpen(false);
                    }}
                />
            ) : null}
            <div className="relative h-48 sm:h-64 bg-cover bg-center contact-hero-bg">
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="container mx-auto px-4 sm:px-6 h-full flex items-center justify-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white font-display text-center">Get in Touch</h1>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="md:col-span-2">
                        <h2 className="text-3xl font-bold font-display mb-2 text-foreground dark:text-dark-foreground">Send Us a Message</h2>
                        <p className="text-muted-foreground dark:text-dark-muted-foreground mb-8">Have a question or need more information? Drop us a line!</p>
                        
                        {submitted ? (
                            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-md shadow-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <CheckCircleIcon className="h-6 w-6 text-green-500 dark:text-green-400" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Message Sent!</h3>
                                        <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                                            <p>Thank you for reaching out. We'll get back to you as soon as possible.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="hidden">
                                    <label htmlFor="company">Company</label>
                                    <input id="company" name="company" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} autoComplete="off" />
                                </div>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Full Name</label>
                                    <input type="text" id="name" name="name" autoComplete="name" autoCapitalize="words" value={name} onChange={e => setName(e.target.value)} required className={`mt-1 block w-full px-3 py-2 bg-card dark:bg-dark-card border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-foreground dark:text-dark-foreground ${errors.name ? 'border-red-500' : 'border-border dark:border-dark-border'}`}/>
                                    {errors.name && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.name}</p>}
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Email Address</label>
                                    <input type="email" id="email" name="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} required className={`mt-1 block w-full px-3 py-2 bg-card dark:bg-dark-card border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-foreground dark:text-dark-foreground ${errors.email ? 'border-red-500' : 'border-border dark:border-dark-border'}`}/>
                                    {errors.email && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.email}</p>}
                                </div>
                                <div>
                                    <label htmlFor="whatsapp" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">WhatsApp Number (optional)</label>
                                    <input
                                        type="tel"
                                        id="whatsapp"
                                        name="whatsapp"
                                        autoComplete="tel"
                                        inputMode="tel"
                                        autoCapitalize="none"
                                        value={whatsappNumber}
                                        onChange={e => setWhatsappNumber(e.target.value)}
                                        placeholder="+91 00000 00000"
                                        className={`mt-1 block w-full px-3 py-2 bg-card dark:bg-dark-card border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-foreground dark:text-dark-foreground ${errors.whatsappNumber ? 'border-red-500' : 'border-border dark:border-dark-border'}`}
                                    />
                                    {errors.whatsappNumber && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.whatsappNumber}</p>}
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-muted-foreground dark:text-dark-muted-foreground">Message</label>
                                    <textarea id="message" name="message" value={message} onChange={e => setMessage(e.target.value)} required rows={5} className={`mt-1 block w-full px-3 py-2 bg-card dark:bg-dark-card border rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm text-foreground dark:text-dark-foreground ${errors.message ? 'border-red-500' : 'border-border dark:border-dark-border'}`}></textarea>
                                    {errors.message && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.message}</p>}
                                    {notice && <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">{notice}</p>}
                                </div>
                                
                                <div>
                                    <div className="hidden sm:flex flex-col sm:flex-row gap-3">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1DA851] disabled:bg-[#25D366]/50 text-white font-bold py-3 px-8 rounded-md transition-colors duration-300 text-lg"
                                        >
                                            {isSubmitting ? 'Verifying...' : 'Send on WhatsApp'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleEmailInstead}
                                            disabled={isSubmitting || !emailConfigured}
                                            aria-disabled={isSubmitting || !emailConfigured}
                                            title={emailConfigured ? 'Opens your email app' : 'Admin email is not configured'}
                                            className={`w-full sm:w-auto px-8 py-3 rounded-md border font-bold text-lg transition-colors disabled:opacity-60 ${
                                              emailConfigured
                                                ? 'border-border dark:border-dark-border bg-card dark:bg-dark-card hover:border-brand-primary'
                                                : 'border-border/40 dark:border-white/10 bg-muted/20 dark:bg-white/5 text-muted-foreground cursor-not-allowed'
                                            }`}
                                        >
                                            Email
                                        </button>
                                    </div>
                                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[100]">
                                      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-border/30 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)]">
                                        <div className="flex items-stretch gap-3">
                                          <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 bg-[#25D366] hover:bg-[#1DA851] disabled:bg-[#25D366]/50 text-white font-bold py-3 px-4 rounded-md transition-colors duration-300 text-sm"
                                            aria-label="Open WhatsApp to send message"
                                            title="Opens WhatsApp"
                                          >
                                            {isSubmitting ? 'Opening…' : 'WhatsApp'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleEmailInstead}
                                            disabled={isSubmitting || !emailConfigured}
                                            aria-disabled={isSubmitting || !emailConfigured}
                                            title={emailConfigured ? 'Opens your email app' : 'Admin email is not configured'}
                                            className={`flex-1 py-3 px-4 rounded-md border font-bold text-sm transition-colors disabled:opacity-60 ${
                                              emailConfigured
                                                ? 'border-border dark:border-dark-border bg-card dark:bg-dark-card hover:border-brand-primary'
                                                : 'border-border/40 dark:border-white/10 bg-muted/20 dark:bg-white/5 text-muted-foreground cursor-not-allowed'
                                            }`}
                                          >
                                            Email
                                          </button>
                                        </div>
                                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70 text-center">
                                          Opens WhatsApp or email{emailConfigured ? '' : ' (email not configured)'}.
                                        </p>
                                      </div>
                                    </div>
                                    <p className="hidden sm:block mt-2 text-xs text-muted-foreground dark:text-dark-muted-foreground">
                                        Choose WhatsApp{emailConfigured ? ' or email' : ''}. We'll open your app with the message ready{emailConfigured ? '' : ' (email not configured)'}.
                                    </p>
                                </div>
                            </form>
                        )}
                    </div>
                    
                    <aside className="md:col-span-1">
                         <div className="bg-card dark:bg-dark-card p-8 rounded-lg shadow-md border border-border dark:border-dark-border">
                            <h3 className="text-2xl font-bold font-display mb-4 text-foreground dark:text-dark-foreground">Contact Information</h3>
                            <ul className="space-y-4 text-muted-foreground dark:text-dark-muted-foreground">
                                <li className="flex items-start">
                                    <MailIcon className="w-6 h-6 text-brand-primary mr-3 mt-1 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-foreground dark:text-dark-foreground">Email</h4>
                                        {contactEmailHref ? (
                                          <a href={contactEmailHref} className="hover:text-brand-primary-dark break-all">{siteContent.contactEmail}</a>
                                        ) : (
                                          <span className="break-all">{siteContent.contactEmail}</span>
                                        )}
                                    </div>
                                </li>
                                 <li className="flex items-start">
                                    <PhoneIcon className="w-6 h-6 text-brand-primary mr-3 mt-1 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-foreground dark:text-dark-foreground">Phone</h4>
                                        <span>{siteContent.contactPhone}</span>
                                    </div>
                                </li>
                                 <li className="flex items-start">
                                    <LocationIcon className="w-6 h-6 text-brand-primary mr-3 mt-1 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-foreground dark:text-dark-foreground">Address</h4>
                                        <p>{siteContent.contactAddress}</p>
                                    </div>
                                </li>
                            </ul>
                         </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
