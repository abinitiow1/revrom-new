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
  const disableMarqueeMotion = useDisableMarqueeMotion({ disableOnMobile: false });
  const posts = useMemo(() => blogPosts || [], [blogPosts]);
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const minPostsForMarquee = isMobile ? 3 : 4;
  const enableMarquee = !disableMarqueeMotion && posts.length >= minPostsForMarquee;
  const useWrappedStaticLayout = !enableMarquee && posts.length > 0 && posts.length <= 2;

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
        <div
          role="region"
          aria-label="Travel stories carousel"
          tabIndex={0}
          className="overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 pb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            e.currentTarget.scrollBy({
              left: e.key === 'ArrowRight' ? 360 : -360,
              behavior: 'smooth',
            });
          }}
        >
          {!enableMarquee ? (
            <div className={useWrappedStaticLayout ? 'flex flex-wrap justify-center gap-8' : 'flex gap-8'}>
              {posts.map((post) => (
                <div key={post.id} className="w-[300px] md:w-[400px] flex-shrink-0 snap-center">
                  <BlogPostCard post={post} onSelectPost={onSelectBlogPost} />
                </div>
              ))}
            </div>
          ) : (
            // Important: keep NO gap between the 2 copies, otherwise the translateX(-50%) loop can "drift"
            // and briefly overlap cards on some screen sizes.
            <div className="animate-marquee-left-infinite hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
              {/* Keep an end padding equal to the gap so the loop seam doesn't "crush" cards together. */}
              <div className="flex gap-8 pr-8">
                {posts.map((post) => (
                  <div key={`a-${post.id}`} className="w-[300px] md:w-[400px] flex-shrink-0 snap-center">
                    <BlogPostCard post={post} onSelectPost={onSelectBlogPost} />
                  </div>
                ))}
              </div>
              <div className="flex gap-8 pr-8" aria-hidden="true">
                {posts.map((post) => (
                  <div key={`b-${post.id}`} className="w-[300px] md:w-[400px] flex-shrink-0 snap-center">
                    <BlogPostCard post={post} onSelectPost={onSelectBlogPost} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
