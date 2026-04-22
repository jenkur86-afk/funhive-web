import Link from 'next/link'
import { ACTIVE_STATES } from '@/lib/region-filter'
import { createServerClient } from '@/lib/supabase-server'
import HomeEvents from '@/components/HomeEvents'

export const dynamic = 'force-dynamic'

function getWeekendRange() {
  const now = new Date()
  const day = now.getDay()
  // If it's Saturday or Sunday, use this weekend
  let saturday: Date
  if (day === 6) {
    saturday = new Date(now)
  } else if (day === 0) {
    saturday = new Date(now)
    saturday.setDate(saturday.getDate() - 1)
  } else {
    saturday = new Date(now)
    saturday.setDate(saturday.getDate() + (6 - day))
  }
  saturday.setHours(0, 0, 0, 0)
  const sunday = new Date(saturday)
  sunday.setDate(sunday.getDate() + 1)
  sunday.setHours(23, 59, 59, 999)
  return {
    start: saturday.toISOString(),
    end: sunday.toISOString(),
  }
}

// Category config matching the events page
const CATEGORIES = [
  { name: 'Community', emoji: '🤝', color: '#f59e0b', href: '/events?category=Community' },
  { name: 'Storytimes & Library', emoji: '📚', color: '#8b5cf6', href: '/events?category=Storytimes+%26+Library' },
  { name: 'Festivals', emoji: '🎉', color: '#ec4899', href: '/events?category=Festivals' },
  { name: 'Arts & Culture', emoji: '🎨', color: '#a855f7', href: '/events?category=Arts+%26+Culture' },
  { name: 'Indoor', emoji: '🏠', color: '#6366f1', href: '/events?category=Indoor' },
  { name: 'Outdoor & Nature', emoji: '🌳', color: '#22c55e', href: '/events?category=Outdoor+%26+Nature' },
  { name: 'Classes & Workshops', emoji: '📋', color: '#0ea5e9', href: '/events?category=Classes+%26+Workshops' },
  { name: 'Animals & Wildlife', emoji: '🐾', color: '#f97316', href: '/events?category=Animals+%26+Wildlife' },
]

export default async function HomePage() {
  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const weekend = getWeekendRange()

  // Fetch upcoming events using TIMESTAMPTZ date column (not TEXT event_date)
  const { data: upcomingEvents } = await supabase
    .from('events')
    .select('id, name, event_date, date, start_time, end_time, venue, city, state, category')
    .not('event_date', 'is', null)
    .eq('reported', false)
    .gte('date', today)
    .in('state', ACTIVE_STATES || [])
    .order('date', { ascending: true })
    .limit(6)

  // This Weekend events using TIMESTAMPTZ date column
  const { data: weekendEvents } = await supabase
    .from('events')
    .select('id, name, event_date, date, start_time, end_time, venue, city, state, category')
    .not('event_date', 'is', null)
    .eq('reported', false)
    .gte('date', weekend.start)
    .lte('date', weekend.end)
    .in('state', ACTIVE_STATES || [])
    .order('date', { ascending: true })
    .limit(6)

  // Get total counts for stats
  const { count: eventCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
  const { count: venueCount } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })

  const formattedEventCount = (eventCount || 35000).toLocaleString()
  const formattedVenueCount = (venueCount || 6800).toLocaleString()

  return (
    <main>
      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #fbbf24 100%)' }}>
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center relative z-10">
          {/* Bee Logo */}
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto drop-shadow-lg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Hexagon background */}
              <path d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="3"/>
              {/* Bee body */}
              <ellipse cx="50" cy="55" rx="16" ry="20" fill="#F59E0B"/>
              {/* Bee stripes */}
              <path d="M34 50h32" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
              <path d="M36 58h28" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
              {/* Bee head */}
              <circle cx="50" cy="33" r="10" fill="#F59E0B"/>
              {/* Eyes */}
              <circle cx="46" cy="31" r="2.5" fill="#1C1917"/>
              <circle cx="54" cy="31" r="2.5" fill="#1C1917"/>
              {/* Smile */}
              <path d="M46 36c2 2 6 2 8 0" stroke="#1C1917" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              {/* Antennae */}
              <path d="M44 24c-3-6-8-8-10-7" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <path d="M56 24c3-6 8-8 10-7" stroke="#92400E" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="34" cy="17" r="3" fill="#FDE68A"/>
              <circle cx="66" cy="17" r="3" fill="#FDE68A"/>
              {/* Wings */}
              <ellipse cx="35" cy="45" rx="10" ry="7" fill="white" fillOpacity="0.6" transform="rotate(-20 35 45)"/>
              <ellipse cx="65" cy="45" rx="10" ry="7" fill="white" fillOpacity="0.6" transform="rotate(20 65 45)"/>
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-sm">
            FunHive
          </h1>
          <p className="text-xl md:text-2xl text-amber-100 mb-8 font-medium">
            Discover Family Fun Near You
          </p>

          {/* Search + Location Bar */}
          <form action="/events" method="get" className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  name="q"
                  placeholder="Search events, venues, activities..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gray-50"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition shadow-sm whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick action buttons */}
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/events"
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30"
            >
              Browse Events
            </Link>
            <Link
              href="/activities"
              className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition border border-white/30"
            >
              Explore Venues
            </Link>
          </div>
        </div>

        {/* Decorative honeycomb pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' viewBox='0 0 60 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='white' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 52px',
        }} />
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="bg-amber-900 text-white py-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-6 md:gap-12 text-center">
          <div>
            <span className="text-2xl font-bold">{formattedEventCount}+</span>
            <span className="text-amber-200 ml-2 text-sm">Events</span>
          </div>
          <div className="hidden sm:block text-amber-600">|</div>
          <div>
            <span className="text-2xl font-bold">{formattedVenueCount}+</span>
            <span className="text-amber-200 ml-2 text-sm">Venues</span>
          </div>
          <div className="hidden sm:block text-amber-600">|</div>
          <div>
            <span className="text-2xl font-bold">{ACTIVE_STATES?.length || 25}+</span>
            <span className="text-amber-200 ml-2 text-sm">States</span>
          </div>
          <div className="hidden sm:block text-amber-600">|</div>
          <div>
            <span className="text-2xl font-bold">100+</span>
            <span className="text-amber-200 ml-2 text-sm">Sources</span>
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORY STRIP ═══════════ */}
      <section className="max-w-6xl mx-auto py-10 px-4">
        <h2 className="text-2xl font-bold text-amber-900 mb-6 text-center">Browse by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={cat.href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:shadow-md transition bg-white border border-gray-100 group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{cat.emoji}</span>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════ EVENTS (location-aware client component) ═══════════ */}
      <HomeEvents
        serverUpcoming={upcomingEvents || []}
        serverWeekend={weekendEvents || []}
      />

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <h2 className="text-2xl font-bold text-amber-900 mb-10 text-center">How FunHive Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-amber-900 mb-2">Search & Discover</h3>
            <p className="text-gray-600 text-sm">Browse thousands of family events from libraries, parks, museums, and community centers near you.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="font-bold text-amber-900 mb-2">Filter & Personalize</h3>
            <p className="text-gray-600 text-sm">Filter by age range, category, distance, and date to find the perfect activities for your family.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-amber-900 mb-2">Save & Go</h3>
            <p className="text-gray-600 text-sm">Save your favorites, get directions, and make family memories at events you&apos;ll love.</p>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-amber-900 text-amber-100">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
                  <path d="M50 5L93.3 27.5V72.5L50 95L6.7 72.5V27.5L50 5Z" fill="#FDE68A" stroke="#F59E0B" strokeWidth="3"/>
                  <ellipse cx="50" cy="55" rx="16" ry="20" fill="#F59E0B"/>
                  <path d="M34 50h32" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
                  <path d="M36 58h28" stroke="#92400E" strokeWidth="4" strokeLinecap="round"/>
                  <circle cx="50" cy="33" r="10" fill="#F59E0B"/>
                  <circle cx="46" cy="31" r="2.5" fill="#1C1917"/>
                  <circle cx="54" cy="31" r="2.5" fill="#1C1917"/>
                </svg>
                <span className="text-xl font-bold text-white">FunHive</span>
              </div>
              <p className="text-amber-200 text-sm leading-relaxed max-w-sm">
                Helping families discover the best local events and activities. We aggregate from 100+ sources so you never miss the fun.
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

