#!/usr/bin/env node

/**
 * LIBRARYCALENDAR MULTI-LIBRARY SCRAPER
 *
 * Scrapes events from libraries using LibraryCalendar platform
 *
 * COVERAGE (22 library systems across 5 states):
 *
 * MD:
 * - Howard County Library System
 * - Frederick County Public Libraries
 * - Talbot County Free Library
 * - Caroline County Public Library
 *
 * VA:
 * - Amherst County Public Library
 * - Appomattox Regional Library
 * - Bedford Public Library System
 * - Essex Public Library
 * - Lynchburg Public Library
 * - Petersburg Public Library
 * - Poquoson Public Library
 * - Portsmouth Public Library
 * - Powhatan County Public Library
 * - Waynesboro Public Library
 * - York County Public Library
 *
 * NC:
 * - Forsyth County Public Library
 * - Cumberland County Public Library
 *
 * NJ:
 * - Atlantic County Library System (NEW)
 * - Gloucester County Library System (NEW)
 *
 * SC:
 * - York County Library (NEW)
 *
 * IL:
 * - Bloomingdale Public Library (NEW)
 *
 * Usage:
 *   node scripts/Scraper-event-librarycalendar.js
 */

const { admin, db } = require('./helpers/supabase-adapter');
const { launchBrowser } = require('./puppeteer-config');
const ngeohash = require('ngeohash');
const { categorizeEvent } = require('./event-categorization-helper');
const { generateEventId, generateEventIdFromDetails } = require('./event-id-helper');
const { ScraperLogger, logScraperResult } = require('./scraper-logger');
const { getBranchAddress } = require('./library-addresses');
const { normalizeDateString } = require('./date-utils');
const { linkEventToVenue } = require('./venue-matcher');

// Pre-geocoded branch coordinates for Howard County Library System
// Added 2025-12-03 to fix null coordinates issue
const HOWARD_COUNTY_BRANCHES = {
  'Central': { lat: 39.2112, lng: -76.8584, city: 'Columbia', zipCode: '21044', address: '10375 Little Patuxent Pkwy, Columbia, MD 21044' },
  'East Columbia': { lat: 39.1906, lng: -76.8468, city: 'Columbia', zipCode: '21045', address: '6600 Cradlerock Way, Columbia, MD 21045' },
  'Elkridge': { lat: 39.2125, lng: -76.7138, city: 'Elkridge', zipCode: '21075', address: '6540 Washington Blvd, Elkridge, MD 21075' },
  'Glenwood': { lat: 39.3228, lng: -77.0233, city: 'Cooksville', zipCode: '21723', address: '2350 State Route 97, Cooksville, MD 21723' },
  'Miller': { lat: 39.2715, lng: -76.8619, city: 'Ellicott City', zipCode: '21043', address: '9421 Frederick Rd, Ellicott City, MD 21043' },
  'Savage': { lat: 39.1369, lng: -76.8222, city: 'Laurel', zipCode: '20723', address: '9525 Durness Ln, Laurel, MD 20723' }
};

// Pre-geocoded branch coordinates for Frederick County Public Libraries
// Added 2025-12-03 to fix null coordinates issue
const FREDERICK_COUNTY_BRANCHES = {
  'C. Burr Artz': { lat: 39.4136, lng: -77.4086, city: 'Frederick', zipCode: '21701', address: '110 E Patrick St, Frederick, MD 21701' },
  'Brunswick': { lat: 39.3210, lng: -77.6243, city: 'Brunswick', zipCode: '21716', address: '915 N Maple Ave, Brunswick, MD 21716' },
  'Emmitsburg': { lat: 39.7045, lng: -77.3270, city: 'Emmitsburg', zipCode: '21727', address: '300A S Seton Ave, Emmitsburg, MD 21727' },
  'Middletown': { lat: 39.4431, lng: -77.5467, city: 'Middletown', zipCode: '21769', address: '31 E Green St, Middletown, MD 21769' },
  'Myersville': { lat: 39.5126, lng: -77.5673, city: 'Myersville', zipCode: '21773', address: '8 Harp Pl, Myersville, MD 21773' },
  'Thurmont': { lat: 39.6235, lng: -77.4109, city: 'Thurmont', zipCode: '21788', address: '76 E Moser Rd, Thurmont, MD 21788' },
  'Urbana': { lat: 39.3314, lng: -77.3540, city: 'Urbana', zipCode: '21704', address: '9020 Amelung St, Frederick, MD 21704' },
  'Walkersville': { lat: 39.4853, lng: -77.3529, city: 'Walkersville', zipCode: '21793', address: '2 S Glade Rd, Walkersville, MD 21793' },
  'Point of Rocks': { lat: 39.2756, lng: -77.5393, city: 'Point of Rocks', zipCode: '21777', address: '4008 Ballenger Creek Pike, Point of Rocks, MD 21777' }
};

// Find matching branch from location name
function findBranchCoordinates(locationName, libraryName, libraryState) {
  if (!locationName) return null;

  const locationLower = locationName.toLowerCase();

  // Check Howard County branches
  if (libraryName.includes('Howard County')) {
    for (const [branchName, branchData] of Object.entries(HOWARD_COUNTY_BRANCHES)) {
      if (locationLower.includes(branchName.toLowerCase())) {
        return { name: branchName, ...branchData };
      }
    }
  }

  // Check Frederick County branches
  if (libraryName.includes('Frederick County')) {
    for (const [branchName, branchData] of Object.entries(FREDERICK_COUNTY_BRANCHES)) {
      if (locationLower.includes(branchName.toLowerCase())) {
        return { name: branchName, ...branchData };
      }
    }
  }

  // Fallback: try library-addresses.js for other library systems
  // Extract branch name from location string
  let branchName = locationName;
  // Remove common suffixes like "Branch", "Library" to get core name
  branchName = branchName.replace(/\s+(Branch|Library)\s*$/i, '').trim();

  const branchLocation = getBranchAddress(libraryName, branchName, libraryState);
  if (branchLocation && branchLocation.address) {
    return {
      name: branchName,
      address: branchLocation.address,
      city: branchLocation.city,
      zipCode: branchLocation.zipCode,
      // Note: This won't have lat/lng pre-geocoded, but address is provided
      // The calling code should geocode using this address
      needsGeocoding: true
    };
  }

  return null;
}

const REGISTRY_KEY = 'LibraryCalendar-Libraries';

/**
 * Per-site scraper_name: `LibraryCalendar-Libraries-<siteSlug>`.
 *
 * This scraper covers 22 separate library systems. Until 2026-08-24 it set no
 * metadata.scraperName at all, so flattenEvent() fell back to metadata.sourceName
 * and every row was stored under a library DISPLAY NAME — unjoinable to the
 * registry, and the exact drift CLAUDE.md's naming section describes.
 *
 * The slug is taken from the LibraryCalendar instance SUBDOMAIN (jessamine,
 * howardcounty, frederick…), per the rule that a siteSlug comes from the site's
 * own hostname and never from a display name. Falling back to the bare registry
 * key is deliberate: a wrong slug is worse than an honestly generic one.
 *
 * Safe to change here, unlike the Assabet case: this scraper saves through its own
 * .add() path rather than saveEventsWithGeocoding, so the value is not overwritten,
 * and its dedup lookup keys on metadata.sourceName (not scraperName), so renaming
 * cannot break it. _stableEventId() ignores scraper_name, so no row can duplicate —
 * but rows written before today keep the old display name until they expire, so
 * both will show in the audits for a while.
 */
function scraperNameFor(library) {
  let slug = '';
  try {
    const host = new URL(library.url).host;              // jessamine.librarycalendar.com
    const labels = host.toLowerCase().split('.').filter(Boolean);

    // "www" is not a site identity. Every entry here used to be a
    // {slug}.librarycalendar.com subdomain, so the first label was always meaningful;
    // Knox County (added 2026-08-29) is the first SELF-HOSTED instance, on
    // www.knoxcountylibrary.org, and it slugged to "LibraryCalendar-Libraries-www" —
    // a name that identifies nothing and that every future self-hosted entry would
    // collide with. Skip leading "www"/"www2" and take the registrable domain label
    // instead, which for that host is "knoxcountylibrary".
    while (labels.length > 2 && /^wwwd*$/.test(labels[0])) labels.shift();
    const label = /^wwwd*$/.test(labels[0]) ? (labels[labels.length - 2] || labels[0]) : labels[0];

    slug = (label || '').replace(/[^a-z0-9-]/g, '');
  } catch (e) { /* fall through to the bare key */ }
  return slug ? `${REGISTRY_KEY}-${slug}` : REGISTRY_KEY;
}

// LibraryCalendar Library Systems
const LIBRARY_SYSTEMS = [
  // --- Added 2026-08-27 from the Step 3d backlog, where both were mislabelled
  // platform=bibliocommons. THAT LABEL WAS A RED HERRING and is worth recording: scraping a
  // library home page finds its CATALOG host as readily as its EVENTS host, and for both of
  // these the bibliocommons hit was the catalog (acl.bibliocommons.com is the Allegheny
  // County Library Association catalog). Their events are on LibraryCalendar. Wiring them to
  // BiblioCommons on the strength of the hint would have produced two more zero-event sites.
  // Both instances confirmed live, with notarealsite-xyz.librarycalendar.com as a negative
  // control (ENOTFOUND): grantcounty -> "Upcoming Events | Grant County Public Library",
  // wilkinsburg -> "Upcoming Events | Wilkinsburg Public Library".
  {
    // Added 2026-08-29 from the same backlog. It was in LibCal-TN, where it returned a dead
    // endpoint every run: Memphis is on LibraryCalendar, not LibCal. Confirmed live -
    // memphis.librarycalendar.com/events/upcoming returns 200 titled "Upcoming Events |
    // Memphis Public Libraries". Same red herring as the two entries above, in reverse:
    // a platform name in a config is worth nothing until the feed is checked.
    name: 'Memphis Public Libraries',
    url: 'https://memphis.librarycalendar.com/events/upcoming',
    county: 'Shelby',
    state: 'TN',
    website: 'https://www.memphislibrary.org',
    city: 'Memphis',
    zipCode: '38104'
  },
  {
    // Added 2026-08-29, same class as Memphis directly above and found the same way: it sat
    // in LibCal-TN pointing at knoxlib.libcal.com, which does not resolve at all (the LibCal-TN
    // run this morning logged ERR_NAME_NOT_RESOLVED for it), and its configured website
    // knoxlibrary.org times out. The library is very much alive - knoxlib.org 301s to
    // knoxcountylibrary.org, whose /events redirects to /events/upcoming and renders 45
    // .lc-event cards titled "Upcoming Events | Knox County Public Library".
    //
    // Note the URL is the library's OWN domain, not a {slug}.librarycalendar.com subdomain:
    // this is a self-hosted LibraryCalendar instance (assets served from a Pantheon
    // live-knoxlib bucket). knoxcountylibrary.librarycalendar.com does NOT resolve, so do not
    // "normalize" this entry to the subdomain pattern the neighbours use.
    //
    // Its markup carries explicit audience groups - "Babies and Toddlers", "Preschool",
    // "Elementary Age", "Teens", "Adults" - so these rows should land in real age brackets
    // rather than All Ages.
    name: 'Knox County Public Library',
    url: 'https://www.knoxcountylibrary.org/events/upcoming',
    county: 'Knox',
    state: 'TN',
    website: 'https://www.knoxcountylibrary.org',
    city: 'Knoxville',
    zipCode: '37902'
  },
  {
    // Added 2026-09-02 — same platform-mismatch class as Knox County above, found while
    // completing MASTER-PLAN Phase 7 (SITE-IMPROVEMENT-REVIEW §1.4). It sat in
    // CustomDrupal-Libraries pointing at andersonlibrary.org/events/month and reported
    // "found 0 events" on every run, which looked like an extraction bug in that file.
    // It is not: the site is fast (481ms, HTTP 200, 234KB) and its events are fully
    // server-rendered — the CustomDrupal entry simply had the wrong VIEW and the wrong
    // selectors. /events/month is a month GRID whose markup has no .views-row at all,
    // while /events/upcoming serves 24 dated events in `div.lc-event > article.event-card`
    // with titles in `h3.lc-event__title` — the exact shape this file already parses.
    //
    // The lc-* class prefix is the giveaway: this is a LibraryCalendar instance, not a
    // custom Drupal build, so it belongs here rather than being patched with bespoke
    // selectors in the CustomDrupal file.
    //
    // Self-hosted on the library's own domain like Knox County, NOT a
    // {slug}.librarycalendar.com subdomain — buildScraperName() skips the leading "www"
    // and slugs this to LibraryCalendar-Libraries-andersonlibrary.
    //
    // Real family programming confirmed in the feed: "Movers & Shakers Storytime",
    // "Family Storytime", "Preschool Storytime", "Toddler Storytime".
    name: 'Anderson County Library System',
    url: 'https://www.andersonlibrary.org/events/upcoming',
    county: 'Anderson',
    state: 'SC',
    website: 'https://www.andersonlibrary.org',
    city: 'Anderson',
    zipCode: '29621'
  },
  {
    // Relocated from WordPress-PA on 2026-09-03 (SITE-IMPROVEMENT-REVIEW §2.1,
    // redirect slice). Its WordPress entry pointed at jeffersonhillslibrary.org,
    // which redirects to jeffersonhillspubliclibrary.org — and that site does not
    // host its own calendar: every "Register for a Program" link goes to
    // jeffersonhills.librarycalendar.com.
    //
    // PROVEN LIVE, unlike a LibCal relocation: LibraryCalendar's upcoming view is
    // server-rendered, so a plain fetch of /events/upcoming shows the real feed —
    // 15 events on page 1 of 9, under the header "Upcoming Events | Jefferson
    // Hills Public Library", including "Baby & Me Storytime" and "Crafternoon:
    // Pumpkin Spice Candles". Right institution, real family programming, and
    // enough volume to be worth recovering.
    //
    // Standard {slug}.librarycalendar.com subdomain, so buildScraperName() slugs
    // it to LibraryCalendar-Libraries-jeffersonhills with no www-skipping needed.
    // The WordPress-PA entry stays until a real run stores rows (Worcester rule).
    name: 'Jefferson Hills Public Library',
    url: 'https://jeffersonhills.librarycalendar.com/events/upcoming',
    county: 'Allegheny',
    state: 'PA',
    website: 'https://www.jeffersonhillspubliclibrary.org',
    city: 'Jefferson Hills',
    zipCode: '15025'
  },
  {
    // Relocated from WordPress-KY on 2026-09-03. Its WordPress entry pointed at
    // graveslibrary.org, which is a DIFFERENT INSTITUTION IN A DIFFERENT STATE:
    // Louis T. Graves Memorial Public Library, 18 Maine St, Kennebunkport ME 04046,
    // ph (207) 967-2778 — proven from the live page's own title and contact block
    // through the stealth browser (a plain fetch gets a Cloudflare 403). Classic
    // Defect A: the guessed {city}library.org host belongs to another state.
    //
    // The KY entry had been importing that Maine library's events under state KY
    // and city Louisville — Portland Camera Club, PORT KNITTERS — roughly 1,000
    // miles from where they were stored.
    //
    // The REAL library is confirmed by ZIP: 601 N 17th St, Mayfield KY 42066,
    // ph (270) 247-2911, matching the WordPress entry's own zipCode 42066 and a
    // western-Kentucky area code. That ZIP match is the control that makes this
    // live-page evidence rather than another name guess.
    //
    // It runs LibraryCalendar, not WordPress: /events/upcoming serves 24
    // `div.lc-event > article.event-card` with titles in `h3.lc-event__title` —
    // the exact shape this file parses. Same lc-* tell as Anderson and Knox.
    // The feed even carries LibraryCalendar age-group labels ("Teens", "Adults").
    //
    // Self-hosted on its own domain like Knox and Anderson, so buildScraperName()
    // skips the leading "www" and slugs this to
    // LibraryCalendar-Libraries-gravescountypubliclibrary.
    name: 'Graves County Public Library',
    url: 'https://www.gravescountypubliclibrary.org/events/upcoming',
    county: 'Graves',
    state: 'KY',
    website: 'https://www.gravescountypubliclibrary.org',
    city: 'Mayfield',
    zipCode: '42066'
  },
  {
    // Added 2026-09-05, found by Step 3d's Puppeteer verifier, which reported
    // "event containers present (.event-card:55) but no parseable dates" for the
    // CustomDrupal-Libraries entry that had been returning 0. The containers it
    // saw are `lc-event event-card` with titles in h3.lc-event__title — the same
    // lc-* tell as Knox, Anderson and Graves, so this is a PLATFORM MISMATCH,
    // not selector work on the CustomDrupal file.
    //
    // Two details worth recording. First, /events 301s to /events/month, the
    // MONTH GRID — exactly the Anderson County trap from 2026-09-02 — so the
    // configured URL is /events/upcoming, not the site's own /events.
    // Second, this host is a settled Defect A collision: florencelibrary.org is
    // already GUARDED as "SC, not KY/MA/MS" in three WordPress state files, so
    // SOUTH CAROLINA here is the state those guards agreed on, not a fresh guess.
    //
    // Confirmed live: /events/upcoming returns 200 titled "Florence County
    // Library System" with real dated programming — Author Visit with Kate Salley
    // Palmer (Sep 8 2026), Canasta at the Library (Sep 10), Pressing Issues @ the
    // Library (Sep 10) — carrying branch groups ("Timmonsville Public Library").
    // Self-hosted on its own domain, so buildScraperName() slugs this to
    // LibraryCalendar-Libraries-florencelibrary.
    name: 'Florence County Library System',
    url: 'https://www.florencelibrary.org/events/upcoming',
    county: 'Florence',
    state: 'SC',
    website: 'https://www.florencelibrary.org',
    city: 'Florence',
    zipCode: '29501'
  },
  {
    // Added 2026-09-05 alongside Florence, from the same verifier pass, and it is
    // TWO defects in one entry, so read both before changing it.
    //
    // (1) WRONG STATE. CustomDrupal-Libraries carried this as Rowan County NORTH
    // CAROLINA, Salisbury NC 28144. The live page is Rowan County Public Library,
    // 175 Beacon Hill Rd, MOREHEAD KY 40351, ph (606) 784-7137 — a Kentucky ZIP
    // and an eastern-Kentucky area code. Identity comes from those page-printed
    // addresses, never from the name: both states have a Rowan County, which is
    // exactly how the collision was minted. The control that settles it is that
    // ZIP 40351 matches the WordPress-KY entry's own zipCode byte for byte.
    // Rowan County NC (Rowan Public Library, Salisbury) is therefore an OPEN
    // COVERAGE GAP, not something covered elsewhere — no claim is made about it.
    //
    // (2) WRONG PLATFORM. The site runs LibraryCalendar (35 div.lc-event, 24
    // h3.lc-event__title), so neither the CustomDrupal entry nor the WordPress-KY
    // one could ever read it properly. WordPress-KY did store 23 rows and that is
    // worse than zero, not better: they are DOM debris — "Farmers, US60 W, 801 S",
    // "City Area & Apartments", "Closing" — with one real programme among them.
    //
    // Confirmed live: /events/upcoming returns 200 titled "Upcoming Events | Rowan
    // County Public Library" with real dated programming — Irish Club (Oct 7 2026),
    // Fall Plant Share (Sep 12), Medicinal Foraging w/ Craig Caudill (Sep 15),
    // 3rd Annual Community Card Design Contest (Jun 22 - Sep 30).
    // Self-hosted, so buildScraperName() slugs this to
    // LibraryCalendar-Libraries-rowancountylibrary.
    name: 'Rowan County Public Library',
    url: 'https://www.rowancountylibrary.org/events/upcoming',
    county: 'Rowan',
    state: 'KY',
    website: 'https://www.rowancountylibrary.org',
    city: 'Morehead',
    zipCode: '40351'
  },
  {
    name: 'Grant County Public Library',
    url: 'https://grantcounty.librarycalendar.com/events/upcoming',
    county: 'Grant',
    state: 'KY',
    website: 'https://www.grantlib.org',
    city: 'Williamstown',
    zipCode: '41097'
  },
  {
    name: 'Wilkinsburg Public Library',
    url: 'https://wilkinsburg.librarycalendar.com/events/upcoming',
    county: 'Allegheny',
    state: 'PA',
    website: 'https://wilkinsburglibrary.org',
    city: 'Wilkinsburg',
    zipCode: '15221'
  },
  // Added 2026-08-27. Its own /events path 404s, which is why the first probe found no
  // platform host; the instance is monroeville.librarycalendar.com, titled "Upcoming
  // Events | Monroeville Public Library". Second Allegheny County library in this family.
  {
    name: 'Monroeville Public Library',
    url: 'https://monroeville.librarycalendar.com/events/upcoming',
    county: 'Allegheny',
    state: 'PA',
    website: 'https://www.monroevillelibrary.org',
    city: 'Monroeville',
    zipCode: '15146'
  },
  // --- Five more added 2026-08-27 from the same Step 3d backlog. Each instance is the
  // href the library PUBLISHES ON ITS OWN SITE, and each was then re-fetched directly:
  // all five returned HTTP 200 titled "Upcoming Events | <the right institution>" with
  // ~1,000+ event nodes, against notarealsite-xyz.librarycalendar.com which fails to
  // resolve. McKeesport repeats the catalog red herring noted above — its page links
  // acl.bibliocommons.com too, and that is the Allegheny County CATALOG, not its events.
  //
  // TWO CANDIDATES FROM THIS BATCH WERE REJECTED ON IDENTITY, both of which would have
  // imported ILLINOIS events had the platform hint been trusted:
  //   "Carnegie Library Of Mckeesport - White Oak" (WordPress-PA) is configured at
  //   whiteoaklibrary.org, which is the White Oak Library District in ILLINOIS —
  //   ZIPs 60403/60441/60446, area code 815 — and links whiteoak.librarycalendar.com.
  //   Morton Public Library (WordPress-MS) is configured at mortonlibrary.org, which is
  //   Morton, ILLINOIS — ZIP 61550, area code 309 — and links mortonlibrary.libcal.com.
  // Both are guarded in their own config files instead.
  {
    name: 'Carnegie Library of McKeesport',
    url: 'https://mckeesport.librarycalendar.com/events/upcoming',
    county: 'Allegheny',
    state: 'PA',
    website: 'https://mckeesportlibrary.org',
    city: 'McKeesport',
    zipCode: '15132'
  },
  {
    name: "Haverstraw King's Daughters Public Library",
    url: 'https://haverstraw.librarycalendar.com/events/upcoming',
    county: 'Rockland',
    state: 'NY',
    website: 'https://www.haverstrawlibrary.org',
    city: 'Haverstraw',
    zipCode: '10927'
  },
  {
    // Branch-filtered on purpose. uhls.librarycalendar.com is the whole Upper Hudson
    // Library System; ?branches[77]=88 is the filter Rensselaerville publishes for
    // itself, so this entry stays one library rather than silently becoming a system.
    // NOTE: scraperNameFor() slugs on the SUBDOMAIN, so this stores as
    // LibraryCalendar-Libraries-uhls. If a second UHLS branch is ever added here the
    // two would collapse onto that one name and need a per-branch slug instead.
    name: 'Rensselaerville Public Library',
    url: 'https://uhls.librarycalendar.com/events/month?branches[77]=88',
    county: 'Albany',
    state: 'NY',
    website: 'https://www.rensselaervillelibrary.org',
    city: 'Rensselaerville',
    zipCode: '12147'
  },
  {
    name: 'Schenectady County Public Library',
    url: 'https://schenectady.librarycalendar.com/events/upcoming',
    county: 'Schenectady',
    state: 'NY',
    website: 'https://www.scpl.org',
    city: 'Schenectady',
    zipCode: '12305'
  },
  {
    name: 'Wyandanch Public Library',
    url: 'https://wyandanch.librarycalendar.com/events/upcoming',
    county: 'Suffolk',
    state: 'NY',
    website: 'https://wyandanchlibrary.org',
    city: 'Wyandanch',
    zipCode: '11798'
  },
  // MARYLAND
  {
    name: 'Howard County Library System',
    url: 'https://howardcounty.librarycalendar.com/events/upcoming',
    county: 'Howard',
    state: 'MD',
    website: 'https://hclibrary.org',
    city: 'Columbia',
    zipCode: '21044'
  },
  {
    name: 'Frederick County Public Libraries',
    url: 'https://frederick.librarycalendar.com/events/upcoming',
    county: 'Frederick',
    state: 'MD',
    website: 'https://www.fcpl.org',
    city: 'Frederick',
    zipCode: '21701'
  },
  {
    name: 'Talbot County Free Library',
    url: 'https://talbot.librarycalendar.com/events/upcoming',
    county: 'Talbot',
    state: 'MD',
    website: 'https://www.tcfl.org',
    city: 'Easton',
    zipCode: '21601'
  },
  {
    name: 'Caroline County Public Library',
    url: 'https://carolinecounty.librarycalendar.com/events/upcoming',
    county: 'Caroline',
    state: 'MD',
    website: 'https://carolib.org',
    city: 'Denton',
    zipCode: '21629'
  },

  // VIRGINIA
  {
    name: 'Amherst County Public Library',
    url: 'https://amherstpl.librarycalendar.com/events/upcoming',
    county: 'Amherst',
    state: 'VA',
    website: 'https://amherstpubliclibrary.org',
    city: 'Amherst',
    zipCode: '24521'
  },
  {
    name: 'Appomattox Regional Library',
    url: 'https://appomattox.librarycalendar.com/events/upcoming',
    county: 'Appomattox',
    state: 'VA',
    website: 'https://www.appomattoxlibrary.org',
    city: 'Appomattox',
    zipCode: '24522'
  },
  {
    name: 'Bedford Public Library System',
    url: 'https://bedford.librarycalendar.com/events/upcoming',
    county: 'Bedford',
    state: 'VA',
    website: 'https://www.bedfordvalibrary.org',
    city: 'Bedford',
    zipCode: '24523'
  },
  {
    name: 'Essex Public Library',
    url: 'https://essex.librarycalendar.com/events/upcoming',
    county: 'Essex',
    state: 'VA',
    website: 'https://www.essexpubliclibrary.org',
    city: 'Tappahannock',
    zipCode: '22560'
  },
  // Gloucester County VA REMOVED — gcls.librarycalendar.com belongs to NJ Gloucester County
  // VA Gloucester (gloucesterlibrary.org) does not appear to use LibraryCalendar platform
  // If they do, the subdomain would likely be 'gloucester', not 'gcls'
  {
    name: 'Lynchburg Public Library',
    url: 'https://lynchburg.librarycalendar.com/events/upcoming',
    county: 'Lynchburg city',
    state: 'VA',
    website: 'https://www.lynchburgva.gov/library',
    city: 'Lynchburg',
    zipCode: '24504'
  },
  {
    name: 'Petersburg Public Library',
    url: 'https://petersburg.librarycalendar.com/events/upcoming',
    county: 'Petersburg city',
    state: 'VA',
    website: 'https://www.petersburgva.gov/481/Library',
    city: 'Petersburg',
    zipCode: '23803'
  },
  {
    name: 'Poquoson Public Library',
    url: 'https://poquoson.librarycalendar.com/events/upcoming',
    county: 'Poquoson city',
    state: 'VA',
    website: 'https://www.poquoson-va.gov/government/departments-services/library',
    city: 'Poquoson',
    zipCode: '23662'
  },
  {
    name: 'Powhatan County Public Library',
    url: 'https://powhatancounty.librarycalendar.com/events/upcoming',
    county: 'Powhatan',
    state: 'VA',
    website: 'https://www.powhatanva.gov/203/Library',
    city: 'Powhatan',
    zipCode: '23139'
  },
  {
    name: 'Waynesboro Public Library',
    url: 'https://waynesboro.librarycalendar.com/events/upcoming',
    county: 'Waynesboro city',
    state: 'VA',
    website: 'https://www.waynesboro.va.us/government/library',
    city: 'Waynesboro',
    zipCode: '22980'
  },
  {
    name: 'York County Public Library',
    url: 'https://yorkcountyva.librarycalendar.com/events/upcoming',
    county: 'York',
    state: 'VA',
    website: 'https://www.yorkcounty.gov/369/Library',
    city: 'Yorktown',
    zipCode: '23690'
  },
  {
    name: 'Portsmouth Public Library',
    url: 'https://portsmouthpl.librarycalendar.com/events/upcoming',
    county: 'Portsmouth city',
    state: 'VA',
    website: 'https://www.portsmouthpubliclibrary.org',
    city: 'Portsmouth',
    zipCode: '23704'
  },

  // NORTH CAROLINA
  {
    name: 'Forsyth County Public Library',
    url: 'https://forsythcounty.librarycalendar.com/events/upcoming',
    county: 'Forsyth',
    state: 'NC',
    website: 'https://www.forsyth.cc',
    city: 'Winston-Salem',
    zipCode: '27101'
  },
  {
    name: 'Cumberland County Public Library',
    url: 'https://cumberland.librarycalendar.com/events/upcoming',
    county: 'Cumberland',
    state: 'NC',
    website: 'https://www.cumberland.lib.nc.us',
    city: 'Fayetteville',
    zipCode: '28301'
  },

  // NEW JERSEY
  {
    name: 'Atlantic County Library System',
    url: 'https://atlanticcounty.librarycalendar.com/events/upcoming',
    county: 'Atlantic',
    state: 'NJ',
    website: 'https://atlanticlibrary.org',
    city: 'Mays Landing',
    zipCode: '08330'
  },
  {
    name: 'Gloucester County Library System',
    url: 'https://gcls.librarycalendar.com/events/upcoming',
    county: 'Gloucester',
    state: 'NJ',
    website: 'https://www.gcls.org',
    city: 'Mullica Hill',
    zipCode: '08062'
  },

  // SOUTH CAROLINA
  {
    name: 'York County Library',
    url: 'https://yorkcounty.librarycalendar.com/events/upcoming',
    county: 'York',
    state: 'SC',
    website: 'https://www.yclibrary.org',
    city: 'Rock Hill',
    zipCode: '29730'
  },

  // ILLINOIS
  {
    name: 'Bloomingdale Public Library',
    url: 'https://bloomingdale.librarycalendar.com/events/upcoming',
    county: 'DuPage',
    state: 'IL',
    website: 'https://www.mybpl.org',
    city: 'Bloomingdale',
    zipCode: '60108'
  },

  // KENTUCKY
  // Relocated from WordPress-KY 2026-08-24. Its Step 3d verdict was
  // "extraction-failure: 20 future-dated events visible under Puppeteer" — the
  // right site, real events, scraper returning 0. Reading the live DOM showed why:
  // jesspublib.org/events is a 1KB SHELL that renders no events itself and simply
  // links out to this LibraryCalendar instance, so the WordPress DOM extractor had
  // nothing to find and no selector work could ever have fixed it.
  // Instance confirmed before wiring: /events/upcoming returns HTTP 200, titles
  // itself "Upcoming Events | Jessamine County Public Library" and carries 24
  // per-event /event/<slug> links. First KY entry in this family.
  {
    name: 'Jessamine County Public Library',
    url: 'https://jessamine.librarycalendar.com/events/upcoming',
    county: 'Jessamine',
    state: 'KY',
    website: 'https://www.jesspublib.org',
    city: 'Nicholasville',
    zipCode: '40356'
  }
];

// Use shared geocoding helper with persistent file cache + rate limiting
// This eliminates redundant Nominatim calls that caused massive 429 errors
const { geocodeWithFallback } = require('./helpers/geocoding-helper');

// Parse age range from audience text
function parseAgeRange(audienceText) {
  if (!audienceText) return 'All Ages';

  const lowerText = audienceText.toLowerCase();

  // Check for adult-only indicators
  if (lowerText.match(/adults? only/i) || lowerText === 'adults') {
    return 'Adults';
  }

  // Age-specific ranges
  if (lowerText.match(/babies?|infants?|0-2/i)) return 'Babies & Toddlers (0-2)';
  if (lowerText.match(/toddlers?|preschool|3-5/i)) return 'Preschool (3-5)';
  if (lowerText.match(/children|kids|6-12|elementary/i)) return 'Children (6-12)';
  if (lowerText.match(/teens?|13-17|middle school|high school/i)) return 'Teens (13-17)';
  if (lowerText.match(/family|families|everyone|all ages/i)) return 'All Ages';

  return 'All Ages';
}

// Scrape events from LibraryCalendar library
async function scrapeLibraryEvents(library, browser) {
  console.log('\n\x1b[36m📍📍📍📍📍━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📍📍📍📍\x1b[0m');
  console.log(`📍 ${library.name} (${library.county} County, ${library.state})`);
  console.log(`   URL: ${library.url}`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    await page.goto(library.url, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Wait for events to load — the /events/upcoming page renders SSR event cards
    await page.waitForSelector('.lc-event, article.event-card, body', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract events from the upcoming view using lc-event selectors
    const events = await page.evaluate(() => {
      const results = [];
      const seenTitles = new Set();

      // LibraryCalendar upcoming view: div.lc-event > article.event-card
      const eventCards = document.querySelectorAll('div.lc-event, article.event-card');

      eventCards.forEach(el => {
        try {
          // Get the article element (may be el itself or a child)
          const article = el.tagName === 'ARTICLE' ? el : el.querySelector('article.event-card');
          if (!article) return;

          // Title from h3.lc-event__title > a.lc-event__link
          const titleEl = article.querySelector('h3.lc-event__title a.lc-event__link, a.lc-event__link, h3 a');
          if (!titleEl) return;
          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;
          if (seenTitles.has(title)) return;
          seenTitles.add(title);

          // URL from the link
          const url = titleEl.href || '';

          // Date from lc-date-icon spans
          let eventDate = '';
          const monthEl = article.querySelector('.lc-date-icon__item--month');
          const dayEl = article.querySelector('.lc-date-icon__item--day');
          const yearEl = article.querySelector('.lc-date-icon__item--year');
          const dayNameEl = article.querySelector('.lc-date-icon__item--day-name');
          if (monthEl && dayEl && yearEl) {
            const month = monthEl.textContent.trim();
            const day = dayEl.textContent.trim();
            const year = yearEl.textContent.trim();
            const dayName = dayNameEl ? dayNameEl.textContent.trim() : '';
            eventDate = dayName ? `${dayName}, ${month} ${day}, ${year}` : `${month} ${day}, ${year}`;
          }

          // Time from lc-event-info-item--time
          let time = '';
          const timeEl = article.querySelector('.lc-event-info-item--time, .lc-event-info-item.lc-event-info-item--time');
          if (timeEl) {
            time = timeEl.textContent.trim();
          }

          // Audience/age from color indicators
          let audience = '';
          const colorsEl = article.querySelector('.lc-event-info__item--colors');
          if (colorsEl) {
            audience = colorsEl.textContent.trim();
          }
          // Also check color-indicator classes for age groups
          if (!audience) {
            const indicators = article.querySelectorAll('.lc-event__color-indicator');
            const ages = [];
            indicators.forEach(ind => {
              const label = ind.querySelector('.visually-hidden');
              if (label) {
                const match = label.textContent.match(/"([^"]+)"/);
                if (match) ages.push(match[1]);
              }
            });
            if (ages.length > 0) audience = ages.join(', ');
          }

          // Category from categories item
          let programType = '';
          const catEl = article.querySelector('.lc-event-info__item--categories');
          if (catEl) {
            programType = catEl.textContent.trim();
          }

          // Branch/location from lc-event-info__item--locations
          let location = '';
          const locEl = article.querySelector('.lc-event-info__item--locations, .lc-event__location');
          if (locEl) {
            location = locEl.textContent.trim();
          }

          if (title && eventDate) {
            const rawDate = time ? `${eventDate} ${time}` : eventDate;
            results.push({
              name: title,
              eventDate: rawDate,
              venue: location,
              description: '',
              url: url,
              audience: audience,
              programType: programType
            });
          }
        } catch (err) {
          // Skip malformed entries
        }
      });

      return results;
    });

    console.log(`   Found ${events.length} events`);

    // Process each event
    for (const event of events) {
      try {
        // Parse age range and skip adult-only events
        const ageRange = parseAgeRange(event.audience);

        if (ageRange === 'Adults') {
          skipped++;
          continue;
        }

        // Try to find pre-geocoded branch coordinates first
        let coordinates = null;
        let branchInfo = null;
        if (event.venue) {
          branchInfo = findBranchCoordinates(event.venue, library.name, library.state);
          if (branchInfo) {
            if (branchInfo.lat && branchInfo.lng) {
              // Pre-geocoded coordinates available
              coordinates = { latitude: branchInfo.lat, longitude: branchInfo.lng };
            } else if (branchInfo.needsGeocoding && branchInfo.address) {
              // Branch found in library-addresses.js but needs geocoding
              const fullAddress = `${branchInfo.address}, ${branchInfo.city}, ${library.state} ${branchInfo.zipCode}`;
              coordinates = await geocodeWithFallback(fullAddress, {
                city: branchInfo.city || library.city,
                zipCode: branchInfo.zipCode || library.zipCode,
                state: library.state,
                county: library.county,
                venueName: event.venue,
                sourceName: library.name
              });
            }
          }

          // Fall back to generic geocoding if no branch match or geocoding failed
          if (!coordinates) {
            coordinates = await geocodeWithFallback(`${event.venue}, ${library.city}, ${library.county} County, ${library.state}`, {
              city: library.city,
              zipCode: library.zipCode,
              state: library.state,
              county: library.county,
              venueName: event.venue,
              sourceName: library.name
            });
          }
        }

        // Use categorization helper
        const { parentCategory, displayCategory, subcategory } = categorizeEvent({
          name: event.name,
          description: event.description || event.programType
        });

        // Normalize date format to "Month Day, Year Time"
        const normalizedDate = normalizeDateString(event.eventDate);

        // Build event document
        const eventDoc = {
          name: event.name,
          venue: event.venue || library.name,
          eventDate: normalizedDate,
          scheduleDescription: normalizedDate,
          parentCategory,
          displayCategory,
          subcategory,
          ageRange: ageRange,
          cost: 'Free',
          description: (event.description || '').substring(0, 1000),
          moreInfo: event.programType || '',
          state: library.state,
          location: {
            name: event.venue || library.name,
            address: branchInfo ? branchInfo.address : '',
            city: branchInfo ? branchInfo.city : library.city,
            zipCode: branchInfo ? branchInfo.zipCode : library.zipCode,
            coordinates: coordinates
          },
          contact: {
            website: event.url || library.website,
            phone: ''
          },
          url: event.url || library.website,
          metadata: {
            source: 'LibraryCalendar Scraper',
            sourceName: library.name,
            // Must be set EXPLICITLY. flattenEvent() reads metadata.scraperName
            // first and silently falls back to metadata.sourceName when it is
            // absent — which is exactly what happened here: every row this
            // scraper has ever written carries a library DISPLAY NAME as its
            // scraper_name ("Jessamine County Public Library"), which joins to no
            // registry key and is the FREE_TEXT drift class CLAUDE.md forbids.
            // Found 2026-08-24 while relocating Jessamine into this family.
            scraperName: scraperNameFor(library),
            // source_url was NULL on every row for the same reason — nothing set a
            // listing URL. library.url IS the site's own calendar page, which is
            // what this field is defined to hold (never the individual event URL).
            sourceUrl: library.url,
            county: library.county,
            state: library.state,
            addedDate: admin.firestore.FieldValue.serverTimestamp()
          },
          filters: {
            isFree: true,
            ageRange: ageRange
          }
        };

        // Add geohash if we have coordinates
        if (coordinates) {
          eventDoc.geohash = ngeohash.encode(coordinates.latitude, coordinates.longitude, 7);
        }

        // Check for duplicates
        const existing = await db.collection('events')
          .where('name', '==', eventDoc.name)
          .where('eventDate', '==', eventDoc.eventDate)
          .where('metadata.sourceName', '==', library.name)
          .limit(1)
          .get();

        if (existing.empty) {
          
        // Link event to venue using venue-matcher
        const activityId = await linkEventToVenue(eventDoc);
        if (activityId) {
          eventDoc.activityId = activityId;
        }

        const addResult = await db.collection('events').add(eventDoc);
        if (addResult.skipped) {
          console.log(`  ⏭️  ${addResult.skipReason}`);
        } else if (addResult.duplicate) {
          // 23505: the row already existed, nothing was written. Counting this as
          // an import is what let collapsed-id scrapers report healthy NEW counts
          // while saving nothing (see SCRAPER-FIX-LOG.jsonl 2026-08-10).
          skipped++;
        } else {
          console.log(`  ✅ ${event.name.substring(0, 60)}${event.name.length > 60 ? '...' : ''}`);
          imported++;
        }
        } else {
          skipped++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`  ❌ Error processing event:`, error.message);
        failed++;
      }
    }

    await page.close();

  } catch (error) {
    console.error(`  ❌ Error scraping ${library.name}:`, error.message);
    failed++;
  }

  return { imported, skipped, failed };
}

// Main scraper function
async function scrapeLibraryCalendarLibraries() {
  console.log('\n📚 LIBRARYCALENDAR MULTI-LIBRARY SCRAPER');
  console.log('='.repeat(60));
  console.log('Coverage: 22 libraries across MD, VA, NC, NJ & SC\n');

  // Initialize logger with per-site tracking
  const logger = new ScraperLogger('LibraryCalendar-MD-VA', 'events', {
    source: 'librarycalendar'
  });

  const browser = await launchBrowser();

  try {
    for (const library of LIBRARY_SYSTEMS) {
      // Start tracking this site
      logger.startSite(library.name, library.calendarUrl, {
        county: library.county,
        state: library.state
      });

      try {
        const { imported, skipped, failed } = await scrapeLibraryEvents(library, browser);

        // Track per-site stats (updates both site AND aggregate totals)
        logger.trackFound(imported + skipped);
        for (let i = 0; i < imported; i++) logger.trackNew();
        for (let i = 0; i < skipped; i++) logger.trackDuplicate();
        for (let i = 0; i < failed; i++) logger.trackError({ message: 'Processing error' });
      } catch (error) {
        console.error(`  ❌ Error scraping ${library.name}:`, error.message);
        logger.trackError(error);
      }

      logger.endSite();
    }
  } finally {
    await browser.close();
  }

  // Log to database with aggregate + per-site breakdown
  const result = await logger.finish();

  return { imported: result.stats.new, skipped: result.stats.duplicates, failed: result.stats.errors };
}

// Cloud Function wrapper
async function scrapeLibraryCalendarLibrariesCloudFunction() {
  console.log('\n📚 LibraryCalendar Libraries Scraper - Cloud Function');
  console.log('='.repeat(60));

  try {
    const result = await scrapeLibraryCalendarLibraries();

    return {
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
      message: 'LibraryCalendar libraries scraper completed'
    };
  } catch (error) {
    console.error('Error in LibraryCalendar scraper:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  scrapeLibraryCalendarLibraries()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Scraper failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeLibraryCalendarLibraries, scrapeLibraryCalendarLibrariesCloudFunction };
