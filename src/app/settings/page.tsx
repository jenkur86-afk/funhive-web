'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface HiddenVenue {
  id: string
  name: string
}

// Toggle Switch Component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-amber-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, userProfile, loading, updateProfile, signOut } = useAuth()

  // Notifications
  const [pushNotifications, setPushNotifications] = useState(false)
  const [reviewReminders, setReviewReminders] = useState(false)
  const [eventRecommendations, setEventRecommendations] = useState(false)

  // Display
  const [searchRadius, setSearchRadius] = useState(25)
  const [showFreeOnly, setShowFreeOnly] = useState(false)

  // Hidden Venues
  const [hiddenVenues, setHiddenVenues] = useState<HiddenVenue[]>([])

  // Loading state
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Load all settings from localStorage on mount
  useEffect(() => {
    const savedPushNotifications = localStorage.getItem('funhive_push_notifications') === 'true'
    const savedReviewReminders = localStorage.getItem('funhive_review_reminders') === 'true'
    const savedEventRecommendations = localStorage.getItem('funhive_event_recommendations') === 'true'
    const savedShowFreeOnly = localStorage.getItem('funhive_show_free_only') === 'true'
    const savedHiddenVenues = localStorage.getItem('funhive_hidden_venues')

    setPushNotifications(savedPushNotifications)
    setReviewReminders(savedReviewReminders && savedPushNotifications)
    setEventRecommendations(savedEventRecommendations && savedPushNotifications)
    setShowFreeOnly(savedShowFreeOnly)

    if (savedHiddenVenues) {
      try {
        setHiddenVenues(JSON.parse(savedHiddenVenues))
      } catch (e) {
        console.error('Error loading hidden venues:', e)
      }
    }

    if (userProfile?.search_radius_miles) {
      setSearchRadius(userProfile.search_radius_miles)
    }
  }, [userProfile])

  // Save notifications to localStorage
  const handlePushNotificationsChange = (value: boolean) => {
    setPushNotifications(value)
    localStorage.setItem('funhive_push_notifications', value.toString())

    if (!value) {
      setReviewReminders(false)
      setEventRecommendations(false)
      localStorage.setItem('funhive_review_reminders', 'false')
      localStorage.setItem('funhive_event_recommendations', 'false')
    }
  }

  const handleReviewRemindersChange = (value: boolean) => {
    setReviewReminders(value)
    localStorage.setItem('funhive_review_reminders', value.toString())
  }

  const handleEventRecommendationsChange = (value: boolean) => {
    setEventRecommendations(value)
    localStorage.setItem('funhive_event_recommendations', value.toString())
  }

  // Save display settings
  const handleSearchRadiusChange = async (value: number) => {
    setSearchRadius(value)
    setIsSaving(true)

    try {
      if (user && userProfile) {
        await updateProfile({ search_radius_miles: value })
        setSuccessMessage('Search radius updated')
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error updating search radius:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleShowFreeOnlyChange = (value: boolean) => {
    setShowFreeOnly(value)
    localStorage.setItem('funhive_show_free_only', value.toString())
  }

  // Remove hidden venue
  const handleUnhideVenue = (id: string) => {
    const updatedVenues = hiddenVenues.filter((venue) => venue.id !== id)
    setHiddenVenues(updatedVenues)
    localStorage.setItem('funhive_hidden_venues', JSON.stringify(updatedVenues))
  }

  // Delete account
  const handleDeleteAccount = () => {
    if (
      window.confirm(
        'Are you sure you want to delete your account? This action cannot be undone. All your data will be permanently deleted.'
      )
    ) {
      alert('Account deletion is not yet implemented. Please contact support@funhive.app')
    }
  }

  // Sign out
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/profile" className="flex items-center gap-1 text-amber-600 hover:text-amber-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}

        {/* NOTIFICATIONS Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">NOTIFICATIONS</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {/* Push Notifications */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-600">Receive updates and reminders</p>
              </div>
              <Toggle checked={pushNotifications} onChange={handlePushNotificationsChange} />
            </div>

            {/* Review Reminders */}
            <div className="px-6 py-4 flex items-center justify-between opacity-70">
              <div className="flex-1">
                <p className={`font-medium ${!pushNotifications ? 'text-gray-500' : 'text-gray-900'}`}>
                  Review Reminders
                </p>
                <p className={`text-sm ${!pushNotifications ? 'text-gray-500' : 'text-gray-600'}`}>
                  Get reminded to write reviews
                </p>
              </div>
              <Toggle
                checked={reviewReminders}
                onChange={handleReviewRemindersChange}
              />
            </div>

            {/* Event Recommendations */}
            <div className="px-6 py-4 flex items-center justify-between opacity-70">
              <div className="flex-1">
                <p className={`font-medium ${!pushNotifications ? 'text-gray-500' : 'text-gray-900'}`}>
                  Event Recommendations
                </p>
                <p className={`text-sm ${!pushNotifications ? 'text-gray-500' : 'text-gray-600'}`}>
                  Personalized event suggestions
                </p>
              </div>
              <Toggle
                checked={eventRecommendations}
                onChange={handleEventRecommendationsChange}
              />
            </div>
          </div>
        </div>

        {/* DISPLAY Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">DISPLAY</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {/* Search Radius */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">Search Radius</p>
                  <p className="text-sm text-gray-600">{searchRadius === 999 ? 'No limit' : searchRadius + ' mi'}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((radius) => (
                  <button
                    key={radius}
                    onClick={() => handleSearchRadiusChange(radius)}
                    disabled={isSaving}
                    className={`py-2 rounded-lg text-sm font-medium transition ${
                      searchRadius === radius
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {radius}mi
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleSearchRadiusChange(999)}
                disabled={isSaving}
                className={`mt-2 w-full py-2 rounded-lg text-sm font-medium transition ${
                  searchRadius === 999
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                No limit
              </button>
            </div>

            {/* Show Free Only */}
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Show Free Only</p>
                <p className="text-sm text-gray-600">Hide paid events</p>
              </div>
              <Toggle checked={showFreeOnly} onChange={handleShowFreeOnlyChange} />
            </div>
          </div>
        </div>

        {/* HIDDEN VENUES Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">HIDDEN VENUES ({hiddenVenues.length})</h2>
          </div>
          {hiddenVenues.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {hiddenVenues.map((venue) => (
                <div key={venue.id} className="px-6 py-4 flex items-center justify-between">
                  <p className="font-medium text-gray-900">{venue.name}</p>
                  <button
                    onClick={() => handleUnhideVenue(venue.id)}
                    className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                  >
                    Unhide
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <p className="text-gray-600 font-medium">No hidden venues</p>
              <p className="text-sm text-gray-500 mt-1">Venues you hide will appear here</p>
            </div>
          )}
        </div>

        {/* ACCOUNT Section (only if logged in) */}
        {user && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">ACCOUNT</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {/* Change Password */}
              <Link
                href="/auth/change-password"
                className="px-6 py-4 flex items-center justify-between hover:bg-amber-50 transition"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                  <span className="font-medium text-gray-900">Change Password</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Delete Account */}
              <button
                onClick={handleDeleteAccount}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-red-50 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span className="font-medium text-red-600">Delete Account</span>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ABOUT Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-12">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">ABOUT</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {/* Version */}
            <div className="px-6 py-4 flex items-center justify-between">
              <p className="font-medium text-gray-900">App Version</p>
              <p className="text-gray-600">1.0.0</p>
            </div>

            {/* Terms of Service */}
            <a
              href="https://funhive.app/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 flex items-center justify-between hover:bg-amber-50 transition"
            >
              <span className="font-medium text-gray-900">Terms of Service</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Privacy Policy */}
            <a
              href="https://funhive.app/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 flex items-center justify-between hover:bg-amber-50 transition"
            >
              <span className="font-medium text-gray-900">Privacy Policy</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Help & Support */}
            <a
              href="mailto:support@funhive.app"
              className="px-6 py-4 flex items-center justify-between hover:bg-amber-50 transition"
            >
              <span className="font-medium text-gray-900">Help & Support</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Contact Us */}
            <a
              href="mailto:support@funhive.app"
              className="px-6 py-4 flex items-center justify-between hover:bg-amber-50 transition"
            >
              <span className="font-medium text-gray-900">Contact Us</span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-600 text-sm">
          <p className="mb-2">Made with 🐝 by FunHive</p>
          <p>© 2025 FunHive. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
