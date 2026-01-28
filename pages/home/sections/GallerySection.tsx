import React, { useMemo } from 'react';
import type { GalleryPhoto, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';

type Props = {
  siteContent: SiteContent;
  galleryPhotos: GalleryPhoto[];
  sectionConfig: SiteContent['homePageLayout'][number];
  onNavigateGallery: () => void;
};

const GallerySection: React.FC<Props> = ({ siteContent, galleryPhotos, sectionConfig, onNavigateGallery }) => {
  const marqueePhotos = useMemo(() => galleryPhotos.concat(galleryPhotos), [galleryPhotos]);

  return (
    <section
      className="py-24 overflow-hidden"
      style={getActiveBgStyle(siteContent.galleryBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="container mx-auto px-4 sm:px-6 mb-12">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">
              {siteContent.galleryKicker || 'Gallery'}
            </h2>
            <h3 className="text-4xl font-black font-display italic tracking-tight">{siteContent.galleryTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onNavigateGallery}
            className="text-xs font-black uppercase tracking-widest hover:text-brand-primary"
          >
            {siteContent.galleryCtaLabel || 'Open Archive →'}
          </button>
        </div>
      </div>
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 px-6 pb-4">
        <div className="flex animate-marquee-right-infinite whitespace-nowrap gap-4 hover:[animation-play-state:paused]">
          {marqueePhotos.map((photo, idx) => (
            <div
              key={`${photo.id}-${idx}`}
              className="relative group overflow-hidden rounded-3xl h-[400px] w-[300px] flex-shrink-0 snap-center shadow-lg border border-border/10"
            >
              <img
                src={photo.imageUrl}
                alt={photo.caption}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                <p className="text-white text-xs font-black uppercase tracking-widest leading-relaxed">
                  {photo.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;

