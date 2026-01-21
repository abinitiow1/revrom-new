import type { Trip } from '../types';

/**
 * Content Service - No external API dependencies.
 * Provides lightweight placeholder generation for images, packing lists, and itineraries.
 */

// Image placeholder service - uses free stock images (picsum.photos)
export const generateBlogImage = async (title: string): Promise<string> => {
  const seed = encodeURIComponent(
    (title || 'default')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  );

  const placeholderUrl = `https://picsum.photos/seed/${seed}/800/600`;
  return new Promise((resolve) => setTimeout(() => resolve(placeholderUrl), 250));
};

// Packing list generator - simple templates
export const generatePackingList = async (trip: Trip): Promise<string> => {
  const common = [
    'Helmet (DOT/ISI certified)',
    'Armored riding jacket + pants',
    'Riding gloves (warm + riding)',
    'Waterproof riding boots',
    'Thermal base layers + fleece',
    'Rain shell (jacket + pants)',
    'Sunscreen + lip balm (SPF)',
    'First-aid kit + personal meds',
    'Power bank + chargers',
    'Basic tool kit + puncture kit',
  ];

  const extra: Record<Trip['difficulty'], string[]> = {
    Intermediate: ['Casual shoes for evenings', 'Light down jacket'],
    Advanced: ['Extra warm layers', 'Spare gloves', 'Spare visor / goggles'],
    Expert: ['Satellite communicator (optional)', 'Emergency bivy / blanket', 'Spare tubes + mini pump'],
  };

  const list = [...common, ...(extra[trip.difficulty] || [])];
  const md = `## Packing List for ${trip.title}\n\n${list.map(i => `* ${i}`).join('\n')}`;
  return new Promise((resolve) => setTimeout(() => resolve(md), 350));
};

interface CustomItineraryPreferences {
  travelers: string;
  duration: string;
  destinations: string;
  style: string;
  interests: string;
}

type DestinationKey = 'ladakh' | 'spiti' | 'rajasthan' | 'himachal' | 'kerala' | 'northeast';

const destinationData: Record<DestinationKey, {
  baseCity: string;
  highlights: string[];
  passes: string[];
  monasteries: string[];
  lakes: string[];
  activities: string[];
}> = {
  ladakh: {
    baseCity: 'Leh',
    highlights: ['Magnetic Hill', 'Indus–Zanskar confluence', 'Nubra Valley dunes', 'Turtuk village', 'Hanle Dark Sky Reserve'],
    passes: ['Khardung La', 'Chang La', 'Wari La'],
    monasteries: ['Thiksey Monastery', 'Hemis Monastery', 'Diskit Monastery', 'Alchi Monastery'],
    lakes: ['Pangong Tso', 'Tso Moriri', 'Tso Kar'],
    activities: ['Camel ride in Nubra', 'Stargazing at Hanle', 'Indus rafting', 'Visit Leh Palace'],
  },
  spiti: {
    baseCity: 'Kaza',
    highlights: ['Chicham Bridge', 'Langza Fossil Village', 'Pin Valley', 'Komic village', 'Chandratal approach'],
    passes: ['Kunzum Pass', 'Rohtang Pass'],
    monasteries: ['Key Monastery', 'Tabo Monastery', 'Dhankar Monastery'],
    lakes: ['Chandratal Lake'],
    activities: ['Fossil hunt in Langza', 'Homestay in Hikkim', 'Pin Valley walk', 'Local cafés in Kaza'],
  },
  rajasthan: {
    baseCity: 'Jaipur',
    highlights: ['Amber Fort', 'Jaisalmer Fort', 'Mehrangarh Fort', 'Udaipur old city', 'Pushkar ghats'],
    passes: [],
    monasteries: [],
    lakes: ['Lake Pichola', 'Fateh Sagar Lake', 'Pushkar Lake'],
    activities: ['Desert camping', 'Camel safari', 'Heritage stays', 'Folk music evening'],
  },
  himachal: {
    baseCity: 'Manali',
    highlights: ['Solang Valley', 'Atal Tunnel', 'Sissu waterfall', 'Kullu Valley', 'Old Manali'],
    passes: ['Rohtang Pass', 'Jalori Pass'],
    monasteries: ['Keylong monastery area', 'Trilokinath temple region'],
    lakes: ['Prashar Lake'],
    activities: ['Paragliding (Solang)', 'River rafting (Kullu)', 'Cafe-hopping in Old Manali'],
  },
  kerala: {
    baseCity: 'Kochi',
    highlights: ['Western Ghats curves', 'Munnar tea roads', 'Athirappilly Falls', 'Alleppey backwaters', 'Wayanad forests'],
    passes: ['Lakkidi Ghat'],
    monasteries: [],
    lakes: ['Vembanad Lake', 'Periyar Lake'],
    activities: ['Houseboat cruise', 'Spice plantation tour', 'Kathakali show', 'Ayurveda session'],
  },
  northeast: {
    baseCity: 'Guwahati',
    highlights: ['Kaziranga', 'Cherrapunji', 'Living root bridges', 'Ziro Valley', 'Tawang approach'],
    passes: ['Sela Pass'],
    monasteries: ['Tawang Monastery'],
    lakes: ['Umiam Lake'],
    activities: ['Rhino safari (Kaziranga)', 'Root bridge trek', 'Tribal village visit'],
  },
};

const styleCharacteristics: Record<string, { pace: string; accommodation: string; dailyRiding: string; focus: string }> = {
  'Adventure Focused': {
    pace: 'challenging with early starts',
    accommodation: 'mix of camps, homestays, and basic hotels',
    dailyRiding: '150–250 km',
    focus: 'remote routes, rough sections, and big riding days',
  },
  'Relaxed & Scenic': {
    pace: 'leisurely with photo stops',
    accommodation: 'comfortable hotels and heritage stays',
    dailyRiding: '80–150 km',
    focus: 'views, comfort, and slow travel',
  },
  'Cultural Immersion': {
    pace: 'moderate with longer stops',
    accommodation: 'local homestays and boutique stays',
    dailyRiding: '100–180 km',
    focus: 'culture, food, and local places',
  },
  'Photography Tour': {
    pace: 'flexible around light',
    accommodation: 'stays near sunrise/sunset spots',
    dailyRiding: '80–150 km',
    focus: 'golden hour, landscapes, and portraits',
  },
  'Extreme Challenge': {
    pace: 'intensive and technical',
    accommodation: 'basic shelters and tents',
    dailyRiding: '200–300 km',
    focus: 'tough terrain and endurance',
  },
};

const parseInterests = (interests: string): string[] => {
  const themes: string[] = [];
  const lower = (interests || '').toLowerCase();

  if (lower.includes('pass') || lower.includes('mountain') || lower.includes('altitude')) themes.push('high_passes');
  if (lower.includes('monastery') || lower.includes('temple') || lower.includes('buddhist')) themes.push('monasteries');
  if (lower.includes('lake') || lower.includes('pangong') || lower.includes('tso')) themes.push('lakes');
  if (lower.includes('photo') || lower.includes('sunrise') || lower.includes('sunset')) themes.push('photography');
  if (lower.includes('food') || lower.includes('culture') || lower.includes('local')) themes.push('culture');

  return themes.length ? themes : ['general'];
};

const detectDestinations = (input: string): DestinationKey[] => {
  const lower = (input || '').toLowerCase();
  const detected: DestinationKey[] = [];

  if (lower.includes('ladakh') || lower.includes('leh') || lower.includes('pangong') || lower.includes('nubra')) detected.push('ladakh');
  if (lower.includes('spiti') || lower.includes('kaza') || lower.includes('chandratal')) detected.push('spiti');
  if (lower.includes('rajasthan') || lower.includes('jaipur') || lower.includes('jaisalmer') || lower.includes('udaipur')) detected.push('rajasthan');
  if (lower.includes('himachal') || lower.includes('manali') || lower.includes('kullu')) detected.push('himachal');
  if (lower.includes('kerala') || lower.includes('munnar') || lower.includes('kochi') || lower.includes('backwater')) detected.push('kerala');
  if (lower.includes('northeast') || lower.includes('assam') || lower.includes('meghalaya') || lower.includes('tawang') || lower.includes('arunachal')) detected.push('northeast');

  return detected.length ? detected : ['ladakh'];
};

export const generateCustomItinerary = async (
  preferences: CustomItineraryPreferences,
  existingTrips: Trip[]
): Promise<string> => {
  const duration = Math.max(2, parseInt(preferences.duration, 10) || 10);
  const travelers = (preferences.travelers || '2').trim();
  const destinations = detectDestinations(preferences.destinations);
  const style = styleCharacteristics[preferences.style] || styleCharacteristics['Adventure Focused'];
  const themes = parseInterests(preferences.interests);

  const destinationLabel = destinations.map(d => destinationData[d]?.baseCity || d).join(', ');

  const recommendedTrip = (() => {
    if (!existingTrips?.length) return null;
    const desired = destinations.join(' ').toLowerCase();
    return (
      [...existingTrips]
        .map(t => {
          const destScore = desired.includes((t.destination || '').toLowerCase()) ? 3 : 0;
          const dur = Number(t.duration) || 0;
          const durationScore = dur ? Math.max(0, 3 - Math.abs(dur - duration) / 3) : 0;
          return { trip: t, score: destScore + durationScore };
        })
        .sort((a, b) => b.score - a.score)[0]?.trip || null
    );
  })();

  const days: string[] = [];

  for (let dayNum = 1; dayNum <= duration; dayNum++) {
    const destKey = destinations[(dayNum - 2 + destinations.length) % destinations.length] || 'ladakh';
    const data = destinationData[destKey];
    const dayIndex = dayNum - 2;

    if (dayNum === 1) {
      const first = destinationData[destinations[0]] || data;
      days.push(`### Day 1: Arrival in ${first.baseCity}
* Arrive, meet the team, and do a quick gear check
* Easy acclimatization ride (20–30 km) and local briefing
* **Stay:** ${style.accommodation.split(',')[0]}`);
      continue;
    }

    if (dayNum === duration) {
      days.push(`### Day ${dayNum}: Departure & Wrap-Up
* Short morning ride / market time (optional)
* Pack up, share feedback, and plan the next mission
* Depart from ${data.baseCity}
* **Stay:** —`);
      continue;
    }

    const wantPasses = themes.includes('high_passes') && data.passes.length > 0;
    const wantMonasteries = themes.includes('monasteries') && data.monasteries.length > 0;
    const wantLakes = themes.includes('lakes') && data.lakes.length > 0;
    const wantCulture = themes.includes('culture') && data.activities.length > 0;

    let title = data.highlights[dayIndex % data.highlights.length] || 'Scenic Exploration';
    const bullets: string[] = [];

    if (wantPasses && dayIndex % 3 === 0) {
      const pass = data.passes[dayIndex % data.passes.length];
      title = `${pass} Crossing`;
      bullets.push('Early start for the climb and weather window');
      bullets.push('Summit stop for photos + hot chai');
    } else if (wantMonasteries && dayIndex % 3 === 1) {
      const monastery = data.monasteries[dayIndex % data.monasteries.length];
      title = `${monastery} & Local Culture`;
      bullets.push(`Visit ${monastery} and nearby viewpoints`);
      bullets.push('Explore a local market / village lanes');
    } else if (wantLakes && dayIndex % 3 === 2) {
      const lake = data.lakes[dayIndex % data.lakes.length];
      title = `${lake} Day Ride`;
      bullets.push(`Ride out to ${lake} for wide-open landscapes`);
      bullets.push('Relaxed photo stops, light snacks, and return by evening');
    } else if (wantCulture) {
      const activity = data.activities[dayIndex % data.activities.length];
      title = activity;
      bullets.push(`Local experience: ${activity}`);
    } else {
      bullets.push('Scenic ride + flexible stops based on road and weather');
    }

    bullets.push(`**Riding:** ${style.dailyRiding}`);
    bullets.push(`**Stay:** ${style.accommodation.split(',')[0]}`);

    days.push(`### Day ${dayNum}: ${title}\n${bullets.map(b => `* ${b}`).join('\n')}`);
  }

  const intro: string[] = [];
  intro.push(`# Your Custom ${duration}-Day Itinerary`);
  intro.push(`**Riders:** ${travelers}`);
  intro.push(`**Destinations:** ${destinationLabel}`);
  intro.push(`**Style:** ${preferences.style || 'Adventure Focused'} (${style.pace})`);
  intro.push(`**Focus:** ${style.focus}`);
  if (recommendedTrip) intro.push(`**Closest match from our tours:** ${recommendedTrip.title}`);

  const result = `${intro.join('\n')}\n\n${days.join('\n\n')}`;

  return new Promise((resolve) => setTimeout(() => resolve(result), 500));
};
