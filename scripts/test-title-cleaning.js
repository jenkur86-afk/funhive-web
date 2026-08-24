#!/usr/bin/env node
/**
 * Regression suite for event-title cleaning in scrapers/helpers/supabase-adapter.js.
 *
 *   node scripts/test-title-cleaning.js
 *
 * Read-only — pure string functions, never touches the database.
 *
 * Run after ANY change to stripPromoBracketCruft(), collapseDoubledTitle() or
 * normalizeShoutedTitle(), and after changing the order they are composed in
 * (both flattenEvent() and the legacy save path call all three in sequence).
 *
 * The NEGATIVE CONTROLS in each group are the point of this file. Every one of
 * these functions is a heuristic over free text, and the failure that matters is
 * not "it missed one" — it is "it mangled a real title and nobody noticed",
 * which is unrecoverable once written. collapseDoubledTitle() in particular sits
 * one guard away from turning "couscous" into "cous"; do not remove the
 * multi-word or minimum-length guard without replacing it with something
 * stronger.
 */

const {
  stripPromoBracketCruft,
  collapseDoubledTitle,
  decodeHtmlEntities,
  normalizeShoutedTitle,
} = require('../scrapers/helpers/supabase-adapter');

// [fn, input, expected, why it matters]
const CASES = [
  // --- collapseDoubledTitle: the real doubled titles it was written for -------
  // Found 2026-08-23: Pittsburgh Cultural Trust listings reaching
  // MacaroniKid-PA-southhills / -cityofpittsburgh stored every title twice.
  [collapseDoubledTitle, "Disney's The Lion KingDisney's The Lion King",
    "Disney's The Lion King", 'the case this was written for'],
  [collapseDoubledTitle, 'Ninja KidzNinja Kidz', 'Ninja Kidz',
    'doubling also destroys the word boundary age detection needs'],
  [collapseDoubledTitle, 'Family FestFamily Fest', 'Family Fest', 'short but multi-word'],
  [collapseDoubledTitle, 'Great Lawn Movie Nights: The Lion King (1994)Great Lawn Movie Nights: The Lion King (1994)',
    'Great Lawn Movie Nights: The Lion King (1994)', 'punctuation inside the halves'],
  [collapseDoubledTitle, 'Tot TimeTot Time', 'Tot Time', 'exactly at the 8-char half minimum'],

  // --- collapseDoubledTitle NEGATIVE CONTROLS: must be untouched. Do not delete.
  [collapseDoubledTitle, 'couscous', 'couscous', 'real doubled WORD — the multi-word guard'],
  [collapseDoubledTitle, 'bonbon', 'bonbon', 'real doubled word'],
  [collapseDoubledTitle, 'cancan', 'cancan', 'real doubled word'],
  [collapseDoubledTitle, 'Cancan Night', 'Cancan Night', 'doubled word inside a real title'],
  [collapseDoubledTitle, 'New York, New York', 'New York, New York',
    'a separator makes the halves unequal — this is why real titles are safe'],
  [collapseDoubledTitle, 'Duran Duran Tribute', 'Duran Duran Tribute', 'repeated word, not a doubled title'],
  [collapseDoubledTitle, 'Bye Bye Birdie', 'Bye Bye Birdie', 'repeated word, not a doubled title'],
  [collapseDoubledTitle, 'Story Time', 'Story Time', 'ordinary title'],
  [collapseDoubledTitle, '', '', 'empty input'],
  [collapseDoubledTitle, null, null, 'null input'],

  // --- stripPromoBracketCruft ------------------------------------------------
  [stripPromoBracketCruft, 'Toddler Time (TICKET LINK)', 'Toddler Time', 'promo bracket removed'],
  [stripPromoBracketCruft, 'Fall Fest [SOLD OUT]', 'Fall Fest', 'square-bracket form'],
  // Screen-reader chrome captured by a textContent read inside the link.
  // Found 2026-08-23: 61 rows across four MacaroniKid sites.
  [stripPromoBracketCruft, "Toddler Storytime(Opens in a new tab)", "Toddler Storytime",
    "no space before the bracket — the leading \s* must allow that"],
  [stripPromoBracketCruft, "Baby Storytime (Opens in a New Window)", "Baby Storytime", "window variant, mixed case"],
  [stripPromoBracketCruft, "Get Hooked: Teen Crochet & Knitting Group (Grades 6-12)(Opens in a new tab)",
    "Get Hooked: Teen Crochet & Knitting Group (Grades 6-12)",
    "NEGATIVE CONTROL inside a positive: the grade bracket must survive the strip"],
  [stripPromoBracketCruft, "Story Hour [external link]", "Story Hour", "square-bracket external-link form"],
  [stripPromoBracketCruft, "Grand Opening (New Wing)", "Grand Opening (New Wing)",
    "NEGATIVE CONTROL: \"New Wing\" is not \"new window\""],
  [stripPromoBracketCruft, 'Story Hour (Ages 3-5)', 'Story Hour (Ages 3-5)',
    'NEGATIVE CONTROL: an age bracket is not promo cruft and must survive'],
  [stripPromoBracketCruft, 'Movie Night (1994)', 'Movie Night (1994)',
    'NEGATIVE CONTROL: a year is not promo cruft'],

  // --- decodeHtmlEntities (added 2026-08-23) ---------------------------------
  // 344 event names and 7 venues stored a raw entity and rendered it literally on the
  // site. Concentrated in scrapers that read an attribute instead of textContent.
  [decodeHtmlEntities, "Rocky&#8217;s Book Club", "Rocky’s Book Club", "numeric entity, the most common shape"],
  [decodeHtmlEntities, "Sit &amp; Stitch @ Wylliesburg Library", "Sit & Stitch @ Wylliesburg Library", "named entity"],
  [decodeHtmlEntities, "Little Readers Club &#8211; Wythe County Library", "Little Readers Club – Wythe County Library", "en-dash"],
  [decodeHtmlEntities, "&quot;Fill a Bag&quot; Fundraiser", "\"Fill a Bag\" Fundraiser", "quotes"],
  [decodeHtmlEntities, "Caf&#233; Night", "Café Night", "accented letter"],
  [decodeHtmlEntities, "Double &amp;#8217; encoded", "Double ’ encoded", "double-encoded — needs the second pass"],
  // MUST BE UNTOUCHED. Do not delete.
  [decodeHtmlEntities, "Storytime & Craft", "Storytime & Craft", "a bare ampersand is not an entity"],
  [decodeHtmlEntities, "Q&A with the Author", "Q&A with the Author", "NEGATIVE CONTROL: &A is not an entity"],
  [decodeHtmlEntities, "Rock &amp roll", "Rock &amp roll", "NEGATIVE CONTROL: no semicolon, not an entity"],
  [decodeHtmlEntities, "Code &lt;script&gt; Club", "Code &lt;script&gt; Club",
    "angle brackets are DELIBERATELY left encoded — decoding can only make a title look like broken markup"],

  // --- normalizeShoutedTitle -------------------------------------------------
  [normalizeShoutedTitle, 'PUMPKIN PATCH FAMILY FUN DAY', 'Pumpkin Patch Family Fun Day', 'shouted title normalized'],
  [normalizeShoutedTitle, 'STEM Night at the Library', 'STEM Night at the Library',
    'NEGATIVE CONTROL: mixed case is left alone'],
  [normalizeShoutedTitle, 'PTA', 'PTA', 'NEGATIVE CONTROL: short acronym is left alone'],
];

let pass = 0;
const failures = [];

for (const [fn, input, expected, why] of CASES) {
  let got;
  try {
    got = fn(input);
  } catch (err) {
    got = `(threw: ${err.message})`;
  }
  if (got === expected) pass++;
  else failures.push({ fn: fn.name, input, expected, got, why });
}

console.log('\nTITLE CLEANING REGRESSION SUITE');
console.log('─'.repeat(60));
for (const f of failures) {
  console.log(`FAIL  ${f.fn}(${JSON.stringify(f.input)})`);
  console.log(`        want=${JSON.stringify(f.expected)}  got=${JSON.stringify(f.got)}`);
  console.log(`        (${f.why})`);
}
console.log('─'.repeat(60));
console.log(`${pass}/${CASES.length} title cases passed, ${failures.length} failure(s)\n`);
process.exit(failures.length ? 1 : 0);
