/**
 * Get today's hours string for a venue (e.g., "9am-5pm")
 * Returns null if hours not available or venue is closed today
 */
export function getTodayHours(hours: string | null): string | null {
  if (!hours || hours.trim() === '') return null

  const now = new Date()
  const dayOfWeek = now.getDay()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = dayNames[dayOfWeek]

  try {
    const entries = hours.split(',').map((e) => e.trim())

    for (const entry of entries) {
      const match = entry.match(/^([^:]+):\s*(.+)$/)
      if (!match) continue

      const dayPart = match[1].trim()
      const timePart = match[2].trim()

      if (isDayMatch(dayPart, dayName, dayOfWeek)) {
        // Check for "Closed" in the time part
        if (/closed/i.test(timePart)) return 'Closed'
        return timePart
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse various hour formats and check if a venue is currently open
 * Supports formats like:
 * - "Mon-Fri: 9am-5pm, Sat: 10am-4pm"
 * - "Daily: 10:00 AM - 6:00 PM"
 * - "Monday-Friday: 09:00-17:00"
 * @param hours The hours string to parse
 * @returns true if currently open, false otherwise
 */
export function isOpenNow(hours: string | null): boolean {
  if (!hours || hours.trim() === '') {
    return false
  }

  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = dayNames[dayOfWeek]
  const currentTime = now.getHours() * 60 + now.getMinutes() // minutes since midnight

  try {
    // Split by comma to get individual day entries
    const entries = hours.split(',').map((e) => e.trim())

    for (const entry of entries) {
      // Try to parse "Day(s): time-time" format
      const match = entry.match(/^([^:]+):\s*(.+)$/)
      if (!match) continue

      const dayPart = match[1].trim()
      const timePart = match[2].trim()

      // Check if this entry applies to today
      const appliesToday = isDayMatch(dayPart, dayName, dayOfWeek)
      if (!appliesToday) continue

      // Parse the time range
      const timeRange = parseTimeRange(timePart)
      if (!timeRange) continue

      const { start, end } = timeRange

      // Check if current time is within range
      if (currentTime >= start && currentTime < end) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error parsing hours:', error)
    return false
  }
}

/**
 * Check if a day specification matches the given day of week
 */
function isDayMatch(daySpec: string, dayName: string, dayOfWeek: number): boolean {
  const spec = daySpec.toLowerCase()

  // Handle "Daily" or "Every day"
  if (spec.includes('daily') || spec.includes('every day')) {
    return true
  }

  // Handle ranges like "Mon-Fri" or "Monday-Friday"
  if (spec.includes('-')) {
    const [start, end] = spec.split('-').map((d) => d.trim())
    const startDay = expandDayName(start)
    const endDay = expandDayName(end)
    const currentDayFull = dayName.toLowerCase()

    if (!startDay || !endDay) {
      // Fallback to direct match
      return spec.includes(dayName.toLowerCase().substring(0, 3)) ||
        spec.includes(dayName.toLowerCase())
    }

    const dayIndex = getDayIndex(currentDayFull)
    const startIndex = getDayIndex(startDay)
    const endIndex = getDayIndex(endDay)

    if (startIndex <= endIndex) {
      return dayIndex >= startIndex && dayIndex <= endIndex
    } else {
      // Range wraps around week (e.g., Fri-Mon)
      return dayIndex >= startIndex || dayIndex <= endIndex
    }
  }

  // Handle comma-separated or space-separated days
  const dayAbbreviation = dayName.toLowerCase().substring(0, 3)
  const dayFull = dayName.toLowerCase()

  return (
    spec.includes(dayAbbreviation) ||
    spec.includes(dayFull) ||
    spec.includes(dayOfWeek.toString())
  )
}

/**
 * Expand abbreviated day names
 */
function expandDayName(day: string): string | null {
  const normalized = day.toLowerCase().trim()
  const dayMap: Record<string, string> = {
    mon: 'monday',
    monday: 'monday',
    tue: 'tuesday',
    tuesday: 'tuesday',
    wed: 'wednesday',
    wednesday: 'wednesday',
    thu: 'thursday',
    thursday: 'thursday',
    fri: 'friday',
    friday: 'friday',
    sat: 'saturday',
    saturday: 'saturday',
    sun: 'sunday',
    sunday: 'sunday',
  }
  return dayMap[normalized] || null
}

/**
 * Get numeric day index (0 = Sunday, 6 = Saturday)
 */
function getDayIndex(dayName: string): number {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days.indexOf(dayName.toLowerCase())
}

/**
 * Extract time from an event_date string when start_time is missing.
 * Handles patterns like:
 *   "Wednesday, April 8th 9:00am – 10:30am"
 *   "April 10, 2026 6:00pm - 7:00pm"
 *   "Sat Apr 12 10am-2pm"
 *   "2026-04-08T14:00:00"
 * Returns { startTime, endTime } or null.
 */
export function extractTimeFromEventDate(
  dateStr: string | null
): { startTime: string; endTime: string | null } | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  const str = dateStr.trim()

  // ISO datetime "2026-04-08T14:00:00"
  const isoMatch = str.match(/T(\d{2}):(\d{2})/)
  if (isoMatch) {
    let h = parseInt(isoMatch[1])
    const m = isoMatch[2]
    if (h === 0 && m === '00') return null
    const ampm = h >= 12 ? 'PM' : 'AM'
    if (h > 12) h -= 12
    if (h === 0) h = 12
    return { startTime: `${h}:${m} ${ampm}`, endTime: null }
  }

  // Time range with minutes "9:00am - 10:30pm"
  const rangeMin = str.match(
    /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i
  )
  if (rangeMin) {
    const sap = (rangeMin[3] || (parseInt(rangeMin[1]) >= 7 && parseInt(rangeMin[1]) < 12 ? 'AM' : 'PM')).toUpperCase()
    const eap = rangeMin[6].toUpperCase()
    return {
      startTime: fmt12(parseInt(rangeMin[1]), rangeMin[2], sap),
      endTime: fmt12(parseInt(rangeMin[4]), rangeMin[5], eap),
    }
  }

  // Time range without minutes "10am-2pm"
  const rangeNoMin = str.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i)
  if (rangeNoMin) {
    return {
      startTime: fmt12(parseInt(rangeNoMin[1]), '00', rangeNoMin[2].toUpperCase()),
      endTime: fmt12(parseInt(rangeNoMin[3]), '00', rangeNoMin[4].toUpperCase()),
    }
  }

  // Single time with minutes "6:30pm"
  const singleMin = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
  if (singleMin) {
    return {
      startTime: fmt12(parseInt(singleMin[1]), singleMin[2], singleMin[3].toUpperCase()),
      endTime: null,
    }
  }

  // Single time no minutes "6pm"
  const singleNoMin = str.match(/\b(\d{1,2})\s*(am|pm)\b/i)
  if (singleNoMin) {
    return {
      startTime: fmt12(parseInt(singleNoMin[1]), '00', singleNoMin[2].toUpperCase()),
      endTime: null,
    }
  }

  return null
}

function fmt12(hour: number, minutes: string, ampm: string): string {
  let h = hour
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`
}

/**
 * Parse time range string like "9am-5pm" or "09:00-17:00" or "9:00 AM - 5:00 PM"
 * @returns {start: minutes, end: minutes} where minutes are since midnight, or null if unable to parse
 */
function parseTimeRange(timeStr: string): { start: number; end: number } | null {
  // Remove extra spaces
  timeStr = timeStr.replace(/\s+/g, ' ').trim()

  // Try to split on dash with optional spaces
  const parts = timeStr.split(/[\-–]/).map((p) => p.trim())
  if (parts.length !== 2) {
    return null
  }

  const startTime = parseTime(parts[0])
  const endTime = parseTime(parts[1])

  if (startTime === null || endTime === null) {
    return null
  }

  return { start: startTime, end: endTime }
}

/**
 * Parse a single time string like "9am", "9:30am", "09:00", "9:00 AM"
 * @returns minutes since midnight, or null if unable to parse
 */
function parseTime(timeStr: string): number | null {
  timeStr = timeStr.toLowerCase().trim()

  // Handle formats like "9am", "9:30am", "9:00 am", "09:00", etc.
  const timeRegex = /^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/

  const match = timeStr.match(timeRegex)
  if (!match) {
    return null
  }

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2] || '0', 10)
  const period = match[3]

  // Handle 12-hour format
  if (period) {
    if (period === 'pm' && hours !== 12) {
      hours += 12
    } else if (period === 'am' && hours === 12) {
      hours = 0
    }
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}
