import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase-server'
import { buildActionUrl } from '@/lib/report-signing'

const EVENT_REASONS = [
  'not_kid_friendly',
  'incorrect_time_date_cancelled',
  'duplicate_event',
  'spam_not_real',
  'broken_link',
]

const ACTIVITY_REASONS = [
  'permanently_closed',
  'incorrect_address_location',
  'not_kid_friendly',
]

const REASON_LABELS: Record<string, string> = {
  not_kid_friendly: 'Not Kid Friendly',
  incorrect_time_date_cancelled: 'Incorrect Time/Date/Cancelled',
  duplicate_event: 'Duplicate Event',
  spam_not_real: 'Spam or Not a Real Event',
  broken_link: 'Broken Link / Can\'t Find More Info',
  permanently_closed: 'Permanently Closed',
  incorrect_address_location: 'Incorrect Address/Location',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { event_id, activity_id, reason, comment, honeypot } = body

    // Honeypot check — if filled, silently accept (spam bot)
    if (honeypot) {
      return NextResponse.json({ success: true })
    }

    // Validate exactly one of event_id or activity_id
    if ((!event_id && !activity_id) || (event_id && activity_id)) {
      return NextResponse.json(
        { error: 'Provide either event_id or activity_id' },
        { status: 400 }
      )
    }

    // Validate reason
    const validReasons = event_id ? EVENT_REASONS : ACTIVITY_REASONS
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid report reason' },
        { status: 400 }
      )
    }

    // Validate comment length
    if (comment && typeof comment === 'string' && comment.length > 1000) {
      return NextResponse.json(
        { error: 'Comment is too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    const reporterIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const supabase = createServerClient()

    // Rate limit: max 5 reports per IP per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('event_reports')
      .select('*', { count: 'exact', head: true })
      .eq('reporter_ip', reporterIp)
      .gte('created_at', oneHourAgo)

    if (count !== null && count >= 5) {
      return NextResponse.json(
        { error: 'Too many reports. Please try again later.' },
        { status: 429 }
      )
    }

    // Insert report — generate UUID server-side so we don't need
    // SELECT permission back (RLS only grants INSERT on event_reports)
    const reportId = randomUUID()
    const { error: insertError } = await supabase
      .from('event_reports')
      .insert({
        id: reportId,
        event_id: event_id || null,
        activity_id: activity_id || null,
        reason,
        comment: comment?.trim() || null,
        reporter_ip: reporterIp,
      })

    if (insertError) {
      console.error('Failed to insert report:', insertError.message)
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      )
    }

    // Flag the item as reported
    if (event_id) {
      await supabase.from('events').update({ reported: true }).eq('id', event_id)
    } else {
      await supabase.from('activities').update({ reported: true }).eq('id', activity_id)
    }

    // Fetch item name for the email
    let itemName = 'Unknown'
    let itemType = 'event'
    let itemUrl = ''
    if (event_id) {
      const { data: evt } = await supabase.from('events').select('name').eq('id', event_id).single()
      itemName = evt?.name || event_id
      itemUrl = `/events/${event_id}`
    } else {
      itemType = 'venue'
      const { data: act } = await supabase.from('activities').select('name').eq('id', activity_id).single()
      itemName = act?.name || activity_id
      itemUrl = `/activities/${activity_id}`
    }

    // Send admin notification email
    const notificationEmail = process.env.NOTIFICATION_EMAIL
    if (notificationEmail && process.env.RESEND_API_KEY) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.VERCEL_URL}` || 'https://funhive.com'
        const restoreUrl = buildActionUrl(baseUrl, reportId, 'restore')
        const removeUrl = buildActionUrl(baseUrl, reportId, 'remove')
        const reviewUrl = `${baseUrl}${itemUrl}`

        const reasonLabel = REASON_LABELS[reason] || reason

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FunHive <notifications@funhive.com>',
            to: notificationEmail,
            subject: `[Report] ${reasonLabel}: ${itemName}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(to right, #f97316, #f59e0b); padding: 20px 24px; border-radius: 12px 12px 0 0;">
                  <h2 style="color: white; margin: 0; font-size: 18px;">FunHive Report</h2>
                </div>
                <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0 0 4px; color: #6b7280; font-size: 14px;">A user reported an issue:</p>
                  <h3 style="margin: 0 0 16px; color: #111827;">${itemName}</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 6px 0; color: #6b7280; width: 100px;">Type</td><td style="padding: 6px 0; color: #111827;">${itemType === 'event' ? 'Event' : 'Venue'}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Reason</td><td style="padding: 6px 0; color: #111827; font-weight: 600;">${reasonLabel}</td></tr>
                    ${comment ? `<tr><td style="padding: 6px 0; color: #6b7280; vertical-align: top;">Comment</td><td style="padding: 6px 0; color: #111827;">${comment.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>` : ''}
                    <tr><td style="padding: 6px 0; color: #6b7280;">ID</td><td style="padding: 6px 0; color: #9ca3af; font-size: 12px;">${event_id || activity_id}</td></tr>
                  </table>
                  <p style="margin: 20px 0 8px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Quick Actions</p>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <a href="${restoreUrl}" style="display: inline-block; padding: 10px 20px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Restore (False Report)</a>
                    <a href="${removeUrl}" style="display: inline-block; padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Remove Permanently</a>
                    <a href="${reviewUrl}" style="display: inline-block; padding: 10px 20px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Review on Site</a>
                  </div>
                  <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">Item is hidden from listings until you take action.</p>
                </div>
              </div>
            `,
          }),
        })
      } catch (emailErr) {
        console.error('Report email notification failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Report API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
