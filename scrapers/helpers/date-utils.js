/**
 * DATE UTILITIES FOR SCRAPERS
 *
 * Normalizes various date formats to standard: "Month Day, Year Time"
 * e.g., "January 15, 2026 3:00pm"
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBREVS = {
  'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
  'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
  'sep': 'September', 'sept': 'September', 'oct': 'October',
  'nov': 'November', 'dec': 'December'
};

/**
 * Normalize a date string to standard format: "Month Day, Year Time"
 *
 * Handles:
 * - ISO format: "2026-02-10 9:00am" -> "February 10, 2026 9:00am"
 * - Day prefix: "Tuesday, December 2, 2025 at 11:00 AM" -> "December 2, 2025 11:00 AM"
 * - HTML garbage: "Dec\n...\n30\n...\n2025" -> "December 30, 2025"
 * - Various time formats
 *
 * @param {string} dateStr - Raw date string
 * @returns {string} - Normalized date string
 */
function normalizeDateString(dateStr) {
  if (!dateStr) return '';

  // Already in correct format
  if (/^[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/.test(dateStr)) {
    return dateStr;
  }

  // Clean whitespace
  const cleaned = dateStr.replace(/\s+/g, ' ').trim();

  // Pattern 1: ISO format "2026-02-10 9:00am–11:00am"
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s*(.*)$/);
  if (isoMatch) {
    const [, year, month, day, time] = isoMatch;
    const monthName = MONTH_NAMES[parseInt(month) - 1];
    if (monthName) {
      let result = `${monthName} ${parseInt(day)}, ${year}`;
      if (time.trim()) {
        // Clean up time - remove end time range
        const cleanTime = time.replace(/[–-].*$/, '').trim();
        result += ` ${cleanTime}`;
      }
      return result;
    }
  }

  // Pattern 2: "Tuesday, December 2, 2025 at 11:00 AM"
  const dayAtMatch = cleaned.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(.+)$/i);
  if (dayAtMatch) {
    const [, month, day, year, time] = dayAtMatch;
    const cleanTime = time.replace(/[–-].*$/, '').trim();
    return `${month} ${parseInt(day)}, ${year} ${cleanTime}`;
  }

  // Pattern 3: "Friday, December 26, 2025 2:00pm" (day prefix without "at")
  const dayPrefixMatch = cleaned.match(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*(.*)$/i);
  if (dayPrefixMatch) {
    const [, month, day, year, time] = dayPrefixMatch;
    let result = `${month} ${parseInt(day)}, ${year}`;
    if (time.trim()) {
      const cleanTime = time.replace(/[–-].*$/, '').trim();
      result += ` ${cleanTime}`;
    }
    return result;
  }

  // Pattern 4: HTML garbage "Dec\n...\n30\n...\n2025 10:15am"
  // Extract month abbreviation, day, year from garbage
  const htmlMatch = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s*(.*)$/s);
  if (htmlMatch) {
    const [, monthAbbr, day, year, time] = htmlMatch;
    const monthName = MONTH_ABBREVS[monthAbbr.toLowerCase()];
    if (monthName) {
      let result = `${monthName} ${parseInt(day)}, ${year}`;
      const cleanTime = (time || '').replace(/\s+/g, ' ').replace(/[–-].*$/, '').trim();
      if (cleanTime) result += ` ${cleanTime}`;
      return result;
    }
  }

  // Pattern 5: Try to extract from complete garbage
  const numbers = dateStr.match(/\d+/g);
  const monthMatch = dateStr.match(/([A-Za-z]{3,})/);
  if (numbers && monthMatch && numbers.length >= 2) {
    const monthName = MONTH_ABBREVS[monthMatch[1].toLowerCase().substring(0, 3)];
    if (monthName) {
      const day = numbers.find(n => parseInt(n) >= 1 && parseInt(n) <= 31);
      const year = numbers.find(n => parseInt(n) >= 2024 && parseInt(n) <= 2030);
      if (day && year) {
        return `${monthName} ${parseInt(day)}, ${year}`;
      }
    }
  }

  // Return original if we can't parse
  return dateStr;
}

module.exports = { normalizeDateString };
