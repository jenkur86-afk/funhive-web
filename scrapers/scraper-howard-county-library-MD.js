#!/usr/bin/env node

/**
 * HOWARD COUNTY LIBRARY SYSTEM SCRAPER
 *
 * Scrapes events from Howard County Library
 * Uses LibraryCalendar platform with HTML feed
 *
 * Coverage: Howard County (~332,000 residents)
 *
 * Usage:
 *   node scripts/scraper-howard-county-library.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const axios = require('axios');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');

// Howard County Library branches
const HOWARD_BRANCHES = {
  'Central': { lat: 39.2998, lng: -76.8616, city: 'Columbia', zipCode: '21044', address: '10375 Little Patuxent Pkwy, Columbia, MD 21044' },
  'East Columbia': { lat: 39.2144, lng: -76.8277, city: 'Columbia', zipCode: '21044', address: '6600 Cradlerock Way, Columbia, MD 21045' },
  'Elkridge': { lat: 39.2125, lng: -76.7138, city: 'Elkridge', zipCode: '21075', address: '6540 Washington Blvd, Elkridge, MD 21075' },
  'Glenwood': { lat: 39.2869, lng: -77.0282, city: 'Glenwood', zipCode: '21738', address: '2350 State Route 97, Glenwood, MD 21738' },
  'Miller': { lat: 39.2144, lng: -76.9533, city: 'Ellicott City', zipCode: '21043', address: '9421 Frederick Rd, Ellicott City, MD 21042' },
  'Savage': { lat: 39.1369, lng: -76.8222, city: 'Laurel', zipCode: '20723', address: '9525 Durness Ln, Laurel, MD 20723' }
};

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

// Find matching branch
function findBranch(location) {
  if (!location) return null;

  const locationLower = location.toLowerCase();

  for (const [branchName, branchData] of Object.entries(HOWARD_BRANCHES)) {
    if (locationLower.includes(branchName.toLowerCase())) {
      return { name: branchName, ...branchData };
    }
  }

  return null;
}

// Scrape Howard County Library events
async function scrapeHowardCountyLibrary() {
  console.log('\n📚 HOWARD COUNTY LIBRARY SYSTEM SCRAPER');
  console.log('='.repeat(60));
  console.log('Source: LibraryCalendar platform\n');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    console.log('📅 Loading: https://howardcounty.librarycalendar.com/events');
    await page.goto('https://howardcounty.librarycalendar.com/events', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for events to load - LibraryCalendar loads events dynamically
    await page.waitForSelector('body', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract events - LibraryCalendar uses featured events section
    const events = await page.evaluate(() => {
      const results = [];

      // LibraryCalendar Featured Events typically use divs with links to /event/
      // Find all links that point to event pages
      const eventLinks = document.querySelectorAll('a[href*="/event/"]');
      const processedUrls = new Set();

      eventLinks.forEach(linkEl => {
        try {
          const url = linkEl.href;
          // Skip if already processed
          if (processedUrls.has(url)) return;
          processedUrls.add(url);

          // Get the parent container (usually a card or div)
          let container = linkEl;
          for (let i = 0; i < 5; i++) {
            if (container.parentElement) container = container.parentElement;
          }

          // Get all text from container
          const fullText = container.textContent.replace(/\s+/g, ' ').trim();

          // Extract title - use the link text or find a heading
          let title = linkEl.textContent.trim();
          if (!title || title.length < 3) {
            const headingEl = container.querySelector('h2, h3, h4, h5');
            if (headingEl) title = headingEl.textContent.trim();
          }
          if (!title || title.length < 3) return;

          // Extract date - look for patterns
          let eventDate = '';
          const datePatterns = [
            /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /(\w{3,9}\s+\d{1,2},?\s+\d{4})/i,
            /(\d{1,2}\/\d{1,2}\/\d{4})/
          ];

          for (const pattern of datePatterns) {
            const match = fullText.match(pattern);
            if (match) {
              eventDate = match[1] || match[0];
              break;
            }
          }

          // Extract time - look for time ranges
          let time = '';
          const timeMatch = fullText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))\s*[–-]\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
          if (timeMatch) {
            time = timeMatch[0];
          } else {
            const singleTime = fullText.match(/\d{1,2}:\d{2}\s*(?:am|pm)/i);
            if (singleTime) time = singleTime[0];
          }

          // Extract location/branch
          let location = '';
          const branches = ['Central Branch', 'East Columbia Branch', 'Elkridge Branch', 'Glenwood Branch', 'Miller Branch', 'Savage Branch'];
          for (const branch of branches) {
            if (fullText.includes(branch)) {
              location = branch.replace(' Branch', '');
              break;
            }
          }
          // Also check short names
          if (!location) {
            for (const branchName of ['Central', 'East Columbia', 'Elkridge', 'Glenwood', 'Miller', 'Savage']) {
              if (fullText.includes(branchName)) {
                location = branchName;
                break;
              }
            }
          }

          // Extract age range
          let ageRange = 'All Ages';
          const lowerText = fullText.toLowerCase();
          const ageMatch = lowerText.match(/\(ages?\s*(\d+)(?:\s*-\s*(\d+))?\s*(?:\+|and up)?\)/i);
          if (ageMatch) {
            const minAge = parseInt(ageMatch[1]);
            const maxAge = ageMatch[2] ? parseInt(ageMatch[2]) : null;
            if (minAge <= 2) ageRange = 'Babies & Toddlers (0-2)';
            else if (minAge <= 5) ageRange = 'Preschool (3-5)';
            else if (minAge <= 12) ageRange = 'Children (6-12)';
            else if (minAge <= 17) ageRange = 'Teens (13-17)';
            else ageRange = 'Adults';
          } else if (lowerText.includes('all ages') || lowerText.includes('families')) {
            ageRange = 'All Ages';
          } else if (lowerText.match(/baby|infant|birth/)) {
            ageRange = 'Babies & Toddlers (0-2)';
          } else if (lowerText.match(/toddler|preschool/)) {
            ageRange = 'Preschool (3-5)';
          } else if (lowerText.match(/teen/)) {
            ageRange = 'Teens (13-17)';
          }

          // Skip adult-only events
          if (ageRange === 'Adults') return;

          if (title && eventDate) {
            // Combine date and time
            const rawDate = time ? `${eventDate} ${time}` : eventDate;

            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: fullText.substring(0, 300),
              url: url,
              ageRange: ageRange
            });
          }
        } catch (err) {
          // Skip errors
        }
      });

      return results;
    });

    console.log(`  ✅ Found ${events.length} events\n`);

    // Process each event
    for (const event of events) {
      try {
        // Normalize date format
        const normalizedDate = normalizeDateString(event.eventDate);
        if (!normalizedDate) {
          console.log(`  ⚠️ Skipping event with invalid date: "${event.eventDate}"`);
          skipped++;
          continue;
        }

        // Find branch
        const branch = findBranch(event.venue);

        // Get coordinates
        let coordinates = null;
        if (branch) {
          coordinates = { latitude: branch.lat, longitude: branch.lng };
        } else if (event.venue) {
          coordinates = await geocodeAddress(`${event.venue}, Howard County, MD`);
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description
        });

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: branch ? `${branch.name} Branch` : 'Howard County Library',
          eventDate: normalizedDate,
          scheduleDescription: event.eventDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: event.ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: '',
          state: 'MD',
          location: {
            name: branch ? `${branch.name} Branch` : 'Howard County Library',
            address: branch ? branch.address : '',
            city: branch ? branch.city : 'Columbia',
            state: 'MD',
            zipCode: branch ? branch.zipCode : '',
            coordinates: coordinates
          },
          contact: {
            website: event.url || 'https://howardcounty.librarycalendar.com',
            phone: ''
          },
          url: event.url || 'https://howardcounty.librarycalendar.com',
          metadata: {
            source: 'Howard County Library Scraper',
            sourceName: 'Howard County Library System',
            county: 'Howard',
            state: 'MD',
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: event.ageRange
          }
        };

        // Add geohash if we have coordinates
        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', 'Howard County Library System')
          .limit(1)
          .get();

        if (existing.empty) {
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
    console.error('❌ Fatal error:', error.message);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ HOWARD COUNTY LIBRARY SCRAPER COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (duplicates): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  // Log scraper stats to database
  await logScraperResult('Howard County Library MD', {
    found: imported + skipped,
    new: imported,
    duplicates: skipped
  }, { dataType: 'events' });

  return { imported, skipped, failed };
}

// Run if executed directly
if (require.main === module) {
  scrapeHowardCountyLibrary()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeHowardCountyLibrary };
