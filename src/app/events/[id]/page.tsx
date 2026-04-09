import Link from 'next/link'
import { createServerClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import EventDetailHeader from '@/components/EventDetailHeader'
import EventActions from '@/components/EventActions'
import ReviewsList from '@/components/ReviewsList'

export const dynamic = 'force-dynamic'

interface EventDetailProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', decodeURIComponent(id))
    .single()

  if (error || !event) {
    notFound()
  }

  // Try to load the linked activity/venue
  let venue = null
  if (event.activity_id) {
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('id', event.activity_id)
      .single()
    venue = data
  }

  // Build Google Maps directions URL
  const getDirectionsUrl = () => {
    const coords = event.location?.coordinates
    if (coords && coords.length === 2) {
      return `https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}`
    }
    const address = [event.address, event.city, event.state, event.zip_code].filter(Boolean).join(', ')
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }

  // Build location display
  const locationParts = [event.address, event.city, event.state, event.zip_code].filter(Boolean)
  const locationDisplay = locationParts.length > 0 ? locationParts.join(', ') : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header with favorite button */}
      <EventDetailHeader
        id={event.id}
        name={event.name}
        category={event.category}
        eventDate={event.event_date}
        startTime={event.start_time}
        endTime={event.end_time}
        state={event.state}
      />

      <div className="bg-white rounded-xl shadow-md border border-amber-100 overflow-hidden">
        {/* Event image */}
        {event.image_url && (
          <div className="w-full h-64 bg-amber-50">
            <img
              src={event.image_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">

          {/* Location Section */}
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

            <div className="ml-7 space-y-1">
              {/* Venue name - link to venue page if available */}
              {event.venue && (
                venue ? (
                  <Link
                    href={`/activities/${encodeURIComponent(venue.id)}`}
                    className="text-blue-600 hover:text-blue-800 font-medium block"
                  >
                    {event.venue}
                    <span className="text-xs text-gray-400 ml-2">View venue &rarr;</span>
                  </Link>
                ) : (
                  <p className="text-gray-800 font-medium">{event.venue}</p>
                )
              )}

              {/* Full address */}
              {locationDisplay && (
                <p className="text-gray-600">{locationDisplay}</p>
              )}
            </div>
          </div>

          {/* About Section */}
          {event.description && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">About</h2>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line ml-7">{event.description}</p>
            </div>
          )}

          {/* Age Range Section */}
          {event.age_range && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Age Range</h2>
              </div>
              <p className="text-gray-700 ml-7">{event.age_range}</p>
            </div>
          )}

          {/* Action Buttons */}
          <EventActions
            eventId={event.id}
            title={event.name}
            eventDate={event.event_date}
            startTime={event.start_time}
            endTime={event.end_time}
            address={locationDisplay ?? undefined}
            venue={event.venue}
            lat={event.location?.coordinates?.[1]}
            lng={event.location?.coordinates?.[0]}
            url={event.url}
            activityId={event.activity_id}
          />

          {/* Browse More Events */}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-sm mt-3"
          >
            Browse More Events
          </Link>

          {/* Metadata footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
            {event.scraper_name && <span>Source: {event.scraper_name}</span>}
            {event.scraped_at && <span>Updated: {new Date(event.scraped_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>

      {/* More events at this venue */}
      {venue && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-amber-900 mb-4">
            More at {venue.name}
          </h2>
          <VenueEvents venueId={venue.id} currentEventId={event.id} />
        </div>
      )}

      {/* Reviews Section */}
      <div className="mt-8">
        <ReviewsList eventId={event.id} />
      </div>
    </div>
  )
}

async function VenueEvents({ venueId, currentEventId }: { venueId: string; currentEventId: string }) {
  const supabase = createServerClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, name, event_date, city, state, category')
    .eq('activity_id', venueId)
    .neq('id', currentEventId)
    .not('event_date', 'is', null)
    .order('created_at', { ascending: false })
    .limit(6)

  if (!events || events.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {events.map((e) => (
        <Link
          key={e.id}
          href={`/events/${encodeURIComponent(e.id)}`}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-4 border border-amber-100"
        >
          <h3 className="font-semibold text-amber-900 mb-1 text-sm">{e.name}</h3>
          <p className="text-xs text-gray-600">{e.event_date}</p>
          {(e.city || e.state) && (
            <p className="text-xs text-gray-400">{[e.city, e.state].filter(Boolean).join(', ')}</p>
          )}
        </Link>
      ))}
    </div>
  )
}
