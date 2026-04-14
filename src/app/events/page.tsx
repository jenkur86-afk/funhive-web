'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import FavoriteButton from '@/components/FavoriteButton'
import { haversineDistance, getUserLocation } from '@/lib/geo-utils'
import { parseLocationInput, preloadZipData, lookupZipSync, lookupCitySync } from '@/lib/zip-lookup'
import { extractTimeFromEventDate } from '@/lib/hours-utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { ACTIVE_STATES } from '@/lib/region-filter'

// Leaflet must be loaded client-side only (no SSR)
const EventMap = dynamic(() => import('@/components/EventMap'), { ssr: false })

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
  'Community',
  'Storytimes & Library',
  'Festivals',
  'Arts & Culture',
  'Indoor',
  'Outdoor & Nature',
  'Classes & Workshops',
  'Animals & Wildlife',
]

const AGE_RANGES = [
  { label: 'Toddlers (0-3)', value: 'toddlers' },
  { label: 'Kids (4-12)', value: 'kids' },
  { label: 'Teens (13-18)', value: 'teens' },
]

const DATE_FILTERS = ['All', 'Today', 'This Week', 'This Weekend', 'Next Week', 'Custom']

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

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showMap, setShowMap] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [freeOnly, setFreeOnly] = useState(false)
  const [selectedDateFilter, setSelectedDateFilter] = useState('All')
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null)
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [selectedRadius, setSelectedRadius] = useState(25)
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)

  // Debounce search query so DB queries don't fire on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    preloadZipData().then(() => loadEvents())
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


// Parse event_date strings like "April 1, 2026 10:00am" or "2026-04-09" into Date objects
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr + 'T00:00:00')
  // Try native parsing ("April 1, 2026 10:00am" works in most browsers)
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d
  return null
}

function isEventOnOrAfterToday(event: any): boolean {
  if (!event.event_date) return false
  const d = parseEventDate(event.event_date)
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d >= today
}

  async function loadEvents() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      let allData: any[] = []

      if (locationCoords) {
        // Use PostGIS spatial query for location-based search (events with geometry)
        const result = await supabase.rpc('nearby_events', {
          lng: locationCoords.lng,
          lat: locationCoords.lat,
          radius_miles: selectedRadius,
          max_results: 500,
        } as any) as { data: any[] | null; error: any }
        if (!result.error && result.data) {
          allData = result.data.filter((e: any) => isEventOnOrAfterToday(e) && (!ACTIVE_STATES || ACTIVE_STATES.includes(e.state)))
        }

        // Also fetch events WITHOUT geometry that have city/state/zip
        // so client-side fallback can compute distance
        let suppQuery = supabase
          .from('events')
          .select('*')
          .is('location', null)
          .not('event_date', 'is', null)
          .gte('date', today)
          .in('state', ACTIVE_STATES || [])
          .limit(300)

        if (debouncedSearch) {
          const term = `%${debouncedSearch}%`
          suppQuery = suppQuery.or(
            `name.ilike.${term},venue.ilike.${term},city.ilike.${term},description.ilike.${term},category.ilike.${term},address.ilike.${term}`
          )
        }

        const supplementary = await suppQuery

        if (!supplementary.error && supplementary.data) {
          // Deduplicate by id
          const existingIds = new Set(allData.map((e: any) => e.id))
          const additional = supplementary.data.filter((e: any) => !existingIds.has(e.id) && isEventOnOrAfterToday(e))
          allData = [...allData, ...additional]
        }
      } else {
        // No location — use standard query, ordered by date
        // Use the TIMESTAMPTZ `date` column for filtering & sorting
        // (the TEXT `event_date` column sorts alphabetically, not chronologically)
        let query = supabase
          .from('events')
          .select('*')
          .not('event_date', 'is', null)
          .in('state', ACTIVE_STATES || [])

        if (debouncedSearch) {
          // When searching, skip .gte('date') because some events have event_date
          // (TEXT) but no parsed date (TIMESTAMPTZ) — filter dates client-side instead
          const term = `%${debouncedSearch}%`
          query = query
            .or(
              `name.ilike.${term},venue.ilike.${term},city.ilike.${term},description.ilike.${term},category.ilike.${term},address.ilike.${term}`
            )
            .order('date', { ascending: true, nullsFirst: false })
            .limit(500)
        } else {
          // No search — filter future events at DB level for speed
          query = query
            .gte('date', today)
            .order('date', { ascending: true })
            .limit(500)
        }

        const result = await query
        if (!result.error && result.data) {
          allData = debouncedSearch
            ? result.data.filter((e: any) => isEventOnOrAfterToday(e))
            : result.data
        }
      }

      // Apply category filter client-side (works for both RPC and standard queries)
      if (selectedCategories.length > 0) {
        allData = allData.filter((e: any) => selectedCategories.includes(e.category))
      }

      setEvents(allData)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to check if an event is free
  const isFreeEvent = (event: any): boolean => {
    const name = event.name?.toLowerCase() || ''
    const description = event.description?.toLowerCase() || ''
    return name.includes('free') || description.includes('free') || event.is_free === true
  }

  // Helper function to check age range match (multi-select)
  const matchesAgeRange = (event: any): boolean => {
    if (selectedAgeRanges.length === 0) return true

    const name = event.name?.toLowerCase() || ''
    const description = event.description?.toLowerCase() || ''
    const ageRange = event.age_range?.toLowerCase() || ''
    const content = `${name} ${description} ${ageRange}`

    return selectedAgeRanges.some((range) => {
      switch (range) {
        case 'toddlers':
          return content.includes('toddler') || content.includes('0-3') || content.includes('baby') || content.includes('infant') || content.includes('preschool')
        case 'kids':
          return content.includes('kid') || content.includes('4-12') || content.includes('child') || content.includes('elementary') || content.includes('children')
        case 'teens':
          return content.includes('teen') || content.includes('13-18') || content.includes('adolescent') || content.includes('young adult')
        default:
          return true
      }
    })
  }

  // Helper function to check date range
  const matchesDateFilter = (event: any): boolean => {
    if (selectedDateFilter === 'All') return true
    if (!event.event_date) return false

    const eventDate = new Date(event.event_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dayOfWeek = today.getDay()
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

    switch (selectedDateFilter) {
      case 'Today':
        return eventDate.toDateString() === today.toDateString()

      case 'This Week': {
        const endOfWeek = new Date(today)
        endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday)
        endOfWeek.setHours(23, 59, 59, 999)
        return eventDate >= today && eventDate <= endOfWeek
      }

      case 'This Weekend': {
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : (6 - dayOfWeek + 7) % 7
        const saturday = new Date(today)
        saturday.setDate(saturday.getDate() + daysUntilSaturday)
        const sunday = new Date(saturday)
        sunday.setDate(sunday.getDate() + 1)
        sunday.setHours(23, 59, 59, 999)
        return eventDate >= saturday && eventDate <= sunday
      }

      case 'Next Week': {
        const nextWeekStart = new Date(today)
        nextWeekStart.setDate(nextWeekStart.getDate() + 7 + (daysUntilSunday ? daysUntilSunday + 1 : 1))
        const nextWeekEnd = new Date(nextWeekStart)
        nextWeekEnd.setDate(nextWeekEnd.getDate() + 6)
        nextWeekEnd.setHours(23, 59, 59, 999)
        return eventDate >= nextWeekStart && eventDate <= nextWeekEnd
      }

      case 'Custom': {
        if (!customDateRange) return false
        const startDate = new Date(customDateRange.start)
        const endDate = new Date(customDateRange.end)
        endDate.setHours(23, 59, 59, 999)
        return eventDate >= startDate && eventDate <= endDate
      }

      default:
        return true
    }
  }

  const hiddenVenues = getHiddenVenues()

  // Extract lat/lng from event, handling multiple location data formats
  const getCoords = (item: any): { lat: number; lng: number } | null => {
    // 1. GeoJSON format: { type: "Point", coordinates: [lng, lat] }
    const coords = item.location?.coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lat: coords[1], lng: coords[0] }
    }

    // 2. Direct latitude/longitude fields (some scrapers set these)
    if (item.latitude && item.longitude) {
      return { lat: Number(item.latitude), lng: Number(item.longitude) }
    }

    // 3. Fallback: look up the event's zip code in our 43K+ zip database
    if (item.zip_code) {
      const clean = String(item.zip_code).trim().slice(0, 5)
      if (/^\d{5}$/.test(clean)) return lookupZipSync(clean)
    }

    // 4. Last resort: look up the event's city + state
    if (item.city && item.state) {
      return lookupCitySync(item.city, item.state)
    }

    return null
  }

  const filteredEvents = events
    .filter((event) => {
      // Filter out events from hidden venues
      const isVenueHidden = hiddenVenues.some(
        (v) => v.id === event.activity_id || v.name === event.venue
      )
      if (isVenueHidden) return false

      // Search across all event data, not just name/venue/city
      const matchesSearch =
        !searchQuery ||
        event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.state?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFree = !freeOnly || isFreeEvent(event)
      const matchesAge = matchesAgeRange(event)
      const matchesDate = matchesDateFilter(event)

      // Filter by radius if location is active
      if (locationCoords) {
        const coords = getCoords(event)
        if (!coords) return false
        const dist = haversineDistance(locationCoords.lat, locationCoords.lng, coords.lat, coords.lng)
        if (dist > selectedRadius) return false
      }

      return matchesSearch && matchesFree && matchesAge && matchesDate
    })
    .sort((a, b) => {
      // Always sort by date first
      const dateA = a.date ? new Date(a.date).getTime() : a.event_date ? new Date(a.event_date).getTime() : Infinity
      const dateB = b.date ? new Date(b.date).getTime() : b.event_date ? new Date(b.event_date).getTime() : Infinity
      if (dateA !== dateB) return dateA - dateB

      // Secondary sort: distance if location search active
      if (locationCoords) {
        const cA = getCoords(a)
        const cB = getCoords(b)
        const distA = cA ? haversineDistance(locationCoords.lat, locationCoords.lng, cA.lat, cA.lng) : 9999
        const distB = cB ? haversineDistance(locationCoords.lat, locationCoords.lng, cB.lat, cB.lng) : 9999
        return distA - distB
      }
      return 0
    })

  // Calculate distance for each event if location search is active
  const getEventDistance = (event: any): number | null => {
    if (!locationCoords) return null
    const coords = getCoords(event)
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
    selectedDateFilter !== 'All' ||
    selectedAgeRanges.length > 0 ||
    locationCoords

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
  }, [searchQuery, freeOnly, selectedDateFilter, selectedAgeRanges, selectedCategories, locationCoords])

  const handleClearAllFilters = () => {
    setSelectedCategories([])
    setSearchQuery('')
    setFreeOnly(false)
    setSelectedDateFilter('All')
    setCustomDateRange(null)
    setShowCustomDate(false)
    setSelectedAgeRanges([])
    setLocationCoords(null)
    setLocationInput('')
    setLocationError('')
    setVisibleCount(ITEMS_PER_PAGE)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-amber-900">Events</h1>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition"
            >
              Clear All Filters
            </button>
          )}
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            {showMap ? 'List View' : 'Map View'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search events, descriptions, venues, categories..."
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
            Showing events within {selectedRadius} miles
          </p>
        )}
      </div>

      {/* Date Filter Pills */}
      <div className="mb-4">
        <p className="text-xs font-medium text-amber-900 mb-2">When</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DATE_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setSelectedDateFilter(filter)
                setShowCustomDate(filter === 'Custom')
              }}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                selectedDateFilter === filter
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        {showCustomDate && (
          <div className="flex gap-2 mt-3">
            <input
              type="date"
              value={customDateRange?.start || ''}
              onChange={(e) =>
                setCustomDateRange({
                  start: e.target.value,
                  end: customDateRange?.end || e.target.value,
                })
              }
              className="px-4 py-2 rounded-lg border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="date"
              value={customDateRange?.end || ''}
              onChange={(e) =>
                setCustomDateRange({
                  start: customDateRange?.start || '',
                  end: e.target.value,
                })
              }
              className="px-4 py-2 rounded-lg border border-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
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
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {loading ? 'Loading...' : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Map or List View */}
      {showMap && (locationCoords || userLocation) ? (
        <div className="h-[480px] rounded-xl overflow-hidden mb-8 border border-amber-200 shadow">
          <EventMap events={filteredEvents} center={(locationCoords || userLocation)!} />
        </div>
      ) : showMap ? (
        <div className="h-48 flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 mb-8">
          <p className="text-amber-700 text-sm">Enter a location above to view events on the map</p>
        </div>
      ) : null}

      {/* Event Cards */}
      {loading ? (
        <div className="text-center py-12 text-amber-600">Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No events found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.slice(0, visibleCount).map((event) => {
              const distance = getEventDistance(event)
              const catIcon = getCategoryIcon(event.category)
              return (
                <div
                  key={event.id}
                  className="group relative bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-amber-100"
                >
                  <Link
                    href={`/events/${encodeURIComponent(event.id)}`}
                    className="block"
                  >
                    <h3 className="font-semibold text-amber-900 mb-2">{event.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {event.event_date}
                      {(() => {
                        const st = event.start_time
                        const et = event.end_time
                        if (st) {
                          return (
                            <span className="ml-2 text-amber-600">
                              {st}{et ? ` – ${et}` : ''}
                            </span>
                          )
                        }
                        const extracted = extractTimeFromEventDate(event.event_date)
                        if (extracted) {
                          return (
                            <span className="ml-2 text-amber-600">
                              {extracted.startTime}{extracted.endTime ? ` – ${extracted.endTime}` : ''}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </p>
                    {event.venue && <p className="text-sm text-gray-500">{event.venue}</p>}
                    {(event.city || event.state) && (
                      <p className="text-sm text-gray-400">
                        {[event.city, event.state].filter(Boolean).join(', ')}
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
                      {event.category && catIcon && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded" style={{ color: catIcon.color, backgroundColor: catIcon.color + '15' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d={catIcon.path} />
                          </svg>
                          {event.category}
                        </span>
                      )}
                      {event.age_range && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {event.age_range}
                        </span>
                      )}
                      {isFreeEvent(event) && (
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
                    <FavoriteButton eventId={event.id} itemName={event.name} size="sm" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More */}
          {visibleCount < filteredEvents.length && (
            <div className="text-center mt-8">
              <button
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                className="px-8 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
              >
                Load More ({filteredEvents.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
