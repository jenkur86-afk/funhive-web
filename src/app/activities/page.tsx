import { createServerClient } from '@/lib/supabase-server'
import { ACTIVE_STATES } from '@/lib/region-filter'
import ActivitiesPageClient from '@/components/ActivitiesPageClient'

export const dynamic = 'force-dynamic'

const ITEMS_PER_PAGE = 24

// Selective columns per CLAUDE.md's activities-list column set — never select('*') on a list query.
const ACTIVITY_LIST_COLS = 'id, name, city, state, address, location, zip_code, category, description, age_range, min_age, max_age, hours, is_free, reported'

// Server-rendered seed so crawlers (and the first paint for real users) see
// real venue names/links instead of an empty client-side loading shell.
// Deliberately unfiltered — the client component re-fetches with the user's
// actual filters once it mounts; this just needs to be a small, cheap,
// cacheable page so it doesn't add to Supabase egress on every crawl/page load.
export default async function ActivitiesPage() {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('activities')
    .select(ACTIVITY_LIST_COLS)
    .in('state', ACTIVE_STATES || [])
    .eq('reported', false)
    .order('name', { ascending: true })
    .limit(ITEMS_PER_PAGE)

  return <ActivitiesPageClient initialVenues={data || []} />
}
