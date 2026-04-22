'use client'

import FavoriteButton from '@/components/FavoriteButton'
import ReportButton from '@/components/ReportButton'
import ShareButton from '@/components/ShareButton'
import DirectionsButton from '@/components/DirectionsButton'
import HideVenueButton from '@/components/HideVenueButton'

interface ActivityActionsProps {
  activityId: string
  name: string
  address?: string
  lat?: number
  lng?: number
  url?: string
  phone?: string
  onVenueHidden?: () => void
}

export default function ActivityActions({
  activityId,
  name,
  address,
  lat,
  lng,
  url,
  phone,
  onVenueHidden,
}: ActivityActionsProps) {
  const fullAddress = address || name || ''
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
      <FavoriteButton
        activityId={activityId}
        itemName={name}
        className="border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
      />

      <ShareButton title={name} text={`Check out ${name}`} url={shareUrl} />

      {fullAddress && (
        <DirectionsButton address={fullAddress} lat={lat} lng={lng} venueName={name} />
      )}

      <HideVenueButton venueId={activityId} venueName={name} onHide={onVenueHidden} />

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
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
            />
          </svg>
          Visit Website
        </a>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          Call
        </a>
      )}

      <ReportButton
        activityId={activityId}
        itemName={name}
        itemType="venue"
        size="md"
        className="border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200"
      />
    </div>
  )
}
