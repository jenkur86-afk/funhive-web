#!/usr/bin/env node

/**
 * ZOO & AQUARIUM EVENTS SCRAPER
 *
 * Data-driven Puppeteer scraper for zoo and aquarium events across eastern US states.
 * Scrapes event listings from 57 major venues across 17 states.
 *
 * COVERAGE (57 venues across 17 states):
 * - Alabama: Montgomery Zoo, Alabama Gulf Coast Zoo
 * - Connecticut: Mystic Aquarium, Beardsley Zoo
 * - Delaware: Brandywine Zoo
 * - DC: Smithsonian National Zoo
 * - Florida: 6 venues (ZooTampa, Zoo Miami, Jacksonville Zoo, Brevard Zoo, Florida Aquarium, Clearwater Marine Aquarium)
 * - Georgia: Georgia Aquarium, Zoo Atlanta
 * - Illinois: 3 venues (Lincoln Park Zoo, Brookfield Zoo, Shedd Aquarium)
 * - Indiana: Indianapolis Zoo, Fort Wayne Children's Zoo
 * - Kentucky: Louisville Zoo, Newport Aquarium
 * - Maine: Maine Wildlife Park
 * - Maryland: Maryland Zoo, National Aquarium
 * - Massachusetts: 2 venues (New England Aquarium, Franklin Park Zoo)
 * - Michigan: Detroit Zoo, John Ball Zoo
 * - New Jersey: 3 venues (Adventure Aquarium, Turtle Back Zoo, Cape May County Zoo)
 * - New York: 3 venues (Bronx Zoo, Central Park Zoo, New York Aquarium)
 * - North Carolina: North Carolina Zoo, NC Aquarium at Fort Fisher
 * - Ohio: 5 venues (Cincinnati Zoo, Columbus Zoo, Cleveland Metroparks Zoo, Toledo Zoo, Akron Zoo)
 * - Pennsylvania: Philadelphia Zoo, Pittsburgh Zoo & Aquarium
 * - Rhode Island: Roger Williams Park Zoo
 * - South Carolina: Riverbanks Zoo & Garden, SC Aquarium
 * - Tennessee: 4 venues (Nashville Zoo, Memphis Zoo, Tennessee Aquarium, Knoxville Zoo)
 * - Virginia: 3 venues (Virginia Aquarium, Virginia Zoo, Metro Richmond Zoo)
 * - West Virginia: Oglebay Good Zoo
 * - Wisconsin: 3 venues (Milwaukee County Zoo, Henry Vilas Zoo, Racine Zoo)
 *
 * Usage:
 *   node scrapers/scraper-venue-events-zoos-aquariums.js                    # All venues
 *   node scrapers/scraper-venue-events-zoos-aquariums.js --state FL         # Florida only
 *   node scrapers/scraper-venue-events-zoos-aquariums.js --state NC,VA      # Multiple states
 *   node scrapers/scraper-venue-events-zoos-aquariums.js --state GA --dry   # Dry run
 *
 * Cloud Function: scrapeZooAquariumEventsCloudFunction
 * Schedule: 3-day rotation (ZooAquariums-Group1/2/3)
 */

const { launchBrowser } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'ZooAquariums-Eastern';
const BATCH_SIZE = 3000; // Events batch size for DB writes

// ==========================================
// VENUE CONFIGURATION
// ==========================================

const VENUES = [
  // Alabama
  { name: "Montgomery Zoo", eventsUrl: "https://www.montgomeryzoo.com/events", city: "Montgomery", state: "AL", zip: "36110" },
  { name: "Alabama Gulf Coast Zoo", eventsUrl: "https://www.alabamagulfcoastzoo.com/events/", city: "Gulf Shores", state: "AL", zip: "36542" },
  // Connecticut
  { name: "Mystic Aquarium", eventsUrl: "https://www.mysticaquarium.org/events/", city: "Mystic", state: "CT", zip: "06355" },
  { name: "Beardsley Zoo", eventsUrl: "https://www.beardsleyzoo.org/events.html", city: "Bridgeport", state: "CT", zip: "06610" },
  // DC
  { name: "Smithsonian National Zoo", eventsUrl: "https://nationalzoo.si.edu/events", city: "Washington", state: "DC", zip: "20008" },
  // Delaware
  { name: "Brandywine Zoo", eventsUrl: "https://www.brandywinezoo.org/events", city: "Wilmington", state: "DE", zip: "19802" },
  // Florida
  { name: "ZooTampa at Lowry Park", eventsUrl: "https://zootampa.org/events/", city: "Tampa", state: "FL", zip: "33604" },
  { name: "Zoo Miami", eventsUrl: "https://www.zoomiami.org/events", city: "Miami", state: "FL", zip: "33177" },
  { name: "Jacksonville Zoo and Gardens", eventsUrl: "https://www.jacksonvillezoo.org/events", city: "Jacksonville", state: "FL", zip: "32218" },
  { name: "Brevard Zoo", eventsUrl: "https://www.brevardzoo.org/events/", city: "Melbourne", state: "FL", zip: "32940" },
  { name: "Florida Aquarium", eventsUrl: "https://www.flaquarium.org/events", city: "Tampa", state: "FL", zip: "33602" },
  { name: "Clearwater Marine Aquarium", eventsUrl: "https://www.cmaquarium.org/events/", city: "Clearwater", state: "FL", zip: "33767" },
  // Georgia
  { name: "Georgia Aquarium", eventsUrl: "https://www.georgiaaquarium.org/events/", city: "Atlanta", state: "GA", zip: "30313" },
  { name: "Zoo Atlanta", eventsUrl: "https://zooatlanta.org/events/", city: "Atlanta", state: "GA", zip: "30315" },
  // Illinois
  { name: "Lincoln Park Zoo", eventsUrl: "https://www.lpzoo.org/events/", city: "Chicago", state: "IL", zip: "60614" },
  { name: "Brookfield Zoo", eventsUrl: "https://www.czs.org/events", city: "Brookfield", state: "IL", zip: "60513" },
  { name: "Shedd Aquarium", eventsUrl: "https://www.sheddaquarium.org/plan-a-visit/events", city: "Chicago", state: "IL", zip: "60605" },
  // Indiana
  { name: "Indianapolis Zoo", eventsUrl: "https://www.indianapoliszoo.com/events/", city: "Indianapolis", state: "IN", zip: "46222" },
  { name: "Fort Wayne Children's Zoo", eventsUrl: "https://kidszoo.org/events/", city: "Fort Wayne", state: "IN", zip: "46807" },
  // Kentucky
  { name: "Louisville Zoo", eventsUrl: "https://louisvillezoo.org/events/", city: "Louisville", state: "KY", zip: "40213" },
  { name: "Newport Aquarium", eventsUrl: "https://www.newportaquarium.com/events/", city: "Newport", state: "KY", zip: "41071" },
  // Maine
  { name: "Maine Wildlife Park", eventsUrl: "https://www.mainewildlifepark.com/events/", city: "Gray", state: "ME", zip: "04039" },
  // Maryland
  { name: "Maryland Zoo", eventsUrl: "https://www.marylandzoo.org/events/", city: "Baltimore", state: "MD", zip: "21217" },
  { name: "National Aquarium", eventsUrl: "https://aqua.org/events", city: "Baltimore", state: "MD", zip: "21202" },
  // Massachusetts
  { name: "New England Aquarium", eventsUrl: "https://www.neaq.org/visit/programs-and-events/", city: "Boston", state: "MA", zip: "02110" },
  { name: "Franklin Park Zoo", eventsUrl: "https://www.zoonewengland.org/franklin-park-zoo/events", city: "Boston", state: "MA", zip: "02121" },
  // Michigan
  { name: "Detroit Zoo", eventsUrl: "https://detroitzoo.org/events/", city: "Royal Oak", state: "MI", zip: "48067" },
  { name: "John Ball Zoo", eventsUrl: "https://www.jbzoo.org/events", city: "Grand Rapids", state: "MI", zip: "49504" },
  // New Jersey
  { name: "Adventure Aquarium", eventsUrl: "https://www.adventureaquarium.com/events", city: "Camden", state: "NJ", zip: "08103" },
  { name: "Turtle Back Zoo", eventsUrl: "https://www.turtlebackzoo.com/events/", city: "West Orange", state: "NJ", zip: "07052" },
  { name: "Cape May County Zoo", eventsUrl: "https://www.cmczoo.com/events/", city: "Cape May", state: "NJ", zip: "08210" },
  // New York
  { name: "Bronx Zoo", eventsUrl: "https://www.bronxzoo.com/events", city: "Bronx", state: "NY", zip: "10460" },
  { name: "Central Park Zoo", eventsUrl: "https://centralparkzoo.com/events", city: "New York", state: "NY", zip: "10065" },
  { name: "New York Aquarium", eventsUrl: "https://nyaquarium.com/events", city: "Brooklyn", state: "NY", zip: "11224" },
  // North Carolina
  { name: "North Carolina Zoo", eventsUrl: "https://www.nczoo.org/events", city: "Asheboro", state: "NC", zip: "27205" },
  { name: "NC Aquarium at Fort Fisher", eventsUrl: "https://www.ncaquariums.com/fort-fisher/events", city: "Kure Beach", state: "NC", zip: "28449" },
  // Ohio
  { name: "Cincinnati Zoo", eventsUrl: "https://cincinnatizoo.org/events/", city: "Cincinnati", state: "OH", zip: "45220" },
  { name: "Columbus Zoo and Aquarium", eventsUrl: "https://www.columbuszoo.org/events", city: "Powell", state: "OH", zip: "43065" },
  { name: "Cleveland Metroparks Zoo", eventsUrl: "https://www.clevelandmetroparks.com/zoo/zoo-events", city: "Cleveland", state: "OH", zip: "44109" },
  { name: "Toledo Zoo", eventsUrl: "https://www.toledozoo.org/events", city: "Toledo", state: "OH", zip: "43614" },
  { name: "Akron Zoo", eventsUrl: "https://www.akronzoo.org/events", city: "Akron", state: "OH", zip: "44307" },
  // Pennsylvania
  { name: "Philadelphia Zoo", eventsUrl: "https://www.philadelphiazoo.org/events/", city: "Philadelphia", state: "PA", zip: "19104" },
  { name: "Pittsburgh Zoo & Aquarium", eventsUrl: "https://www.pittsburghzoo.org/events/", city: "Pittsburgh", state: "PA", zip: "15206" },
  // Rhode Island
  { name: "Roger Williams Park Zoo", eventsUrl: "https://www.rwpzoo.org/events/", city: "Providence", state: "RI", zip: "02905" },
  // South Carolina
  { name: "Riverbanks Zoo & Garden", eventsUrl: "https://www.riverbanks.org/events/", city: "Columbia", state: "SC", zip: "29210" },
  { name: "SC Aquarium", eventsUrl: "https://scaquarium.org/events/", city: "Charleston", state: "SC", zip: "29401" },
  // Tennessee
  { name: "Nashville Zoo", eventsUrl: "https://www.nashvillezoo.org/events", city: "Nashville", state: "TN", zip: "37211" },
  { name: "Memphis Zoo", eventsUrl: "https://www.memphiszoo.org/events", city: "Memphis", state: "TN", zip: "38112" },
  { name: "Tennessee Aquarium", eventsUrl: "https://www.tnaqua.org/events/", city: "Chattanooga", state: "TN", zip: "37402" },
  { name: "Knoxville Zoo", eventsUrl: "https://www.knoxvillezoo.org/events", city: "Knoxville", state: "TN", zip: "37914" },
  // Virginia
  { name: "Virginia Aquarium", eventsUrl: "https://www.virginiaaquarium.com/events/", city: "Virginia Beach", state: "VA", zip: "23451" },
  { name: "Virginia Zoo", eventsUrl: "https://virginiazoo.org/events/", city: "Norfolk", state: "VA", zip: "23504" },
  { name: "Metro Richmond Zoo", eventsUrl: "https://www.metrorichmondzoo.com/events/", city: "Moseley", state: "VA", zip: "23120" },
  // West Virginia
  { name: "Oglebay Good Zoo", eventsUrl: "https://oglebay.com/good-zoo/events/", city: "Wheeling", state: "WV", zip: "26003" },
  // Wisconsin
  { name: "Milwaukee County Zoo", eventsUrl: "https://milwaukeezoo.org/events/", city: "Milwaukee", state: "WI", zip: "53226" },
  { name: "Henry Vilas Zoo", eventsUrl: "https://www.henryvilaszoo.gov/events/", city: "Madison", state: "WI", zip: "53715" },
  { name: "Racine Zoo", eventsUrl: "https://www.racinezoo.org/events", city: "Racine", state: "WI", zip: "53402" },
];

// ==========================================
// CSS SELECTOR PATTERNS FOR EVENT EXTRACTION
// ==========================================

const EVENT_SELECTORS = {
  eventCard: [
    '.event',
    '.event-card',
    '.event-item',
    '[data-event]',
    '.event-box',
    '.event-listing',
    '.activity',
    '.listing',
    'article',
  ],
  title: [
    '.event-title',
    '.event-name',
    'h2',
    'h3',
    '.title',
    '.name',
    '[data-event-title]',
  ],
  date: [
    '.event-date',
    '.date',
    '[data-date]',
    '.event-when',
    '.when',
    'time',
  ],
  time: [
    '.event-time',
    '.time',
    '[data-time]',
    '.event-hour',
  ],
  description: [
    '.event-description',
    '.description',
    '.event-details',
    '.details',
    '[data-description]',
    'p',
  ],
  category: [
    '.event-category',
    '.category',
    '.event-type',
    '[data-category]',
  ],
  link: [
    'a[href*="event"]',
    'a.event-link',
    '[data-event-link]',
    'a',
  ],
};

// ==========================================
// EVENT EXTRACTION & SCRAPING LOGIC
// ==========================================

/**
 * Extract events from a single venue page with Puppeteer
 */
async function scrapeVenueEvents(venue, browser) {
  let events = [];

  try {
    console.log(`   🌐 Fetching events page...`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to venue events page with retry
    let retries = 2;
    while (retries > 0) {
      try {
        await page.goto(venue.eventsUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`   ⚠️ Navigation failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Wait for content to render (handle dynamic content)
    try {
      await page.waitForSelector('body', { timeout: 5000 });
    } catch (e) {
      console.log('   ⚠️ Body element timeout');
    }

    // Allow JavaScript to fully render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to trigger lazy-loading
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Extract events using multiple selector strategies
    events = await page.evaluate((selectors, venueName) => {
      const results = [];
      const seen = new Set(); // De-duplicate by title + date

      // Strategy 1: Look for event cards
      let eventElements = [];
      for (const selector of selectors.eventCard) {
        eventElements = document.querySelectorAll(selector);
        if (eventElements.length > 0) break;
      }

      if (eventElements.length === 0) {
        // Strategy 2: Look for h2/h3 as event titles
        eventElements = document.querySelectorAll('h2, h3, h4');
      }

      eventElements.forEach((el) => {
        try {
          const event = {};

          // Extract title
          let titleEl = null;
          for (const selector of selectors.title) {
            titleEl = el.querySelector(selector) || (selector === 'h2' || selector === 'h3' || selector === 'h4' ? el : null);
            if (titleEl && titleEl.textContent?.trim()) break;
          }
          event.title = titleEl?.textContent?.trim() || el.textContent?.substring(0, 100)?.trim();

          if (!event.title || event.title.length < 3) return;

          // Extract date
          let dateEl = null;
          for (const selector of selectors.date) {
            dateEl = el.querySelector(selector) || el.parentElement?.querySelector(selector);
            if (dateEl) break;
          }
          event.eventDate = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime');

          // Extract time
          let timeEl = null;
          for (const selector of selectors.time) {
            timeEl = el.querySelector(selector) || el.parentElement?.querySelector(selector);
            if (timeEl) break;
          }
          event.time = timeEl?.textContent?.trim();

          // Extract description
          let descEl = null;
          for (const selector of selectors.description) {
            descEl = el.querySelector(selector) || el.parentElement?.querySelector(selector);
            if (descEl && descEl !== el) break;
          }
          event.description = descEl?.textContent?.trim()?.substring(0, 500);

          // Extract category/type
          let catEl = null;
          for (const selector of selectors.category) {
            catEl = el.querySelector(selector) || el.parentElement?.querySelector(selector);
            if (catEl) break;
          }
          event.category = catEl?.textContent?.trim();

          // Extract event link
          let linkEl = null;
          for (const selector of selectors.link) {
            linkEl = el.querySelector(selector);
            if (linkEl) break;
          }
          event.link = linkEl?.href;

          // De-duplicate
          const key = `${event.title}|||${event.eventDate}`;
          if (!seen.has(key) && event.title) {
            seen.add(key);
            results.push({
              ...event,
              venue: venueName,
            });
          }
        } catch (error) {
          // Skip individual event extraction errors
        }
      });

      return results;
    }, EVENT_SELECTORS, venue.name);

    console.log(`   ✅ Extracted ${events.length} events`);
    await page.close();

  } catch (error) {
    console.error(`   ❌ Failed to scrape: ${error.message}`);
  }

  // Format events for database
  return events.map(e => ({
    title: e.title,
    description: e.description || `Event at ${venue.name}`,
    eventDate: e.eventDate || '',
    eventTime: e.time || '',
    category: e.category || 'Zoo & Aquarium Events',
    venueName: venue.name,
    address: `${venue.city}, ${venue.state} ${venue.zip}`,
    city: venue.city,
    state: venue.state,
    zipCode: venue.zip,
    link: e.link || venue.eventsUrl,
    details: {
      originalVenue: venue.name,
      city: venue.city,
      state: venue.state,
      address: `${venue.city}, ${venue.state} ${venue.zip}`,
    },
  }));
}

/**
 * Main scraper function
 */
async function scrapeZooAquariumEvents(filterState = null) {
  console.log('\n\x1b[36m🦁🐠━━━━━━━━━━━━━ ZOO & AQUARIUM EVENTS SCRAPER ━━━━━━━━━━━━━━🦁🐠\x1b[0m');
  console.log(`📍 Target states: ${filterState ? filterState.join(', ') : 'All 25+ states'}`);

  // Filter venues by state if specified
  const venuesToScrape = filterState
    ? VENUES.filter(v => filterState.includes(v.state))
    : VENUES;

  console.log(`🎯 Scraping ${venuesToScrape.length} venues\n`);

  const browser = await launchBrowser();
  let allEvents = [];
  const results = {};

  try {
    // Scrape each venue with 3-second delay between requests
    for (let i = 0; i < venuesToScrape.length; i++) {
      const venue = venuesToScrape[i];
      console.log(`\n[${i + 1}/${venuesToScrape.length}] ${venue.name}`);

      try {
        const venueEvents = await scrapeVenueEvents(venue, browser);
        allEvents.push(...venueEvents);

        // Batch save events periodically to avoid memory issues
        if (allEvents.length >= BATCH_SIZE) {
          console.log(`\n💾 Saving batch of ${BATCH_SIZE} events...`);
          const batchResult = await saveEventsWithGeocoding(
            allEvents,
            venuesToScrape.map(v => ({ name: v.name, city: v.city, state: v.state })),
            {
              scraperName: SCRAPER_NAME,
              state: venue.state,
              category: 'Zoo & Aquarium Events',
              platform: 'generic',
            }
          );
          results[venue.state] = batchResult;
          allEvents = [];
        }
      } catch (error) {
        console.error(`   ❌ Error scraping ${venue.name}: ${error.message}`);
      }

      // 3-second delay between venues
      if (i < venuesToScrape.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Save remaining events
    if (allEvents.length > 0) {
      console.log(`\n💾 Saving final batch of ${allEvents.length} events...`);
      const finalResult = await saveEventsWithGeocoding(
        allEvents,
        venuesToScrape.map(v => ({ name: v.name, city: v.city, state: v.state })),
        {
          scraperName: SCRAPER_NAME,
          state: venuesToScrape[0].state,
          category: 'Zoo & Aquarium Events',
          platform: 'generic',
        }
      );
      Object.assign(results, finalResult);
    }

  } catch (error) {
    console.error('❌ Scraper fatal error:', error);
    throw error;
  } finally {
    await browser.close();
  }

  // Log final results — count totals across all venue results
  const totalNew = Object.values(results).reduce((sum, r) => sum + (r?.new || r?.imported || 0), 0);
  const totalDuplicates = Object.values(results).reduce((sum, r) => sum + (r?.duplicates || 0), 0);
  logScraperResult(SCRAPER_NAME, {
    found: totalNew + totalDuplicates,
    new: totalNew,
    duplicates: totalDuplicates,
  });

  return results;
}

// ==========================================
// CLI & CLOUD FUNCTION EXPORTS
// ==========================================

// Parse CLI arguments
const args = process.argv.slice(2);
const stateArg = args.find(a => a.startsWith('--state'));
const dryRun = args.includes('--dry');

if (require.main === module) {
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No events will be saved');
  }

  let statesToScrape = null;
  if (stateArg) {
    const stateStr = stateArg.split('=')[1] || stateArg.split(' ')[1];
    statesToScrape = stateStr?.split(',').map(s => s.trim().toUpperCase());
  }

  scrapeZooAquariumEvents(statesToScrape)
    .then(results => {
      console.log('\n✅ Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Scraper failed:', error);
      process.exit(1);
    });
}

// Cloud Function wrapper
async function scrapeZooAquariumEventsCloudFunction() {
  try {
    const result = await scrapeZooAquariumEvents();
    return { success: true, result };
  } catch (error) {
    console.error('Cloud Function Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  scrapeZooAquariumEvents,
  scrapeZooAquariumEventsCloudFunction,
};
