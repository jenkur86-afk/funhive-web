'use client'

import { useState } from 'react'

interface ShareButtonProps {
  title: string
  text: string
  url: string
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false)

  const handleShare = async () => {
    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        })
      } catch (err) {
        // User cancelled the share dialog, do nothing
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(url)
        setShowToast(true)
        setTimeout(() => setShowToast(false), 2000)
      } catch (err) {
        alert('Failed to copy URL to clipboard')
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
        title="Share this event"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.681 12.446 10.9 12 12.154 12c1.254 0 2.473.554 3.471 1.342m0 0a9.968 9.968 0 0 0-3.471-1.342m0 0a9.968 9.968 0 0 1 3.471-1.342m0 0c1.254 0 2.473.554 3.471 1.342m0 0a9.968 9.968 0 0 0-3.471-1.342m0 0a9.968 9.968 0 0 1 3.471-1.342M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        Share
      </button>

      {showToast && (
        <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
          Link copied to clipboard!
        </div>
      )}
    </div>
  )
}
