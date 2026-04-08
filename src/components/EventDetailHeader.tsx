'use client'

import Link from 'next/link'
import FavoriteButton from './FavoriteButton'
import { extractTimeFromEventDate } from '@/lib/hours-utils'

interface EventDetailHeaderProps {
  id: string
  name: string
  category?: string | null
  eventDate?: string | null
  startTime?: string | null
  endTime?: string | null
  state?: string | null
}

export default function EventDetailHeader({
  id,
  name,
  category,
  eventDate,
  startTime,
  endTime,
  state,
}: EventDetailHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href="/events"
        className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 text-sm gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </Link>

      <div className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{name}</h1>
              <div className="flex flex-wrap gap-2 mb-6">
                {category && (
                  <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg">
                    {category}
                  </span>
                )}
                {state && (
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg">
                    {state}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4">
              <FavoriteButton eventId={id} itemName={name} size="md" />
            </div>
          </div>

          {/* Schedule Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Date & Time</h2>
            </div>
            <p className="text-gray-700 ml-7">{eventDate || 'Contact for schedule'}</p>
            {(() => {
              if (startTime) {
                return (
                  <p className="text-amber-700 font-medium ml-7 mt-1">
                    {startTime}{endTime ? ` – ${endTime}` : ''}
                  </p>
                )
              }
              const extracted = extractTimeFromEventDate(eventDate ?? null)
              if (extracted) {
                return (
                  <p className="text-amber-700 font-medium ml-7 mt-1">
                    {extracted.startTime}{extracted.endTime ? ` – ${extracted.endTime}` : ''}
                  </p>
                )
              }
              return null
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
