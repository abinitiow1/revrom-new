import React, { useMemo } from 'react';
import type { GalleryPhoto, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';
import { useDisableMarqueeMotion } from '../../../utils/useDisableMarqueeMotion';
import SmartImage from '../../../components/SmartImage';

type Props = {
  siteContent: SiteContent;
  galleryPhotos: GalleryPhoto[];
  sectionConfig: SiteContent['homePageLayout'][number];
  onNavigateGallery: () => void;
};

const GallerySection: React.FC<Props> = ({ siteContent, galleryPhotos, sectionConfig, onNavigateGallery }) => {
  const disableMarqueeMotion = useDisableMarqueeMotion({ disableOnMobile: false });
  const photos = useMemo(() => galleryPhotos || [], [galleryPhotos]);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const minPhotosForMarquee = isMobile ? 4 : 6;
  const enableMarquee = !disableMarqueeMotion && photos.length >= minPhotosForMarquee;

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
            {siteContent.galleryCtaLabel || 'Open Archive ->'}
          </button>
        </div>
      </div>
      <div
        role="region"
        aria-label="Photo gallery carousel"
        tabIndex={0}
        className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 pb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          e.currentTarget.scrollBy({
            left: e.key === 'ArrowRight' ? 320 : -320,
            behavior: 'smooth',
          });
        }}
      >
        {!enableMarquee ? (
          <div className="flex gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group overflow-hidden rounded-3xl h-[320px] w-[250px] sm:h-[360px] sm:w-[280px] md:h-[400px] md:w-[300px] flex-shrink-0 snap-center shadow-lg border border-border/10"
              >
                <SmartImage
                  src={photo.imageUrl}
                  alt={photo.caption}
                  loading="lazy"
                  decoding="async"
                  fill
                  wrapperClassName="absolute inset-0"
                  className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5 sm:p-8">
                  <p className="text-white text-xs font-black uppercase tracking-widest leading-relaxed">
                    {photo.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Important: keep NO gap between the 2 copies, otherwise the translateX(-50%) loop can "drift"
          // and briefly overlap cards on some screen sizes.
          <div className="flex animate-marquee-right-infinite whitespace-nowrap hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {/* Keep an end padding equal to the gap so the loop seam doesn't "crush" cards together. */}
            <div className="flex gap-4 pr-4">
              {photos.map((photo) => (
                <div
                  key={`a-${photo.id}`}
                  className="relative group overflow-hidden rounded-3xl h-[320px] w-[250px] sm:h-[360px] sm:w-[280px] md:h-[400px] md:w-[300px] flex-shrink-0 snap-center shadow-lg border border-border/10"
                >
                  <SmartImage
                    src={photo.imageUrl}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    fill
                    wrapperClassName="absolute inset-0"
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5 sm:p-8">
                    <p className="text-white text-xs font-black uppercase tracking-widest leading-relaxed">
                      {photo.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pr-4" aria-hidden="true">
              {photos.map((photo) => (
                <div
                  key={`b-${photo.id}`}
                  className="relative group overflow-hidden rounded-3xl h-[320px] w-[250px] sm:h-[360px] sm:w-[280px] md:h-[400px] md:w-[300px] flex-shrink-0 snap-center shadow-lg border border-border/10"
                >
                  <SmartImage
                    src={photo.imageUrl}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    fill
                    wrapperClassName="absolute inset-0"
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5 sm:p-8">
                    <p className="text-white text-xs font-black uppercase tracking-widest leading-relaxed">
                      {photo.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default GallerySection;
