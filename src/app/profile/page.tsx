'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Kid {
  name: string
  birthMonth: number
  birthYear: number
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, userProfile, loading, signOut } = useAuth()
  const [reviewCount, setReviewCount] = useState(0)
  const [helpfulVotes, setHelpfulVotes] = useState(0)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [kids, setKids] = useState<Kid[]>([])
  const [showAddKid, setShowAddKid] = useState(false)
  const [newKidName, setNewKidName] = useState('')
  const [newKidMonth, setNewKidMonth] = useState('1')
  const [newKidYear, setNewKidYear] = useState(new Date().getFullYear().toString())

  // Load kids from localStorage
  useEffect(() => {
    const savedKids = localStorage.getItem('funhive_kids')
    if (savedKids) {
      try {
        setKids(JSON.parse(savedKids))
      } catch (e) {
        console.error('Error loading kids:', e)
      }
    }
  }, [])

  // Fetch stats from database
  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        // Reviews count
        const { count: reviewsCount } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        setReviewCount(reviewsCount || 0)

        // Helpful votes sum
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('helpful_count')
          .eq('user_id', user.id) as { data: any[] | null, error: any }

        const totalHelpful = reviewsData?.reduce((sum, review) => sum + (review.helpful_count || 0), 0) || 0
        setHelpfulVotes(totalHelpful)

        // Favorites count
        const { count: favoritesCount } = await supabase
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        setFavoriteCount(favoritesCount || 0)
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [user])

  const calculateAge = (birthMonth: number, birthYear: number) => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1

    let age = currentYear - birthYear
    if (currentMonth < birthMonth) {
      age--
    }
    return age
  }

  const handleAddKid = () => {
    if (!newKidName.trim()) return

    const newKid: Kid = {
      name: newKidName,
      birthMonth: parseInt(newKidMonth),
      birthYear: parseInt(newKidYear),
    }

    const updatedKids = [...kids, newKid]
    setKids(updatedKids)
    localStorage.setItem('funhive_kids', JSON.stringify(updatedKids))

    setNewKidName('')
    setNewKidMonth('1')
    setNewKidYear(new Date().getFullYear().toString())
    setShowAddKid(false)
  }

  const handleRemoveKid = (index: number) => {
    if (window.confirm('Are you sure you want to remove this kid?')) {
      const updatedKids = kids.filter((_, i) => i !== index)
      setKids(updatedKids)
      localStorage.setItem('funhive_kids', JSON.stringify(updatedKids))
    }
  }

  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await signOut()
        router.push('/')
      } catch (error) {
        console.error('Sign out error:', error)
      }
    }
  }

  // Not logged in state
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white">
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">FunHive</h1>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to FunHive</h2>
          <p className="text-gray-600 mb-8">Sign in to write reviews and track your activities</p>

          <Link
            href="/auth/login"
            className="inline-block w-full bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition mb-4"
          >
            Sign In
          </Link>

          <Link
            href="/settings"
            className="inline-block w-full border border-amber-500 text-amber-600 py-3 rounded-lg font-semibold hover:bg-amber-50 transition"
          >
            Settings
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white pb-12">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-amber-500 text-white flex items-center justify-center text-4xl font-bold flex-shrink-0">
              {userProfile?.display_name ? userProfile.display_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{userProfile?.display_name || 'User'}</h1>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    userProfile?.is_premium
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {userProfile?.is_premium ? 'Premium' : 'Free'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center py-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-amber-600">{reviewCount}</p>
              <p className="text-sm text-gray-600 mt-1">Reviews</p>
            </div>
            <div className="text-center py-4 border-r border-gray-200">
              <p className="text-3xl font-bold text-amber-600">{helpfulVotes}</p>
              <p className="text-sm text-gray-600 mt-1">Helpful Votes</p>
            </div>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-amber-600">{favoriteCount}</p>
              <p className="text-sm text-gray-600 mt-1">Favorites</p>
            </div>
          </div>
        </div>

        {/* My Kids Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">My Kids</h2>

          {kids.length > 0 ? (
            <div className="space-y-3 mb-4">
              {kids.map((kid, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{kid.name}</p>
                    <p className="text-sm text-gray-600">Age {calculateAge(kid.birthMonth, kid.birthYear)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveKid(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-amber-50 rounded-lg border border-amber-100 mb-4">
              <p className="text-gray-600">No kids added yet</p>
            </div>
          )}

          {showAddKid ? (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="text"
                placeholder="Kid's name"
                value={newKidName}
                onChange={(e) => setNewKidName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newKidMonth}
                  onChange={(e) => setNewKidMonth(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      Month {month}
                    </option>
                  ))}
                </select>
                <select
                  value={newKidYear}
                  onChange={(e) => setNewKidYear(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {Array.from({ length: 18 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddKid}
                  disabled={!newKidName.trim()}
                  className="flex-1 bg-amber-500 text-white py-2 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Kid
                </button>
                <button
                  onClick={() => setShowAddKid(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddKid(true)}
              className="w-full border-2 border-dashed border-amber-300 text-amber-600 py-3 rounded-lg font-semibold hover:bg-amber-50 transition"
            >
              + Add Kid
            </button>
          )}
        </div>

        {/* Menu List */}
        <div className="space-y-2">
          <Link
            href="/favorites"
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              <span className="font-medium text-gray-900">My Favorites</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/reviews"
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium text-gray-900">My Reviews</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {!userProfile?.is_premium && (
            <Link
              href="/pricing"
              className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-300 hover:border-amber-400 transition"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="font-medium text-amber-900">Upgrade to Premium</span>
              </div>
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          <Link
            href="/settings"
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium text-gray-900">Settings</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition text-left"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="font-medium text-red-600">Sign Out</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
