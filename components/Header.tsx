
import React, { useState, useRef, useEffect } from 'react';
import type { SiteContent, CustomPage } from '../types';
import type { Theme } from '../App';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateContact: () => void;
  onNavigateBlog: () => void;
  onNavigateGallery: () => void;
  onNavigateCustomize: () => void;
  onNavigateToTours: (destination: string | null) => void;
  onNavigateCustomPage: (slug: string) => void;
  onNavigateAdmin: () => void;
  destinations: string[];
  siteContent: SiteContent;
  theme: Theme;
  toggleTheme: () => void;
  customPages: CustomPage[];
}

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 01.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({ 
  onNavigateHome, 
  onNavigateContact, 
  onNavigateBlog, 
  onNavigateGallery, 
  onNavigateCustomize, 
  onNavigateToTours, 
  onNavigateCustomPage, 
  onNavigateAdmin,
  destinations, 
  siteContent, 
  theme, 
  toggleTheme, 
  customPages 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleMobileNavClick = (navFunction: (arg?: any) => void, arg?: any) => {
    navFunction(arg);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-border dark:border-dark-border">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={onNavigateHome} className="flex items-center space-x-3 group">
            {siteContent.logoUrl ? (
              <img 
                src={siteContent.logoUrl} 
                alt="Revrom Logo" 
                style={{ height: `${siteContent.logoHeight}px` }} 
                className="w-auto object-contain transition-transform group-hover:scale-105" 
              />
            ) : (
              <span className="text-2xl font-black font-display text-brand-primary italic tracking-tighter">REVROM</span>
            )}
          </button>

          <nav className="hidden lg:flex items-center space-x-8">
            <button onClick={onNavigateHome} className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-brand-primary transition-colors">Home</button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-widest text-foreground hover:text-brand-primary transition-colors"
              >
                <span>Our Tours</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-border dark:border-dark-border p-2 animate-fade-in">
                  <button onClick={() => { onNavigateToTours(null); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">All Destinations</button>
                  {destinations.map(dest => (
                    <button key={dest} onClick={() => { onNavigateToTours(dest); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">{dest}</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={onNavigateCustomize} className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-brand-primary transition-colors">Plan Your Trip</button>
            <button onClick={onNavigateBlog} className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-brand-primary transition-colors">Blog</button>
            <button onClick={onNavigateContact} className="text-[10px] font-black uppercase tracking-widest text-foreground hover:text-brand-primary transition-colors">Contact</button>
            <button onClick={onNavigateAdmin} className="text-[10px] font-black uppercase tracking-widest text-brand-primary opacity-50 hover:opacity-100 transition-all border border-brand-primary/20 px-3 py-1 rounded-md">Admin</button>
            
            <div className="h-4 w-px bg-border dark:bg-dark-border mx-2"></div>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </nav>

          <div className="lg:hidden flex items-center space-x-4">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-3 text-foreground bg-slate-100 dark:bg-neutral-900 rounded-xl active:scale-90 transition-transform"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* High-Priority Full Screen Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex flex-col p-6 animate-fade-in">
          {/* Overlay Header */}
          <div className="flex items-center justify-between mb-12 pt-4">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Menu</h2>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:rotate-90 active:scale-90"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Grid */}
          <nav className="flex flex-col space-y-3 flex-grow overflow-y-auto no-scrollbar">
            {[
              { label: 'Home', action: () => handleMobileNavClick(onNavigateHome) },
              { label: 'All Tours', action: () => handleMobileNavClick(onNavigateToTours, null) },
              { label: 'Customize', action: () => handleMobileNavClick(onNavigateCustomize) },
              { label: 'About Us', action: () => handleMobileNavClick(() => onNavigateToTours(null)) },
              { label: 'Gallery', action: () => handleMobileNavClick(onNavigateGallery) },
              { label: 'Blog', action: () => handleMobileNavClick(onNavigateBlog) },
              { label: 'Contact', action: () => handleMobileNavClick(onNavigateContact) },
              { label: 'Admin Panel', action: () => handleMobileNavClick(onNavigateAdmin), special: true }
            ].map((item, idx) => (
              <button 
                key={idx}
                onClick={item.action}
                className={`w-full text-left p-6 rounded-2xl border transition-all active:scale-[0.98] ${
                  item.special 
                  ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' 
                  : 'bg-slate-900/50 border-white/5 text-white/90 hover:bg-slate-800/70'
                }`}
              >
                <span className="text-lg font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
          
          {/* Decorative Footer */}
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
             <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20">Revrom Expeditions • Native Led</p>
          </div>
        </div>
      )}
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </>
  );
};

export default Header;
