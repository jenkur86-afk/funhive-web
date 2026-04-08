'use client'

import FavoriteButton from '@/components/FavoriteButton'
import ShareButton from '@/components/ShareButton'
import AddToCalendarButton from '@/components/AddToCalendarButton'
import DirectionsButton from '@/components/DirectionsButton'
import Link from 'next/link'

interface EventActionsProps {
  eventId: string
  title: string
  eventDate?: string
  startTime?: string
  endTime?: string
  address?: string
  venue?: string
  lat?: number
  lng?: number
  url?: string
  activityId?: string
}

export default function EventActions({
  eventId,
  title,
  eventDate,
  startTime,
  endTime,
  address,
  venue,
  lat,
  lng,
  url,
  activityId,
}: EventActionsProps) {
  const fullAddress = address || venue || ''
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
      <FavoriteButton
        eventId={eventId}
        itemName={title}
        className="border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
      />

      <ShareButton title={title} text={`Check out ${title}`} url={shareUrl} />

      <AddToCalendarButton
        title={title}
        location={fullAddress}
        startDate={eventDate}
        startTime={startTime}
        endTime={endTime}
      />

      {fullAddress && (
        <DirectionsButton address={fullAddress} lat={lat} lng={lng} venueName={venue} />
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-lg font-semibold hover:bg-amber-600 transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View Original Event
        </a>
      )}
    </div>
  )
}
