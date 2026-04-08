'use client'

import { useState, useEffect } from 'react'

interface DirectionsButtonProps {
  address: string
  lat?: number
  lng?: number
  venueName?: string
}

interface MapsPreference {
  service: 'google' | 'apple' | 'waze'
}

export default function DirectionsButton({ address, lat, lng, venueName }: DirectionsButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [savedPreference, setSavedPreference] = useState<MapsPreference | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('maps_preference')
    if (stored) {
      try {
        setSavedPreference(JSON.parse(stored))
      } catch (e) {
        // Ignore parse error
      }
    }
  }, [])

  const getDirectionsUrl = (service: 'google' | 'apple' | 'waze'): string => {
    switch (service) {
      case 'google':
        return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
      case 'apple':
        return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`
      case 'waze':
        if (lat && lng) {
          return `https://waze.com/ul?ll=${lat},${lng}&q=${encodeURIComponent(venueName || address)}`
        }
        return `https://waze.com/ul?q=${encodeURIComponent(address)}`
      default:
        return ''
    }
  }

  const handleSelectService = (service: 'google' | 'apple' | 'waze') => {
    localStorage.setItem('maps_preference', JSON.stringify({ service }))
    setSavedPreference({ service })
    setShowDropdown(false)
    window.open(getDirectionsUrl(service), '_blank')
  }

  const handleClick = () => {
    if (savedPreference) {
      window.open(getDirectionsUrl(savedPreference.service), '_blank')
    } else {
      setShowDropdown(!showDropdown)
    }
  }

  const handleChangeService = () => {
    setShowDropdown(true)
  }

  const handleReset = () => {
    localStorage.removeItem('maps_preference')
    setSavedPreference(null)
    setShowDropdown(true)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Directions
      </button>

      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 space-y-2">
            <button
              onClick={() => handleSelectService('google')}
              className="w-full text-left px-4 py-2 hover:bg-amber-50 rounded transition text-sm font-medium text-gray-700"
            >
              Google Maps
            </button>
            <button
              onClick={() => handleSelectService('apple')}
              className="w-full text-left px-4 py-2 hover:bg-amber-50 rounded transition text-sm font-medium text-gray-700"
            >
              Apple Maps
            </button>
            <button
              onClick={() => handleSelectService('waze')}
              className="w-full text-left px-4 py-2 hover:bg-amber-50 rounded transition text-sm font-medium text-gray-700"
            >
              Waze
            </button>

            <div className="border-t border-gray-100 pt-2 mt-2">
              <label className="flex items-center gap-2 px-4 py-2 text-xs text-gray-600 cursor-pointer hover:bg-amber-50 rounded">
                <input type="checkbox" className="w-3 h-3" disabled defaultChecked={true} />
                Remember my choice
              </label>
            </div>
          </div>
        </div>
      )}

      {savedPreference && !showDropdown && (
        <button
          onClick={handleChangeService}
          className="text-xs text-amber-600 hover:text-amber-700 underline ml-2 align-middle inline-block"
        >
          Change maps app
        </button>
      )}
    </div>
  )
}
