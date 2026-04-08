'use client'

import { useState, useEffect } from 'react'

interface HideVenueButtonProps {
  venueId: string
  venueName: string
  onHide?: () => void
}

interface HiddenVenue {
  id: string
  name: string
}

export default function HideVenueButton({ venueId, venueName, onHide }: HideVenueButtonProps) {
  const [isHidden, setIsHidden] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('hidden_venues')
    if (stored) {
      try {
        const hidden: HiddenVenue[] = JSON.parse(stored)
        const isVenueHidden = hidden.some((v) => v.id === venueId)
        setIsHidden(isVenueHidden)
      } catch (e) {
        // Ignore parse error
      }
    }
  }, [venueId])

  const handleHide = () => {
    const confirmed = confirm(
      `Hide all events from ${venueName}? You can unhide in Settings.`
    )
    if (!confirmed) return

    const stored = localStorage.getItem('hidden_venues')
    let hidden: HiddenVenue[] = []

    if (stored) {
      try {
        hidden = JSON.parse(stored)
      } catch (e) {
        hidden = []
      }
    }

    // Check if already hidden
    const alreadyHidden = hidden.some((v) => v.id === venueId)
    if (!alreadyHidden) {
      hidden.push({ id: venueId, name: venueName })
      localStorage.setItem('hidden_venues', JSON.stringify(hidden))
      setIsHidden(true)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      onHide?.()
    }
  }

  const handleUnhide = () => {
    const stored = localStorage.getItem('hidden_venues')
    if (stored) {
      try {
        let hidden: HiddenVenue[] = JSON.parse(stored)
        hidden = hidden.filter((v) => v.id !== venueId)
        localStorage.setItem('hidden_venues', JSON.stringify(hidden))
        setIsHidden(false)
      } catch (e) {
        // Ignore parse error
      }
    }
  }

  if (isHidden) {
    return (
      <div className="inline-flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <span className="text-sm text-amber-700">This venue is hidden</span>
        <button
          onClick={handleUnhide}
          className="text-sm text-amber-600 hover:text-amber-700 font-semibold underline"
        >
          Unhide
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={handleHide}
        className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803M9.072 9.064C9.640 7.080 11.697 5.5 14 5.5c3.314 0 6 2.686 6 6 0 2.303-1.581 4.36-3.564 4.928m0 0l-5.864-5.865m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.072 9.064m6.414.176A6.973 6.973 0 0121 12a6.982 6.982 0 01-6.414 6.414m0 0L12.65 15.35m0 0a3 3 0 10-4.243-4.243"
          />
        </svg>
        Hide Venue
      </button>

      {showSuccess && (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
          Venue hidden successfully
        </div>
      )}
    </div>
  )
}
