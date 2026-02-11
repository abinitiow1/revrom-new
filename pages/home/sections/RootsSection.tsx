import React from 'react';
import type { BlogPost, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';
import SmartImage from '../../../components/SmartImage';

type Props = {
  siteContent: SiteContent;
  blogPosts: BlogPost[];
  sectionConfig: SiteContent['homePageLayout'][number];
  onNavigateContact: () => void;
  onNavigateCustomize: () => void;
  onNavigateToTours: (destination: string | null) => void;
  onNavigateBlog: () => void;
  onNavigateCustomPage: (slug: string) => void;
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
  onNavigateCustomPage,
  onSelectBlogPost,
}) => {
  const title = siteContent.rootsTitle || 'Our Roots';
  const body =
    siteContent.rootsBody ||
    'We craft small-group journeys led by locals — shaped by the landscapes and stories that raised us.';
  const ctaLabel = siteContent.rootsButton || 'Read Our Story';

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
            {title}
          </h3>
          <p className="text-lg text-white/60 leading-relaxed mb-8">{body}</p>
          <button
            type="button"
            onClick={() => onNavigateCustomPage('about-us')}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-3 -ml-2 text-brand-primary font-black uppercase tracking-[0.3em] text-[11px] sm:text-xs transition-all hover:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {ctaLabel}
            <span aria-hidden="true" className="text-xl leading-none">
              →
            </span>
          </button>
        </div>
        <div className="relative">
          <SmartImage
            src={
              siteContent.rootsImageUrl ||
              'https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=1200'
            }
            alt="Himalayan landscape"
            loading="lazy"
            decoding="async"
            wrapperClassName="rounded-[3rem] relative z-10 shadow-2xl grayscale"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </section>
  );
};

export default RootsSection;
