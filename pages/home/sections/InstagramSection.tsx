import React, { useMemo } from 'react';
import type { InstagramPost, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';
import { safeExternalUrl } from '../../../utils/sanitizeUrl';
import { useDisableMarqueeMotion } from '../../../utils/useDisableMarqueeMotion';
import SmartImage from '../../../components/SmartImage';

type Props = {
  siteContent: SiteContent;
  instagramPosts: InstagramPost[];
  sectionConfig: SiteContent['homePageLayout'][number];
};

const InstagramSection: React.FC<Props> = ({ siteContent, instagramPosts, sectionConfig }) => {
  const instagramUrl = safeExternalUrl(siteContent.instagramUrl);
  const disableMarqueeMotion = useDisableMarqueeMotion({ disableOnMobile: false });
  const posts = useMemo(() => instagramPosts || [], [instagramPosts]);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const minPostsForMarquee = isMobile ? 4 : 6;
  const enableMarquee = !disableMarqueeMotion && posts.length >= minPostsForMarquee;

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
      <div
        role="region"
        aria-label="Instagram posts carousel"
        tabIndex={0}
        className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 pb-12 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
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
          <div className="flex gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="aspect-square w-[250px] md:w-[320px] rounded-[2.5rem] overflow-hidden relative group flex-shrink-0 snap-center shadow-2xl focus-within:ring-2 focus-within:ring-brand-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-black"
              >
                <SmartImage
                  src={post.imageUrl}
                  alt="Instagram post"
                  loading="lazy"
                  decoding="async"
                  fill
                  wrapperClassName="absolute inset-0"
                  className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
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
        ) : (
          // Important: keep NO gap between the 2 copies, otherwise the translateX(-50%) loop can "drift"
          // and briefly overlap cards on some screen sizes.
          <div className="flex animate-marquee-left-infinite whitespace-nowrap hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
            {/* Keep an end padding equal to the gap so the loop seam doesn't "crush" cards together. */}
            <div className="flex gap-6 pr-6">
              {posts.map((post) => (
                <div
                  key={`a-${post.id}`}
                  className="aspect-square w-[250px] md:w-[320px] rounded-[2.5rem] overflow-hidden relative group flex-shrink-0 snap-center shadow-2xl focus-within:ring-2 focus-within:ring-brand-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-black"
                >
                  <SmartImage
                    src={post.imageUrl}
                    alt="Instagram post"
                    loading="lazy"
                    decoding="async"
                    fill
                    wrapperClassName="absolute inset-0"
                    className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
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
            <div className="flex gap-6 pr-6" aria-hidden="true">
              {posts.map((post) => (
                <div
                  key={`b-${post.id}`}
                  className="aspect-square w-[250px] md:w-[320px] rounded-[2.5rem] overflow-hidden relative group flex-shrink-0 snap-center shadow-2xl focus-within:ring-2 focus-within:ring-brand-primary/40 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-black"
                >
                  <SmartImage
                    src={post.imageUrl}
                    alt="Instagram post"
                    loading="lazy"
                    decoding="async"
                    fill
                    wrapperClassName="absolute inset-0"
                    className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
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
        )}
      </div>
    </section>
  );
};

export default InstagramSection;
