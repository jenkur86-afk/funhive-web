const { launchBrowser } = require('./puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');

/**
 * Assabet Interactive Library Calendar Scraper
 * States: MA, NH, RI, ME, NY, NJ — the key says NH-MA for historical reasons; see the
 *          note above the 2026-09-06 block for why it was not renamed.
 * Coverage: 61 libraries using the Assabet Interactive calendar platform
 * URL pattern: https://[slug].assabetinteractive.com/calendar/
 */

const LIBRARIES = [
  { name: 'Chelmsford Public Library', slug: 'chelmsfordlibrary', eventsUrl: 'https://chelmsfordlibrary.assabetinteractive.com/calendar/', city: 'Chelmsford', state: 'MA', zipCode: '01824' },
  // RELOCATED FROM WordPress-{state} 2026-09-07 (batch 2). Each library's own
  // page referenced this platform host, and the destination was then fetched and
  // judged on what IT says, not on name similarity: every entry below returned
  // HTTP 200 with a <title> naming that same library. Two candidates from the
  // same batch were REJECTED on exactly this check and are guarded in their
  // WordPress files instead, not relocated -- Hammond Free Library NY, whose
  // LibraryCalendar instance titles itself "Hammond Public Library" on area code
  // 219 (INDIANA), and Reddick Public Library FL, whose host prints Ottawa,
  // IL 61350 and area code 815. Both are the {city}library.org guess again.
  { name: 'Billerica Public Library', slug: 'billericalibrary', eventsUrl: 'https://billericalibrary.assabetinteractive.com/calendar/', city: 'Billerica', state: 'MA', zipCode: '01821' },
  { name: 'Merrimac Public Library', slug: 'merrimaclibrary', eventsUrl: 'https://merrimaclibrary.assabetinteractive.com/calendar/', city: 'Merrimac', state: 'MA', zipCode: '01860' },
  // New Hampshire
  { name: 'Dover Public Library', slug: 'dovernh', eventsUrl: 'https://dovernh.assabetinteractive.com/calendar/', city: 'Dover', state: 'NH', zipCode: '03820' },
  { name: 'Derry Public Library', slug: 'derrypl', eventsUrl: 'https://derrypl.assabetinteractive.com/calendar/', city: 'Derry', state: 'NH', zipCode: '03038' },
  { name: 'Leach Library', slug: 'londonderrynh', eventsUrl: 'https://londonderrynh.assabetinteractive.com/calendar/', city: 'Londonderry', state: 'NH', zipCode: '03053' },
  { name: 'Wadleigh Memorial Library', slug: 'wadleighlibrary', eventsUrl: 'https://wadleighlibrary.assabetinteractive.com/calendar/', city: 'Milford', state: 'NH', zipCode: '03055' },
  { name: 'Lane Memorial Library', slug: 'hampton', eventsUrl: 'https://hampton.assabetinteractive.com/calendar/', city: 'Hampton', state: 'NH', zipCode: '03842' },
  { name: 'Goffstown Public Library', slug: 'goffstownlibrary', eventsUrl: 'https://goffstownlibrary.assabetinteractive.com/calendar/', city: 'Goffstown', state: 'NH', zipCode: '03045' },
  { name: 'Bedford Public Library', slug: 'bedfordnhlibrary', eventsUrl: 'https://bedfordnhlibrary.assabetinteractive.com/calendar/', city: 'Bedford', state: 'NH', zipCode: '03110' },
  { name: 'Amherst Town Library', slug: 'amherstlibrary', eventsUrl: 'https://amherstlibrary.assabetinteractive.com/calendar/', city: 'Amherst', state: 'NH', zipCode: '03031' },
  { name: 'Nesmith Library', slug: 'nesmithlibrary', eventsUrl: 'https://nesmithlibrary.assabetinteractive.com/calendar/', city: 'Windham', state: 'NH', zipCode: '03087' },
  // Moved here 2026-07-06 from scraper-libcal-libraries-nh.js: Kelley Library
  // is on Assabet Interactive, not LibCal. Its old LibCal-NH config
  // (cityofsalemlibrary.libcal.com) was actually Salem, OREGON's library
  // system (Pacific Time, "West Salem Branch") — a wrong-subdomain
  // false-positive that would have imported mismatched out-of-state events.
  { name: 'Kelley Library', slug: 'kelleylibrary', eventsUrl: 'https://kelleylibrary.assabetinteractive.com/calendar/', city: 'Salem', state: 'NH', zipCode: '03079' },
  // Massachusetts
  { name: 'Thomas Crane Public Library', slug: 'thomascranelibrary', eventsUrl: 'https://thomascranelibrary.assabetinteractive.com/calendar/', city: 'Quincy', state: 'MA', zipCode: '02169' },
  { name: 'Somerville Public Library', slug: 'somervillepubliclibrary', eventsUrl: 'https://somervillepubliclibrary.assabetinteractive.com/calendar/', city: 'Somerville', state: 'MA', zipCode: '02143' },
  { name: 'Haverhill Public Library', slug: 'haverhillpl', eventsUrl: 'https://haverhillpl.assabetinteractive.com/calendar/', city: 'Haverhill', state: 'MA', zipCode: '01830' },
  { name: 'Malden Public Library', slug: 'maldenpubliclibrary', eventsUrl: 'https://maldenpubliclibrary.assabetinteractive.com/calendar/', city: 'Malden', state: 'MA', zipCode: '02148' },
  { name: 'Taunton Public Library', slug: 'tauntonlibrary', eventsUrl: 'https://tauntonlibrary.assabetinteractive.com/calendar/', city: 'Taunton', state: 'MA', zipCode: '02780' },
  { name: 'Weymouth Public Libraries', slug: 'weymouth', eventsUrl: 'https://weymouth.assabetinteractive.com/calendar/', city: 'Weymouth', state: 'MA', zipCode: '02188' },
  { name: 'Chicopee Public Library', slug: 'chicopeepubliclibrary', eventsUrl: 'https://chicopeepubliclibrary.assabetinteractive.com/calendar/', city: 'Chicopee', state: 'MA', zipCode: '01013' },
  { name: 'Pollard Memorial Library', slug: 'pollardml', eventsUrl: 'https://pollardml.assabetinteractive.com/calendar/', city: 'Lowell', state: 'MA', zipCode: '01852' },
  // Added 2026-08-27. Relocated from WordPress-MA, where it carried a urlCollision guard
  // saying marshfieldlibrary.org is WI not MA — correct, but that left the library with no
  // coverage at all. It is NOT a LibCal site either: marshfieldlibrary.libcal.com is also
  // Marshfield WISCONSIN. Ventress runs Assabet, and the slug was READ FROM THE LIBRARY OWN
  // PAGE as this file requires — ventresslibrary.org/event-calendar/ embeds an iframe
  // pointing at ventresslibrary.assabetinteractive.com/calendar/. Confirmed live: that URL
  // 301s to /calendar/2026-august/ and titles itself "August 2026 Events | Ventress Memorial
  // Library" with 453 event nodes.
  { name: 'Ventress Memorial Library', slug: 'ventresslibrary', eventsUrl: 'https://ventresslibrary.assabetinteractive.com/calendar/', city: 'Marshfield', state: 'MA', zipCode: '02050' },
  // Added 2026-08-27. Was in WordPress-MA pointing at brewsterlibrary.libcal.com, a URL that
  // belongs to Brewster NEW YORK - a collision AND a platform mismatch at once. Brewster
  // Ladies Library is on Cape Cod and runs Assabet; confirmed live before wiring:
  // brewsterladieslibrary.assabetinteractive.com/calendar/ titles itself
  // "August 2026 Events | Brewster Ladies' Library".
  { name: 'Brewster Ladies Library', slug: 'brewsterladieslibrary', eventsUrl: 'https://brewsterladieslibrary.assabetinteractive.com/calendar/', city: 'Brewster', state: 'MA', zipCode: '02631' },

  // --- Added 2026-08-24 from the Step 3d zero-event verification -------------
  // All 23 were configured under WordPress-{MA,NH,RI}, where they returned 0
  // events on every run: they run Assabet, which the WordPress DOM extractor
  // cannot read. They were NOT found by name matching. Each slug was READ from
  // the library own site by scripts/find-assabet-instances.js, because the slug
  // is not derivable from the town name - actonmemoriallibrary, dracutlibrary,
  // northbridgemass, sherbornma and newburyportpl are five different conventions,
  // and guessing {city}.assabetinteractive.com would repeat the guessed
  // {city}library.org defect that produced 355 cross-state collisions.
  //
  // Every entry below was then CONFIRMED to carry real upcoming events via its
  // own /calendar/upcoming-events.rss feed before being wired; the trailing
  // comment records the item count seen. Four further candidates (Derry, Dover,
  // Taunton, and Hampton Lane Memorial) were dropped as ALREADY CONFIGURED -
  // matched on SLUG, not name, which is what caught Hampton Lane Memorial Library
  // already being present as Lane Memorial Library. Somerset Public Library was
  // dropped too: its resolved instance 404s, so it stays an open gap.
  // Uxbridge Free Public Library named no instance at all and also stays a gap.
  { name: 'Hampstead Public Library', slug: 'hampsteadlibrary', eventsUrl: 'https://hampsteadlibrary.assabetinteractive.com/calendar/', city: 'Hampstead', state: 'NH', zipCode: '03841' },   // 81 upcoming in RSS
  { name: 'Rye Public Library', slug: 'ryepubliclibrary', eventsUrl: 'https://ryepubliclibrary.assabetinteractive.com/calendar/', city: 'Rye', state: 'NH', zipCode: '03870' },   // 74 upcoming in RSS
  { name: 'Acton Memorial Library', slug: 'actonmemoriallibrary', eventsUrl: 'https://actonmemoriallibrary.assabetinteractive.com/calendar/', city: 'Acton', state: 'MA', zipCode: '01720' },   // 115 upcoming in RSS
  { name: 'Amesbury Public Library', slug: 'amesburylibrary', eventsUrl: 'https://amesburylibrary.assabetinteractive.com/calendar/', city: 'Amesbury', state: 'MA', zipCode: '01913' },   // 26 upcoming in RSS
  { name: 'Boxford Town Library', slug: 'boxfordlibrary', eventsUrl: 'https://boxfordlibrary.assabetinteractive.com/calendar/', city: 'Boxford', state: 'MA', zipCode: '01921' },   // 30 upcoming in RSS
  { name: 'Moses Greeley Parker Memorial Lib.', slug: 'dracutlibrary', eventsUrl: 'https://dracutlibrary.assabetinteractive.com/calendar/', city: 'Dracut', state: 'MA', zipCode: '01826' },   // 53 upcoming in RSS
  { name: 'Grafton Public Library', slug: 'graftonlibrary', eventsUrl: 'https://graftonlibrary.assabetinteractive.com/calendar/', city: 'Grafton', state: 'MA', zipCode: '01519' },   // 58 upcoming in RSS
  { name: 'Hanson Public Library', slug: 'hansonlibrary', eventsUrl: 'https://hansonlibrary.assabetinteractive.com/calendar/', city: 'Hanson', state: 'MA', zipCode: '02341' },   // 42 upcoming in RSS
  { name: 'Hopkinton Public Library', slug: 'hopkintonlibrary', eventsUrl: 'https://hopkintonlibrary.assabetinteractive.com/calendar/', city: 'Hopkinton', state: 'MA', zipCode: '01748' },   // 56 upcoming in RSS
  { name: 'Lunenburg Public Library', slug: 'lunenburglibrary', eventsUrl: 'https://lunenburglibrary.assabetinteractive.com/calendar/', city: 'Lunenburg', state: 'MA', zipCode: '01462' },   // 29 upcoming in RSS
  { name: 'Lynnfield Public Library', slug: 'lynnfieldlibrary', eventsUrl: 'https://lynnfieldlibrary.assabetinteractive.com/calendar/', city: 'Lynnfield', state: 'MA', zipCode: '01940' },   // 39 upcoming in RSS
  { name: 'Medford Public Library', slug: 'medfordlibrary', eventsUrl: 'https://medfordlibrary.assabetinteractive.com/calendar/', city: 'Medford', state: 'MA', zipCode: '02155' },   // 160 upcoming in RSS
  { name: 'Needham Free Public Library', slug: 'needhamma', eventsUrl: 'https://needhamma.assabetinteractive.com/calendar/', city: 'Needham', state: 'MA', zipCode: '02494' },   // 72 upcoming in RSS
  { name: 'Newburyport Public Library', slug: 'newburyportpl', eventsUrl: 'https://newburyportpl.assabetinteractive.com/calendar/', city: 'Newburyport', state: 'MA' },   // 43 upcoming in RSS
  { name: 'Northborough Free Library', slug: 'northboroughlibrary', eventsUrl: 'https://northboroughlibrary.assabetinteractive.com/calendar/', city: 'Northborough', state: 'MA', zipCode: '01532' },   // 76 upcoming in RSS
  { name: 'Oxford Free Public Library', slug: 'oxfordmapubliclibrary', eventsUrl: 'https://oxfordmapubliclibrary.assabetinteractive.com/calendar/', city: 'Oxford', state: 'MA', zipCode: '01540' },   // 21 upcoming in RSS
  { name: 'Palmer Public Library', slug: 'palmerlibrary', eventsUrl: 'https://palmerlibrary.assabetinteractive.com/calendar/', city: 'Palmer', state: 'MA', zipCode: '01069' },   // 20 upcoming in RSS
  { name: 'Rowley Public Library', slug: 'rowleylibrary', eventsUrl: 'https://rowleylibrary.assabetinteractive.com/calendar/', city: 'Rowley', state: 'MA', zipCode: '01969' },   // 73 upcoming in RSS
  { name: 'Sherborn Library', slug: 'sherbornma', eventsUrl: 'https://sherbornma.assabetinteractive.com/calendar/', city: 'Sherborn', state: 'MA', zipCode: '01770' },   // 32 upcoming in RSS
  { name: 'Townsend Public Library', slug: 'townsendlibrary', eventsUrl: 'https://townsendlibrary.assabetinteractive.com/calendar/', city: 'Townsend', state: 'MA', zipCode: '01469' },   // 263 upcoming in RSS
  { name: 'Weston Public Library', slug: 'westonlibrary', eventsUrl: 'https://westonlibrary.assabetinteractive.com/calendar/', city: 'Weston', state: 'MA', zipCode: '02493' },   // 47 upcoming in RSS
  { name: 'Whitinsville Social Library', slug: 'northbridgemass', eventsUrl: 'https://northbridgemass.assabetinteractive.com/calendar/', city: 'Whitinsville', state: 'MA', zipCode: '01588' },   // 27 upcoming in RSS
  { name: 'Portsmouth Free Public Library', slug: 'portsmouthlibrary', eventsUrl: 'https://portsmouthlibrary.assabetinteractive.com/calendar/', city: 'Portsmouth', state: 'RI', zipCode: '02871' },   // 27 upcoming in RSS

  // --- Added 2026-09-06, second pass over the same defect --------------------
  // Found by re-checking the UNVERIFIABLE backlog over plain HTTP: 43 libraries
  // still sitting in WordPress-{state} configs serve assabetinteractive.com
  // markup, which is why every one of them carried the verdict "rendered fully
  // but shows no dated events". Same class as the 2026-08-24 batch above, and
  // the same method — slug READ from the library's own site, never guessed.
  //
  // 43 CANDIDATES BECAME 18, and the three things that removed the other 25 are
  // each worth keeping:
  //
  //  * 21 were ALREADY CONFIGURED here and were caught by an exact-name match
  //    against this array. Their WordPress entries were guarded rather than
  //    relocated, because relocating an already-covered library double-scrapes
  //    one calendar under two scraper names.
  //  * 2 MORE were caught only by matching on SLUG after the name check had
  //    passed them as new — Andrews Branch Library resolves to `newburyportpl`
  //    (it is a branch of Newburyport Public Library, already here) and Hampton
  //    Lane Memorial Library resolves to `hampton` (already here as Lane
  //    Memorial Library). THE SLUG IS THE IDENTITY, NOT THE NAME. That is the
  //    same catch the 2026-08-24 note records for Hampton Lane, re-confirmed.
  //  * 2 were dropped for having no calendar: lakevillelibrary and
  //    somersetpubliclibrary both return HTTP 200 at their instance root, titled
  //    correctly, but 404 on /calendar/ and expose no internal links at all.
  //    They run Assabet for their SITE and not for their EVENTS. Somerset was
  //    already recorded as exactly this on 2026-08-24; Lakeville is the same
  //    shape and joins it as an open gap. Neither is wired, because an entry
  //    that cannot return an event is worse than an acknowledged gap.
  //
  // Every one of the 18 below was verified twice before wiring: its own website
  // names the instance, and the instance's /calendar/upcoming-events.rss returns
  // HTTP 200 with a feed title naming the same institution and the item count in
  // the trailing comment. City/state/ZIP were then confirmed from the library's
  // own page — street address, ZIP and phone area code, never name similarity —
  // and every ZIP and area code agrees with the state of the file it came from.
  //
  // FIVE OF THESE ARE OUTSIDE NH AND MA (ME 1, NY 3, NJ 2), so the registry key
  // `Assabet-NH-MA` now UNDERSTATES this scraper's coverage. The key was
  // deliberately NOT renamed: this scraper writes ONE scraper_name for all its
  // sites (see the COLLAPSED note below), so the key IS the scraper_name on
  // every row it has ever written, and renaming it would churn attribution on
  // 3,400+ existing rows for a cosmetic gain. `state: 'Multi'` in the registry
  // already carries the truth; the key is only a label. Revisit this if the
  // COLLAPSED constraint is ever lifted, since a per-site-slug family pays a far
  // smaller rename cost.
  { name: 'Dover Town Library', slug: 'dovertownlibrary', eventsUrl: 'https://dovertownlibrary.assabetinteractive.com/calendar/', city: 'Dover', state: 'MA', zipCode: '01773' },   // 29 upcoming in RSS
  { name: 'G. A. R. Memorial Library', slug: 'westnewburylibrary', eventsUrl: 'https://westnewburylibrary.assabetinteractive.com/calendar/', city: 'West Newbury', state: 'MA', zipCode: '01985' },   // 33 upcoming in RSS
  { name: 'Edgartown Free Public Library', slug: 'edgartownlibrary', eventsUrl: 'https://edgartownlibrary.assabetinteractive.com/calendar/', city: 'Edgartown', state: 'MA', zipCode: '02539' },   // 39 upcoming in RSS
  // Conant Free Public Library is the WordPress name; the library titles itself
  // Conant Public Library and sits in Sterling MA, which is why the slug reads
  // sterlinglibrary. Confirmed at 4 Meetinghouse Hill Rd, Sterling MA 01564.
  { name: 'Conant Free Public Library', slug: 'sterlinglibrary', eventsUrl: 'https://sterlinglibrary.assabetinteractive.com/calendar/', city: 'Sterling', state: 'MA', zipCode: '01564' },   // 45 upcoming in RSS
  { name: 'Holliston Public Library', slug: 'hollistonlibrary', eventsUrl: 'https://hollistonlibrary.assabetinteractive.com/calendar/', city: 'Holliston', state: 'MA', zipCode: '01746' },   // 49 upcoming in RSS
  // THE SECOND HALF OF A DIAGNOSIS THAT WAS ONLY HALF RIGHT. On 2026-09-03 this
  // library's URL was corrected inside WordPress-MA after medfieldlibrary.org was
  // found to 301 to medfieldpubliclibrary.org. That was right about the host and
  // silent about the platform: the corrected host serves Assabet, so the entry
  // still could not work where it sat, and its REDIRECT-SLICE-RELOCATIONS-UNRUN
  // pending item would have kept reading 0 forever.
  { name: 'Medfield Memorial Library', slug: 'medfieldpubliclibrary', eventsUrl: 'https://medfieldpubliclibrary.assabetinteractive.com/calendar/', city: 'Medfield', state: 'MA', zipCode: '02052' },   // 100 upcoming in RSS
  { name: 'Jonathan Bourne Public Library', slug: 'bournelibrary', eventsUrl: 'https://bournelibrary.assabetinteractive.com/calendar/', city: 'Bourne', state: 'MA', zipCode: '02532' },   // 53 upcoming in RSS
  { name: 'Leicester Public Library', slug: 'leicesterma', eventsUrl: 'https://leicesterma.assabetinteractive.com/calendar/', city: 'Leicester', state: 'MA', zipCode: '01524' },   // 33 upcoming in RSS
  { name: 'Leominster Public Library', slug: 'leominsterlibrary', eventsUrl: 'https://leominsterlibrary.assabetinteractive.com/calendar/', city: 'Leominster', state: 'MA', zipCode: '01453' },   // 73 upcoming in RSS
  { name: 'Millbury Public Library', slug: 'millburylibrary', eventsUrl: 'https://millburylibrary.assabetinteractive.com/calendar/', city: 'Millbury', state: 'MA', zipCode: '01527' },   // 51 upcoming in RSS
  { name: 'Ipswich Public Library', slug: 'ipswichlibrary', eventsUrl: 'https://ipswichlibrary.assabetinteractive.com/calendar/', city: 'Ipswich', state: 'MA', zipCode: '01938' },   // 48 upcoming in RSS
  { name: 'Topsfield Town Library', slug: 'topsfieldlibrary', eventsUrl: 'https://topsfieldlibrary.assabetinteractive.com/calendar/', city: 'Topsfield', state: 'MA', zipCode: '01983' },   // 36 upcoming in RSS
  // Maine — first ME library in this scraper.
  { name: 'Kennebunk Free Library', slug: 'kennebunklibrary', eventsUrl: 'https://kennebunklibrary.assabetinteractive.com/calendar/', city: 'Kennebunk', state: 'ME', zipCode: '04043' },   // 63 upcoming in RSS
  // New York — all three are Nassau County, Long Island; area code 516 on each.
  { name: 'Seaford Public Library', slug: 'seafordlibrary', eventsUrl: 'https://seafordlibrary.assabetinteractive.com/calendar/', city: 'Seaford', state: 'NY', zipCode: '11783' },   // 33 upcoming in RSS
  { name: 'Locust Valley Library', slug: 'locustvalleylibrary', eventsUrl: 'https://locustvalleylibrary.assabetinteractive.com/calendar/', city: 'Locust Valley', state: 'NY', zipCode: '11560' },   // 81 upcoming in RSS
  // TRIPLE-CONFIGURED BEFORE TODAY, AND NONE OF THE THREE WORKED. WordPress-NY
  // held it with eventsUrl pointed at baldwinlib.libcal.com, and LibCal-NY2 held
  // it too with a settled MATCHES verdict reading "LibCal day view renders with
  // empty search results" — which was true, and true of the wrong calendar. The
  // real one is Assabet. Baldwin MI exists and this is NOT it: 2385 Grand Avenue,
  // Baldwin NY 11510, ph (516) 223-6228.
  { name: 'Baldwin Public Library', slug: 'baldwinpl', eventsUrl: 'https://baldwinpl.assabetinteractive.com/calendar/', city: 'Baldwin', state: 'NY', zipCode: '11510' },   // 114 upcoming in RSS
  // New Jersey — first NJ libraries in this scraper.
  { name: 'Boonton Holmes Public Library', slug: 'boontonlibrary', eventsUrl: 'https://boontonlibrary.assabetinteractive.com/calendar/', city: 'Boonton', state: 'NJ', zipCode: '07005' },   // 53 upcoming in RSS
  { name: 'Ridgewood Public Library', slug: 'ridgewoodlibrary', eventsUrl: 'https://ridgewoodlibrary.assabetinteractive.com/calendar/', city: 'Ridgewood', state: 'NJ', zipCode: '07450' },   // 123 upcoming in RSS
  // ---------------------------------------------------------------------------
  // THREE RELOCATED 2026-09-09 from the platform sweep of the UNVERIFIABLE backlog.
  // Six candidates were probed; three named no Assabet instance on any standard path and
  // were left alone rather than guessed at (Uxbridge Free Public Library MA, which this
  // file already records as naming no instance, plus Wells Public Library ME and Danbury
  // Public Library CT).
  //
  // Each slug was found ON THE LIBRARY'S OWN EVENTS PAGE, so the library itself points at
  // the instance, and each instance's /calendar/upcoming-events.rss was then fetched and
  // judged on what IT says. A deliberately bogus instance was probed in the same pass and
  // returned HTTP 503 with 0 items, so a 200 with items means a real instance.
  { name: 'Old Lyme - Phoebe Griffin Noyes Library', slug: 'oldlymelibrary', eventsUrl: 'https://oldlymelibrary.assabetinteractive.com/calendar/', city: 'Old Lyme', state: 'CT', zipCode: '06371' },   // feed titles "Phoebe Griffin Noyes Library Schedule of Events", 54 items
  { name: 'Millicent Library', slug: 'millicentlibrary', eventsUrl: 'https://millicentlibrary.assabetinteractive.com/calendar/', city: 'Fairhaven', state: 'MA', zipCode: '02719' },   // feed titles "Millicent Library Schedule of Events", 53 items
  { name: 'Hamilton Township Free Public Library', slug: 'hamiltonnjpl', eventsUrl: 'https://hamiltonnjpl.assabetinteractive.com/calendar/', city: 'Hamilton', state: 'NJ', zipCode: '08610' },   // feed titles "Hamilton Township Public Library Schedule of Events", 44 items
];

// The registry key, byte-for-byte. This was 'assabet-NH-MA' (lowercase 'a') until
// 2026-08-24, which is a CASE_MISMATCH under CLAUDE.md's naming rules and joins to
// no registry entry. Fixed while adding the 23 relocated libraries below.
const REGISTRY_KEY = 'Assabet-NH-MA';

/**
 * PER-SITE scraper_name is NOT possible here, and this note exists so it is not
 * attempted a third time.
 *
 * This scraper covers 41 library websites that all write the SAME bare name, which
 * is the "No aggregation, ever" problem AGE-RANGE-AUDIT.md describes — 41 libraries
 * collapse to one row in the per-site audits. The obvious fix is to emit
 * `Assabet-NH-MA-<slug>` per event, and it does NOT work: this scraper saves through
 * saveEventsWithGeocoding(), and that helper REBUILDS metadata from its own options
 * and overwrites metadata.scraperName with the single option-level value. Tried and
 * measured on 2026-08-24 — all 562 rows from that run came back under the bare name.
 *
 * It is not merely overridden, it is load-bearing: verifyAndCleanupEvents() looks
 * existing events up by `metadata.scraperName == scraperName`, so a per-site variant
 * makes that lookup miss every row. That is why the same attempt was REVERTED on
 * 2026-08-06 (see the comment in event-save-helper.js next to `platform`), and that
 * function deletes, so breaking its lookup is not a cosmetic risk.
 *
 * Fixing this properly means changing the helper's lookup to prefix-match the
 * registry key across all ~50 scrapers that use it — a deliberate shared-helper
 * migration, not a daily-diagnosis change. `sites: 41` is declared in the registry
 * so check-scraper-names.js reports this scraper as COLLAPSED and the debt stays
 * visible instead of silently passing.
 */

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'];

// How many months to walk, counting the current one. Three covers the ~60-day
// horizon the rest of the pipeline keeps without pulling far-future noise.
const MONTHS_AHEAD = 3;

/**
 * Assabet serves ONE MONTH PER PAGE, and a bare /calendar/ 301s to the CURRENT month
 * (this file already recorded that for Ventress: "301s to /calendar/2026-august/ and
 * titles itself August 2026 Events"). The scraper only ever read that one page, so
 * what it collected was always "this month" — and by the end of a month, that is
 * almost entirely the PAST.
 *
 * Measured on the 2026-08-30 run, which is what exposed it:
 *   Found 1717 → saved 16. Skip breakdown: 1665 PAST EVENT, 21 junk, 8 duplicate,
 *   and 0 for every other reason. 97% of everything scraped was already over.
 *
 * The cost was not spread evenly. The 24 libraries added on 2026-08-27 had only ever
 * run on 08-28 and 08-30 — both late in August — so every event they ever returned was
 * past and NONE OF THEM HAS A SINGLE ROW in the database: Ventress, Brewster Ladies,
 * Hampstead, Rye, Acton, Amesbury, Boxford, Grafton, Hanson, Hopkinton, Lunenburg,
 * Lynnfield, Medford, Needham, Newburyport, Northborough, Oxford, Palmer, Rowley,
 * Sherborn, Townsend, Weston, Whitinsville and Portsmouth. The 19 older libraries look
 * healthy only because they were also scraped EARLY in earlier months.
 *
 * This is NOT the same-day past-event bug fixed on 2026-07-08, and not a date-parsing
 * fault: the dates parsed correctly and the events really were over. It is a scrape
 * WINDOW defect, so the fix is to ask for the months that have not happened yet.
 */
function monthUrlsFor(eventsUrl) {
  const m = String(eventsUrl).match(/^(https?:\/\/[^/]+\/calendar\/)/i);
  // Anything not matching the documented /calendar/ shape keeps its configured URL
  // rather than being guessed at — a wrong URL here would scrape nothing silently.
  if (!m) return [eventsUrl];
  const base = m[1];
  const now = new Date();
  const urls = [];
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    urls.push(`${base}${d.getFullYear()}-${MONTH_NAMES[d.getMonth()]}/`);
  }
  return urls;
}

async function scrapeAssabetEvents() {
  const browser = await launchBrowser();
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`Scraping: ${library.name} (${library.slug})`);
      const page = await browser.newPage();
      const libraryEvents = [];
      // NOTE: the page.evaluate body below is unchanged and keeps its original
      // indentation — re-indenting ~160 commented lines would bury this change in a
      // whitespace diff. Only the loop around it is new.
      for (const monthUrl of monthUrlsFor(library.eventsUrl)) {
        try {
          await page.goto(monthUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        } catch (navErr) {
          // A month page that does not load is one month lost, not the library.
          console.log(`  ⚠️ ${library.name}: ${monthUrl} did not load (${navErr.message.split('\n')[0]})`);
          continue;
        }
        await new Promise(resolve => setTimeout(resolve, 3000));

        const monthEvents = await page.evaluate((libName, libSlug) => {
        const events = [];

        // Strategy 1: Look for Assabet-specific calendar event selectors
        const selectors = [
          '.event-card', '.event-listing', '.calendar-event',
          '.event-item', '.cal-event', '.event-entry',
          '.event_card', '.eventCard', '.event-row',
          '[class*="event-card"]', '[class*="calendar-event"]', '[class*="event-list"]',
          // Assabet's OWN card class. Put first, and note what its absence used to
          // cost: none of the selectors below matched it, so every site fell through
          // to Strategy 2, whose `li[class*="event"]` matches the sidebar filter
          // checkboxes — classes like calendar-filters-option-all-ages-event. On
          // dovernh 2026-08-28 that was 81 matched elements for 30 real events, the
          // other 51 being filters and chrome.
          '.listing-event',
          '[class*="event_item"]', '[class*="eventItem"]',
          '.fc-event', '.tribe-events-single', '.type-tribe_events'
        ];

        let eventElements = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) {
            eventElements = found;
            break;
          }
        }

        // Strategy 2: Look for generic article/list patterns with event-like content
        if (eventElements.length === 0) {
          eventElements = document.querySelectorAll('article, .post, li[class*="event"], div[class*="event"]');
        }

        // Strategy 3: Look for links inside a calendar/events container
        if (eventElements.length === 0) {
          const containers = document.querySelectorAll('[class*="calendar"], [class*="events"], [id*="calendar"], [id*="events"], main, .content, #content');
          for (const container of containers) {
            const links = container.querySelectorAll('a[href*="/calendar/"], a[href*="/event/"], a[href*="/events/"]');
            if (links.length > 0) {
              eventElements = links;
              break;
            }
          }
        }

        eventElements.forEach(card => {
          // Title. THE ORDER HERE IS THE WHOLE FIX for the concatenated titles logged
          // as ASSABET-CONCAT-TITLES on 2026-08-25 ("Monday, August 30Library Closed").
          // An Assabet card is:
          //   <div class="listing-event">
          //     <h2><a><span class="event-day">Monday, August 3</span>
          //             <span class="event-time">6:00—8:00 PM</span>
          //             <span class="event-location">…room…branch…address…</span></a></h2>
          //     <h3><a>Teen Dungeons &amp; Dragons</a></h3>   <-- the actual title
          // The generic 'h1, h2, h3…' selector matches the H2 FIRST in document order,
          // so the stored title became the day, time, room, branch and street address
          // run together with no separators. That missing word boundary is not merely
          // ugly: \blibrary\s+closed\b cannot match "30Library Closed", which is why
          // 32 such rows survived every closure rule until a backstop was added.
          // Prefer Assabet's H3 explicitly, then fall back to the generic path for any
          // site in this family that is not built this way.
          let titleEl = card.querySelector('h3 a, h3');
          if (!titleEl || !titleEl.textContent.trim()) {
            titleEl = card.querySelector('h1, h2, h3, h4, h5, [class*="title"], [class*="name"]');
          }
          let title = titleEl ? titleEl.textContent.trim() : (card.tagName === 'A' ? card.textContent.trim() : '');

          // Last-resort repair: if whatever we picked STILL opens with a date/time run,
          // strip that prefix rather than storing it. Guards the generic branch above
          // and any future Assabet template change.
          title = title.replace(
            /^(?:Today\s*)?(?:Mon|Tues?|Wednes|Thurs?|Fri|Satur|Sun)day,?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:\s*\d{1,2}:\d{2}\s*(?:—|-|–)\s*\d{1,2}:\d{2}\s*(?:AM|PM))?/i,
            ''
          ).trim();

          if (!title || title.length < 3) return;

          // Try to extract date
          // .event-day first: it holds a clean "Monday, August 3" on Assabet, whereas
          // [class*="time"] matches .event-time ("6:00—8:00 PM") which carries no month
          // and forces the whole-card text scan below.
          const dateEl = card.querySelector('.event-day, [class*="date"], time, [class*="when"], [class*="time"], [datetime]');
          let dateText = '';
          if (dateEl) {
            dateText = dateEl.getAttribute('datetime') || dateEl.textContent.trim();
          }

          // Assabet's calendar puts the date as a day-header outside the time
          // element — the time field often holds just "All Day" or "10:00—11:00 AM"
          // with no month name. If dateText is missing or has no month, scan the
          // card's textContent for a "[Weekday,] Month DD" pattern and use that.
          const hasMonth = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i.test(dateText);
          if (!hasMonth) {
            const cardText = card.textContent || '';
            const dateMatch = cardText.match(/(?:Today)?\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)?\s*,?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s*\d{4})?/i);
            if (dateMatch) {
              // Prepend the day-header so normalizeDateString sees Month+Day first
              dateText = dateText ? `${dateMatch[0]} ${dateText}` : dateMatch[0];
            }
          }

          // Try to extract time
          const timeEl = card.querySelector('[class*="time"]');
          let timeText = '';
          if (timeEl && timeEl !== dateEl) {
            timeText = timeEl.textContent.trim();
          }
          if (timeText && dateText && !dateText.includes(timeText)) {
            dateText = dateText + ' ' + timeText;
          }

          // Try to extract description
          const descEl = card.querySelector('[class*="desc"], [class*="summary"], [class*="excerpt"], p');
          const description = descEl ? descEl.textContent.trim() : '';

          // Try to extract link
          let url = '';
          if (card.tagName === 'A') {
            url = card.href;
          } else {
            const linkEl = card.querySelector('a');
            if (linkEl) url = linkEl.href;
          }

          // Try to extract age/audience info
          const ageEl = [
            card.querySelector('[class*="audience"]'),
            card.querySelector('[class*="age"]'),
            card.querySelector('[class*="category"]')
          ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

          // Skip events with no parseable date — without a date, the row ends
          // up in the DB with null `date` TIMESTAMPTZ and is invisible to
          // date-filtered queries. 212 assabet events were in this state on
          // 2026-05-17. Require at least a month name to consider it a date.
          if (!dateText || !/(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i.test(dateText)) {
            return;
          }

          events.push({
            title: title,
            date: dateText,
            description: description.substring(0, 500),
            url: url,
            ageRange: ageEl ? ageEl.textContent.trim() : '',
            location: libName,
            venueName: libName
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(e => {
          const key = e.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name, library.slug);

        // Cross-month dedupe. The in-page dedupe above is per-page and keyed on TITLE
        // ALONE, which is right within one month but would silently drop next month's
        // occurrence of any recurring programme if applied across months. Keyed on
        // title+date so a weekly storytime keeps one row per month page.
        for (const e of monthEvents) {
          const key = `${(e.title || '').toLowerCase()}|${(e.date || '').toLowerCase()}`;
          if (libraryEvents.some(x => `${(x.title || '').toLowerCase()}|${(x.date || '').toLowerCase()}` === key)) continue;
          libraryEvents.push(e);
        }
      }

      console.log(`  Found ${libraryEvents.length} events at ${library.name}`);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.eventsUrl,
            scrapedAt: new Date().toISOString(),
            // Overwritten by saveEventsWithGeocoding with its option-level value —
            // see the REGISTRY_KEY note above. Kept as the registry key so it is
            // correct either way rather than silently wrong if that ever changes.
            scraperName: REGISTRY_KEY,
            category: 'library',
            state: library.state,
            city: library.city,
            zipCode: library.zipCode
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error(`Error: ${library.name}:`, error.message);
    }
  }

  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    // Option-level FALLBACK only. flattenEvent() reads metadata.scraperName first,
    // and every event above now carries its own per-site name, so this is only
    // reached if that is ever dropped. The bare registry key is the right value
    // here — a slug would be wrong for whichever library it did not come from.
    scraperName: REGISTRY_KEY,
    // Each library carries its own `state` field (NH, MA or RI as of 2026-08-24)
    // which takes priority
    // inside saveEventsWithGeocoding via `library.state || state`. The option-level
    // `state` is required as a fallback, so pass a multi-state sentinel.
    state: 'NH',
    category: 'library',
    platform: 'assabet-interactive'
  });
}

async function main() {
  const events = await scrapeAssabetEvents();
  if (events.length > 0) await saveToDatabase(events);
  process.exit(0);
}

if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeAssabetLibrariesCloudFunction() {
  console.log('☁️ Running Assabet Libraries NH-MA as Cloud Function');
  const events = await scrapeAssabetEvents();
  if (events.length === 0) {
    await logScraperResult('Assabet-NH-MA', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('Assabet-NH-MA', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  };
}

module.exports = { scrapeAssabetEvents, saveToDatabase, scrapeAssabetLibrariesCloudFunction };
