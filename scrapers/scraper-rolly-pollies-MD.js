#!/usr/bin/env node

/**
 * ROLLY POLLIES MARYLAND SCRAPER
 *
 * Scrapes Open Gym sessions and Holiday/Special Events from Rolly Pollies Maryland
 *
 * COVERAGE:
 * - Rolly Pollies (Severna Park, MD)
 *
 * Platform: Wix with Wix Bookings
 * Open Gym URL: https://www.rollypolliesmaryland.com/booking-calendar/open-play
 * Special Events URL: https://www.rollypolliesmaryland.com/parents-night-out
 *
 * Usage:
 *   node scrapers/scraper-rolly-pollies-MD.js
 *   node scrapers/scraper-rolly-pollies-MD.js --type openplay
 *   node scrapers/scraper-rolly-pollies-MD.js --type events
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Venue configuration
const VENUE = {
  name: 'Rolly Pollies',
  fullName: 'Rolly Pollies Maryland',
  address: '476-D Ritchie Highway',
  city: 'Severna Park',
  state: 'MD',
  zipCode: '21146',
  county: 'Anne Arundel',
  phone: '410-544-9002',
  website: 'https://www.rollypolliesmaryland.com',
  openPlayUrl: 'https://www.rollypolliesmaryland.com/booking-calendar/open-play',
  eventsUrl: 'https://www.rollypolliesmaryland.com/parents-night-out',
  coordinates: {
    latitude: 39.0705,
    longitude: -76.5659
  }
};

// Parse date string to ISO format
function parseDate(dateStr, year = new Date().getFullYear()) {
  const months = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };

  // Try to parse "Monday, November 24th" or "November 24th" format
  const match = dateStr.toLowerCase().match(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)?,?\s*(\w+)\s+(\d+)(?:st|nd|rd|th)?/);
  if (match) {
    const month = months[match[1].toLowerCase()];
    const day = parseInt(match[2]);
    if (month !== undefined && day) {
      const date = new Date(year, month, day);
      // Compare with start of today, not current time
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // If the date is more than 30 days in the past, assume it's next year
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (date < thirtyDaysAgo) {
        date.setFullYear(year + 1);
      }
      return date;
    }
  }

  return null;
}

// Parse time string to extract start and end times
function parseTimeRange(timeStr) {
  // Match patterns like "9:00am - 12:00pm" or "12:30 pm - 1:30 pm"
  const match = timeStr.match(/(\d{1,2}:\d{2})\s*(am|pm)?\s*[-–]\s*(\d{1,2}:\d{2})\s*(am|pm)?/i);
  if (match) {
    let startTime = match[1];
    const startAmPm = match[2] || match[4]; // Use end AM/PM if start not specified
    let endTime = match[3];
    const endAmPm = match[4] || match[2];

    return {
      startTime: `${startTime} ${startAmPm}`.toUpperCase(),
      endTime: `${endTime} ${endAmPm}`.toUpperCase()
    };
  }
  return null;
}

// Scrape Open Play sessions from Wix Bookings calendar
async function scrapeOpenPlay(browser) {
  console.log('\n🎪 Scraping Open Play Sessions...');
  console.log(`   URL: ${VENUE.openPlayUrl}\n`);

  const events = [];
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  try {
    await page.goto(VENUE.openPlayUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for calendar to load
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Get current month's available dates with time slots
    const months = ['current'];
    // Navigate through next 2 months to get more data
    for (let i = 0; i < 3; i++) {
      // Extract dates that have availability (shown as clickable in the calendar)
      const monthData = await page.evaluate(() => {
        const results = [];

        // Get month/year from calendar header
        const monthCaption = document.querySelector('[data-hook="datepicker-month-caption"]');
        const yearCaption = document.querySelector('[data-hook="datepicker-year-caption"]');
        const monthYear = monthCaption && yearCaption
          ? `${monthCaption.textContent} ${yearCaption.textContent}`
          : '';

        // Find all date cells in calendar
        const dateCells = document.querySelectorAll('[data-hook="calendar"] [role="button"], [data-hook="calendar"] button');

        dateCells.forEach(cell => {
          // Check if date is selectable (has dots indicating availability)
          const hasDot = cell.querySelector('[data-hook="dot-icon"]');
          const dayNum = cell.textContent.trim();

          if (hasDot && dayNum && /^\d+$/.test(dayNum)) {
            results.push({
              day: parseInt(dayNum),
              monthYear: monthYear,
              available: true
            });
          }
        });

        return results;
      });

      // For each available date, click it to get time slots
      for (const dateInfo of monthData) {
        try {
          // Click on the date
          await page.evaluate((day) => {
            const cells = document.querySelectorAll('[data-hook="calendar"] [role="button"], [data-hook="calendar"] button');
            for (const cell of cells) {
              if (cell.textContent.trim() === String(day)) {
                const dot = cell.querySelector('[data-hook="dot-icon"]');
                if (dot) {
                  cell.click();
                  return true;
                }
              }
            }
            return false;
          }, dateInfo.day);

          // Wait for time slots to load
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Extract time slots
          const timeSlots = await page.evaluate(() => {
            const slots = [];
            const slotElements = document.querySelectorAll('[data-hook*="slot"], [class*="time-slot"], [data-hook="daily-time-slots-layout"] button');

            slotElements.forEach(el => {
              const text = el.textContent.trim();
              // Only capture clean time slots like "12:30 pm" or "4:15 pm"
              const timeMatch = text.match(/^(\d{1,2}:\d{2}\s*(?:am|pm))$/i);
              if (timeMatch) {
                slots.push(timeMatch[1]);
              }
            });

            return slots;
          });

          if (timeSlots.length > 0) {
            const year = new Date().getFullYear();
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'];
            const monthMatch = dateInfo.monthYear.match(new RegExp(months.join('|'), 'i'));
            const monthIndex = monthMatch ? months.findIndex(m => m.toLowerCase() === monthMatch[0].toLowerCase()) : new Date().getMonth();
            const eventYear = dateInfo.monthYear.match(/\d{4}/) ? parseInt(dateInfo.monthYear.match(/\d{4}/)[0]) : year;

            const eventDate = new Date(eventYear, monthIndex, dateInfo.day);

            for (const slot of timeSlots) {
              events.push({
                name: 'Open Play',
                eventDate: eventDate.toISOString().split('T')[0],
                time: slot,
                type: 'open_play'
              });
            }
          }
        } catch (err) {
          // Continue to next date
        }
      }

      // Navigate to next month
      try {
        const nextButton = await page.$('[data-hook="datepicker-right-arrow"]');
        if (nextButton) {
          await nextButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (err) {
        break;
      }
    }

    console.log(`   Found ${events.length} Open Play time slots`);

  } catch (error) {
    console.error('   Error scraping Open Play:', error.message);
  } finally {
    await page.close();
  }

  return events;
}

// Scrape Holiday/Special Events from Parents Night Out page
async function scrapeSpecialEvents(browser) {
  console.log('\n🎄 Scraping Holiday/Special Events...');
  console.log(`   URL: ${VENUE.eventsUrl}\n`);

  const events = [];
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

  try {
    await page.goto(VENUE.eventsUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get page text content
    const pageText = await page.evaluate(() => document.body.innerText);

    // Parse Holiday Break Camps
    // Pattern: "Monday, November 24th - All Things Fall"
    const campPattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d+)(?:st|nd|rd|th)?\s*[-–]\s*([^\n]+)/gi;
    let match;

    while ((match = campPattern.exec(pageText)) !== null) {
      const month = match[1];
      const day = match[2];
      const theme = match[3].trim();

      // Skip if it's just a time pattern
      if (theme.match(/^\d{1,2}:\d{2}/)) continue;

      const dateStr = `${month} ${day}`;
      const eventDate = parseDate(dateStr);

      if (eventDate && theme) {
        // Determine if it's a camp or special event
        let eventName = theme;
        let eventType = 'camp';

        if (theme.toLowerCase().includes('camp') || theme.toLowerCase().includes('workshop')) {
          eventName = `Holiday Camp: ${theme}`;
        } else if (theme.toLowerCase().includes('party') || theme.toLowerCase().includes('parents night')) {
          eventType = 'parents_night_out';
          eventName = theme;
        }

        events.push({
          name: eventName,
          eventDate: eventDate.toISOString().split('T')[0],
          time: '9:00 AM - 12:00 PM', // Default camp time based on page info
          type: eventType,
          theme: theme,
          cost: '$48' // Camp pricing from page
        });
      }
    }

    // Parse Holiday Break Open Play sessions
    // Pattern: "Monday, November 24th - 12:30 pm - 1:30 pm & 4:00 pm - 5:00 pm"
    const openPlayPattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d+)(?:st|nd|rd|th)?\s*[-–]\s*([\d:]+\s*(?:am|pm)\s*[-–]\s*[\d:]+\s*(?:am|pm)(?:\s*&\s*[\d:]+\s*(?:am|pm)\s*[-–]\s*[\d:]+\s*(?:am|pm))?)/gi;

    while ((match = openPlayPattern.exec(pageText)) !== null) {
      const month = match[1];
      const day = match[2];
      const timeStr = match[3];

      const dateStr = `${month} ${day}`;
      const eventDate = parseDate(dateStr);

      if (eventDate) {
        // Split multiple time slots (separated by &)
        const timeSlots = timeStr.split('&').map(t => t.trim());

        for (const slot of timeSlots) {
          const times = parseTimeRange(slot);
          if (times) {
            events.push({
              name: 'Holiday Open Play',
              eventDate: eventDate.toISOString().split('T')[0],
              time: `${times.startTime} - ${times.endTime}`,
              type: 'holiday_open_play',
              cost: '$12' // Standard open play pricing
            });
          }
        }
      }
    }

    console.log(`   Found ${events.length} Holiday/Special Events`);

  } catch (error) {
    console.error('   Error scraping Special Events:', error.message);
  } finally {
    await page.close();
  }

  return events;
}

// Main scraper function
async function scrapeRollyPollies(options = {}) {
  console.log('\n🏋️ ROLLY POLLIES MARYLAND SCRAPER');
  console.log('='.repeat(70));
  console.log(`📍 ${VENUE.fullName}`);
  console.log(`   ${VENUE.address}, ${VENUE.city}, ${VENUE.state} ${VENUE.zipCode}`);
  console.log(`   Phone: ${VENUE.phone}`);
  console.log(`   Website: ${VENUE.website}\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    let allEvents = [];

    // Determine which scrapers to run
    const scrapeType = options.type || 'all';

    if (scrapeType === 'all' || scrapeType === 'openplay') {
      const openPlayEvents = await scrapeOpenPlay(browser);
      allEvents = allEvents.concat(openPlayEvents);
    }

    if (scrapeType === 'all' || scrapeType === 'events') {
      const specialEvents = await scrapeSpecialEvents(browser);
      allEvents = allEvents.concat(specialEvents);
    }

    console.log(`\n📝 Processing ${allEvents.length} total events...`);

    // Process each event
    for (const event of allEvents) {
      try {
        // Determine category based on event type
        let parentCategory, displayCategory, subcategory;

        switch (event.type) {
          case 'open_play':
          case 'holiday_open_play':
            parentCategory = 'Indoor Play';
            displayCategory = 'Open Gym';
            subcategory = 'Indoor Playground';
            break;
          case 'camp':
            parentCategory = 'Kids Camps';
            displayCategory = 'Day Camps';
            subcategory = 'Holiday Camp';
            break;
          case 'parents_night_out':
            parentCategory = 'Special Events';
            displayCategory = 'Parents Night Out';
            subcategory = 'Drop-Off Events';
            break;
          default:
            const categorized = categorizeEvent({
              name: event.name,
              description: event.theme || ''
            });
            parentCategory = categorized.parentCategory;
            displayCategory = categorized.displayCategory;
            subcategory = categorized.subcategory;
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: VENUE.name,
          eventDate: normalizedDate,
          scheduleDescription: `${event.eventDate} ${event.time}`,
          startTime: event.time ? event.time.split('-')[0].trim() : '',
          endTime: event.time && event.time.includes('-') ? event.time.split('-')[1].trim() : '',
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: 'Toddlers & Preschool (Walking-8)',
          cost: event.cost || '$12/hour',
          description: event.theme || `${event.name} at Rolly Pollies - Fun fitness activities for kids walking to 8 years old.`,
          location: {
            name: VENUE.name,
            address: VENUE.address,
            city: VENUE.city,
            state: VENUE.state,
            zipCode: VENUE.zipCode,
            county: VENUE.county,
            coordinates: VENUE.coordinates
          },
          contact: {
            website: VENUE.website,
            phone: VENUE.phone
          },
          url: event.type === 'open_play' ? VENUE.openPlayUrl : VENUE.eventsUrl,
          geohash: ngeohash.encode(VENUE.coordinates.latitude, VENUE.coordinates.longitude, 7),
          metadata: {
            source: 'Rolly Pollies Scraper',
            sourceName: VENUE.fullName,
            county: VENUE.county,
            eventType: event.type,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: false,
            ageRange: 'Toddlers & Preschool (Walking-8)'
          }
        };

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', VENUE.fullName)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name} - ${event.eventDate} ${event.time}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

  } catch (error) {
    console.error('❌ Scraper error:', error.message);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ ROLLY POLLIES SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  // Log scraper stats to Firestore
  await logScraperResult('Rolly Pollies Maryland', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeRollyPolliesCloudFunction() {
  try {
    const results = await scrapeRollyPollies();
    return {
      success: true,
      ...results
    };
  } catch (error) {
    console.error('Cloud Function Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  scrapeRollyPollies,
  scrapeRollyPolliesCloudFunction
};

// Run if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      options.type = args[i + 1];
    }
  }

  scrapeRollyPollies(options)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
