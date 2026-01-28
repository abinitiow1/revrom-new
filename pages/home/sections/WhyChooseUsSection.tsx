import React, { useMemo } from 'react';
import type { SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';

type Props = {
  siteContent: SiteContent;
  sectionConfig: SiteContent['homePageLayout'][number];
};

const WhyChooseUsSection: React.FC<Props> = ({ siteContent, sectionConfig }) => {
  const whyCards = useMemo(
    () => (siteContent.whyChooseUsCards || []).filter((c) => c && (c.title || c.desc || c.icon)),
    [siteContent.whyChooseUsCards],
  );

  return (
    <section
      className="py-24"
      style={getActiveBgStyle(siteContent.whyChooseUsBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="container mx-auto px-4 sm:px-6 text-center mb-16">
        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">
          {siteContent.whyChooseUsKicker || 'The Revrom Edge'}
        </h2>
        <h3 className="text-4xl font-black font-display italic tracking-tight">
          {siteContent.whyChooseUsTitle || 'Why We Lead the Pack'}
        </h3>
      </div>
      <div className="container mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
        {(whyCards.length
          ? whyCards
          : [
              { title: 'Local Expertise', desc: 'We know these mountains inside out.', icon: 'LOCAL' },
              { title: 'Safety First', desc: 'Support and backup on every trip.', icon: 'SAFE' },
              {
                title: 'Reliable Bikes',
                desc: 'Well-prepared bikes tuned for high-altitude performance.',
                icon: 'BIKE',
              },
            ]
        ).map((perk) => (
          <div
            key={`${perk.title}-${perk.icon}`}
            className="text-center p-8 rounded-[2rem] bg-slate-50 dark:bg-neutral-900 border border-border dark:border-dark-border hover:border-brand-primary transition-all"
          >
            <div className="text-5xl mb-6">{perk.icon}</div>
            <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">
              {perk.title}
            </h4>
            <p className="text-muted-foreground text-sm leading-relaxed">{perk.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
