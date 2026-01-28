import React from 'react';
import type {
  BlogPost,
  Departure,
  GalleryPhoto,
  GoogleReview,
  InstagramPost,
  ItineraryQuery,
  SiteContent,
  Trip,
} from '../types';
import SEOHead from '../components/SEOHead';
import AdventuresSection from './home/sections/AdventuresSection';
import BlogSection from './home/sections/BlogSection';
import CustomizeSection from './home/sections/CustomizeSection';
import DeparturesSection from './home/sections/DeparturesSection';
import GallerySection from './home/sections/GallerySection';
import HeroSection from './home/sections/HeroSection';
import InstagramSection from './home/sections/InstagramSection';
import ReviewsSection from './home/sections/ReviewsSection';
import RootsSection from './home/sections/RootsSection';
import WhyChooseUsSection from './home/sections/WhyChooseUsSection';

interface HomePageProps {
  trips: Trip[];
  departures: Departure[];
  onSelectTrip: (trip: Trip) => void;
  onBookNow: (trip: Trip) => void;
  blogPosts: BlogPost[];
  galleryPhotos: GalleryPhoto[];
  instagramPosts: InstagramPost[];
  googleReviews: GoogleReview[];
  siteContent: SiteContent;
  onSelectBlogPost: (post: BlogPost) => void;
  onNavigateGallery: () => void;
  onNavigateCustomize: () => void;
  onNavigateContact: () => void;
  onNavigateBlog: () => void;
  initialDestinationFilter: string | null;
  onClearInitialFilter: () => void;
  onAddInquiry: (query: Omit<ItineraryQuery, 'id' | 'date'>) => void;
  onNavigateToTours: (destination: string | null) => void;
}

const HomePage: React.FC<HomePageProps> = (props) => {
  const { siteContent } = props;

  const renderSection = (section: SiteContent['homePageLayout'][number]) => {
    if (section.isVisible === false) return null;

    switch (section.id) {
      case 'HERO':
        return (
          <HeroSection
            key={section.id}
            siteContent={siteContent}
            onNavigateCustomize={props.onNavigateCustomize}
          />
        );
      case 'ADVENTURES':
        return (
          <AdventuresSection
            key={section.id}
            trips={props.trips}
            siteContent={siteContent}
            sectionConfig={section}
            onSelectTrip={props.onSelectTrip}
            onBookNow={props.onBookNow}
            onNavigateToTours={props.onNavigateToTours}
            initialDestinationFilter={props.initialDestinationFilter}
            onClearInitialFilter={props.onClearInitialFilter}
          />
        );
      case 'DEPARTURES':
        return (
          <DeparturesSection
            key={section.id}
            trips={props.trips}
            departures={props.departures}
            siteContent={siteContent}
            sectionConfig={section}
            onAddInquiry={props.onAddInquiry}
          />
        );
      case 'CUSTOMIZE':
        return (
          <CustomizeSection
            key={section.id}
            siteContent={siteContent}
            sectionConfig={section}
            onNavigateCustomize={props.onNavigateCustomize}
          />
        );
      case 'WHY_CHOOSE_US':
        return (
          <WhyChooseUsSection
            key={section.id}
            siteContent={siteContent}
            sectionConfig={section}
          />
        );
      case 'ROOTS':
        return (
          <RootsSection
            key={section.id}
            siteContent={siteContent}
            blogPosts={props.blogPosts}
            sectionConfig={section}
            onNavigateContact={props.onNavigateContact}
            onNavigateCustomize={props.onNavigateCustomize}
            onNavigateToTours={props.onNavigateToTours}
            onNavigateBlog={props.onNavigateBlog}
            onSelectBlogPost={props.onSelectBlogPost}
          />
        );
      case 'REVIEWS':
        return (
          <ReviewsSection
            key={section.id}
            siteContent={siteContent}
            googleReviews={props.googleReviews}
            sectionConfig={section}
          />
        );
      case 'BLOG':
        return (
          <BlogSection
            key={section.id}
            siteContent={siteContent}
            blogPosts={props.blogPosts}
            sectionConfig={section}
            onSelectBlogPost={props.onSelectBlogPost}
          />
        );
      case 'GALLERY':
        return (
          <GallerySection
            key={section.id}
            siteContent={siteContent}
            galleryPhotos={props.galleryPhotos}
            sectionConfig={section}
            onNavigateGallery={props.onNavigateGallery}
          />
        );
      case 'INSTAGRAM':
        return (
          <InstagramSection
            key={section.id}
            siteContent={siteContent}
            instagramPosts={props.instagramPosts}
            sectionConfig={section}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-background dark:bg-dark-background pb-24">
      <SEOHead
        title={siteContent.globalSeo?.title}
        description={siteContent.globalSeo?.description}
        keywords={siteContent.globalSeo?.keywords}
      />
      {siteContent.homePageLayout.map(renderSection)}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left-infinite {
          display: flex;
          width: max-content;
          animation: marquee-left 60s linear infinite;
        }
        .animate-marquee-right-infinite {
          display: flex;
          width: max-content;
          animation: marquee-right 60s linear infinite;
        }
        @media (max-width: 768px) {
          .animate-marquee-left-infinite, .animate-marquee-right-infinite {
            animation-duration: 90s;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;

