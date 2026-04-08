/**
 * Date and Time Parsing Utilities
 * Enhanced parsing for various date/time formats found on Macaroni Kid sites
 */

const moment = require('moment');

/**
 * Parse complex date strings into structured format
 */
function parseComplexDate(dateStr) {
  if (!dateStr) return null;
  
  const cleanStr = dateStr.trim().replace(/\s+/g, ' ');
  
  // Define patterns with extraction groups
  const patterns = [
    {
      // December 7, 2024 or Dec 7, 2024
      pattern: /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,
      handler: (match) => {
        const date = moment(`${match[1]} ${match[2]}, ${match[3]}`, 'MMMM D, YYYY');
        if (!date.isValid()) {
          date = moment(`${match[1]} ${match[2]}, ${match[3]}`, 'MMM D, YYYY');
        }
        return {
          type: 'single',
          date: date.format('MMMM D, YYYY'),
          recurring: false
        };
      }
    },
    {
      // 12/7/2024 or 12-7-2024
      pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
      handler: (match) => {
        const date = moment(`${match[1]}/${match[2]}/${match[3]}`, 'M/D/YYYY');
        return {
          type: 'single',
          date: date.format('MMMM D, YYYY'),
          recurring: false
        };
      }
    },
    {
      // December 14-16, 2024 (date range)
      pattern: /(\w+)\s+(\d{1,2})-(\d{1,2}),?\s+(\d{4})/,
      handler: (match) => {
        const startDate = moment(`${match[1]} ${match[2]}, ${match[4]}`, 'MMMM D, YYYY');
        const endDate = moment(`${match[1]} ${match[3]}, ${match[4]}`, 'MMMM D, YYYY');
        return {
          type: 'range',
          startDate: startDate.format('MMMM D, YYYY'),
          endDate: endDate.format('MMMM D, YYYY'),
          recurring: false
        };
      }
    },
    {
      // Every Tuesday, Every Monday & Wednesday
      pattern: /every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s*[&,]\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday))*/i,
      handler: (match) => {
        const days = [];
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            days.push(match[i].charAt(0).toUpperCase() + match[i].slice(1).toLowerCase());
          }
        }
        return {
          type: 'recurring',
          schedule: 'Weekly',
          days: days,
          recurring: true
        };
      }
    },
    {
      // First Friday of each month, Third Saturday
      pattern: /(first|second|third|fourth|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+of\s+(?:each|every)\s+month)?/i,
      handler: (match) => {
        const ordinal = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        const day = match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
        return {
          type: 'recurring',
          schedule: 'Monthly',
          pattern: `${ordinal} ${day} of each month`,
          recurring: true
        };
      }
    },
    {
      // Daily
      pattern: /daily|every\s+day/i,
      handler: () => ({
        type: 'recurring',
        schedule: 'Daily',
        recurring: true
      })
    },
    {
      // Ongoing
      pattern: /ongoing|continuous/i,
      handler: () => ({
        type: 'ongoing',
        recurring: true
      })
    }
  ];
  
  // Try each pattern
  for (const { pattern, handler } of patterns) {
    const match = cleanStr.match(pattern);
    if (match) {
      return handler(match);
    }
  }
  
  // Default fallback - try to parse as a date
  const parsedDate = moment(cleanStr, [
    'MMMM D, YYYY',
    'MMM D, YYYY',
    'M/D/YYYY',
    'YYYY-MM-DD',
    'DD/MM/YYYY'
  ]);
  
  if (parsedDate.isValid()) {
    return {
      type: 'single',
      date: parsedDate.format('MMMM D, YYYY'),
      recurring: false
    };
  }
  
  return {
    type: 'unknown',
    original: cleanStr,
    recurring: false
  };
}

/**
 * Parse time strings with various formats
 */
function parseTimeString(timeStr) {
  if (!timeStr) return { startTime: null, endTime: null, allDay: false };
  
  const cleanStr = timeStr.trim().replace(/\s+/g, ' ').toLowerCase();
  
  // Check for all-day events
  if (cleanStr.includes('all day') || cleanStr.includes('all-day')) {
    return { startTime: null, endTime: null, allDay: true };
  }
  
  // Time range patterns
  const patterns = [
    {
      // 10:00 AM - 2:00 PM or 10:00am-2:00pm
      pattern: /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—to]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/,
      handler: (match) => {
        let startHour = parseInt(match[1]);
        const startMin = match[2];
        const startAmPm = match[3] || inferAmPm(startHour, parseInt(match[4]));
        
        let endHour = parseInt(match[4]);
        const endMin = match[5];
        const endAmPm = match[6];
        
        return {
          startTime: formatTime(startHour, startMin, startAmPm),
          endTime: formatTime(endHour, endMin, endAmPm),
          allDay: false
        };
      }
    },
    {
      // 10 AM - 2 PM or 10am-2pm (no minutes)
      pattern: /(\d{1,2})\s*(am|pm)\s*[-–—to]+\s*(\d{1,2})\s*(am|pm)/,
      handler: (match) => ({
        startTime: formatTime(parseInt(match[1]), '00', match[2]),
        endTime: formatTime(parseInt(match[3]), '00', match[4]),
        allDay: false
      })
    },
    {
      // Single time: 6:30 PM
      pattern: /(\d{1,2}):(\d{2})\s*(am|pm)/,
      handler: (match) => ({
        startTime: formatTime(parseInt(match[1]), match[2], match[3]),
        endTime: null,
        allDay: false
      })
    },
    {
      // Single time without colon: 6 PM
      pattern: /(\d{1,2})\s*(am|pm)/,
      handler: (match) => ({
        startTime: formatTime(parseInt(match[1]), '00', match[2]),
        endTime: null,
        allDay: false
      })
    }
  ];
  
  // Try each pattern
  for (const { pattern, handler } of patterns) {
    const match = cleanStr.match(pattern);
    if (match) {
      return handler(match);
    }
  }
  
  return { startTime: null, endTime: null, allDay: false };
}

/**
 * Format time components into standard format
 */
function formatTime(hour, minutes, ampm) {
  let formattedHour = hour;
  const period = ampm ? ampm.toUpperCase() : 'AM';
  
  // Ensure hour is in 12-hour format
  if (formattedHour > 12) {
    formattedHour -= 12;
  }
  
  return `${formattedHour}:${minutes} ${period}`;
}

/**
 * Infer AM/PM when not specified for start time
 */
function inferAmPm(startHour, endHour) {
  // If start hour is greater than end hour and end is PM, start is likely AM
  if (startHour > endHour) {
    return 'am';
  }
  // If start hour is 7-11, likely AM for events
  if (startHour >= 7 && startHour < 12) {
    return 'am';
  }
  // Otherwise assume PM
  return 'pm';
}

/**
 * Extract age range from text
 */
function extractAgeRange(text) {
  if (!text) return 'All Ages';
  
  const patterns = [
    { pattern: /all\s+ages/i, result: 'All Ages' },
    { pattern: /ages?\s+(\d+)\s*[-–]+\s*(\d+)/i, handler: (m) => `Ages ${m[1]}-${m[2]}` },
    { pattern: /ages?\s+(\d+)\+/i, handler: (m) => `Ages ${m[1]}+` },
    { pattern: /(\d+)\s*[-–]+\s*(\d+)\s+years?/i, handler: (m) => `Ages ${m[1]}-${m[2]}` },
    { pattern: /toddlers?/i, result: 'Toddlers' },
    { pattern: /preschool/i, result: 'Preschool' },
    { pattern: /elementary/i, result: 'Elementary' },
    { pattern: /middle\s+school/i, result: 'Middle School' },
    { pattern: /high\s+school/i, result: 'High School' },
    { pattern: /teens?/i, result: 'Teens' },
    { pattern: /adults?/i, result: 'Adults' },
    { pattern: /family|families/i, result: 'All Ages' },
    { pattern: /kids?|children/i, result: 'Children' },
    { pattern: /infants?|babies/i, result: 'Infants' }
  ];
  
  for (const { pattern, result, handler } of patterns) {
    const match = text.match(pattern);
    if (match) {
      return handler ? handler(match) : result;
    }
  }
  
  return 'All Ages';
}

/**
 * Extract cost information from text
 */
function extractCost(text) {
  if (!text) return 'Free';
  
  const patterns = [
    { pattern: /free/i, result: 'Free' },
    { pattern: /\$(\d+(?:\.\d{2})?)/i, handler: (m) => `$${m[1]}` },
    { pattern: /(\d+(?:\.\d{2})?)\s*dollars?/i, handler: (m) => `$${m[1]}` },
    { pattern: /donation/i, result: 'Donation' },
    { pattern: /pay\s+what\s+you\s+can/i, result: 'Pay What You Can' },
    { pattern: /sliding\s+scale/i, result: 'Sliding Scale' },
    { pattern: /suggested\s+donation:?\s*\$?(\d+)/i, handler: (m) => `$${m[1]} suggested donation` },
    { pattern: /members?\s+free/i, result: 'Free for members' },
    { pattern: /admission:?\s*\$?(\d+)/i, handler: (m) => `$${m[1]} admission` },
    { pattern: /tickets?:?\s*\$?(\d+)/i, handler: (m) => `$${m[1]}` },
    { pattern: /\$(\d+)\s*per\s+(?:child|person|family)/i, handler: (m) => `$${m[1]} per person` },
    { pattern: /\$(\d+)\s*\/\s*(?:child|person|family)/i, handler: (m) => `$${m[1]} per person` }
  ];
  
  for (const { pattern, result, handler } of patterns) {
    const match = text.match(pattern);
    if (match) {
      return handler ? handler(match) : result;
    }
  }
  
  return 'Check website for pricing';
}

/**
 * Clean and truncate description text
 */
function cleanDescription(text, maxLength = 500) {
  if (!text) return '';
  
  // Remove extra whitespace and newlines
  let clean = text.replace(/\s+/g, ' ').trim();
  
  // Remove common boilerplate
  const boilerplate = [
    /click\s+here\s+for\s+more/i,
    /for\s+more\s+information/i,
    /visit\s+our\s+website/i,
    /follow\s+us\s+on/i,
    /share\s+this\s+event/i,
    /add\s+to\s+calendar/i
  ];
  
  boilerplate.forEach(pattern => {
    clean = clean.replace(pattern, '');
  });
  
  // Truncate if needed
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength - 3) + '...';
  }
  
  return clean;
}

/**
 * Create a user-friendly schedule description
 */
function createScheduleDescription(parsedDate, parsedTime) {
  let description = '';
  
  if (parsedDate) {
    if (parsedDate.type === 'single') {
      description = parsedDate.date;
    } else if (parsedDate.type === 'range') {
      description = `${parsedDate.startDate} - ${parsedDate.endDate}`;
    } else if (parsedDate.type === 'recurring') {
      if (parsedDate.schedule === 'Weekly' && parsedDate.days) {
        description = `Every ${parsedDate.days.join(' & ')}`;
      } else if (parsedDate.schedule === 'Monthly' && parsedDate.pattern) {
        description = parsedDate.pattern;
      } else if (parsedDate.schedule === 'Daily') {
        description = 'Daily';
      } else {
        description = parsedDate.schedule;
      }
    } else if (parsedDate.type === 'ongoing') {
      description = 'Ongoing';
    }
  }
  
  if (parsedTime) {
    if (parsedTime.allDay) {
      description += ' - All Day';
    } else if (parsedTime.startTime) {
      description += ` at ${parsedTime.startTime}`;
      if (parsedTime.endTime) {
        description += ` - ${parsedTime.endTime}`;
      }
    }
  }
  
  return description || 'Schedule TBD';
}

module.exports = {
  parseComplexDate,
  parseTimeString,
  extractAgeRange,
  extractCost,
  cleanDescription,
  createScheduleDescription,
  formatTime
};
