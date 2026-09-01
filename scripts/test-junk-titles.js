#!/usr/bin/env node
/**
 * Regression suite for isJunkTitle() in scrapers/helpers/supabase-adapter.js.
 *
 *   node scripts/test-junk-titles.js
 *
 * Read-only — calls isJunkTitle() directly, never touches the database.
 *
 * Run this after ANY change to isJunkTitle(), the NAV_JUNK list, or the
 * GOVERNANCE list. isJunkTitle() DELETES: a title it rejects is dropped at save
 * time across all 185+ scrapers and never reaches the events table, so a rule
 * that is one word too broad silently removes real programming and leaves no
 * trace anywhere to notice it by.
 *
 * The MUST-SURVIVE group is the important half of this file. The governance
 * rules added 2026-08-20 exist because parks-and-rec feeds publish their town's
 * meeting agenda alongside their programming (South Kingstown Parks and
 * Recreation was contributing Town Council, Housing Court, Probate Court and
 * four advisory commissions as "events"). But "Teen Advisory Board" and "Tween
 * Advisory Board" are common REAL library programs — a measured scan of 12,000
 * rows found 26 governance-shaped titles, six of which were exactly those. The
 * audience rescue in isJunkTitle() is what separates them. Do not delete it,
 * and do not delete these cases.
 */

const { isJunkTitle } = require('../scrapers/helpers/supabase-adapter');

// [title, expected isJunkTitle result, why it matters]
const CASES = [
  // --- navigation / boilerplate junk ----------------------------------------
  ['Home', true, 'nav item'],
  ['Read More', true, 'nav item'],
  ['Page not found', true, 'error page'],
  ['3 events', true, 'calendar day-cell badge'],
  ['Saturday, September 5, 2026', true, 'TEC day-group heading'],
  ['------', true, 'repeated punctuation'],
  ['12345', true, 'no letters'],
  ['ab', true, 'too short'],

  // --- opening-hours / closure markers (added 2026-08-23) --------------------
  // Small libraries run one Google Calendar for both programme and open/closed status.
  // GoogleCalendar-VT saved 42 rows on its first run and 39 were "Library OPEN".
  ["Library OPEN", true, "opening-hours marker, not an event"],
  ["LIBRARY OPEN", true, "same, shouted"],
  ["The Library is Closed", true, "closure marker"],
  ["Open", true, "bare status word"],
  ["Closed", true, "bare status word"],
  ["Library Closed for Labor Day", true, "holiday closure marker"],
  ["Closed Today", true, "closure marker"],
  // MUST SURVIVE: "open" is a common word in real event names. Every one of these
  // carries content beyond the status phrase and is real programming.
  ["Open Mic Night", false, "real event — do not let the open rule widen"],
  ["Open House", false, "real event"],
  ["Grand Opening", false, "real event"],
  ["Opening Reception", false, "real event"],
  ["Open Play", false, "real drop-in programme"],
  ["Open Gym Time", false, "real drop-in programme"],
  ["Open Swim", false, "real drop-in programme"],
  ["Library Open House", false, "real event that also names the library"],
  ["Closed Captioning Workshop", false, "closed as a modifier, not a status"],

  // --- municipal governance agendas (added 2026-08-20) ----------------------
  ['Town Council', true, 'governance body'],
  ['Town Council Meeting', true, 'governance body'],
  ['Charleston City Council Meeting (City Hall Council Chambers)', true, 'governance body mid-title'],
  ['Planning Board - Regular Session', true, 'governance body'],
  ['Zoning Board of Review', true, 'governance body'],
  ['Municipal Court', true, 'court docket'],
  ['Housing Court', true, 'court docket'],
  ['Probate Court', true, 'court docket'],
  ['Recreation Commission', true, 'governance body'],
  ['Historic District Commission', true, 'governance body'],
  ['Waterfront Advisory Commission', true, 'advisory body'],
  ['Bicycle-Pedestrian Advisory Committee', true, 'advisory body'],
  ['Technical Review Committee (TRC)', true, 'advisory body'],
  ['Economic Development Committee', true, 'advisory body'],

  // --- MUST SURVIVE. Do not delete. -----------------------------------------
  // Real library/rec programming that the governance rules would otherwise eat.
  ['Teen Advisory Board', false, 'REAL library program — the rescue exists for this'],
  ['Tween Advisory Board', false, 'REAL library program'],
  // The "t(w)een" spelling shipped in detectAgeRange() on 2026-08-20 but was NOT
  // added to the junk-title AUDIENCE_RESCUE the same day, so this exact title was
  // silently DELETED until 2026-08-21. Both spellings must survive.
  ['T(w)een Advisory Board', false, 'REAL library program — t(w)een spelling'],
  ['T(w)eens Advisory Committee', false, 'REAL library program — t(w)eens plural'],
  ['Teen Advisory Board (TAB) Meeting', false, 'REAL library program'],
  ['Mount Airy Teen Advisory Board', false, 'REAL library program, prefixed'],
  ['Teen Advisory Board (TAB) Meeting - Colts Neck Chapter', false, 'REAL library program, suffixed'],
  ['Youth Advisory Council', false, 'youth programming, not governance'],
  ['Junior Advisory Committee', false, 'youth programming, not governance'],
  ['Kids Advisory Board', false, 'youth programming, not governance'],
  // Ordinary titles that must never be junk.
  ['Board Meeting', false, 'bare "board" is not a governance match'],
  ['Family Storytime', false, 'ordinary program'],
  // --- facility inventory / membership SKUs (added 2026-08-30) ---------------
  // CivicRec publishes reservable facilities and purchasable memberships in the
  // same catalog as its programmes. Measured over 126,840 live rows: 924 facility
  // rows, 193 membership rows.
  ['RV Site #07', true, 'campsite reservation, not an event'],
  ['Tennis Court 6', true, 'court booking'],
  ['Soccer Field - 1', true, 'field booking'],
  ['Gymnasium', true, 'bare facility name'],
  ['Shelter #3 North', true, 'shelter booking'],
  ['Multi-Purpose Field #3', true, 'field booking'],
  ['Pool Membership - Annual (Family) (PMAF)', true, 'membership SKU'],
  ['Program Punch Card: 5 Visits', true, 'punch-card product'],
  ['2026 TR Membership Dues', true, 'dues product'],
  ['NON-Resident PRO Annual', true, 'non-resident membership term'],
  ['Pickleball Non-Resident Season Pass 2026', true, 'season pass product'],
  // MUST SURVIVE. Every one of these was found in the live corpus while
  // validating the two rules above, and each would be real programming lost.
  ['Open Gym', false, 'a real drop-in session, not a booking of the gym'],
  ['Open Swim', false, 'real programmed session'],
  ['Little Gym', false, 'The Little Gym is a real childrens gym brand'],
  ['Basketball Prep Clinic 10/3 MS', false, 'real clinic that names a sport'],
  ['Callahan Baseball #6', false, 'proper noun present, not pure facility filler'],
  ['White Oak Pavilion', false, 'proper noun present, left alone on purpose'],
  ['1-2-3 Play with Me', false, 'real toddler program, not a 3-play ticket'],
  // --- administrative paperwork as calendar items (added 2026-09-01) ---------
  // RecDesk West Hartford publishes registration forms as recurring calendar
  // entries — 3 distinct titles, 62 occurrences each, measured corpus-wide
  // before the rule was written (reports/recdesk-junk-taxonomy.md).
  ['Med Admin Authorization Form', true, 'admin form as calendar item'],
  ['Leisure Services Emergency Form', true, 'admin form as calendar item'],
  ['Beachland Adventure Camper Profile', true, 'camper paperwork as calendar item'],
  ['Swim Waiver Form', true, 'waiver form'],
  // controls — the $ anchor and \b are what keep these alive
  ['Fill out the consent form at the door', false, 'prose mentioning a form mid-title'],
  ['Fall Formal Dance', false, 'formal is not form'],
  ['Emergency Preparedness for Families', false, 'emergency without form'],
  ['Camp Registration Opens', false, 'registration without form'],
  ['Art in Many Forms', false, 'forms plural mid-phrase, not an admin form'],

  ['Membership Swap: Virginia Museum of Contemporary Art', false, 'real museum event'],
  ['Adult Boxing (CRPD Adult Boxing Membership Required)', false, 'real class noting a prerequisite'],
  ['Nonresident Summer Camp', false, 'pricing tier on a real camp'],
  ['Family Fun Day at the Pavilion', false, 'real event held at a facility'],

  ['Kids Craft Club', false, 'ordinary program'],
  ['Fall Festival', false, 'ordinary program'],
  ['GLOW', false, 'short all-caps real MacaroniKid title'],
  ['Board Game Night at the Library', false, 'ordinary program containing "board"'],
];

let pass = 0;
const failures = [];

for (const [title, expected, why] of CASES) {
  const got = isJunkTitle(title);
  if (got === expected) {
    pass++;
  } else {
    failures.push({ title, expected, got, why });
  }
}

console.log('\nJUNK TITLE REGRESSION SUITE');
console.log('─'.repeat(60));
if (failures.length) {
  for (const f of failures) {
    const verb = f.expected ? 'should have been REJECTED as junk' : 'should have been KEPT';
    console.log(`FAIL  ${JSON.stringify(f.title)}`);
    console.log(`        ${verb} — ${f.why}`);
  }
  console.log('─'.repeat(60));
}
console.log(`${pass}/${CASES.length} junk-title cases passed, ${failures.length} failure(s)\n`);
process.exit(failures.length ? 1 : 0);
