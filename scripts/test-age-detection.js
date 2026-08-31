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

const { flattenEvent, resolveAgeRange, detectAgeRange } = require('../scrapers/helpers/supabase-adapter');

// [title, scraper-supplied ageRange, expected bracket, why it matters]
const CASES = [
  // --- generic supplied label must NOT beat an unambiguous title -------------
  ['Toddler Time Downtown (Ages 18-36 Months)', 'All Ages', 'Babies & Toddlers (0-2)', 'supplied catch-all vs explicit months'],
  ['Baby Bounce Northgate 10 am (Ages 0-18 Months)', 'All Ages', 'Babies & Toddlers (0-2)', 'supplied catch-all vs explicit months'],
  ['Preschool Storytime Northgate 10 am (Ages 3-5)', 'All Ages', 'Preschool (3-5)', 'supplied catch-all vs explicit ages'],
  ['Toddler Story Time', 'Library Programs', 'Babies & Toddlers (0-2)', 'WordPress category chip is not an audience'],
  ['Tween Crafting With Ms. Ji', 'All Ages', 'Tweens (9-12)', 'supplied catch-all vs keyword'],
  // Added 2026-08-20 from a confirmed MISMATCH at Springfield City Library:
  // Mason Square Branch — "Crafternoon for T(w)eens" named its own bracket in
  // the title and still landed in All Ages, because \btween cannot match the
  // parenthesised spelling. The two controls below keep the 'w' mandatory.
  ['Crafternoon for T(w)eens', 'All Ages', 'Tweens (9-12)', 'parenthesised t(w)een spelling'],
  ['Teen Movie Night', '', 'Teens (13-18)', 'plain teen must NOT be captured by the t(w)een rule'],
  ['Juneteenth Block Party', '', 'All Ages', 't(w)een rule must not fire inside another word'],

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

  // --- a SINGLE grade, no range and no "and up" (added 2026-08-21) -----------
  // Every grade regex before this one needs a second number or an and-up phrase,
  // so a lone grade fell through to All Ages. Found on Ringwood Public Library.
  ['7th Grade Summer Math Tutoring', '', 'Tweens (9-12)', 'lone ordinal grade -> age 12'],
  ['Grade 3 Book Group', '', 'Kids (6-8)', 'lone word-first grade -> age 8'],
  ['12th Grade College Prep', '', 'Teens (13-18)', 'lone grade at the top of the range'],
  // Closed ranges and "and up" must keep priority over the lone-grade rule, or a
  // range gets truncated to its first grade.
  ['Lego Club', '', 'Kids (6-8)', 'closed range still wins over lone-grade', 'Grades 3-5 welcome.'],
  ['Retro Game Night', '', 'Tweens (9-12)', 'and-up still wins over lone-grade', 'Open to youth in grades 6 and up.'],
  // Negative controls: "grade" in a non-audience sense must not set an age.
  ['Software Upgrade Help Session', '', 'All Ages', 'upgrade must not match the grade rule'],
  ['1000 Books Before Kindergarten', '', 'All Ages', 'bare kindergarten is a BABY program — must not become age 5'],

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

  // --- FIELD-SCOPED FAMILY GUARD (2026-08-23) --------------------------------
  // The "…and not family" guards on the teen / kids / tots / storytime rules
  // were evaluated over title + description combined, so one incidental word in
  // a blurb cancelled an explicit audience keyword in the title. Found on
  // Wilmington Memorial Library (MacaroniKid-MA-burlingtonma), 75% All Ages,
  // whose "Bilingual Story Hour" was All Ages only because its blurb names the
  // "Community Teamwork Family Resource Network" — an organisation, not an
  // audience. Both directions are covered; do not delete either half.
  ['Bilingual Story Hour', '', 'Preschool (3-5)',
    'family word in the DESCRIPTION must not cancel a storytime title',
    'Practice a new language with the Community Teamwork Family Resource Network!'],
  ['Teen Book Club', '', 'Teens (13-18)',
    'family word in the DESCRIPTION must not cancel a teen title',
    'Bring the family!'],
  ['Kids Craft Slime', '', 'Kids (6-8)',
    'family word in the DESCRIPTION must not cancel a kids title',
    'A great family activity.'],
  ['Tot Time', '', 'Babies & Toddlers (0-2)',
    'family word in the DESCRIPTION must not cancel a tots title',
    'A family favourite at our branch.'],
  // …and the guard must still fire when the family word is in the TITLE.
  ['Family Storytime', '', 'All Ages',
    'family in the TITLE still vetoes the storytime rule', 'Join us on Saturday!'],
  ['Family Movie Night for Kids', '', 'All Ages',
    'family in the TITLE still vetoes the kids rule', ''],
  // The ADULTS guard is deliberately NOT field-scoped — mislabelling an
  // adults-only event as a children's event is the costlier direction.
  ['Storytime', '', 'All Ages',
    'adults-only in the DESCRIPTION still vetoes the storytime rule',
    'An adults-only storytime with wine.'],
  // An explicit bracketed all-ages LABEL outranks the keyword rules…
  ['Musical Storytime (All Ages)', '', 'All Ages', 'bracketed all-ages label beats the storytime rule'],
  ['Craft Club [All Ages]', '', 'All Ages', 'square-bracket form of the same label'],
  // …but never the numeric rules, and never running prose.
  ['Storytime (Ages 3-5) (All Ages)', '', 'Preschool (3-5)', 'real numbers still outrank the label'],
  ['Hunt & Riddle - For kids of all ages', '', 'Kids (6-8)', 'prose "of all ages" is not a label'],
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

  // --- Open-ended lower bound: "ages N+" / "ages N and up" -------------------
  // Added 2026-08-24 from the Step 3c audit. The closed-range rule needs TWO
  // numbers, so "Ages 18+" fell through every numeric rule to the All Ages
  // catch-all. CivicRec's Recreation Campus (middletown-ny) stored "October 2026
  // Registration - Ages 18+" that way. The adult direction is the expensive one:
  // adult-only rows are meant to be REJECTED at save time on a family site, and
  // they can only be rejected if they resolve to Adults first.
  // The ADULT outcomes of this rule live in ADULTS_CASES below, because
  // flattenEvent() rejects adult-only rows outright and cannot report a bracket.
  ['Teen Night Ages 13+', '', 'Teens (13-18)', 'open-ended minimum that is NOT adult'],
  ['Lego Club Ages 6+', '', 'Kids (6-8)', 'open-ended minimum buckets on lower bound'],
  ['Ages 3-5 Storytime', '', 'Preschool (3-5)', 'closed range still beats the open-ended rule'],
  // The NEGATIVE controls for this rule are asserted directly against
  // detectAgeRange() in OPEN_ENDED_NEGATIVES below — they cannot run through
  // flattenEvent(), because a bare "18+" anywhere in a title trips the separate
  // pre-existing non-family rule and the row is rejected before any bracket is
  // reported. That rejection is orthogonal to what this rule is being tested for.

  // --- RecDesk notation: bare range + YR/YRS suffix, PreK levels, Gr K --------
  // Added 2026-08-22 from the Step 3c all-ages audit. Gymnastics Building 2105 Nash St
  // (RecDeskParks-lcncpr) sat at 174/175 All Ages while its own titles named the
  // bracket. Three separate shapes were unreachable by every existing rule.
  ['Gymnastics PreK2 4-5YR', 'All Ages', 'Preschool (3-5)', 'bare range with YR suffix'],
  ['Tumbling 6-8YR', 'All Ages', 'Kids (6-8)', 'YR suffix, no "ages" keyword'],
  ['Youth Basketball 9-12YRS', '', 'Tweens (9-12)', 'YRS plural suffix'],
  ['Swim Lessons 5-7 year olds', '', 'Preschool (3-5)', 'spelled-out "year olds"'],
  ['Gymnastics PreK1', '', 'Preschool (3-5)', 'PreK with a level digit — trailing \\b used to block this'],
  ['Camp Naticook: Chickadees: Gr K Session 9', 'All Ages', 'Preschool (3-5)', 'lone abbreviated Gr K'],
  ['Gr K-2 Art Club', '', 'Preschool (3-5)', 'abbreviated grade range with K lower bound'],

  // --- Youth-sport age-group notation: "10U" / "U12" -------------------------
  // Added 2026-08-31 from the Step 3c all-ages audit. 539 corpus rows carry this
  // notation and 422 sat in All Ages, concentrated in the parks families.
  ['Mitts Fastpitch 10U', 'All Ages', 'Tweens (9-12)', 'NNU form — "10 and under"'],
  ['Boys U12 Soccer', '', 'Tweens (9-12)', 'UNN form'],
  ['Baseball 8U Tee Ball', '', 'Kids (6-8)', 'NNU lands in Kids, not Preschool'],
  ['Girls 14U Volleyball', '', 'Teens (13-18)', 'NNU teen bracket'],
  ['Travel Basketball 18U', '', 'Teens (13-18)', '18U caps at 17-18 — "18-18" would normalize to Adults'],
  ['T-Ball (4U)', '', 'Preschool (3-5)', 'lowest in-range N'],
  ['Danville Soccer Club Fall Recreational Soccer U2-U7', '', 'Kids (6-8)',
   'scans for the first IN-RANGE token — U2 is skipped, U7 wins'],
  // CONTROLS. The 4..19 clamp exists for exactly one real-world collision.
  ['Elevation - The Ultimate Tribute to U2', '', 'All Ages', 'the band U2 must not read as ages 1-2'],
  ['Unforgettable Fire U2 Tribute Band', '', 'All Ages', 'band name again — N=2 is below the clamp'],
  ['Ukulele Jam', '', 'All Ages', 'letter after the u blocks the UNN shape'],
  ['Route 9 Cleanup', '', 'All Ages', 'a bare digit with no u is not an age group'],
  // CONTROLS for the three rules above — the YR rule is the only bare digit-range
  // scan in detectAgeRange(), so its anchor must hold against the classic shapes.
  ['Registration 2608-2026 Open', '', 'All Ages', 'four-digit ID pair has no YR anchor'],
  ['Bake Sale Tickets 10-15 dollars', '', 'All Ages', 'price range must not read as ages'],
  ['Grade A Beef Cookout', '', 'All Ages', '"Grade A" is not a school grade'],
  ['1000 Books Before Kindergarten', '', 'All Ages', 'spelled-out kindergarten stays excluded — this is a babies programme'],
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
  // Open-ended lower bound, added 2026-08-24. Before this, "Ages 18+" matched no
  // numeric rule and resolved to the All Ages catch-all — which on a family events
  // site means an adult-only row gets PUBLISHED rather than rejected.
  ['October 2026 Registration - Ages 18+', '', 'detected "ages 18+" must reach Adults, not All Ages'],
  ['Pickleball Ages 21 and up', '', 'spelled-out "and up" reaches Adults'],
  ['Open Swim Ages 55 and older', '', 'spelled-out "and older" reaches Adults'],
];

// The fixture date must always be in the FUTURE. flattenEvent() rejects past
// events by design, so a hardcoded literal turns this whole suite into a hard
// crash the moment that date passes — which is exactly what happened: the date
// was 'August 15, 2026', and on 2026-08-20 the suite could not run at all, so
// the guard rail CLAUDE.md tells you to run after every detectAgeRange() change
// was silently down. Derived from today so it can never expire again.
const FIXTURE_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
})();

let pass = 0;
const failures = [];

for (const [title, supplied, expected, why, description] of CASES) {
  const row = flattenEvent({
    name: title,
    description: description || '',
    ageRange: supplied,
    eventDate: FIXTURE_DATE,
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

// Negative controls for the open-ended "ages N+" rule (2026-08-24), asserted
// against detectAgeRange() directly. A bare "N+" with no "age(s)" keyword is a
// price, a room number or a capacity — never an audience. This is the same
// anchoring discipline recorded on 2026-08-03, when feeding raw titles into
// normalizeAgeRange() misread times and registration IDs as age ranges.
const OPEN_ENDED_NEGATIVES = [
  ['Concert tickets $18+ at the door', 'price, no "ages" keyword'],
  ['Room 18+ Annex Meeting', 'room number, no "ages" keyword'],
  ['Fits 21+ people in the hall', 'capacity, no "ages" keyword'],
];
for (const [title, why] of OPEN_ENDED_NEGATIVES) {
  const got = detectAgeRange(title, '');
  if (got === null || got === undefined) {
    pass++;
  } else {
    failures.push({ title, supplied: '', expected: 'null (no age signal)', got, why });
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
  name: 'Provenance Check', eventDate: FIXTURE_DATE, venue: 'V', state: 'TN',
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
// Every assertion group must be counted here. OPEN_ENDED_NEGATIVES was added
// 2026-08-24 and briefly made the suite print "83/80", which reads as a broken
// harness rather than a passing one — if you add a group, add it to this sum.
const TOTAL_CASES = CASES.length + ADULTS_CASES.length + OPEN_ENDED_NEGATIVES.length;
console.log(`${pass}/${TOTAL_CASES} age cases passed, ${failures.length} total failure(s)\n`);

process.exit(failures.length ? 1 : 0);
