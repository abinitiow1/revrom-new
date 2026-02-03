import React, { useMemo } from 'react';
import type { InstagramPost, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';
import { safeExternalUrl } from '../../../utils/sanitizeUrl';
import { useDisableMarqueeMotion } from '../../../utils/useDisableMarqueeMotion';

type Props = {
  siteContent: SiteContent;
  instagramPosts: InstagramPost[];
  sectionConfig: SiteContent['homePageLayout'][number];
};

const InstagramSection: React.FC<Props> = ({ siteContent, instagramPosts, sectionConfig }) => {
  const instagramUrl = safeExternalUrl(siteContent.instagramUrl);
  const disableMarqueeMotion = useDisableMarqueeMotion();
  const marqueePosts = useMemo(() => (disableMarqueeMotion ? instagramPosts : instagramPosts.concat(instagramPosts)), [instagramPosts, disableMarqueeMotion]);

  return (
    <section
      className="py-24 overflow-hidden"
      style={getActiveBgStyle(siteContent.instagramBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="container mx-auto px-4 sm:px-6 text-center mb-16">
        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">
          {siteContent.instagramKicker || 'Live Feed'}
        </h2>
        <h3 className="text-4xl font-black font-display italic tracking-tight mb-4">
          {siteContent.instagramTitle}
        </h3>
        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary font-black uppercase tracking-[0.3em] text-[10px] inline-block hover:underline"
          >
            {siteContent.instagramSubtitle}
          </a>
        ) : (
          <span className="text-brand-primary font-black uppercase tracking-[0.3em] text-[10px] inline-block opacity-70">
            {siteContent.instagramSubtitle}
          </span>
        )}
      </div>
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 px-6 pb-12">
        <div className={disableMarqueeMotion ? 'flex gap-6' : 'flex animate-marquee-left-infinite whitespace-nowrap gap-6 hover:[animation-play-state:paused]'}>
          {marqueePosts.map((post, idx) => (
            <div
              key={`${post.id}-${idx}`}
              className="aspect-square w-[250px] md:w-[320px] rounded-[2.5rem] overflow-hidden relative group flex-shrink-0 snap-center shadow-2xl"
            >
              <img
                src={post.imageUrl}
                alt="Instagram post"
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex gap-4">
                  <span className="text-white font-black text-xs">LIKES {post.likes}</span>
                  <span className="text-white font-black text-xs">COMMENTS {post.comments}</span>
                </div>
              </div>
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Instagram"
                  className="absolute inset-0"
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramSection;
