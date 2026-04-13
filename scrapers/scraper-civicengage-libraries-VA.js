#!/usr/bin/env node

/**
 * CIVICENGAGE PLATFORM SCRAPER
 *
 * Scrapes events from libraries using CivicEngage calendar system
 * CivicEngage is a government website platform with built-in event calendars
 *
 * COVERAGE (8 library systems in VA & NC):
 * VA:
 * - Newport News Public Library System (Newport News, VA) - 180,000 population
 * - Danville Public Library (Danville, VA) - 45,000 population
 * - Colonial Heights Public Library (Colonial Heights, VA) - 17,000 population
 * - Culpeper County Library (Culpeper, VA) - 55,000 population
 * - Hampton Public Library (Hampton, VA) - 135,000 population
 * - Mary Riley Styles Public Library (Falls Church, VA) - 15,000 population
 * - Radford Public Library (Radford, VA) - 18,000 population
 * NC:
 * - Onslow County Public Library (Jacksonville, NC) - 216,000 population (NEW)
 *
 * Usage:
 *   node functions/scrapers/scraper-civicengage-libraries-VA.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { logScraperResult } = require('./scraper-logger');
const { normalizeDateString } = require('./date-normalization-helper');
const { linkEventToVenue } = require('./venue-matcher');

// Library Systems using CivicEngage
const LIBRARY_SYSTEMS = [
  // Newport News - SSL certificate expired as of Dec 2025, skip until fixed
  // {
  //   name: 'Newport News Public Library System',
  //   url: 'https://newportnewsva.gov/calendar.aspx?CID=19',
  //   county: 'Newport News',
  //   state: 'VA',
  //   website: 'https://www.newportnewsva.gov/222/Public-Library-System',
  //   city: 'Newport News',
  //   zipCode: '23601'
  // },
  {
    name: 'Danville Public Library',
    url: 'https://www.danville-va.gov/calendar.aspx?CID=66',
    county: 'Danville',
    state: 'VA',
    website: 'https://www.danville-va.gov/2467/Public-Library',
    city: 'Danville',
    zipCode: '24541'
  },
  {
    name: 'Colonial Heights Public Library',
    url: 'https://colonialheightsva.gov/calendar.aspx?CID=25',
    county: 'Colonial Heights',
    state: 'VA',
    website: 'https://colonialheightsva.gov/185/Library',
    city: 'Colonial Heights',
    zipCode: '23834'
  },
  {
    name: 'Culpeper County Library',
    url: 'https://www.culpepercounty.gov/calendar.aspx?CID=47',
    county: 'Culpeper',
    state: 'VA',
    website: 'https://www.culpepercounty.gov/204/Library',
    city: 'Culpeper',
    zipCode: '22701'
  },
  {
    name: 'Hampton Public Library',
    url: 'https://www.hampton.gov/calendar.aspx',
    county: 'Hampton',
    state: 'VA',
    website: 'https://www.hampton.gov/1264/Public-Library',
    city: 'Hampton',
    zipCode: '23669'
  },
  {
    name: 'Mary Riley Styles Public Library',
    url: 'https://www.fallschurchva.gov/calendar.aspx?CID=26',
    county: 'Falls Church',
    state: 'VA',
    website: 'https://www.fallschurchva.gov/239/Library',
    city: 'Falls Church',
    zipCode: '22046'
  },
  {
    name: 'Radford Public Library',
    url: 'https://www.radfordva.gov/calendar.aspx',
    county: 'Radford',
    state: 'VA',
    website: 'https://www.radfordva.gov/189/Public-Library',
    city: 'Radford',
    zipCode: '24141'
  },

  // NORTH CAROLINA
  {
    name: 'Onslow County Public Library',
    url: 'https://www.onslowcountync.gov/calendar.aspx?CID=58',
    county: 'Onslow',
    state: 'NC',
    website: 'https://www.onslowcountync.gov/library',
    city: 'Jacksonville',
    zipCode: '28540'
  }
];

// Geocode address
async function geocodeAddress(address) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        countrycodes: 'us'
      },
      headers: {
        'User-Agent': 'FunHive/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
  }
  return null;
}

// Parse age range from audience text
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText.match(/18\+/i)) {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from CivicEngage library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for calendar events to load - CivicEngage uses AJAX
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for calendar content to load (look for .monthItem elements)
    try {
      await page.waitForSelector('.monthItem, .listItem, .calendarList .item', { timeout: 10000 });
    } catch (e) {
      // Calendar might use different structure, continue anyway
    }

    // Additional wait for AJAX content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Diagnostic: log page title and key selectors found
    const pageTitle = await page.title();
    const diagnostics = await page.evaluate(() => {
      return {
        monthItems: document.querySelectorAll('.monthItem').length,
        listItems: document.querySelectorAll('.listItem').length,
        calItems: document.querySelectorAll('[class*="calItem"]').length,
        tableEvents: document.querySelectorAll('td.hasEvent, td[class*="event"]').length,
        anyLinks: document.querySelectorAll('a[href*="calendar"], a[href*="Calendar"]').length,
        bodySnippet: document.body?.textContent?.substring(0, 200) || 'empty'
      };
    });
    console.log(`   Page: "${pageTitle}" | monthItem:${diagnostics.monthItems} listItem:${diagnostics.listItems} calItem:${diagnostics.calItems} tableEvents:${diagnostics.tableEvents} links:${diagnostics.anyLinks}`);

    // Extract events from the page - CivicEngage calendar structure
    const events = await page.evaluate(() => {
      const results = [];

      // CivicEngage uses .monthItem or similar containers for calendar events
      // Each event has a .detailsTooltip with structured data
      const eventContainers = document.querySelectorAll('.monthItem, .listItem, [class*="calItem"]');

      eventContainers.forEach(container => {
        try {
          // Look for event title in span[itemprop="name"] or h3/h4
          const titleEl = container.querySelector('span[itemprop="name"], h3, h4, .eventTitle');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Get the tooltip container for more details
          const tooltip = container.querySelector('.detailsTooltip, .tooltipInner');
          const fullText = tooltip ? tooltip.textContent : container.textContent;

          // Extract time from <dt>When:</dt><dd>time</dd> structure
          let eventTime = '';
          const whenDt = tooltip?.querySelector('dt');
          if (whenDt && whenDt.textContent.includes('When')) {
            const timeDd = whenDt.nextElementSibling;
            if (timeDd && timeDd.tagName === 'DD') {
              eventTime = timeDd.textContent.trim();
            }
          }

          // Fallback: parse from text content
          if (!eventTime) {
            const timeMatch = fullText.match(/When[:\s]*([^\n]+)/i);
            if (timeMatch) eventTime = timeMatch[1].trim();
          }

          // Extract location from <dt>Location:</dt><dd>loc</dd> structure
          let location = '';
          const allDts = tooltip?.querySelectorAll('dt') || [];
          for (const dt of allDts) {
            if (dt.textContent.includes('Location')) {
              const locDd = dt.nextElementSibling;
              if (locDd && locDd.tagName === 'DD') {
                location = locDd.textContent.trim();
              }
              break;
            }
          }

          // Get event URL from links in container
          let url = '';
          const linkEl = container.querySelector('a[href*="calendarDetail"], a[target="_blank"]');
          if (linkEl && linkEl.href) {
            url = linkEl.href;
          }

          // Extract audience/age info
          let audience = '';
          const audienceMatch = fullText.match(/(?:Ages?|Audience|Grade)[:\s]*([^\n.]+)/i);
          if (audienceMatch) {
            audience = audienceMatch[1].trim();
          }

          // Get the full date from the tooltip or container text
          // CivicEngage format: "January 2, 2026, 11:00 AM - 12:00 PM"
          let fullDateTime = '';
          const containerText = container.textContent;

          // Look for full date pattern: "Month DD, YYYY" with optional time
          const fullDateMatch = containerText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}(?:,?\s+\d{1,2}:\d{2}\s*(?:AM|PM))?/i);
          if (fullDateMatch) {
            fullDateTime = fullDateMatch[0];
          } else {
            // Fallback: try to build date from TD context and time
            const parentTd = container.closest('td');
            if (parentTd && eventTime) {
              // Get day number from start of TD text (e.g., "02 Countdown...")
              const tdText = parentTd.textContent.trim();
              const dayMatch = tdText.match(/^(\d{1,2})\s/);

              if (dayMatch) {
                // Get month/year from page context
                const pageText = document.body.textContent;
                const monthYearMatch = pageText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
                if (monthYearMatch) {
                  fullDateTime = `${monthYearMatch[1]} ${dayMatch[1]}, ${monthYearMatch[2]} ${eventTime}`;
                }
              }
            }
          }

          // If we still don't have a date, skip this event
          if (!fullDateTime) {
            return;
          }

          if (title && fullDateTime) {
            results.push({
              name: title,
              eventDate: fullDateTime,
              venue: location,
              description: '',
              url: url,
              audience: audience
            });
          }
        } catch (err) {
          // Silently skip parsing errors
        }
      });

      // Also check for list view format
      if (results.length === 0) {
        const listItems = document.querySelectorAll('.listContent li, .calendarList .event-item');
        listItems.forEach(item => {
          const titleEl = item.querySelector('a, h3, h4, .title');
          const title = titleEl?.textContent?.trim();
          if (!title) return;

          const dateText = item.textContent;
          const dateMatch = dateText.match(/(\w{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/);

          if (title && dateMatch) {
            results.push({
              name: title,
              eventDate: dateMatch[1],
              venue: '',
              description: '',
              url: titleEl?.href || '',
              audience: ''
            });
          }
        });
      }

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range from description and audience
        const ageRange = parseAgeRange(event.description + ' ' + event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to geocode location
        let coordinates = null;
        if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`);
        }

        // Extract time BEFORE normalization strips it
        let eventStartTime = null;
        let eventEndTime = null;
        const rawTimeMatch = event.eventDate?.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i)
          || event.eventDate?.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
        if (rawTimeMatch && rawTimeMatch[6]) {
          const sap = (rawTimeMatch[3] || 'AM').toUpperCase();
          const eap = rawTimeMatch[6].toUpperCase();
          eventStartTime = `${parseInt(rawTimeMatch[1])}:${rawTimeMatch[2]} ${sap}`;
          eventEndTime = `${parseInt(rawTimeMatch[4])}:${rawTimeMatch[5]} ${eap}`;
        } else if (rawTimeMatch) {
          eventStartTime = `${parseInt(rawTimeMatch[1])}:${rawTimeMatch[2]} ${(rawTimeMatch[3] || 'AM').toUpperCase()}`;
        }

        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
          scheduleDescription: event.eventDate,
          state: library.state,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.audience || '',
          location: {
            name: event.venue || library.name,
            address: '',
            city: library.city,
            state: library.state,
            zipCode: library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'CivicEngage Scraper',
            scraperName: 'CivicEngage-VA',
            sourceName: library.name,
            county: library.county,
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
          .where('metadata.sourceName', '==', library.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        await db.collection('events').add(eventDoc);
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, failed, skipped };
}

// Main scraper function
async function scrapeCivicEngageLibraries() {
  console.log('\n📚 CIVICENGAGE PLATFORM SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 7 libraries in VA\n');

  let totalImported = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      const { imported, failed, skipped } = await scrapeLibraryEvents(library, browser);
      totalImported += imported;
      totalSkipped += skipped;
      totalFailed += failed;
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CIVICENGAGE SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${totalImported}`);
  console.log(`   Skipped (duplicates/adults): ${totalSkipped}`);
  console.log(`   Failed: ${totalFailed}`);
  console.log('='.repeat(60) + '\n');

  
  // Log scraper stats to Firestore
  await logScraperResult('CivicEngage-VA', {
    found: totalImported,
    new: totalImported,
    duplicates: 0
  }, { dataType: 'events' });

  return { imported: totalImported, skipped: totalSkipped, failed: totalFailed };
}

// Run if executed directly
if (require.main === module) {
  scrapeCivicEngageLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeCivicEngageLibraries };
