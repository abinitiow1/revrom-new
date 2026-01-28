import React from 'react';
import type { GoogleReview, SiteContent } from '../../../types';
import { getActiveBgStyle } from '../activeBgStyle';

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
        <div className="flex gap-8 overflow-x-auto pb-12 no-scrollbar px-4 -mx-4 snap-x snap-mandatory">
          {googleReviews.map((review) => (
            <div
              key={review.id}
              className="min-w-[320px] md:min-w-[450px] bg-white dark:bg-neutral-900 p-8 rounded-[2rem] shadow-sm border flex flex-col justify-between hover:shadow-xl transition-all snap-center"
            >
              <p className="text-lg font-medium italic mb-8 opacity-80 leading-relaxed">
                "{review.text}"
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={review.profilePhotoUrl}
                  alt={review.authorName}
                  className="w-12 h-12 rounded-full ring-2 ring-brand-primary"
                  loading="lazy"
                  decoding="async"
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

