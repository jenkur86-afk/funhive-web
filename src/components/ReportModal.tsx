'use client'

import { useState, useRef, useEffect } from 'react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId?: string
  activityId?: string
  itemName: string
  itemType: 'event' | 'venue'
}

const EVENT_REASONS = [
  { value: 'not_kid_friendly', label: 'Not kid friendly' },
  { value: 'incorrect_time_date_cancelled', label: 'Incorrect time/date or cancelled' },
  { value: 'duplicate_event', label: 'Duplicate event' },
  { value: 'spam_not_real', label: 'Spam or not a real event' },
  { value: 'broken_link', label: 'Broken link / can\'t find more info' },
]

const VENUE_REASONS = [
  { value: 'permanently_closed', label: 'Permanently closed' },
  { value: 'incorrect_address_location', label: 'Incorrect address or location' },
  { value: 'not_kid_friendly', label: 'Not kid friendly' },
]

export default function ReportModal({ isOpen, onClose, eventId, activityId, itemName, itemType }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  const reasons = itemType === 'event' ? EVENT_REASONS : VENUE_REASONS

  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Close on click outside modal
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const resetForm = () => {
    setReason('')
    setComment('')
    setHoneypot('')
    setStatus('idle')
    setErrorMsg('')
  }

  const handleClose = () => {
    onClose()
    setTimeout(resetForm, 300)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId || null,
          activity_id: activityId || null,
          reason,
          comment: comment.trim() || null,
          honeypot: honeypot || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={modalRef}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {status === 'success' ? 'Thank You!' : 'Report an Issue'}
          </h2>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 text-lg font-medium mb-1">
              Report submitted
            </p>
            <p className="text-gray-500 text-sm">
              We&apos;ll review this and take action shortly. Thanks for helping keep FunHive accurate!
            </p>
            <button
              onClick={handleClose}
              className="mt-6 rounded-lg bg-amber-500 px-6 py-2.5 text-white font-semibold hover:bg-amber-600 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Item name context */}
            <p className="text-sm text-gray-500">
              Reporting: <span className="font-medium text-gray-700">{itemName}</span>
            </p>

            {/* Reason radio buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What&apos;s the issue? <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="accent-amber-500"
                    />
                    <span className="text-sm text-gray-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional comment */}
            <div>
              <label htmlFor="report-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Additional details (optional)
              </label>
              <textarea
                id="report-comment"
                rows={2}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more about the issue..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors resize-none text-sm"
              />
            </div>

            {/* Honeypot — hidden from real users */}
            <div style={{ opacity: 0, position: 'absolute', top: 0, left: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }}>
              <label htmlFor="report-website">Leave this empty</label>
              <input
                id="report-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Error message */}
            {status === 'error' && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'submitting' || !reason}
              className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-white font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {status === 'submitting' ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
