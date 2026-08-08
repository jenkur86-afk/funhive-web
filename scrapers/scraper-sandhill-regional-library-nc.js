/**
 * Sandhill Regional Library System (NC) — LibGuides + embedded LibCal scraper
 *
 * WHY THIS EXISTS
 * The 5-county Sandhill Regional Library System (Anson, Hoke, Montgomery,
 * Moore, Richmond counties — 15 branches) migrated its public site from
 * srls.info (WordPress) to LibGuides; srls.info now 301-redirects to
 * srls.libguides.com. scraper-wordpress-libraries-nc.js had 5 entries (Moore
 * County Library, Pinebluff Public Library, Robbins Area Branch, Leath
 * Memorial Library, Montgomery County Library) all pointed at srls.info —
 * wrong platform, no matching DOM, guaranteed zero forever.
 *
 * LibGuides itself carries no event data on its own pages. The real calendar
 * is an embedded LibCal FullCalendar widget
 * (api3.libcal.com/embed_calendar.php), confirmed live 2026-08-07 — but it is
 * ONE shared instance per audience (children/teens/adults), not per branch.
 * Branch names are reliably embedded in the event title instead (e.g.
 * "Carthage Preschool Storytime", "Biscoe: Movie at the Library", "Troy:
 * Friday Movies in the Children's Room"), so this scraper keyword-matches
 * each title against the system's branches (via event-save-helper's
 * findLibraryForEvent, using event.venueName = the raw title) to attribute
 * events to the correct physical location and address rather than lumping
 * everything under one system-wide venue.
 *
 * Branch name/address/city/county/zip verified live 2026-08-07 via web
 * search against each county/library's own listing; also recorded in
 * helpers/library-addresses.js under 'Sandhill Regional Library System' for
 * reuse by detectLibraryBranch()-based backfill scripts.
 */

const { launchBrowser } = require('./helpers/puppeteer-config');
const { saveEventsWithGeocoding } = require('./event-save-helper');

const SCRAPER_NAME = 'SandhillRegional-NC';

// Order matters: findLibraryForEvent() substring-matches event.venueName
// against lib.name and returns the FIRST hit, and libraries[0] is also the
// fallback when no branch keyword appears in the title. Keep the system HQ
// (Carthage) first as that fallback.
// The listing page a person would actually open — NOT the embed endpoint and
// NOT any individual event's own URL, per the source_url rule in CLAUDE.md.
// Declared before LIBRARIES so the array below can reference it.
const LISTING_URL = 'https://srls.libguides.com/c.php?g=824539&p=5958576';

// url is required here even though every branch shares one system-wide calendar:
// saveEventsWithGeocoding() in event-save-helper.js sets metadata.sourceUrl (the
// events.source_url column) from library.url, NOT from this scraper's own
// event.metadata.sourceUrl — omitting it left source_url NULL on every saved row
// (found live 2026-08-08, 97/97 rows).
const LIBRARIES = [
  { name: 'Carthage', address: '101 Saunders St', city: 'Carthage', state: 'NC', zipCode: '28327', county: 'Moore', url: LISTING_URL },
  { name: 'Mount Gilead', address: '110 W Allenton St', city: 'Mount Gilead', state: 'NC', zipCode: '27306', county: 'Montgomery', url: LISTING_URL },
  { name: 'Wadesboro', address: '120 S Greene St', city: 'Wadesboro', state: 'NC', zipCode: '28170', county: 'Anson', url: LISTING_URL },
  { name: 'Raeford', address: '334 N Main St', city: 'Raeford', state: 'NC', zipCode: '28376', county: 'Hoke', url: LISTING_URL },
  { name: 'Biscoe', address: '307 Page St', city: 'Biscoe', state: 'NC', zipCode: '27209', county: 'Montgomery', url: LISTING_URL },
  { name: 'Candor', address: '138 S School Rd', city: 'Candor', state: 'NC', zipCode: '27229', county: 'Montgomery', url: LISTING_URL },
  { name: 'Star', address: '222 S Main St', city: 'Star', state: 'NC', zipCode: '27356', county: 'Montgomery', url: LISTING_URL },
  { name: 'Troy', address: '215 W Main St', city: 'Troy', state: 'NC', zipCode: '27371', county: 'Montgomery', url: LISTING_URL },
  { name: 'Aberdeen', address: '100 Poplar St', city: 'Aberdeen', state: 'NC', zipCode: '28315', county: 'Moore', url: LISTING_URL },
  { name: 'Pinebluff', address: '305 E Baltimore Ave', city: 'Pinebluff', state: 'NC', zipCode: '28373', county: 'Moore', url: LISTING_URL },
  { name: 'Robbins', address: '161 E Magnolia Dr', city: 'Robbins', state: 'NC', zipCode: '27325', county: 'Moore', url: LISTING_URL },
  { name: 'Vass', address: '128 Seaboard St', city: 'Vass', state: 'NC', zipCode: '28394', county: 'Moore', url: LISTING_URL },
  { name: 'Leath', address: '412 E Franklin St', city: 'Rockingham', state: 'NC', zipCode: '28379', county: 'Richmond', url: LISTING_URL },
  { name: 'Rockingham', address: '412 E Franklin St', city: 'Rockingham', state: 'NC', zipCode: '28379', county: 'Richmond', url: LISTING_URL },
  { name: 'Hamlet', address: '302 Main St', city: 'Hamlet', state: 'NC', zipCode: '28345', county: 'Richmond', url: LISTING_URL },
  { name: 'Ellerbe', address: '279 2nd St', city: 'Ellerbe', state: 'NC', zipCode: '28338', county: 'Richmond', url: LISTING_URL }
];

// The LibGuides "Calendar of Events" page embeds three audience-segmented
// LibCal calendars (no per-branch split) — iid/cal_id found via WebFetch on
// srls.libguides.com's Children/Teens/Adults event pages, 2026-08-07.
const CALENDARS = [
  { label: 'children', calId: 8821 },
  { label: 'teens', calId: 8822 },
  { label: 'adults', calId: 8823 }
];
const IID = 4321;

function embedUrl(calId) {
  return `https://api3.libcal.com/embed_calendar.php?iid=${IID}&cal_id=${calId}&w=800&h=600&dv=month`;
}

async function scrapeSandhillRegionalLibrary() {
  const browser = await launchBrowser();
  const events = [];
  const seen = new Set(); // the same event can appear on more than one audience calendar

  try {
    for (const cal of CALENDARS) {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      try {
        await page.goto(embedUrl(cal.calId), { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // FullCalendar month view. Each event link's date lives on its ancestor
        // day cell's data-date attribute (YYYY-MM-DD), not on the link itself.
        const rawEvents = await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('a[href*="/event/"]').forEach(a => {
            const linkText = a.textContent.trim();
            if (!linkText || linkText.length < 3) return;
            const cell = a.closest('td[data-date], .fc-day[data-date], [data-date]');
            const dataDate = cell ? cell.getAttribute('data-date') : null;
            if (!dataDate) return;
            out.push({ text: linkText, url: a.href, dataDate });
          });
          return out;
        });

        console.log(`   ${cal.label} calendar: found ${rawEvents.length} entries`);

        for (const raw of rawEvents) {
          // LibCal renders link text as "10amEvent Title" / "2:30pmEvent Title"
          const timeMatch = raw.text.match(/^(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
          const time = timeMatch ? timeMatch[1] : '';
          const title = (timeMatch ? raw.text.substring(timeMatch[0].length) : raw.text).trim();
          if (!title) continue;

          const key = `${title.toLowerCase()}|${raw.dataDate}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const [y, m, d] = raw.dataDate.split('-').map(Number);
          const dt = new Date(y, m - 1, d);
          const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          const eventDateStr = `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}${time ? ' ' + time : ''}`;

          events.push({
            name: title,
            // findLibraryForEvent() substring-matches this against LIBRARIES[].name
            // to resolve the real branch from the title text (e.g. "Carthage...").
            venueName: title,
            eventDate: eventDateStr,
            url: raw.url,
            state: 'NC',
            metadata: {
              sourceName: 'Sandhill Regional Library System',
              sourceUrl: LISTING_URL,
              scrapedAt: new Date().toISOString(),
              scraperName: SCRAPER_NAME,
              category: 'library',
              platform: 'libcal-embed',
              state: 'NC'
            }
          });
        }
      } catch (err) {
        console.log(`   ⚠️ ${cal.label} calendar failed: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NC',
    category: 'library',
    platform: 'libcal-embed',
  });
}

async function scrapeSandhillRegionalLibraryCloudFunction() {
  const events = await scrapeSandhillRegionalLibrary();
  if (!events.length) return { found: 0, saved: 0 };
  const result = await saveToDatabase(events);
  return {
    found: events.length,
    saved: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0,
  };
}

module.exports = {
  scrapeSandhillRegionalLibrary,
  saveToDatabase,
  scrapeSandhillRegionalLibraryCloudFunction
};
