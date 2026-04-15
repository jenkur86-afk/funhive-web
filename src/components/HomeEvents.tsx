'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ACTIVE_STATES } from '@/lib/region-filter'

const CATEGORIES = [
  { name: 'Community', emoji: '🤝', color: '#f59e0b' },
  { name: 'Storytimes & Library', emoji: '📚', color: '#8b5cf6' },
  { name: 'Festivals', emoji: '🎉', color: '#ec4899' },
  { name: 'Arts & Culture', emoji: '🎨', color: '#a855f7' },
  { name: 'Indoor', emoji: '🏠', color: '#6366f1' },
  { name: 'Outdoor & Nature', emoji: '🌳', color: '#22c55e' },
  { name: 'Classes & Workshops', emoji: '📋', color: '#0ea5e9' },
  { name: 'Animals & Wildlife', emoji: '🐾', color: '#f97316' },
]

function getWeekendRange() {
  const now = new Date()
  const day = now.getDay()
  let saturday: Date
  if (day === 6) saturday = new Date(now)
  else if (day === 0) { saturday = new Date(now); saturday.setDate(saturday.getDate() - 1) }
  else { saturday = new Date(now); saturday.setDate(saturday.getDate() + (6 - day)) }
  saturday.setHours(0, 0, 0, 0)
  const sunday = new Date(saturday)
  sunday.setDate(sunday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)
  return { start: saturday.toISOString(), end: sunday.toISOString() }
}

function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr + 'T00:00:00')
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

interface Props {
  serverUpcoming: any[]
  serverWeekend: any[]
}

export default function HomeEvents({ serverUpcoming, serverWeekend }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationName, setLocationName] = useState('')
  const [locating, setLocating] = useState(false)
  const [upcoming, setUpcoming] = useState<any[]>(serverUpcoming)
  const [weekend, setWeekend] = useState<any[]>(serverWeekend)
  const [loading, setLoading] = useState(false)

  // When coords change, fetch nearby events
  useEffect(() => {
    if (!coords) {
      setUpcoming(serverUpcoming)
      setWeekend(serverWeekend)
      return
    }

    async function fetchNearby() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const weekendRange = getWeekendRange()

      try {
        // Fetch nearby events via PostGIS RPC
        const { data: nearbyData } = await supabase.rpc('nearby_events', {
          lng: coords!.lng,
          lat: coords!.lat,
          radius_miles: 50,
          max_results: 500,
        } as any) as { data: any[] | null; error: any }

        if (nearbyData) {
          const futureEvents = nearbyData
            .filter((e: any) => isEventOnOrAfterToday(e) && ACTIVE_STATES?.includes(e.state))
            .sort((a: any, b: any) => {
              const da = a.date ? new Date(a.date).getTime() : Infinity
              const db = b.date ? new Date(b.date).getTime() : Infinity
              return da - db
            })

          setUpcoming(futureEvents.slice(0, 6))

          // Filter for weekend — try TIMESTAMPTZ date first, fall back to parsing event_date text
          const weekendStart = new Date(weekendRange.start)
          const weekendEnd = new Date(weekendRange.end)
          const weekendFiltered = futureEvents.filter((e: any) => {
            const d = e.date ? new Date(e.date) : parseEventDate(e.event_date)
            if (!d || isNaN(d.getTime())) return false
            return d >= weekendStart && d <= weekendEnd
          })
          setWeekend(weekendFiltered.slice(0, 6))
        }
      } catch (err) {
        console.error('Failed to fetch nearby events:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNearby()
  }, [coords])

  // On mount, check if user previously granted location
  useEffect(() => {
    try {
      const saved = localStorage.getItem('funhive_location')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.lat && parsed.lng) {
          setCoords(parsed)
          setLocationName(`${parsed.lat.toFixed(2)}, ${parsed.lng.toFixed(2)}`)
        }
      }
    } catch {}
  }, [])

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const loc = { lat: latitude, lng: longitude }
        setCoords(loc)
        setLocationName(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
        setLocating(false)
        // Persist so category links and events page can use it
        try { localStorage.setItem('funhive_location', JSON.stringify(loc)) } catch {}
      },
      () => {
        alert('Unable to get your location. Please allow location access.')
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  const handleClearLocation = () => {
    setCoords(null)
    setLocationName('')
    try { localStorage.removeItem('funhive_location') } catch {}
  }

  return (
    <>
      {/* Location bar */}
      <div className="max-w-6xl mx-auto px-4 pt-6 flex items-center gap-3 flex-wrap">
        {coords ? (
          <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Showing events within 50 mi
            <button onClick={handleClearLocation} className="ml-1 text-amber-600 hover:text-amber-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ) : (
          <button
            onClick={handleUseLocation}
            disabled={locating}
            className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-amber-600 transition shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {locating ? 'Getting location...' : 'Use My Location'}
          </button>
        )}
        {loading && <span className="text-sm text-amber-600 animate-pulse">Loading nearby events...</span>}
      </div>

      {/* ═══════════ UPCOMING EVENTS ═══════════ */}
      <section className="max-w-6xl mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-amber-900">
            {coords ? 'Nearby Events' : 'Upcoming Events'}
          </h2>
          <Link href="/events" className="text-amber-600 hover:text-amber-700 text-sm font-semibold flex items-center gap-1">
            View all
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcoming && upcoming.length > 0 ? (
            upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 bg-amber-50 rounded-2xl">
              <p className="text-amber-700 text-lg">{coords ? 'No nearby events found' : 'No upcoming events yet'}</p>
              <Link href="/events" className="text-amber-600 underline text-sm mt-2 inline-block">Browse all events</Link>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════ THIS WEEKEND ═══════════ */}
      <section className="bg-amber-50 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-amber-900">
              {coords ? 'This Weekend Nearby' : 'This Weekend'}
            </h2>
            <Link href="/events?date=This+Weekend" className="text-amber-600 hover:text-amber-700 text-sm font-semibold flex items-center gap-1">
              View all
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {weekend && weekend.length > 0 ? (
              weekend.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl">
                <p className="text-amber-700 text-lg">{coords ? 'No weekend events nearby' : 'No weekend events yet'}</p>
                <p className="text-gray-500 text-sm mt-1">Check back closer to the weekend!</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function EventCard({ event }: { event: any }) {
  const catConfig = CATEGORIES.find(c => event.category?.includes(c.name.split(' ')[0]))
  const emoji = catConfig?.emoji || '📅'
  const catColor = catConfig?.color || '#f59e0b'

  let displayDate = event.event_date || ''
  if (event.date) {
    try {
      const d = new Date(event.date)
      displayDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    } catch {}
  }

  return (
    <Link
      href={`/events/${encodeURIComponent(event.id)}`}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-5 border border-gray-100 flex flex-col"
    >
      {event.category && (
        <span
          className="inline-flex items-center gap-1 self-start px-3 py-1 rounded-full text-xs font-medium mb-3"
          style={{ backgroundColor: catColor + '15', color: catColor }}
        >
          <span>{emoji}</span>
          {event.category}
        </span>
      )}
      <h3 className="font-semibold text-gray-900 mb-2 leading-snug line-clamp-2">{event.name}</h3>
      <p className="text-sm text-amber-700 font-medium mb-1 flex items-center gap-1.5">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        {displayDate}
        {event.start_time && (
          <span className="text-gray-500">
            {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}
          </span>
        )}
      </p>
      {event.venue && (
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="truncate">{event.venue}</span>
        </p>
      )}
      {(event.city || event.state) && (
        <p className="text-xs text-gray-400 mt-1 ml-6">{[event.city, event.state].filter(Boolean).join(', ')}</p>
      )}
    </Link>
  )
}
