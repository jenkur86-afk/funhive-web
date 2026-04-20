import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, name, location, url, notes } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name is required (at least 2 characters)' },
        { status: 400 }
      )
    }

    if (!type || !['event', 'venue'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be "event" or "venue"' },
        { status: 400 }
      )
    }

    // Basic spam protection: reject if URL looks suspicious
    if (url && typeof url === 'string' && url.length > 500) {
      return NextResponse.json(
        { error: 'URL is too long' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { error } = await supabase.from('suggestions').insert({
      type,
      name: name.trim(),
      location: location?.trim() || null,
      url: url?.trim() || null,
      notes: notes?.trim() || null,
      status: 'pending',
    })

    if (error) {
      console.error('Failed to save suggestion:', error.message)
      return NextResponse.json(
        { error: 'Failed to save suggestion' },
        { status: 500 }
      )
    }

    // Send email notification if configured
    const notificationEmail = process.env.NOTIFICATION_EMAIL
    if (notificationEmail && process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FunHive <notifications@funhive.com>',
            to: notificationEmail,
            subject: `New ${type} suggestion: ${name.trim()}`,
            text: [
              `New ${type} suggestion submitted on FunHive:`,
              '',
              `Name: ${name.trim()}`,
              location ? `Location: ${location.trim()}` : null,
              url ? `URL: ${url.trim()}` : null,
              notes ? `Notes: ${notes.trim()}` : null,
              '',
              'Review it in your Supabase dashboard → suggestions table.',
            ].filter(Boolean).join('\n'),
          }),
        })
      } catch (emailErr) {
        // Don't fail the request if email fails — the suggestion is already saved
        console.error('Email notification failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Suggestion API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
