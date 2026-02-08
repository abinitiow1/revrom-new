import React from 'react';
import type { GoogleReview, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';
import SmartImage from '../../../components/SmartImage';

type Props = {
  siteContent: SiteContent;
  googleReviews: GoogleReview[];
  sectionConfig: SiteContent['homePageLayout'][number];
};

const ReviewsSection: React.FC<Props> = ({ siteContent, googleReviews, sectionConfig }) => {
  return (
    <section
      className="py-24 border-y border-border dark:border-dark-border overflow-hidden"
      style={getActiveBgStyle(siteContent.reviewsBgImage, sectionConfig.backgroundOpacity)}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-xs font-black uppercase tracking-[0.4em] text-brand-primary mb-3">
            {siteContent.reviewsKicker || 'Rider Feedback'}
          </h2>
          <h3 className="text-4xl font-black font-display italic tracking-tight">
            {siteContent.reviewsTitle || 'Debriefings from the Road'}
          </h3>
        </div>
        <div
          role="region"
          aria-label="Customer reviews carousel"
          tabIndex={0}
          className="flex gap-8 overflow-x-auto pb-12 no-scrollbar px-4 -mx-4 snap-x snap-mandatory focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black"
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            e.currentTarget.scrollBy({
              left: e.key === 'ArrowRight' ? 360 : -360,
              behavior: 'smooth',
            });
          }}
        >
          {googleReviews.map((review) => (
            <div
              key={review.id}
              className="min-w-[320px] md:min-w-[450px] bg-white dark:bg-neutral-900 p-8 rounded-[2rem] shadow-sm border flex flex-col justify-between hover:shadow-xl transition-all snap-center"
            >
              <p className="text-lg font-medium italic mb-8 opacity-80 leading-relaxed">
                "{review.text}"
              </p>
              <div className="flex items-center gap-4">
                <SmartImage
                  src={review.profilePhotoUrl}
                  alt={review.authorName}
                  loading="lazy"
                  decoding="async"
                  fill
                  wrapperClassName="w-12 h-12 rounded-full ring-2 ring-brand-primary"
                  className="w-full h-full object-cover"
                />
                <div>
                  <h4 className="font-black text-sm uppercase tracking-tight">{review.authorName}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;
