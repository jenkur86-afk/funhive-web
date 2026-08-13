#!/usr/bin/env node
/**
 * Regression suite for age-range detection.
 *
 * Run after ANY change to detectAgeRange() / resolveAgeRange() in
 * scrapers/helpers/supabase-adapter.js, or to normalizeAgeRange() in
 * scrapers/helpers/age-range-normalizer.js:
 *
 *   node scripts/test-age-detection.js
 *
 * Read-only — exercises flattenEvent() in memory, never touches the database.
 *
 * Why this file exists: age detection has now been broken and re-broken three
 * separate times (2026-08-01, 2026-08-03, 2026-08-04), each time by a change
 * that looked obviously correct in isolation. Two failure modes keep recurring
 * and BOTH are covered below — do not delete either group:
 *
 *   1. FALSE NEGATIVES — a clear age signal in the title is ignored, so the
 *      event silently defaults to "All Ages". Caused by generic supplied labels
 *      winning over the title, by trailing \b anchors that miss plurals, and by
 *      generic keywords shadowing more specific grade patterns.
 *
 *   2. FALSE POSITIVES — unrelated numbers in a title get read as ages. Times
 *      ("1:00 - 2:30p"), registration-ID/year pairs ("2608-2026"), prices and
 *      skill levels have all been misread as age ranges by past "fixes" that
 *      piped raw titles into normalizeAgeRange(). The negative controls below
 *      are what caught that, live, before it reached production.
 *
 * A subtlety worth knowing before you "fix" a bucket assignment: normalizeAgeRange()
 * buckets a range by its LOWER BOUND. So "11-18" lands in Tweens (9-12), not
 * Teens, and "4-12" lands in Preschool (3-5), not Kids. Several long-standing
 * mis-bucketings traced back to that alone.
 */

const { flattenEvent, resolveAgeRange } = require('../scrapers/helpers/supabase-adapter');

// [title, scraper-supplied ageRange, expected bracket, why it matters]
const CASES = [
  // --- generic supplied label must NOT beat an unambiguous title -------------
  ['Toddler Time Downtown (Ages 18-36 Months)', 'All Ages', 'Babies & Toddlers (0-2)', 'supplied catch-all vs explicit months'],
  ['Baby Bounce Northgate 10 am (Ages 0-18 Months)', 'All Ages', 'Babies & Toddlers (0-2)', 'supplied catch-all vs explicit months'],
  ['Preschool Storytime Northgate 10 am (Ages 3-5)', 'All Ages', 'Preschool (3-5)', 'supplied catch-all vs explicit ages'],
  ['Toddler Story Time', 'Library Programs', 'Babies & Toddlers (0-2)', 'WordPress category chip is not an audience'],
  ['Tween Crafting With Ms. Ji', 'All Ages', 'Tweens (9-12)', 'supplied catch-all vs keyword'],

  // --- a SPECIFIC supplied value is authoritative and must never be overridden
  ['Family Movie Night', 'Teens (13-18)', 'Teens (13-18)', 'specific supplied value wins'],
  ['Some Program', '6-8', 'Kids (6-8)', 'specific supplied range wins'],

  // --- plural keyword misses (trailing \b anchors) ---------------------------
  ['Teens: After-Hours Hide and Seek', '', 'Teens (13-18)', 'plural "teens"'],
  ['Play Session for Preschoolers', '', 'Preschool (3-5)', 'plural "preschoolers"'],
  ['Storytime for Infants', '', 'Babies & Toddlers (0-2)', 'plural "infants"'],

  // --- lower-bound bucketing -------------------------------------------------
  ['Teen Gaming Night', '', 'Teens (13-18)', 'bare teen must not land in Tweens'],
  ["Kid's Craft Slime", '', 'Kids (6-8)', 'generic kids must not land in Preschool'],

  // --- specificity ordering: grade beats generic kids ------------------------
  ['Curiosity Club', '', 'Kids (6-8)', 'grade range must not be shadowed by "kids"', 'This program is for kids from 3rd grade to 6th grade only.'],
  ['Makerspace Robotics', '', 'Kids (6-8)', 'explicit grade range', 'Grades 3-5 welcome.'],
  ['Robotics Lab', '', 'Kids (6-8)', 'elementary must not land in Preschool', 'Open to elementary students.'],

  // --- storytime / tots: the most common children's program names -----------
  // Added 2026-08-05. Bare "Storytime" carried no age signal at all and every
  // unqualified one defaulted to All Ages — confirmed live across 15 flagged
  // Barnes & Noble store calendars and a dozen library sites.
  ['Weekly Storytime', '', 'Preschool (3-5)', 'bare storytime must not be All Ages'],
  ['Saturday Storytime', 'All Ages', 'Preschool (3-5)', 'supplied catch-all vs bare storytime'],
  ['Story Hour', '', 'Preschool (3-5)', 'story hour variant'],
  ['Bookworms Storytime', '', 'Preschool (3-5)', 'branded storytime still resolves'],
  ['Tot Time', '', 'Babies & Toddlers (0-2)', 'tots keyword'],
  ['Wild Tykes', '', 'Babies & Toddlers (0-2)', 'tykes keyword'],
  // ordering: a more specific keyword must still win over the generic storytime rule
  ['Toddler Storytime', '', 'Babies & Toddlers (0-2)', 'qualified storytime keeps its specific bracket'],
  ['Preschool Storytime', '', 'Preschool (3-5)', 'qualified storytime keeps its specific bracket'],
  ['Tiny Tots Storytime', '', 'Babies & Toddlers (0-2)', 'tots must beat the generic storytime rule'],

  // --- NEGATIVE CONTROLS: must stay All Ages. Do not delete. -----------------
  // Guards on the storytime rule above — each is a real false-positive shape.
  ['Family Storytime', '', 'All Ages', 'family storytime must stay All Ages'],
  ['Storytime for Adults', '', 'All Ages', 'adult storytime must not become a kids event'],
  ['Book Club in the Storytime Room', '', 'All Ages', 'venue mention is not an audience'],
  ['Adventures in Acrylics 1:00 - 2:30p', 'All Ages', 'All Ages', 'time must not read as ages'],
  ['2608-2026 Swim Lessons Level 3', 'All Ages', 'All Ages', 'registration ID must not read as ages'],
  ['Route 66 Heritage Festival', '', 'All Ages', 'route number must not read as ages'],
  ['5th Annual Community Gala', '', 'All Ages', 'ordinal must not read as ages'],
  ['Board Meeting', '', 'All Ages', 'no signal'],
  ['Community BBQ', 'All Ages', 'All Ages', 'genuinely all-ages'],
  ['Held at Lincoln Elementary', '', 'All Ages', 'venue name is not an audience'],
  ['Juneteenth Celebration', '', 'All Ages', '"teen" inside another word'],
  ['Family Fun Day', '', 'All Ages', 'family context'],

  // --- Supplied 'Adults' must not delete an event whose title says otherwise ---
  // Added 2026-08-13. A supplied value that normalizes to 'Adults' is uniquely
  // destructive: saveEvent/flattenEvent REJECT the row outright rather than just
  // mislabelling it. MacaroniKid assigns its "Who" field verbatim, so when the
  // unit is lost upstream a toddler range arrives as a bare "18-36" -> Adults,
  // and "Toddler Time (Ages 18-36 months)" was silently dropped 8 times in the
  // 2026-08-13 NH run. resolveAgeRange() now gives 'Adults' the same second
  // opinion 'All Ages' already got. The CONTROLS below are the important half:
  // a genuinely adult event has no non-adult title signal and must STILL resolve
  // to Adults so it is still rejected.
  ['Toddler Time (Ages 18-36 months)', '18-36', 'Babies & Toddlers (0-2)', 'unit-stripped Who must not delete a toddler event'],
  ['Toddler Time (Ages 18-36 months)', '18+', 'Babies & Toddlers (0-2)', 'bogus 18+ Who must not beat an explicit months title'],
  ['Baby Bounce (Ages 0-18 months)', '18-36', 'Babies & Toddlers (0-2)', 'title months range wins over adult-looking supplied value'],
];

// Cases whose CORRECT outcome is 'Adults'. These cannot go in CASES above:
// flattenEvent() rejects an adult-only row (returns null / throws), so the
// harness can never observe 'Adults' as an age_range through that path. They are
// asserted directly against resolveAgeRange() instead, and they are the load-
// bearing half of the 2026-08-13 change — the risk of giving supplied 'Adults' a
// second opinion is that genuine adult events stop being rejected.
// Titles are chosen to survive the NON-FAMILY filter, which runs earlier and
// would otherwise reject them for an unrelated reason and prove nothing:
// "Adult Book Club", "Wine Tasting (21+)", "Knitting Circle" and "Genealogy
// Workshop" all trip that filter, so none of them can test this gate.
const ADULTS_CASES = [
  ['Quiet Reading Hour', 'Adults', 'supplied Adults with no non-adult title signal must stay Adults'],
  ['Quiet Reading Hour', '18+', 'supplied 18+ with no non-adult title signal must stay Adults'],
  ['Afternoon Lecture Series', 'Adults', 'neutral title must not invent a non-adult signal'],
];

let pass = 0;
const failures = [];

for (const [title, supplied, expected, why, description] of CASES) {
  const row = flattenEvent({
    name: title,
    description: description || '',
    ageRange: supplied,
    eventDate: 'August 15, 2026',
    venue: 'Test Venue',
    city: 'Testville',
    state: 'TN',
    metadata: { scraperName: 'test-age-detection', sourceUrl: 'https://example.org/events' },
  });
  const got = row ? row.age_range : '(rejected)';
  if (got === expected) {
    pass++;
  } else {
    failures.push({ title, supplied, expected, got, why });
  }
}

// Adult-only outcomes, asserted directly (see ADULTS_CASES comment above).
for (const [title, supplied, why] of ADULTS_CASES) {
  const got = resolveAgeRange({ name: title, description: '', ageRange: supplied });
  if (got === 'Adults') {
    pass++;
  } else {
    failures.push({ title, supplied, expected: 'Adults', got, why });
  }
}

// Provenance fields — these are what the per-site audits key off.
const prov = flattenEvent({
  name: 'Provenance Check', eventDate: 'August 15, 2026', venue: 'V', state: 'TN',
  sourceUrl: 'https://lib.example.org/calendar',
  metadata: { scraperName: 'test-age-detection' },
});
const provChecks = [
  ['scraped_at is always set', !!prov.scraped_at],
  ['source_url picked up from top-level sourceUrl', prov.source_url === 'https://lib.example.org/calendar'],
];

console.log('\nAGE DETECTION REGRESSION SUITE');
console.log('─'.repeat(60));
for (const f of failures) {
  console.log(`FAIL  ${f.title}`);
  console.log(`        supplied="${f.supplied}"  want=${f.expected}  got=${f.got}`);
  console.log(`        (${f.why})`);
}
for (const [label, ok] of provChecks) {
  if (!ok) failures.push({ title: label });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}
console.log('─'.repeat(60));
console.log(`${pass}/${CASES.length + ADULTS_CASES.length} age cases passed, ${failures.length} total failure(s)\n`);

process.exit(failures.length ? 1 : 0);
