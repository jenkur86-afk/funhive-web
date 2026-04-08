// Complete US location lookup
// - 43,800+ zip codes from /public/zip-codes.json
// - 31,500+ cities from /public/city-coords.json
// Data loaded on first use, cached in memory

let zipData: Record<string, [number, number]> | null = null
let cityData: Record<string, [number, number]> | null = null
let loadPromise: Promise<void> | null = null

async function ensureLoaded(): Promise<void> {
  if (zipData && cityData) return
  if (loadPromise) return loadPromise

  loadPromise = Promise.all([
    fetch('/zip-codes.json').then((res) => res.json()),
    fetch('/city-coords.json').then((res) => res.json()),
  ])
    .then(([zips, cities]) => {
      zipData = zips
      cityData = cities
    })
    .catch((err) => {
      console.error('Failed to load location data:', err)
      zipData = zipData || {}
      cityData = cityData || {}
    })

  return loadPromise
}

/**
 * Look up coordinates for a US zip code.
 * Returns { lat, lng } or null if not found.
 */
export async function lookupZip(zip: string): Promise<{ lat: number; lng: number } | null> {
  await ensureLoaded()
  const coords = zipData?.[zip]
  if (!coords) return null
  return { lat: coords[0], lng: coords[1] }
}

/**
 * Look up coordinates for a US city + state.
 * Input should be lowercase "city,state" (e.g. "baltimore,md")
 */
export async function lookupCity(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  await ensureLoaded()
  const key = `${city.toLowerCase().trim()},${state.toLowerCase().trim()}`
  const coords = cityData?.[key]
  if (!coords) return null
  return { lat: coords[0], lng: coords[1] }
}

/**
 * Parse location input: zip code, "lat, lng" coordinates, or "city, state".
 * Returns coordinates or null.
 */
export async function parseLocationInput(input: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try as zip code (5 digits)
  if (/^\d{5}$/.test(trimmed)) {
    return lookupZip(trimmed)
  }

  // Try as lat,lng coordinates (two numbers separated by comma)
  const coordMatch = trimmed.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/)
  if (coordMatch) {
    const a = parseFloat(coordMatch[1])
    const b = parseFloat(coordMatch[2])
    if (a >= -90 && a <= 90 && b >= -180 && b <= 180) {
      return { lat: a, lng: b }
    }
  }

  // Try as "city, state" (text with comma and 2-letter state abbreviation)
  const cityStateMatch = trimmed.match(/^([A-Za-z\s.'-]+),\s*([A-Za-z]{2})$/)
  if (cityStateMatch) {
    return lookupCity(cityStateMatch[1], cityStateMatch[2])
  }

  // Try as "city, state" with full state name (e.g. "Baltimore, Maryland")
  const cityFullStateMatch = trimmed.match(/^([A-Za-z\s.'-]+),\s*([A-Za-z]{3,})$/)
  if (cityFullStateMatch) {
    const abbr = stateNameToAbbr(cityFullStateMatch[2])
    if (abbr) {
      return lookupCity(cityFullStateMatch[1], abbr)
    }
  }

  return null
}

const STATE_NAME_MAP: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC', dc: 'DC',
}

function stateNameToAbbr(name: string): string | null {
  return STATE_NAME_MAP[name.toLowerCase().trim()] || null
}

/**
 * Synchronous zip lookup — only works AFTER data has been loaded.
 * Returns { lat, lng } or null. Use this in filter loops.
 */
export function lookupZipSync(zip: string): { lat: number; lng: number } | null {
  if (!zipData) return null
  const coords = zipData[zip]
  if (!coords) return null
  return { lat: coords[0], lng: coords[1] }
}

/**
 * Synchronous city lookup — only works AFTER data has been loaded.
 */
export function lookupCitySync(city: string, state: string): { lat: number; lng: number } | null {
  if (!cityData) return null
  const key = `${city.toLowerCase().trim()},${state.toLowerCase().trim()}`
  const coords = cityData[key]
  if (!coords) return null
  return { lat: coords[0], lng: coords[1] }
}

/**
 * Check if location data is loaded (for determining if sync lookups will work).
 */
export function isDataLoaded(): boolean {
  return zipData !== null && cityData !== null
}

/**
 * Preload location databases. Returns a promise that resolves when data is ready.
 */
export function preloadZipData(): Promise<void> {
  return ensureLoaded()
}
