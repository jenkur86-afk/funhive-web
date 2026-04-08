'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type UserProfile = Database['public']['Tables']['user_settings']['Row']

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from user_settings table
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows found" - that's okay for new users
        console.error('Error fetching user profile:', error)
        return null
      }

      return data as UserProfile | null
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }

  // Create default user profile for new users
  const createDefaultProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          display_name: email.split('@')[0],
          search_radius_miles: 25,
          email_digest: true,
          is_premium: false,
        } as any)
        .select()
        .single() as { data: any, error: any }

      if (error) {
        console.error('Error creating user profile:', error)
        return null
      }

      return data as UserProfile
    } catch (err) {
      console.error('Error creating user profile:', err)
      return null
    }
  }

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          const profile = await fetchUserProfile(session.user.id)
          setUserProfile(profile)
        }
      } catch (err) {
        console.error('Error checking auth:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        let profile = await fetchUserProfile(session.user.id)

        // If no profile exists, create one
        if (!profile) {
          profile = await createDefaultProfile(session.user.id, session.user.email || '')
        }

        setUserProfile(profile)
      } else {
        setUser(null)
        setUserProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw error
    }

    // Create user profile with display name
    if (data.user) {
      await createDefaultProfile(data.user.id, email)
      // Update display name
      const { error: updateError } = await (supabase
        .from('user_settings') as any)
        .update({ display_name: displayName })
        .eq('user_id', data.user.id)

      if (updateError) {
        console.error('Error updating display name:', updateError)
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }
  }

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }
  }

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await (supabase
      .from('user_settings') as any)
      .update(data)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    // Refetch profile
    const updatedProfile = await fetchUserProfile(user.id)
    setUserProfile(updatedProfile)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        signInWithApple,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
