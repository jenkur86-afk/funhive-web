'use client'

import { useEffect } from 'react'
import { trackSessionStart } from '@/lib/track-click'

// Fires a single `session_start` interaction per browser session, capturing
// referrer + UTM params so acquisition is attributable. Renders nothing.
// Reads window.location directly (no useSearchParams) so it needs no Suspense
// boundary.
export default function AcquisitionTracker() {
  useEffect(() => {
    trackSessionStart()
  }, [])
  return null
}
