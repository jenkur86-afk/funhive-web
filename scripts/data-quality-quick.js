#!/usr/bin/env node

/**
 * QUICK DATA QUALITY AUDIT
 *
 * A lightweight version of data-quality-check.js that uses Postgres
 * `count: 'exact', head: true` queries instead of downloading rows.
 * Designed for daily runs — total egress is ~5 MB instead of ~500 MB.
 *
 * Reports the headline numbers only:
 *   - Totals (events / activities / scrapers)
 *   - Critical missing fields (geohash, location, state, city, parsed date)
 *   - Past events still in DB
 *   - Reported items
 *   - Recent activity (events created in the last 72h)
 *
 * For full audits (duplicates, distributions, adult-event samples, scraper-by-scraper
 * breakdown) run `node scripts/data-quality-check.js` instead.
 *
 * Usage:
 *   node scripts/data-quality-quick.js
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

// Postgres count helper — `head: true` means "no rows, just count"
async function countRows(table, filterFn) {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filterFn) q = filterFn(q);
  const { count, error } = await q;
  if (error) {
    console.error(`  ⚠️ ${table}: ${error.message}`);
    return null;
  }
  return count ?? 0;
}

function row(label, value, total) {
  const n = String(value ?? '?').padStart(7);
  let pct = '';
  if (typeof value === 'number' && typeof total === 'number' && total > 0) {
    pct = ` (${((value / total) * 100).toFixed(1)}%)`;
  }
  console.log(`    ${label.padEnd(32)} ${n}${pct}`);
}

function badge(value, total, goodIfLow = true) {
  if (typeof value !== 'number' || typeof total !== 'number' || total === 0) return '⚪';
  const pct = (value / total) * 100;
  if (goodIfLow) {
    if (pct < 1) return '🟢';
    if (pct < 5) return '🟡';
    if (pct < 15) return '🟠';
    return '🔴';
  } else {
    if (pct > 95) return '🟢';
    if (pct > 85) return '🟡';
    if (pct > 70) return '🟠';
    return '🔴';
  }
}

async function main() {
  const startedAt = Date.now();
  console.log('\n' + '═'.repeat(60));
  console.log('  FUNHIVE — QUICK DATA QUALITY AUDIT');
  console.log('═'.repeat(60));
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Mode: count-only (no row downloads)`);

  // ── Totals ──
  const totalEvents = await countRows('events');
  const totalActivities = await countRows('activities');

  console.log('\n📊 TOTALS');
  console.log('─'.repeat(60));
  row('Events',     totalEvents);
  row('Activities', totalActivities);

  // ── Events: critical missing fields ──
  console.log('\n📅 EVENTS — critical missing fields');
  console.log('─'.repeat(60));

  const evNoState     = await countRows('events', q => q.is('state', null));
  const evNoCity      = await countRows('events', q => q.is('city', null));
  const evNoGeohash   = await countRows('events', q => q.is('geohash', null));
  const evNoLocation  = await countRows('events', q => q.is('location', null));
  const evNoEventDate = await countRows('events', q => q.or('event_date.is.null,event_date.eq.'));
  const evNoParsedDate= await countRows('events', q => q.is('date', null));
  const evNoVenue     = await countRows('events', q => q.is('venue', null));
  const evReported    = await countRows('events', q => q.eq('reported', true));

  row(`${badge(evNoGeohash, totalEvents)} Missing geohash`,    evNoGeohash, totalEvents);
  row(`${badge(evNoLocation, totalEvents)} Missing location`,  evNoLocation, totalEvents);
  row(`${badge(evNoState, totalEvents)} Missing state`,        evNoState, totalEvents);
  row(`${badge(evNoCity, totalEvents)} Missing city`,          evNoCity, totalEvents);
  row(`${badge(evNoEventDate, totalEvents)} Missing event_date`, evNoEventDate, totalEvents);
  row(`${badge(evNoParsedDate, totalEvents)} Missing date (TIMESTAMPTZ)`, evNoParsedDate, totalEvents);
  row(`${badge(evNoVenue, totalEvents)} Missing venue`,        evNoVenue, totalEvents);
  row(`Reported (hidden) events`,                              evReported, totalEvents);

  // ── Past events ──
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
  const pastEvents = await countRows('events', q => q.lt('date', today));

  console.log('\n⏰ EVENTS — temporal sanity');
  console.log('─'.repeat(60));
  row(`${badge(pastEvents, totalEvents)} Past events (date < today)`, pastEvents, totalEvents);

  // ── Activities: critical missing fields ──
  console.log('\n🏢 ACTIVITIES — critical missing fields');
  console.log('─'.repeat(60));

  const acNoState    = await countRows('activities', q => q.is('state', null));
  const acNoCity     = await countRows('activities', q => q.is('city', null));
  const acNoGeohash  = await countRows('activities', q => q.is('geohash', null));
  const acNoLocation = await countRows('activities', q => q.is('location', null));
  const acNoAddress  = await countRows('activities', q => q.is('address', null));
  const acNoDesc     = await countRows('activities', q => q.is('description', null));
  const acReported   = await countRows('activities', q => q.eq('reported', true));

  row(`${badge(acNoGeohash, totalActivities)} Missing geohash`,    acNoGeohash, totalActivities);
  row(`${badge(acNoLocation, totalActivities)} Missing location`,  acNoLocation, totalActivities);
  row(`${badge(acNoState, totalActivities)} Missing state`,        acNoState, totalActivities);
  row(`${badge(acNoCity, totalActivities)} Missing city`,          acNoCity, totalActivities);
  row(`${badge(acNoAddress, totalActivities)} Missing address`,    acNoAddress, totalActivities);
  row(`Missing description`,                                       acNoDesc, totalActivities);
  row(`Reported (hidden) activities`,                              acReported, totalActivities);

  // ── Recent activity (last 72h) ──
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const recentEv = await countRows('events', q => q.gte('created_at', since));
  const recentAc = await countRows('activities', q => q.gte('created_at', since));

  console.log('\n🆕 RECENT ACTIVITY (last 72h)');
  console.log('─'.repeat(60));
  row('Events created',     recentEv);
  row('Activities created', recentAc);

  // ── Summary ──
  console.log('\n' + '═'.repeat(60));
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`  Audit complete in ${elapsed}s.`);
  console.log(`  For deep dives (duplicates, distributions, scraper health,`);
  console.log(`  sample issues), run: node scripts/data-quality-check.js`);
  console.log('═'.repeat(60) + '\n');
}

main().then(() => process.exit(0)).catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
