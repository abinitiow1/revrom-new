
import React, { useState } from 'react';
import type { SiteContent } from '../types';
import { subscribeNewsletter } from '../services/newsletterService';
import Turnstile from './Turnstile';

interface FooterProps {
  onNavigateHome: () => void;
  onNavigateContact: () => void;
  onNavigateAdmin: () => void;
  onNavigateBlog: () => void;
  onNavigateGallery: () => void;
  onNavigateCustomize: () => void;
  onNavigateCustomPage: (slug: string) => void;
  siteContent: SiteContent;
}

const FacebookIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
);

const InstagramIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.585-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.585.069-4.85c.149-3.225 1.664 4.771 4.919 4.919 1.266-.057 1.645-.069 4.85-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" />
    </svg>
);

const YoutubeIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
);

const FooterLocationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M11.999 2.25c-3.727 0-6.75 3.023-6.75 6.75 0 5.214 6.027 12.317 6.283 12.617a.75.75 0 0 0 1.134 0c.256-.3 6.284-7.403 6.284-12.617 0-3.727-3.023-6.75-6.75-6.75Zm0 9.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
  </svg>
);

const FooterPhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.25 6.75A4.5 4.5 0 0 1 6.75 2.25h1.372c.86 0 1.61.586 1.819 1.42l.82 3.28a1.875 1.875 0 0 1-1.07 2.17l-1.513.756a11.034 11.034 0 0 0 6.844 6.844l.756-1.513a1.875 1.875 0 0 1 2.17-1.07l3.28.82c.834.209 1.42.959 1.42 1.82v1.372a4.5 4.5 0 0 1-4.5 4.5h-.75C9.51 22.5 2.25 15.24 2.25 6.75v-.75Z" />
  </svg>
);

const FooterMailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.5 6.75A3.75 3.75 0 0 1 5.25 3h13.5A3.75 3.75 0 0 1 22.5 6.75v10.5A3.75 3.75 0 0 1 18.75 21H5.25A3.75 3.75 0 0 1 1.5 17.25V6.75Zm3.06-.75 6.94 4.63c.312.208.718.208 1.03 0L19.44 6H4.56Z" />
  </svg>
);

const Footer: React.FC<FooterProps> = ({ 
  onNavigateHome, 
  onNavigateContact, 
  onNavigateAdmin, 
  onNavigateBlog, 
  onNavigateGallery, 
  onNavigateCustomize,
  onNavigateCustomPage,
  siteContent 
}) => {
  const currentYear = new Date().getFullYear();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterToast, setNewsletterToast] = useState<string | null>(null);
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileError, setTurnstileError] = useState('');

  const turnstileSiteKey = String((import.meta as any).env?.VITE_TURNSTILE_SITE_KEY || '').trim();
  const isLocalhost = typeof window !== 'undefined' && window.location?.hostname === 'localhost';
  const needsVerification = !isLocalhost;

  const showNewsletterToast = (text: string) => {
    setNewsletterToast(text);
    window.setTimeout(() => setNewsletterToast(null), 2500);
  };

  return (
    <footer className="bg-card dark:bg-dark-card border-t border-border dark:border-dark-border pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6">
        {newsletterToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] px-4 py-3 rounded-xl shadow-lg bg-emerald-600 text-white text-xs font-black uppercase tracking-widest max-w-[90vw] text-center">
            {newsletterToast}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <button onClick={onNavigateHome} className="flex items-center space-x-3 cursor-pointer group">
              {siteContent.logoUrl ? (
                <img 
                  src={siteContent.logoUrl} 
                  alt="Revrom Logo" 
                  loading="lazy"
                  decoding="async"
                  style={{ height: `${siteContent.logoHeight}px` }} 
                  className="w-auto object-contain transition-transform group-hover:scale-105" 
                />
              ) : (
                <span className="text-2xl font-black font-display text-brand-primary italic tracking-tighter">REVROM.IN</span>
              )}
            </button>
            <p className="text-muted-foreground dark:text-dark-muted-foreground leading-relaxed italic text-sm">
              "{siteContent.footerTagline}"
            </p>
            <div className="flex items-center space-x-4">
              {!!siteContent.facebookUrl && (
                <a href={siteContent.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand-primary transition-colors" title="Facebook">
                  <FacebookIcon className="w-6 h-6" />
                </a>
              )}
              {!!siteContent.instagramUrl && (
                <a href={siteContent.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand-primary transition-colors" title="Instagram">
                  <InstagramIcon className="w-6 h-6" />
                </a>
              )}
              {!!siteContent.youtubeUrl && (
                <a href={siteContent.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand-primary transition-colors" title="YouTube">
                  <YoutubeIcon className="w-6 h-6" />
                </a>
              )}
            </div>
          </div>

          {/* Navigation Column */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-foreground dark:text-dark-foreground">Quick Links</h3>
            <ul className="space-y-4">
              <li><button onClick={onNavigateHome} className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary transition-colors">Home</button></li>
              <li><button onClick={onNavigateCustomize} className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary transition-colors">Customize Your Tour</button></li>
              <li><button onClick={onNavigateGallery} className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary transition-colors">Photo Gallery</button></li>
              <li><button onClick={onNavigateBlog} className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary transition-colors">Travel Blog</button></li>
              <li><button onClick={onNavigateContact} className="text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-primary transition-colors">Contact Us</button></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-foreground dark:text-dark-foreground">Reach Us</h3>
            <ul className="space-y-4 text-muted-foreground dark:text-dark-muted-foreground">
              <li className="flex items-start">
                <FooterLocationIcon className="w-5 h-5 text-brand-primary mr-3 mt-0.5 shrink-0" />
                <span className="text-xs font-bold">{siteContent.contactAddress}</span>
              </li>
              <li className="flex items-center">
                <FooterPhoneIcon className="w-5 h-5 text-brand-primary mr-3 shrink-0" />
                <span className="text-xs font-bold">{siteContent.contactPhone}</span>
              </li>
              <li className="flex items-center">
                <FooterMailIcon className="w-5 h-5 text-brand-primary mr-3 shrink-0" />
                <a href={`mailto:${siteContent.contactEmail}`} className="text-xs font-bold hover:text-brand-primary transition-colors break-all">
                  {siteContent.contactEmail}
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter / CTA Column */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 text-foreground dark:text-dark-foreground">Newsletter</h3>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground dark:text-dark-muted-foreground mb-4 opacity-60">Subscribe for updates and offers.</p>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (newsletterHoneypot.trim()) return;
                const email = (newsletterEmail || '')
                  .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
                  .trim()
                  .toLowerCase();
                if (!/\S+@\S+\.\S+/.test(email)) {
                  showNewsletterToast('Enter a valid email');
                  return;
                }

                // Client-side throttle: only block if the previous *successful* submit was recent.
                // Do not set the timestamp before the request, otherwise a failed request "locks" the user out.
                try {
                  const key = 'newsletter_last_submit_ts';
                  const last = Number(localStorage.getItem(key) || '0');
                  const now = Date.now();
                  if (last && now - last < 30_000) {
                    showNewsletterToast('Please wait and try again');
                    return;
                  }
                } catch {}

                setNewsletterSubmitting(true);
                try {
                  if (needsVerification) {
                    if (!turnstileSiteKey) {
                      setTurnstileError('Missing VITE_TURNSTILE_SITE_KEY. Add it in Vercel/Cloudflare and redeploy.');
                      return;
                    }
                    if (!turnstileToken) {
                      setTurnstileError('Please complete the verification to subscribe.');
                      return;
                    }
                  }
                  const result = await subscribeNewsletter(email, { turnstileToken: turnstileToken || undefined });
                  try {
                    localStorage.setItem('newsletter_last_submit_ts', String(Date.now()));
                  } catch {}
                  setNewsletterEmail('');
                  setTurnstileToken('');
                  showNewsletterToast(result?.duplicate ? 'Already subscribed' : 'Thanks for subscribing');
                } catch (err: any) {
                  const msg = String(err?.message || '');
                  if (msg.toLowerCase().includes('rate limit')) {
                    showNewsletterToast('Please wait and try again');
                    return;
                  }

                  // Common: token expired / reused or missing.
                  if (
                    msg.toLowerCase().includes('turnstile') ||
                    msg.toLowerCase().includes('verification') ||
                    msg.toLowerCase().includes('token')
                  ) {
                    setTurnstileToken('');
                    setTurnstileError('Verification failed. Please verify again and retry.');
                  }

                  if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
                    showNewsletterToast('Already subscribed');
                    return;
                  }

                  // Surface the actual server error (safe: it never contains secrets, only config/table hints).
                  showNewsletterToast(msg || 'Could not subscribe');
                } finally {
                  setNewsletterSubmitting(false);
                }
              }}
            >
              <div className="hidden">
                <label htmlFor="company2">Company</label>
                <input id="company2" name="company" value={newsletterHoneypot} onChange={(e) => setNewsletterHoneypot(e.target.value)} autoComplete="off" />
              </div>
              <input 
                type="email" 
                id="newsletterEmail"
                name="email"
                autoComplete="email"
                placeholder="EMAIL ADDRESS" 
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  if (turnstileError) setTurnstileError('');
                }}
                disabled={newsletterSubmitting}
                className="w-full p-4 text-[10px] font-black tracking-widest rounded-xl bg-background dark:bg-dark-background border border-border dark:border-dark-border focus:ring-brand-primary focus:ring-1 outline-none text-foreground dark:text-dark-foreground" 
              />
              {!isLocalhost && turnstileSiteKey ? (
                <div className="space-y-2">
                  <Turnstile
                    siteKey={turnstileSiteKey}
                    theme="auto"
                    size="compact"
                    onToken={(t) => {
                      setTurnstileToken(t);
                      setTurnstileError('');
                    }}
                    onError={(m) => setTurnstileError(m)}
                  />
                  {turnstileError ? (
                    <div className="text-[11px] font-bold text-red-600 dark:text-red-300">{turnstileError}</div>
                  ) : null}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={newsletterSubmitting}
                className="w-full adventure-gradient text-white font-black uppercase tracking-widest text-[10px] py-4 px-4 rounded-xl transition-colors shadow-lg shadow-brand-primary/20 disabled:opacity-60"
              >
                {newsletterSubmitting ? 'SAVING...' : 'SUBSCRIBE'}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border dark:border-dark-border pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] text-muted-foreground dark:text-dark-muted-foreground uppercase tracking-[0.2em] font-black">
          <p>(c) {currentYear} REVROM.IN. Ride. Roam. Relax. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <button onClick={() => onNavigateCustomPage('faq')} className="hover:text-brand-primary transition-colors">FAQ</button>
            <button onClick={() => onNavigateCustomPage('privacy-policy')} className="hover:text-brand-primary transition-colors">Privacy Policy</button>
            <button onClick={() => onNavigateCustomPage('terms-and-conditions')} className="hover:text-brand-primary transition-colors">Terms</button>
            <button onClick={onNavigateAdmin} className="hover:text-brand-primary transition-colors opacity-50 hover:opacity-100">Admin</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
