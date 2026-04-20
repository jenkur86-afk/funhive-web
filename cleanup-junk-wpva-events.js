#!/usr/bin/env node

/**
 * Cleanup junk wordpress-VA events from the database.
 *
 * The old wordpress-VA scraper used overly broad CSS selectors that scraped:
 * - Category headers ("Teen (ages 13-18)", "Adults", "Storytime")
 * - UI elements ("RSVP Now", "Google Calendar", "Export .ics file")
 * - Calendar grid cells ("0 events\n\n30", "M\n\nMonday")
 * - Error messages ("Sorry", "But don't give up")
 * - Time-only date strings ("9:00am-9:30am")
 *
 * This script also removes events from libraries now covered by dedicated
 * platform scrapers (LibCal, LibraryMarket, etc.) to prevent future duplicates.
 *
 * Usage: node cleanup-junk-wpva-events.js [--save]
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

// Junk title patterns (same as the scraper's server-side filter)
const JUNK_PATTERNS = [
  /^sorry\b/i, /^but don't give up/i, /^details:?$/i, /^event details:?$/i,
  /^export outlook/i, /^download \.ics/i, /^add to calendar/i, /^share this/i,
  /^no events/i, /^there are no/i, /^no results/i, /^nothing found/i,
  /^loading/i, /^please wait/i, /^search results/i, /^filter/i,
  /^skip to/i, /^rsvp/i, /^google calendar/i, /^icalendar/i, /^outlook/i,
  /^list$/i, /^month$/i, /^day$/i, /^week$/i, /^this month$/i,
  /^prev$/i, /^next$/i, /^view all/i, /^see all/i, /^show more/i,
  /^events search/i, /^views navigation/i, /^more info/i, /^learn more/i,
];

const CATEGORY_HEADERS = /^(family|adults?|teens?|tweens?|children|kids|seniors?|all ages?|baby|babies|toddlers?|preschool|storytime|programs?|calendar|home|library|details|info|more|events?|upcoming|featured|games?\s*[&+]?\s*gaming)$/i;

const AGE_HEADERS = /^(teen|tween|children|kids|adult|senior|baby|toddler|preschool|family)\s*(\(.*\))?$/i;

const MONTH_NAMES = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)(\s+\d{4})?$/i;

const DAY_NAMES = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)$/i;

// Libraries now moved to dedicated scrapers — delete their wordpress-VA events
const MOVED_LIBRARY_NAMES = [
  'Virginia Beach Public Library',
  'Richmond Public Library',
  'Norfolk Public Library',
  'Fairfax County Public Library',
  'Arlington Public Library',
  'Newport News Public Library System',
  'Hampton Public Library',
  'Prince William Public Library',
  'Loudoun County Public Library',
  'Chesterfield County Public Library',
  'Roanoke Public Libraries',
  'Suffolk Public Library',
  'Lynchburg Public Library',
  'Portsmouth Public Library',
  'Williamsburg Regional Library',
  'Library of Virginia',
  'Staunton Public Library',
  'Central Rappahannock Regional Library',
];

function isJunkEvent(name) {
  if (!name || typeof name !== 'string') return true;
  const t = name.trim();
  if (t.length < 4) return true;
  if (t.length > 200) return true;
  if (/^\d+\s*events?\b/i.test(t)) return true; // "0 events\n\n30"
  if (/^[MTWFS]\n/i.test(t)) return true;
  if (/^\d{1,2}\n/.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  if (JUNK_PATTERNS.some(p => p.test(t))) return true;
  if (CATEGORY_HEADERS.test(t)) return true;
  if (AGE_HEADERS.test(t)) return true;
  if (MONTH_NAMES.test(t)) return true;
  if (DAY_NAMES.test(t)) return true;
  return false;
}

function isTimeOnlyDate(dateStr) {
  if (!dateStr) return false;
  const t = dateStr.trim();
  // Time-only: "9:00am–9:30am", "10:30am", etc. — no month or numeric date
  if (/^\d{1,2}:\d{2}\s*(am|pm)/i.test(t)) {
    const hasMonth = /\b(jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|oct|nov|dec|january|february|august|september|october|november|december)\b/i.test(t);
    const hasNumericDate = /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}/.test(t);
    if (!hasMonth && !hasNumericDate) return true;
  }
  return false;
}

async function fetchAll(table, select, filters) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select || '*');
    if (filters) q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) { console.error(`  Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  CLEANUP JUNK WORDPRESS-VA EVENTS ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Fetch all wordpress-VA events
  const events = await fetchAll('events', 'id, name, event_date, venue, scraper_name', q => q.eq('scraper_name', 'wordpress-VA'));
  console.log(`Total wordpress-VA events in DB: ${events.length}\n`);

  const toDelete = [];

  // 1. Find junk titles
  for (const e of events) {
    if (isJunkEvent(e.name)) {
      toDelete.push({ id: e.id, name: e.name, reason: 'junk title' });
      continue;
    }
    if (isTimeOnlyDate(e.event_date)) {
      toDelete.push({ id: e.id, name: e.name, reason: `time-only date: "${e.event_date}"` });
      continue;
    }
    // Check if from a moved library
    if (MOVED_LIBRARY_NAMES.some(lib => e.venue && e.venue.includes(lib))) {
      toDelete.push({ id: e.id, name: e.name, reason: `moved to dedicated scraper (${e.venue})` });
    }
  }

  console.log(`Events to delete: ${toDelete.length}\n`);

  // Group by reason for display
  const byReason = {};
  for (const d of toDelete) {
    const r = d.reason.startsWith('moved') ? 'moved to dedicated scraper' : d.reason.startsWith('time-only') ? 'time-only date' : 'junk title';
    byReason[r] = (byReason[r] || 0) + 1;
  }
  for (const [reason, count] of Object.entries(byReason)) {
    console.log(`  ${reason}: ${count}`);
  }

  // Show some examples
  console.log('\nSample junk titles:');
  toDelete.filter(d => d.reason === 'junk title').slice(0, 10).forEach(d => {
    console.log(`  "${(d.name || '').substring(0, 60)}" → ${d.reason}`);
  });

  console.log('\nSample time-only dates:');
  toDelete.filter(d => d.reason.startsWith('time-only')).slice(0, 5).forEach(d => {
    console.log(`  "${(d.name || '').substring(0, 40)}" → ${d.reason}`);
  });

  console.log('\nSample moved libraries:');
  toDelete.filter(d => d.reason.startsWith('moved')).slice(0, 5).forEach(d => {
    console.log(`  "${(d.name || '').substring(0, 40)}" → ${d.reason}`);
  });

  if (SAVE && toDelete.length > 0) {
    console.log(`\n🗑️ Deleting ${toDelete.length} events...`);
    const ids = toDelete.map(d => d.id);
    // Delete in batches of 100
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) {
        console.error(`  Error deleting batch ${i}: ${error.message}`);
      } else {
        deleted += batch.length;
      }
    }
    console.log(`✅ Deleted ${deleted} events`);
  } else if (!SAVE && toDelete.length > 0) {
    console.log(`\n⚠️ Dry run — add --save to actually delete these events`);
  }

  const remaining = events.length - toDelete.length;
  console.log(`\nRemaining wordpress-VA events: ${remaining}`);

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
