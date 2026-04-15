'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FavoriteButton from '@/components/FavoriteButton'
import { haversineDistance, getUserLocation } from '@/lib/geo-utils'
import { isOpenNow, getTodayHours } from '@/lib/hours-utils'
import { parseLocationInput, preloadZipData, lookupZipSync, lookupCitySync } from '@/lib/zip-lookup'
import { getCategoryIcon } from '@/lib/category-icons'
import { ACTIVE_STATES } from '@/lib/region-filter'

interface HiddenVenue {
  id: string
  name: string
}

function getHiddenVenues(): HiddenVenue[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('hidden_venues')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const CATEGORIES = [
  'Community Events',
  'Storytimes & Library',
  'Learning & Culture',
  'Festivals & Celebrations',
  'Classes & Workshops',
  'Outdoor & Nature',
  'Arts & Culture',
  'Indoor Activities',
  'Animals & Wildlife',
]

const AGE_RANGES = [
  { label: 'Babies & Toddlers (0-2)', value: 'babies', min: 0, max: 2 },
  { label: 'Preschool (3-5)', value: 'preschool', min: 3, max: 5 },
  { label: 'Kids (6-8)', value: 'kids', min: 6, max: 8 },
  { label: 'Tweens (9-12)', value: 'tweens', min: 9, max: 12 },
  { label: 'Teens (13-18)', value: 'teens', min: 13, max: 18 },
]

const RADIUS_OPTIONS = [
  { label: '10 mi', value: 10 },
  { label: '25 mi', value: 25 },
  { label: '50 mi', value: 50 },
  { label: '100 mi', value: 100 },
  { label: '150 mi', value: 150 },
  { label: '200 mi', value: 200 },
]

// Inline always-visible pill toggle filter
function InlinePillFilter({
  options,
  selected,
  onToggle,
  showIcons = false,
}: {
  options: { label: string; value: string }[]
  selected: string[]
  onToggle: (value: string) => void
  showIcons?: boolean
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((option) => {
        const isSelected = selected.includes(option.value)
        const icon = showIcons ? getCategoryIcon(option.value) : null
        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
              isSelected
                ? 'text-white'
                : showIcons && icon
                ? ''
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
            style={
              isSelected && icon
                ? { backgroundColor: icon.color }
                : !isSelected && icon
                ? { color: icon.color, backgroundColor: icon.color + '15' }
                : isSelected
                ? { backgroundColor: '#f59e0b' }
                : undefined
            }
          >
            {icon && (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d={icon.path} />
              </svg>
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

const ITEMS_PER_PAGE = 24

export default function VenuesPage() {
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [freeOnly, setFreeOnly] = useState(false)
  const [openNowOnly, setOpenNowOnly] = useState(false)
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [selectedRadius, setSelectedRadius] = useState(25)
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState('')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

  // Debounce search query so DB queries don't fire on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Restore saved location from homepage "Use My Location"
  useEffect(() => {
    try {
      const saved = localStorage.getItem('funhive_location')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.lat && parsed.lng) {
          setLocationCoords(parsed)
          setLocationInput(`${parsed.lat.toFixed(4)}, ${parsed.lng.toFixed(4)}`)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    preloadZipData().then(() => loadVenues())
  }, [selectedCategories, locationCoords, selectedRadius, debouncedSearch])

  // Parse location input whenever it changes
  useEffect(() => {
    const trimmed = locationInput.trim()
    if (!trimmed) {
      setLocationCoords(null)
      setLocationError('')
      return
    }

    let cancelled = false
    parseLocationInput(trimmed).then((parsed) => {
      if (cancelled) return
      if (parsed) {
        setLocationCoords(parsed)
        setLocationError('')
      } else if (/^\d{5}$/.test(trimmed)) {
        setLocationCoords(null)
        setLocationError('Zip code not found. Try a city name (e.g. Baltimore, MD)')
      } else if (trimmed.includes(',')) {
        setLocationCoords(null)
        setLocationError('Location not recognized. Try: zip code, city + state, or lat,lng')
      } else {
        setLocationCoords(null)
        setLocationError('')
      }
    })

    return () => { cancelled = true }
  }, [locationInput])

  const handleUseMyLocation = async () => {
    const location = await getUserLocation()
    if (location) {
      setLocationCoords(location)
      setLocationInput(`${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`)
      setLocationError('')
    } else {
      setLocationError('Could not get your location. Please allow location access or enter a zip code.')
    }
  }

  async function loadVenues() {
    setLoading(true)
    try {
      let allData: any[] = []

      if (locationCoords) {
        // Use PostGIS spatial query for location-based search
        const result = await supabase.rpc('nearby_activities', {
          lng: locationCoords.lng,
          lat: locationCoords.lat,
          radius_miles: selectedRadius,
          max_results: 500,
        } as any) as { data: any[] | null; error: any }
        if (!result.error && result.data) {
          allData = result.data
        }

        // Also fetch venues without geometry that have city/state/zip
        let suppQuery = supabase
          .from('activities')
          .select('*')
          .is('location', null)
          .limit(300)

        if (debouncedSearch) {
          const term = `%${debouncedSearch}%`
          suppQuery = suppQuery.or(
            `name.ilike.${term},city.ilike.${term},description.ilike.${term},category.ilike.${term},address.ilike.${term}`
          )
        }

        const supplementary = await suppQuery

        if (!supplementary.error && supplementary.data) {
          const existingIds = new Set(allData.map((v: any) => v.id))
          const additional = supplementary.data.filter((v: any) => !existingIds.has(v.id))
          allData = [...allData, ...additional]
        }
      } else {
        // No location — use standard query
        let query = supabase
          .from('activities')
          .select('*')
          .in('state', ACTIVE_STATES || [])
          .order('name', { ascending: true })
          .limit(500)

        // When searching, add database-level text filter so relevant results
        // aren't crowded out by the 500-row limit
        if (debouncedSearch) {
          const term = `%${debouncedSearch}%`
          query = query.or(
            `name.ilike.${term},city.ilike.${term},description.ilike.${term},category.ilike.${term},address.ilike.${term}`
          )
        }

        const result = await query
        if (!result.error && result.data) allData = result.data
      }

      // Apply category filter client-side
      if (selectedCategories.length > 0) {
        allData = allData.filter((v: any) => selectedCategories.includes(v.category))
      }

      setVenues(allData)
    } catch (err) {
      console.error('Failed to load venues:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to check if a venue is free
  const isFreeVenue = (venue: any): boolean => {
    return venue.is_free === true
  }

  // Extract numeric age range from venue, returning {min, max} or null
  const extractVenueAgeRange = (venue: any): { min: number; max: number } | null => {
    // Use numeric min/max if available
    if (venue.min_age !== null && venue.min_age !== undefined && venue.max_age !== null && venue.max_age !== undefined) {
      return { min: venue.min_age, max: venue.max_age }
    }
    const ageStr = venue.age_range?.toLowerCase() || ''
    const content = `${venue.name || ''} ${venue.description || ''} ${ageStr}`.toLowerCase()

    const numMatch = ageStr.match(/(\d{1,2})\s*[-–to]+\s*(\d{1,2})/) ||
                     content.match(/ages?\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})/)
    if (numMatch) {
      const a = parseInt(numMatch[1]), b = parseInt(numMatch[2])
      if (a <= 18 && b <= 18) return { min: Math.min(a, b), max: Math.max(a, b) }
    }

    if (/\b(baby|babies|infant)\b/.test(content)) return { min: 0, max: 2 }
    if (/\btoddler/.test(content)) return { min: 0, max: 3 }
    if (/\b(preschool|pre-k)\b/.test(content)) return { min: 3, max: 5 }
    if (/\belementary/.test(content)) return { min: 5, max: 11 }
    if (/\btween/.test(content)) return { min: 9, max: 12 }
    if (/\bteen\b/.test(content)) return { min: 13, max: 18 }
    if (/\ball\s*ages\b/.test(content) || /\bfamil/.test(content)) return { min: 0, max: 18 }
    return null
  }

  // Check if venue's age range overlaps with any selected filter bracket
  const matchesAgeRange = (venue: any): boolean => {
    if (selectedAgeRanges.length === 0) return true
    const venueRange = extractVenueAgeRange(venue)
    if (!venueRange) return true
    return selectedAgeRanges.some((rangeValue) => {
      const bracket = AGE_RANGES.find(r => r.value === rangeValue)
      if (!bracket) return false
      return venueRange.min <= bracket.max && venueRange.max >= bracket.min
    })
  }

  const hiddenVenues = getHiddenVenues()

  // Extract lat/lng from venue, handling multiple location data formats
  const getCoords = (item: any): { lat: number; lng: number } | null => {
    const coords = item.location?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lat: coords[1], lng: coords[0] }
    }
    if (item.latitude && item.longitude) {
      return { lat: Number(item.latitude), lng: Number(item.longitude) }
    }
    if (item.zip_code) {
      const clean = String(item.zip_code).trim().slice(0, 5)
      if (/^\d{5}$/.test(clean)) return lookupZipSync(clean)
    }
    if (item.city && item.state) {
      return lookupCitySync(item.city, item.state)
    }
    return null
  }

  const filteredVenues = venues
    .filter((venue) => {
      const isVenueHidden = hiddenVenues.some((v) => v.id === venue.id)
      if (isVenueHidden) return false

      // Search across all venue data
      const matchesSearch = !searchQuery
        ? true
        : venue.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venue.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venue.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venue.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venue.state?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFree = !freeOnly || isFreeVenue(venue)
      const matchesOpenNow = !openNowOnly || isOpenNow(venue.hours)
      const matchesAge = matchesAgeRange(venue)

      // Filter by radius if location is active
      if (locationCoords) {
        const coords = getCoords(venue)
        if (!coords) return false
        const dist = haversineDistance(locationCoords.lat, locationCoords.lng, coords.lat, coords.lng)
        if (dist > selectedRadius) return false
      }

      return matchesSearch && matchesFree && matchesOpenNow && matchesAge
    })
    .sort((a, b) => {
      if (locationCoords) {
        const cA = getCoords(a)
        const cB = getCoords(b)
        const distA = cA ? haversineDistance(locationCoords.lat, locationCoords.lng, cA.lat, cA.lng) : 9999
        const distB = cB ? haversineDistance(locationCoords.lat, locationCoords.lng, cB.lat, cB.lng) : 9999
        return distA - distB
      }
      return 0
    })

  const getVenueDistance = (venue: any): number | null => {
    if (!locationCoords) return null
    const coords = getCoords(venue)
    if (!coords) return null
    return haversineDistance(locationCoords.lat, locationCoords.lng, coords.lat, coords.lng)
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const toggleAgeRange = (age: string) => {
    setSelectedAgeRanges((prev) =>
      prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]
    )
  }

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    searchQuery ||
    freeOnly ||
    openNowOnly ||
    selectedAgeRanges.length > 0 ||
    locationCoords

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
  }, [searchQuery, freeOnly, openNowOnly, selectedAgeRanges, selectedCategories, locationCoords])

  const handleClearAllFilters = () => {
    setSelectedCategories([])
    setSearchQuery('')
    setFreeOnly(false)
    setOpenNowOnly(false)
    setSelectedAgeRanges([])
    setLocationCoords(null)
    setLocationInput('')
    setLocationError('')
    setVisibleCount(ITEMS_PER_PAGE)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-amber-900">Venues</h1>
        {hasActiveFilters && (
          <button
            onClick={handleClearAllFilters}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search venues, descriptions, categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Location Search */}
      <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-xs font-medium text-amber-900 mb-2">Location</p>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="Zip code, city + state (e.g. Baltimore, Maryland)..."
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 rounded-lg border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          />
          <select
            value={selectedRadius}
            onChange={(e) => setSelectedRadius(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border border-amber-200 bg-white text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {RADIUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleUseMyLocation}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-600 transition"
          >
            Use My Location
          </button>
          {locationCoords && (
            <button
              onClick={() => { setLocationCoords(null); setLocationInput(''); setLocationError('') }}
              className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 transition"
            >
              Clear Location
            </button>
          )}
        </div>
        {locationError && (
          <p className="text-xs text-red-500 mt-2">{locationError}</p>
        )}
        {locationCoords && (
          <p className="text-xs text-green-600 mt-2">
            Showing venues within {selectedRadius} miles
          </p>
        )}
      </div>

      {/* Category Filter — always visible pills */}
      <div className="mb-4">
        <p className="text-xs font-medium text-amber-900 mb-2">Category</p>
        <InlinePillFilter
          options={CATEGORIES.map((c) => ({ label: c, value: c }))}
          selected={selectedCategories}
          onToggle={toggleCategory}
          showIcons
        />
      </div>

      {/* Age Filter — always visible pills */}
      <div className="mb-4">
        <p className="text-xs font-medium text-amber-900 mb-2">Age</p>
        <div className="flex gap-2 flex-wrap items-center">
          <InlinePillFilter
            options={AGE_RANGES}
            selected={selectedAgeRanges}
            onToggle={toggleAgeRange}
          />
          <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-sm cursor-pointer hover:bg-amber-100 transition">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span>Free Only</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-sm cursor-pointer hover:bg-amber-100 transition">
            <input
              type="checkbox"
              checked={openNowOnly}
              onChange={(e) => setOpenNowOnly(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span>Open Now</span>
          </label>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${filteredVenues.length} venue${filteredVenues.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Venue Cards */}
      {loading ? (
        <div className="text-center py-12 text-amber-600">Loading venues...</div>
      ) : filteredVenues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No venues found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.slice(0, visibleCount).map((venue) => {
              const distance = getVenueDistance(venue)
              const isOpen = isOpenNow(venue.hours)
              const todayHrs = getTodayHours(venue.hours)
              const catIcon = getCategoryIcon(venue.category)
              return (
                <div
                  key={venue.id}
                  className="group relative bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-amber-100"
                >
                  <Link
                    href={`/activities/${encodeURIComponent(venue.id)}`}
                    className="block"
                  >
                    <h3 className="font-semibold text-amber-900 mb-2">{venue.name}</h3>
                    {venue.address && <p className="text-sm text-gray-600 mb-1">{venue.address}</p>}
                    {(venue.city || venue.state) && (
                      <p className="text-sm text-gray-500">
                        {[venue.city, venue.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {/* Today's hours and Open/Closed status */}
                    {todayHrs && (
                      <p className="text-sm mt-1">
                        <span className="text-gray-500">Today: {todayHrs}</span>
                        {todayHrs !== 'Closed' && (
                          <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${
                            isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isOpen ? 'Open Now' : 'Closed Now'}
                          </span>
                        )}
                      </p>
                    )}
                    {!todayHrs && venue.hours && (
                      <p className="text-sm mt-1">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {isOpen ? 'Open Now' : 'Closed Now'}
                        </span>
                      </p>
                    )}
                    {distance !== null && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {distance.toFixed(1)} mi away
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {venue.category && catIcon && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ color: catIcon.color, backgroundColor: catIcon.color + '15' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d={catIcon.path} />
                          </svg>
                          {venue.category}
                        </span>
                      )}
                      {venue.age_range && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {venue.age_range}
                        </span>
                      )}
                      {isFreeVenue(venue) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          Free
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton activityId={venue.id} itemName={venue.name} size="sm" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More */}
          {visibleCount < filteredVenues.length && (
            <div className="text-center mt-8">
              <button
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                className="px-8 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
              >
                Load More ({filteredVenues.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
