#!/usr/bin/env node

/**
 * Fix events missing start_time by extracting time from:
 * 1. The TIMESTAMPTZ 'date' column (113 events with non-midnight times)
 * 2. The 'event_date' text field (time patterns we might have missed)
 * 3. The 'description' field (time references)
 *
 * Usage: node fix-missing-start-times.js [--save]
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

function fmtTime(h, m, ap) {
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

/**
 * Extract time from a TIMESTAMPTZ string like "2026-04-22T13:15:00+00:00"
 * Returns null for midnight (00:00 UTC) and midnight-equivalent Eastern times (04:00/05:00 UTC)
 */
function extractTimeFromTimestamp(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();

  // Skip midnight UTC (no time info)
  if (utcH === 0 && utcM === 0) return null;

  // Skip times that are midnight in US timezones (EDT=UTC-4, EST=UTC-5, CDT=UTC-5, CST=UTC-6, PDT=UTC-7, PST=UTC-8)
  // These represent "date only" stored with timezone offset
  if ((utcH === 4 || utcH === 5 || utcH === 6 || utcH === 7 || utcH === 8) && utcM === 0) return null;

  // Convert UTC to Eastern Time (approximate — most FunHive events are Eastern)
  // EDT (UTC-4) is active roughly March-November
  const etHour = (utcH - 4 + 24) % 24;
  const ap = etHour >= 12 ? 'PM' : 'AM';
  const h12 = etHour > 12 ? etHour - 12 : (etHour === 0 ? 12 : etHour);
  return `${h12}:${String(utcM).padStart(2, '0')} ${ap}`;
}

/**
 * Extract time from event_date text or description
 */
function extractTimeFromText(text) {
  if (!text || typeof text !== 'string') return null;

  // Range with minutes "9:00am - 10:30pm" or "9:00 AM – 10:30 PM"
  const rm = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*[-–—]+\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (rm) {
    const sap = (rm[3] || (parseInt(rm[1]) >= 7 && parseInt(rm[1]) < 12 ? 'AM' : 'PM')).toUpperCase();
    const eap = rm[6].toUpperCase();
    return { startTime: fmtTime(parseInt(rm[1]), rm[2], sap), endTime: fmtTime(parseInt(rm[4]), rm[5], eap) };
  }

  // Range without minutes "10am-2pm"
  const rn = text.match(/(\d{1,2})\s*(am|pm)\s*[-–—]+\s*(\d{1,2})\s*(am|pm)/i);
  if (rn) {
    return { startTime: fmtTime(parseInt(rn[1]), '00', rn[2].toUpperCase()), endTime: fmtTime(parseInt(rn[3]), '00', rn[4].toUpperCase()) };
  }

  // Single time with minutes "6:30pm" or "6:30 PM" — but only if context suggests it's an event time
  // (avoid matching random numbers in descriptions)
  const sm = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
  if (sm) {
    return { startTime: fmtTime(parseInt(sm[1]), sm[2], sm[3].toUpperCase()), endTime: null };
  }

  // Single time no minutes "6pm"
  const sn = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  if (sn && parseInt(sn[1]) <= 12) {
    return { startTime: fmtTime(parseInt(sn[1]), '00', sn[2].toUpperCase()), endTime: null };
  }

  return null;
}

async function fetchAll(select, filters) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from('events').select(select);
    if (filters) q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  FIX MISSING START_TIMES ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  const events = await fetchAll(
    'id, name, event_date, start_time, end_time, date, description, scraper_name',
    q => q.is('start_time', null)
  );
  console.log(`Events missing start_time: ${events.length}\n`);

  const fixes = [];

  for (const e of events) {
    let startTime = null;
    let endTime = null;
    let source = '';

    // Strategy 1: Extract from TIMESTAMPTZ date column
    if (e.date) {
      const t = extractTimeFromTimestamp(e.date);
      if (t) {
        startTime = t;
        source = 'TIMESTAMPTZ date column';
      }
    }

    // Strategy 2: Extract from event_date text
    if (!startTime && e.event_date) {
      const t = extractTimeFromText(e.event_date);
      if (t) {
        startTime = t.startTime;
        endTime = t.endTime;
        source = 'event_date text';
      }
    }

    // Strategy 3: Extract from description (first time reference only)
    if (!startTime && e.description) {
      // Only extract from description if the time appears near scheduling words
      const descLower = (e.description || '').toLowerCase();
      const hasScheduleContext = /\b(starts?|begins?|opens?|time|schedule|from|at \d)/i.test(descLower);
      if (hasScheduleContext) {
        const t = extractTimeFromText(e.description);
        if (t) {
          startTime = t.startTime;
          endTime = t.endTime;
          source = 'description';
        }
      }
    }

    if (startTime) {
      fixes.push({ id: e.id, name: e.name, startTime, endTime, source, scraper: e.scraper_name });
    }
  }

  console.log(`Fixable events: ${fixes.length} / ${events.length}\n`);

  // Group by source
  const bySource = {};
  for (const f of fixes) { bySource[f.source] = (bySource[f.source] || 0) + 1; }
  for (const [source, count] of Object.entries(bySource)) {
    console.log(`  From ${source}: ${count}`);
  }

  // Group by scraper
  console.log('\nBy scraper:');
  const byScraper = {};
  for (const f of fixes) { byScraper[f.scraper || 'unknown'] = (byScraper[f.scraper || 'unknown'] || 0) + 1; }
  const sortedScrapers = Object.entries(byScraper).sort((a, b) => b[1] - a[1]);
  for (const [scraper, count] of sortedScrapers.slice(0, 15)) {
    console.log(`  ${scraper}: ${count}`);
  }

  // Show samples
  console.log('\nSamples:');
  for (const f of fixes.slice(0, 15)) {
    console.log(`  [${f.scraper}] "${(f.name || '').substring(0, 45)}" → ${f.startTime}${f.endTime ? ' - ' + f.endTime : ''} (from ${f.source})`);
  }

  if (SAVE && fixes.length > 0) {
    console.log(`\n💾 Updating ${fixes.length} events...`);
    let updated = 0;
    let errors = 0;

    // Update in batches of 50
    for (let i = 0; i < fixes.length; i += 50) {
      const batch = fixes.slice(i, i + 50);
      for (const fix of batch) {
        const updateData = { start_time: fix.startTime };
        if (fix.endTime) updateData.end_time = fix.endTime;
        const { error } = await supabase.from('events').update(updateData).eq('id', fix.id);
        if (error) {
          errors++;
          if (errors <= 3) console.error(`  Error: ${error.message}`);
        } else {
          updated++;
        }
      }
      if (i % 200 === 0 && i > 0) console.log(`  ... ${updated} updated so far`);
    }
    console.log(`\n✅ Updated ${updated} events with start_time${errors > 0 ? ` (${errors} errors)` : ''}`);
  } else if (!SAVE && fixes.length > 0) {
    console.log(`\n⚠️ Dry run — add --save to update these events`);
  }

  const unfixable = events.length - fixes.length;
  console.log(`\nUnfixable (no time data anywhere): ${unfixable}`);
  console.log('These events genuinely have no time info in the source data.');

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
