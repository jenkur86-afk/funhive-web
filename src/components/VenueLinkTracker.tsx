'use client'

import Link from 'next/link'
import { logInteraction } from '@/lib/track-click'

interface VenueLinkTrackerProps {
  activityId: string
  eventId?: string
  className?: string
  children: React.ReactNode
}

export default function VenueLinkTracker({ activityId, eventId, className, children }: VenueLinkTrackerProps) {
  return (
    <Link
      href={`/activities/${encodeURIComponent(activityId)}`}
      className={className}
      onClick={() => logInteraction('click_venue_link', { activity_id: activityId, event_id: eventId })}
    >
      {children}
    </Link>
  )
}
