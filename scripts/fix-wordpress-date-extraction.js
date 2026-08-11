#!/usr/bin/env node
/**
 * Wires scrapers/helpers/dom-date-resolver.js into the WordPress-{state}
 * library scrapers.
 *
 * Both extraction variants read a date element's .textContent and never looked
 * at the `datetime` attribute, so on themes that render a clock time as the
 * visible text the family skipped the event as an invalid date. A full Group 1
 * run on 2026-08-10 skipped 4000+ events this way; the most common values were
 * "6:00pm-7:00pm", "1:00pm-2:00pm", "All Day" and "10:30 AM".
 *
 * Every replacement target must occur EXACTLY once in a file or that file is
 * refused — these scrapers have drifted apart over time and a blind replace
 * would corrupt the ones that no longer match.
 *
 * Dry run by default; --save to write.
 *   node scripts/fix-wordpress-date-extraction.js
 *   node scripts/fix-wordpress-date-extraction.js --save
 */
const fs = require('fs');
const path = require('path');

const SAVE = process.argv.includes('--save');
const DIR = path.join(__dirname, '..', 'scrapers');

const REQUIRE_LINE = "const { RESOLVER_SRC } = require('./helpers/dom-date-resolver');";
const ANCHOR_REQUIRE = "const { extractJsonLdEvents } = require('./helpers/jsonld-events-helper');";

const EVAL_OPEN = 'const libraryEvents = await page.evaluate((libName) => {';
const EVAL_OPEN_NEW =
  'const libraryEvents = await page.evaluate((libName, __resolverSrc) => {\n' +
  "        // Rehydrate the shared resolver — page.evaluate cannot close over Node scope.\n" +
  "        const resolveEventDate = new Function('return ' + __resolverSrc)();";

const EVAL_CLOSE = '}, library.name);';
const EVAL_CLOSE_NEW = '}, library.name, RESOLVER_SRC);';

// Variant-specific date assignment.
const CT_FROM = "date: date ? date.textContent.trim() : ''";
const CT_TO = "date: resolveEventDate(card) || (date ? date.textContent.trim() : '')";

const GA_FROM = "date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',";
const GA_TO = "date: resolveEventDate(card) || (possibleDates.length > 0 ? possibleDates[0].textContent.trim() : ''),";

const ACTIVE = ['va','ga','nc','ct','tn','al','vt','md','ny','fl','nj','ms','me','pa','ma','ky','sc','wv','de','ri','nh'];

const changed = [];
const refused = [];

function once(src, needle) {
  return src.split(needle).length - 1 === 1;
}

for (const st of ACTIVE) {
  const file = `scraper-wordpress-libraries-${st}.js`;
  const full = path.join(DIR, file);
  if (!fs.existsSync(full)) { refused.push({ file, reason: 'no such file' }); continue; }

  let src = fs.readFileSync(full, 'utf8');

  if (src.includes('dom-date-resolver')) { refused.push({ file, reason: 'already wired' }); continue; }

  const isGA = src.includes(GA_FROM);
  const isCT = src.includes(CT_FROM);
  if (!isGA && !isCT) { refused.push({ file, reason: 'neither variant date pattern found' }); continue; }
  if (isGA && isCT) { refused.push({ file, reason: 'both variant patterns present — ambiguous' }); continue; }

  const dateFrom = isGA ? GA_FROM : CT_FROM;
  const dateTo = isGA ? GA_TO : CT_TO;

  for (const [needle, label] of [[EVAL_OPEN, 'evaluate open'], [EVAL_CLOSE, 'evaluate close'], [dateFrom, 'date assignment'], [ANCHOR_REQUIRE, 'require anchor']]) {
    if (!once(src, needle)) {
      refused.push({ file, reason: `${label} does not occur exactly once` });
      src = null;
      break;
    }
  }
  if (!src) continue;

  src = src.replace(ANCHOR_REQUIRE, ANCHOR_REQUIRE + '\n' + REQUIRE_LINE);
  src = src.replace(EVAL_OPEN, EVAL_OPEN_NEW);
  src = src.replace(EVAL_CLOSE, EVAL_CLOSE_NEW);
  src = src.replace(dateFrom, dateTo);

  changed.push({ file, variant: isGA ? 'GA' : 'CT' });
  if (SAVE) fs.writeFileSync(full, src, 'utf8');
}

console.log(`=== ${SAVE ? 'REWROTE' : 'WOULD REWRITE'} ${changed.length} files ===`);
for (const c of changed) console.log(`  ${c.file}  [${c.variant}-variant]`);
if (refused.length) {
  console.log(`\n=== REFUSED ${refused.length} ===`);
  for (const r of refused) console.log(`  ${r.file} — ${r.reason}`);
}
console.log(`\n${SAVE ? 'Saved.' : 'Dry run — pass --save to write.'}`);
