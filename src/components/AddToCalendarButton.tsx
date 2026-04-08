'use client'

interface AddToCalendarButtonProps {
  title: string
  description?: string
  location?: string
  startDate?: string
  startTime?: string
  endTime?: string
}

function generateICS(event: {
  title: string
  description?: string
  location?: string
  startDate?: string
  startTime?: string
  endTime?: string
}): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  // Parse date and time into ISO format
  let dtStart = ''
  let dtEnd = ''

  if (event.startDate) {
    if (event.startTime) {
      // Parse time format (e.g., "2:30 PM" or "14:30")
      const timeStr = event.startTime.trim()
      const dateParts = event.startDate.split('-') // YYYY-MM-DD
      let hours = 0
      let minutes = 0

      if (timeStr.includes(':')) {
        const parts = timeStr.split(':')
        hours = parseInt(parts[0], 10)
        const minPart = parts[1].split(/\s+/)[0]
        minutes = parseInt(minPart, 10)

        // Handle AM/PM
        if (timeStr.includes('PM') && hours !== 12) {
          hours += 12
        } else if (timeStr.includes('AM') && hours === 12) {
          hours = 0
        }
      }

      const startDateTime = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10),
        hours,
        minutes
      )
      dtStart = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

      // Calculate end time
      if (event.endTime) {
        const endTimeStr = event.endTime.trim()
        let endHours = hours
        let endMinutes = minutes

        if (endTimeStr.includes(':')) {
          const endParts = endTimeStr.split(':')
          endHours = parseInt(endParts[0], 10)
          const endMinPart = endParts[1].split(/\s+/)[0]
          endMinutes = parseInt(endMinPart, 10)

          if (endTimeStr.includes('PM') && endHours !== 12) {
            endHours += 12
          } else if (endTimeStr.includes('AM') && endHours === 12) {
            endHours = 0
          }
        }

        const endDateTime = new Date(
          parseInt(dateParts[0], 10),
          parseInt(dateParts[1], 10) - 1,
          parseInt(dateParts[2], 10),
          endHours,
          endMinutes
        )
        dtEnd = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      } else {
        // Default 1 hour duration if no end time provided
        const endDateTime = new Date(startDateTime)
        endDateTime.setHours(endDateTime.getHours() + 1)
        dtEnd = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      }
    } else {
      // All-day event
      dtStart = `VALUE=DATE:${event.startDate.replace(/-/g, '')}`
      const endDate = new Date(event.startDate)
      endDate.setDate(endDate.getDate() + 1)
      dtEnd = `VALUE=DATE:${endDate.toISOString().split('T')[0].replace(/-/g, '')}`
    }
  }

  const description = event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : ''
  const location = event.location ? `LOCATION:${event.location}` : ''

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FunHive//Event Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${now}@funhive.local
DTSTAMP:${now}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${event.title}
${location}
${description}
END:VEVENT
END:VCALENDAR`

  return ics
}

export default function AddToCalendarButton({
  title,
  description,
  location,
  startDate,
  startTime,
  endTime,
}: AddToCalendarButtonProps) {
  const handleDownload = () => {
    const ics = generateICS({
      title,
      description,
      location,
      startDate,
      startTime,
      endTime,
    })

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${title.replace(/\s+/g, '_')}.ics`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 border-2 border-amber-500 text-amber-700 px-5 py-3 rounded-lg font-semibold hover:bg-amber-50 transition text-sm"
      title="Add to calendar"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      Calendar
    </button>
  )
}
