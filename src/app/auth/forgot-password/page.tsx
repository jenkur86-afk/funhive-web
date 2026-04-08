'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })

      if (error) {
        throw error
      }

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setError('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
      })

      if (error) {
        throw error
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-white">
      <div className="max-w-md mx-auto px-4 py-16">
        {!submitted ? (
          <>
            <h1 className="text-3xl font-bold text-amber-900 mb-2 text-center">Reset Password</h1>
            <p className="text-gray-600 text-center mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="text-amber-600 hover:text-amber-700">
                Back to Sign In
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-amber-900 mb-2">Check Your Email</h1>
              <p className="text-gray-600">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-900">
                The reset link will expire in 24 hours. If you don't see the email, check your spam folder.
              </p>
            </div>

            <button
              onClick={handleResendEmail}
              disabled={loading}
              className="w-full bg-amber-100 text-amber-700 py-3 rounded-lg font-semibold hover:bg-amber-200 transition disabled:opacity-50 mb-4"
            >
              {loading ? 'Resending...' : 'Resend Email'}
            </button>

            <div className="space-y-3 text-center text-sm">
              <p className="text-gray-600">
                <button
                  onClick={() => setEmail('')}
                  className="text-amber-600 hover:text-amber-700 underline"
                >
                  Try a different email
                </button>
              </p>
              <p>
                <Link href="/auth/login" className="text-amber-600 hover:text-amber-700">
                  Back to Sign In
                </Link>
              </p>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                <strong>Need help?</strong> Contact us at{' '}
                <a href="mailto:support@funhive.app" className="text-amber-600 hover:text-amber-700">
                  support@funhive.app
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
