import Link from 'next/link'
import { ACTIVE_STATES } from '@/lib/region-filter'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic' // Render at runtime, not build time

function getWeekendRange() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  const daysUntilSat = day === 0 ? 6 : (6 - day + 7) % 7
  const saturday = new Date(now)
  saturday.setDate(saturday.getDate() + daysUntilSat)
  saturday.setHours(0, 0, 0, 0)
  const sunday = new Date(saturday)
  sunday.setDate(sunday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: saturday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}


// Parse non-ISO event_date strings for filtering
function parseEventDateServer(dateStr: string): Date | null {
  if (!dateStr) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return new Date(dateStr + 'T00:00:00')
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d
  return null
}

export default async function HomePage() {
  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const weekend = getWeekendRange()

  // Upcoming events: soonest future events by date
  const { data: rawUpcoming } = await supabase
    .from('events')
    .select('*')
    .not('event_date', 'is', null)
    .in('state', ACTIVE_STATES || [])
    .order('event_date', { ascending: true })
    .limit(200)
  const upcomingEvents = (rawUpcoming || []).filter(e => {
    const d = parseEventDateServer(e.event_date)
    if (!d) return false
    const t = new Date(today + 'T00:00:00')
    d.setHours(0,0,0,0)
    return d >= t
  }).slice(0, 6)

  // This Weekend: events on the upcoming Saturday + Sunday
  const { data: weekendEvents } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', weekend.start)
    .lte('event_date', weekend.end)
    .order('event_date', { ascending: true })
    .limit(12)

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-amber-50 to-white py-16 px-4 text-center">
        <h1 className="text-4xl font-bold text-amber-900 mb-4">
          Family Fun Starts Here
        </h1>
        <p className="text-lg text-amber-700 mb-6 max-w-2xl mx-auto">
          Discover family-friendly events and activities near you from 100+ local sources — libraries, parks, museums, and more.
        </p>

        {/* Search Bar */}
        <form action="/events" method="get" className="max-w-xl mx-auto mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              placeholder="Search events, venues, activities..."
              className="flex-1 px-5 py-3 rounded-lg border border-amber-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex gap-4 justify-center">
          <Link
            href="/events"
            className="bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition"
          >
            Browse Events
          </Link>
          <Link
            href="/activities"
            className="border-2 border-amber-500 text-amber-700 px-6 py-3 rounded-lg font-semibold hover:bg-amber-50 transition"
          >
            Explore Venues
          </Link>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-amber-900">Upcoming Events</h2>
          <Link href="/events" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
            View all &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents && upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${encodeURIComponent(event.id)}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-amber-100"
              >
                <h3 className="font-semibold text-amber-900 mb-2">{event.name}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  {event.event_date}
                  {event.start_time && (
                    <span className="ml-2 text-amber-600">
                      {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                    </span>
                  )}
                </p>
                {event.venue && <p className="text-sm text-gray-500">{event.venue}</p>}
                {(event.city || event.state) && (
                  <p className="text-sm text-gray-400">{[event.city, event.state].filter(Boolean).join(', ')}</p>
                )}
                {event.category && (
                  <span className="inline-block mt-2 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                    {event.category}
                  </span>
                )}
              </Link>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6 border border-amber-100">
              <p className="text-gray-500">No upcoming events yet — check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* This Weekend */}
      <section className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-amber-900">This Weekend</h2>
          <Link href="/events?date=This+Weekend" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
            View all &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {weekendEvents && weekendEvents.length > 0 ? (
            weekendEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${encodeURIComponent(event.id)}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-amber-100"
              >
                <h3 className="font-semibold text-amber-900 mb-2">{event.name}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  {event.event_date}
                  {event.start_time && (
                    <span className="ml-2 text-amber-600">
                      {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                    </span>
                  )}
                </p>
                {event.venue && <p className="text-sm text-gray-500">{event.venue}</p>}
                {(event.city || event.state) && (
                  <p className="text-sm text-gray-400">{[event.city, event.state].filter(Boolean).join(', ')}</p>
                )}
                {event.category && (
                  <span className="inline-block mt-2 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded">
                    {event.category}
                  </span>
                )}
              </Link>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6 border border-amber-100">
              <p className="text-gray-500">No weekend events found — check back later!</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-900 text-amber-100 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-3">FunHive</h3>
              <p className="text-amber-200 text-sm leading-relaxed">
                Helping families discover the best local events and activities. Aggregating from 100+ sources so you never miss the fun.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/events" className="hover:text-white transition">Events</Link></li>
                <li><Link href="/activities" className="hover:text-white transition">Venues</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Premium</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/auth/login" className="hover:text-white transition">Sign In</Link></li>
                <li><Link href="/favorites" className="hover:text-white transition">My Favorites</Link></li>
                <li><Link href="/profile" className="hover:text-white transition">Profile</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-amber-800 mt-8 pt-8 text-center text-sm text-amber-300">
            &copy; {new Date().getFullYear()} FunHive. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  )
}
