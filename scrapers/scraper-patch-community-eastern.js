#!/usr/bin/env node

/**
 * PATCH.COM COMMUNITY EVENTS SCRAPER (Eastern US)
 *
 * Data-driven Puppeteer scraper for community events from Patch.com local
 * event calendars across 28 eastern US states + DC.
 *
 * SOURCE: Patch.com — hyperlocal news and community event calendars.
 * Each community has a calendar page at https://patch.com/{slug}/calendar
 *
 * COVERAGE: 28 states + DC (~100-120 communities, 3-5 per state)
 *
 * Usage:
 *   node scrapers/scraper-patch-community-eastern.js                    # All states
 *   node scrapers/scraper-patch-community-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-patch-community-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-patch-community-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapePatchCommunityCloudFunction
 * Registry: Group 2
 */

const { launchBrowser, createStealthPage } = require('./puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const { logScraperResult } = require('./scraper-logger');

const SCRAPER_NAME = 'Patch-Community-Eastern';
const BASE_URL = 'https://patch.com';

// ==========================================
// COMMUNITIES CONFIG — 3-5 per state
// ==========================================
const COMMUNITIES = [
  // AL - Alabama
  { name: 'Birmingham', state: 'AL', slug: 'birmingham-al' },
  { name: 'Huntsville', state: 'AL', slug: 'huntsville-al' },
  { name: 'Mobile', state: 'AL', slug: 'mobile-al' },

  // CT - Connecticut
  { name: 'Hartford', state: 'CT', slug: 'hartford-ct' },
  { name: 'New Haven', state: 'CT', slug: 'newhaven-ct' },
  { name: 'Stamford', state: 'CT', slug: 'stamford-ct' },
  { name: 'Greenwich', state: 'CT', slug: 'greenwich-ct' },
  { name: 'Danbury', state: 'CT', slug: 'danbury-ct' },

  // DC - District of Columbia
  { name: 'Washington DC', state: 'DC', slug: 'washingtondc' },
  { name: 'Capitol Hill', state: 'DC', slug: 'capitol-hill-dc' },
  { name: 'Dupont Circle', state: 'DC', slug: 'dupont-dc' },

  // DE - Delaware
  { name: 'Wilmington', state: 'DE', slug: 'wilmington-de' },
  { name: 'Newark', state: 'DE', slug: 'newark-de' },
  { name: 'Dover', state: 'DE', slug: 'dover-de' },

  // FL - Florida
  { name: 'Miami', state: 'FL', slug: 'miami-fl' },
  { name: 'Orlando', state: 'FL', slug: 'orlando-fl' },
  { name: 'Tampa', state: 'FL', slug: 'tampa-fl' },
  { name: 'Jacksonville', state: 'FL', slug: 'jacksonville-fl' },
  { name: 'St. Petersburg', state: 'FL', slug: 'stpetersburg-fl' },

  // GA - Georgia
  { name: 'Atlanta', state: 'GA', slug: 'atlanta-ga' },
  { name: 'Savannah', state: 'GA', slug: 'savannah-ga' },
  { name: 'Marietta', state: 'GA', slug: 'marietta-ga' },
  { name: 'Decatur', state: 'GA', slug: 'decatur-ga' },

  // IA - Iowa
  { name: 'Des Moines', state: 'IA', slug: 'desmoines-ia' },
  { name: 'Cedar Rapids', state: 'IA', slug: 'cedarrapids-ia' },
  { name: 'Iowa City', state: 'IA', slug: 'iowacity-ia' },

  // IL - Illinois
  { name: 'Chicago', state: 'IL', slug: 'chicago-il' },
  { name: 'Naperville', state: 'IL', slug: 'naperville-il' },
  { name: 'Evanston', state: 'IL', slug: 'evanston-il' },
  { name: 'Arlington Heights', state: 'IL', slug: 'arlingtonheights-il' },
  { name: 'Oak Park', state: 'IL', slug: 'oakpark-il' },

  // IN - Indiana
  { name: 'Indianapolis', state: 'IN', slug: 'indianapolis-in' },
  { name: 'Fort Wayne', state: 'IN', slug: 'fortwayne-in' },
  { name: 'Carmel', state: 'IN', slug: 'carmel-in' },

  // KY - Kentucky
  { name: 'Louisville', state: 'KY', slug: 'louisville-ky' },
  { name: 'Lexington', state: 'KY', slug: 'lexington-ky' },
  { name: 'Bowling Green', state: 'KY', slug: 'bowlinggreen-ky' },

  // MA - Massachusetts
  { name: 'Boston', state: 'MA', slug: 'boston-ma' },
  { name: 'Cambridge', state: 'MA', slug: 'cambridge-ma' },
  { name: 'Somerville', state: 'MA', slug: 'somerville-ma' },
  { name: 'Newton', state: 'MA', slug: 'newton-ma' },
  { name: 'Brookline', state: 'MA', slug: 'brookline-ma' },

  // MD - Maryland
  { name: 'Baltimore', state: 'MD', slug: 'baltimore-md' },
  { name: 'Bethesda', state: 'MD', slug: 'bethesda-md' },
  { name: 'Silver Spring', state: 'MD', slug: 'silverspring-md' },
  { name: 'Columbia', state: 'MD', slug: 'columbia-md' },
  { name: 'Annapolis', state: 'MD', slug: 'annapolis-md' },

  // ME - Maine
  { name: 'Portland', state: 'ME', slug: 'portland-me' },
  { name: 'Bangor', state: 'ME', slug: 'bangor-me' },
  { name: 'Lewiston', state: 'ME', slug: 'lewiston-me' },

  // MN - Minnesota
  { name: 'Minneapolis', state: 'MN', slug: 'minneapolis-mn' },
  { name: 'St. Paul', state: 'MN', slug: 'stpaul-mn' },
  { name: 'Bloomington', state: 'MN', slug: 'bloomington-mn' },
  { name: 'Eden Prairie', state: 'MN', slug: 'edenprairie-mn' },

  // MS - Mississippi
  { name: 'Jackson', state: 'MS', slug: 'jackson-ms' },
  { name: 'Hattiesburg', state: 'MS', slug: 'hattiesburg-ms' },
  { name: 'Biloxi', state: 'MS', slug: 'biloxi-ms' },

  // NC - North Carolina
  { name: 'Charlotte', state: 'NC', slug: 'charlotte-nc' },
  { name: 'Raleigh', state: 'NC', slug: 'raleigh-nc' },
  { name: 'Durham', state: 'NC', slug: 'durham-nc' },
  { name: 'Asheville', state: 'NC', slug: 'asheville-nc' },

  // NH - New Hampshire
  { name: 'Manchester', state: 'NH', slug: 'manchester-nh' },
  { name: 'Nashua', state: 'NH', slug: 'nashua-nh' },
  { name: 'Concord', state: 'NH', slug: 'concord-nh' },

  // NJ - New Jersey
  { name: 'Jersey City', state: 'NJ', slug: 'jerseycity-nj' },
  { name: 'Hoboken', state: 'NJ', slug: 'hoboken-nj' },
  { name: 'Princeton', state: 'NJ', slug: 'princeton-nj' },
  { name: 'Morristown', state: 'NJ', slug: 'morristown-nj' },
  { name: 'Montclair', state: 'NJ', slug: 'montclair-nj' },

  // NY - New York
  { name: 'New York City', state: 'NY', slug: 'newyorkcity-ny' },
  { name: 'White Plains', state: 'NY', slug: 'whiteplains-ny' },
  { name: 'Scarsdale', state: 'NY', slug: 'scarsdale-ny' },
  { name: 'Rochester', state: 'NY', slug: 'rochester-ny' },
  { name: 'Buffalo', state: 'NY', slug: 'buffalo-ny' },

  // OH - Ohio
  { name: 'Columbus', state: 'OH', slug: 'columbus-oh' },
  { name: 'Cleveland', state: 'OH', slug: 'cleveland-oh' },
  { name: 'Cincinnati', state: 'OH', slug: 'cincinnati-oh' },
  { name: 'Akron', state: 'OH', slug: 'akron-oh' },

  // PA - Pennsylvania
  { name: 'Philadelphia', state: 'PA', slug: 'philadelphia-pa' },
  { name: 'Pittsburgh', state: 'PA', slug: 'pittsburgh-pa' },
  { name: 'Ardmore', state: 'PA', slug: 'ardmore-pa' },
  { name: 'King of Prussia', state: 'PA', slug: 'kingofprussia-pa' },
  { name: 'Doylestown', state: 'PA', slug: 'doylestown-pa' },

  // RI - Rhode Island
  { name: 'Providence', state: 'RI', slug: 'providence-ri' },
  { name: 'Cranston', state: 'RI', slug: 'cranston-ri' },
  { name: 'Warwick', state: 'RI', slug: 'warwick-ri' },

  // SC - South Carolina
  { name: 'Charleston', state: 'SC', slug: 'charleston-sc' },
  { name: 'Columbia', state: 'SC', slug: 'columbia-sc' },
  { name: 'Greenville', state: 'SC', slug: 'greenville-sc' },

  // TN - Tennessee
  { name: 'Nashville', state: 'TN', slug: 'nashville-tn' },
  { name: 'Memphis', state: 'TN', slug: 'memphis-tn' },
  { name: 'Knoxville', state: 'TN', slug: 'knoxville-tn' },
  { name: 'Chattanooga', state: 'TN', slug: 'chattanooga-tn' },

  // VA - Virginia
  { name: 'Arlington', state: 'VA', slug: 'arlington-va' },
  { name: 'Alexandria', state: 'VA', slug: 'alexandria-va' },
  { name: 'Fairfax', state: 'VA', slug: 'fairfax-va' },
  { name: 'Richmond', state: 'VA', slug: 'richmond-va' },
  { name: 'Virginia Beach', state: 'VA', slug: 'virginiabeach-va' },

  // VT - Vermont
  { name: 'Burlington', state: 'VT', slug: 'burlington-vt' },
  { name: 'Montpelier', state: 'VT', slug: 'montpelier-vt' },
  { name: 'Rutland', state: 'VT', slug: 'rutland-vt' },

  // WI - Wisconsin
  { name: 'Milwaukee', state: 'WI', slug: 'milwaukee-wi' },
  { name: 'Madison', state: 'WI', slug: 'madison-wi' },
  { name: 'Green Bay', state: 'WI', slug: 'greenbay-wi' },
  { name: 'Brookfield', state: 'WI', slug: 'brookfield-wi' },

  // WV - West Virginia
  { name: 'Charleston', state: 'WV', slug: 'charleston-wv' },
  { name: 'Morgantown', state: 'WV', slug: 'morgantown-wv' },
  { name: 'Huntington', state: 'WV', slug: 'huntington-wv' },
];

// ==========================================
// NON-FAMILY EVENT PATTERNS (skip these)
// ==========================================
const NON_FAMILY_PATTERNS = /\b(gun\s*show|beer\s*fest|wine\s*tasting|brew\s*fest|bourbon|cocktail|bar\s*crawl|pub\s*crawl|adults?\s*only|21\+|18\+|burlesque|tattoo\s*convention|cannabis|hemp\s*fest|cigar|whiskey|vodka|tequila|happy\s*hour|nightclub|strip\s*club|lingerie|poker\s*night|singles\s*mixer)\b/i;

// ==========================================
// SCRAPE A SINGLE COMMUNITY
// ==========================================

async function scrapeCommunity(community, browser) {
  const calendarUrl = `${BASE_URL}/${community.slug}/calendar`;
  console.log(`\n📍 ${community.name}, ${community.state}`);
  console.log(`   🌐 ${calendarUrl}`);

  const events = [];

  try {
    const page = await createStealthPage(browser);

    // Navigate with retry
    let retries = 2;
    while (retries > 0) {
      try {
        await page.goto(calendarUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`   ⚠️ Navigation retry...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    // Allow page to render
    await new Promise(r => setTimeout(r, 3000));

    // Extract events from the calendar page
    // Patch.com calendar DOM structure (no CSS classes — all generic elements):
    //   <h3>Saturday, April 25</h3>
    //   <ul>
    //     <li><span>10:00 am
    //       <a href="/state/city/calendar/event/YYYYMMDD/uuid/slug"><span>Title</span></a>
    //       <span>Venue, Address, City</span>
    //     </span></li>
    //   </ul>
    // Date is encoded in the URL path as YYYYMMDD — NOT in any element near the event.
    const rawEvents = await page.evaluate(() => {
      const results = [];
      const seenUrls = new Set();

      // Find all links to event detail pages
      const eventLinks = document.querySelectorAll('a[href*="/calendar/event/"]');

      for (const link of eventLinks) {
        try {
          const href = link.getAttribute('href') || '';
          if (seenUrls.has(href)) continue;
          seenUrls.add(href);

          // Extract title from link text
          const title = link.textContent.trim();
          if (!title || title.length < 4 || title.length > 300) continue;
          // Skip HTML-contaminated titles (rare: unescaped img tags in UGC)
          if (title.startsWith('<')) continue;

          // Extract date from URL path: /calendar/event/YYYYMMDD/
          let dateText = '';
          const dateMatch = href.match(/\/calendar\/event\/(\d{4})(\d{2})(\d{2})\//);
          if (dateMatch) {
            const year = dateMatch[1];
            const month = dateMatch[2];
            const day = dateMatch[3];
            // Build readable date for eventDate field
            const months = ['', 'January','February','March','April','May','June',
              'July','August','September','October','November','December'];
            const monthName = months[parseInt(month, 10)] || month;
            dateText = `${monthName} ${parseInt(day, 10)}, ${year}`;
          }

          // If no date in URL, try the preceding <h3> heading
          if (!dateText) {
            const listItem = link.closest('li');
            const list = listItem ? listItem.closest('ul, ol') : null;
            if (list) {
              let prev = list.previousElementSibling;
              let steps = 0;
              while (prev && steps < 5) {
                if (prev.tagName === 'H3' || prev.tagName === 'H2') {
                  const headText = prev.textContent.trim();
                  // "Saturday, April 25" — append current year
                  if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i.test(headText)) {
                    dateText = headText + ', ' + new Date().getFullYear();
                  }
                  break;
                }
                prev = prev.previousElementSibling;
                steps++;
              }
            }
          }

          // Extract time from parent element text
          let time = '';
          const parent = link.parentElement;
          if (parent) {
            // Parent's own text (not children's text) often starts with "10:00 am"
            const parentClone = parent.cloneNode(true);
            // Remove child elements to get only direct text
            const children = parentClone.querySelectorAll('*');
            children.forEach(c => c.textContent = '');
            const directText = parentClone.textContent.trim();
            const timeMatch = directText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
            if (timeMatch) {
              time = timeMatch[1];
            }
          }

          // Extract venue from sibling element after the link
          let venue = '';
          const nextSibling = link.nextElementSibling;
          if (nextSibling) {
            venue = nextSibling.textContent.trim();
          }

          // Build full URL
          const fullUrl = href.startsWith('/') ? 'https://patch.com' + href : href;

          results.push({
            title,
            dateText: dateText + (time ? ' ' + time : ''),
            venue: venue.substring(0, 200),
            description: '',
            imageUrl: '',
            url: fullUrl,
          });
        } catch (err) {
          // Skip individual event errors
        }
      }

      return results;
    });

    console.log(`   📋 Found ${rawEvents.length} event listings`);

    // Filter and build event objects
    let skippedNonFamily = 0;
    for (const raw of rawEvents) {
      // Skip non-family events
      if (NON_FAMILY_PATTERNS.test(`${raw.title} ${raw.description}`)) {
        skippedNonFamily++;
        continue;
      }

      // Build full URL if relative
      let eventUrl = raw.url;
      if (eventUrl && !eventUrl.startsWith('http')) {
        eventUrl = `${BASE_URL}${eventUrl}`;
      }

      // Parse date from URL-extracted format ("May 10, 2026 10:00 am")
      let eventDate = raw.dateText || '';
      let dateTimestamp = null;

      // Try to parse a TIMESTAMPTZ date from the eventDate text
      const dateParseMatch = eventDate.match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})/);
      if (dateParseMatch) {
        const monthStr = dateParseMatch[1];
        const day = dateParseMatch[2].padStart(2, '0');
        const year = dateParseMatch[3];
        const months = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
          july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
        const month = months[monthStr.toLowerCase()];
        if (month) {
          dateTimestamp = `${year}-${month}-${day}T00:00:00`;
        }
      }

      // Use venue from extraction, fall back to community name
      const venueName = raw.venue || '';

      events.push({
        title: raw.title,
        eventDate: eventDate,
        date: dateTimestamp,
        description: raw.description || `${raw.title} - community event in ${community.name}, ${community.state}`,
        venueName: venueName,
        city: community.name,
        state: community.state,
        url: eventUrl,
        imageUrl: raw.imageUrl || '',
        category: 'Community',
        details: {
          city: community.name,
          state: community.state,
          address: venueName || `${community.name}, ${community.state}`,
        },
      });
    }

    if (skippedNonFamily > 0) {
      console.log(`   🚫 Skipped ${skippedNonFamily} non-family events`);
    }
    console.log(`   ✅ ${events.length} family-friendly events extracted`);

    await page.close();
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
  }

  return events;
}

// ==========================================
// MAIN SCRAPER FUNCTION
// ==========================================

async function scrapePatchCommunity(filterStates = null) {
  console.log('\n\x1b[33m📰━━━━━━━━━━━━━ PATCH.COM COMMUNITY EVENTS SCRAPER ━━━━━━━━━━━━━━📰\x1b[0m');

  const communitiesToScrape = filterStates
    ? COMMUNITIES.filter(c => filterStates.includes(c.state))
    : COMMUNITIES;

  const stateCount = new Set(communitiesToScrape.map(c => c.state)).size;
  console.log(`📍 Target: ${communitiesToScrape.length} communities across ${stateCount} states`);
  console.log(`🌐 Source: Patch.com\n`);

  const browser = await launchBrowser();
  let allEvents = [];
  const stateResults = {};

  try {
    for (let i = 0; i < communitiesToScrape.length; i++) {
      const community = communitiesToScrape[i];
      console.log(`\n[${i + 1}/${communitiesToScrape.length}] ${community.name}, ${community.state}`);

      const communityEvents = await scrapeCommunity(community, browser);
      allEvents.push(...communityEvents);

      if (!stateResults[community.state]) stateResults[community.state] = 0;
      stateResults[community.state] += communityEvents.length;

      // Save in batches to keep memory manageable
      if (allEvents.length >= 500 || i === communitiesToScrape.length - 1) {
        if (allEvents.length > 0 && !DRY_RUN) {
          console.log(`\n💾 Saving batch of ${allEvents.length} events...`);

          // Group by state since saveEventsWithGeocoding requires state in options
          const eventsByState = {};
          for (const evt of allEvents) {
            const st = evt.state || 'XX';
            if (!eventsByState[st]) eventsByState[st] = [];
            eventsByState[st].push(evt);
          }

          for (const [st, stateEvents] of Object.entries(eventsByState)) {
            // Build venues list for geocoding
            const venueMap = new Map();
            for (const e of stateEvents) {
              const vName = e.venueName || e.title;
              if (!venueMap.has(vName)) {
                venueMap.set(vName, {
                  name: vName,
                  city: e.city,
                  state: st,
                });
              }
            }

            try {
              const result = await saveEventsWithGeocoding(
                stateEvents,
                Array.from(venueMap.values()),
                {
                  scraperName: SCRAPER_NAME,
                  state: st,
                  category: 'Community',
                  platform: 'patch',
                }
              );
              const saved = result?.saved || result?.new || result?.imported || 0;
              console.log(`   💾 ${st}: Saved ${saved}`);
            } catch (err) {
              console.error(`   ❌ Save error (${st}): ${err.message}`);
            }
          }
        }
        allEvents = [];
      }

      // 2-3 second delay between communities to be polite
      if (i < communitiesToScrape.length - 1) {
        const delay = 2000 + Math.floor(Math.random() * 1000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  } catch (err) {
    console.error('❌ Scraper fatal error:', err);
    throw err;
  } finally {
    await browser.close();
  }

  // Log summary
  const totalEvents = Object.values(stateResults).reduce((sum, n) => sum + n, 0);
  console.log('\n\x1b[33m━━━━━━━━━━━━━ SUMMARY ━━━━━━━━━━━━━━\x1b[0m');
  console.log(`Total events found: ${totalEvents}`);
  for (const [state, count] of Object.entries(stateResults).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${state}: ${count} events`);
  }

  logScraperResult(SCRAPER_NAME, {
    found: totalEvents,
    new: totalEvents,
    duplicates: 0,
  });

  return stateResults;
}

// ==========================================
// CLI & CLOUD FUNCTION EXPORTS
// ==========================================

const args = process.argv.slice(2);
const stateArgIdx = args.findIndex(a => a === '--state');
const DRY_RUN = args.includes('--dry');

if (require.main === module) {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE — events will be extracted but NOT saved');
  }

  let statesToScrape = null;
  if (stateArgIdx !== -1 && args[stateArgIdx + 1]) {
    statesToScrape = args[stateArgIdx + 1].split(',').map(s => s.trim().toUpperCase());
  }

  scrapePatchCommunity(statesToScrape)
    .then(() => {
      console.log('\n✅ Scraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Scraper failed:', err);
      process.exit(1);
    });
}

async function scrapePatchCommunityCloudFunction() {
  try {
    const result = await scrapePatchCommunity();
    return { success: true, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  scrapePatchCommunity,
  scrapePatchCommunityCloudFunction,
};
