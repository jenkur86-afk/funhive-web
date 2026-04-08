'use client'

import Link from 'next/link'
import FavoriteButton from './FavoriteButton'

interface ActivityDetailHeaderProps {
  id: string
  name: string
  category?: string | null
  subcategory?: string | null
}

export default function ActivityDetailHeader({
  id,
  name,
  category,
  subcategory,
}: ActivityDetailHeaderProps) {
  return (
    <div className="mb-6">
      <Link
        href="/activities"
        className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 text-sm gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Venues
      </Link>

      <div className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{name}</h1>
              <div className="flex flex-wrap gap-2 mb-6">
                {category && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 text-sm font-medium rounded-lg">
                    {category}
                  </span>
                )}
                {subcategory && (
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg">
                    {subcategory}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4">
              <FavoriteButton activityId={id} itemName={name} size="md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
