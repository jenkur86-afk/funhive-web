#!/usr/bin/env node

/**
 * ORANGE COUNTY LIBRARY SYSTEM SCRAPER (Orlando, FL)
 *
 * Scrapes family events from Orange County Library System
 * Platform: WordPress with custom React calendar plugin
 * Coverage: Orange County, Florida (Orlando metro area)
 *
 * Data Source: https://ocls.org/calendar/
 * Events: 50-100+ per month
 *
 * Usage:
 *   node scraper-orange-county-library-FL.js
 *
 * Cloud Function: scrapeOrangeCountyLibraryFLCloudFunction
 * Schedule: Group 2 (every 3 days on days 2, 5, 8, 11...)
 */

const puppeteer = require('puppeteer');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');
const ngeohash = require('ngeohash');

const SCRAPER_NAME = 'OrangeCountyLibrary-FL';
const CALENDAR_URL = 'https://ocls.org/calendar/';
const STATE = 'FL';
const CITY = 'Orlando';

// Orange County Library System main branch
const OCLS_HQ = {
  name: 'Orange County Library System',
  city: CITY,
  state: STATE,
  address: '101 E Central Blvd, Orlando, FL 32801',
  zipCode: '32801',
  url: CALENDAR_URL,
  county: 'Orange',
};

/**
 * Scrape events from OCLS calendar
 */
async function scrapeOrangeCountyLibraryFL() {
  console.log('\n📚 ORANGE COUNTY LIBRARY SYSTEM SCRAPER (Orlando, FL)');
  console.log('='.repeat(60));
  console.log(`Source: ${CALENDAR_URL}\n`);

  let browser;
  const events = [];

  try {
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📅 Loading calendar page...');
    await page.goto(CALENDAR_URL, { waitUntil: 'networkidle2' });

    // Wait for calendar to load (WordPress/React may take a moment)
    await page.waitForSelector('[class*="calendar"], [class*="event"], .event-item', { timeout: 10000 }).catch(() => {
      console.log('⚠️  No explicit calendar selector found, proceeding with page content');
    });

    // Extract event data via JavaScript
    const eventData = await page.evaluate(() => {
      const events = [];

      // Try multiple selectors for event containers
      const eventSelectors = [
        '[class*="event-card"]',
        '[class*="event-item"]',
        '[class*="event"]',
        '.event',
        '[data-event]',
        'article',
        '.post',
        '[role="article"]'
      ];

      let eventElements = [];
      for (const selector of eventSelectors) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      // If still no events, try to extract from calendar structure
      if (eventElements.length === 0) {
        // Fallback: look for date/title patterns in visible text
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').filter(l => l.trim().length > 0);
        // Basic extraction from text content
        for (let i = 0; i < Math.min(lines.length, 100); i++) {
          const line = lines[i].trim();
          if (line.length > 3 && !line.includes('Calendar') && !line.includes('Toggle')) {
            eventElements = Array.from(document.querySelectorAll('[class*="content"], [class*="main"]'));
          }
        }
      }

      // Parse events from DOM
      eventElements.forEach((el) => {
        // Try to extract title
        let title = el.querySelector('h2, h3, h4, .title, [class*="title"]')?.innerText?.trim()
          || el.getAttribute('data-title')
          || el.getAttribute('data-name')
          || el.innerText?.split('\n')[0];

        // Try to extract date
        let dateStr = el.querySelector('[class*="date"], time')?.innerText?.trim()
          || el.getAttribute('data-date')
          || el.getAttribute('data-event-date');

        // Try to extract time
        let timeStr = el.querySelector('[class*="time"]')?.innerText?.trim()
          || el.getAttribute('data-time');

        // Try to extract location/venue
        let location = el.querySelector('[class*="location"], [class*="venue"], .address')?.innerText?.trim()
          || el.getAttribute('data-location');

        // Try to extract description
        let description = el.querySelector('[class*="description"], [class*="excerpt"], .content')?.innerText?.trim()
          || el.getAttribute('data-description');

        // Try to extract URL
        let url = el.querySelector('a')?.href || el.getAttribute('data-url');

        // Clean up extracted data
        if (title && title.length > 3) {
          title = title.replace(/\s+/g, ' ').trim();

          // Only add if we have meaningful data
          if (dateStr || timeStr) {
            events.push({
              title: title.substring(0, 200),
              date: dateStr ? dateStr.substring(0, 100) : null,
              time: timeStr ? timeStr.substring(0, 100) : null,
              location: location ? location.substring(0, 200) : null,
              description: description ? description.substring(0, 1000) : null,
              url: url
            });
          }
        }
      });

      return events;
    });

    console.log(`  ✅ Found ${eventData.length} events in calendar\n`);

    // Transform and enrich event data
    for (const event of eventData) {
      if (!event.title || event.title.length < 3) continue;

      // Parse date and time
      let eventDate = event.date || '';
      if (event.time && !eventDate.includes(event.time)) {
        eventDate = `${eventDate} ${event.time}`.trim();
      }

      // Build event object for saving
      const eventObj = {
        title: event.title,
        name: event.title,
        eventDate: eventDate,
        date: eventDate,
        description: event.description || '',
        url: event.url || CALENDAR_URL,
        venue: event.location || OCLS_HQ.name,
        venueName: event.location || OCLS_HQ.name,
        location: event.location || CITY,
        metadata: {
          sourceName: OCLS_HQ.name,
          sourceUrl: CALENDAR_URL,
          scrapedAt: new Date().toISOString()
        }
      };

      // Try to extract age group from description or title
      const fullText = `${event.title} ${event.description || ''}`.toLowerCase();
      if (fullText.includes('toddler') || fullText.includes('baby') || fullText.includes('0-3')) {
        eventObj.ageRange = 'Babies & Toddlers (0-2)';
      } else if (fullText.includes('preschool') || fullText.includes('3-5')) {
        eventObj.ageRange = 'Preschool (3-5)';
      } else if (fullText.includes('kids') || fullText.includes('6-8') || fullText.includes('children')) {
        eventObj.ageRange = 'Kids (6-8)';
      } else if (fullText.includes('tween') || fullText.includes('9-12')) {
        eventObj.ageRange = 'Tweens (9-12)';
      } else if (fullText.includes('teen') || fullText.includes('13-18')) {
        eventObj.ageRange = 'Teens (13-18)';
      } else {
        eventObj.ageRange = 'All Ages';
      }

      // Check if free
      if (fullText.includes('free')) {
        eventObj.cost = 'Free';
      }

      events.push(eventObj);
    }

    // Save events using the standard helper
    if (events.length > 0) {
      console.log('💾 Saving events...\n');
      const result = await saveEventsWithGeocoding(events, [OCLS_HQ], {
        scraperName: SCRAPER_NAME,
        state: STATE,
        category: 'library',
        platform: 'wordpress'
      });

      console.log('\n' + '='.repeat(60));
      console.log('✅ SCRAPER COMPLETE!\n');
      console.log(`📊 Summary:`);
      console.log(`   Saved: ${result.saved}`);
      console.log(`   Skipped: ${result.skipped}`);
      console.log(`   Errors: ${result.errors}`);
      console.log(`   Deleted: ${result.deleted}`);
      console.log('='.repeat(60) + '\n');

      return result;
    } else {
      console.log('⚠️  No events found\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    return { saved: 0, skipped: 0, errors: 1, deleted: 0 };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Cloud Function wrapper
 */
async function scrapeOrangeCountyLibraryFLCloudFunction(req, res) {
  try {
    const result = await scrapeOrangeCountyLibraryFL();
    res.status(200).json({
      success: true,
      scraper: SCRAPER_NAME,
      ...result
    });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({
      success: false,
      scraper: SCRAPER_NAME,
      error: error.message
    });
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeOrangeCountyLibraryFL()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeOrangeCountyLibraryFL, scrapeOrangeCountyLibraryFLCloudFunction };
