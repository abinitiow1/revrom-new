import React from 'react';
import type { SiteContent } from '../../../types';
import Button from '../../../components/Button';

type Props = {
  siteContent: SiteContent;
  onNavigateCustomize: () => void;
};

const HeroSection: React.FC<Props> = ({ siteContent, onNavigateCustomize }) => {
  return (
    <section className="relative h-[70vh] sm:h-[80vh] lg:h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={
            siteContent.heroBgImage ||
            'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=2000'
          }
          alt="Revrom hero background"
          className="w-full h-full object-cover scale-105"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl">
          <span className="inline-block bg-brand-primary text-white text-[9px] sm:text-[10px] font-black uppercase tracking-[0.35em] px-4 sm:px-5 py-2 rounded-full mb-5 sm:mb-6 shadow-xl">
            {siteContent.heroBadgeText || ''}
          </span>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-display text-white leading-none italic tracking-tighter mb-4 sm:mb-6">
            {siteContent.heroTitle}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/85 font-medium mb-7 sm:mb-10 max-w-xl leading-relaxed">
            {siteContent.heroSubtitle}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                document.getElementById('adventures')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              {siteContent.heroPrimaryCtaLabel || 'Browse Tours'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={onNavigateCustomize}
              className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 dark:bg-white/10 dark:border-white/30 dark:text-white dark:hover:bg-white/20"
            >
              {siteContent.heroSecondaryCtaLabel || 'Plan Your Trip'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

