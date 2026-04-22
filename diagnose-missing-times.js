#!/usr/bin/env node

/**
 * Diagnose events missing start_time — understand the scope, patterns, and fixability.
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

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
  console.log('Fetching all events...\n');

  const allEvents = await fetchAll('id, name, event_date, start_time, end_time, scraper_name, date, description, venue');

  const total = allEvents.length;
  const missingTime = allEvents.filter(e => !e.start_time);
  const hasTime = allEvents.filter(e => e.start_time);

  console.log(`Total events: ${total}`);
  console.log(`With start_time: ${hasTime.length}`);
  console.log(`Missing start_time: ${missingTime.length} (${(missingTime.length / total * 100).toFixed(1)}%)\n`);

  // Group by scraper
  const byScraperMissing = {};
  const byScraperTotal = {};
  for (const e of allEvents) {
    const s = e.scraper_name || 'unknown';
    byScraperTotal[s] = (byScraperTotal[s] || 0) + 1;
  }
  for (const e of missingTime) {
    const s = e.scraper_name || 'unknown';
    byScraperMissing[s] = (byScraperMissing[s] || 0) + 1;
  }

  console.log('═══ Missing start_time by scraper ═══');
  const sorted = Object.entries(byScraperMissing).sort((a, b) => b[1] - a[1]);
  for (const [scraper, count] of sorted) {
    const totalForScraper = byScraperTotal[scraper] || count;
    const pct = (count / totalForScraper * 100).toFixed(0);
    console.log(`  ${scraper}: ${count}/${totalForScraper} (${pct}% missing)`);
  }

  // Check how many have time info embedded in event_date
  console.log('\n═══ Time patterns in event_date of missing-time events ═══');
  let hasTimeInDate = 0;
  let hasTimeInDescription = 0;
  let hasTimeInName = 0;
  let noTimeAnywhere = 0;

  const timeRegex = /\d{1,2}:\d{2}\s*(am|pm)|(\d{1,2})\s*(am|pm)\b/i;
  const timeRangeRegex = /\d{1,2}(:\d{2})?\s*(am|pm)?\s*[-–—to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)/i;

  for (const e of missingTime) {
    const ed = e.event_date || '';
    const desc = e.description || '';
    const name = e.name || '';

    if (timeRegex.test(ed) || timeRangeRegex.test(ed)) {
      hasTimeInDate++;
    } else if (timeRegex.test(desc) || timeRangeRegex.test(desc)) {
      hasTimeInDescription++;
    } else if (timeRegex.test(name) || timeRangeRegex.test(name)) {
      hasTimeInName++;
    } else {
      noTimeAnywhere++;
    }
  }

  console.log(`  Time found in event_date: ${hasTimeInDate}`);
  console.log(`  Time found in description: ${hasTimeInDescription}`);
  console.log(`  Time found in name: ${hasTimeInName}`);
  console.log(`  No time info anywhere: ${noTimeAnywhere}`);

  // Show samples for each category
  console.log('\n═══ Samples: time in event_date ═══');
  let count = 0;
  for (const e of missingTime) {
    if (count >= 15) break;
    const ed = e.event_date || '';
    if (timeRegex.test(ed) || timeRangeRegex.test(ed)) {
      console.log(`  [${e.scraper_name}] "${e.name?.substring(0, 50)}" | event_date: "${ed}"`);
      count++;
    }
  }

  console.log('\n═══ Samples: time in description ═══');
  count = 0;
  for (const e of missingTime) {
    if (count >= 10) break;
    const desc = e.description || '';
    const ed = e.event_date || '';
    if (!(timeRegex.test(ed) || timeRangeRegex.test(ed)) && (timeRegex.test(desc) || timeRangeRegex.test(desc))) {
      // Extract the time-containing sentence
      const sentences = desc.split(/[.\n]/).filter(s => timeRegex.test(s) || timeRangeRegex.test(s));
      console.log(`  [${e.scraper_name}] "${e.name?.substring(0, 50)}" | time in desc: "${sentences[0]?.trim().substring(0, 100)}"`);
      count++;
    }
  }

  console.log('\n═══ Samples: time in name ═══');
  count = 0;
  for (const e of missingTime) {
    if (count >= 10) break;
    const ed = e.event_date || '';
    const desc = e.description || '';
    const name = e.name || '';
    if (!(timeRegex.test(ed) || timeRangeRegex.test(ed)) && !(timeRegex.test(desc) || timeRangeRegex.test(desc)) && (timeRegex.test(name) || timeRangeRegex.test(name))) {
      console.log(`  [${e.scraper_name}] name: "${name.substring(0, 80)}"`);
      count++;
    }
  }

  console.log('\n═══ Samples: no time anywhere ═══');
  count = 0;
  for (const e of missingTime) {
    if (count >= 10) break;
    const ed = e.event_date || '';
    const desc = e.description || '';
    const name = e.name || '';
    if (!(timeRegex.test(ed) || timeRangeRegex.test(ed)) && !(timeRegex.test(desc) || timeRangeRegex.test(desc)) && !(timeRegex.test(name) || timeRangeRegex.test(name))) {
      console.log(`  [${e.scraper_name}] "${name.substring(0, 50)}" | event_date: "${ed}" | desc: "${desc.substring(0, 60)}"`);
      count++;
    }
  }

  // Check the date column for ISO timestamps that might have time info
  console.log('\n═══ ISO date column analysis (missing start_time) ═══');
  let dateHasTime = 0;
  let dateMidnight = 0;
  let dateNull = 0;
  for (const e of missingTime) {
    if (!e.date) { dateNull++; continue; }
    const d = new Date(e.date);
    if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
      dateHasTime++;
    } else {
      dateMidnight++;
    }
  }
  console.log(`  TIMESTAMPTZ has non-midnight time: ${dateHasTime}`);
  console.log(`  TIMESTAMPTZ is midnight (00:00): ${dateMidnight}`);
  console.log(`  TIMESTAMPTZ is null: ${dateNull}`);

  // Show samples of non-midnight dates
  if (dateHasTime > 0) {
    console.log('\n  Samples with time in TIMESTAMPTZ:');
    let c = 0;
    for (const e of missingTime) {
      if (c >= 10) break;
      if (!e.date) continue;
      const d = new Date(e.date);
      if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
        console.log(`    [${e.scraper_name}] "${e.name?.substring(0, 40)}" | date: ${e.date} | event_date: "${e.event_date}"`);
        c++;
      }
    }
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
