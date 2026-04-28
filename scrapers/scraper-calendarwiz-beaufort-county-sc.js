#!/usr/bin/env node

/**
 * CALENDARWIZ SCRAPER - Beaufort County Library (SC)
 *
 * Scrapes events from Beaufort County Library using CalendarWiz platform
 *
 * COVERAGE:
 * - Beaufort County Library (SC) - 201,000 population
 *
 * Platform: CalendarWiz (embedded calendar system)
 * Calendar URL: https://www.calendarwiz.com/calendars/calendar.php?crd=beaufortcountylibrary
 *
 * Usage:
 *   node functions/scrapers/scraper-calendarwiz-beaufort-county-sc.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { parseDateToObject, normalizeDateString } = require('./date-normalization-helper');
const { geocodeWithFallback } = require('./geocoding-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Library configuration
const LIBRARY = {
  name: 'Beaufort County Library',
  calendarUrl: 'https://www.calendarwiz.com/calendars/calendar.php?crd=beaufortcountylibrary&op=cal',
  county: 'Beaufort',
  state: 'SC',
  website: 'https://www.beaufortcountylibrary.org',
  city: 'Beaufort',
  zipCode: '29902'
};

// Branch locations for geocoding
const BRANCH_LOCATIONS = {
  'beaufort branch': { city: 'Beaufort', zip: '29902', address: '311 Scott Street' },
  'bluffton branch': { city: 'Bluffton', zip: '29910', address: '120 Palmetto Way' },
  'hilton head branch': { city: 'Hilton Head Island', zip: '29928', address: '11 Beach City Road' },
  'st. helena branch': { city: 'St. Helena Island', zip: '29920', address: '6355 Jonathan Francis Senior Road' },
  'st helena branch': { city: 'St. Helena Island', zip: '29920', address: '6355 Jonathan Francis Senior Road' },
  'port royal branch': { city: 'Port Royal', zip: '29935', address: '311 12th Street' },
  'lobeco branch': { city: 'Lobeco', zip: '29931', address: '9478 Grays Highway' }
};

// Parse age range from event title and description
function parseAgeRange(text) {
  if (!text) return 'All Ages';

  const lowerText = text.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only|18\+|21\+/i)) {
    return 'Adults';
  }

  // Check for specific age ranges
  if (lowerText.match(/0-3s?|babies?|infants?|0-2|baby/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddler|preschool|3-5|pre-k|pre k/i)) return 'Preschool (3-5)';
  if (lowerText.match(/8-12|6-12|elementary|school-?age|children|kids/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school|young adult|tween/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Extract branch location from event text
function extractBranch(text) {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  for (const [branchKey, location] of Object.entries(BRANCH_LOCATIONS)) {
    if (lowerText.includes(branchKey)) {
      return { name: branchKey.replace(/\b\w/g, l => l.toUpperCase()), ...location };
    }
  }

  return null;
}

// Parse time from event text (e.g., "10:00am - 11:00am" or "2:00pm")
function parseTime(text) {
  if (!text) return null;

  const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:am|pm))\s*-?\s*(\d{1,2}:\d{2}\s*(?:am|pm))?/i);
  if (timeMatch) {
    return {
      start: timeMatch[1],
      end: timeMatch[2] || null
    };
  }

  return null;
}

// Scrape events from Beaufort County Library CalendarWiz
async function scrapeCalendarWizBeaufort() {
  console.log('\n📚 CALENDARWIZ SCRAPER - Beaufort County Library');
  console.log('='.repeat(70));
  console.log(`📍 ${LIBRARY.name} (${LIBRARY.county} County, ${LIBRARY.state})`);
  console.log(`   URL: ${LIBRARY.calendarUrl}`);
  console.log(`   Population: 201,000\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Navigate to the CalendarWiz calendar
    await page.goto(LIBRARY.calendarUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get current month/year from the page
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    // Extract events from the calendar page
    const events = await page.evaluate(() => {
      const results = [];

      // CalendarWiz shows events as links in the calendar grid
      // Each event link contains: "Event Title time @ Location"
      const eventLinks = document.querySelectorAll('a');

      eventLinks.forEach(link => {
        const text = link.textContent.trim();
        const href = link.href || '';

        // Filter for event-like links (has time pattern or @ symbol for location)
        if ((text.includes('am') || text.includes('pm') || text.includes('AM') || text.includes('PM')) &&
            text.length > 10 && text.length < 200) {

          // Skip navigation/utility links
          if (text.includes('Search') || text.includes('Login') ||
              text.includes('Go to Date') || text.includes('Filter') ||
              text.includes('facebook') || text.includes('twitter')) {
            return;
          }

          // Extract components from text like:
          // "Storytime for 0-3s 11:00am - 12:00pm @ Hilton Head Branch"
          const atMatch = text.match(/^(.+?)\s+(\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))?)\s*@\s*(.+)$/i);

          if (atMatch) {
            results.push({
              title: atMatch[1].trim(),
              time: atMatch[2].trim(),
              location: atMatch[3].trim(),
              rawText: text,
              href: href
            });
          } else {
            // Alternative format without @ separator
            const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))?)/i);
            if (timeMatch) {
              const parts = text.split(timeMatch[0]);
              if (parts[0].trim().length > 3) {
                results.push({
                  title: parts[0].trim(),
                  time: timeMatch[0].trim(),
                  location: parts[1] ? parts[1].replace(/^[\s@]+/, '').trim() : '',
                  rawText: text,
                  href: href
                });
              }
            }
          }
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events on page`);

    // We need to associate events with dates. CalendarWiz shows month view.
    // We'll need to scrape multiple views or use the list view to get dates.

    // Switch to list view for better date extraction
    await page.goto(`${LIBRARY.calendarUrl}&view=list`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events from list view with dates
    const listEvents = await page.evaluate(() => {
      const results = [];
      const bodyText = document.body.innerText;

      // Parse the list view which shows events in format:
      // Date header
      // Event Name Time @ Location
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      let currentDate = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for date headers (e.g., "1", "2", "3" followed by day info or full date)
        // CalendarWiz list view shows dates like "November 30, 2024" or numbered days
        const fullDateMatch = line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})$/i);
        const dayMatch = line.match(/^(\d{1,2})$/);

        if (fullDateMatch) {
          currentDate = line;
          continue;
        }

        // Look for event patterns with time
        const eventMatch = line.match(/^(.+?)\s+(\d{1,2}:\d{2}\s*(?:am|pm)(?:\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))?)\s*(?:@\s*)?(.*)$/i);

        if (eventMatch && currentDate) {
          const title = eventMatch[1].trim();
          const time = eventMatch[2].trim();
          let location = eventMatch[3].trim();

          // Skip if title is too short or looks like a date/number
          if (title.length < 4 || /^\d+$/.test(title)) continue;

          // Skip headers and navigation
          if (/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/i.test(title)) continue;
          if (/^(month|week|day|list|search|filter)$/i.test(title)) continue;

          results.push({
            title: title,
            eventDate: `${currentDate} ${time}`,
            time: time,
            location: location,
            dateOnly: currentDate
          });
        }
      }

      return results;
    });

    console.log(`   Found ${listEvents.length} events with dates in list view`);

    // If list view didn't work well, fall back to calendar view with today's date context
    let eventsToProcess = listEvents.length > 0 ? listEvents : events.map(e => ({
      title: e.title,
      eventDate: `${currentMonth} ${new Date().getDate()}, ${currentYear} ${e.time}`,
      time: e.time,
      location: e.location,
      dateOnly: `${currentMonth} ${new Date().getDate()}, ${currentYear}`
    }));

    // Deduplicate events based on title + date
    const seen = new Set();
    eventsToProcess = eventsToProcess.filter(e => {
      const key = `${e.title}-${e.dateOnly}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`   Processing ${eventsToProcess.length} unique events`);

    // Process each event
    for (const event of eventsToProcess) {
      try {
        // Parse age range
        const ageRange = parseAgeRange(event.title);

        // Skip adult-only events
        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Extract branch location
        const branch = extractBranch(event.location);

        // Geocode location
        let coordinates = null;
        if (branch) {
          const fullAddress = `${branch.address}, ${branch.city}, SC ${branch.zip}`;
          coordinates = await geocodeWithFallback(fullAddress, {
            city: branch.city,
            zipCode: branch.zip,
            state: 'SC',
            county: LIBRARY.county,
            venueName: branch.name || event.location,
            sourceName: LIBRARY.name
          });
        } else if (event.location) {
          coordinates = await geocodeWithFallback(
            `${event.location}, ${LIBRARY.city}, ${LIBRARY.county} County, SC`,
            {
              city: LIBRARY.city,
              zipCode: LIBRARY.zipCode,
              state: 'SC',
              county: LIBRARY.county,
              venueName: event.location,
              sourceName: LIBRARY.name
            }
          );
        }

        // Categorize event
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.title,
          description: event.title
        });

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Parse date for Firestore timestamp
        const dateObj = parseDateToObject(event.eventDate);
        const dateTimestamp = dateObj ? admin.firestore.Timestamp.fromDate(dateObj) : null;

        // Build event document
        const eventDoc = {
          name: event.title,
          venue: event.location || (branch ? branch.name : LIBRARY.name),
          eventDate: normalizedDate,
          date: dateTimestamp,
          startDate: dateTimestamp,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: '',
          moreInfo: '',
          location: {
            name: event.location || (branch ? branch.name : LIBRARY.name),
            address: branch ? branch.address : '',
            city: branch ? branch.city : LIBRARY.city,
            state: 'SC',
            zipCode: branch ? branch.zip : LIBRARY.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: LIBRARY.website,
            phone: ''
          },
          url: LIBRARY.website,
          metadata: {
            source: 'CalendarWiz Scraper',
            sourceName: LIBRARY.name,
            county: LIBRARY.county,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Add geohash if we have coordinates
        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', LIBRARY.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.title.substring(0, 60)}${event.title.length > 60 ? '...' : ''}`);
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

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${LIBRARY.name}:`, error.message);
    failed++;
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ CALENDARWIZ BEAUFORT COUNTY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates/adults): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(70) + '\n');

  // Log scraper stats to database
  await logScraperResult('CalendarWiz Beaufort County Library', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Cloud Function wrapper
async function scrapeCalendarWizBeaufortCloudFunction() {
  try {
    const results = await scrapeCalendarWizBeaufort();
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
  scrapeCalendarWizBeaufort,
  scrapeCalendarWizBeaufortCloudFunction
};

// Run if called directly
if (require.main === module) {
  scrapeCalendarWizBeaufort()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
