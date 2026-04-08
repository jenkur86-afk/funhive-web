'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from './StarRating'
import type { Database } from '@/lib/database.types'

type Review = Database['public']['Tables']['reviews']['Row']

interface ReviewsListProps {
  eventId?: string
  activityId?: string
}

export default function ReviewsList({ eventId, activityId }: ReviewsListProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [userHelpfulVotes, setUserHelpfulVotes] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchReviews()
    if (user) {
      fetchUserHelpfulVotes()
    }
  }, [eventId, activityId, user])

  async function fetchReviews() {
    try {
      setLoading(true)
      let query = supabase.from('reviews').select('*')

      if (eventId) {
        query = query.eq('event_id', eventId)
      } else if (activityId) {
        query = query.eq('activity_id', activityId)
      } else {
        setLoading(false)
        return
      }

      const { data, error } = await query.order('created_at', { ascending: false }) as { data: any[] | null, error: any }

      if (error) {
        console.error('Error fetching reviews:', error)
        setReviews([])
        return
      }

      setReviews(data || [])
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserHelpfulVotes() {
    if (!user) return

    try {
      const reviewIds = reviews.map((r) => r.id)
      if (reviewIds.length === 0) return

      const { data, error } = await supabase
        .from('helpful_votes')
        .select('review_id')
        .eq('user_id', user.id)
        .in('review_id', reviewIds) as { data: any[] | null, error: any }

      if (error) {
        console.error('Error fetching helpful votes:', error)
        return
      }

      setUserHelpfulVotes(new Set(data?.map((v) => v.review_id) || []))
    } catch (err) {
      console.error('Error fetching helpful votes:', err)
    }
  }

  async function toggleHelpful(reviewId: string) {
    if (!user) {
      alert('Sign in to mark reviews as helpful')
      return
    }

    try {
      const hasVoted = userHelpfulVotes.has(reviewId)

      if (hasVoted) {
        // Remove helpful vote
        const { error } = await supabase
          .from('helpful_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('review_id', reviewId)

        if (error) throw error

        // Update review helpful count
        await (supabase
          .from('reviews') as any)
          .update({ helpful_count: Math.max(0, (reviews.find((r) => r.id === reviewId)?.helpful_count || 0) - 1) })
          .eq('id', reviewId)

        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, helpful_count: Math.max(0, r.helpful_count - 1) } : r
          )
        )

        setUserHelpfulVotes((prev) => {
          const next = new Set(prev)
          next.delete(reviewId)
          return next
        })
      } else {
        // Add helpful vote
        const { error } = await supabase
          .from('helpful_votes')
          .insert({ user_id: user.id, review_id: reviewId } as any)

        if (error) throw error

        // Update review helpful count
        await (supabase
          .from('reviews') as any)
          .update({ helpful_count: (reviews.find((r) => r.id === reviewId)?.helpful_count || 0) + 1 })
          .eq('id', reviewId)

        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
          )
        )

        setUserHelpfulVotes((prev) => new Set(prev).add(reviewId))
      }
    } catch (err) {
      console.error('Error toggling helpful vote:', err)
      alert('Error updating helpful vote')
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
    const weeks = Math.floor(days / 7)
    if (weeks < 4) return `${weeks}w ago`

    return date.toLocaleDateString()
  }

  if (!eventId && !activityId) {
    return null
  }

  if (loading) {
    return <div className="text-center py-8 text-amber-600">Loading reviews...</div>
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-amber-50 rounded-lg p-8 text-center border border-amber-200">
        <svg className="w-12 h-12 text-amber-300 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
        <p className="text-amber-900 font-medium mb-2">No reviews yet</p>
        <p className="text-amber-700 text-sm mb-4">Be the first to share your experience!</p>
        {user && (
          <Link
            href={`/reviews/write?${eventId ? `eventId=${eventId}` : `activityId=${activityId}`}`}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition"
          >
            Write a Review
          </Link>
        )}
        {!user && (
          <p className="text-amber-700 text-sm">Sign in to write a review</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Reviews</h3>
        {user && (
          <Link
            href={`/reviews/write?${eventId ? `eventId=${eventId}` : `activityId=${activityId}`}`}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition"
          >
            Write a Review
          </Link>
        )}
      </div>

      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold">
                {review.id.charAt(0).toUpperCase()}
              </div>
              <div>
                <StarRating rating={review.rating} size="sm" />
                <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(review.created_at)}</p>
              </div>
            </div>
          </div>

          {review.text && (
            <p className="text-gray-700 text-sm mb-3 line-clamp-3">{review.text}</p>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
            <button
              onClick={() => toggleHelpful(review.id)}
              className={`inline-flex items-center gap-1 text-xs font-medium transition ${
                userHelpfulVotes.has(review.id)
                  ? 'text-amber-600'
                  : 'text-gray-600 hover:text-amber-500'
              }`}
            >
              <svg className={`w-4 h-4 ${userHelpfulVotes.has(review.id) ? 'fill-current' : ''}`} fill={userHelpfulVotes.has(review.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 00-.75-.75A60.519 60.519 0 005.9 2.013m14.9 11.059a9.01 9.01 0 00-1.640-2.634l-.102-.127a3.1 3.1 0 00-1.243-1.123 6.006 6.006 0 00-2.712-.756A6.121 6.121 0 006.75 20.25M12 2.25A6.75 6.75 0 0118.75 9v.75a6.75 6.75 0 01-6.75 6.75h-.75a.75.75 0 00-.75.75v2.25a.75.75 0 00.75.75h.75A9 9 0 0015 3.75 9 9 0 006 12.75v5.25A2.25 2.25 0 008.25 20h5.25a.75.75 0 00.75-.75V15M12 2.25A6.75 6.75 0 005.25 9" />
              </svg>
              Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
