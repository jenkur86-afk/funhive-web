import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import ActivityDetailHeader from '@/components/ActivityDetailHeader'
import ActivityActions from '@/components/ActivityActions'
import ReviewsList from '@/components/ReviewsList'

export const revalidate = 3600

interface ActivityDetailProps {
  params: Promise<{ id: string }>
}

export default async function ActivityDetailPage({ params }: ActivityDetailProps) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: activity, error } = await supabase
    .from('activities')
    .select('*')
    .eq('id', decodeURIComponent(id))
    .single()

  if (error || !activity) {
    notFound()
  }

  // Load events at this venue
  const { data: venueEvents } = await supabase
    .from('events')
    .select('id, name, event_date, start_time, end_time, category, city, state')
    .eq('activity_id', activity.id)
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })
    .limit(20)

  // Build Google Maps directions URL
  const getDirectionsUrl = () => {
    const coords = activity.location?.coordinates
    if (coords && coords.length === 2) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    }
    const address = [activity.address, activity.city, activity.state, activity.zip_code].filter(Boolean).join(', ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || activity.name)}`
  }

  const locationParts = [activity.address, activity.city, activity.state, activity.zip_code].filter(Boolean)
  const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header with favorite button */}
      <ActivityDetailHeader
        id={activity.id}
        name={activity.name}
        category={activity.category}
        subcategory={activity.subcategory}
      />

      <div className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
        {/* Image */}
        {activity.image_url && (
          <div className="w-full h-64 bg-amber-50">
            <img src={activity.image_url} alt={activity.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 md:p-8">

          {/* Hours Section */}
          {activity.hours && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Hours</h2>
              </div>
              <p className="text-gray-700 ml-7 whitespace-pre-line">{activity.hours}</p>
            </div>
          )}

          {/* Location Section */}
          {(locationDisplay || activity.name) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-900">Location</h2>
                </div>
                <a
                  href={getDirectionsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Get Directions &rarr;
                </a>
              </div>
              {locationDisplay && (
                <p className="text-gray-700 ml-7">{locationDisplay}</p>
              )}
            </div>
          )}

          {/* About Section */}
          {activity.description && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">About</h2>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line ml-7">{activity.description}</p>
            </div>
          )}

          {/* Age Range */}
          {activity.age_range && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Age Range</h2>
              </div>
              <p className="text-gray-700 ml-7">{activity.age_range}</p>
            </div>
          )}

          {/* Cost */}
          {(activity.price_range || activity.is_free) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Cost</h2>
              </div>
              <p className={`ml-7 font-medium ${activity.is_free ? 'text-green-600' : 'text-gray-700'}`}>
                {activity.is_free ? 'FREE' : activity.price_range || 'Contact for pricing'}
              </p>
            </div>
          )}

          {/* Contact Section - kept for reference display */}
          {(activity.url || activity.phone) && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
              </div>
              <div className="ml-7 space-y-2">
                {activity.url && (
                  <p className="text-sm text-gray-600">
                    Website: <span className="text-gray-700">{activity.url}</span>
                  </p>
                )}
                {activity.phone && (
                  <p className="text-sm text-gray-600">
                    Phone: <span className="text-gray-700">{activity.phone}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <ActivityActions
            activityId={activity.id}
            name={activity.name}
            address={locationDisplay ?? undefined}
            lat={activity.location?.coordinates?.[1]}
            lng={activity.location?.coordinates?.[0]}
            url={activity.url}
            phone={activity.phone}
          />

          {/* Browse More Venues */}
          <Link
            href="/activities"
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-sm mt-3"
          >
            Browse Venues
          </Link>

          {/* Metadata footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
            {activity.scraper_name && <span>Source: {activity.scraper_name}</span>}
            {activity.scraped_at && <span>Updated: {new Date(activity.scraped_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8">
        <ReviewsList activityId={activity.id} />
      </div>

      {/* Events at this venue */}
      {venueEvents && venueEvents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-amber-900 mb-4">
            Events at {activity.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venueEvents.map((e) => (
              <Link
                key={e.id}
                href={`/events/${encodeURIComponent(e.id)}`}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 border border-amber-100"
              >
                <h3 className="font-semibold text-amber-900 mb-1 text-sm">{e.name}</h3>
                <p className="text-xs text-gray-600">
                  {e.event_date}
                  {e.start_time && (
                    <span className="ml-2 text-amber-600">
                      {e.start_time}{e.end_time ? ` – ${e.end_time}` : ''}
                    </span>
                  )}
                </p>
                {(e.city || e.state) && (
                  <p className="text-xs text-gray-400">{[e.city, e.state].filter(Boolean).join(', ')}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
