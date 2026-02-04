
export interface Review {
  name: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string; // Comma separated
  ogImage?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  shortDescription: string;
  longDescription: string;
  duration: number; // in days
  price: number;
  imageUrl: string;
  gallery: GalleryPhoto[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  activities: string[];
  difficulty: 'Intermediate' | 'Advanced' | 'Expert';
  route: string;
  routeCoordinates: [number, number][];
  reviews: Review[];
  seo?: SEOConfig;
}

export interface Departure {
  id: string;
  tripId: string;
  startDate: string;
  endDate: string;
  slots: number;
  status: 'Available' | 'Sold Out' | 'Limited';
}

export interface BlogPost {
  id: string;
  title: string;
  author: string;
  date: string;
  imageUrl: string;
  excerpt: string;
  content: string; // Markdown
  seo?: SEOConfig;
}

export interface GalleryPhoto {
    id: string;
    imageUrl: string;
    caption: string;
    category: 'Landscapes' | 'Riders' | 'Culture' | 'Behind the Scenes';
}

export interface InstagramPost {
    id: string;
    imageUrl: string;
    type: 'photo' | 'reel';
    likes: number;
    comments: number;
}

export interface GoogleReview {
    id: string;
    authorName: string;
    rating: number;
    text: string;
    profilePhotoUrl: string;
    isFeatured: boolean;
}

export interface ItineraryQuery {
    id: string;
    tripId: string;
    tripTitle: string;
    name: string;
    whatsappNumber?: string;
    email?: string;
    planningTime: string;
    date: string;
    status?: LeadStatus;
}

export type LeadStatus = 'new' | 'contacted' | 'closed';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  whatsappNumber?: string;
  message: string;
  createdAt: string;
}

export interface NewsletterSubscriber {
  email: string;
  createdAt: string;
}

export interface ColorSet {
  primary: string;
  primaryDark: string;
  accentGold: string;
  background: string;
  foreground: string;
  card: string;
  mutedForeground: string;
  border: string;
}

export interface ThemeColors {
  light: ColorSet;
  dark: ColorSet;
}

export interface ThemeOption {
  name: string;
  colors: ThemeColors;
}

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  content: string; // Markdown
  imageUrl?: string;
  isVisible: boolean;
  seo?: SEOConfig;
}

export type HomePageSection = 'HERO' | 'ADVENTURES' | 'DEPARTURES' | 'CUSTOMIZE' | 'WHY_CHOOSE_US' | 'ROOTS' | 'REVIEWS' | 'BLOG' | 'GALLERY' | 'INSTAGRAM';

export interface SectionConfig {
    id: HomePageSection;
    isVisible: boolean;
    label: string; 
    backgroundImage?: string;
    backgroundOpacity?: number; // 0 to 1, where 1 is fully visible background image
}

export type RootsCtaTarget = 'blogFirstPost' | 'blog' | 'contact' | 'customize' | 'tours';

export interface WhyChooseUsCard {
  icon: string;
  title: string;
  desc: string;
}

export interface SiteContent {
    heroTitle: string;
    heroSubtitle: string;
    heroBgImage: string;
    heroBadgeText: string;
    heroPrimaryCtaLabel: string;
    heroSecondaryCtaLabel: string;
    
    adventuresKicker: string;
    adventuresTitle: string;
    adventuresSubtitle: string;
    adventuresBgImage: string;
    adventuresCtaLabel: string;
    
    departuresTitle: string;
    departuresBgImage: string;
    
    customizeTitle: string;
    customizeSubtitle: string;
    customizeCtaLabel: string;
    
    whyChooseUsKicker: string;
    whyChooseUsTitle: string;
    whyChooseUsCards: WhyChooseUsCard[];
    whyChooseUsBgImage: string;
    
    rootsKicker: string;
    rootsTitle: string;
    rootsBody: string;
    rootsButton: string;
    rootsBgImage: string;
    rootsImageUrl: string;
    rootsCtaTarget: RootsCtaTarget;
    
    reviewsBgImage: string;
    reviewsKicker: string;
    reviewsTitle: string;
    
    blogKicker: string;
    blogTitle: string;
    blogBgImage: string;
    
    galleryKicker: string;
    galleryTitle: string;
    gallerySubtitle: string;
    galleryBgImage: string;
    galleryCtaLabel: string;
    
    instagramKicker: string;
    instagramTitle: string;
    instagramSubtitle: string;
    instagramBgImage: string;
    
    // Social Media Links
    instagramUrl: string;
    facebookUrl: string;
    youtubeUrl: string;
    googleReviewsUrl: string;
    
    // Contact Info
    adminWhatsappNumber: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;

    // Footer/Branding
    logoUrl: string;
    logoHeight: number;
    footerTagline: string;

    // Theme & Layout
    activeTheme: string;
    customThemeColors: ThemeColors;
    homePageLayout: SectionConfig[];
    
    // Global SEO
    globalSeo?: SEOConfig;
}
