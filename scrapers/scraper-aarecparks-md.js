#!/usr/bin/env node

/**
 * ANNE ARUNDEL COUNTY RECREATION & PARKS SCRAPER (Maryland)
 *
 * Scrapes activities/programs from Anne Arundel County Rec & Parks
 * Platform: ActiveNet/ActiveCommunities (React SPA)
 * Coverage: Anne Arundel County, Maryland
 *
 * Data Source: https://anc.apm.activecommunities.com/aarecparks/
 * Estimated Events: 100-300+ activities
 *
 * Usage:
 *   node scraper-aarecparks-md.js          # Test mode (first 50)
 *   node scraper-aarecparks-md.js --full   # Full mode (all activities)
 *
 * Cloud Function: scheduledAARecParksMD
 * Schedule: Every 3 days
 */

const puppeteer = require('puppeteer-core');
// chromium loaded lazily in launchBrowser() — not available locally
const ngeohash = require('ngeohash');
const { admin, db } = require('./helpers/supabase-adapter');
const { categorizeEvent } = require('./event-categorization-helper');
const { normalizeDateString } = require('./date-normalization-helper');
const { generateEventId } = require('./event-id-helper');

const SCRAPER_NAME = 'AARecParks-MD';
const BASE_URL = 'https://anc.apm.activecommunities.com/aarecparks';
const SEARCH_URL = `${BASE_URL}/activity/search?onlineSiteId=0&locale=en-US&activity_select_param=2&viewMode=list`;

// Anne Arundel County center coordinates
const AA_COUNTY_CENTER = {
  latitude: 38.9897,
  longitude: -76.5634,
};

// Activity category mapping
const CATEGORY_MAP = {
  'Aquatics': { parent: 'Sports & Recreation', sub: 'Swimming' },
  'Arts & Entertainment': { parent: 'Arts & Culture', sub: 'Arts & Crafts' },
  'Camps': { parent: 'Camps & Classes', sub: 'Day Camp' },
  'Dance': { parent: 'Arts & Culture', sub: 'Dance' },
  'Fitness': { parent: 'Sports & Recreation', sub: 'Fitness' },
  'General Interest': { parent: 'Camps & Classes', sub: 'Classes' },
  'Martial Arts': { parent: 'Sports & Recreation', sub: 'Martial Arts' },
  'Nature & Outdoors': { parent: 'Nature & Outdoors', sub: 'Nature Programs' },
  'Special Events': { parent: 'Special Events', sub: 'Community Events' },
  'Sports': { parent: 'Sports & Recreation', sub: 'Sports' },
  'Teens': { parent: 'Teen Events', sub: 'Teen Programs' },
  'Trips': { parent: 'Field Trips', sub: 'Day Trips' },
};

/**
 * Launch Puppeteer browser
 */
async function launchBrowser() {
  const isCloud = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

  if (isCloud) {
    try {
      const chromium = require('@sparticuz/chromium');
      return await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } catch (e) {
      console.warn('Cloud chromium not available, falling back to local');
    }
  }

  // Local development fallback
  return await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

/**
 * Parse age range from activity
 */
function parseAgeRange(ageText) {
  if (!ageText) return 'All Ages';

  const lower = ageText.toLowerCase();
  if (lower.includes('adult')) return 'Adults';
  if (lower.includes('senior')) return 'Seniors';
  if (lower.includes('youth') || lower.includes('teen')) return 'Teens';
  if (lower.includes('family')) return 'All Ages';
  if (lower.includes('child') || lower.includes('kid')) return 'Children';

  // Try to extract age numbers
  const ageMatch = ageText.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (ageMatch) {
    const minAge = parseInt(ageMatch[1]);
    const maxAge = parseInt(ageMatch[2]);
    if (minAge <= 3) return 'Toddlers (1-3)';
    if (minAge <= 5) return 'Preschool (3-5)';
    if (maxAge <= 12) return 'Elementary (6-12)';
    if (maxAge <= 18) return 'Teens';
    return `${minAge}-${maxAge} years`;
  }

  return ageText.substring(0, 30);
}

/**
 * Parse date from activity listing
 */
function parseDateRange(dateText) {
  if (!dateText) return { start: new Date(), end: null };

  // Try to find date patterns like "Dec 1 - Dec 31" or "12/1/2025"
  const dateMatch = dateText.match(/(\w+\s+\d+)[,\s]*(\d{4})?/);
  if (dateMatch) {
    const dateStr = dateMatch[1] + (dateMatch[2] ? `, ${dateMatch[2]}` : ', 2025');
    return { start: new Date(dateStr), end: null };
  }

  return { start: new Date(), end: null };
}

/**
 * Geocode location name
 */
async function geocodeLocation(locationName) {
  if (!locationName) return AA_COUNTY_CENTER;

  const axios = require('axios');
const { logScraperResult } = require('./scraper-logger');
const { linkEventToVenue } = require('./venue-matcher');
  const query = `${locationName}, Anne Arundel County, MD`;

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
      headers: { 'User-Agent': 'FunHive/1.0' },
      timeout: 10000,
    });

    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
      };
    }
  } catch (error) {}

  return AA_COUNTY_CENTER;
}

/**
 * Scrape activities from the page
 */
async function scrapeActivities(browser, maxActivities = 100) {
  console.log(`\n📄 Opening activities page...`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(SEARCH_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for activities to load
    await page.waitForSelector('.activity-list-item, .search-result-item, [class*="activity"], [class*="result"]', { timeout: 30000 });

    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract activities from the page
    const activities = await page.evaluate(() => {
      const items = [];

      // Try various selectors for activity cards
      const selectors = [
        '.activity-list-item',
        '.search-result-item',
        '[class*="ActivityCard"]',
        '[class*="activity-card"]',
        '.activity-search-result',
        'div[role="listitem"]',
      ];

      let elements = [];
      for (const selector of selectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) break;
      }

      elements.forEach(el => {
        // Get title
        const titleEl = el.querySelector('h3, h4, [class*="title"], [class*="name"], a[class*="activity"]');
        const title = titleEl ? titleEl.textContent.trim() : '';

        // Get link
        const linkEl = el.querySelector('a[href*="activity"]');
        const link = linkEl ? linkEl.href : '';

        // Get date/time
        const dateEl = el.querySelector('[class*="date"], [class*="time"], [class*="schedule"]');
        const dateText = dateEl ? dateEl.textContent.trim() : '';

        // Get location
        const locEl = el.querySelector('[class*="location"], [class*="site"], [class*="facility"]');
        const location = locEl ? locEl.textContent.trim() : '';

        // Get price
        const priceEl = el.querySelector('[class*="price"], [class*="fee"], [class*="cost"]');
        const price = priceEl ? priceEl.textContent.trim() : '';

        // Get age range
        const ageEl = el.querySelector('[class*="age"], [class*="category"]');
        const age = ageEl ? ageEl.textContent.trim() : '';

        // Get description
        const descEl = el.querySelector('[class*="description"], p');
        const description = descEl ? descEl.textContent.trim() : '';

        if (title) {
          items.push({
            title,
            link,
            dateText,
            location,
            price,
            age,
            description,
          });
        }
      });

      return items;
    });

    console.log(`  Found ${activities.length} activities on page`);

    // If no activities found with selectors, try getting all text content
    if (activities.length === 0) {
      console.log('  Trying alternative extraction...');

      const pageContent = await page.content();
      console.log(`  Page content length: ${pageContent.length}`);

      // Take a screenshot for debugging
      // await page.screenshot({ path: 'aarecparks-debug.png' });
    }

    await page.close();
    return activities.slice(0, maxActivities);

  } catch (error) {
    console.log(`  ⚠️ Error scraping: ${error.message}`);
    await page.close();
    return [];
  }
}

/**
 * Save activities to database
 */
async function saveActivities(activities) {
  if (activities.length === 0) return { saved: 0, failed: 0 };

  const batch = db.batch();
  let saved = 0, failed = 0;

  for (const activity of activities) {
    try {
      const eventId = generateEventId(activity.url || `${BASE_URL}/${activity.name}`);
      const docRef = db.collection('events').doc(eventId);
      batch.set(docRef, activity, { merge: true });
      saved++;
    } catch (error) {
      failed++;
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Batch commit error:', error.message);
    failed = activities.length;
    saved = 0;
  }

  return { saved, failed };
}

/**
 * Main scraper function
 */
async function scrapeAARecParks(options = {}) {
  const { maxActivities = 100, testMode = false } = options;

  console.log(`\n🏊 ANNE ARUNDEL RECREATION & PARKS SCRAPER`);
  console.log(`📍 Coverage: Anne Arundel County, Maryland`);
  console.log(`📄 Max activities: ${maxActivities}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  let browser;

  try {
    browser = await launchBrowser();
    console.log('✅ Browser launched');

    const rawActivities = await scrapeActivities(browser, maxActivities);

    // Process activities
    const processedActivities = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const raw of rawActivities) {
      const { start } = parseDateRange(raw.dateText);
      if (start < today) continue;

      const coords = await geocodeLocation(raw.location);

      // Get category
      let parentCategory = 'Camps & Classes';
      let displayCategory = 'Camps & Classes';
      let subcategory = 'Recreation Programs';

      // Categorize based on title
      const categorized = categorizeEvent({
        name: raw.title,
        description: raw.description,
      });

      // Normalize date format
      const rawDate = start.toISOString();
      const normalizedDate = normalizeDateString(rawDate);
      if (!normalizedDate) {
        console.log(`  Skipping activity with invalid date: "${rawDate}"`);
        continue;
      }

      const activity = {
        name: raw.title,
        eventDate: normalizedDate,
        startTime: null,  // Source page has no time info
        endTime: null,
        description: raw.description || '',
        venue: raw.location || 'Anne Arundel County Recreation',
        address: '',
        city: 'Annapolis',
        state: 'MD',
        zipCode: '',
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        geohash: ngeohash.encode(coords.latitude, coords.longitude, 7),
        ageRange: parseAgeRange(raw.age),
        cost: raw.price || 'See website',
        parentCategory: categorized.parentCategory || parentCategory,
        displayCategory: categorized.displayCategory || displayCategory,
        subcategory: categorized.subcategory || subcategory,
        url: raw.link || SEARCH_URL,
        imageUrl: '',
        metadata: {
          sourceName: 'Anne Arundel Recreation & Parks',
          sourceUrl: BASE_URL,
          scrapedAt: new Date().toISOString(),
          scraperName: SCRAPER_NAME,
          platform: 'activenet',
          state: 'MD',
          county: 'Anne Arundel',
          addedDate: new Date().toISOString(),
        },
      };

      processedActivities.push(activity);

      // Rate limiting for geocoding
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 SAVING TO FIRESTORE`);
    console.log('-'.repeat(40));

    const { saved, failed } = await saveActivities(processedActivities);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ SCRAPER COMPLETE`);
    console.log(`   Activities found: ${rawActivities.length}`);
    console.log(`   Activities processed: ${processedActivities.length}`);
    console.log(`   Activities saved: ${saved}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Duration: ${duration}s`);
    console.log(`${'='.repeat(60)}\n`);

    // Log to scraperLogs collection
    try {
      await db.collection('scraperLogs').add({
        scraperName: SCRAPER_NAME,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        eventsImported: saved,
        eventsFailed: failed,
        eventsFound: rawActivities.length,
        duration: parseFloat(duration),
        status: failed === 0 ? 'success' : 'partial',
      });
    } catch (error) {
      console.error('Failed to log scraper run:', error.message);
    }

    return { imported: saved, failed, total: processedActivities.length };

  } catch (error) {
    console.error('Scraper error:', error.message);
    return { imported: 0, failed: 0, total: 0, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

/**
 * Cloud Function export
 */
async function scrapeAARecParksCloudFunction() {
  console.log('☁️ Running as Cloud Function');
  return await scrapeAARecParks({ maxActivities: 200, testMode: false });
}

// Run if executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const fullMode = args.includes('--full');
  const maxActivities = fullMode ? 200 : 50;

  console.log(`\n🚀 Starting AA Rec & Parks Scraper (${fullMode ? 'Full' : 'Test'} Mode)`);

  scrapeAARecParks({ maxActivities, testMode: !fullMode })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeAARecParks,
  scrapeAARecParksCloudFunction,
};
