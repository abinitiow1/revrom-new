import React, { useMemo } from 'react';
import type { InstagramPost, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';

type Props = {
  siteContent: SiteContent;
  instagramPosts: InstagramPost[];
  sectionConfig: SiteContent['homePageLayout'][number];
};

const InstagramSection: React.FC<Props> = ({ siteContent, instagramPosts, sectionConfig }) => {
  const marqueePosts = useMemo(() => instagramPosts.concat(instagramPosts), [instagramPosts]);

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
        <a
          href={siteContent.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary font-black uppercase tracking-[0.3em] text-[10px] inline-block hover:underline"
        >
          {siteContent.instagramSubtitle}
        </a>
      </div>
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-6 px-6 pb-12">
        <div className="flex animate-marquee-left-infinite whitespace-nowrap gap-6 hover:[animation-play-state:paused]">
          {marqueePosts.map((post, idx) => (
            <a
              key={`${post.id}-${idx}`}
              href={siteContent.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
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
                  <span className="text-white font-black text-xs">❤️ {post.likes}</span>
                  <span className="text-white font-black text-xs">💬 {post.comments}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstagramSection;

