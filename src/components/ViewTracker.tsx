'use client'

import { useEffect } from 'react'
import { logInteraction, type InteractionType } from '@/lib/track-click'

interface ViewTrackerProps {
  type: Extract<InteractionType, 'view_event' | 'view_activity'>
  id: string
}

// Logs a view for direct/shared/SEO visits to a detail page. List pages already
// log views on click-through; this covers visits that never went through a list.
export default function ViewTracker({ type, id }: ViewTrackerProps) {
  useEffect(() => {
    logInteraction(type, type === 'view_event' ? { event_id: id } : { activity_id: id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id])

  return null
}
