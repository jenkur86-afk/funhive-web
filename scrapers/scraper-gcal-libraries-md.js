/**
 * Google Calendar (ICS) library scraper — Maryland
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

const SCRAPER_NAME = 'GoogleCalendar-MD';
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

async function scrapeGCalLibrariesMD() {
  const events = [];
  const now = new Date();
  const until = new Date();
  until.setDate(until.getDate() + MAX_DAYS_AHEAD);

  for (const library of LIBRARIES) {
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
            const [venueName, ...addressParts] = loc.split(',').map(p => p.trim());
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
                scraperName: SCRAPER_NAME,
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

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'MD',
    category: 'library',
    platform: 'google-calendar',
  });
}

async function scrapeGCalLibrariesMDCloudFunction() {
  const events = await scrapeGCalLibrariesMD();
  if (!events.length) return { found: 0, saved: 0 };
  const result = await saveToDatabase(events);
  return {
    found: events.length,
    saved: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0,
  };
}

module.exports = { scrapeGCalLibrariesMD, saveToDatabase, scrapeGCalLibrariesMDCloudFunction };
