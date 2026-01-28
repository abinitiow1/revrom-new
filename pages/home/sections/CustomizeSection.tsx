import React from 'react';
import type { SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';

type Props = {
  siteContent: SiteContent;
  sectionConfig: SiteContent['homePageLayout'][number];
  onNavigateCustomize: () => void;
};

const CustomizeSection: React.FC<Props> = ({ siteContent, sectionConfig, onNavigateCustomize }) => {
  return (
    <section
      className="py-16 container mx-auto px-6"
      style={getActiveBgStyle(siteContent.customizeBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="adventure-gradient rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h3 className="text-3xl md:text-5xl font-black font-display text-white italic tracking-tighter mb-4">
            {siteContent.customizeTitle}
          </h3>
          <p className="text-white/80 font-medium">{siteContent.customizeSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={onNavigateCustomize}
          className="relative z-10 bg-white text-brand-primary font-black uppercase tracking-widest text-xs px-10 py-5 rounded-2xl shadow-xl"
        >
          {siteContent.customizeCtaLabel || 'Initialize Custom Build'}
        </button>
      </div>
    </section>
  );
};

export default CustomizeSection;

