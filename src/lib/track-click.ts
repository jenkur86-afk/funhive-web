import { supabase } from '@/lib/supabase'

const SESSION_KEY = 'funhive_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}

function getStoredLocation(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem('funhive_location')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export type InteractionType =
  | 'view_event'
  | 'view_activity'
  | 'click_directions'
  | 'click_source_url'
  | 'click_venue_link'
  | 'search'
  | 'filter_change'
  | 'favorite_add'
  | 'review_submit'

export interface InteractionPayload {
  event_id?: string
  activity_id?: string
  search_query?: string
  search_location?: string
  category?: string
  age_range?: string
  date_filter?: string
  radius_miles?: number
}

// Fire-and-forget interaction logger. Never throws, never awaited by callers —
// a Supabase outage or RLS misconfiguration here must never break the UI.
export function logInteraction(type: InteractionType, payload: InteractionPayload = {}): void {
  if (typeof window === 'undefined') return
  const loc = getStoredLocation()

  supabase
    .from('click_events')
    .insert({
      interaction_type: type,
      session_id: getSessionId(),
      user_lat: loc?.lat ?? null,
      user_lng: loc?.lng ?? null,
      ...payload,
    })
    .then(({ error }) => {
      if (error) console.debug('logInteraction failed (non-fatal):', error.message)
    })
}
