'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import type { Database } from '@/lib/database.types'

type UserFavorite = Database['public']['Tables']['user_favorites']['Row']

interface FavoriteWithName extends UserFavorite {
  itemName?: string
  itemType?: 'event' | 'activity'
}

interface FavoritesContextType {
  favorites: FavoriteWithName[]
  favoritesCount: number
  loading: boolean
  isFavorited(eventId?: string, activityId?: string): boolean
  toggleFavorite(eventId?: string, activityId?: string, itemName?: string): Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

const FAVORITES_LIMIT_FREE = 10

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteWithName[]>([])
  const [loading, setLoading] = useState(true)
  const { user, userProfile } = useAuth()

  // Fetch favorites when user changes
  useEffect(() => {
    if (!user) {
      setFavorites([])
      setLoading(false)
      return
    }

    fetchFavorites()
  }, [user])

  async function fetchFavorites() {
    if (!user) {
      setFavorites([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as { data: any[] | null, error: any }

      if (error) {
        console.error('Error fetching favorites:', error)
        setFavorites([])
        return
      }

      // Enrich favorites with item names
      const enrichedFavorites = await Promise.all(
        (data || []).map(async (fav) => {
          let itemName: string | undefined = undefined
          let itemType: 'event' | 'activity' | undefined = undefined

          if (fav.event_id) {
            try {
              const { data: event } = await supabase
                .from('events')
                .select('name')
                .eq('id', fav.event_id)
                .single() as { data: any, error: any }
              itemName = event?.name
              itemType = 'event'
            } catch (err) {
              console.error('Error fetching event name:', err)
            }
          } else if (fav.activity_id) {
            try {
              const { data: activity } = await supabase
                .from('activities')
                .select('name')
                .eq('id', fav.activity_id)
                .single() as { data: any, error: any }
              itemName = activity?.name
              itemType = 'activity'
            } catch (err) {
              console.error('Error fetching activity name:', err)
            }
          }

          return {
            ...fav,
            itemName,
            itemType,
          }
        })
      )

      setFavorites(enrichedFavorites)
    } catch (err) {
      console.error('Error fetching favorites:', err)
      setFavorites([])
    } finally {
      setLoading(false)
    }
  }

  function isFavorited(eventId?: string, activityId?: string): boolean {
    if (!eventId && !activityId) return false
    return favorites.some(
      (fav) =>
        (eventId && fav.event_id === eventId) ||
        (activityId && fav.activity_id === activityId)
    )
  }

  async function toggleFavorite(
    eventId?: string,
    activityId?: string,
    itemName?: string
  ): Promise<void> {
    if (!user) {
      return
    }

    if (!eventId && !activityId) {
      throw new Error('Must provide either eventId or activityId')
    }

    try {
      const alreadyFavorited = isFavorited(eventId, activityId)

      if (alreadyFavorited) {
        // Remove from favorites
        const valueToDelete = eventId || activityId || ''
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq(eventId ? 'event_id' : 'activity_id', valueToDelete)

        if (error) throw error

        // Update local state
        setFavorites((prev) =>
          prev.filter(
            (fav) =>
              !(
                (eventId && fav.event_id === eventId) ||
                (activityId && fav.activity_id === activityId)
              )
          )
        )
      } else {
        // Add to favorites - check limit first
        if (!userProfile?.is_premium) {
          if (favorites.length >= FAVORITES_LIMIT_FREE) {
            throw new Error('Upgrade to Premium for unlimited favorites')
          }
        }

        const { data, error } = await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            event_id: eventId || null,
            activity_id: activityId || null,
          } as any)
          .select()
          .single() as { data: any, error: any }

        if (error) throw error

        // Update local state
        setFavorites((prev) => [
          {
            ...data,
            itemName,
            itemType: eventId ? 'event' : 'activity',
          },
          ...prev,
        ])
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
      throw err
    }
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoritesCount: favorites.length,
        loading,
        isFavorited,
        toggleFavorite,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
