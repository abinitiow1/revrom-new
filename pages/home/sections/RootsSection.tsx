import React from 'react';
import type { BlogPost, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';

type Props = {
  siteContent: SiteContent;
  blogPosts: BlogPost[];
  sectionConfig: SiteContent['homePageLayout'][number];
  onNavigateContact: () => void;
  onNavigateCustomize: () => void;
  onNavigateToTours: (destination: string | null) => void;
  onNavigateBlog: () => void;
  onSelectBlogPost: (post: BlogPost) => void;
};

const RootsSection: React.FC<Props> = ({
  siteContent,
  blogPosts,
  sectionConfig,
  onNavigateContact,
  onNavigateCustomize,
  onNavigateToTours,
  onNavigateBlog,
  onSelectBlogPost,
}) => {
  return (
    <section
      id="roots"
      className="py-24 relative overflow-hidden bg-black"
      style={getActiveBgStyle(siteContent.rootsBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="container mx-auto px-4 sm:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-4">
            {siteContent.rootsKicker || 'Born in Chushul'}
          </h2>
          <h3 className="text-4xl md:text-6xl font-black font-display text-white italic leading-tight mb-8">
            {siteContent.rootsTitle}
          </h3>
          <p className="text-lg text-white/60 leading-relaxed mb-8">{siteContent.rootsBody}</p>
          <button
            type="button"
            onClick={() => {
              switch (siteContent.rootsCtaTarget) {
                case 'contact':
                  onNavigateContact();
                  return;
                case 'customize':
                  onNavigateCustomize();
                  return;
                case 'tours':
                  onNavigateToTours(null);
                  return;
                case 'blog':
                  onNavigateBlog();
                  return;
                case 'blogFirstPost':
                default: {
                  const first = blogPosts?.[0];
                  if (first) onSelectBlogPost(first);
                  else onNavigateBlog();
                  return;
                }
              }
            }}
            className="text-brand-primary font-black uppercase tracking-[0.3em] text-xs hover:gap-4 flex items-center gap-2 transition-all"
          >
            {siteContent.rootsButton} <span className="text-xl">→</span>
          </button>
        </div>
        <div className="relative">
          <img
            src={
              siteContent.rootsImageUrl ||
              'https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=1200'
            }
            alt="Himalayan landscape"
            className="rounded-[3rem] relative z-10 shadow-2xl grayscale"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
};

export default RootsSection;
