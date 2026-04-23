import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAction } from '@/lib/report-signing'

function htmlResponse(title: string, message: string, success: boolean) {
  const color = success ? '#22c55e' : '#ef4444'
  const icon = success
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'

  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - FunHive</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #fffbeb;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          padding: 48px 32px;
          text-align: center;
          max-width: 420px;
          width: 100%;
        }
        .icon { color: ${color}; margin-bottom: 16px; }
        .brand {
          background: linear-gradient(to right, #f97316, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 24px;
        }
        h1 { font-size: 20px; color: #111827; margin-bottom: 8px; }
        p { color: #6b7280; font-size: 15px; line-height: 1.5; }
        .home {
          display: inline-block;
          margin-top: 24px;
          padding: 10px 24px;
          background: linear-gradient(to right, #f97316, #f59e0b);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">FunHive</div>
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="home">Back to FunHive</a>
      </div>
    </body>
    </html>`,
    {
      status: success ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const { id, action } = await params

  // Validate action
  if (!['restore', 'remove'].includes(action)) {
    return htmlResponse('Invalid Action', 'The action must be "restore" or "remove".', false)
  }

  // Verify token
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''

  if (!verifyAction(id, action, token)) {
    return htmlResponse('Unauthorized', 'This link is invalid or has expired.', false)
  }

  const supabase = createServerClient()

  // Fetch the report
  const { data: report, error: fetchError } = await supabase
    .from('event_reports')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !report) {
    return htmlResponse('Not Found', 'This report was not found or has already been processed.', false)
  }

  if (report.status === 'resolved') {
    return htmlResponse('Already Resolved', `This report was already resolved as "${report.resolution}".`, false)
  }

  const itemId = report.event_id || report.activity_id
  const table = report.event_id ? 'events' : 'activities'

  if (action === 'restore') {
    // Unhide the item
    await supabase.from(table).update({ reported: false }).eq('id', itemId)

    // Mark report as resolved
    await supabase
      .from('event_reports')
      .update({ status: 'resolved', resolution: 'restored', resolved_at: new Date().toISOString() })
      .eq('id', id)

    const itemType = report.event_id ? 'event' : 'venue'
    return htmlResponse('Item Restored', `The ${itemType} has been restored and is visible again on FunHive.`, true)
  }

  if (action === 'remove') {
    // Soft-delete: keep reported = true so scrapers don't re-insert the event.
    // The upsert in saveEvent() doesn't include `reported`, so the flag is preserved.
    // Hard-deleting would let the scraper re-add the event on its next run.
    await supabase.from(table).update({ reported: true }).eq('id', itemId)

    // Mark report as resolved
    await supabase
      .from('event_reports')
      .update({ status: 'resolved', resolution: 'removed', resolved_at: new Date().toISOString() })
      .eq('id', id)

    const itemType = report.event_id ? 'event' : 'venue'
    return htmlResponse('Item Removed', `The ${itemType} has been removed from FunHive and will not reappear.`, true)
  }

  return htmlResponse('Error', 'Something went wrong.', false)
}
