
import React, { useState } from 'react';
import type { SiteContent } from '../types';
import { submitContactMessage } from '../services/contactMessageService';
import Turnstile from '../components/Turnstile';
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
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileError, setTurnstileError] = useState('');
    const contactEmailHref = safeMailtoHref(siteContent.contactEmail);

    const turnstileSiteKey = String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '').trim();
    const isLocalhost = typeof window !== 'undefined' && window.location?.hostname === 'localhost';
    const isProduction = typeof window !== 'undefined' && (window.location?.hostname === 'revrom.in' || window.location?.hostname === 'www.revrom.in' || window.location?.hostname === 'revrom.vercel.app');
    const requiresTurnstile = isProduction && !!turnstileSiteKey;

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

    const isRateLimited = (): boolean => {
        try {
            const key = 'contact_last_submit_ts';
            const last = Number(localStorage.getItem(key) || '0');
            const now = Date.now();
            if (last && now - last < 30_000) return true;
            localStorage.setItem(key, String(now));
            return false;
        } catch {
            return false;
        }
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
        setTurnstileError('');

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

        setIsSubmitting(true);
        try {
            // Save to DB unless the user is rate-limited (prevents spam). WhatsApp send still works.
            if (isRateLimited()) {
                setNotice('Too many attempts, try again later. Opening WhatsApp… (saving is temporarily limited)');
            } else {
                if (!isLocalhost && !turnstileToken) {
                    setNotice('Please complete verification. Opening WhatsApp… (message will still send)');
                } else {
                    await submitContactMessage({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message, turnstileToken: turnstileToken || undefined });
                    setTurnstileToken('');
                }
            }
            setSubmitted(true);
            setName('');
            setEmail('');
            setWhatsappNumber('');
            setMessage('');
            try { localStorage.removeItem('lastItinerary'); } catch (e) {}
            setErrors({});

            // Redirect to WhatsApp (more reliable than popup windows).
            try {
                const w = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                if (!w) window.location.href = whatsappUrl;
            } catch {
                window.location.href = whatsappUrl;
            }
        } catch (err: any) {
            console.error(err);
            // Even if DB save fails, still open WhatsApp for the customer.
            const msg = String(err?.message || '');
            const status = Number(err?.status || 0);
            if (status === 429 || msg.toLowerCase().includes('rate limit')) {
                setNotice('Too many attempts, try again later. Opening WhatsApp… (saving is temporarily limited)');
            } else if (
                status === 400 ||
                status === 401 ||
                status === 403 ||
                msg.toLowerCase().includes('turnstile') ||
                msg.toLowerCase().includes('token') ||
                msg.toLowerCase().includes('verification')
            ) {
                setNotice('Please complete verification. Opening WhatsApp… (message will still send)');
            } else {
                setNotice('Opening WhatsApp…');
            }
            try {
                const w = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                if (!w) window.location.href = whatsappUrl;
            } catch {
                window.location.href = whatsappUrl;
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const emailEnabled = !!contactEmailHref;

    const handleEmailInstead = async () => {
        setNotice('');
        setTurnstileError('');

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        const href = buildEmailHref({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message });
        if (!href) {
            setNotice('Email is not configured. Please use WhatsApp.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Same saving behavior as WhatsApp: best-effort.
            if (isRateLimited()) {
                setNotice('Too many attempts, try again later. Opening email… (saving is temporarily limited)');
            } else {
                if (!isLocalhost && !turnstileToken) {
                    setNotice('Please complete verification. Opening email… (message will still send)');
                } else {
                    await submitContactMessage({ name, email, whatsappNumber: whatsappNumber.trim() || undefined, message, turnstileToken: turnstileToken || undefined });
                    setTurnstileToken('');
                }
            }

            setSubmitted(true);
            setName('');
            setEmail('');
            setWhatsappNumber('');
            setMessage('');
            try { localStorage.removeItem('lastItinerary'); } catch (e) {}
            setErrors({});

            window.location.href = href;
        } catch (err: any) {
            console.error(err);
            const msg = String(err?.message || '');
            const status = Number(err?.status || 0);
            if (status === 429 || msg.toLowerCase().includes('rate limit')) {
                setNotice('Too many attempts, try again later. Opening email… (saving is temporarily limited)');
            } else if (
                status === 400 ||
                status === 401 ||
                status === 403 ||
                msg.toLowerCase().includes('turnstile') ||
                msg.toLowerCase().includes('token') ||
                msg.toLowerCase().includes('verification')
            ) {
                setNotice('Please complete verification. Opening email… (message will still send)');
            } else {
                setNotice('Opening email…');
            }
            try { window.location.href = href; } catch {}
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-background dark:bg-dark-background pb-24">
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
                                {requiresTurnstile ? (
                                    <div className="space-y-2">
                                        <div className="text-sm font-semibold text-foreground dark:text-dark-foreground">Bot Verification</div>
                                        <Turnstile
                                            siteKey={turnstileSiteKey}
                                            theme="auto"
                                            onToken={(t) => setTurnstileToken(t)}
                                            onError={(m) => setTurnstileError(m)}
                                        />
                                        {turnstileError ? <p className="mt-1 text-sm text-red-600 dark:text-red-300">{turnstileError}</p> : null}
                                    </div>
                                ) : null}
                                <div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#1DA851] disabled:bg-[#25D366]/50 text-white font-bold py-3 px-8 rounded-md transition-colors duration-300 text-lg"
                                        >
                                            {isSubmitting ? 'Opening WhatsApp...' : 'Send on WhatsApp'}
                                        </button>
                                        {emailEnabled ? (
                                          <button
                                              type="button"
                                              onClick={handleEmailInstead}
                                              disabled={isSubmitting}
                                              className="w-full sm:w-auto px-8 py-3 rounded-md border border-border dark:border-dark-border bg-card dark:bg-dark-card font-bold text-lg hover:border-brand-primary transition-colors disabled:opacity-60"
                                          >
                                              Email instead
                                          </button>
                                        ) : null}
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground dark:text-dark-muted-foreground">
                                        Choose WhatsApp{emailEnabled ? ' or email' : ''}. We'll open your app with the message ready.
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
