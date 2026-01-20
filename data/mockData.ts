
import type { Trip, Departure, BlogPost, GalleryPhoto, InstagramPost, GoogleReview, SiteContent, ItineraryQuery, ThemeColors, CustomPage, SectionConfig } from '../types';
import { themes } from './themes';

export const trips: Trip[] = [
  {
    id: 'ladakh-manali-leh',
    title: 'The Manali-Leh Adventure',
    destination: 'Ladakh, India',
    shortDescription: 'Join us on a beautiful journey from the green valleys of Manali to the high deserts of Ladakh.',
    longDescription: '### A Himalayan Journey\n\nExperience the beauty of the Himalayas. This classic motorcycle trip takes you from the lush green valleys of Manali to the arid, high-altitude desert of Ladakh. You will ride through famous mountain passes, witness breathtaking landscapes, and immerse yourself in the local culture.',
    duration: 12,
    price: 265000,
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=800',
    gallery: [
      { id: 'ladakh-1', imageUrl: 'https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=1200', caption: 'Sunrise at Pangong', category: 'Landscapes' },
      { id: 'ladakh-2', imageUrl: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&q=80&w=1200', caption: 'Rider at the Pass', category: 'Riders' },
    ],
    itinerary: [
      { day: 1, title: 'Arrival in Manali', description: 'Arrive in Manali and get comfortable with your Royal Enfield.' },
      { day: 2, title: 'Manali to Jispa', description: 'A lovely ride crossing the Rohtang Pass into Lahaul Valley.' },
    ],
    inclusions: ['Royal Enfield Himalayan Bike', 'Support Vehicle', 'Expert Mechanic', 'Comfortable Stays'],
    exclusions: ['Flights', 'Fuel', 'Lunch'],
    activities: ['Scenic mountain riding', 'Visiting local villages'],
    difficulty: 'Intermediate',
    route: 'Manali - Jispa - Sarchu - Leh - Srinagar',
    routeCoordinates: [[32.24, 77.18], [32.65, 77.20]],
    reviews: [],
  },
  {
    id: 'spiti-valley-loop',
    title: 'Spiti: The Hidden Land',
    destination: 'Spiti, Himachal',
    shortDescription: 'Explore the high-altitude desert of Spiti and visit peaceful ancient monasteries.',
    longDescription: 'Explore the "Middle Land" between Tibet and India. Spiti offers raw, untouched beauty and peaceful mountain views.',
    duration: 10,
    price: 185000,
    imageUrl: 'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&q=80&w=800',
    gallery: [],
    itinerary: [],
    inclusions: ['Bike', 'Local Guide', 'Accommodations'],
    exclusions: [],
    activities: ['Exploring monasteries', 'Camping under the stars'],
    difficulty: 'Advanced',
    route: 'Shimla - Kalpa - Kaza - Manali',
    routeCoordinates: [],
    reviews: [],
  },
];

export const departures: Departure[] = [
  { id: '1', tripId: 'ladakh-manali-leh', startDate: '2024-06-15', endDate: '2024-06-26', slots: 4, status: 'Limited' },
  { id: '2', tripId: 'ladakh-manali-leh', startDate: '2024-07-10', endDate: '2024-07-21', slots: 8, status: 'Available' },
  { id: '3', tripId: 'spiti-valley-loop', startDate: '2024-08-05', endDate: '2024-08-14', slots: 0, status: 'Sold Out' },
];

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Essential Gear for Mountain Riding',
    author: 'Stanzin Dorjey',
    date: '2023-11-20',
    imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=800',
    excerpt: 'Helpful tips on what to pack for your first trip to the Himalayas.',
    content: '**1. Layered Clothing**\nThe weather in the mountains can change quickly. It is best to wear layers so you can stay comfortable.\n\n**2. Good Helmet**\nAlways wear a high-quality helmet to keep you safe on the road.\n\n**3. Comfortable Gloves**\nGood gloves help you stay in control and keep your hands warm.',
  }
];

export const googleReviews: GoogleReview[] = [
    { id: '1', authorName: 'Arjun Mehra', rating: 5, text: 'Our trip was amazing. The local guides were so friendly and helpful!', profilePhotoUrl: 'https://i.pravatar.cc/150?u=arjun', isFeatured: true },
    { id: '2', authorName: 'Sarah Jenkins', rating: 5, text: 'The views were so peaceful. Everything was very well organized.', profilePhotoUrl: 'https://i.pravatar.cc/150?u=sarah', isFeatured: true },
];

export const galleryPhotos: GalleryPhoto[] = [
    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1544735058-29da243be444?auto=format&fit=crop&q=80&w=800', caption: 'Sunrise at Pangong Lake', category: 'Landscapes' },
];

export const instagramPosts: InstagramPost[] = [
    { id: '1', imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=600', type: 'photo', likes: 245, comments: 12 },
];

export const itineraryQueries: ItineraryQuery[] = [];

export const initialCustomPages: CustomPage[] = [
    { id: '1', title: 'Terms & Conditions', slug: 'terms-and-conditions', content: '# Terms & Conditions\n\n## 1. Simple Booking\nA small deposit is all you need to save your spot.\n\n## 2. Cancellation\nWe offer full refunds for cancellations made 60 days in advance.', isVisible: true },
    { id: '2', title: 'Privacy Policy', slug: 'privacy-policy', content: '# Privacy Policy\n\nYour information is safe and secure with us.', isVisible: true }
];

export const initialSiteContent: SiteContent = {
    heroTitle: 'RIDE. ROAM. RELAX.',
    heroSubtitle: 'Friendly mountain tours led by locals who love their home. Explore the beautiful Himalayas with us.',
    heroBgImage: 'https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=2000',
    
    adventuresTitle: 'EXPLORE OUR TRIPS',
    adventuresSubtitle: 'Discover our favorite routes through the beautiful Himalayas.',
    adventuresBgImage: '',
    
    departuresTitle: 'UPCOMING DATES',
    departuresBgImage: '',
    
    customizeTitle: 'PLAN YOUR OWN TRIP',
    customizeSubtitle: 'Let us help you create a personalized journey that fits your schedule.',
    
    whyChooseUsBgImage: '',
    
    rootsTitle: 'OUR LOCAL STORY',
    rootsBody: 'We are a group of local riders who grew up in these mountains. We love sharing the beauty of our home with friendly travelers from around the world.',
    rootsButton: 'ABOUT US',
    rootsBgImage: '',
    
    reviewsBgImage: '',
    
    blogTitle: 'TRAVEL STORIES',
    blogBgImage: '',
    
    galleryTitle: 'PHOTO GALLERY',
    gallerySubtitle: 'Captured on our recent journeys.',
    galleryBgImage: '',
    
    instagramTitle: 'FOLLOW US',
    instagramSubtitle: '@revrom.expeditions',
    instagramBgImage: '',
    
    instagramUrl: 'https://instagram.com/revrom',
    facebookUrl: 'https://facebook.com/revrom',
    youtubeUrl: 'https://youtube.com/revrom',
    googleReviewsUrl: 'https://google.com/reviews/revrom',
    
    adminWhatsappNumber: '+91 98765 43210',
    contactEmail: 'hello@revrom.in',
    contactPhone: '+91 98765 43210',
    contactAddress: 'Fort Road, Leh, Ladakh, 194101',

    logoUrl: '',
    logoHeight: 50,
    footerTagline: 'EXPLORE THE HIMALAYAS WITH LOCALS.',

    activeTheme: 'Default',
    customThemeColors: themes[0].colors,
    
    homePageLayout: [
        { id: 'HERO', isVisible: true, label: 'Welcome Section', backgroundOpacity: 0.95 },
        { id: 'ADVENTURES', isVisible: true, label: 'Explore Trips', backgroundOpacity: 0.95 },
        { id: 'DEPARTURES', isVisible: true, label: 'Upcoming Dates', backgroundOpacity: 0.95 },
        { id: 'CUSTOMIZE', isVisible: true, label: 'Personalized Planning', backgroundOpacity: 0.95 },
        { id: 'WHY_CHOOSE_US', isVisible: true, label: 'Why Travel With Us', backgroundOpacity: 0.95 },
        { id: 'ROOTS', isVisible: true, label: 'About Us', backgroundOpacity: 0.95 },
        { id: 'REVIEWS', isVisible: true, label: 'Happy Travelers', backgroundOpacity: 0.95 },
        { id: 'BLOG', isVisible: true, label: 'Stories', backgroundOpacity: 0.95 },
        { id: 'GALLERY', isVisible: true, label: 'Photos', backgroundOpacity: 0.95 },
        { id: 'INSTAGRAM', isVisible: true, label: 'Social Feed', backgroundOpacity: 0.95 }
    ]
};
