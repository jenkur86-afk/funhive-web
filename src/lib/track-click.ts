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
  | 'session_start'
  | 'signup'
  | 'signin'
  | 'checkout_start'
  | 'subscribe_success'

export interface InteractionPayload {
  event_id?: string
  activity_id?: string
  search_query?: string
  search_location?: string
  category?: string
  age_range?: string
  date_filter?: string
  radius_miles?: number
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
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

const SESSION_START_FLAG = 'funhive_session_started'
const FIRST_TOUCH_KEY = 'funhive_first_touch'

interface Acquisition {
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

function readAcquisition(): Acquisition {
  const acq: Acquisition = {}
  try {
    // Referrer: only keep external referrers (drop same-origin navigation).
    const ref = document.referrer
    if (ref && !ref.startsWith(window.location.origin)) acq.referrer = ref

    const params = new URLSearchParams(window.location.search)
    const source = params.get('utm_source')
    const medium = params.get('utm_medium')
    const campaign = params.get('utm_campaign')
    if (source) acq.utm_source = source
    if (medium) acq.utm_medium = medium
    if (campaign) acq.utm_campaign = campaign
  } catch {
    /* ignore */
  }
  return acq
}

// Log one `session_start` per browser session (per tab session via
// sessionStorage), capturing how the visitor arrived. Also persists the very
// first-touch acquisition in localStorage so a later signup/subscribe can be
// attributed to the original channel. Safe to call on every page mount.
export function trackSessionStart(): void {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(SESSION_START_FLAG)) return
    sessionStorage.setItem(SESSION_START_FLAG, '1')

    const acq = readAcquisition()

    // Record first-touch once, ever, for this visitor.
    if (!localStorage.getItem(FIRST_TOUCH_KEY) && (acq.referrer || acq.utm_source)) {
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(acq))
    }

    logInteraction('session_start', acq)
  } catch {
    /* fire-and-forget */
  }
}

// First-touch acquisition for this visitor, if we captured one. Attach to
// conversion events (signup, subscribe_success) so they're attributable even
// when the converting page has no UTM params of its own.
export function getFirstTouch(): Acquisition {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
