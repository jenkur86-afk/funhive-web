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
  ['Teen Advisory Board (TAB) Meeting', false, 'REAL library program'],
  ['Mount Airy Teen Advisory Board', false, 'REAL library program, prefixed'],
  ['Teen Advisory Board (TAB) Meeting - Colts Neck Chapter', false, 'REAL library program, suffixed'],
  ['Youth Advisory Council', false, 'youth programming, not governance'],
  ['Junior Advisory Committee', false, 'youth programming, not governance'],
  ['Kids Advisory Board', false, 'youth programming, not governance'],
  // Ordinary titles that must never be junk.
  ['Board Meeting', false, 'bare "board" is not a governance match'],
  ['Family Storytime', false, 'ordinary program'],
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
