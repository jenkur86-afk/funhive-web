#!/usr/bin/env node

/**
 * CIVICREC PARKS & RECREATION SCRAPER (Eastern US)
 *
 * Scrapes family activities/programs from city and county parks & recreation
 * departments that use the CivicRec (CivicPlus Recreation Management) platform.
 *
 * Platform: CivicRec / Rec1 (secure.rec1.com/{org}/catalog or {city}.civicRec.com)
 * These are JS-heavy portals — Puppeteer is required to render content.
 *
 * COVERAGE: ~25 parks & rec departments across 15+ eastern US states
 *
 * Usage:
 *   node scrapers/scraper-civicrec-parks-eastern.js                    # All departments
 *   node scrapers/scraper-civicrec-parks-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-civicrec-parks-eastern.js --state VA,NC,SC   # Multiple states
 *   node scrapers/scraper-civicrec-parks-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeCivicRecParksCloudFunction
 * Registry: Group 3
 */

const { launchBrowser, createStealthPage } = require('./helpers/puppeteer-config');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'CivicRec-Parks-Eastern';

// ──────────────────────────────────────────────────────────────────────
// Department configurations
// CivicRec portals use various URL patterns:
//   - https://secure.rec1.com/{org}/catalog
//   - https://{city}.civicRec.com/NC/activities
//   - https://webtrac.{city}.gov/ (some CivicPlus integrations)
// ──────────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  // Alabama
  { slug: 'huntsville-al', urlBase: 'https://secure.rec1.com/AL/huntsville-al/catalog', city: 'Huntsville', state: 'AL', name: 'Huntsville Parks & Recreation', county: 'Madison' },
  { slug: 'athens-al', urlBase: 'https://secure.rec1.com/AL/athens-al/catalog', city: 'Athens', state: 'AL', name: 'Athens Parks & Recreation', county: 'Limestone' },

  // Connecticut
  { slug: 'coventry-ct', urlBase: 'https://secure.rec1.com/CT/coventry-ct/catalog', city: 'Coventry', state: 'CT', name: 'Coventry Parks & Recreation', county: 'Tolland' },

  // Florida
  { slug: 'city-tallahassee-fl', urlBase: 'https://secure.rec1.com/FL/city-tallahassee-fl/catalog', city: 'Tallahassee', state: 'FL', name: 'City of Tallahassee Parks & Recreation', county: 'Leon' },
  { slug: 'sanford-fl', urlBase: 'https://secure.rec1.com/FL/sanford-fl/catalog', city: 'Sanford', state: 'FL', name: 'Sanford Parks & Recreation', county: 'Seminole' },
  { slug: 'pembroke-pines-fl', urlBase: 'https://secure.rec1.com/FL/pembroke-pines-fl/catalog', city: 'Pembroke Pines', state: 'FL', name: 'Pembroke Pines Parks & Recreation', county: 'Broward' },

  // Georgia
  { slug: 'gwinnett-county-parks-recreation', urlBase: 'https://secure.rec1.com/GA/gwinnett-county-parks-recreation/catalog', city: 'Lawrenceville', state: 'GA', name: 'Gwinnett County Parks & Recreation', county: 'Gwinnett' },
  { slug: 'savannah-ga', urlBase: 'https://secure.rec1.com/GA/savannah-ga/catalog', city: 'Savannah', state: 'GA', name: 'City of Savannah Recreation', county: 'Chatham' },
  { slug: 'forsyth-county-ga', urlBase: 'https://secure.rec1.com/GA/forsyth-county-ga/catalog', city: 'Cumming', state: 'GA', name: 'Forsyth County Parks & Recreation', county: 'Forsyth' },

  // Indiana
  { slug: 'fishers-in', urlBase: 'https://secure.rec1.com/IN/fishers-in/catalog', city: 'Fishers', state: 'IN', name: 'Fishers Parks & Recreation', county: 'Hamilton' },
  { slug: 'city-of-noblesville-in', urlBase: 'https://secure.rec1.com/IN/city-of-noblesville-in/catalog', city: 'Noblesville', state: 'IN', name: 'Noblesville Parks & Recreation', county: 'Hamilton' },

  // Maryland
  { slug: 'baltimore-md', urlBase: 'https://secure.rec1.com/MD/baltimore-md/catalog', city: 'Baltimore', state: 'MD', name: 'Baltimore Recreation & Parks', county: 'Baltimore City' },
  { slug: 'annapolis-md', urlBase: 'https://secure.rec1.com/MD/annapolis-md/catalog', city: 'Annapolis', state: 'MD', name: 'Annapolis Recreation & Parks', county: 'Anne Arundel' },

  // Massachusetts
  { slug: 'melrose-ma', urlBase: 'https://secure.rec1.com/MA/melrose-ma/catalog', city: 'Melrose', state: 'MA', name: 'Melrose Recreation', county: 'Middlesex' },
  { slug: 'north-andover-ma', urlBase: 'https://secure.rec1.com/MA/north-andover-ma/catalog', city: 'North Andover', state: 'MA', name: 'North Andover Youth & Recreation', county: 'Essex' },

  // North Carolina
  { slug: 'harrisburg-nc', urlBase: 'https://secure.rec1.com/NC/harrisburg-nc/catalog', city: 'Harrisburg', state: 'NC', name: 'Harrisburg Parks & Recreation', county: 'Cabarrus' },
  { slug: 'burlington-nc', urlBase: 'https://secure.rec1.com/NC/burlington-nc/catalog', city: 'Burlington', state: 'NC', name: 'Burlington Recreation & Parks', county: 'Alamance' },
  { slug: 'cabarrus-county', urlBase: 'https://secure.rec1.com/NC/cabarrus-county/catalog', city: 'Concord', state: 'NC', name: 'Cabarrus County Active Living & Parks', county: 'Cabarrus' },

  // Ohio
  { slug: 'cleveland-oh', urlBase: 'https://secure.rec1.com/OH/cleveland-oh/catalog', city: 'Cleveland', state: 'OH', name: 'Cleveland Metroparks', county: 'Cuyahoga' },
  { slug: 'mentor-oh', urlBase: 'https://secure.rec1.com/OH/mentor-oh/catalog', city: 'Mentor', state: 'OH', name: 'Mentor Parks & Recreation', county: 'Lake' },

  // Pennsylvania
  { slug: 'bucks-county-pa-parks-recreation', urlBase: 'https://secure.rec1.com/PA/bucks-county-pa-parks-recreation/catalog', city: 'Doylestown', state: 'PA', name: 'Bucks County Parks & Recreation', county: 'Bucks' },
  { slug: 'ross-township', urlBase: 'https://secure.rec1.com/PA/ross-township/catalog', city: 'Pittsburgh', state: 'PA', name: 'Ross Township Recreation', county: 'Allegheny' },

  // South Carolina
  { slug: 'greenville-sc', urlBase: 'https://secure.rec1.com/SC/greenville-sc/catalog', city: 'Greenville', state: 'SC', name: 'Greenville County Recreation', county: 'Greenville' },
  { slug: 'fort-mill-sc', urlBase: 'https://secure.rec1.com/SC/fort-mill-sc/catalog', city: 'Fort Mill', state: 'SC', name: 'Fort Mill Parks & Recreation', county: 'York' },

  // Tennessee
  { slug: 'clarksville-tn', urlBase: 'https://secure.rec1.com/TN/clarksville-tn/catalog', city: 'Clarksville', state: 'TN', name: 'Clarksville Parks & Recreation', county: 'Montgomery' },
  { slug: 'knox-county-parks-and-recreation', urlBase: 'https://secure.rec1.com/TN/knox-county-parks-and-recreation/catalog', city: 'Knoxville', state: 'TN', name: 'Knox County Parks & Recreation', county: 'Knox' },

  // Virginia
  { slug: 'fredericksburg-va', urlBase: 'https://secure.rec1.com/VA/fredericksburg-va/catalog', city: 'Fredericksburg', state: 'VA', name: 'Fredericksburg Parks & Recreation', county: 'Fredericksburg City' },
  { slug: 'newport-news-va', urlBase: 'https://secure.rec1.com/VA/newport-news-va/catalog', city: 'Newport News', state: 'VA', name: 'Newport News Parks & Recreation', county: 'Newport News City' },

  // Wisconsin
  { slug: 'monona-wi', urlBase: 'https://secure.rec1.com/WI/monona-wi/catalog', city: 'Monona', state: 'WI', name: 'Monona Parks & Recreation', county: 'Dane' },
  { slug: 'hartland-wi', urlBase: 'https://secure.rec1.com/WI/hartland-wi/catalog', city: 'Hartland', state: 'WI', name: 'Hartland Parks & Recreation', county: 'Waukesha' },
];

// ──────────────────────────────────────────────────────────────────────
// Adult-only event filtering
// ──────────────────────────────────────────────────────────────────────

const ADULT_ONLY_PATTERNS = [
  /\b(40\+|50\+|55\+|60\+|65\+)\b/,
  /\bsenior(s)?\b/i,
  /\badult\s+(league|sports?|fitness|basketball|volleyball|softball|soccer|flag football|open gym|drop.?in|swim|pickleball)\b/i,
  /\bbeer\b/i, /\bwine tasting\b/i, /\bbrewery\b/i, /\bbar\s*crawl\b/i,
  /\bpickleball\b.*\b(league|tournament|open play)\b/i,
  /\bmen'?s\s+(basketball|softball|volleyball|soccer|league)\b/i,
  /\bwomen'?s\s+(basketball|softball|volleyball|soccer|league)\b/i,
  /\bco-?ed\s+(volleyball|softball|basketball|soccer|league)\b/i,
  /\badult\s+only\b/i,
  /\b21\+\b/,
  /\bsenior\s+(fitness|exercise|yoga|tai chi|water aerobics)\b/i,
  /\bretired\b/i,
  /\b(zumba|pilates|boot\s*camp|spin class|crossfit)\b/i,
  /\badult\s+(art|pottery|ceramics|painting|drawing)\b/i,
];

function isAdultOnly(title, description) {
  const text = `${title || ''} ${description || ''}`;
  for (const pattern of ADULT_ONLY_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────
// Age range detection
// ──────────────────────────────────────────────────────────────────────

function detectAgeRange(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  if (text.match(/\btoddler|baby|babies|infant/)) return 'Babies & Toddlers (0-2)';
  if (text.match(/\bpreschool|pre-?k|prek\b/)) return 'Preschool (3-5)';
  if (text.match(/\btween/)) return 'Tweens (9-12)';
  if (text.match(/\bteen\b/) && !text.match(/\bvolunteer/)) return 'Teens (13-18)';
  if (text.match(/\byouth|kid|child|children|elementary/)) return 'Kids (6-8)';
  if (text.match(/\bfamily|families|all\s*ages/)) return 'All Ages';

  // Try numeric ranges
  const ageMatch = text.match(/(\d{1,2})\s*[-–to]+\s*(\d{1,2})\s*(y|yr|year|mo)?/);
  if (ageMatch) {
    const minAge = parseInt(ageMatch[1]);
    const maxAge = parseInt(ageMatch[2]);
    if (maxAge <= 2) return 'Babies & Toddlers (0-2)';
    if (maxAge <= 5) return 'Preschool (3-5)';
    if (maxAge <= 8) return 'Kids (6-8)';
    if (maxAge <= 12) return 'Tweens (9-12)';
    if (maxAge <= 18) return 'Teens (13-18)';
  }

  return 'All Ages';
}

// ──────────────────────────────────────────────────────────────────────
// Category detection
// ──────────────────────────────────────────────────────────────────────

function detectCategory(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  if (text.match(/\bswim|aquatic|pool|splash|water\s*play/)) {
    return { category: 'Sports & Recreation', subcategory: 'Swimming' };
  }
  if (text.match(/\bcamp\b|summer\s*camp|day\s*camp|spring\s*camp/)) {
    return { category: 'Camps & Classes', subcategory: 'Day Camp' };
  }
  if (text.match(/\bart|craft|paint|draw|pottery|ceramic/)) {
    return { category: 'Arts & Culture', subcategory: 'Arts & Crafts' };
  }
  if (text.match(/\bdance|ballet|hip\s*hop|jazz\s*dance/)) {
    return { category: 'Arts & Culture', subcategory: 'Dance' };
  }
  if (text.match(/\bnature|garden|hik|outdoor|wildlife|bird/)) {
    return { category: 'Nature & Outdoors', subcategory: 'Nature Programs' };
  }
  if (text.match(/\bsoccer|baseball|basketball|football|tennis|lacrosse|volleyball|gymnast/)) {
    return { category: 'Sports & Recreation', subcategory: 'Sports' };
  }
  if (text.match(/\bmartial\s*art|karate|tae\s*kwon|judo|jiu\s*jitsu/)) {
    return { category: 'Sports & Recreation', subcategory: 'Martial Arts' };
  }
  if (text.match(/\bmusic|piano|guitar|drum|instrument|choir|band/)) {
    return { category: 'Arts & Culture', subcategory: 'Music' };
  }
  if (text.match(/\bSTEM|science|coding|robot|engineer|tech/)) {
    return { category: 'Camps & Classes', subcategory: 'STEM' };
  }
  if (text.match(/\bspecial\s*event|festival|celebration|holiday|trick.or.treat|egg\s*hunt/)) {
    return { category: 'Special Events', subcategory: 'Community Events' };
  }

  return { category: 'Sports & Recreation', subcategory: 'Recreation Programs' };
}

// ──────────────────────────────────────────────────────────────────────
// Scrape a single CivicRec department
// ──────────────────────────────────────────────────────────────────────

async function scrapeDepartment(browser, dept, dryRun) {
  console.log(`\n🏫 Scraping ${dept.name} (${dept.city}, ${dept.state})`);
  console.log(`   URL: ${dept.urlBase}`);
  console.log('-'.repeat(60));

  let page;
  try {
    page = await createStealthPage(browser);
    await page.setViewport({ width: 1280, height: 900 });

    // Rec1 pages return HTTP 200 with empty body for invalid slugs
    const response = await page.goto(dept.urlBase, { waitUntil: 'networkidle2', timeout: 45000 });

    // Check for empty/invalid page
    const bodyText = await page.evaluate(() => document.body ? document.body.textContent.trim() : '');
    if (!bodyText || bodyText.length < 50) {
      console.log('   Empty page — slug may be invalid, skipping');
      await page.close();
      return [];
    }

    // Rec1 is a jQuery SPA — wait for catalog groups to render via AJAX
    try {
      await page.waitForSelector('.rec1-catalog-group', { timeout: 20000 });
    } catch (e) {
      console.log('   No catalog groups found after 20s, skipping');
      await page.close();
      return [];
    }

    // Extra wait for all sections to finish loading
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click all group headings to expand and load their items
    const groupCount = await page.evaluate(() => {
      const headings = document.querySelectorAll('.rec1-catalog-group-heading');
      headings.forEach(h => h.click());
      return headings.length;
    });
    console.log(`   Found ${groupCount} program groups, expanding...`);

    // Wait for items to load after clicking
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract activities from expanded catalog items
    const rawActivities = await page.evaluate(() => {
      const items = [];

      // First try: extract from expanded rec1-catalog-item elements (have dates, times, location)
      document.querySelectorAll('.rec1-catalog-item').forEach(el => {
        try {
          const nameEl = el.querySelector('.rec1-catalog-item-name');
          const title = nameEl ? nameEl.textContent.trim() : '';
          if (!title || title.length < 3) return;

          const locEl = el.querySelector('.rec1-catalog-item-feature.location');
          const ageEl = el.querySelector('.rec1-catalog-item-feature.ageGender');
          const daysEl = el.querySelector('.rec1-catalog-item-feature.days');
          const datesEl = el.querySelector('.rec1-catalog-item-feature.dates');
          const timesEl = el.querySelector('.rec1-catalog-item-feature.times');
          const priceEl = el.querySelector('.rec1-catalog-item-price');
          const contentEl = el.querySelector('.rec1-catalog-item-content');

          items.push({
            title,
            link: '',
            dateText: datesEl ? datesEl.textContent.trim() : '',
            timeText: timesEl ? timesEl.textContent.trim() : '',
            daysText: daysEl ? daysEl.textContent.trim() : '',
            location: locEl ? locEl.textContent.trim() : '',
            ageText: ageEl ? ageEl.textContent.trim() : '',
            description: contentEl ? contentEl.textContent.trim().substring(0, 500) : '',
            price: priceEl ? priceEl.textContent.trim() : '',
            source: 'item',
          });
        } catch (e) {
          // Skip problematic elements
        }
      });

      // Fallback: if no items expanded, extract from group headings (name + desc + price only)
      if (items.length === 0) {
        document.querySelectorAll('.rec1-catalog-group-heading').forEach(el => {
          try {
            const nameEl = el.querySelector('.rec1-catalog-group-name');
            const title = nameEl ? nameEl.textContent.trim() : '';
            if (!title || title.length < 3) return;
            // Strip trailing count number from group names like "Art Classes 1"
            const cleanTitle = title.replace(/\s+\d+$/, '');
            if (!cleanTitle || cleanTitle.length < 3) return;

            const descEl = el.querySelector('.rec1-catalog-group-desc-text');
            const priceEl = el.querySelector('.rec1-catalog-group-price');

            items.push({
              title: cleanTitle,
              link: '',
              dateText: '',
              timeText: '',
              daysText: '',
              location: '',
              ageText: '',
              description: descEl ? descEl.textContent.trim().substring(0, 500) : '',
              price: priceEl ? priceEl.textContent.trim() : '',
              source: 'group',
            });
          } catch (e) {
            // Skip problematic elements
          }
        });
      }

      return items;
    });

    console.log(`   Found ${rawActivities.length} raw activities on page`);

    if (rawActivities.length === 0) {
      await page.close();
      return [];
    }

    // Process and filter activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = [];

    for (const raw of rawActivities) {
      // Skip adult-only
      if (isAdultOnly(raw.title, raw.description)) {
        continue;
      }

      // Parse date from Rec1 formats
      // Rec1 item dates: "04/20-05/18" (MM/DD-MM/DD range), "04/20/2026", "04/20"
      let eventDate = '';
      let isoDate = '';
      const year = today.getFullYear();

      if (raw.dateText) {
        // Try MM/DD-MM/DD range (use start date)
        const rangeMatch = raw.dateText.match(/(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})/);
        if (rangeMatch) {
          const mo = rangeMatch[1].padStart(2, '0');
          const da = rangeMatch[2].padStart(2, '0');
          const parsed = new Date(`${year}-${mo}-${da}T00:00:00`);
          if (!isNaN(parsed.getTime())) {
            eventDate = parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            isoDate = `${year}-${mo}-${da}T00:00:00`;
          }
        }

        // Try MM/DD/YYYY
        if (!eventDate) {
          const slashMatch = raw.dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (slashMatch) {
            const parsed = new Date(`${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}T00:00:00`);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              isoDate = parsed.toISOString().split('T')[0] + 'T00:00:00';
            }
          }
        }

        // Try bare MM/DD (assume current year)
        if (!eventDate) {
          const bareMatch = raw.dateText.match(/^(\d{1,2})\/(\d{1,2})$/);
          if (bareMatch) {
            const mo = bareMatch[1].padStart(2, '0');
            const da = bareMatch[2].padStart(2, '0');
            const parsed = new Date(`${year}-${mo}-${da}T00:00:00`);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              isoDate = `${year}-${mo}-${da}T00:00:00`;
            }
          }
        }

        // Try "Mon, Apr 28, 2026" or "April 28, 2026"
        if (!eventDate) {
          const wordMatch = raw.dateText.match(
            /(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s*)?(\w+\s+\d{1,2}),?\s*(\d{4})?/i
          );
          if (wordMatch) {
            const yearStr = wordMatch[2] || String(year);
            const parsed = new Date(`${wordMatch[1]}, ${yearStr}T00:00:00`);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              isoDate = parsed.toISOString().split('T')[0] + 'T00:00:00';
            }
          }
        }
      }

      // If no date found, use today + 14 days as placeholder (program is likely upcoming)
      if (!eventDate) {
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 14);
        eventDate = futureDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        isoDate = futureDate.toISOString().split('T')[0] + 'T00:00:00';
      }

      // Skip past events
      if (isoDate) {
        const eventDt = new Date(isoDate);
        if (eventDt < today) continue;
      }

      // Extract time — Rec1 items have a separate timeText field (e.g., "5pm-6pm", "9am-12pm")
      let startTime = null;
      let endTime = null;
      const timeSource = raw.timeText || raw.dateText || '';
      if (timeSource) {
        const timeRange = timeSource.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
        if (timeRange) {
          startTime = timeRange[1].toUpperCase();
          endTime = timeRange[2].toUpperCase();
        } else {
          const singleTime = timeSource.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
          if (singleTime) {
            startTime = singleTime[1].toUpperCase();
          }
        }
      }

      const ageRange = detectAgeRange(raw.title, `${raw.description} ${raw.ageText}`);
      const { category, subcategory } = detectCategory(raw.title, raw.description);

      const venue = raw.location || dept.name;
      const url = raw.link || dept.urlBase;

      events.push({
        name: raw.title.substring(0, 200),
        title: raw.title.substring(0, 200),
        date: eventDate,
        eventDate,
        startTime,
        endTime,
        description: (raw.description || `${raw.title} at ${dept.name}. Family-friendly program in ${dept.city}, ${dept.state}.`).substring(0, 1500),
        url,
        imageUrl: '',
        venue,
        venueName: venue,
        city: dept.city,
        state: dept.state,
        zipCode: '',
        ageRange,
        category,
        source_url: dept.urlBase,
        scraper_name: `${SCRAPER_NAME}-${dept.slug}`,
        metadata: {
          sourceName: dept.name,
          sourceUrl: dept.urlBase,
          scrapedAt: new Date().toISOString(),
          scraperName: `${SCRAPER_NAME}-${dept.slug}`,
          platform: 'civicrec',
          state: dept.state,
          county: dept.county,
        },
      });
    }

    console.log(`   ${events.length} family-friendly events after filtering`);
    await page.close();
    return events;

  } catch (error) {
    console.error(`   Error scraping ${dept.name}: ${error.message}`);
    if (page) await page.close().catch(() => {});
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────
// Main scraper
// ──────────────────────────────────────────────────────────────────────

async function scrapeCivicRecParks(statesToScrape, dryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('🏫 CIVICREC PARKS & RECREATION SCRAPER (Eastern US)');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('🔍 DRY RUN MODE — events will be extracted but NOT saved');
  }

  let configs = DEPARTMENTS;
  if (statesToScrape && statesToScrape.length > 0) {
    configs = DEPARTMENTS.filter(d => statesToScrape.includes(d.state));
  }

  if (configs.length === 0) {
    console.error('No departments matched the state filter');
    return {};
  }

  console.log(`\n📍 Scraping ${configs.length} department(s)\n`);

  const browser = await launchBrowser();
  const stateResults = {};
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    for (const dept of configs) {
      const events = await scrapeDepartment(browser, dept, dryRun);

      if (events.length > 0 && !dryRun) {
        // Build venue entries for geocoding
        const venueMap = new Map();
        for (const event of events) {
          const key = (event.venue || dept.name).toLowerCase();
          if (!venueMap.has(key)) {
            venueMap.set(key, {
              name: event.venue || dept.name,
              city: dept.city,
              state: dept.state,
              address: '',
              zipCode: '',
              url: event.url,
              county: dept.county,
            });
          }
        }

        const venues = Array.from(venueMap.values());

        try {
          const result = await saveEventsWithGeocoding(events, venues, {
            scraperName: `${SCRAPER_NAME}-${dept.slug}`,
            state: dept.state,
            category: 'parks-rec',
            platform: 'civicrec',
          });

          console.log(`   Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors`);
          totalSaved += result.saved;
          totalSkipped += result.skipped;
          totalErrors += result.errors;
          stateResults[dept.state] = (stateResults[dept.state] || 0) + result.saved;
        } catch (saveErr) {
          console.error(`   Save error: ${saveErr.message}`);
          totalErrors += events.length;
        }
      } else if (events.length > 0 && dryRun) {
        console.log(`   [DRY RUN] Would save ${events.length} events`);
        stateResults[dept.state] = (stateResults[dept.state] || 0) + events.length;
      }

      // Delay between departments to avoid rate limiting
      if (dept !== configs[configs.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } finally {
    await browser.close();
    console.log('Browser closed');
  }

  // Summary
  const totalEvents = Object.values(stateResults).reduce((sum, n) => sum + n, 0);
  console.log('\n' + '='.repeat(60));
  console.log('CIVICREC PARKS & REC SCRAPING COMPLETE!\n');
  console.log('Summary:');
  console.log(`   Departments scraped: ${configs.length}`);
  console.log(`   Total events: ${totalEvents}`);
  if (!dryRun) {
    console.log(`   Saved: ${totalSaved}`);
    console.log(`   Skipped: ${totalSkipped}`);
    console.log(`   Errors: ${totalErrors}`);
  }
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${state}: ${count} events`);
  }
  console.log('='.repeat(60) + '\n');

  return stateResults;
}

// ──────────────────────────────────────────────────────────────────────
// CLI & Cloud Function exports
// ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const stateArgIdx = args.findIndex(a => a === '--state');
const DRY_RUN = args.includes('--dry');

if (require.main === module) {
  let statesToScrape = null;
  if (stateArgIdx !== -1 && args[stateArgIdx + 1]) {
    statesToScrape = args[stateArgIdx + 1].split(',').map(s => s.trim().toUpperCase());
  }

  scrapeCivicRecParks(statesToScrape, DRY_RUN)
    .then(() => {
      console.log('\nScraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\nScraper failed:', err);
      process.exit(1);
    });
}

async function scrapeCivicRecParksCloudFunction() {
  try {
    const result = await scrapeCivicRecParks();
    return { success: true, scraper: SCRAPER_NAME, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, scraper: SCRAPER_NAME, error: err.message };
  }
}

module.exports = {
  scrapeCivicRecParks,
  scrapeCivicRecParksCloudFunction,
  DEPARTMENTS,
};
