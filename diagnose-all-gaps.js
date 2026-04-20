#!/usr/bin/env node

/**
 * DEEP DIAGNOSIS of all remaining data gaps
 * Dumps full details so we can figure out what's fixable
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

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
  console.log('\n' + '═'.repeat(70));
  console.log('  DEEP DIAGNOSIS — ALL REMAINING GAPS');
  console.log('═'.repeat(70));

  // ── 1. 32 FARM VENUES MISSING GEOHASH ──────────────
  console.log('\n\n🌾 1. VENUES MISSING GEOHASH (32 farms)');
  console.log('─'.repeat(70));
  const farms = await fetchAll('activities', 'id, name, state, city, address, url, source, scraper_name, category, description', q => q.is('geohash', null));
  for (const f of farms) {
    console.log(`\n  NAME: ${f.name}`);
    console.log(`  STATE: ${f.state || '(null)'} | CITY: ${f.city || '(null)'} | ADDRESS: ${f.address || '(null)'}`);
    console.log(`  CATEGORY: ${f.category || '(null)'} | SOURCE: ${f.source || '(null)'} | SCRAPER: ${f.scraper_name || '(null)'}`);
    console.log(`  URL: ${f.url || '(null)'}`);
    console.log(`  DESC: ${(f.description || '(null)').substring(0, 120)}`);

    // Check if any events reference this venue
    const { data: evts } = await supabase.from('events').select('id, name, city, state, venue, address, geohash').eq('activity_id', f.id).limit(3);
    if (evts?.length > 0) {
      console.log(`  LINKED EVENTS (${evts.length}):`);
      for (const e of evts) {
        console.log(`    - "${(e.name || '').substring(0, 50)}" city=${e.city || 'null'} state=${e.state || 'null'} addr=${e.address || 'null'} gh=${e.geohash || 'null'}`);
      }
    } else {
      console.log(`  LINKED EVENTS: none`);
    }
  }

  // ── 2. 20 EVENTS MISSING GEOHASH ──────────────────
  console.log('\n\n📍 2. EVENTS MISSING GEOHASH (20)');
  console.log('─'.repeat(70));
  const noGeoEvts = await fetchAll('events', 'id, name, venue, city, state, address, activity_id, scraper_name, url, event_date, description', q => q.is('geohash', null));
  for (const e of noGeoEvts) {
    console.log(`\n  NAME: ${e.name}`);
    console.log(`  VENUE: ${e.venue || '(null)'} | CITY: ${e.city || '(null)'} | STATE: ${e.state || '(null)'} | ADDR: ${e.address || '(null)'}`);
    console.log(`  SCRAPER: ${e.scraper_name || '(null)'} | ACTIVITY_ID: ${e.activity_id || '(null)'}`);
    console.log(`  URL: ${e.url || '(null)'}`);
    console.log(`  DATE: ${e.event_date || '(null)'}`);
    console.log(`  DESC: ${(e.description || '(null)').substring(0, 150)}`);

    // Check linked activity
    if (e.activity_id) {
      const { data: act } = await supabase.from('activities').select('name, city, state, geohash, address').eq('id', e.activity_id).single();
      if (act) {
        console.log(`  LINKED ACTIVITY: "${act.name}" city=${act.city || 'null'} state=${act.state || 'null'} gh=${act.geohash || 'null'}`);
      }
    }
  }

  // ── 3. 7 VENUES MISSING SUBCATEGORY ────────────────
  console.log('\n\n🏷️  3. VENUES MISSING SUBCATEGORY (7)');
  console.log('─'.repeat(70));
  const noSub = await fetchAll('activities', 'id, name, category, subcategory, city, state, source', q => q.is('subcategory', null).not('category', 'is', null));
  for (const v of noSub) {
    console.log(`  "${v.name}" | CAT: ${v.category} | CITY: ${v.city || 'null'} | STATE: ${v.state || 'null'} | SRC: ${v.source || 'null'}`);
  }

  // ── 4. 15 EVENTS MISSING EVENT_DATE ────────────────
  console.log('\n\n📅 4. EVENTS MISSING EVENT_DATE (15)');
  console.log('─'.repeat(70));
  const noDate = await fetchAll('events', 'id, name, event_date, date, venue, city, state, scraper_name, url', q => q.or('event_date.is.null,event_date.eq.'));
  const truly = noDate.filter(e => !e.event_date || e.event_date.trim() === '');
  for (const e of truly) {
    console.log(`  "${(e.name || '').substring(0, 60)}" | DATE_TS: ${e.date || 'null'} | VENUE: ${e.venue || 'null'} | SCRAPER: ${e.scraper_name || 'null'}`);
    console.log(`    URL: ${e.url || 'null'}`);
  }

  // ── 5. 6 EVENTS MISSING STATE ──────────────────────
  console.log('\n\n🗺️  5. EVENTS MISSING STATE (6)');
  console.log('─'.repeat(70));
  const noState = await fetchAll('events', 'id, name, venue, city, state, address, geohash, activity_id, scraper_name, url', q => q.or('state.is.null,state.eq.'));
  const truly2 = noState.filter(e => !e.state || e.state.trim() === '');
  for (const e of truly2) {
    console.log(`  "${e.name}" | VENUE: ${e.venue || 'null'} | CITY: ${e.city || 'null'} | ADDR: ${e.address || 'null'}`);
    console.log(`    GH: ${e.geohash || 'null'} | SCRAPER: ${e.scraper_name || 'null'} | URL: ${e.url || 'null'}`);
  }

  // ── 6. EVENTS MISSING START_TIME — sample event_date text ──
  console.log('\n\n⏰ 6. EVENTS MISSING START_TIME — sample event_date text (first 30)');
  console.log('─'.repeat(70));
  const noTime = await fetchAll('events', 'id, event_date, scraper_name', q => q.is('start_time', null).not('event_date', 'is', null));
  // Group by scraper
  const bySource = {};
  for (const e of noTime) {
    const src = e.scraper_name || 'unknown';
    if (!bySource[src]) bySource[src] = [];
    bySource[src].push(e.event_date);
  }
  console.log(`\n  Total: ${noTime.length} events missing start_time\n`);
  console.log('  By scraper:');
  for (const [src, dates] of Object.entries(bySource).sort((a,b) => b[1].length - a[1].length)) {
    console.log(`    ${src}: ${dates.length}`);
    // Show unique date formats (first 5)
    const unique = [...new Set(dates)].slice(0, 5);
    for (const d of unique) {
      console.log(`      example: "${d}"`);
    }
  }

  // ── 7. EVENTS MISSING AGE_RANGE — sample names ────
  console.log('\n\n👶 7. EVENTS STILL MISSING AGE_RANGE — sample (first 30)');
  console.log('─'.repeat(70));
  const noAge = await fetchAll('events', 'id, name, description, scraper_name', q => q.is('age_range', null));
  console.log(`  Total: ${noAge.length} events still missing age_range\n`);
  // Group by scraper
  const ageBySrc = {};
  for (const e of noAge) {
    const src = e.scraper_name || 'unknown';
    ageBySrc[src] = (ageBySrc[src] || 0) + 1;
  }
  console.log('  By scraper:');
  for (const [src, count] of Object.entries(ageBySrc).sort((a,b) => b - a)) {
    console.log(`    ${src}: ${count}`);
  }
  console.log('\n  Sample events without age_range:');
  for (const e of noAge.slice(0, 30)) {
    console.log(`    "${(e.name || '').substring(0, 60)}" [${e.scraper_name || '?'}]`);
  }

  console.log('\n\nDone.\n');
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
