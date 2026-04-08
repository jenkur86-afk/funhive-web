'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from '@/components/StarRating'
import type { Database } from '@/lib/database.types'

type Review = Database['public']['Tables']['reviews']['Row']

function WriteReviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const reviewId = searchParams.get('reviewId')
  const eventId = searchParams.get('eventId')
  const activityId = searchParams.get('activityId')
  const itemName = searchParams.get('activityName') || ''

  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(reviewId ? true : false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (reviewId && user) {
      loadExistingReview()
    }
  }, [reviewId, user])

  async function loadExistingReview() {
    if (!reviewId || !user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', reviewId)
        .eq('user_id', user.id)
        .single() as { data: any, error: any }

      if (error) {
        setError('Review not found or you do not have permission to edit it')
        return
      }

      if (data) {
        setRating(data.rating)
        setText(data.text || '')
      }
    } catch (err) {
      console.error('Error loading review:', err)
      setError('Error loading review')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!user) {
      setError('You must be signed in to submit a review')
      return
    }

    if (rating === 0) {
      setError('Please select a star rating')
      return
    }

    if (!text.trim()) {
      setError('Please enter a review')
      return
    }

    if (!eventId && !activityId) {
      setError('Invalid request - missing event or activity')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (reviewId) {
        // Update existing review
        const { error } = await (supabase
          .from('reviews') as any)
          .update({
            rating,
            text: text.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reviewId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new review
        const { error } = await (supabase
          .from('reviews') as any)
          .insert({
            user_id: user.id,
            event_id: eventId || null,
            activity_id: activityId || null,
            rating,
            text: text.trim(),
          })

        if (error) throw error
      }

      // Redirect based on what we came from
      if (eventId) {
        router.push(`/events/${encodeURIComponent(eventId)}`)
      } else if (activityId) {
        router.push(`/activities/${encodeURIComponent(activityId)}`)
      } else {
        router.push('/reviews')
      }
    } catch (err: any) {
      console.error('Error submitting review:', err)
      setError(err.message || 'Error submitting review')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-center text-amber-600">Loading...</div>
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-amber-50 rounded-lg border border-amber-200">
          <svg className="w-16 h-16 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h1 className="text-3xl font-bold text-amber-900 mb-3">Sign In Required</h1>
          <p className="text-amber-700 mb-8">Sign in to write a review</p>
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
    return <div className="max-w-2xl mx-auto px-4 py-8 text-center text-amber-600">Loading review...</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={
          eventId
            ? `/events/${encodeURIComponent(eventId)}`
            : activityId
              ? `/activities/${encodeURIComponent(activityId)}`
              : '/reviews'
        }
        className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-6 text-sm gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="bg-white rounded-lg shadow-md border border-amber-100 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {reviewId ? 'Edit Review' : 'Write a Review'}
        </h1>

        {itemName && (
          <p className="text-gray-600 mb-6">
            For: <span className="font-semibold text-amber-900">{itemName}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              How would you rate this?
            </label>
            <StarRating rating={rating} onChange={setRating} size="lg" />
          </div>

          {/* Text Review */}
          <div>
            <label htmlFor="text" className="block text-sm font-semibold text-gray-900 mb-2">
              Your Review
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder="Share your experience... (optional)"
              rows={6}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="text-xs text-gray-500 mt-1">
              {text.length} / 500 characters
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting || rating === 0 || !text.trim()}
              className="flex-1 bg-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : reviewId ? 'Update Review' : 'Post Review'}
            </button>
            <Link
              href={
                eventId
                  ? `/events/${encodeURIComponent(eventId)}`
                  : activityId
                    ? `/activities/${encodeURIComponent(activityId)}`
                    : '/reviews'
              }
              className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WriteReviewPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-center text-amber-600">Loading...</div>}>
      <WriteReviewContent />
    </Suspense>
  )
}
