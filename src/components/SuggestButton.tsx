'use client'

import { useState, useRef, useEffect } from 'react'

export default function SuggestButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<'event' | 'venue'>('event')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  // Close on click outside modal
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      // Small delay so the opening click doesn't immediately close
      setTimeout(() => document.addEventListener('mousedown', handleClick), 50)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

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
    setType('event')
    setName('')
    setLocation('')
    setUrl('')
    setNotes('')
    setStatus('idle')
    setErrorMsg('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setStatus('submitting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name: name.trim(),
          location: location.trim() || null,
          url: url.trim() || null,
          notes: notes.trim() || null,
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

  const handleClose = () => {
    setIsOpen(false)
    // Reset after animation
    setTimeout(resetForm, 300)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        aria-label="Suggest an event or venue"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <span className="hidden sm:inline">Suggest</span>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {status === 'success' ? 'Thank You!' : 'Suggest an Event or Venue'}
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
                  We got your suggestion!
                </p>
                <p className="text-gray-500 text-sm">
                  We&apos;ll review it and add it to FunHive if it&apos;s a good fit.
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
                {/* Type toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What are you suggesting?
                  </label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setType('event')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        type === 'event'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      An Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('venue')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                        type === 'venue'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      A Venue / Place
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="suggest-name" className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'event' ? 'Event Name' : 'Venue Name'} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="suggest-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === 'event' ? 'e.g. Spring Family Festival' : 'e.g. Sunny Meadows Farm'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                  />
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="suggest-location" className="block text-sm font-medium text-gray-700 mb-1">
                    Location / Address
                  </label>
                  <input
                    id="suggest-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. 123 Main St, Richmond, VA"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                  />
                </div>

                {/* URL */}
                <div>
                  <label htmlFor="suggest-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Website or Link
                  </label>
                  <input
                    id="suggest-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="suggest-notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Anything else?
                  </label>
                  <textarea
                    id="suggest-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dates, ages, what makes it great..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors resize-none"
                  />
                </div>

                {/* Error message */}
                {status === 'error' && (
                  <p className="text-sm text-red-600">{errorMsg}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'submitting' || !name.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-white font-semibold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === 'submitting' ? 'Submitting...' : 'Submit Suggestion'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
