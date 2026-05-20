/**
 * AI Provider Generator
 * When a user requests a service in a city with no providers in Firestore,
 * Gemini generates realistic provider profiles on-the-fly and caches them.
 */
import { callGeminiJSON } from './gemini';
import { isFirebaseAvailable, getDB } from './firebase-admin';
import { Provider } from '../utils/types';
import { v4 as uuid } from 'uuid';

// City coordinates lookup (expandable)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'islamabad':   { lat: 33.6844, lng: 72.9906 },
  'rawalpindi':  { lat: 33.5651, lng: 73.0169 },
  'lahore':      { lat: 31.5204, lng: 74.3587 },
  'karachi':     { lat: 24.8607, lng: 67.0011 },
  'peshawar':    { lat: 34.0151, lng: 71.5249 },
  'quetta':      { lat: 30.1798, lng: 66.9750 },
  'multan':      { lat: 30.1575, lng: 71.5249 },
  'faisalabad':  { lat: 31.4504, lng: 73.1350 },
  'hyderabad':   { lat: 25.3960, lng: 68.3578 },
  'gujranwala':  { lat: 32.1877, lng: 74.1945 },
  'sialkot':     { lat: 32.4945, lng: 74.5229 },
  'abbottabad':  { lat: 34.1458, lng: 73.2122 },
  'bahawalpur':  { lat: 29.3956, lng: 71.6836 },
};

function getCityCoords(city: string): { lat: number; lng: number } {
  const key = city.toLowerCase().split(',')[0].trim();
  return CITY_COORDS[key] || { lat: 30.3753, lng: 69.3451 }; // Pakistan center as fallback
}

function jitter(coord: number, range = 0.05): number {
  return coord + (Math.random() - 0.5) * range;
}

/** Generate realistic Pakistani provider names by gender */
function randomName(gender: 'male' | 'female'): string {
  const male = ['Ahmed', 'Muhammad', 'Ali', 'Usman', 'Bilal', 'Hassan', 'Tariq', 'Zubair', 'Imran', 'Kamran', 'Naveed', 'Waseem'];
  const surnames = ['Khan', 'Ahmed', 'Hussain', 'Ali', 'Malik', 'Sheikh', 'Qureshi', 'Chaudhry', 'Akhtar', 'Butt'];
  const female = ['Fatima', 'Ayesha', 'Zainab', 'Sara', 'Nadia', 'Sana', 'Hina', 'Amna'];
  const first = gender === 'male'
    ? male[Math.floor(Math.random() * male.length)]
    : female[Math.floor(Math.random() * female.length)];
  const last = surnames[Math.floor(Math.random() * surnames.length)];
  return `${first} ${last}`;
}

/** Check Firestore cache first, then generate if missing */
export async function getOrGenerateProviders(
  city: string,
  serviceType: string,
  count = 3
): Promise<Provider[]> {
  // 1. Try Firestore cache
  if (isFirebaseAvailable()) {
    try {
      const snap = await getDB()
        .collection('providers')
        .where('location.city', '==', city)
        .where('service_types', 'array-contains', serviceType)
        .limit(count)
        .get();

      if (!snap.empty) {
        console.log(`🗄️  Firestore: Found ${snap.size} providers for ${serviceType} in ${city}`);
        return snap.docs.map(d => d.data() as Provider);
      }
    } catch (e) {
      console.warn('Firestore provider lookup failed, falling back to AI generation');
    }
  }

  // 2. Generate with AI
  console.log(`🤖 AI generating ${count} providers for ${serviceType} in ${city}...`);
  return generateProvidersWithAI(city, serviceType, count);
}

/** Fetch all providers from Firestore (or fall back to an empty array) */
export async function getAllProvidersFromDB(): Promise<Provider[]> {
  if (!isFirebaseAvailable()) return [];
  try {
    const snap = await getDB().collection('providers').limit(100).get();
    return snap.docs.map(d => d.data() as Provider);
  } catch {
    return [];
  }
}

async function generateProvidersWithAI(city: string, serviceType: string, count: number): Promise<Provider[]> {
  const coords = getCityCoords(city);

  const prompt = `Generate ${count} realistic Pakistani service providers for "${serviceType}" in ${city}, Pakistan.

Return a JSON array of objects with EXACTLY this structure:
[
  {
    "name": "Full Pakistani Name",
    "experience_years": <number 1-20>,
    "avg_rating": <number 3.5-5.0>,
    "rating_count": <number 20-400>,
    "on_time_percentage": <number 70-98>,
    "cancellation_rate": <number 1-10>,
    "total_jobs": <number 50-600>,
    "base_rate_pkr": <number appropriate for service in Pakistan>,
    "bio": "1-2 sentence realistic bio in English mentioning ${city}",
    "verified": <true or false>,
    "certifications": [<0-2 relevant certification strings>],
    "skills": [<2-4 specific skill strings for ${serviceType}>]
  }
]

Rules:
- Use authentic Pakistani names (Urdu names like Ahmed Khan, Fatima Malik, etc.)
- Base rates must be realistic for Pakistan (AC repair: 1500-4000 PKR, plumbing: 800-3000 PKR, etc.)
- Mix of verified and unverified providers
- Ratings and stats must be internally consistent (high jobs = more ratings)
- Return ONLY the JSON array, no markdown`;

  try {
    const generated = await callGeminiJSON<any[]>(prompt);

    const providers: Provider[] = generated.slice(0, count).map((g, i) => {
      const gender = Math.random() > 0.15 ? 'male' : 'female'; // Pakistan market reality
      const id = `ai-${city.toLowerCase().replace(/\s/g, '-')}-${serviceType}-${uuid().slice(0, 8)}`;
      const cityCoord = { lat: jitter(coords.lat), lng: jitter(coords.lng) };

      return {
        id,
        name: g.name || randomName(gender as 'male' | 'female'),
        phone: `+92-3${String(Math.floor(Math.random() * 9))}${Math.random().toString().slice(2, 10)}`,
        location: {
          lat: cityCoord.lat,
          lng: cityCoord.lng,
          area: city,
          city,
          formatted_address: `${city}, Pakistan`,
        },
        service_types: [serviceType],
        skills: g.skills || [serviceType],
        certifications: g.certifications || [],
        experience_years: g.experience_years || 3,
        gender: gender as 'male' | 'female',
        verified: g.verified ?? (Math.random() > 0.4),
        max_jobs_per_day: 4,
        languages: ['urdu'],
        availability: {
          monday: ['09:00-18:00'], tuesday: ['09:00-18:00'], wednesday: ['09:00-18:00'],
          thursday: ['09:00-18:00'], friday: ['14:00-18:00'], saturday: ['09:00-15:00'], sunday: [],
        },
        rate_card: { [serviceType]: g.base_rate_pkr || 2000 },
        stats: {
          total_jobs: g.total_jobs || 100,
          completed_jobs: Math.floor((g.total_jobs || 100) * 0.95),
          on_time_percentage: g.on_time_percentage || 85,
          cancellation_rate: g.cancellation_rate || 5,
          avg_rating: g.avg_rating || 4.2,
          rating_count: g.rating_count || 50,
        },
        reviews: [],
        bio: g.bio || `Experienced ${serviceType.replace(/_/g, ' ')} specialist in ${city}.`,
        _ai_generated: true,
        _generated_at: new Date().toISOString(),
      } as Provider & { _ai_generated: boolean; _generated_at: string };
    });

    // Cache in Firestore for future requests
    if (isFirebaseAvailable()) {
      const batch = getDB().batch();
      for (const p of providers) {
        batch.set(getDB().collection('providers').doc(p.id), JSON.parse(JSON.stringify(p)));
      }
      batch.commit().catch(() => {}); // non-blocking
      console.log(`💾 Cached ${providers.length} AI-generated providers for ${city}/${serviceType}`);
    }

    return providers;
  } catch (e: any) {
    console.error('AI provider generation failed:', e.message);
    return [];
  }
}
