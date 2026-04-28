#!/usr/bin/env node

/**
 * RECDESK PARKS & RECREATION SCRAPER (API-based)
 *
 * Scrapes events from city/county parks & recreation departments that use
 * the RecDesk platform ({slug}.recdesk.com).
 *
 * RecDesk uses FullCalendar.js backed by a JSON POST API:
 *   POST https://{slug}.recdesk.com/Community/Calendar/GetCalendarItems
 *   Body: { facilityId, startDate, endDate, getChildren, SelectedView, SelectedMonth, SelectedYear }
 *   Returns: { Events: [{ EventName, FacilityName, StartTimeISO8601, EndTimeISO8601, ... }] }
 *
 * Detail endpoint (for descriptions):
 *   POST https://{slug}.recdesk.com/Community/Calendar/GetCalendarItem
 *   Body: { type, id, facId, scheduleId }
 *   Returns: { EventName, EventUrl, FacilityName, Description }
 *
 * Supports 46 sites across 24 states:
 *   AL (Mobile, Jacksonville), CT (Portland, West Hartford),
 *   DE (Dover), FL (Maitland),
 *   GA (Woodstock, Carroll County, Habersham County),
 *   IL (Charleston), IN (Hendricks County, Marion County),
 *   KY (Hopkinsville), MA (Worcester, Clinton), MD (Carroll County),
 *   ME (Raymond), MI (Pontiac, Jackson), MS (Oxford),
 *   NC (Stallings, Roanoke Rapids, Shelby, Carteret County, Lee County,
 *       Carolina Beach, Brunswick County, Kinston-Lenoir),
 *   NH (Keene, Merrimack),
 *   NJ (Jersey City, Hoboken), NY (Syracuse, Binghamton, Oneida, Rochester),
 *   OH (Akron, Marysville), RI (Providence), SC (Aiken, Orangeburg),
 *   TN (Collegedale), VA (Culpeper), WI (Watertown, Whitewater),
 *   WV (Wheeling)
 *
 * Usage:
 *   node scraper-recdesk-parks.js --state NY    # New York sites only
 *   node scraper-recdesk-parks.js --slug syracuse  # Single site
 *   node scraper-recdesk-parks.js               # All sites
 *
 * Cloud Function: scrapeRecDeskParksCloudFunction
 * Schedule: Group 1 (every 3 days on days 1, 4, 7, 10...)
 */

const axios = require('axios');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'RecDeskParks';

// ──────────────────────────────────────────────────────────────────────
// Site configurations
// ──────────────────────────────────────────────────────────────────────

const RECDESK_CONFIGS = [
  // Alabama
  {
    slug: 'mprd',
    name: 'Mobile Parks and Recreation',
    city: 'Mobile',
    state: 'AL',
    county: 'Mobile'
  },
  {
    slug: 'jacksonvilleal',
    name: 'Jacksonville Parks and Recreation',
    city: 'Jacksonville',
    state: 'AL',
    county: 'Calhoun'
  },
  // Connecticut
  {
    slug: 'portland',
    name: 'Portland Parks & Recreation',
    city: 'Portland',
    state: 'CT',
    county: 'Middlesex'
  },
  {
    slug: 'westhartford',
    name: 'West Hartford Leisure Services',
    city: 'West Hartford',
    state: 'CT',
    county: 'Hartford'
  },
  // Delaware
  {
    slug: 'cityofdover',
    name: 'City of Dover Parks & Recreation',
    city: 'Dover',
    state: 'DE',
    county: 'Kent'
  },
  // Florida
  {
    slug: 'maitland',
    name: 'Maitland Parks & Recreation',
    city: 'Maitland',
    state: 'FL',
    county: 'Orange'
  },
  // Georgia
  {
    slug: 'woodstock',
    name: 'Woodstock Parks and Recreation',
    city: 'Woodstock',
    state: 'GA',
    county: 'Cherokee'
  },
  {
    slug: 'carrollcountyga',
    name: 'Carroll County Recreation Department',
    city: 'Carrollton',
    state: 'GA',
    county: 'Carroll'
  },
  {
    slug: 'habershamga',
    name: 'Habersham County Parks and Recreation',
    city: 'Clarkesville',
    state: 'GA',
    county: 'Habersham'
  },
  // Illinois
  {
    slug: 'charparksandrec',
    name: 'Charleston Parks & Recreation',
    city: 'Charleston',
    state: 'IL',
    county: 'Coles'
  },
  // Indiana
  {
    slug: 'hcparks',
    name: 'Hendricks County Parks and Recreation',
    city: 'Danville',
    state: 'IN',
    county: 'Hendricks'
  },
  {
    slug: 'mcparc',
    name: 'Marion County Parks & Recreation Commission',
    city: 'Indianapolis',
    state: 'IN',
    county: 'Marion'
  },
  // Kentucky
  {
    slug: 'hpr',
    name: 'Hopkinsville Parks and Recreation',
    city: 'Hopkinsville',
    state: 'KY',
    county: 'Christian'
  },
  // Maine
  {
    slug: 'raymond',
    name: 'Raymond Parks & Recreation',
    city: 'Raymond',
    state: 'ME',
    county: 'Cumberland'
  },
  // Maryland
  {
    slug: 'ccrec',
    name: 'Carroll County Department of Recreation & Parks',
    city: 'Westminster',
    state: 'MD',
    county: 'Carroll'
  },
  // Massachusetts
  {
    slug: 'worcesterparksma',
    name: 'Worcester Parks and Recreation',
    city: 'Worcester',
    state: 'MA',
    county: 'Worcester'
  },
  {
    slug: 'clintonrec',
    name: 'Clinton Parks & Recreation',
    city: 'Clinton',
    state: 'MA',
    county: 'Worcester'
  },
  // Michigan
  {
    slug: 'pontiacrecreation',
    name: 'City of Pontiac Parks and Recreation',
    city: 'Pontiac',
    state: 'MI',
    county: 'Oakland'
  },
  {
    slug: 'jacksonmi',
    name: 'City of Jackson Parks & Recreation',
    city: 'Jackson',
    state: 'MI',
    county: 'Jackson'
  },
  // Mississippi
  {
    slug: 'oxfordms',
    name: 'City of Oxford Parks & Recreation',
    city: 'Oxford',
    state: 'MS',
    county: 'Lafayette'
  },
  // New Hampshire
  {
    slug: 'keeneparks',
    name: 'Keene Parks and Recreation',
    city: 'Keene',
    state: 'NH',
    county: 'Cheshire'
  },
  {
    slug: 'merrimack',
    name: 'Merrimack Parks & Recreation',
    city: 'Merrimack',
    state: 'NH',
    county: 'Hillsborough'
  },
  // New Jersey
  {
    slug: 'jcrec',
    name: 'Jersey City Dept of Recreation & Youth Development',
    city: 'Jersey City',
    state: 'NJ',
    county: 'Hudson'
  },
  {
    slug: 'hoboken',
    name: 'Hoboken Parks & Recreation',
    city: 'Hoboken',
    state: 'NJ',
    county: 'Hudson'
  },
  // New York
  {
    slug: 'syracuse',
    name: 'Syracuse Parks, Recreation & Youth Programs',
    city: 'Syracuse',
    state: 'NY',
    county: 'Onondaga'
  },
  {
    slug: 'cityofbinghamton',
    name: 'City of Binghamton Parks & Recreation',
    city: 'Binghamton',
    state: 'NY',
    county: 'Broome'
  },
  {
    slug: 'cityofoneida',
    name: 'City of Oneida Recreation',
    city: 'Oneida',
    state: 'NY',
    county: 'Madison'
  },
  {
    slug: 'rochesterrec',
    name: 'Rochester Recreation & Arena',
    city: 'Rochester',
    state: 'NY',
    county: 'Monroe'
  },
  // North Carolina
  {
    slug: 'stallings',
    name: 'Town of Stallings Parks & Rec',
    city: 'Stallings',
    state: 'NC',
    county: 'Union'
  },
  {
    slug: 'rrparksandrec',
    name: 'Roanoke Rapids Parks & Recreation',
    city: 'Roanoke Rapids',
    state: 'NC',
    county: 'Halifax'
  },
  {
    slug: 'shelby',
    name: 'City of Shelby Parks & Recreation',
    city: 'Shelby',
    state: 'NC',
    county: 'Cleveland'
  },
  {
    slug: 'ccpr',
    name: 'Carteret County Parks and Recreation',
    city: 'Beaufort',
    state: 'NC',
    county: 'Carteret'
  },
  {
    slug: 'lcncpr',
    name: 'Lee County Parks and Recreation',
    city: 'Sanford',
    state: 'NC',
    county: 'Lee'
  },
  {
    slug: 'carolinabeach',
    name: 'Carolina Beach Parks and Recreation',
    city: 'Carolina Beach',
    state: 'NC',
    county: 'New Hanover'
  },
  {
    slug: 'bcparks',
    name: 'Brunswick County Parks & Recreation',
    city: 'Bolivia',
    state: 'NC',
    county: 'Brunswick'
  },
  {
    slug: 'klc',
    name: 'Kinston-Lenoir County Parks & Recreation',
    city: 'Kinston',
    state: 'NC',
    county: 'Lenoir'
  },
  // Ohio
  {
    slug: 'akron',
    name: 'City of Akron Recreation & Parks',
    city: 'Akron',
    state: 'OH',
    county: 'Summit'
  },
  {
    slug: 'marysvilleoh',
    name: 'Marysville Parks and Recreation',
    city: 'Marysville',
    state: 'OH',
    county: 'Union'
  },
  // Rhode Island
  {
    slug: 'providenceri',
    name: 'Providence Recreation',
    city: 'Providence',
    state: 'RI',
    county: 'Providence'
  },
  // South Carolina
  {
    slug: 'cityofaikensc',
    name: 'City of Aiken Parks and Recreation',
    city: 'Aiken',
    state: 'SC',
    county: 'Aiken'
  },
  {
    slug: 'orangeburg',
    name: 'Orangeburg Parks and Recreation',
    city: 'Orangeburg',
    state: 'SC',
    county: 'Orangeburg'
  },
  // Tennessee
  {
    slug: 'collegedale',
    name: 'Collegedale Parks & Recreation',
    city: 'Collegedale',
    state: 'TN',
    county: 'Hamilton'
  },
  // Virginia
  {
    slug: 'crpr',
    name: 'Culpeper Recreation',
    city: 'Culpeper',
    state: 'VA',
    county: 'Culpeper'
  },
  // West Virginia
  {
    slug: 'wheeling',
    name: 'City of Wheeling Parks and Recreation',
    city: 'Wheeling',
    state: 'WV',
    county: 'Ohio'
  },
  // Wisconsin
  {
    slug: 'watertownwi',
    name: 'Watertown Parks & Recreation',
    city: 'Watertown',
    state: 'WI',
    county: 'Jefferson'
  },
  {
    slug: 'whitewater',
    name: 'Whitewater Parks and Recreation',
    city: 'Whitewater',
    state: 'WI',
    county: 'Walworth'
  }
];

// ──────────────────────────────────────────────────────────────────────
// API fetching
// ──────────────────────────────────────────────────────────────────────

/**
 * Fetch calendar events for a date range from a RecDesk site.
 * Returns the Events array from the JSON response.
 */
async function fetchCalendarItems(config, startDate, endDate) {
  const url = `https://${config.slug}.recdesk.com/Community/Calendar/GetCalendarItems`;

  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();
  const endYear = endDate.getFullYear();

  const body = {
    facilityId: 0,
    startDate: `${startMonth}/${startDay}/${startYear}`,
    endDate: `${endMonth}/${endDay}/${endYear}`,
    getChildren: 'false',
    SelectedView: 'month',
    SelectedMonth: String(startMonth),
    SelectedYear: String(startYear)
  };

  try {
    const response = await axios.post(url, body, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': `https://${config.slug}.recdesk.com`,
        'Referer': `https://${config.slug}.recdesk.com/Community/Calendar`
      }
    });

    const data = response.data;
    if (data && Array.isArray(data.Events)) {
      return data.Events;
    }

    // Some sites might return differently
    if (data && Array.isArray(data.events)) {
      return data.events;
    }

    console.log(`  ⚠️  Unexpected response shape from ${config.slug}`);
    return [];
  } catch (err) {
    console.error(`  ❌ API error for ${config.slug}: ${err.message}`);
    return [];
  }
}

/**
 * Fetch event detail (description, URL) for a single event.
 */
async function fetchEventDetail(config, event) {
  const url = `https://${config.slug}.recdesk.com/Community/Calendar/GetCalendarItem`;

  try {
    const response = await axios.post(url, {
      type: event.EventType || event.eventType || 'E',
      id: event.EventId || event.eventId,
      facId: event.FacilityId || event.facilityId || 0,
      scheduleId: event.EventScheduleId || event.eventScheduleId || 0
    }, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data || {};
  } catch (err) {
    // Non-critical — we just won't have a description
    return {};
  }
}

/**
 * Fetch events covering the next 60 days in two monthly chunks.
 */
async function fetchAllEvents(config) {
  const allEvents = [];
  const now = new Date();

  // Fetch current month and next month
  for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
    const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0); // last day of month

    console.log(`  📡 Fetching ${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}...`);
    const events = await fetchCalendarItems(config, start, end);
    console.log(`  ✅ Got ${events.length} events`);
    allEvents.push(...events);

    if (monthOffset < 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Deduplicate by EventId + StartTimeISO8601
  const seen = new Set();
  const unique = [];
  for (const evt of allEvents) {
    const key = `${evt.EventId || evt.eventId}-${evt.StartTimeISO8601 || evt.startTimeISO8601}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(evt);
    }
  }

  return unique;
}

// ──────────────────────────────────────────────────────────────────────
// Event transformation
// ──────────────────────────────────────────────────────────────────────

function detectAgeRange(title, description) {
  const fullText = `${title || ''} ${description || ''}`.toLowerCase();
  if (fullText.includes('toddler') || fullText.includes('baby') || fullText.match(/\b0[-–]?3\b/)) {
    return 'Babies & Toddlers (0-2)';
  } else if (fullText.includes('preschool') || fullText.match(/\b3[-–]?5\b/)) {
    return 'Preschool (3-5)';
  } else if (fullText.includes('junior') || fullText.match(/\b6[-–]?8\b/)) {
    return 'Kids (6-8)';
  } else if (fullText.includes('tween') || fullText.match(/\b9[-–]?12\b/)) {
    return 'Tweens (9-12)';
  } else if ((fullText.includes('teen') && !fullText.includes('volunteer')) || fullText.match(/\b13[-–]?18\b/)) {
    return 'Teens (13-18)';
  } else if (fullText.includes('youth') || fullText.includes('kid') || fullText.includes('child')) {
    return 'Kids (6-8)';
  }
  return 'All Ages';
}

/**
 * Transform a RecDesk calendar event into our standard format.
 */
function transformEvent(raw, detail, config) {
  const title = (raw.EventName || raw.eventName || '').substring(0, 200);
  if (!title || title.length < 3) return null;

  // Parse ISO 8601 dates
  const startISO = raw.StartTimeISO8601 || raw.startTimeISO8601 || '';
  const endISO = raw.EndTimeISO8601 || raw.endTimeISO8601 || '';

  let eventDate = '';
  let startTime = null;
  let endTime = null;

  if (startISO) {
    const dt = new Date(startISO);
    if (!isNaN(dt.getTime())) {
      eventDate = dt.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });

      const isAllDay = raw.AllDay || raw.allDay;
      if (!isAllDay) {
        startTime = dt.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true
        });
      }
    }
  }

  if (endISO && !(raw.AllDay || raw.allDay)) {
    const dt = new Date(endISO);
    if (!isNaN(dt.getTime())) {
      endTime = dt.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    }
  }

  if (!eventDate) return null;

  // Filter out past events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDt = new Date(startISO);
  if (eventDt < today) return null;

  // Facility/venue
  const facilityName = raw.FacilityName || raw.facilityName || '';
  const venue = facilityName || config.name;

  // Description from detail call
  const description = (detail.Description || '').substring(0, 1500);

  // URL from detail call
  let url = detail.EventUrl || '';
  if (url === '#' || !url) {
    url = `https://${config.slug}.recdesk.com/Community/Calendar`;
  } else if (url.startsWith('/')) {
    url = `https://${config.slug}.recdesk.com${url}`;
  }

  const ageRange = detectAgeRange(title, description);

  return {
    title,
    name: title,
    date: eventDate,
    eventDate,
    startTime,
    endTime,
    description,
    url,
    imageUrl: '',
    venue,
    venueName: venue,
    city: config.city,
    zipCode: '',
    ageRange,
    metadata: {
      sourceName: config.name,
      sourceUrl: `https://${config.slug}.recdesk.com`,
      scrapedAt: new Date().toISOString(),
      recDeskEventId: String(raw.EventId || raw.eventId || '')
    }
  };
}

// ──────────────────────────────────────────────────────────────────────
// Non-family event filtering
// ──────────────────────────────────────────────────────────────────────

function isLikelyAdultOnly(title) {
  const lower = (title || '').toLowerCase();
  const adultPatterns = [
    /\b(40\+|50\+|55\+|60\+|65\+)\b/,
    /\bsenior\b/,
    /\badult\s+(league|sports?|fitness|basketball|volleyball|softball|soccer|flag football)\b/,
    /\bbeer\b/, /\bwine tasting\b/, /\bbrewery\b/,
    /\bpickleball\b.*\b(league|tournament|open play)\b/,
    /\bmen'?s\s+(basketball|softball|volleyball|soccer|league)\b/,
    /\bwomen'?s\s+(basketball|softball|volleyball|soccer|league)\b/,
    /\bco-?ed\s+(volleyball|softball|basketball|soccer|league)\b/
  ];

  for (const pat of adultPatterns) {
    if (pat.test(lower)) return true;
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────
// Main scraping
// ──────────────────────────────────────────────────────────────────────

async function scrapeRecDeskSite(config) {
  console.log(`\n🏫 Scraping ${config.name} (${config.slug}.recdesk.com)`);
  console.log('-'.repeat(60));

  try {
    const rawEvents = await fetchAllEvents(config);
    console.log(`  📋 Total unique events: ${rawEvents.length}`);

    if (rawEvents.length === 0) {
      console.log('  ⚠️  No events found\n');
      return { saved: 0, skipped: 0, errors: 0 };
    }

    // Filter out cancelled and adult-only events before detail calls
    const candidateEvents = rawEvents.filter(evt => {
      const title = (evt.EventName || evt.eventName || '').toLowerCase();
      if (title.includes('cancelled') || title.includes('canceled') || title.includes('postponed')) {
        return false;
      }
      if (isLikelyAdultOnly(evt.EventName || evt.eventName)) {
        return false;
      }
      return true;
    });

    console.log(`  ✅ ${candidateEvents.length} candidate events after filtering`);

    // Fetch details for a sample of events (limit detail calls to avoid rate-limiting)
    // For events we don't fetch details for, we just won't have descriptions
    const MAX_DETAIL_CALLS = 30;
    const detailMap = new Map();

    const eventsNeedingDetail = candidateEvents.slice(0, MAX_DETAIL_CALLS);
    if (eventsNeedingDetail.length > 0) {
      console.log(`  📝 Fetching details for ${eventsNeedingDetail.length} events...`);
      for (let i = 0; i < eventsNeedingDetail.length; i++) {
        const evt = eventsNeedingDetail[i];
        const key = `${evt.EventId || evt.eventId}`;
        if (!detailMap.has(key)) {
          const detail = await fetchEventDetail(config, evt);
          detailMap.set(key, detail);
          // Small delay to be polite
          if (i < eventsNeedingDetail.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }

    // Transform all events
    const events = [];
    for (const raw of candidateEvents) {
      const key = `${raw.EventId || raw.eventId}`;
      const detail = detailMap.get(key) || {};
      const event = transformEvent(raw, detail, config);
      if (event) {
        events.push(event);
      }
    }

    console.log(`  ✅ ${events.length} valid events after transformation`);

    if (events.length > 0) {
      // Build venue entries
      const venueMap = new Map();
      for (const event of events) {
        const key = (event.venue || config.name).toLowerCase();
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: event.venue || config.name,
            city: config.city,
            state: config.state,
            address: '',
            zipCode: '',
            url: `https://${config.slug}.recdesk.com`,
            county: config.county
          });
        }
      }

      const libraries = Array.from(venueMap.values());

      const result = await saveEventsWithGeocoding(events, libraries, {
        scraperName: `${SCRAPER_NAME}-${config.slug}`,
        state: config.state,
        category: 'parks-rec',
        platform: 'recdesk'
      });

      console.log(`  📊 Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors\n`);
      return result;
    } else {
      console.log('  ⚠️  No valid events after transformation\n');
      return { saved: 0, skipped: 0, errors: 0 };
    }
  } catch (error) {
    console.error(`  ❌ Error scraping ${config.name}:`, error.message);
    return { saved: 0, skipped: 0, errors: 1 };
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { state: null, slug: null };

  const stateIdx = args.indexOf('--state');
  if (stateIdx !== -1 && args[stateIdx + 1]) {
    result.state = args[stateIdx + 1].toUpperCase();
  }

  const slugIdx = args.indexOf('--slug');
  if (slugIdx !== -1 && args[slugIdx + 1]) {
    result.slug = args[slugIdx + 1].toLowerCase();
  }

  return result;
}

async function scrapeRecDeskParks() {
  console.log('\n' + '='.repeat(60));
  console.log('🏫 RECDESK PARKS & RECREATION SCRAPER');
  console.log('='.repeat(60));

  const { state, slug } = parseArgs();

  let configsToScrape = RECDESK_CONFIGS;
  if (slug) {
    configsToScrape = RECDESK_CONFIGS.filter(cfg => cfg.slug === slug);
  } else if (state) {
    configsToScrape = RECDESK_CONFIGS.filter(cfg => cfg.state === state);
  }

  if (configsToScrape.length === 0) {
    console.error(`❌ No configuration found for ${slug ? 'slug: ' + slug : 'state: ' + state}`);
    console.log(`Available slugs: ${RECDESK_CONFIGS.map(c => c.slug).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n📍 Scraping ${configsToScrape.length} site(s)\n`);

  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const config of configsToScrape) {
    const result = await scrapeRecDeskSite(config);
    totalSaved += result.saved;
    totalSkipped += result.skipped;
    totalErrors += result.errors;

    // Delay between sites
    if (config !== configsToScrape[configsToScrape.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ RECDESK PARKS & REC SCRAPING COMPLETE!\n');
  console.log(`📊 Summary:`);
  console.log(`   Sites scraped: ${configsToScrape.length}`);
  console.log(`   Saved: ${totalSaved}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log('='.repeat(60) + '\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors };
}

async function scrapeRecDeskParksCloudFunction(req, res) {
  try {
    const result = await scrapeRecDeskParks();
    res.status(200).json({ success: true, scraper: SCRAPER_NAME, ...result });
  } catch (error) {
    console.error('Cloud function error:', error);
    res.status(500).json({ success: false, scraper: SCRAPER_NAME, error: error.message });
  }
}

if (require.main === module) {
  scrapeRecDeskParks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeRecDeskParks, scrapeRecDeskParksCloudFunction, RECDESK_CONFIGS };
