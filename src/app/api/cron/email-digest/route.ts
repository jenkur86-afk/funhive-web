import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase-server'
import { applyStateFilter } from '@/lib/region-filter'

export const dynamic = 'force-dynamic'

interface DigestRecipient {
  user_id: string
  lng: number | null
  lat: number | null
  radius_miles: number | null
  preferred_categories: string[] | null
}

interface DigestEvent {
  id: string
  name: string
  event_date: string | null
  date: string | null
  venue: string | null
  city: string | null
  state: string | null
  category: string | null
}

function renderDigestHtml(events: DigestEvent[]): string {
  const rows = events
    .map((e) => {
      const dateLabel = e.date
        ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : e.event_date || ''
      const place = [e.venue, e.city].filter(Boolean).join(', ')
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #fde68a;">
            <a href="https://myfunhive.com/events/${encodeURIComponent(e.id)}" style="color:#92400e;font-weight:600;text-decoration:none;">${e.name}</a><br/>
            <span style="color:#78716c;font-size:13px;">${dateLabel}${place ? ' &middot; ' + place : ''}</span>
          </td>
        </tr>`
    })
    .join('')

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
      <h1 style="color:#92400e;font-size:20px;">Your FunHive Weekly Digest</h1>
      <p style="color:#57534e;font-size:14px;">Here's what's coming up:</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="margin-top:24px;">
        <a href="https://myfunhive.com/events" style="color:#f59e0b;font-weight:600;">See all events &rarr;</a>
      </p>
      <p style="color:#a8a29e;font-size:11px;margin-top:32px;">
        You're receiving this because you're a FunHive Premium member with the weekly digest enabled.
        <a href="https://myfunhive.com/settings" style="color:#a8a29e;">Manage preferences</a>
      </p>
    </div>`
}

async function fetchEventsForRecipient(
  supabase: ReturnType<typeof createServerClient>,
  recipient: DigestRecipient
): Promise<DigestEvent[]> {
  const today = new Date().toISOString().split('T')[0]

  if (recipient.lng != null && recipient.lat != null) {
    const { data } = await supabase.rpc('nearby_events', {
      lng: recipient.lng,
      lat: recipient.lat,
      radius_miles: recipient.radius_miles || 25,
      max_results: 50,
    })
    let events = ((data as DigestEvent[]) || []).filter((e: any) => !e.reported && e.date && e.date >= today)
    if (recipient.preferred_categories && recipient.preferred_categories.length > 0) {
      const preferred = events.filter((e) => recipient.preferred_categories!.includes(e.category || ''))
      if (preferred.length > 0) events = preferred
    }
    return events.slice(0, 5)
  }

  // No home location on file yet — send a non-personalized "top upcoming" digest
  let query = supabase
    .from('events')
    .select('id, name, event_date, date, venue, city, state, category')
    .eq('reported', false)
    .not('date', 'is', null)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(5)
  query = applyStateFilter(query)
  const { data } = await query
  return (data as DigestEvent[]) || []
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createServerClient()

  const { data: recipients, error } = await supabase.rpc('get_digest_recipients')
  if (error) {
    console.error('Failed to load digest recipients:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let skipped = 0

  for (const recipient of (recipients as DigestRecipient[]) || []) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(recipient.user_id)
      const email = authUser?.user?.email
      if (!email) {
        skipped++
        continue
      }

      const events = await fetchEventsForRecipient(supabase, recipient)
      if (events.length === 0) {
        skipped++
        continue
      }

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'FunHive <digest@myfunhive.com>',
        to: email,
        subject: 'Your FunHive Weekly Digest',
        html: renderDigestHtml(events),
      })
      sent++
    } catch (err: any) {
      console.error(`Digest failed for user ${recipient.user_id}:`, err.message)
      skipped++
    }
  }

  return NextResponse.json({ sent, skipped })
}
