'use client'

import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function StarRating({
  rating,
  onChange,
  size = 'md',
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  const isInteractive = !!onChange

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const displayRating = isInteractive && hoverRating > 0 ? hoverRating : rating

  const handleStarClick = (value: number) => {
    if (onChange && isInteractive) {
      onChange(value)
    }
  }

  return (
    <div
      className={`flex gap-1 items-center ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
      onMouseLeave={() => setHoverRating(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!isInteractive}
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => isInteractive && setHoverRating(star)}
          className={`transition-all ${
            isInteractive ? 'hover:scale-110' : ''
          } disabled:cursor-default`}
          aria-label={`Rate ${star} stars`}
        >
          {star <= displayRating ? (
            <svg
              className={`${sizeClasses[size]} text-amber-400 fill-current`}
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ) : (
            <svg
              className={`${sizeClasses[size]} text-gray-300 fill-current`}
              viewBox="0 0 24 24"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
