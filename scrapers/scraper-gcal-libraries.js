/**
 * Google Calendar (ICS) library scraper — multi-state
 *
 * WHY THIS EXISTS
 * Some libraries publish their whole programme through an embedded Google Calendar iframe.
 * The host page carries no event markup at all — Somerset County Library's events.php has a
 * 493-character body and no dates — so no DOM scraper can ever read them. The events are
 * public though: every embedded calendar exposes an ICS feed at
 *   https://calendar.google.com/calendar/ical/<CALENDAR_ID>/public/basic.ics
 * which is what this scraper reads.
 *
 * Finding the calendar IDs for a new site: open the events page, look at the <iframe src>,
 * and collect every `src=` parameter. They look like
 * `somelibrary.org_jh8uo8466kov1vth331eje1t7s@group.calendar.google.com`.
 *
 * Recurrence matters here: library storytimes are almost always RRULE events, so expanding
 * them is the difference between one row and a term's worth of sessions.
 */

const ical = require('node-ical');
const { saveEventsWithGeocoding } = require('./event-save-helper');

// Registry keys in this family are exactly `GoogleCalendar-<ST>`. Each state below
// configures exactly ONE library, so the bare key is the correct scraper_name per
// CLAUDE.md's "one site -> exactly the registry key" rule.
// IF A STATE EVER GAINS A SECOND LIBRARY this must become `<key>-<siteSlug>`
// (slug from the listing URL hostname), or the two sites collapse onto one name and
// violate the "No aggregation, ever" rule in AGE-RANGE-AUDIT.md.
//
// 2026-08-23: this nearly changed, and the near-miss is worth recording. Two Georgia
// candidates were queued from the platform-mismatch pass and would have made GA the
// first two-library state, so the per-site slug was actually implemented — then BOTH
// were rejected on identity before wiring (see the note above the Pittsfield entry).
// The slug was reverted rather than left in place: with one library per state the bare
// key is what the rule above prescribes, and a speculative rename would have churned
// attribution on MD/MA/SC's existing rows for nothing.
// 2026-09-06: THE SECOND LIBRARY ARRIVED, so the rule above now applies for real.
// Seven libraries were relocated here from the WordPress-* families in one pass, and
// three states went multi-library at once: VT gained Cobleigh and Hartland, NY gained
// Phillips Free and Sidney Memorial, MA gained Leverett alongside Ashby. A bare
// `GoogleCalendar-VT` would put two distinct libraries under one scraper_name, which
// is exactly the collapse AGE-RANGE-AUDIT.md's "No aggregation, ever" rule forbids.
//
// The slug is the listing URL's hostname subdomain, "www" stripped, lowercased —
// the same derivation buildScraperName() uses in the LibCal and LibraryCalendar
// families, so the three read alike.
//
// SINGLE-LIBRARY STATES KEEP THE BARE KEY. MD, SC and NC configure exactly one
// library each, and CLAUDE.md's "one site -> exactly the registry key" rule applies
// to them; slugging those would churn attribution on MD's and SC's existing rows for
// no gain, which is precisely why the 2026-08-23 near-miss reverted its slug.
const GENERIC_HOST_LABELS = new Set(['www', 'events', 'calendar', 'lib', 'library']);

function siteSlug(url) {
  try {
    const labels = new URL(url).hostname.toLowerCase().split('.');
    while (labels.length > 1 && GENERIC_HOST_LABELS.has(labels[0])) labels.shift();
    return (labels[0] || '').replace(/[^a-z0-9-]/g, '');
  } catch (_) {
    return '';
  }
}

function scraperNameFor(library) {
  const key = `GoogleCalendar-${library.state}`;
  const siblings = LIBRARIES.filter(l => l.state === library.state).length;
  if (siblings <= 1) return key;
  const slug = siteSlug(library.url);
  return slug ? `${key}-${slug}` : key;
}

const MAX_DAYS_AHEAD = 90;

const LIBRARIES = [
  {
    name: 'Somerset County Library',
    // The human-facing listing page — this is what source_url records, not the ICS endpoint.
    url: 'https://somelibrary.org/events.php',
    calendarIds: [
      'somelibrary.org_jh8uo8466kov1vth331eje1t7s@group.calendar.google.com',
      'somelibrary.org_91sbe6asf4phciq8lcn2rlaf1k@group.calendar.google.com',
      'somelibrary.org_gcd8aeg949e1f9aobi8j418ab8@group.calendar.google.com',
      'somelibrary.org_qkhpuchqt21ec8sic3fu9chveo@group.calendar.google.com',
      'somelibrary.org_9871gfpt9lofa0cotrpciutcsg@group.calendar.google.com',
    ],
    city: 'Princess Anne', state: 'MD', zipCode: '21853', county: 'Somerset',
  },
  // ---------------------------------------------------------------------------
  // SEVEN LIBRARIES RELOCATED 2026-09-06, working down the UNVERIFIABLE backlog.
  //
  // All seven sat in the WordPress-* families carrying the verdict "events live in a
  // cross-origin Google Calendar iframe" — diagnosed months ago, never acted on,
  // because the `_pending` GCAL-IFRAME-CLUSTER note said the harvest needed Puppeteer
  // and a rotation was usually running. That turned out to be a false constraint:
  // every one of these embeds is SERVER-RENDERED, so scripts/harvest-gcal-calendar-ids.js
  // reads the iframe src over a plain HTTPS GET with no Chrome at all.
  //
  // IDENTITY WAS PROVEN PER LIBRARY FROM ITS OWN PAGE before any wiring — street
  // address, ZIP and phone area code, never name similarity, because these configs
  // come from the {city}library.org generator that produced 355 cross-state
  // collisions. Every ZIP and area code below agrees with its claimed state.
  //
  // EVERY FEED WAS VERIFIED LIVE before wiring, not just resolved: VEVENT count and
  // newest DTSTART are recorded on each entry. That check exists because Berkeley
  // Sangaree below is a live-looking embed fronting a calendar abandoned in 2024 —
  // an embed that resolves is not an embed that publishes.
  {
    // Was WordPress-NC, "Claremont Branch Library" and "Catawba County Library" both
    // pointing at this one URL. ONE ENTRY, NOT TWO: the system publishes a single
    // calendar covering every branch, and the ICS LOCATION field names the branch, so
    // Claremont and the rest arrive as distinct venues off this one feed — the same
    // shape as Somerset County above. Wiring two entries would double-scrape it.
    // Identity: catawbacountync.gov is the county's own .gov domain; main library at
    // 115 West C Street, Newton NC 28658.
    // Feed verified 2026-09-06: 4,371 VEVENTs, newest DTSTART 2026-09-30, RRULE present.
    name: 'Catawba County Library',
    url: 'https://www.catawbacountync.gov/county-services/library/',
    calendarIds: ['9pksonccdgqsmoeg591g8d26es@group.calendar.google.com'],
    city: 'Newton', state: 'NC', zipCode: '28658', county: 'Catawba',
  },
  {
    // Was WordPress-CT. Found 2026-09-09 by the platform sweep of the UNVERIFIABLE
    // backlog — it had sat at UNVERIFIABLE with the usual "renders but shows no dated
    // events" comment, which is exactly right and exactly useless: the events are in a
    // Google Calendar the WordPress DOM extractor structurally cannot see.
    //
    // IDENTITY FROM THE LIVE PAGE, not the name: torringtonlibrary.org titles itself
    // "Torrington Library", prints CT 06790 and carries area code 860 — Connecticut.
    // Worth stating because Torrington is also a town in Wyoming.
    //
    // FEED VERIFIED THROUGH THIS SCRAPER'S OWN occurrences() EXPANSION, not just fetched:
    // 950 VEVENTs, 148 RRULEs, and 25 programme occurrences inside the 60-day window, with
    // ZERO opening-hours rows. That second number is the one that matters — a large feed
    // can still contribute nothing upcoming, and an hours-only feed contributes noise
    // (see the Mary S Biesecker rejection recorded in the platform sweep report).
    // A deliberately bogus calendar id was probed alongside and returned HTTP 404, so a
    // 200 here means a real calendar rather than a permissive endpoint.
    // Sample titles carry explicit ages — "Wiggles & Giggles (ages 0-2)", "Budding
    // Bookworms (3-5)" — so these should bracket properly rather than land in All Ages.
    name: 'Torrington Library',
    url: 'https://www.torringtonlibrary.org/events',
    calendarIds: ['rrrgevjde9ahgrj4s2m13ner5g@group.calendar.google.com'],
    city: 'Torrington', state: 'CT', zipCode: '06790', county: 'Litchfield',
  },
  {
    // Was WordPress-VT. Identity: Cobleigh Public Library, 14 Depot St., Lyndonville
    // VT 05851, ph (802) 626-5475 — 802 is Vermont's only area code.
    // The configured URL was a hop short of the calendar, which the GCAL-IFRAME-CLUSTER
    // note had already flagged: /events links onward to /events-calendar/events-calendar/.
    // The embed is on the site root, so that is what is configured here.
    // Feed verified 2026-09-06: 349 VEVENTs, newest DTSTART 2027-01-01, RRULE present.
    name: 'Cobleigh Public Library',
    url: 'https://www.cobleighlibrary.org/',
    calendarIds: ['c_ac5c397c802369af304a15e290070a70ac65d37f9aed31f3901329ce4103871b@group.calendar.google.com'],
    city: 'Lyndonville', state: 'VT', zipCode: '05851', county: 'Caledonia',
  },
  {
    // Was WordPress-VT. Identity: Hartland Public Library, 153 U.S. Route 5, Hartland
    // VT 05048, ph 802-436-2473.
    // Feed verified 2026-09-06: 1,333 VEVENTs, newest DTSTART 2027-06-01, RRULE present.
    name: 'Hartland Public Library',
    url: 'https://www.hartlandlibraryvt.org/calendar',
    calendarIds: ['042q6gmk2e8i40j3lrd763ca4c@group.calendar.google.com'],
    city: 'Hartland', state: 'VT', zipCode: '05048', county: 'Windsor',
  },
  {
    // Was WordPress-NY. Identity: the page titles itself "Homer Phillips Free Library",
    // 37 South Main St., Homer NY 13077, ph (607) 749-4616 — 607 is upstate New York.
    // The audit row reads "Phillips Free Library" and that name is kept, so the row
    // still joins to its audit history; the town is recorded in city.
    // Feed verified 2026-09-06: 290 VEVENTs, newest DTSTART 2026-10-07, RRULE present.
    name: 'Phillips Free Library',
    url: 'https://phillipsfreelibrary.org/',
    calendarIds: ['c_22cccd61b467c408880c354644db6f335849f6dd4c303a8a0a9f97c92969487d@group.calendar.google.com'],
    city: 'Homer', state: 'NY', zipCode: '13077', county: 'Cortland',
  },
  {
    // Was WordPress-NY. Identity: Sidney Memorial Public Library, 8 River Street,
    // Sidney NY 13838, ph (607) 563-1200.
    // Feed verified 2026-09-06: 1,148 VEVENTs, newest DTSTART 2026-12-31, RRULE present.
    name: 'Sidney Memorial Public Library',
    url: 'https://www.sidneylibrary.org/',
    calendarIds: ['nsrlk8k469pai5plcsorttn9v8@group.calendar.google.com'],
    city: 'Sidney', state: 'NY', zipCode: '13838', county: 'Delaware',
  },
  {
    // Was WordPress-PA. Identity: the page titles itself "Union Library of Hatborough",
    // 243 S York Rd, Hatboro PA 19040, ph (215) 672-1420 — 215 is greater Philadelphia.
    // Note the town is "Hatboro" while the institution is "of Hatborough"; both spellings
    // are genuine and the audit row's name is kept so the row keeps its history.
    // The calendar id is a plain gmail address rather than a group calendar, which is
    // ordinary for a small library and reads fine from the same public ICS endpoint.
    // Feed verified 2026-09-06: 707 VEVENTs, newest DTSTART 2027-02-11, RRULE present.
    name: 'Union Library Company Of Hatborough',
    url: 'https://www.hatborolibrary.org/',
    calendarIds: ['unionlibrarycohatboro@gmail.com'],
    city: 'Hatboro', state: 'PA', zipCode: '19040', county: 'Montgomery',
  },
  {
    // Was WordPress-MA. Identity: Leverett Library, 75 Montague Rd., Leverett MA 01054,
    // ph 413-548-9220 — 413 is western Massachusetts.
    // Feed verified 2026-09-06: 1,344 VEVENTs, newest DTSTART 2027-06-25, RRULE present.
    name: 'Leverett Library',
    url: 'https://www.leverettlibrary.org/',
    calendarIds: ['leverettlibrary@gmail.com'],
    city: 'Leverett', state: 'MA', zipCode: '01054', county: 'Franklin',
  },
  // ---------------------------------------------------------------------------
  {
    // Relocated from WordPress-MA 2026-08-18. ashbylibrary.org/calendar/ carries no event
    // markup — the programme is entirely inside a cross-origin Google Calendar iframe, so
    // the WordPress DOM extractor read 0. Calendar id decoded from the iframe's base64
    // `src` param; feed verified live at 236 VEVENTs before wiring.
    name: 'Ashby Free Public Library',
    url: 'https://www.ashbylibrary.org/calendar/',
    calendarIds: ['c_bp448k87aqnv76berdhrgb1io8@group.calendar.google.com'],
    city: 'Ashby', state: 'MA', zipCode: '01431', county: 'Middlesex',
  },
  {
    // Relocated from WordPress-SC 2026-08-18. Same cross-origin Google Calendar iframe
    // pattern as Ashby, and the platform diagnosis was correct — but this calendar is
    // ABANDONED, so expect a permanent 0 here and do NOT re-diagnose it.
    // The feed returns 40 VEVENTs whose most recent DTSTART is 2024-04-13, i.e. the
    // library stopped publishing to it over two years ago. Kept configured rather than
    // deleted so it self-heals if they ever resume; it costs ~0.5s per rotation.
    // The branch's real events belong to Berkeley County Library System, already
    // configured in LibCal-SC (berkeleylibrarysc.libcal.com, cid=-1 = all branches) —
    // but that is NOT proof Sangaree is covered and it was deliberately not treated as
    // such: that entry currently yields only 9 stored rows under generic venue names
    // ("Activity Room", "Mobile Library"), none of them Sangaree. The only Sangaree rows
    // in the DB come incidentally from MacaroniKid-SC-northcharleston (5 upcoming).
    // OPEN COVERAGE GAP; the real fix is why LibCal-SC under-collects Berkeley branches.
    // URL CORRECTED 2026-08-23 (Defect A). It read summervillelibrary.org/events, which
    // is Summerville PENNSYLVANIA — the same guessed {city}library.org shape that put 400
    // entries on colliding hosts. This one was harmless in practice, because the scraper
    // reads the Google Calendar feed above and never fetches `url` at all, so no
    // Pennsylvania events were ever ingested under a South Carolina name. It still had to
    // change: `url` is what LIBRARY-SITE-AUDIT.md links a reader to, and it fed gate 2 as
    // a live collision.
    //
    // This is a CORRECTION, not a disable — the first in this defect. Every other
    // colliding entry was guarded because its true owner was another state's library; here
    // the entry is legitimately South Carolina's and only the URL was wrong.
    // berkeleylibrarysc.org verified live: "Berkeley County Library System, South
    // Carolina", phone 843-719-4223 (843 = SC), and /locations-and-hours/ returns 200.
    name: 'Berkeley County Library - Sangaree Library',
    url: 'https://berkeleylibrarysc.org/locations-and-hours/',
    calendarIds: ['1688576522e507061425c53184e34f7054e3b8af8dd47ec00491cba17e6fb71d@group.calendar.google.com'],
    city: 'Summerville', state: 'SC', zipCode: '29483', county: 'Dorchester',
  },
  // TWO GEORGIA CANDIDATES REJECTED 2026-08-23, BEFORE WIRING. Both were surfaced by
  // scripts/detect-site-platform.js as running a Google Calendar embed, and both had a
  // live feed with upcoming events — cairolibrary.org 91 VEVENTs (6 upcoming), and
  // thomsonlibrary.org 316. The platform diagnosis was right and the feeds were real.
  //
  // They were still wrong, because a working feed says nothing about WHOSE feed it is:
  //   cairolibrary.org  = Cairo Public Library, 15 Railroad Ave, Cairo, NY 12413,
  //                       (518) 622-9864. NEW YORK. Roddenbery Memorial Library in
  //                       Cairo GEORGIA is a different institution that happens to sit
  //                       in a town of the same name. WordPress-GA had already removed
  //                       this entry on 2026-08-11 for exactly this reason, and that
  //                       note was correct.
  //   thomsonlibrary.org = "Thomson Illinois York Township Public Library", 815-259-2480.
  //                       ILLINOIS. Not Thomson-McDuffie County Library, Georgia.
  //
  // Wiring either would have imported another state's events under a Georgia library's
  // name — the precise failure the whole URL-collision effort exists to undo, arrived at
  // from a new direction. This is why reports/platform-mismatches.md says a platform
  // marker proves the platform is REFERENCED, not that it holds that library's events.
  // Do not re-add these without an address that matches the Georgia entry.
  {
    // Relocated from WordPress-VT 2026-08-23. Note the configured host is
    // pittsfieldlibrary.com and the stderr log had been reporting
    // net::ERR_BLOCKED_BY_CLIENT against it for weeks — which, per the finding recorded in
    // resolve-collision-host-state.js, is Chrome refusing the request locally and says
    // nothing about the site. Fetched with node:http it answers immediately.
    // Feed verified: 1004 VEVENTs, X-WR-CALNAME "Pittsfield Library". The calendar id here
    // is a plain gmail.com address rather than the usual group.calendar.google.com form,
    // which is legitimate for a small library publishing from a single account.
    //
    // EXPECT A SMALL NUMBER, AND KNOW WHY. The first live run returned 45 occurrences in
    // the 90-day window, of which 39 were "Library OPEN" — this library uses one calendar
    // for both its programme and its opening hours, which is what prompted the
    // opening-hours rules added to isJunkTitle() the same day. Steady state is therefore
    // ~3 real events, not 45. Measured, not estimated: the re-run after those rules landed
    // reported "3 saved, 42 skipped, 39 junk title". A future run reporting 40+ saved rows
    // here means the junk rules have stopped firing, not that the library got busier.
    name: 'Roger Clark Memorial Library',
    url: 'http://www.pittsfieldlibrary.com',
    calendarIds: ['pittsfieldvtlibrary@gmail.com'],
    city: 'Pittsfield', state: 'VT', zipCode: '05762', county: 'Rutland',
  },
];

const icsUrl = id =>
  `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// "August 12, 2026" — the text form the save helper's date normaliser handles reliably.
function formatDate(d) {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

// node-ical returns some fields as { val, params } for parameterised iCal properties.
const plain = v => (v && typeof v === 'object' && 'val' in v ? v.val : v);

// All-day events have a date-only DTSTART; node-ical flags them via datetype.
const isAllDay = ev => ev.datetype === 'date';

/**
 * Every occurrence of one VEVENT that falls inside [from, to].
 * A plain event yields at most one; an RRULE event yields each recurrence, with
 * EXDATEs removed and RECURRENCE-ID overrides applied.
 */
function occurrences(ev, from, to) {
  const out = [];
  if (!ev.start) return out;

  if (!ev.rrule) {
    if (ev.start >= from && ev.start <= to) out.push(new Date(ev.start));
    return out;
  }

  let dates = [];
  try {
    dates = ev.rrule.between(from, to, true);
  } catch (e) {
    // A malformed RRULE must not take the whole feed down.
    if (ev.start >= from && ev.start <= to) out.push(new Date(ev.start));
    return out;
  }

  const excluded = new Set(
    Object.values(ev.exdate || {}).map(d => new Date(d).toDateString())
  );
  dates.forEach(d => {
    if (!excluded.has(new Date(d).toDateString())) out.push(new Date(d));
  });
  return out;
}

async function scrapeGCalLibraries(stateFilter) {
  const targets = stateFilter
    ? LIBRARIES.filter(l => l.state === stateFilter)
    : LIBRARIES;
  const events = [];
  const now = new Date();
  const until = new Date();
  until.setDate(until.getDate() + MAX_DAYS_AHEAD);

  for (const library of targets) {
    console.log(`📍 ${library.name} (${library.city}, ${library.state})`);
    console.log(`\n📚 Scraping ${library.name}...`);
    const before = events.length;
    const seen = new Set();   // a library often lists one event on several of its calendars

    for (const calId of library.calendarIds) {
      const shortId = calId.split('@')[0].split('_').pop();
      try {
        const parsed = await ical.async.fromURL(icsUrl(calId));
        const vevents = Object.values(parsed).filter(e => e.type === 'VEVENT');
        let kept = 0;

        for (const ev of vevents) {
          if (String(plain(ev.status) || '').toUpperCase() === 'CANCELLED') continue;
          const title = String(plain(ev.summary) || '').trim();
          if (!title) continue;

          for (const when of occurrences(ev, now, until)) {
            const key = `${title.toLowerCase()}|${when.toDateString()}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const allDay = isAllDay(ev);
            // ICS LOCATION is usually "Crisfield Library, 100 Collins St, Crisfield, MD 21817,
            // USA". Show the branch name as the venue and keep the rest as the address —
            // otherwise every event on the site is titled with a full postal address.
            const loc = String(plain(ev.location) || '').trim();
            let [venueName, ...addressParts] = loc.split(',').map(p => p.trim());

            // A VENUE IS NEITHER A URL NOR A BARE STREET NUMBER. Splitting LOCATION on
            // the first comma works when it opens with a branch name, but ICS LOCATION
            // is free text and two shapes break it, both measured live on 2026-09-06:
            //   - a virtual event whose LOCATION is a meeting link, which stored venues
            //     reading "https://zoom.us/j/117278043" (13 rows) and "Zoom" (3)
            //   - a LOCATION opening with the street, which stored "3107 2nd Ave NW" (1)
            // Same class as the Simpleview date-as-venue bug fixed 2026-09-05: the venue
            // column receiving something that is not a venue, which then reaches the
            // activities table as a place. Fall back to the library's own name and keep
            // the original string as the address, so nothing is lost.
            const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(venueName) || /^zoom$/i.test(venueName);
            const looksLikeStreet = /^\d+\s+\S/.test(venueName);
            if (looksLikeUrl || looksLikeStreet) {
              addressParts = looksLikeUrl ? [] : [venueName, ...addressParts];
              venueName = '';
            }
            events.push({
              name: title,
              venue: venueName || library.name,
              address: addressParts.length ? addressParts.join(', ') : undefined,
              eventDate: formatDate(when),
              startTime: allDay ? null : formatTime(when),
              description: String(plain(ev.description) || '').trim().substring(0, 1000),
              url: library.url,
              state: library.state,
              metadata: {
                sourceName: library.name,
                // The listing page a person can open — NOT the .ics endpoint and NOT the
                // event's own link, per the source_url rule in CLAUDE.md.
                sourceUrl: library.url,
                scrapedAt: new Date().toISOString(),
                scraperName: scraperNameFor(library),
                category: 'library',
                platform: 'google-calendar',
                state: library.state,
              },
            });
            kept++;
          }
        }
        console.log(`   ✅ calendar ${shortId}: ${vevents.length} in feed, ${kept} upcoming`);
      } catch (err) {
        // One dead calendar shouldn't cost us the other four.
        console.log(`   ⚠️ calendar ${shortId} failed: ${err.message}`);
      }
    }
    console.log(`   Found ${events.length - before} events`);
  }

  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

/**
 * Save ONE LIBRARY PER CALL, not one state per call.
 *
 * This is the whole reason per-site scraper_name is safe here, and it is worth
 * understanding before anyone "simplifies" it back to a single call.
 *
 * saveEventsWithGeocoding() BUILDS ITS OWN metadata block and overwrites
 * metadata.scraperName with the options-level `scraperName`. So setting a per-site
 * name in the event's metadata alone does nothing — that is exactly why the same
 * attempt was reverted for LibCal-FL2 on 2026-09-05 and, before it, family-wide on
 * 2026-08-06. The 08-06 revert's stated reason is the sharp edge: verifyAndCleanupEvents()
 * looks existing rows up by that name and DELETES the ones it cannot match, so a
 * write name that differs from the lookup name is a data-loss hazard, not a cosmetic
 * mismatch.
 *
 * Passing one library at a time keeps write name == lookup name by construction:
 * the options carry that library's own scraperName, and `libraries` carries only
 * that library, so verification is scoped to exactly the rows that were just
 * written. No shared helper is touched and the 08-06 hazard cannot arise.
 *
 * The cost is one helper call per library instead of per state — trivial at this
 * family's size, and each call still batches its own events internally.
 */
async function saveToDatabase(events, state) {
  const targets = LIBRARIES.filter(l => !state || l.state === state);
  const totals = { saved: 0, skipped: 0, invalidDate: 0, errors: 0 };

  for (const library of targets) {
    const mine = events.filter(e => e.metadata?.sourceName === library.name);
    if (!mine.length) continue;
    const r = await saveEventsWithGeocoding(mine, [library], {
      scraperName: scraperNameFor(library),
      state: library.state,
      category: 'library',
      platform: 'google-calendar',
    });
    totals.saved += r?.saved || 0;
    totals.skipped += r?.skipped || 0;
    totals.invalidDate += r?.invalidDate || 0;
    totals.errors += r?.errors || 0;
  }
  return totals;
}

async function runState(state) {
  const events = await scrapeGCalLibraries(state);
  if (!events.length) return { found: 0, saved: 0 };
  const result = await saveToDatabase(events, state);
  return {
    found: events.length,
    saved: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0,
  };
}

async function scrapeGCalLibrariesMDCloudFunction() { return runState('MD'); }
async function scrapeGCalLibrariesMACloudFunction() { return runState('MA'); }
async function scrapeGCalLibrariesSCCloudFunction() { return runState('SC'); }
async function scrapeGCalLibrariesVTCloudFunction() { return runState('VT'); }
// Added 2026-09-06 with the seven-library relocation. NC and PA hold one library each,
// so they keep the bare registry key; NY holds two and slugs per site.
async function scrapeGCalLibrariesNCCloudFunction() { return runState('NC'); }
async function scrapeGCalLibrariesNYCloudFunction() { return runState('NY'); }
async function scrapeGCalLibrariesPACloudFunction() { return runState('PA'); }
// Added 2026-09-09 with the Torrington relocation. CT holds exactly one library, so it
// keeps the bare registry key per the single-library rule documented at the top of this file.
async function scrapeGCalLibrariesCTCloudFunction() { return runState('CT'); }

module.exports = {
  scrapeGCalLibraries,
  saveToDatabase,
  scrapeGCalLibrariesMDCloudFunction,
  scrapeGCalLibrariesMACloudFunction,
  scrapeGCalLibrariesSCCloudFunction,
  scrapeGCalLibrariesVTCloudFunction,
  scrapeGCalLibrariesNCCloudFunction,
  scrapeGCalLibrariesNYCloudFunction,
  scrapeGCalLibrariesPACloudFunction,
  scrapeGCalLibrariesCTCloudFunction,
};
