'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import FavoriteButton from '@/components/FavoriteButton'

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const { favorites, loading: favoritesLoading } = useFavorites()

  if (authLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-8 text-center text-amber-600">Loading...</div>
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-amber-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h1 className="text-3xl font-bold text-amber-900 mb-4">My Favorites</h1>
          <p className="text-gray-600 mb-8">Sign in to save and manage your favorite events and venues</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (favoritesLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-amber-600">
        Loading favorites...
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-8">
          <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h1 className="text-3xl font-bold text-amber-900">My Favorites</h1>
        </div>

        <div className="text-center py-12 bg-amber-50 rounded-lg border border-amber-200">
          <svg className="w-16 h-16 text-amber-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <h2 className="text-xl font-semibold text-amber-900 mb-2">No Favorites Yet</h2>
          <p className="text-amber-700 mb-6">
            Tap the heart icon on any event or venue to save it here
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition mr-4"
          >
            Explore Events
          </Link>
          <Link
            href="/activities"
            className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 border-2 border-amber-500 px-6 py-3 rounded-lg font-semibold hover:bg-amber-100 transition"
          >
            Explore Venues
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <h1 className="text-3xl font-bold text-amber-900">My Favorites</h1>
        <span className="inline-flex items-center justify-center bg-amber-500 text-white w-6 h-6 rounded-full text-sm font-semibold ml-2">
          {favorites.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((favorite) => (
          <Link
            key={favorite.id}
            href={
              favorite.event_id
                ? `/events/${encodeURIComponent(favorite.event_id)}`
                : `/activities/${encodeURIComponent(favorite.activity_id!)}`
            }
            className="group bg-white rounded-lg shadow hover:shadow-md transition p-6 border border-amber-100"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-amber-900 group-hover:text-amber-700 flex-1 pr-2">
                {favorite.itemName || 'Unnamed Item'}
              </h3>
              <div onClick={(e) => e.preventDefault()}>
                <FavoriteButton
                  eventId={favorite.event_id || undefined}
                  activityId={favorite.activity_id || undefined}
                  size="md"
                />
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {favorite.itemType && (
                <span className="inline-block px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded font-medium">
                  {favorite.itemType === 'event' ? 'Event' : 'Venue'}
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Saved {new Date(favorite.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
