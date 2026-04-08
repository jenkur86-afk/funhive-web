'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const router = useRouter()
  const { user, userProfile, loading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setDropdownOpen(false)
    router.push('/')
  }

  const getUserInitial = () => {
    if (userProfile?.display_name) {
      return userProfile.display_name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="bg-white border-b border-amber-100 sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-amber-600">FunHive</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/events" className="text-gray-700 hover:text-amber-600 transition">
            Events
          </Link>
          <Link href="/activities" className="text-gray-700 hover:text-amber-600 transition">
            Venues
          </Link>
          <Link href="/pricing" className="text-gray-700 hover:text-amber-600 transition">
            Premium
          </Link>

          {/* Auth Section */}
          {!loading && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                  {getUserInitial()}
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile?.display_name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/favorites"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    My Favorites
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 transition"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition border-t border-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : !loading ? (
            <Link
              href="/auth/login"
              className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 transition"
            >
              Sign In
            </Link>
          ) : null}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-amber-100 bg-white px-4 py-4 space-y-3">
          <Link href="/events" className="block text-gray-700 hover:text-amber-600">
            Events
          </Link>
          <Link href="/activities" className="block text-gray-700 hover:text-amber-600">
            Venues
          </Link>
          <Link href="/pricing" className="block text-gray-700 hover:text-amber-600">
            Premium
          </Link>

          {/* Mobile Auth Section */}
          {!loading && user ? (
            <>
              <div className="border-t border-amber-100 pt-3 mt-3">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  {userProfile?.display_name || user.email}
                </p>
                <Link
                  href="/profile"
                  className="block text-gray-700 hover:text-amber-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/favorites"
                  className="block text-gray-700 hover:text-amber-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Favorites
                </Link>
                <Link
                  href="/settings"
                  className="block text-gray-700 hover:text-amber-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleSignOut()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left text-red-600 hover:text-red-700 py-2"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : !loading ? (
            <Link
              href="/auth/login"
              className="block bg-amber-500 text-white px-4 py-2 rounded-lg text-center font-medium hover:bg-amber-600"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </Link>
          ) : null}
        </div>
      )}
    </header>
  )
}
