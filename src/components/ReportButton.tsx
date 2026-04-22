'use client'

import { useState } from 'react'
import ReportModal from './ReportModal'

interface ReportButtonProps {
  eventId?: string
  activityId?: string
  itemName: string
  itemType: 'event' | 'venue'
  size?: 'sm' | 'md'
  className?: string
}

export default function ReportButton({
  eventId,
  activityId,
  itemName,
  itemType,
  size = 'sm',
  className = '',
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sizeClasses = size === 'sm'
    ? 'h-8 w-8'
    : 'h-10 w-10'

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }}
        className={`${sizeClasses} flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-red-50 hover:shadow-md text-gray-400 hover:text-red-500 transition-all ${className}`}
        aria-label={`Report ${itemType}`}
        title={`Report this ${itemType}`}
      >
        {/* Flag icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={iconSize}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
        </svg>
      </button>

      <ReportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        eventId={eventId}
        activityId={activityId}
        itemName={itemName}
        itemType={itemType}
      />
    </>
  )
}
