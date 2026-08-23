#!/usr/bin/env node
/**
 * disable-collided-urls.js — stop WordPress-* entries scraping ANOTHER STATE's library.
 *
 * THE DEFECT
 * ----------
 * 83% of WordPress-* config entries (3,156 of 3,802) use a guessed `{city}library.org`
 * host — the generator CLAUDE.md already warns about. Where two guesses collide on one
 * string, several states' entries all point at ONE real library, and every one of them
 * scrapes it. This is not hypothetical: 1,983 of 8,899 WordPress-* rows in the database
 * come from a colliding host, with the SAME site feeding multiple states —
 * williamstownlibrary.org alone had rows under NJ 127, VT 56, NY 49, WV 11, MA 9.
 *
 * WHAT THIS DOES, AND WHY IT DOES NOT DELETE
 * ------------------------------------------
 * For each host in GROUND_TRUTH below, entries whose own state differs from the host's
 * REAL state get an `urlCollision` field describing the conflict. A guard in each
 * scraper skips those entries at run time.
 *
 * The entry is deliberately NOT deleted. Deleting it would erase the only record that
 * the library is supposed to be covered, turning a known, described gap into an unknown
 * one — the exact failure the site report's completeness rule exists to prevent. The
 * guard also still emits the `📍 {name}` header AND a `Found 0 events` line, so the
 * library keeps its row in LIBRARY-SITE-AUDIT.md instead of silently vanishing from the
 * audit (that pairing is load-bearing — breaking it is what hid BiblioCommons-* and
 * Communico-* from the audit entirely until 2026-08-20).
 *
 * EVIDENCE BAR
 * ------------
 * GROUND_TRUTH holds only hosts whose real state was established from the LIVE PAGE —
 * either a street address / ZIP / phone area code read off the site, or the
 * `url-collision: page addresses show XX not YY` verdict emitted by
 * verify-sites-puppeteer.js, which reads those same signals. No host is listed on the
 * strength of a name resembling a city, because library names are mostly geography and
 * name similarity has produced wrong answers here repeatedly.
 *
 * A host whose true state is NOT among the states claiming it (madisonlibrary.org is in
 * Kentucky; no KY entry points at it) correctly disables EVERY entry on that host.
 *
 * Usage:
 *   node scripts/disable-collided-urls.js            # dry run — prints every change
 *   node scripts/disable-collided-urls.js --save
 *   node scripts/disable-collided-urls.js --verify   # report current state, change nothing
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRAPERS = path.join(ROOT, 'scrapers');
const SAVE = process.argv.includes('--save');
const VERIFY = process.argv.includes('--verify');

// host -> { state, evidence }.  state is the REAL state the host serves.
// Every line here was read off the live site on 2026-08-21.
const GROUND_TRUTH = {
  'madisonlibrary.org':      { state: 'KY', evidence: 'live page: Madison County Public Library, Richmond KY (Richmond + Berea branches). No KY entry claims it, so all 11 claiming entries are wrong.' },
  'springfieldlibrary.org':  { state: 'MA', evidence: 'live page: Springfield City Library, "220 State Street, Springfield MA 01103", area code 413; Brightwood is one of its branches.' },
  'chesterlibrary.org':      { state: 'NY', evidence: 'live page: Town of Chester Public Library, "Chestertown, New York 12817", area code 518.' },
  'belfastlibrary.org':      { state: 'ME', evidence: 'live page: Belfast Free Library, "106 High Street, Belfast, ME", area code 207.' },
  'germantownlibrary.org':   { state: 'NY', evidence: 'live page: Germantown Library, "31 Palatine Park Road, Germantown NY, 12526", area code 518. Puppeteer also reports platform=libcal.' },
  'unionlibrary.org':        { state: 'SC', evidence: 'verify-sites-puppeteer url-collision: page addresses show SC (Union County Library System) under NJ/CT/MS/WV/ME entries.' },
  'oaklandlibrary.org':      { state: 'CA', evidence: 'verify-sites-puppeteer url-collision: page addresses show CA. California is outside the active region entirely, so every eastern entry on this host is wrong.' },
  'daltonlibrary.org':       { state: 'MA', evidence: 'verify-sites-puppeteer url-collision: page addresses show MA under GA/NH/PA entries.' },
  'westportlibrary.org':     { state: 'CT', evidence: 'verify-sites-puppeteer url-collision: page addresses show CT under MA/NY entries.' },
  'easthamptonlibrary.org':  { state: 'NY', evidence: 'verify-sites-puppeteer url-collision: page addresses show NY under MA/CT entries.' },
  'baxterlibrary.org':       { state: 'ME', evidence: 'verify-sites-puppeteer url-collision: page addresses show ME (Gorham Baxter Memorial Library) under the TN entry.' },
  'machiaslibrary.org':      { state: 'NY', evidence: 'verify-sites-puppeteer url-collision: page addresses show NY under the ME entry.' },
  'laurellibrary.org':       { state: 'KY', evidence: 'verify-sites-puppeteer url-collision: page addresses show KY under the DE entry.' },
  // --- second pass, 2026-08-21 -------------------------------------------------
  // These five are the highest-volume offenders in the database. Note that FOUR of
  // them resolve to a state OUTSIDE the 22-state active region entirely (WI, WI, TX,
  // and KY for a host claimed only by NY/ME/NH), which is why no entry anywhere is
  // correct for them and every claimant is disabled.
  'spartalibrary.org':       { state: 'WI', evidence: 'live page: Sparta Free Library, "124 W Main Street, Sparta, Wisconsin 54656", area code 608. Claimed by NJ/TN/GA/NC — none is WI, so all four are wrong. 173 rows already in the DB from this host.' },
  'bathlibrary.org':         { state: 'KY', evidence: 'live page: Bath County Memorial Library, "24 West Main St., Owingsville, KY", area code 606. Claimed by NY/ME/NH — none is KY. Explains why Dormann NY, Patten ME and Bath NH all showed the identical Bookmobile events.' },
  'newlondonlibrary.org':    { state: 'WI', evidence: 'live page: New London Public Library, "113 W North Water Street, New London, Wisconsin 54961", area code 920. Claimed by CT/NH — neither is WI. Explains the identical LEGO Build events under both.' },
  'dallaslibrary.org':       { state: 'TX', evidence: 'live page: Dallas Public Library, Dallas TX. Claimed by WV/NC — neither is TX. 91 rows already in the DB from this host.' },
  'florencelibrary.org':     { state: 'SC', evidence: 'live page: Florence County Library System, Florence SC (six branches). Claimed by MA/SC/KY/MS — the SC entry is the correct one and is KEPT; the other three are wrong.' },
  // --- third pass, 2026-08-21 --------------------------------------------------
  'littlefallslibrary.org':  { state: 'NJ', evidence: 'live page: Little Falls Public Library, "8 Warren Street Little Falls, New Jersey 07424", area code 973. The NJ entry is correct and is KEPT; the NY claimant (49 rows already in the DB) is wrong.' },
  'dekalblibrary.org':       { state: 'GA', evidence: 'live page: DeKalb County Public Library, "215 Sycamore Street, Decatur, Georgia 30030". The GA entry is correct and is KEPT.' },
  'perulibrary.org':         { state: 'IL', evidence: 'live page: Peru Public Library, "1409 11th Street, Peru, Illinois 61354", area code 815. Illinois is outside the active region; claimed by MA and NY, both wrong, 29 rows already in the DB.' },
  'warsawlibrary.org':       { state: 'IN', evidence: 'live page: Warsaw Community Public Library, "310 East Main Street Warsaw, Indiana 46580", area code 574. Indiana is outside the active region; claimed by NY/KY/NC, all wrong.' },
  // Added by the 2026-08-22 scheduled diagnosis as a hand edit to scraper-wordpress-
  // libraries-tn.js (commit 40c9a62). Recorded here so this script stays the single
  // source of truth for what is disabled and why — otherwise a later --save would not
  // know about it and the evidence would live only in a commit message.
  'dunlaplibrary.org':       { state: 'IL', evidence: 'Dunlap IL, not Dunlap TN. Found by the 2026-08-22 diagnosis; the Sequatchie County Public Library (TN) entry pointed at it.' },
  // --- fifth pass, 2026-08-23: scripts/resolve-collision-host-state.js ------------
  // The 85 hosts the ZZ-sentinel pass could not settle, re-probed with the purpose-built
  // resolver: three URL variants (many of these only failed because www did not serve
  // TLS), nine likely contact/about/hours paths, and three weighted signals — ZIP-anchored
  // state, phone area code, and "City, Full State". 46 resolved, 18 stayed UNREACHABLE,
  // 20 UNRESOLVED and 1 CONFLICTED; those 39 are deliberately absent — unresolved is
  // unknown, not safe. Validated first against four hosts with independently known
  // answers (ringwood NJ, belfast ME, mountainside NJ, sparta WI), all correct.
  // NOTE worcesterlibrary.org really is MD, so the MD claimant is CORRECT and kept —
  // the 34 MD rows from that host were never wrong.
  'greenvillelibrary.org':     { state: 'SC', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://greenvillelibrary.org; zip={} area={"SC":56} name={}' },
  'bradfordlibrary.org':       { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://bradfordlibrary.org; zip={} area={"PA":4} name={"PA":1}' },
  'columbialibrary.org':       { state: 'IL', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://columbialibrary.org; zip={"IL":1} area={"IL":2} name={}' },
  'hudsonlibrary.org':         { state: 'OH', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://hudsonlibrary.org; zip={} area={"OH":5} name={"OH":2}' },
  'butlerlibrary.org':         { state: 'NJ', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://butlerlibrary.org; zip={} area={"NJ":1} name={}' },
  'waterfordlibrary.org':      { state: 'WA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://waterfordlibrary.org; zip={} area={"WA":2} name={}' },
  'bridgeportlibrary.org':     { state: 'MI', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://bridgeportlibrary.org; zip={"MI":1} area={"MI":1} name={}' },
  'cornwalllibrary.org':       { state: 'CT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://cornwalllibrary.org; zip={"CT":2} area={"CT":3} name={"CT":1}' },
  'hamlinlibrary.org':         { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://hamlinlibrary.org; zip={} area={"PA":1} name={}' },
  'hartfordlibrary.org':       { state: 'WI', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://hartfordlibrary.org; zip={} area={"WI":2} name={"WI":1}' },
  'vernonlibrary.org':         { state: 'TX', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://www.vernonlibrary.org; zip={} area={"TX":1} name={}' },
  'readinglibrary.org':        { state: 'VT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://readinglibrary.org; zip={} area={"VT":1} name={"VT":3}' },
  'rochesterlibrary.org':      { state: 'IL', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://rochesterlibrary.org; zip={} area={"IL":2} name={}' },
  'summervillelibrary.org':    { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://summervillelibrary.org; zip={"PA":1} area={"PA":1} name={}' },
  'akronlibrary.org':          { state: 'OH', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://akronlibrary.org; zip={} area={"OH":1} name={"OH":1}' },
  'clarksburglibrary.org':     { state: 'WV', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://clarksburglibrary.org; zip={"WV":1} area={"WV":8} name={}' },
  'brandonlibrary.org':        { state: 'MI', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://brandonlibrary.org; zip={"MI":1} area={"MI":1} name={}' },
  'columbuslibrary.org':       { state: 'OH', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://columbuslibrary.org; zip={} area={"OH":1} name={}' },
  'gilbertlibrary.org':        { state: 'CT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://gilbertlibrary.org; zip={} area={"CT":2} name={}' },
  'maconlibrary.org':          { state: 'MO', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://maconlibrary.org; zip={} area={"MO":1} name={"MO":1}' },
  'huntingdonlibrary.org':     { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://huntingdonlibrary.org; zip={} area={"PA":2} name={}' },
  'middletonlibrary.org':      { state: 'TN', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://middletonlibrary.org; zip={} area={"TN":1} name={}' },
  'milanlibrary.org':          { state: 'MI', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://milanlibrary.org; zip={} area={"MI":4} name={"MI":1}' },
  'northhavenlibrary.org':     { state: 'ME', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://northhavenlibrary.org; zip={} area={"ME":1} name={"ME":2}' },
  'scottdalelibrary.org':      { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://scottdalelibrary.org; zip={} area={"PA":2} name={}' },
  'springlakelibrary.org':     { state: 'NJ', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://springlakelibrary.org; zip={"NJ":1} area={"NJ":1} name={}' },
  'springcitylibrary.org':     { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://springcitylibrary.org; zip={"PA":1} area={"PA":1} name={}' },
  'unadillalibrary.org':       { state: 'NY', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://unadillalibrary.org; zip={} area={"NY":1} name={}' },
  'hartlandlibrary.org':       { state: 'WI', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://hartlandlibrary.org; zip={"WI":1} area={"WI":1} name={}' },
  'marionlibrary.org':         { state: 'OH', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://marionlibrary.org; zip={} area={"OH":2} name={"OH":1}' },
  'brownelllibrary.org':       { state: 'VT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://brownelllibrary.org; zip={} area={"VT":2} name={}' },
  'sheffieldlibrary.org':      { state: 'PA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://sheffieldlibrary.org; zip={} area={"PA":1} name={}' },
  'clevelandlibrary.org':      { state: 'TN', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://clevelandlibrary.org; zip={"TN":2} area={"TN":2} name={}' },
  'holbrooklibrary.org':       { state: 'AZ', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://holbrooklibrary.org; zip={} area={"AZ":1} name={}' },
  'windsorlibrary.org':        { state: 'VT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://windsorlibrary.org; zip={"VT":1} area={"VT":1} name={}' },
  'essexlibrary.org':          { state: 'NY', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://essexlibrary.org; zip={} area={"NY":1} name={"NY":1}' },
  'arlingtonlibrary.org':      { state: 'TX', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://arlingtonlibrary.org; zip={"TX":7} area={"TX":7} name={}' },
  'stratfordlibrary.org':      { state: 'CT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://stratfordlibrary.org; zip={"CT":2} area={"CT":2} name={}' },
  'smcl.org':                  { state: 'CA', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://smcl.org; zip={"CA":14} area={} name={}' },
  'worcesterlibrary.org':      { state: 'MD', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://worcesterlibrary.org; zip={} area={"MD":2} name={"MD":1}' },
  'gardinerlibrary.org':       { state: 'NY', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://gardinerlibrary.org; zip={} area={"NY":1} name={"NY":1}' },
  'margatelibrary.org':        { state: 'NJ', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://margatelibrary.org; zip={} area={"NJ":5} name={}' },
  'granvillelibrary.org':      { state: 'OH', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://granvillelibrary.org; zip={} area={"OH":1} name={"OH":1}' },
  'martinsburglibrary.org':    { state: 'NY', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://martinsburglibrary.org; zip={"NY":1} area={"NY":1} name={}' },
  'piersonlibrary.org':        { state: 'VT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://piersonlibrary.org; zip={} area={"VT":3} name={"VT":1}' },
  'westhartfordlibrary.org':   { state: 'CT', evidence: 'resolve-collision-host-state.js 2026-08-23 via https://westhartfordlibrary.org; zip={} area={"CT":4} name={}' },
  // --- fourth pass, 2026-08-22: bulk resolve of all remaining colliding hosts ----
  // Method: verify-sites-puppeteer.js was run once per HOST with the sentinel expected
  // state ZZ. Because its identity check reports every address-shaped state mention that
  // differs from the expected one, and no page can be in ZZ, this makes it NAME the state
  // the page actually belongs to instead of only firing on a conflict with one claimant.
  // 53 of 140 hosts resolved this way; 2 more are dead. The other 85 stayed UNVERIFIABLE
  // (bot-blocks, JS-only calendars, no address in the DOM) and are deliberately NOT listed
  // here — an unresolved host is unknown, not safe, and must not be disabled on a guess.
  'warrenlibrary.org':         { state: 'PA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read PA; title Warren Public Library   Start here. Go anywhere..' },
  'camdenlibrary.org':         { state: 'MI', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MI; title Welcome to the Camden Twp. Library — Camden Townsh.' },
  'kingstonlibrary.org':       { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Kingston Library - Kingston Library.' },
  'salemlibrary.org':          { state: 'OR', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read OR; title Library   Salem, Oregon.' },
  'norwoodlibrary.org':        { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Morrill Memorial Library.' },
  'salisburylibrary.org':      { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Home.' },
  'williamstownlibrary.org':   { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY.' },
  'lebanonlibrary.org':        { state: 'OH', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read OH; title Lebanon Public Library   Lebanon, Ohio.' },
  'livingstonlibrary.org':     { state: 'NJ', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NJ; title Livingston Public Library.' },
  'shermanlibrary.org':        { state: 'CT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CT; title The Sherman Library.' },
  'websterlibrary.org':        { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Home - Webster Public Library.' },
  'allertonpubliclibrary.org': { state: 'IL', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read IL; title Homepage Allerton Public Library District.' },
  'winchesterlibrary.org':     { state: 'KS', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read KS; title Winchester Homepage   Winchester Public Library.' },
  'bedfordlibrary.org':        { state: 'TX', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read TX; title Bedford Public Library.' },
  'farmingtonpublic.org':      { state: 'IL', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read IL; title Homepage Farmington Area Public Library District.' },
  'newmilfordlibrary.org':     { state: 'CT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CT; title New Milford Public Library – The Public Library of.' },
  'perrylibrary.org':          { state: 'NC', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NC; title Perry Memorial Library.' },
  'richlandlibrary.org':       { state: 'MI', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MI; title Richland Community Library.' },
  'russelllibrary.org':        { state: 'CT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CT; title Homepage - Russell Library.' },
  'southportlibrary.org':      { state: 'ME', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read ME; title Home   Southport Library.' },
  'westminsterlibrary.org':    { state: 'CO', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CO; title Libraries   Westminster, CO.' },
  'wiltonlibrary.org':         { state: 'CT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CT; title Wilton Library - Home - Wilton Library.' },
  'yorklibrary.org':           { state: 'NE', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NE; title Kilgore Memorial Library – 520 Nebraska Avenue   Y.' },
  'beaverfallslibrary.org':    { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Beaver Falls Library.' },
  'brownvillelibrary.org':     { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Brownville – Glen Park Library.' },
  'cambridgelibrary.org':      { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Cambridge Public Library.' },
  'canterburylibrary.org':     { state: 'CT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CT; title Canterbury Public Library.' },
  'clermontlibrary.org':       { state: 'OH', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read OH; title Clermont County Public Library   Clermont County, .' },
  'cooperstownlibrary.org':    { state: 'DEAD', evidence: 'verify-sites-puppeteer 2026-08-22: DNS does not resolve even under the stealth browser, so no claimant can be right.' },
  'eastonlibrary.org':         { state: 'CT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read CT; title Easton Public Library.' },
  'edgewaterlibrary.org':      { state: 'DEAD', evidence: 'verify-sites-puppeteer 2026-08-22: HTTP 503 on the configured URL, so no claimant can be right.' },
  'gorhamlibrary.org':         { state: 'NH', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NH; title Gorham Public Library.' },
  'granbylibrary.org':         { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Granby Free Public Library.' },
  'kennedylibrary.org':        { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Home   JFK Library.' },
  'lagrangelibrary.org':       { state: 'IL', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read IL; title Home - La Grange Public Library.' },
  'lakewoodlibrary.org':       { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Lakewood Memorial Library.' },
  'lelandlibrary.org':         { state: 'MI', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MI; title Home   Leland Library.' },
  'longbeachlibrary.org':      { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Long Beach Public Library (New York)   Long Beach .' },
  'lyonslibrary.org':          { state: 'IL', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read IL; title Lyons Public Library – Your Journey Begins Here.' },
  'mercerlibrary.org':         { state: 'OH', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read OH; title Mercer County District Library   More Than Just Bo.' },
  'meadvillelibrary.org':      { state: 'PA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read PA; title MPL main   Meadville Public Library.' },
  'millbrooklibrary.org':      { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Millbrook Library.' },
  'morristownlibrary.org':     { state: 'NJ', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NJ; title Home - Morristown & Morris Township Library.' },
  'newburylibrary.org':        { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Newbury Town Library   0 Lunt St, Byfield, MA 0192.' },
  'orangeburglibrary.org':     { state: 'NY', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NY; title Home - Orangeburg Library.' },
  'riverdalelibrary.org':      { state: 'NJ', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read NJ; title Riverdale Public Library in Morris County NJ - 973.' },
  'quitmanlibrary.org':        { state: 'TX', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read TX; title Quitman Public Library — QUITMAN PUBLIC LIBRARY QU.' },
  'stamfordlibrary.org':       { state: 'VT', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read VT; title Home   Stamford Library.' },
  'sullivanil.us':             { state: 'IL', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read IL; title Welcome to Sullivan, IL.' },
  'wakefieldlibrary.org':      { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Home - Lucius Beebe Memorial Library.' },
  'walpolelibrary.org':        { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Welcome to Walpole Public Library   Located in Wal.' },
  'waylandlibrary.org':        { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Wayland Free Public Library   Explore. Learn. Conn.' },
  'westfieldlibrary.org':      { state: 'WI', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read WI; title Welcome   Ethel Everhard Memorial Library.' },
  'westmorelandpubliclibrary.com': { state: 'TN', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read TN; title HOME   Westmoreland Public.' },
  'westwoodlibrary.org':       { state: 'MA', evidence: 'verify-sites-puppeteer 2026-08-22, address-shaped state mentions on the live page read MA; title Westwood Public Library.' },
};

function hostOf(u) {
  try { return new URL(u).host.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

const GUARD_MARK = 'urlCollision';
const GUARD = `      // An entry carrying urlCollision points at a DIFFERENT institution than its own
      // name and state claim — the guessed {city}library.org host actually belongs to
      // another state's library. Scraping it imported that library's events under this
      // state. See scripts/disable-collided-urls.js for the per-host evidence.
      // The 📍 header above and the "Found 0 events" line below are BOTH required: the
      // library-site audit pairs them, and dropping the pair would delete this library
      // from the audit instead of showing it as a known, explained gap.
      if (library.urlCollision) {
        console.log(\`   ⏭️  skipped — urlCollision: \${library.urlCollision}\`);
        console.log(\`   Found 0 events\`);
        continue;
      }
`;

function main() {
  const files = fs.readdirSync(SCRAPERS).filter(f => /^scraper-wordpress-libraries-[a-z]{2}\.js$/.test(f));
  let flagged = 0, alreadyFlagged = 0, guardsAdded = 0, filesChanged = 0;
  const byHost = {};

  const skippedShape = [];
  for (const f of files) {
    const abs = path.join(SCRAPERS, f);
    let src = fs.readFileSync(abs, 'utf8');
    const before = src;

    // Only the 21 active-region files use the per-library `📍 {name}` shape that the
    // guard hooks into. The inactive-region files (AK, CA, OH, TX, …) are structured
    // differently and are never run. Skip them ENTIRELY rather than flagging entries
    // there: a urlCollision flag with no guard to read it is worse than no flag at all,
    // because it looks handled and is not — it would silently do nothing on the day that
    // region is activated.
    if (!/console\.log\(`📍 \$\{library\.name\}/.test(src) && !src.includes('if (library.urlCollision)')) {
      skippedShape.push(f);
      continue;
    }

    // 1. Flag colliding entries. Operate line-by-line: every config entry in these files
    //    is exactly one line, which is what makes this safe to do textually.
    src = src.split('\n').map(line => {
      const m = /^\s*\{\s*name:\s*'([^']*)'.*?\burl:\s*'([^']*)'/.exec(line);
      if (!m) return line;
      const [, name, url] = m;
      const truth = GROUND_TRUTH[hostOf(url)];
      if (!truth) return line;
      const stM = /\bstate:\s*'([^']*)'/.exec(line);
      const state = stM ? stM[1].toUpperCase() : '';
      if (!state || state === truth.state) return line;      // this one is the right claim
      if (line.includes(GUARD_MARK)) { alreadyFlagged++; return line; }
      flagged++;
      byHost[hostOf(url)] = byHost[hostOf(url)] || [];
      byHost[hostOf(url)].push(`${state} ${name}  (${f})`);
      // DEAD is not a state — it means the host does not resolve, 404s, or serves an
      // unrelated site, so NO claimant is correct and every one is disabled. Kept as a
      // distinct marker rather than inventing a state, because "is DEAD, not NJ" would
      // read as a geographic claim and this is a liveness claim.
      const reason = truth.state === 'DEAD'
        // NO APOSTROPHES in this string. It is written into a single-quoted JS literal in
        // the config files, and "no state's entry" broke four of them on 2026-08-22 —
        // caught by the node -c pass, which is exactly why that pass is mandatory.
        ? `${hostOf(url)} is dead or serves an unrelated site — no state entry is correct`
        : `${hostOf(url)} is ${truth.state}, not ${state}`;
      // Insert before the closing brace of the entry.
      return line.replace(/\}\s*,?\s*$/, m2 => `, urlCollision: '${reason}' ${m2}`);
    }).join('\n');

    // 2. Add the run-time guard once, right after the 📍 header so the audit pair holds.
    if (!src.includes('if (library.urlCollision)')) {
      const anchor = src.match(/^.*console\.log\(`📍 \$\{library\.name\}.*\n/m);
      if (anchor) { src = src.replace(anchor[0], anchor[0] + GUARD); guardsAdded++; }
      else console.error(`  !! ${f}: 📍 header vanished — guard NOT added, investigate`);
    }

    if (src !== before) {
      filesChanged++;
      if (SAVE) fs.writeFileSync(abs, src, 'utf8');
    }
  }

  console.log(`${VERIFY ? 'VERIFY' : SAVE ? 'SAVE' : 'DRY RUN'} — WordPress config files scanned: ${files.length}`);
  console.log(`  entries newly flagged urlCollision : ${flagged}`);
  console.log(`  entries already flagged            : ${alreadyFlagged}`);
  console.log(`  run-time guards added              : ${guardsAdded}`);
  console.log(`  files changed                      : ${filesChanged}`);
  console.log(`  files skipped (not per-library shape, inactive region): ${skippedShape.length}`);
  if (flagged) {
    console.log('\nDisabled entries by host (host\'s REAL state in brackets):');
    for (const [h, list] of Object.entries(byHost)) {
      console.log(`\n  ${h}  [truly ${GROUND_TRUTH[h].state}]`);
      list.forEach(l => console.log(`     ${l}`));
    }
  }
  if (!SAVE) console.log('\nDry run — re-run with --save to write.');
}

main();
