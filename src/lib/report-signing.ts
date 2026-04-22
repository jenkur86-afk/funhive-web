import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Sign an admin action link for event/venue reports.
 * Uses HMAC-SHA256 with the REPORT_ADMIN_SECRET env var.
 */
export function signAction(reportId: string, action: string): string {
  const secret = process.env.REPORT_ADMIN_SECRET
  if (!secret) throw new Error('REPORT_ADMIN_SECRET not configured')
  return createHmac('sha256', secret).update(reportId + action).digest('hex')
}

/**
 * Verify an admin action token using timing-safe comparison.
 */
export function verifyAction(reportId: string, action: string, token: string): boolean {
  try {
    const expected = signAction(reportId, action)
    if (expected.length !== token.length) return false
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

/**
 * Build the full admin action URL for an email link.
 */
export function buildActionUrl(baseUrl: string, reportId: string, action: string): string {
  const token = signAction(reportId, action)
  return `${baseUrl}/api/reports/${reportId}/${action}?token=${token}`
}
