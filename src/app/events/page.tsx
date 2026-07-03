import { createServerClient } from '@/lib/supabase-server'
import { ACTIVE_STATES } from '@/lib/region-filter'
import EventsPageClient from '@/components/EventsPageClient'

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 24

// Selective columns per CLAUDE.md's events-list column set — never select('*') on a list query.
const EVENT_LIST_COLS = 'id, name, event_date, date, start_time, end_time, venue, city, state, zip_code, category, age_range, description, address, location, activity_id, reported'

// Server-rendered seed so crawlers (and the first paint for real users) see
// real event names/links instead of an empty client-side loading shell.
// Deliberately unfiltered/uncapped-by-params — the client component re-fetches
// with the user's actual filters once it mounts; this just needs to be a
// small, cheap, cacheable page so it doesn't add to Supabase egress on every
// crawl/page load the way an unbounded query would.
export default async function EventsPage() {
  const supabase = createServerClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('events')
    .select(EVENT_LIST_COLS)
    .not('event_date', 'is', null)
    .eq('reported', false)
    .gte('date', todayStr)
    .in('state', ACTIVE_STATES || [])
    .order('date', { ascending: true })
    .limit(ITEMS_PER_PAGE)

  return <EventsPageClient initialEvents={data || []} />
}
