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

  // Case-insensitive month name lookup helper
  // Handles "APR", "apr", "Apr", "APRIL", etc.
  function lookupMonth(str) {
    if (!str) return undefined;
    // Title-case the input: "APR" → "Apr", "APRIL" → "April", "april" → "April"
    const tc = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return monthNames[tc];
  }

  // Clean the input: remove times and extra formatting
  let cleaned = dateString;

  // Normalize newlines and tabs to spaces (handles "Wed\n\n29" from DOM extraction)
  cleaned = cleaned.replace(/[\n\r\t]+/g, ' ');

  // Strip Assabet-style "Today"/"Tomorrow" prefix that the calendar prepends to
  // the current day cell (e.g., "TodayTuesday, May 12...").
  cleaned = cleaned.replace(/^(?:Today|Tomorrow)\b\s*/i, '');

  // De-concatenate day number from a time pattern when the scraper grabbed a
  // textContent blob with no whitespace between them (Assabet calendar bug —
  // produces strings like "Monday, May 410:00—10:45 AM" or "May 1210:30—11:00 AM").
  // The digits before `:` may represent a 1- or 2-digit day followed by a 1- or
  // 2-digit hour; split on whichever gives valid day (1-31) AND hour (0-23).
  cleaned = cleaned.replace(
    /([A-Za-z]{3,9})\s+(\d{2,4})(?=:\d{2})/g,
    (full, month, digits) => {
      if (digits.length <= 2) return full; // hour-only (e.g. "May 10:00") — leave alone
      // 3-digit run: try [2-digit day | 1-digit hour] first (more common — most
      // days >=10 are 2 digits and most hours <10 are 1 digit, e.g. "May 209"
      // is much more likely "May 20" + "9:30" than "May 2" + "09:30").
      if (digits.length === 3) {
        const d2 = parseInt(digits.slice(0, 2)), h1 = parseInt(digits[2]);
        if (d2 >= 1 && d2 <= 31 && h1 >= 0 && h1 <= 23) {
          return `${month} ${digits.slice(0, 2)} ${digits[2]}`;
        }
        const d1 = parseInt(digits[0]), h2 = parseInt(digits.slice(1));
        if (d1 >= 1 && d1 <= 31 && h2 >= 0 && h2 <= 23) {
          return `${month} ${digits[0]} ${digits.slice(1)}`;
        }
        return full;
      }
      // 4-digit run: 2-digit day + 2-digit hour
      const d = parseInt(digits.slice(0, 2)), h = parseInt(digits.slice(2));
      if (d >= 1 && d <= 31 && h >= 0 && h <= 23) {
        return `${month} ${digits.slice(0, 2)} ${digits.slice(2)}`;
      }
      return full;
    }
  );

  // De-concatenate day number from adjacent letters when scraper textContent
  // jammed them together (e.g., "May 1All Day" → "May 1 All Day",
  // "Friday, May 12Trustees" → "Friday, May 12 Trustees"). Only inserts a space
  // between a digit and a following letter — safe because ordinal suffixes
  // (1st, 2nd, 3rd, etc.) are stripped further down.
  cleaned = cleaned.replace(/(\d)(?=[A-Za-z])/g, '$1 ');

  // Remove timezone abbreviations (EST, EDT, CST, CDT, PST, PDT, etc.)
  cleaned = cleaned.replace(/\s+(?:E[SD]T|C[SD]T|M[SD]T|P[SD]T|[A-Z]{2,4}T)\b/g, '');

  // Remove the "@" separator used in WordPress Events Calendar (e.g., "April 21 @ 10:00 am")
  cleaned = cleaned.replace(/\s*@\s*/g, ' ');

  // Remove pipe separator (e.g., "Tuesday, March 30 | 6:00 pm")
  cleaned = cleaned.replace(/\s*\|\s*/g, ' ');

  // Remove "Featured" prefix (e.g., "Featured Apr 2 @10:00am")
  cleaned = cleaned.replace(/^Featured\s+/i, '');

  // Strip NASA-style "NET" prefix meaning "no earlier than" (e.g., "NET October 2026")
  cleaned = cleaned.replace(/^NET\s+/i, '');

  // Strip "Class N of M" / "Session N of M" prefix used by garden/nature programs
  // (e.g., "Class 2 of 3 Wednesday, May 6 9:30-11:00am")
  cleaned = cleaned.replace(/^(?:Class|Session|Part|Week)\s+\d+\s+of\s+\d+\s+/i, '');

  // Strip "{Number} Sessions:" / "{Word} Sessions:" prefix
  // (e.g., "Six Sessions: Tuesdays, March 31-May 5 • noon-3 p.m.")
  cleaned = cleaned.replace(/^(?:Six|Five|Four|Three|Two|One|Eight|Ten|Twelve|\d+)\s+Sessions?\s*:\s*/i, '');

  // Strip recurring-pattern prefix "Weekends", "Weekdays", "Daily", "Mondays", etc.
  // (e.g., "Weekends May 16-31, 2026 • 10 a.m.-4 p.m.")
  cleaned = cleaned.replace(/^(?:Weekends?|Weekdays?|Daily|Every\s+(?:Day|Week))\s+/i, '');
  cleaned = cleaned.replace(/^(?:Mondays?|Tuesdays?|Wednesdays?|Thursdays?|Fridays?|Saturdays?|Sundays?)\s*,?\s*/i, '');

  // Replace bullet/middot separators with spaces (event lines often use "Date • Time")
  cleaned = cleaned.replace(/\s*[•·]\s*/g, ' ');

  // Strip "noon" / "midnight" — they're time-only fragments masquerading as words
  cleaned = cleaned.replace(/\b(noon|midnight)\b\s*[-–—]?\s*\d{0,2}\s*[ap]?\.?m?\.?/gi, '');
  cleaned = cleaned.replace(/\b(noon|midnight)\b/gi, '');

  // Remove "at" or "from" before times (e.g., "Apr 30, at 9:00 AM", "May 09, from 8:30 AM–10:00 AM")
  cleaned = cleaned.replace(/\s+(?:at|from)\s+(\d{1,2}[:\d]*\s*[ap])/gi, ' $1');

  // Remove standalone "from TIME–TIME" or "from TIME-TIME" patterns without AM/PM
  // (e.g., "from 10:00–14:00", "from 9:30-11:30")
  cleaned = cleaned.replace(/\s+from\s+\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/gi, '');

  // Remove localized day abbreviations (e.g., "Sá." for Saturday in Portuguese/Spanish)
  // Only remove if followed by comma+space or if the abbreviation contains non-ASCII chars
  // Avoids stripping month abbreviations like "Apr." or "Sep."
  cleaned = cleaned.replace(/^[A-Za-zÀ-ÿ]*[À-ÿ][A-Za-zÀ-ÿ]*\.,?\s*/i, '');  // Must contain a non-ASCII char
  cleaned = cleaned.replace(/^[A-Za-z]{2,3}\.\s*,\s*/i, '');  // Or ASCII abbrev followed by period+comma (e.g., "Sat., ")

  // Remove time range with "to" separator (e.g., "7am to 8pm", "10:00am to 12:00pm")
  cleaned = cleaned.replace(/\s*\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?\s+to\s+\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?/gi, '');

  // Remove time range patterns (e.g., "6:00pm - 7:00pm", "10:30am–12:00pm")
  cleaned = cleaned.replace(/\s*\d{1,2}:\d{2}\s*[ap]\.?m\.?\s*[-–—]\s*\d{1,2}:\d{2}\s*[ap]\.?m\.?/gi, '');

  // Remove partial-AM/PM time ranges where only the END has AM/PM
  // (e.g., "9:30-11:00am", "10:00-12:00pm", "9:30-11:30am")
  cleaned = cleaned.replace(/\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}\s*[ap]\.?m\.?/gi, '');

  // Remove partial-AM/PM time ranges where only the START has AM/PM
  // (e.g., "10am-2pm" already handled below; "10:00am-4" is rare but possible)
  cleaned = cleaned.replace(/\s*\d{1,2}:\d{2}\s*[ap]\.?m\.?\s*[-–—]\s*\d{1,2}(?::\d{2})?(?!\s*[ap])/gi, '');

  // Remove compact time ranges without colons (e.g., "7am - 8pm", "7am–8pm")
  cleaned = cleaned.replace(/\s*\d{1,2}\s*[ap]\.?m\.?\s*[-–—]\s*\d{1,2}\s*[ap]\.?m\.?/gi, '');

  // Remove single time patterns with colons (e.g., "9:00am", "6:00pm", "9:00 a.m.")
  cleaned = cleaned.replace(/\s*\d{1,2}:\d{2}\s*[ap]\.?m\.?/gi, '');

  // Remove single compact times without colons (e.g., "7am", "8pm")
  cleaned = cleaned.replace(/\s+\d{1,2}\s*[ap]\.?m\.?/gi, '');

  // Remove standalone weekday names/abbreviations (full names first to avoid partial matches)
  cleaned = cleaned.replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b,?\s*/gi, '');

  // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, 5th, etc.)
  cleaned = cleaned.replace(/(\d{1,2})(st|nd|rd|th)\b/gi, '$1');

  // Remove commas for easier parsing (we'll add back in the right place)
  cleaned = cleaned.replace(/,/g, ' ');

  // Remove "All Day" or "all day" text
  cleaned = cleaned.replace(/\ball\s*day\b/gi, '');

  // Remove trailing numeric date ranges like "4/1–4/22" when a text date is already present
  cleaned = cleaned.replace(/\s+\d{1,2}\/\d{1,2}[-–—]\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, '');

  // Remove periods from abbreviated month names (e.g., "Sep." → "Sep", "Apr." → "Apr")
  cleaned = cleaned.replace(/\b([A-Za-z]{3,4})\./g, '$1');

  // Remove a trailing second date after a dash (e.g., "Apr 30 – Sun May 03" → "Apr 30")
  // This handles multi-day ranges where we only want the start date
  cleaned = cleaned.replace(/\s*[-–—]\s*(?:[A-Za-z]+\s+)?[A-Za-z]{3,9}\s+\d{1,2}(?:\s*\d{4})?\s*$/i, '');

  // Remove trailing dashes/hyphens left over after time stripping (e.g., "April 21 -")
  cleaned = cleaned.replace(/\s*[-–—]\s*$/, '');

  // Remove leading dashes/hyphens left over after time stripping
  cleaned = cleaned.replace(/^\s*[-–—]\s*/, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If after all cleaning only whitespace or empty, it was a time-only string
  if (!cleaned || cleaned.length < 3) return null;

  // === Pattern 0a: Doubled-date pattern from MOSI/aggregator scrapers ===
  // E.g. "Saturday June 6 June 8 to June 12" (after weekday strip: "June 6 June 8 to June 12")
  // The first "Month Day" is the start date we want — drop everything after it.
  const doubledDateMatch = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+(?:[A-Za-z]{3,9}\s+\d{1,2}\s+)?(?:to|through|thru|until|[-–—])\s+[A-Za-z]{3,9}\s+\d{1,2}/i);
  if (doubledDateMatch) {
    const [, month, day] = doubledDateMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      const year = inferYear(fullMonthName, parseInt(day));
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 0: Date range formats — extract start date ===
  // Handles: "Apr 1 - 22, 2026", "Apr 20 - 25, 2026", "April 1 - May 3, 2026", "Apr 1 - 22 2026"
  // Also handles: "4/1–4/22" style ranges
  const dateRangeMatch = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s*[-–—]\s*(?:[A-Za-z]{3,9}\s+)?\d{1,2}\s*,?\s*(\d{4})?/i);
  if (dateRangeMatch) {
    const [, month, day, year] = dateRangeMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      const resolvedYear = year || inferYear(fullMonthName, parseInt(day));
      return `${fullMonthName} ${parseInt(day)}, ${resolvedYear}`;
    }
  }

  // Handles numeric date ranges: "4/1–4/22", "4/1-4/22/2026", "4/30/26 – 5/3/26"
  const numericRangeMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*[-–—]\s*\d{1,2}\/\d{1,2}/);
  if (numericRangeMatch) {
    const [, month, day, year] = numericRangeMatch;
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      let resolvedYear;
      if (year) {
        resolvedYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      } else {
        resolvedYear = inferYear(monthNamesArray[monthIndex], parseInt(day));
      }
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${resolvedYear}`;
    }
  }

  // === Pattern 1: ISO date format "YYYY-MM-DD" (with optional time) ===
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 1b: Loose ISO with single-digit month/day, optionally with time + offset ===
  // Discovery World (Children's Museums) emits "2026-4-1T10:00-4:00", "2026-3-16", "2026-4-18".
  // Match YYYY-M-D where month/day may be 1-2 digits.
  const looseIsoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|\s|$)/);
  if (looseIsoMatch) {
    const [, year, month, day] = looseIsoMatch;
    const monthIndex = parseInt(month) - 1;
    const dayNum = parseInt(day);
    if (monthIndex >= 0 && monthIndex < 12 && dayNum >= 1 && dayNum <= 31) {
      return `${monthNamesArray[monthIndex]} ${dayNum}, ${year}`;
    }
  }

  // === Pattern 2: Standard "Month Day Year" (e.g., "Nov 20 2025", "November 20 2025") ===
  const monthDayYearMatch = cleaned.match(/([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{4})/i);
  if (monthDayYearMatch) {
    const [, month, day, year] = monthDayYearMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 3: Compact BiblioCommons format "Apr7", "Apr8", "Apr28" (no space, no year) ===
  const compactMonthDayMatch = cleaned.match(/^([A-Za-z]{3,9})(\d{1,2})$/i);
  if (compactMonthDayMatch) {
    const [, month, day] = compactMonthDayMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      const year = inferYear(fullMonthName, parseInt(day));
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 4: "Month Day" without year (e.g., "April 07", "Apr 8") ===
  const monthDayNoYearMatch = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/i);
  if (monthDayNoYearMatch) {
    const [, month, day] = monthDayNoYearMatch;
    const fullMonthName = lookupMonth(month);
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

  // === Pattern 5b: Numeric date with 2-digit year: M/D/YY (e.g., "4/30/26") ===
  // Range form already stripped to start above. Single-day form: "4/30/26".
  const twoDigitYearMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (twoDigitYearMatch) {
    const [, month, day, yy] = twoDigitYearMatch;
    const monthIndex = parseInt(month) - 1;
    const fullYear = 2000 + parseInt(yy);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${fullYear}`;
    }
  }

  // === Pattern 5c: Dot-separated US date M.D.YY or M.D.YYYY (e.g., "5.7.26", "5.16.2026") ===
  // Used by some Children's Museum sites (Creative Discovery, etc.).
  const dotDateMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (dotDateMatch) {
    const [, month, day, year] = dotDateMatch;
    const monthIndex = parseInt(month) - 1;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${fullYear}`;
    }
  }

  // === Pattern 6: "Day Month Year" format (e.g., "20 November 2025") ===
  const dayMonthYearMatch = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
  if (dayMonthYearMatch) {
    const [, day, month, year] = dayMonthYearMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 7: Numeric M/D or MM/DD without year (e.g., "1/12", "4/4", "12/1") ===
  const numericNoYearMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (numericNoYearMatch) {
    const [, month, day] = numericNoYearMatch;
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      const year = inferYear(monthNamesArray[monthIndex], parseInt(day));
      return `${monthNamesArray[monthIndex]} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 8: "DD Month" without year (European-style, e.g., "15 Nov", "29 Apr", "3 May") ===
  const dayMonthNoYearMatch = cleaned.match(/^(\d{1,2})\s+([A-Za-z]{3,9})$/i);
  if (dayMonthNoYearMatch) {
    const [, day, month] = dayMonthNoYearMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      const year = inferYear(fullMonthName, parseInt(day));
      return `${fullMonthName} ${parseInt(day)}, ${year}`;
    }
  }

  // === Pattern 8b: "Month Year" without day (e.g., "October 2026", "Nov 2026") ===
  // Used by NASA launches and similar "month-only" announcements. Defaults to 1st.
  const monthYearMatch = cleaned.match(/^([A-Za-z]{3,9})\s+(\d{4})$/i);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    const fullMonthName = lookupMonth(month);
    if (fullMonthName) {
      return `${fullMonthName} 1, ${year}`;
    }
  }

  // === Pattern 9: Standalone month name (e.g., "May", "June", "Jun") ===
  // Used when only a month is provided (e.g., Science Museum of VA "May", "Jun")
  // Defaults to 1st of that month
  const monthOnlyMatch = cleaned.match(/^([A-Za-z]{3,9})$/i);
  if (monthOnlyMatch) {
    const fullMonthName = lookupMonth(monthOnlyMatch[1]);
    if (fullMonthName) {
      const year = inferYear(fullMonthName, 1);
      return `${fullMonthName} 1, ${year}`;
    }
  }

  // === Final fallback: extract first "Month Day" from a longer string ===
  // The Assabet calendar (and a few other scrapers) sometimes hand us a string
  // that, even after cleaning, still has trailing junk like "May 4McConnell..."
  // or "May 1 All Day Dover Public Library...". Pattern 4 above won't match
  // because it's anchored to end-of-string. Pull the first valid "Month DD" we
  // can find. The `(?!\d)` lookahead caps the day at 1-2 digits without needing
  // a word boundary after — important because "4M" (digit-letter) IS a word
  // boundary in regex terms but "4 " (digit-space) would work fine either way.
  const fallbackMatch = cleaned.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?!\d)/i);
  if (fallbackMatch) {
    const [, month, day] = fallbackMatch;
    const fullMonthName = lookupMonth(month);
    const dayNum = parseInt(day);
    if (fullMonthName && dayNum >= 1 && dayNum <= 31) {
      const year = inferYear(fullMonthName, dayNum);
      return `${fullMonthName} ${dayNum}, ${year}`;
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
