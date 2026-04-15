#!/usr/bin/env node

/**
 * STATE PARKS EVENTS SCRAPER (Multi-State)
 *
 * Data-driven scraper for state parks events across multiple states
 * Supports: Florida, Georgia, North Carolina, Tennessee, Kentucky, Alabama
 *
 * Platform: Varies (custom Drupal, WordPress, custom platforms)
 * Technology: Puppeteer-based web scraping
 *
 * Usage:
 *   node scraper-state-parks-events.js --state FL    # Florida only
 *   node scraper-state-parks-events.js --state GA    # Georgia only
 *   node scraper-state-parks-events.js               # All states
 *
 * Cloud Function: scrapeStateParksEventsCloudFunction
 * Schedule: Group 3 (every 3 days on days 3, 6, 9, 12...)
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

// Configuration for each state's parks system
const PARKS_CONFIG = [
  {
    name: 'Florida State Parks',
    state: 'FL',
    eventsUrl: 'https://www.floridastateparks.org/events',
    eventSelector: '[class*="event"], .event-item, article',
    titleSelector: 'h2, h3, .event-title',
    dateSelector: '[class*="date"], .event-date, time',
    locationSelector: '[class*="location"], .event-location, .park-name',
    descriptionSelector: '[class*="description"], .event-description, .excerpt',
    county: 'Multi-County'
  },
  {
    name: 'Georgia State Parks',
    state: 'GA',
    eventsUrl: 'https://gastateparks.org/Events',
    altUrl: 'https://explore.gastateparks.org/calendar',
    eventSelector: '[class*="event"], .event-card, .event-item, article',
    titleSelector: 'h2, h3, .event-title, .title',
    dateSelector: '[class*="date"], .event-date, time, .event-when',
    locationSelector: '[class*="location"], .event-location, .park-name, .venue',
    descriptionSelector: '[class*="description"], .event-description, .summary',
    county: 'Multi-County'
  },
  {
    name: 'North Carolina State Parks',
    state: 'NC',
    eventsUrl: 'https://www.ncparks.gov/events',
    eventSelector: '[class*="event"], .event-item, .event-card, article',
    titleSelector: 'h2, h3, .event-title, .title, .event-name',
    dateSelector: '[class*="date"], .event-date, time, .when',
    locationSelector: '[class*="location"], [class*="venue"], .park-name, .event-location',
    descriptionSelector: '[class*="description"], .event-description, .summary, .excerpt',
    county: 'Multi-County'
  },
  {
    name: 'Tennessee State Parks',
    state: 'TN',
    eventsUrl: 'https://tnstateparks.com/activities-events',
    eventSelector: '[class*="event"], .event-item, .event-card, article, [data-event]',
    titleSelector: 'h2, h3, .event-title, .title, a',
    dateSelector: '[class*="date"], .event-date, time, .event-when, .when',
    locationSelector: '[class*="location"], [class*="venue"], .park-name, .event-location',
    descriptionSelector: '[class*="description"], .event-description, .summary, p',
    county: 'Multi-County'
  },
  {
    name: 'Kentucky State Parks',
    state: 'KY',
    eventsUrl: 'https://parks.ky.gov/events',
    eventSelector: '[class*="event"], .event-item, .event-card, article',
    titleSelector: 'h2, h3, .event-title, .title',
    dateSelector: '[class*="date"], .event-date, time, .event-when',
    locationSelector: '[class*="location"], [class*="venue"], .park-name',
    descriptionSelector: '[class*="description"], .event-description, .summary',
    county: 'Multi-County'
  },
  {
    name: 'Alabama State Parks',
    state: 'AL',
    eventsUrl: 'https://www.alapark.com/events-activities',
    eventSelector: '[class*="event"], .event-item, .event-card, article, [class*="activity"]',
    titleSelector: 'h2, h3, .event-title, .title, .activity-title',
    dateSelector: '[class*="date"], .event-date, time, .when, .activity-date',
    locationSelector: '[class*="location"], [class*="venue"], [class*="park"], .activity-location',
    descriptionSelector: '[class*="description"], .event-description, .summary, .activity-description',
    county: 'Multi-County'
  }
];

const SCRAPER_NAME = 'StateParksEvents';

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const stateArg = args.find(arg => arg.startsWith('--state'));

  if (stateArg) {
    const state = stateArg.split('=')[1] || args[args.indexOf(stateArg) + 1];
    return state ? state.toUpperCase() : null;
  }

  return null;
}

/**
 * Scrape events from a single state parks website
 */
async function scrapeStateParks(config) {
  console.log(`\n🌲 Scraping ${config.name} (${config.state})`);
  console.log('-'.repeat(60));
  console.log(`URL: ${config.eventsUrl}\n`);

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
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('📅 Loading events page...');

    // Try primary URL, fallback to alternate if provided
    let url = config.eventsUrl;
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    } catch (err) {
      if (config.altUrl) {
        console.log('⚠️  Primary URL failed, trying alternate...');
        url = config.altUrl;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
      } else {
        throw err;
      }
    }

    // Wait for events to appear or timeout gracefully
    await page.waitForSelector(config.eventSelector, { timeout: 5000 }).catch(() => {
      console.log('⚠️  No events found with primary selector, trying alternatives');
    });

    // Extract event data via JavaScript
    const eventData = await page.evaluate((cfg) => {
      const events = [];

      // Try the configured selector, then fallback selectors
      let eventElements = document.querySelectorAll(cfg.eventSelector);

      if (eventElements.length === 0) {
        // Fallback to generic selectors
        eventElements = document.querySelectorAll('article, [class*="event"], [class*="card"]');
      }

      eventElements.forEach((el) => {
        try {
          // Extract fields based on config selectors
          const titleEl = el.querySelector(cfg.titleSelector);
          let title = titleEl?.innerText?.trim() || titleEl?.textContent?.trim() || el.getAttribute('data-title');

          const dateEl = el.querySelector(cfg.dateSelector);
          let dateStr = dateEl?.innerText?.trim() || dateEl?.textContent?.trim() || el.getAttribute('data-date');

          const locationEl = el.querySelector(cfg.locationSelector);
          let location = locationEl?.innerText?.trim() || locationEl?.textContent?.trim() || el.getAttribute('data-location');

          const descEl = el.querySelector(cfg.descriptionSelector);
          let description = descEl?.innerText?.trim() || descEl?.textContent?.trim() || el.getAttribute('data-description');

          // Extract URL
          let url = el.querySelector('a')?.href || el.getAttribute('href') || el.getAttribute('data-url');

          // Clean up data
          if (title && title.length > 3) {
            title = title.replace(/\s+/g, ' ').trim().substring(0, 200);

            // Limit field lengths
            dateStr = dateStr ? dateStr.substring(0, 100) : null;
            location = location ? location.substring(0, 200) : null;
            description = description ? description.substring(0, 1000) : null;

            // Only add events that have at least a title and date/location
            if (dateStr || location) {
              events.push({
                title,
                date: dateStr,
                location,
                description,
                url
              });
            }
          }
        } catch (e) {
          // Skip malformed elements
        }
      });

      return events;
    }, config);

    console.log(`  ✅ Found ${eventData.length} events\n`);

    // Transform event data
    for (const event of eventData) {
      if (!event.title) continue;

      const eventObj = {
        title: event.title,
        name: event.title,
        eventDate: event.date || '',
        description: event.description || '',
        url: event.url || url,
        venue: event.location || config.name,
        venueName: event.location || config.name,
        location: event.location || config.name,
        metadata: {
          sourceName: config.name,
          sourceUrl: url,
          scrapedAt: new Date().toISOString()
        }
      };

      // Extract age group from description or title
      const fullText = `${event.title} ${event.description || ''}`.toLowerCase();

      if (fullText.includes('toddler') || fullText.includes('baby') || fullText.match(/0[-–]?3/)) {
        eventObj.ageRange = 'Babies & Toddlers (0-2)';
      } else if (fullText.includes('preschool') || fullText.match(/3[-–]?5/)) {
        eventObj.ageRange = 'Preschool (3-5)';
      } else if (fullText.includes('child') && !fullText.includes('adult')) {
        eventObj.ageRange = 'Kids (6-8)';
      } else if (fullText.includes('tween') || fullText.match(/9[-–]?12/)) {
        eventObj.ageRange = 'Tweens (9-12)';
      } else if (fullText.includes('teen') || fullText.match(/13[-–]?18/)) {
        eventObj.ageRange = 'Teens (13-18)';
      } else if (fullText.includes('family')) {
        eventObj.ageRange = 'All Ages';
      } else {
        eventObj.ageRange = 'All Ages';
      }

      // Determine cost
      if (fullText.includes('free')) {
        eventObj.cost = 'Free';
      } else {
        eventObj.cost = 'See website';
      }

      events.push(eventObj);
    }

    // Save events
    if (events.length > 0) {
      const stateLibrary = {
        name: config.name,
        city: config.name,
        state: config.state,
        address: '',
        zipCode: '',
        url: url,
        county: config.county
      };

      const result = await saveEventsWithGeocoding(events, [stateLibrary], {
        scraperName: `${SCRAPER_NAME}-${config.state}`,
        state: config.state,
        category: 'parks',
        platform: 'state-parks'
      });

      console.log(`  📊 Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors\n`);
      return result;
    } else {
      console.log('⚠️  No events found\n');
      return { saved: 0, skipped: 0, errors: 0, deleted: 0 };
    }

  } catch (error) {
    console.error(`❌ Error scraping ${config.name}:`, error.message);
    return { saved: 0, skipped: 0, errors: 1, deleted: 0 };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Main scraper function
 */
async function scrapeStateParksEvents() {
  console.log('\n' + '='.repeat(60));
  console.log('🌲 STATE PARKS EVENTS SCRAPER (Multi-State)');
  console.log('='.repeat(60));

  const requestedState = parseArgs();
  const configsToScrape = requestedState
    ? PARKS_CONFIG.filter(cfg => cfg.state === requestedState)
    : PARKS_CONFIG;

  if (configsToScrape.length === 0) {
    console.error(`❌ No configuration found for state: ${requestedState}`);
    process.exit(1);
  }

  console.log(`\n📍 Scraping ${configsToScrape.length} state(s)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalDeleted = 0;

  // Scrape each configured state
  for (const config of configsToScrape) {
    const result = await scrapeStateParks(config);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
    totalDeleted += result.deleted;

    // Rate limiting between state scrapes
    if (config !== configsToScrape[configsToScrape.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL STATE PARKS SCRAPING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Saved: ${totalSaved}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Deleted: ${totalDeleted}`);
  console.log('='.repeat(60) + '\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors, deleted: totalDeleted };
}

/**
 * Cloud Function wrapper
 */
async function scrapeStateParksEventsCloudFunction(req, res) {
  try {
    const state = req.query?.state || req.body?.state;
    const result = await scrapeStateParksEvents();
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
  scrapeStateParksEvents()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeStateParksEvents, scrapeStateParksEventsCloudFunction, PARKS_CONFIG };
