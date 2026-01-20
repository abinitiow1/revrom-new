import type { Trip } from '../types';

/**
 * Content Service - No external API dependencies
 * All functions return placeholder/mock content
 * Ready to integrate with real APIs later
 */

// Image placeholder service - uses free stock images (picsum.photos)
export const generateBlogImage = async (title: string, excerpt: string): Promise<string> => {
  // Normalize and encode seed based on title for consistent images
  const seed = encodeURIComponent(
    (title || 'default')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  );
  const placeholderUrl = `https://picsum.photos/seed/${seed}/800/600`;
  
  // Simulate async operation
  return new Promise((resolve) => {
    setTimeout(() => resolve(placeholderUrl), 250);
  });
};

// Packing list generator - uses predefined templates
export const generatePackingList = async (trip: Trip): Promise<string> => {
  const packingLists: Record<string, string> = {
    'Intermediate': `## Packing List for ${trip.title}

### **Riding Gear (Essential)**
- DOT-approved motorcycle helmet with visor
- Armored riding jacket (waterproof)
- Motorcycle riding pants with knee/hip armor
- Riding gloves (leather, padded)
- Motorcycle boots (ankle support)
- Back protector

### **Clothing (On & Off Bike)**
- Thermal layers (2-3 sets)
- Fleece jackets (2)
- Waterproof rain jacket & pants
- Casual t-shirts & shirts (4-5)
- Jeans & casual pants (2-3)
- Socks (7-8 pairs)
- Underwear (7-8 pairs)

### **Footwear**
- Motorcycle boots
- Casual shoes/sneakers
- Sandals for relaxing

### **Health & Hygiene**
- Toiletries (toothbrush, toothpaste, shampoo, soap)
- Sunscreen (SPF 50+)
- Lip balm with SPF
- High-altitude medications (Diamox if needed)
- First aid kit
- Prescription medications
- Pain relievers & antacids

### **Documents & Money**
- Passport/ID
- Driving license (international if applicable)
- Travel insurance documents
- Cash & debit/credit cards
- Hotel confirmations

### **Electronics & Gadgets**
- Mobile phone & charger
- Portable power bank
- GPS device or phone mount
- Camera
- Universal adapter
- Headphones

### **Miscellaneous**
- Sunglasses
- Backpack/day bag
- Wet wipes & hand sanitizer
- Plastic bags (for rain)
- Notepad & pen`,

    'Advanced': `## Packing List for ${trip.title}

### **Riding Gear (Essential)** - Professional Grade
- Premium DOT/ECE helmet with weather-resistant visor
- High-quality armored textile or leather jacket
- Heavy-duty riding pants with maximum armor
- Gauntlet-style gloves with knuckle protection
- Specialized off-road or adventure boots
- Spine & chest protector
- Riding socks (moisture-wicking)

### **Clothing (On & Off Bike)** - High-Altitude Specific
- Merino wool thermal base layers (3 sets)
- Heavy fleece jackets (2)
- Down jacket for extreme cold
- Waterproof/windproof shell jacket & pants
- Cargo pants for casual wear
- Quality t-shirts & long-sleeve shirts (5)
- Emergency dry clothes in waterproof bag

### **Footwear**
- Professional motorcycle adventure boots
- Insulated inner soles
- Thermal socks (5-7 pairs)
- Hiking boots (optional)
- Casual shoes

### **Health & Hygiene** - High-Altitude Focus
- Comprehensive first aid kit
- Altitude sickness medication (Diamox)
- Blister treatment supplies
- High-SPF sunscreen (70+)
- Lip protection balm
- Toiletries for dry climate
- Muscle pain relief cream
- Electrolyte supplements
- Multivitamins
- Eye drops

### **Documents & Money**
- Passport & visas
- Multiple copies of important documents
- Travel insurance (with medical coverage)
- Cash in local currency
- International credit cards
- ATM card backups

### **Electronics & Gadgets**
- Ruggedized smartphone
- Multiple power banks (2-3)
- Helmet camera/GoPro
- Professional camera with lenses
- Waterproof cases
- USB-C & micro-USB cables
- Travel router (optional)
- Headlamp/flashlight
- Spare batteries

### **Miscellaneous**
- Duct tape & cable ties
- Multi-tool/knife
- Emergency whistle
- Rope/paracord
- Repair kit (spare chain, spark plugs, oil)
- Detailed maps (paper backup)
- Travel journal
- Binoculars for wildlife`,

    'Expert': `## Packing List for ${trip.title}

### **Riding Gear (Professional Grade)**
- Premium carbon-fiber helmet with advanced aerodynamics
- Custom-fitted armored riding suit
- Professional-grade off-road armor package
- Specialized gauntlet gloves with palm armor
- Professional adventure/off-road boots
- Full spinal protection system
- Moisture-wicking technical riding base layers
- Professional rain gear

### **Technical Clothing** - Expedition-Grade
- High-altitude layering system (merino wool/synthetic)
- Extreme-cold down jacket (-20°C rated)
- Waterproof/breathable outer shell (professional)
- Multiple technical base layers (5-6 sets)
- Emergency bivvy bag
- Gaiters for mountain conditions
- Professional hiking boots
- Ultra-warm socks (wool/synthetic blend)

### **Advanced Health & Medical**
- Complete wilderness first aid kit
- Altitude acclimatization medications
- Comprehensive medication list
- Blood pressure monitor
- Pulse oximeter
- High-SPF mineral sunscreen (80+)
- Preventative medicines
- Emergency medical kit
- Rescue blanket/space blanket
- Tourniquets & trauma supplies

### **Professional Safety & Navigation**
- GPS device + smartphone backup
- Detailed topographic maps (waterproof)
- Satellite communicator (Garmin InReach)
- Emergency beacon
- Compass & map tools
- Weather-resistant route documentation
- Emergency contact list

### **Professional Electronics**
- Multiple power sources & batteries
- Solar charger for extended trips
- Waterproof camera equipment
- Drone (optional)
- Professional lighting system
- Satellite phone (optional)
- Weather station (optional)
- All equipment in waterproof containers

### **Emergency & Repair**
- Complete motorcycle repair kit
- Spare engine oil & filters
- Tire repair patches & pump
- Chain lubricant & cleaner
- Emergency fuel containers
- Tools (comprehensive set)
- Duct tape, electrical tape, zip ties
- Rope & carabiners
- Recovery equipment`,
  };

  // Return appropriate packing list based on difficulty
  const list = packingLists[trip.difficulty] || packingLists['Intermediate'];
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(list), 800);
  });
};

interface CustomItineraryPreferences {
  travelers: string;
  duration: string;
  destinations: string;
  style: string;
  interests: string;
}

// Destination-specific highlights and activities
const destinationData: Record<string, { highlights: string[]; passes: string[]; monasteries: string[]; lakes: string[]; activities: string[]; baseCity: string }> = {
  'ladakh': {
    baseCity: 'Leh',
    highlights: ['Magnetic Hill', 'Confluence of Indus & Zanskar', 'Nubra Valley sand dunes', 'Turtuk village', 'Hanle Dark Sky Reserve'],
    passes: ['Khardung La (18,380 ft)', 'Chang La (17,688 ft)', 'Wari La (17,300 ft)', 'Khaltse Pass'],
    monasteries: ['Thiksey Monastery', 'Hemis Monastery', 'Diskit Monastery', 'Alchi Monastery', 'Lamayuru Monastery'],
    lakes: ['Pangong Tso', 'Tso Moriri', 'Tso Kar'],
    activities: ['Double-humped camel ride in Nubra', 'Stargazing at Hanle', 'River rafting on Indus', 'Visit Leh Palace']
  },
  'spiti': {
    baseCity: 'Kaza',
    highlights: ['Moon Lake Chandratal', 'Chicham Bridge', 'Langza Fossil Village', 'Pin Valley National Park', 'Komic - highest village with motorable road'],
    passes: ['Kunzum Pass (15,060 ft)', 'Rohtang Pass (13,051 ft)', 'Losar checkpoint'],
    monasteries: ['Key Monastery', 'Tabo Monastery', 'Dhankar Monastery', 'Kungri Monastery'],
    lakes: ['Chandratal Lake', 'Suraj Tal'],
    activities: ['Fossil hunting in Langza', 'Yak safari', 'Homestay in Hikkim', 'Visit world\'s highest post office']
  },
  'rajasthan': {
    baseCity: 'Jaipur',
    highlights: ['Thar Desert dunes', 'Jaisalmer Fort', 'Mehrangarh Fort', 'Udaipur lakes', 'Pushkar Ghats'],
    passes: [],
    monasteries: [],
    lakes: ['Lake Pichola', 'Fateh Sagar Lake', 'Pushkar Lake'],
    activities: ['Desert camping', 'Camel safari', 'Heritage palace stays', 'Folk music nights', 'Village safaris']
  },
  'himachal': {
    baseCity: 'Manali',
    highlights: ['Solang Valley', 'Atal Tunnel', 'Sissu waterfall', 'Kullu Valley orchards', 'Old Manali'],
    passes: ['Rohtang Pass (13,051 ft)', 'Jalori Pass (10,800 ft)'],
    monasteries: ['Trilokinath Temple', 'Hadimba Temple'],
    lakes: ['Prashar Lake', 'Bhrigu Lake'],
    activities: ['Paragliding in Solang', 'River rafting in Kullu', 'Trout fishing', 'Apple orchard visits']
  },
  'kerala': {
    baseCity: 'Kochi',
    highlights: ['Western Ghats curves', 'Tea plantations of Munnar', 'Athirappilly Falls', 'Alleppey backwaters', 'Wayanad forests'],
    passes: ['Lakkidi Ghat', 'Vagamon hills'],
    monasteries: [],
    lakes: ['Vembanad Lake', 'Periyar Lake'],
    activities: ['Houseboat cruise', 'Spice plantation tours', 'Kathakali shows', 'Ayurveda spa sessions']
  },
  'northeast': {
    baseCity: 'Guwahati',
    highlights: ['Kaziranga National Park', 'Cherrapunji rain', 'Living root bridges', 'Tawang monastery', 'Ziro Valley'],
    passes: ['Sela Pass (13,700 ft)', 'Bomdila'],
    monasteries: ['Tawang Monastery', 'Bomdila Monastery'],
    lakes: ['Umiam Lake', 'Sangetsar Lake'],
    activities: ['Rhino safari in Kaziranga', 'Trek to living root bridges', 'Tribal village visits', 'Hornbill Festival (seasonal)']
  }
};

// Style-specific itinerary characteristics
const styleCharacteristics: Record<string, { pace: string; accommodation: string; dailyRiding: string; focus: string }> = {
  'Adventure Focused': {
    pace: 'challenging with early starts',
    accommodation: 'mix of camps, homestays, and basic hotels',
    dailyRiding: '150-250 km',
    focus: 'off-road trails, remote areas, and adrenaline-pumping routes'
  },
  'Relaxed & Scenic': {
    pace: 'leisurely with plenty of photo stops',
    accommodation: 'comfortable hotels and heritage stays',
    dailyRiding: '80-150 km',
    focus: 'scenic viewpoints, cultural experiences, and relaxed exploration'
  },
  'Cultural Immersion': {
    pace: 'moderate with extended stops',
    accommodation: 'local homestays and boutique properties',
    dailyRiding: '100-180 km',
    focus: 'monasteries, local communities, traditional cuisine, and heritage sites'
  },
  'Photography Tour': {
    pace: 'flexible based on light conditions',
    accommodation: 'locations with best sunrise/sunset access',
    dailyRiding: '80-150 km',
    focus: 'golden hour shots, landscape vistas, wildlife, and portrait opportunities'
  },
  'Extreme Challenge': {
    pace: 'intensive with technical sections',
    accommodation: 'tents and basic shelters',
    dailyRiding: '200-300 km',
    focus: 'highest passes, toughest terrain, and endurance riding'
  }
};

// Parse interests to identify key themes
const parseInterests = (interests: string): string[] => {
  const themes: string[] = [];
  const lower = interests.toLowerCase();
  
  if (lower.includes('pass') || lower.includes('mountain') || lower.includes('high') || lower.includes('altitude')) themes.push('high_passes');
  if (lower.includes('monastery') || lower.includes('temple') || lower.includes('spiritual') || lower.includes('buddhist')) themes.push('monasteries');
  if (lower.includes('lake') || lower.includes('water') || lower.includes('pangong') || lower.includes('tso')) themes.push('lakes');
  if (lower.includes('photo') || lower.includes('camera') || lower.includes('sunset') || lower.includes('sunrise')) themes.push('photography');
  if (lower.includes('food') || lower.includes('cuisine') || lower.includes('local') || lower.includes('culture')) themes.push('culture');
  if (lower.includes('wildlife') || lower.includes('animal') || lower.includes('bird')) themes.push('wildlife');
  if (lower.includes('off-road') || lower.includes('adventure') || lower.includes('challenge')) themes.push('adventure');
  if (lower.includes('relax') || lower.includes('easy') || lower.includes('comfort')) themes.push('relaxed');
  
  return themes.length > 0 ? themes : ['general'];
};

// Detect destinations from input
const detectDestinations = (input: string): string[] => {
  const lower = input.toLowerCase();
  const detected: string[] = [];
  
  if (lower.includes('ladakh') || lower.includes('leh') || lower.includes('pangong') || lower.includes('nubra') || lower.includes('khardung')) detected.push('ladakh');
  if (lower.includes('spiti') || lower.includes('kaza') || lower.includes('key monastery') || lower.includes('chandratal')) detected.push('spiti');
  if (lower.includes('rajasthan') || lower.includes('jaipur') || lower.includes('jaisalmer') || lower.includes('udaipur') || lower.includes('desert')) detected.push('rajasthan');
  if (lower.includes('himachal') || lower.includes('manali') || lower.includes('kullu') || lower.includes('rohtang')) detected.push('himachal');
  if (lower.includes('kerala') || lower.includes('munnar') || lower.includes('kochi') || lower.includes('backwater')) detected.push('kerala');
  if (lower.includes('northeast') || lower.includes('assam') || lower.includes('meghalaya') || lower.includes('tawang') || lower.includes('arunachal')) detected.push('northeast');
  
  return detected.length > 0 ? detected : ['ladakh']; // Default to Ladakh
};

// Custom itinerary generator - creates personalized itineraries based on preferences
export const generateCustomItinerary = async (preferences: CustomItineraryPreferences, existingTrips: Trip[]): Promise<string> => {
  const duration = parseInt(preferences.duration) || 10;
  const travelers = preferences.travelers || '2';
  const destinations = detectDestinations(preferences.destinations);
  const style = styleCharacteristics[preferences.style] || styleCharacteristics['Adventure Focused'];
  const themes = parseInterests(preferences.interests);
  
  // Build day-by-day itinerary
  const days: string[] = [];
  let dayNum = 1;

  for (const dest of destinations) {
    const data = destinationData[dest] || destinationData['ladakh'];
    const daysForDest = Math.floor(duration / destinations.length);

    // Day 1: Arrival
    if (dayNum === 1) {
      days.push(`### Day ${dayNum}: Arrival in ${data.baseCity}
- Arrive at ${data.baseCity}, meet your riding crew and support team
- Bike allocation, safety briefing, and gear check
- Short acclimatization ride around the city (20-30 km)
- Evening: Welcome dinner with local cuisine and trip overview
- **Stay:** ${style.accommodation.split(',')[0]}`);
      dayNum++;
    }

    // Generate destination-specific days
    const destDays = daysForDest - 1;
    for (let i = 0; i < destDays && dayNum <= duration; i++) {
      let dayContent = `### Day ${dayNum}: `;
      
      // Determine day theme based on user interests and day number
      if (themes.includes('high_passes') && data.passes.length > 0 && i % 3 === 0) {
        const pass = data.passes[i % data.passes.length];
        dayContent += `${pass} Conquest\n`;
        dayContent += `- Early morning departure for the pass crossing\n`;
        dayContent += `- Stop at ${pass} summit for photos and hot chai\n`;
        dayContent += `- ${data.highlights[i % data.highlights.length] || 'Scenic route exploration'}\n`;
        dayContent += `- **Riding:** ${style.dailyRiding}\n`;
      } else if (themes.includes('monasteries') && data.monasteries.length > 0 && i % 3 === 1) {
        const monastery = data.monasteries[i % data.monasteries.length];
        dayContent += `${monastery} & Cultural Exploration\n`;
        dayContent += `- Morning visit to ${monastery}\n`;
Continue...