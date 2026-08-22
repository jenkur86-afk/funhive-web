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
        ? `${hostOf(url)} is dead or serves an unrelated site — no state's entry is correct`
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
