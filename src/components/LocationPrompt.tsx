'use client'

import { useState, useEffect } from 'react'
import { getUserLocation } from '@/lib/geo-utils'
import { parseLocationInput, preloadZipData } from '@/lib/zip-lookup'

export const LOCATION_PROMPT_DISMISSED_KEY = 'funhive_location_prompt_dismissed'

interface LocationPromptProps {
  onLocationSet: (coords: { lat: number; lng: number }) => void
  onDismiss?: () => void
}

// First-visit banner prompting for location so the homepage can show nearby
// events instead of a broad multi-state pool. Dismissible and non-blocking —
// the homepage already has real (if unlocalized) content behind this prompt.
export default function LocationPrompt({ onLocationSet, onDismiss }: LocationPromptProps) {
  const [visible, setVisible] = useState(false)
  const [locating, setLocating] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    preloadZipData()
    try {
      const hasLocation = !!localStorage.getItem('funhive_location')
      const dismissed = !!localStorage.getItem(LOCATION_PROMPT_DISMISSED_KEY)
      if (!hasLocation && !dismissed) setVisible(true)
    } catch {}
  }, [])

  if (!visible) return null

  const persistAndSet = (loc: { lat: number; lng: number }) => {
    try {
      localStorage.setItem('funhive_location', JSON.stringify(loc))
    } catch {}
    onLocationSet(loc)
    setVisible(false)
  }

  const handleUseLocation = async () => {
    setLocating(true)
    setError('')
    const loc = await getUserLocation()
    setLocating(false)
    if (loc) {
      persistAndSet(loc)
    } else {
      setError('Unable to get your location. Try entering a zip code or city below instead.')
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    setSubmitting(true)
    setError('')
    const loc = await parseLocationInput(trimmed)
    setSubmitting(false)
    if (loc) {
      persistAndSet(loc)
    } else {
      setError('Could not find that location. Try a 5-digit zip code or "City, State".')
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(LOCATION_PROMPT_DISMISSED_KEY, '1')
    } catch {}
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-amber-900 font-semibold text-sm">Find fun near you</p>
          <p className="text-amber-700 text-xs mt-0.5">
            Share your location or enter a zip code to see events close to home.
          </p>
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </div>
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zip or city, state"
            className="px-3 py-2 rounded-lg border border-amber-200 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={submitting || !input.trim()}
            className="bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50 whitespace-nowrap"
          >
            {submitting ? 'Finding...' : 'Set Location'}
          </button>
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={locating}
            className="bg-white border border-amber-300 text-amber-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-amber-50 transition disabled:opacity-50 whitespace-nowrap"
          >
            {locating ? 'Locating...' : 'Use My Location'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-amber-600 hover:text-amber-800 text-xs underline whitespace-nowrap"
          >
            Not now
          </button>
        </form>
      </div>
    </div>
  )
}
