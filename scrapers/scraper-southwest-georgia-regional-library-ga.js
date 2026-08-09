/**
 * Southwest Georgia Regional Library System (GA) — Revize calendar JSON scraper
 *
 * WHY THIS EXISTS
 * WordPress-GA carried "Decatur County - Gilbert H. Gragg Library" on
 * bainbridgelibrary.org, which times out (confirmed twice, 2026-08-09) — a
 * fabricated {city}library.org seed domain like the rest of that family. The
 * real institution is the Southwest Georgia Regional Library System, whose
 * calendar at swgrl.org/calendar.php is a FullCalendar.js widget: no server-
 * rendered event markup at all, so neither the WordPress DOM extractor nor the
 * TEC helpers can see anything there.
 *
 * The widget is fed by the Revize CMS's own JSON handler, found by capturing
 * network requests during a Puppeteer render. That endpoint returns the whole
 * calendar as clean structured JSON — title, ISO start, location, description,
 * url, allDay — so this scraper reads it directly with axios and needs no
 * browser at all. Verified live 2026-08-09: 261 events, branch attribution via
 * each event's `primary_calendar_name`.
 *
 * COVERS ALL THREE BRANCHES, not just Decatur. Decatur was the one FunHive had
 * configured, but it is one of three real libraries sharing this calendar, and
 * the other two had upcoming events that FunHive was getting none of. Branch
 * activity at build time: Decatur 103 events (newest 2026-07-30, the most
 * active branch — simply between programming cycles, not dead), Seminole 47,
 * Miller 29.
 *
 * Branch names/addresses confirmed from swgrl.org's own site, 2026-08-09.
 */

const axios = require('axios');
const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');

const SCRAPER_NAME = 'SouthwestGeorgia-GA';

// The page a person would actually open. NOT the JSON endpoint and NOT an
// individual event's own URL, per the source_url rule in CLAUDE.md.
const LISTING_URL = 'https://swgrl.org/calendar.php';

// The widget's own data source, captured from swgrl.org/calendar.php's network
// traffic. The querystring identifies the Revize tenant and is required.
const FEED_URL = 'https://swgrl.org/_assets_/plugins/revizeCalendar/calendar_data_handler.php'
  + '?webspace=southwestgeorgialibraryga&relative_revize_url=//webgen1.revize.com&protocol=https:';

// Keyed by the feed's `primary_calendar_name`. Every url is the listing page:
// saveEventsWithGeocoding sets metadata.sourceUrl (the source_url column) from
// library.url, not from the event's own metadata — omitting it saved NULLs on
// every row of SandhillRegional-NC on 2026-08-08. Written as literal strings
// rather than a shared constant so static tooling can parse them (a variable
// reference made that same scraper read as 0 sites in the site report).
const LIBRARIES = [
  {
    name: 'Decatur County - Gilbert H. Gragg Library',
    calendarName: 'Decatur County-Gilbert H. Gragg Library',
    address: '301 S Monroe St', city: 'Bainbridge', state: 'GA', zipCode: '39819', county: 'Decatur',
    url: 'https://swgrl.org/calendar.php',
    siteSlug: 'decatur',
  },
  {
    name: 'Miller County - James W. Merritt, Jr. Memorial Library',
    calendarName: 'Miller County-James W. Merritt, Jr. Memorial Library',
    address: '259 E Main St', city: 'Colquitt', state: 'GA', zipCode: '39837', county: 'Miller',
    url: 'https://swgrl.org/calendar.php',
    siteSlug: 'miller',
  },
  {
    name: 'Seminole County Public Library',
    calendarName: 'Seminole County Public Library',
    address: '103 W 4th St', city: 'Donalsonville', state: 'GA', zipCode: '39845', county: 'Seminole',
    url: 'https://swgrl.org/calendar.php',
    siteSlug: 'seminole',
  },
];

// System-wide programming carries no branch of its own; attribute it to the
// regional HQ in Bainbridge, which is also the Decatur County branch address.
const SYSTEM_CALENDAR = 'Southwest Georgia Regional Library';

/**
 * Calendars in the feed that are NOT physical branches and must never be saved.
 *
 * 'Main' matters most: it holds two "Revize Test Event" rows whose location is
 * "150 Kirts Blvd Troy, MI 48084" — the CMS VENDOR's own office in Michigan.
 * Ingesting those would plant Michigan coordinates under a Georgia library,
 * which is exactly the cross-state contamination this project keeps unwinding.
 * The virtual series have no physical venue, so a branch address would be a lie.
 */
const NON_BRANCH_CALENDARS = new Set([
  'Main',
  'Virtual Author Talks',
  'Virtual Library Speaker Talks',
]);

function findLibrary(calendarName) {
  if (calendarName === SYSTEM_CALENDAR) return LIBRARIES[0];
  return LIBRARIES.find(l => l.calendarName === calendarName) || null;
}

async function scrapeSouthwestGeorgiaLibraries() {
  const events = [];
  let raw;
  try {
    const res = await axios.get(FEED_URL, {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: LISTING_URL, Accept: 'application/json' },
    });
    raw = res.data;
  } catch (err) {
    console.log(`   ❌ Revize feed unreachable: ${err.message}`);
    return events;
  }
  if (!Array.isArray(raw)) {
    console.log('   ❌ Revize feed did not return a JSON array — endpoint or tenant may have changed');
    return events;
  }

  console.log(`   Feed returned ${raw.length} calendar entries`);
  const perLibrary = new Map();
  let skippedNonBranch = 0, skippedUnknown = 0;

  for (const ev of raw) {
    const calName = (ev.primary_calendar_name || '').trim();
    if (!calName || NON_BRANCH_CALENDARS.has(calName)) { skippedNonBranch++; continue; }

    const library = findLibrary(calName);
    if (!library) {
      // A new branch, or a renamed calendar. Surfaced rather than silently dropped
      // so it can be added deliberately with a verified address.
      skippedUnknown++;
      console.log(`   ⚠️ Unmapped calendar "${calName}" — not saved; add it to LIBRARIES with a verified address`);
      continue;
    }

    const title = (ev.title || '').trim();
    if (!title || !ev.start) continue;

    // start is ISO local, e.g. "2026-08-13T16:00:00". Hand the date half to the
    // shared date normalizer as a plain "Month D, YYYY" string and pass the time
    // separately, which is the shape saveEventsWithGeocoding expects.
    const [datePart, timePart] = String(ev.start).split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    if (!y || !m || !d) continue;
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const eventDate = `${MONTHS[m - 1]} ${d}, ${y}`;

    let startTime = null;
    if (!ev.allDay && timePart) {
      const [hh, mm] = timePart.split(':').map(Number);
      if (Number.isFinite(hh) && Number.isFinite(mm)) {
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        startTime = `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
      }
    }

    perLibrary.set(library.name, (perLibrary.get(library.name) || 0) + 1);
    events.push({
      title,
      date: eventDate,
      startTime,
      description: String(ev.desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500),
      // The feed's own `url` is often an external registration link rather than an
      // event page, so fall back to the listing page instead of saving a stray domain.
      url: /^https?:\/\//i.test(ev.url || '') ? ev.url : LISTING_URL,
      venueName: library.name,
      location: library.name,
      metadata: {
        sourceName: library.name,
        sourceUrl: LISTING_URL,
        scrapedAt: new Date().toISOString(),
        // Per-branch, not the bare SCRAPER_NAME — saveToDatabase() below calls
        // saveEventsWithGeocoding() once per branch with this same value as its
        // scraperName option, which is the field that actually reaches the DB
        // (event-save-helper.js's own metadata block ignores this one). Kept in
        // sync here anyway so the event object is self-consistent.
        scraperName: `${SCRAPER_NAME}-${library.siteSlug}`,
        category: 'library',
        platform: 'revize-calendar',
        state: 'GA',
        city: library.city,
        zipCode: library.zipCode,
      },
    });
  }

  LIBRARIES.forEach(l => console.log(`📍 ${l.name} (${l.city}, GA)\n   Found ${perLibrary.get(l.name) || 0} events`));
  if (skippedNonBranch) console.log(`   (skipped ${skippedNonBranch} non-branch/virtual entries)`);
  if (skippedUnknown) console.log(`   (skipped ${skippedUnknown} entries on unmapped calendars)`);
  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

// event-save-helper.js's saveEventsWithGeocoding() always writes its OWN
// scraperName option into metadata.scraperName, ignoring whatever an
// individual event object sets — so one call covering all three branches
// would collapse them onto a single scraper_name (caught by
// scripts/check-scraper-names.js as COLLAPSED, 2026-08-09). Call it once per
// branch instead, each with its own '<SCRAPER_NAME>-<siteSlug>', matching
// CLAUDE.md's "one distinct scraper_name per site" rule. verifyAndCleanupEvents
// (which looks up existing events by this same scraperName) then correctly
// scopes cleanup to that branch's own events rather than the whole system.
async function saveToDatabase(events) {
  const totals = { saved: 0, duplicates: 0, skipped: 0, errors: 0, invalidDate: 0 };
  for (const library of LIBRARIES) {
    const branchEvents = events.filter(e => e.venueName === library.name);
    if (!branchEvents.length) continue;
    const result = await saveEventsWithGeocoding(branchEvents, [library], {
      scraperName: `${SCRAPER_NAME}-${library.siteSlug}`,
      state: 'GA',
      category: 'library',
      platform: 'revize-calendar',
    });
    totals.saved += result?.saved || 0;
    totals.duplicates += result?.duplicates ?? result?.skipped ?? 0;
    totals.errors += result?.errors || 0;
    totals.invalidDate += result?.invalidDate || 0;
  }
  return totals;
}

async function scrapeSouthwestGeorgiaLibrariesCloudFunction() {
  console.log('☁️ Running Southwest Georgia Regional Library System as Cloud Function');
  const events = await scrapeSouthwestGeorgiaLibraries();
  if (!events.length) {
    await logScraperResult(SCRAPER_NAME, { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  const stats = {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.duplicates ?? result?.skipped ?? 0,
    invalidDate: result?.invalidDate || 0,
  };
  await logScraperResult(SCRAPER_NAME, stats, { dataType: 'events' });
  return stats;
}

async function main() {
  const events = await scrapeSouthwestGeorgiaLibraries();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  scrapeSouthwestGeorgiaLibraries,
  saveToDatabase,
  scrapeSouthwestGeorgiaLibrariesCloudFunction,
};
