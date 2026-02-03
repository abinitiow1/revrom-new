import React, { useMemo } from 'react';
import type { BlogPost, SiteContent } from '../../../types';
import BlogPostCard from '../../../components/BlogPostCard';
import { getActiveBgStyle } from '../activeBgStyle';
import { useDisableMarqueeMotion } from '../../../utils/useDisableMarqueeMotion';

type Props = {
  siteContent: SiteContent;
  blogPosts: BlogPost[];
  sectionConfig: SiteContent['homePageLayout'][number];
  onSelectBlogPost: (post: BlogPost) => void;
};

const BlogSection: React.FC<Props> = ({ siteContent, blogPosts, sectionConfig, onSelectBlogPost }) => {
  const disableMarqueeMotion = useDisableMarqueeMotion();
  const marqueePosts = useMemo(() => (disableMarqueeMotion ? blogPosts : blogPosts.concat(blogPosts)), [blogPosts, disableMarqueeMotion]);

  return (
    <section
      className="py-24 overflow-hidden"
      style={getActiveBgStyle(siteContent.blogBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="container mx-auto px-4 sm:px-6 mb-16">
        <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">
          {siteContent.blogKicker || 'Blog'}
        </h2>
        <h3 className="text-4xl font-black font-display italic tracking-tight">{siteContent.blogTitle}</h3>
      </div>
      <div className="w-full">
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-8 px-6 pb-8">
          <div className={disableMarqueeMotion ? 'flex gap-8' : 'flex animate-marquee-left-infinite whitespace-nowrap gap-8 hover:[animation-play-state:paused]'}>
            {marqueePosts.map((post, idx) => (
              <div key={`${post.id}-${idx}`} className="w-[300px] md:w-[400px] flex-shrink-0 snap-center">
                <BlogPostCard post={post} onSelectPost={onSelectBlogPost} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
