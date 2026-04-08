/**
 * DATE NORMALIZATION HELPER
 *
 * Normalizes various date formats into a consistent format for Firebase storage.
 * Target format: "November 13, 2025" (full month name, day, year)
 */

/**
 * Normalize a date string to standard format: "Month Day, Year"
 * @param {string} dateString - Raw date string from scraping
 * @returns {string|null} - Normalized date string or null if invalid
 */
function normalizeDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;

  // Month name mappings (full and abbreviated)
  const monthNames = {
    'Jan': 'January', 'January': 'January',
    'Feb': 'February', 'February': 'February',
    'Mar': 'March', 'March': 'March',
    'Apr': 'April', 'April': 'April',
    'May': 'May',
    'Jun': 'June', 'June': 'June',
    'Jul': 'July', 'July': 'July',
    'Aug': 'August', 'August': 'August',
    'Sep': 'September', 'Sept': 'September', 'September': 'September',
    'Oct': 'October', 'October': 'October',
    'Nov': 'November', 'November': 'November',
    'Dec': 'December', 'December': 'December'
  };

  const monthNamesArray = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

  // Clean the input: remove times and extra formatting
  let cleaned = dateString;

  // Remove time range patterns first (e.g., "6:00pm - 7:00pm", "10:30am–12:00pm")
  cleaned = cleaned.replace(/\s+\d{1,2}:\d{2}\s*[ap]m\s*[-–—]\s*\d{1,2}:\d{2}\s*[ap]m/gi, '');

  // Remove single time patterns (e.g., "9:00am", "6:00pm")
  cleaned = cleaned.replace(/\s+\d{1,2}:\d{2}\s*[ap]m/gi, '');

  // Remove standalone weekday names/abbreviations (full names first to avoid partial matches)
  cleaned = cleaned.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b,?\s*/gi, '');

  // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, 5th, etc.)
  cleaned = cleaned.replace(/(\d{1,2})(st|nd|rd|th)\b/gi, '$1');

  // Remove commas for easier parsing (we'll add back in the right place)
  cleaned = cleaned.replace(/,/g, ' ');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // === Pattern 1: ISO date format "YYYY-MM-DD" (with optional time) ===
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 2: Standard "Month Day Year" (e.g., "Nov 20 2025", "November 20 2025") ===
  const monthDayYearMatch = cleaned.match(/([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{4})/i);
  if (monthDayYearMatch) {
    const [, month, day, year] = monthDayYearMatch;
    const fullMonthName = monthNames[month];
    if (fullMonthName) {
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 3: Compact BiblioCommons format "Apr7", "Apr8", "Apr28" (no space, no year) ===
  const compactMonthDayMatch = cleaned.match(/^([A-Za-z]{3,9})(\d{1,2})$/i);
  if (compactMonthDayMatch) {
    const [, month, day] = compactMonthDayMatch;
    const fullMonthName = monthNames[month];
    if (fullMonthName) {
      const year = inferYear(fullMonthName, parseInt(day));
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 4: "Month Day" without year (e.g., "April 07", "Apr 8") ===
  const monthDayNoYearMatch = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/i);
  if (monthDayNoYearMatch) {
    const [, month, day] = monthDayNoYearMatch;
    const fullMonthName = monthNames[month];
    if (fullMonthName) {
      const year = inferYear(fullMonthName, parseInt(day));
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 5: Numeric date format: MM/DD/YYYY or M/D/YYYY ===
  const numericMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numericMatch) {
    const [, month, day, year] = numericMatch;
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 6: "Day Month Year" format (e.g., "20 November 2025") ===
  const dayMonthYearMatch = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  if (dayMonthYearMatch) {
    const [, day, month, year] = dayMonthYearMatch;
    const fullMonthName = monthNames[month];
    if (fullMonthName) {
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // If no pattern matched, return null (invalid date)
  return null;
}

/**
 * Infer the year for a date that's missing it.
 * If the month/day is in the past for the current year, assume next year.
 */
function inferYear(monthName, day) {
  const monthNamesArray = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthIndex = monthNamesArray.indexOf(monthName);

  if (monthIndex === -1) return currentYear;

  const candidateDate = new Date(currentYear, monthIndex, day);
  // If the date is more than 30 days in the past, assume next year
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (candidateDate < thirtyDaysAgo) {
    return currentYear + 1;
  }
  return currentYear;
}

/**
 * Parse a date string into a JavaScript Date object.
 * Handles various formats including ISO dates, natural language dates,
 * compact dates, and dates with/without times.
 *
 * @param {string} dateString - Raw date string from scraping
 * @returns {Date|null} - Parsed Date object or null if invalid
 */
function parseDateToObject(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;

  // First try to normalize to "Month Day, Year" format
  const normalized = normalizeDateString(dateString);
  if (normalized) {
    const dateObj = new Date(normalized);
    if (!isNaN(dateObj.getTime())) {
      // Try to preserve time if present in the original string
      const timeMatch = dateString.match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toLowerCase();
        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        dateObj.setHours(hours, minutes, 0, 0);
      }
      return dateObj;
    }
  }

  // Try ISO format directly (2026-04-08, 2026-04-08T10:00:00)
  const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const [, year, month, day, hours, minutes] = isoMatch;
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                             hours ? parseInt(hours) : 0,
                             minutes ? parseInt(minutes) : 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  // Last resort: try native Date parsing
  const dateObj = new Date(dateString);
  if (!isNaN(dateObj.getTime())) return dateObj;

  return null;
}

/**
 * Check if a date string represents a recurring pattern
 * @param {string} dateString - Date string to check
 * @returns {boolean} - True if it's a recurring pattern
 */
function isRecurringPattern(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hasWeekday = weekdays.some(day => dateString.includes(day));
  const isDaily = /\b(daily|every day)\b/i.test(dateString);

  return hasWeekday || isDaily;
}

module.exports = {
  normalizeDateString,
  parseDateToObject,
  isRecurringPattern
};
