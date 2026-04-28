#!/usr/bin/env node

/**
 * ACTIVENET PARKS & RECREATION SCRAPER (Eastern US)
 *
 * Scrapes family activities/programs from city and county parks & recreation
 * departments that use the ActiveNet / ACTIVE Network community portal platform.
 *
 * Platform: ActiveNet (anc.apm.activecommunities.com/{jurisdiction}/activity/search)
 * These are React SPAs — Puppeteer is required to render JS content.
 *
 * COVERAGE: 7 active parks & rec departments (40 others migrated off ActiveNet as of April 2026)
 *
 * Usage:
 *   node scrapers/scraper-activenet-parks-eastern.js                    # All jurisdictions
 *   node scrapers/scraper-activenet-parks-eastern.js --state VA         # Virginia only
 *   node scrapers/scraper-activenet-parks-eastern.js --state VA,FL,NC   # Multiple states
 *   node scrapers/scraper-activenet-parks-eastern.js --dry              # Dry run (no save)
 *
 * Cloud Function: scrapeActiveNetParksCloudFunction
 * Registry: Group 2
 */

const { launchBrowser, createStealthPage } = require('./helpers/puppeteer-config');
const { saveEventsWithGeocoding } = require('./helpers/event-save-helper');

const SCRAPER_NAME = 'ActiveNet-Parks-Eastern';

// ──────────────────────────────────────────────────────────────────────
// Jurisdiction configurations
// Each entry represents a parks & rec department using ActiveNet
// ──────────────────────────────────────────────────────────────────────

const JURISDICTIONS = [
  // ── Active jurisdictions (verified April 2026) ──
  // Florida
  { slug: 'stpete', city: 'St. Petersburg', state: 'FL', name: 'St. Petersburg Parks & Recreation', county: 'Pinellas' },

  // Georgia
  { slug: 'alpharetta', city: 'Alpharetta', state: 'GA', name: 'Alpharetta Parks & Recreation', county: 'Fulton' },

  // Illinois
  { slug: 'napervilleparks', city: 'Naperville', state: 'IL', name: 'Naperville Park District', county: 'DuPage' },

  // Indiana
  { slug: 'indyparks', city: 'Indianapolis', state: 'IN', name: 'Indy Parks & Recreation', county: 'Marion' },
  { slug: 'carmelclayparks', city: 'Carmel', state: 'IN', name: 'Carmel Clay Parks & Recreation', county: 'Hamilton' },

  // Maryland
  { slug: 'aarecparks', city: 'Annapolis', state: 'MD', name: 'Anne Arundel Recreation & Parks', county: 'Anne Arundel' },

  // Ohio (slug changed from columbusrecparks → columbusrecparks1 as of April 2026)
  { slug: 'columbusrecparks1', city: 'Columbus', state: 'OH', name: 'Columbus Recreation & Parks', county: 'Franklin' },

  // ── Inactive jurisdictions (redirect to activecommunities.com as of April 2026) ──
  // These departments have migrated off the ActiveNet platform.
  // Kept commented out for reference — re-enable if their slugs come back online.
  //
  // { slug: 'birminghamalparks', city: 'Birmingham', state: 'AL', name: 'Birmingham Parks and Recreation', county: 'Jefferson' },
  // { slug: 'huntsvilleal', city: 'Huntsville', state: 'AL', name: 'Huntsville Parks & Recreation', county: 'Madison' },
  // { slug: 'stamfordct', city: 'Stamford', state: 'CT', name: 'Stamford Parks & Recreation', county: 'Fairfield' },
  // { slug: 'greenwichct', city: 'Greenwich', state: 'CT', name: 'Greenwich Parks & Recreation', county: 'Fairfield' },
  // { slug: 'newarkde', city: 'Newark', state: 'DE', name: 'Newark Parks & Recreation', county: 'New Castle' },
  // { slug: 'dprdc', city: 'Washington', state: 'DC', name: 'DC Dept of Parks and Recreation', county: 'District of Columbia' },
  // { slug: 'orlprd', city: 'Orlando', state: 'FL', name: 'Orlando Parks & Recreation', county: 'Orange' },
  // { slug: 'coralgablesfl', city: 'Coral Gables', state: 'FL', name: 'Coral Gables Parks & Recreation', county: 'Miami-Dade' },
  // { slug: 'palmbeachgardens', city: 'Palm Beach Gardens', state: 'FL', name: 'Palm Beach Gardens Parks & Recreation', county: 'Palm Beach' },
  // { slug: 'ftlauderdale', city: 'Fort Lauderdale', state: 'FL', name: 'Fort Lauderdale Parks & Recreation', county: 'Broward' },
  // { slug: 'naples', city: 'Naples', state: 'FL', name: 'Naples Parks & Recreation', county: 'Collier' },
  // { slug: 'roswell', city: 'Roswell', state: 'GA', name: 'Roswell Parks & Recreation', county: 'Fulton' },
  // { slug: 'cobbcountyga', city: 'Marietta', state: 'GA', name: 'Cobb County Parks & Recreation', county: 'Cobb' },
  // { slug: 'champaignparkdistrict', city: 'Champaign', state: 'IL', name: 'Champaign Park District', county: 'Champaign' },
  // { slug: 'parkridgepd', city: 'Park Ridge', state: 'IL', name: 'Park Ridge Park District', county: 'Cook' },
  // { slug: 'desmoinesparks', city: 'Des Moines', state: 'IA', name: 'Des Moines Parks & Recreation', county: 'Polk' },
  // { slug: 'lexingtonky', city: 'Lexington', state: 'KY', name: 'Lexington Parks & Recreation', county: 'Fayette' },
  // { slug: 'howardcountymd', city: 'Columbia', state: 'MD', name: 'Howard County Recreation & Parks', county: 'Howard' },
  // { slug: 'brooklinerec', city: 'Brookline', state: 'MA', name: 'Brookline Recreation', county: 'Norfolk' },
  // { slug: 'newtonma', city: 'Newton', state: 'MA', name: 'Newton Parks & Recreation', county: 'Middlesex' },
  // { slug: 'minneapolisparks', city: 'Minneapolis', state: 'MN', name: 'Minneapolis Park & Recreation Board', county: 'Hennepin' },
  // { slug: 'stpaulparks', city: 'St. Paul', state: 'MN', name: 'St. Paul Parks & Recreation', county: 'Ramsey' },
  // { slug: 'charlottenc', city: 'Charlotte', state: 'NC', name: 'Charlotte Parks & Recreation', county: 'Mecklenburg' },
  // { slug: 'raleighnc', city: 'Raleigh', state: 'NC', name: 'Raleigh Parks & Recreation', county: 'Wake' },
  // { slug: 'wsnc', city: 'Winston-Salem', state: 'NC', name: 'Winston-Salem Recreation', county: 'Forsyth' },
  // { slug: 'maboroughparks', city: 'Marlborough', state: 'NJ', name: 'Marlborough Parks & Recreation', county: 'Monmouth' },
  // { slug: 'nycparks', city: 'New York', state: 'NY', name: 'NYC Parks & Recreation', county: 'New York' },
  // { slug: 'yonkersny', city: 'Yonkers', state: 'NY', name: 'Yonkers Parks & Recreation', county: 'Westchester' },
  // { slug: 'cincinnatirecreation', city: 'Cincinnati', state: 'OH', name: 'Cincinnati Recreation Commission', county: 'Hamilton' },
  // { slug: 'clevelandmetroparks', city: 'Cleveland', state: 'OH', name: 'Cleveland Metroparks', county: 'Cuyahoga' },
  // { slug: 'philaparksrec', city: 'Philadelphia', state: 'PA', name: 'Philadelphia Parks & Recreation', county: 'Philadelphia' },
  // { slug: 'pittsburghpa', city: 'Pittsburgh', state: 'PA', name: 'Pittsburgh Parks & Recreation', county: 'Allegheny' },
  // { slug: 'charlestonsc', city: 'Charleston', state: 'SC', name: 'Charleston Parks & Recreation', county: 'Charleston' },
  // { slug: 'greenvillecountysc', city: 'Greenville', state: 'SC', name: 'Greenville County Recreation', county: 'Greenville' },
  // { slug: 'nashvilleparks', city: 'Nashville', state: 'TN', name: 'Nashville Parks & Recreation', county: 'Davidson' },
  // { slug: 'fairfaxcountyva', city: 'Fairfax', state: 'VA', name: 'Fairfax County Parks & Recreation', county: 'Fairfax' },
  // { slug: 'arlingtonva', city: 'Arlington', state: 'VA', name: 'Arlington Parks & Recreation', county: 'Arlington' },
  // { slug: 'richmondva', city: 'Richmond', state: 'VA', name: 'Richmond Parks & Recreation', county: 'Richmond' },
  // { slug: 'milwaukeerec', city: 'Milwaukee', state: 'WI', name: 'Milwaukee Recreation', county: 'Milwaukee' },
  // { slug: 'madisonwi', city: 'Madison', state: 'WI', name: 'Madison Parks & Recreation', county: 'Dane' },
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
// Month name → number helper
// ──────────────────────────────────────────────────────────────────────

const MONTH_MAP = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseMonthDayYear(monthStr, dayStr, yearStr) {
  const m = MONTH_MAP[monthStr.toLowerCase()];
  if (!m) return null;
  const d = parseInt(dayStr, 10);
  const y = parseInt(yearStr, 10);
  if (!d || !y) return null;
  // Construct ISO string to avoid UTC midnight issues per CLAUDE.md
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return { date, iso };
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
// Scrape a single ActiveNet jurisdiction
// ──────────────────────────────────────────────────────────────────────

async function scrapeJurisdiction(browser, jurisdiction, dryRun) {
  const searchUrl = `https://anc.apm.activecommunities.com/${jurisdiction.slug}/activity/search?onlineSiteId=0&locale=en-US&activity_select_param=2&viewMode=list`;

  console.log(`\n🏫 Scraping ${jurisdiction.name} (${jurisdiction.city}, ${jurisdiction.state})`);
  console.log(`   URL: ${searchUrl}`);
  console.log('-'.repeat(60));

  let page;
  try {
    page = await createStealthPage(browser);
    await page.setViewport({ width: 1280, height: 900 });

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });

    // Detect redirect to activenetwork.com (invalid jurisdiction slug)
    // Also detect slug changes (e.g., columbusrecparks → columbusrecparks1)
    const finalUrl = page.url();
    if (!finalUrl.includes('activecommunities.com')) {
      console.log(`   ⚠️  Redirected to ${finalUrl} — invalid jurisdiction slug, skipping`);
      await page.close();
      return [];
    }
    // If redirected to /home or a different slug, log a warning but try to navigate to search
    if (!finalUrl.includes(`/${jurisdiction.slug}/activity/search`)) {
      const slugMatch = finalUrl.match(/activecommunities\.com\/([^/]+)\//);
      const actualSlug = slugMatch ? slugMatch[1] : null;
      if (actualSlug && actualSlug !== jurisdiction.slug) {
        console.log(`   ⚠️  Slug changed: ${jurisdiction.slug} → ${actualSlug}. Update registry!`);
        // Try navigating with the corrected slug
        const correctedUrl = searchUrl.replace(`/${jurisdiction.slug}/`, `/${actualSlug}/`);
        await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      }
    }

    // ActiveNet SPAs take time to render — wait for activity cards
    try {
      await page.waitForSelector('.activity-card', { timeout: 20000 });
    } catch (e) {
      console.log('   No .activity-card elements found after 20s, skipping');
      await page.close();
      return [];
    }

    // Give extra time for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ── Scroll to load more activities (ActiveNet uses infinite scroll) ──
    // Each scroll loads ~20 more cards. Cap at MAX_CARDS to avoid endless scrolling.
    const MAX_CARDS = 200;
    const MAX_SCROLL_ATTEMPTS = 30;
    let scrollAttempts = 0;

    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      const cardCount = await page.evaluate(() => document.querySelectorAll('.activity-card').length);
      if (cardCount >= MAX_CARDS) {
        console.log(`   Reached ${cardCount} cards (cap: ${MAX_CARDS}), stopping scroll`);
        break;
      }

      // Scroll the load-more trigger into view
      const hasLoadMore = await page.evaluate(() => {
        const lm = document.querySelector('.load-more, .adaptable-load-more-auto');
        if (lm) { lm.scrollIntoView(); return true; }
        window.scrollTo(0, document.body.scrollHeight);
        return false;
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const newCount = await page.evaluate(() => document.querySelectorAll('.activity-card').length);
      if (newCount <= cardCount) {
        // No new cards loaded — we've reached the end
        break;
      }
      scrollAttempts++;
    }

    const totalLoaded = await page.evaluate(() => document.querySelectorAll('.activity-card').length);
    console.log(`   Loaded ${totalLoaded} activity cards after ${scrollAttempts} scroll(s)`);

    // Extract activities from the page using real ActiveNet DOM structure
    // ActiveNet cards use BEM-style classes: .activity-card, .activity-card-info__*
    const rawActivities = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('.activity-card');

      cards.forEach(card => {
        try {
          // Title — inside .activity-card-info__name-link
          const nameEl = card.querySelector('.activity-card-info__name-link');
          const title = nameEl ? nameEl.textContent.trim() : '';
          if (!title || title.length < 3) return;

          // Link — direct enrollable cards have an <a> with href containing dcprogram_id
          const linkEl = nameEl ? nameEl.querySelector('a[href]') : null;
          let link = linkEl ? linkEl.getAttribute('href') : '';
          if (link && !link.startsWith('http')) {
            link = `https://apm.activecommunities.com${link}`;
          }

          // Is this a group header (has sub-activities) or a direct card?
          const isGroup = card.classList.contains('has-sub-activities');

          // Date range — .activity-card-info__dateRange
          // Formats: "March 3, 2026 to April 28, 2026" or "Starts from Tue, Mar 3"
          const dateEl = card.querySelector('.activity-card-info__dateRange');
          const dateText = dateEl ? dateEl.textContent.trim() : '';

          // Time range — .activity-card-info__timeRange
          const timeEl = card.querySelector('.activity-card-info__timeRange');
          const timeText = timeEl ? timeEl.textContent.trim() : '';

          // Location/facility — .activity-card-info__location (only on direct cards)
          const locEl = card.querySelector('.activity-card-info__location');
          const location = locEl ? locEl.textContent.trim() : '';

          // Age range — .activity-card-info__ages
          const ageEl = card.querySelector('.activity-card-info__ages');
          const ageText = ageEl ? ageEl.textContent.trim() : '';

          // Price — .activity-card__fee
          const feeEl = card.querySelector('.activity-card__fee');
          const price = feeEl ? feeEl.textContent.trim() : '';

          // Activity number — .activity-card-info__number
          const numEl = card.querySelector('.activity-card-info__number');
          const actNumber = numEl ? numEl.textContent.trim() : '';

          items.push({
            title,
            link,
            dateText,
            timeText,
            location,
            ageText,
            price,
            actNumber,
            isGroup,
          });
        } catch (e) {
          // Skip problematic elements
        }
      });

      return items;
    });

    console.log(`   Found ${rawActivities.length} raw activities on page`);

    if (rawActivities.length === 0) {
      await page.close();
      return [];
    }

    // ── Filter out platform junk titles ──
    const JUNK_TITLE_PATTERNS = [
      /activeworks\s+endurance/i,
      /activenet\s+academy/i,
      /active\s+network/i,
      /activeworks\s+camp/i,
      /\bACTIVE\.com\b/i,
      /powered\s+by\s+active/i,
    ];

    // Process and filter activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = [];
    let skippedJunk = 0;
    let skippedAdult = 0;
    let skippedNoDate = 0;
    let skippedPast = 0;

    for (const raw of rawActivities) {
      // Skip ActiveNet platform promotional content
      if (JUNK_TITLE_PATTERNS.some(p => p.test(raw.title))) {
        skippedJunk++;
        continue;
      }

      // Skip adult-only
      if (isAdultOnly(raw.title, '')) {
        skippedAdult++;
        continue;
      }

      // Parse date from dateText
      // ActiveNet formats: "March 3, 2026 to April 28, 2026", "Starts from Tue, Mar 3",
      // "April 18, 2026 to February 20, 2027", "Starts from Sat, Mar 7"
      let eventDate = '';
      let isoDate = '';

      if (raw.dateText) {
        // Pattern 1: "Month Day, Year to ..." — extract start date
        const fullDateMatch = raw.dateText.match(/(\w+)\s+(\d{1,2}),\s*(\d{4})/);
        if (fullDateMatch) {
          const result = parseMonthDayYear(fullDateMatch[1], fullDateMatch[2], fullDateMatch[3]);
          if (result) {
            eventDate = result.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            isoDate = result.iso;
          }
        }

        // Pattern 2: "Starts from Day, Mon DD" (no year — assume current/next year)
        if (!eventDate) {
          const startsMatch = raw.dateText.match(/Starts?\s+from\s+\w+,\s+(\w+)\s+(\d{1,2})/i);
          if (startsMatch) {
            let result = parseMonthDayYear(startsMatch[1], startsMatch[2], String(today.getFullYear()));
            if (result) {
              // If parsed date is far in the past, try next year
              if (result.date < new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)) {
                result = parseMonthDayYear(startsMatch[1], startsMatch[2], String(today.getFullYear() + 1));
              }
              if (result) {
                eventDate = result.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                isoDate = result.iso;
              }
            }
          }
        }

        // Pattern 3: MM/DD/YYYY
        if (!eventDate) {
          const slashMatch = raw.dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (slashMatch) {
            const m = parseInt(slashMatch[1], 10);
            const d = parseInt(slashMatch[2], 10);
            const y = parseInt(slashMatch[3], 10);
            const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
            const parsed = new Date(iso);
            if (!isNaN(parsed.getTime())) {
              eventDate = parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              isoDate = iso;
            }
          }
        }
      }

      // Skip events with no date — do NOT fabricate dates
      if (!eventDate) {
        skippedNoDate++;
        continue;
      }

      // Skip past events (check end date if it's a range, else start date)
      if (isoDate) {
        // For date ranges like "March 3, 2026 to April 28, 2026", check end date
        let checkDate = new Date(isoDate);
        if (raw.dateText) {
          const endDateMatch = raw.dateText.match(/to\s+(\w+)\s+(\d{1,2}),\s*(\d{4})/i);
          if (endDateMatch) {
            const endResult = parseMonthDayYear(endDateMatch[1], endDateMatch[2], endDateMatch[3]);
            if (endResult) {
              checkDate = endResult.date;
            }
          }
        }
        if (checkDate < today) {
          skippedPast++;
          continue;
        }
      }

      // Extract time from timeText (separate field from dateText on ActiveNet)
      let startTime = null;
      let endTime = null;
      const timeSource = raw.timeText || raw.dateText || '';
      if (timeSource) {
        const timeRange = timeSource.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
        if (timeRange) {
          startTime = timeRange[1].toUpperCase();
          endTime = timeRange[2].toUpperCase();
        } else {
          const singleTime = timeSource.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
          if (singleTime) {
            startTime = singleTime[1].toUpperCase();
          }
        }
      }

      const ageRange = detectAgeRange(raw.title, raw.ageText || '');
      const { category, subcategory } = detectCategory(raw.title, '');

      // Use actual facility name from card; fall back to jurisdiction name only if empty
      const venue = raw.location || jurisdiction.name;
      const url = raw.link || searchUrl;

      // Build description from available fields
      let description = `${raw.title} at ${venue}`;
      if (raw.ageText) description += `. Ages: ${raw.ageText}`;
      if (raw.price) description += `. Fee: ${raw.price}`;
      description += `. Family-friendly activity in ${jurisdiction.city}, ${jurisdiction.state}.`;

      events.push({
        name: raw.title.substring(0, 200),
        title: raw.title.substring(0, 200),
        date: eventDate,
        eventDate,
        startTime,
        endTime,
        description: description.substring(0, 1500),
        url,
        imageUrl: '',
        venue,
        venueName: venue,
        city: jurisdiction.city,
        state: jurisdiction.state,
        zipCode: '',
        ageRange,
        category,
        source_url: searchUrl,
        scraper_name: `${SCRAPER_NAME}-${jurisdiction.slug}`,
        metadata: {
          sourceName: jurisdiction.name,
          sourceUrl: searchUrl,
          scrapedAt: new Date().toISOString(),
          scraperName: `${SCRAPER_NAME}-${jurisdiction.slug}`,
          platform: 'activenet',
          state: jurisdiction.state,
          county: jurisdiction.county,
        },
      });
    }

    if (skippedJunk > 0) console.log(`   Filtered ${skippedJunk} platform junk titles`);
    if (skippedAdult > 0) console.log(`   Filtered ${skippedAdult} adult-only activities`);
    if (skippedNoDate > 0) console.log(`   Skipped ${skippedNoDate} activities with no date`);
    if (skippedPast > 0) console.log(`   Skipped ${skippedPast} past activities`);

    console.log(`   ${events.length} family-friendly events after filtering`);
    await page.close();
    return events;

  } catch (error) {
    console.error(`   Error scraping ${jurisdiction.name}: ${error.message}`);
    if (page) await page.close().catch(() => {});
    return [];
  }
}

// ──────────────────────────────────────────────────────────────────────
// Main scraper
// ──────────────────────────────────────────────────────────────────────

async function scrapeActiveNetParks(statesToScrape, dryRun) {
  console.log('\n' + '='.repeat(60));
  console.log('🏫 ACTIVENET PARKS & RECREATION SCRAPER (Eastern US)');
  console.log('='.repeat(60));
  if (dryRun) {
    console.log('🔍 DRY RUN MODE — events will be extracted but NOT saved');
  }

  let configs = JURISDICTIONS;
  if (statesToScrape && statesToScrape.length > 0) {
    configs = JURISDICTIONS.filter(j => statesToScrape.includes(j.state));
  }

  if (configs.length === 0) {
    console.error('No jurisdictions matched the state filter');
    return {};
  }

  console.log(`\n📍 Scraping ${configs.length} jurisdiction(s)\n`);

  const browser = await launchBrowser();
  const stateResults = {};
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    for (const jurisdiction of configs) {
      const events = await scrapeJurisdiction(browser, jurisdiction, dryRun);

      if (events.length > 0 && !dryRun) {
        // Build venue entries for geocoding
        const venueMap = new Map();
        for (const event of events) {
          const key = (event.venue || jurisdiction.name).toLowerCase();
          if (!venueMap.has(key)) {
            venueMap.set(key, {
              name: event.venue || jurisdiction.name,
              city: jurisdiction.city,
              state: jurisdiction.state,
              address: '',
              zipCode: '',
              url: event.url,
              county: jurisdiction.county,
            });
          }
        }

        const venues = Array.from(venueMap.values());

        try {
          const result = await saveEventsWithGeocoding(events, venues, {
            scraperName: `${SCRAPER_NAME}-${jurisdiction.slug}`,
            state: jurisdiction.state,
            category: 'parks-rec',
            platform: 'activenet',
          });

          console.log(`   Result: ${result.saved} saved, ${result.skipped} skipped, ${result.errors} errors`);
          totalSaved += result.saved;
          totalSkipped += result.skipped;
          totalErrors += result.errors;
          stateResults[jurisdiction.state] = (stateResults[jurisdiction.state] || 0) + result.saved;
        } catch (saveErr) {
          console.error(`   Save error: ${saveErr.message}`);
          totalErrors += events.length;
        }
      } else if (events.length > 0 && dryRun) {
        console.log(`   [DRY RUN] Would save ${events.length} events`);
        stateResults[jurisdiction.state] = (stateResults[jurisdiction.state] || 0) + events.length;
      }

      // Delay between jurisdictions to avoid rate limiting
      if (jurisdiction !== configs[configs.length - 1]) {
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
  console.log('ACTIVENET PARKS & REC SCRAPING COMPLETE!\n');
  console.log('Summary:');
  console.log(`   Jurisdictions scraped: ${configs.length}`);
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

  scrapeActiveNetParks(statesToScrape, DRY_RUN)
    .then(() => {
      console.log('\nScraper completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('\nScraper failed:', err);
      process.exit(1);
    });
}

async function scrapeActiveNetParksCloudFunction() {
  try {
    const result = await scrapeActiveNetParks();
    return { success: true, scraper: SCRAPER_NAME, result };
  } catch (err) {
    console.error('Cloud Function Error:', err);
    return { success: false, scraper: SCRAPER_NAME, error: err.message };
  }
}

module.exports = {
  scrapeActiveNetParks,
  scrapeActiveNetParksCloudFunction,
  JURISDICTIONS,
};
