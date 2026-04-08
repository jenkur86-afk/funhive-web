'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFavorites } from '@/contexts/FavoritesContext'

interface FavoriteButtonProps {
  eventId?: string
  activityId?: string
  itemName?: string
  size?: 'sm' | 'md'
  className?: string
}

export default function FavoriteButton({
  eventId,
  activityId,
  itemName,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const { user } = useAuth()
  const { isFavorited, toggleFavorite } = useFavorites()
  const [isLoading, setIsLoading] = useState(false)

  const favorited = isFavorited(eventId, activityId)

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      alert('Sign in to save favorites')
      return
    }

    setIsLoading(true)
    try {
      await toggleFavorite(eventId, activityId, itemName)
    } catch (err: any) {
      if (err.message?.includes('Upgrade to Premium')) {
        alert('Upgrade to Premium for unlimited favorites')
      } else {
        alert('Error updating favorite')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center transition-all ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {favorited ? (
        <svg
          className={`${sizeClasses[size]} text-amber-500 fill-current`}
          viewBox="0 0 24 24"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ) : (
        <svg
          className={`${sizeClasses[size]} text-gray-400 stroke-current fill-none`}
          viewBox="0 0 24 24"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  )
}
