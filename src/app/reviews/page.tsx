'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from '@/components/StarRating'
import type { Database } from '@/lib/database.types'

type Review = Database['public']['Tables']['reviews']['Row']

interface ReviewWithDetails extends Review {
  eventName?: string
  activityName?: string
}

export default function ReviewsPage() {
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      fetchReviews()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  async function fetchReviews() {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as { data: any[] | null, error: any }

      if (error) {
        console.error('Error fetching reviews:', error)
        setReviews([])
        return
      }

      // Enrich reviews with item names
      const enrichedReviews = await Promise.all(
        (data || []).map(async (review) => {
          let eventName: string | undefined = undefined
          let activityName: string | undefined = undefined

          if (review.event_id) {
            try {
              const { data: event } = await supabase
                .from('events')
                .select('name')
                .eq('id', review.event_id)
                .single() as { data: any, error: any }
              eventName = event?.name
            } catch (err) {
              console.error('Error fetching event:', err)
            }
          }

          if (review.activity_id) {
            try {
              const { data: activity } = await supabase
                .from('activities')
                .select('name')
                .eq('id', review.activity_id)
                .single() as { data: any, error: any }
              activityName = activity?.name
            } catch (err) {
              console.error('Error fetching activity:', err)
            }
          }

          return {
            ...review,
            eventName,
            activityName,
          }
        })
      )

      setReviews(enrichedReviews)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  async function deleteReview(reviewId: string) {
    if (!confirm('Are you sure you want to delete this review?')) {
      return
    }

    setDeleting(reviewId)
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user!.id)

      if (error) throw error

      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
    } catch (err) {
      console.error('Error deleting review:', err)
      alert('Error deleting review')
    } finally {
      setDeleting(null)
    }
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  const isRecentReview = (createdAt: string) => {
    const date = new Date(createdAt)
    const now = new Date()
    const hours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    return hours < 24
  }

  if (authLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-8 text-center text-amber-600">Loading...</div>
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-amber-50 rounded-lg border border-amber-200">
          <svg className="w-16 h-16 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className="text-3xl font-bold text-amber-900 mb-3">Sign In Required</h1>
          <p className="text-amber-700 mb-8">Sign in to view and manage your reviews</p>
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-amber-600">
        Loading reviews...
      </div>
    )
  }

  const totalHelpful = reviews.reduce((sum, r) => sum + r.helpful_count, 0)
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '0'

  if (reviews.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-8">My Reviews</h1>

        <div className="text-center py-12 bg-amber-50 rounded-lg border border-amber-200">
          <svg className="w-16 h-16 text-amber-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <h2 className="text-xl font-semibold text-amber-900 mb-2">No Reviews Yet</h2>
          <p className="text-amber-700 mb-8">Start sharing your experiences with the community</p>
          <Link
            href="/activities"
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition"
          >
            Explore Venues
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-amber-900 mb-8">My Reviews</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
          <p className="text-amber-600 text-sm font-medium mb-1">Total Reviews</p>
          <p className="text-3xl font-bold text-amber-900">{reviews.length}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
          <p className="text-amber-600 text-sm font-medium mb-1">Average Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold text-amber-900">{avgRating}</p>
            <StarRating rating={Math.round(parseFloat(avgRating))} size="sm" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
          <p className="text-amber-600 text-sm font-medium mb-1">Helpful Votes</p>
          <p className="text-3xl font-bold text-amber-900">{totalHelpful}</p>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-amber-200 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Link
                  href={
                    review.event_id
                      ? `/events/${encodeURIComponent(review.event_id)}`
                      : `/activities/${encodeURIComponent(review.activity_id!)}`
                  }
                  className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                >
                  {review.eventName || review.activityName || 'Review'}
                </Link>
                <div className="flex items-center gap-3 mt-2">
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs text-gray-500">{formatRelativeDate(review.created_at)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {isRecentReview(review.created_at) && (
                  <Link
                    href={`/reviews/write?reviewId=${review.id}`}
                    className="inline-flex items-center gap-1 text-xs px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                )}
                <button
                  onClick={() => deleteReview(review.id)}
                  disabled={deleting === review.id}
                  className="inline-flex items-center gap-1 text-xs px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>

            {review.text && (
              <p className="text-gray-700 mb-3 line-clamp-3">{review.text}</p>
            )}

            <div className="flex items-center text-xs text-gray-600">
              <svg className="w-4 h-4 text-amber-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              {review.helpful_count} {review.helpful_count === 1 ? 'person found' : 'people found'} this helpful
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
