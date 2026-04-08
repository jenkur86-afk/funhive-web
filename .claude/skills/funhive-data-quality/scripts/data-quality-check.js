#!/usr/bin/env node

/**
 * FunHive Data Quality Check & Correction Script
 *
 * Performs automated fixes and audits on the events and activities tables.
 * Safe to run repeatedly (idempotent). Outputs a JSON report.
 *
 * Usage: node data-quality-check.js [--fix] [--audit-only]
 *   --fix        Run fixes + audit (default)
 *   --audit-only Skip fixes, only report current state
 */

const path = require('path');
const fs = require('fs');

// Load env from .env.local
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '..', '..', '.env.local'),
    path.join(__dirname, '..', '..', '..', '..', '.env.local'),
    path.join(process.cwd(), '.env.local'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
      }
      break;
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use dynamic import for supabase-js to avoid CJS/ESM issues
let supabase;
const auditOnly = process.argv.includes('--audit-only');
const report = { timestamp: new Date().toISOString(), fixes: {}, audit: {} };

async function initSupabase() {
  try {
    // Try require first
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch {
    // Fallback: use REST API directly
    console.log('Note: Using REST API fallback (supabase-js not loadable)');
    supabase = createRESTClient(SUPABASE_URL, SUPABASE_KEY);
  }
}

// REST API fallback client that mimics supabase-js interface
function createRESTClient(url, key) {
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

  function buildQuery(table) {
    let params = [];
    let selectFields = '*';
    let headOnly = false;
    let countType = null;
    let limitVal = null;
    let method = 'GET';
    let body = null;
    let filters = [];

    const chain = {
      select(fields, opts) {
        selectFields = fields || '*';
        if (opts?.count) countType = opts.count;
        if (opts?.head) headOnly = true;
        return chain;
      },
      or(filter) { filters.push('or=(' + filter + ')'); return chain; },
      eq(col, val) { filters.push(`${col}=eq.${val}`); return chain; },
      neq(col, val) { filters.push(`${col}=neq.${val}`); return chain; },
      is(col, val) { filters.push(`${col}=is.${val}`); return chain; },
      not(col, op, val) { filters.push(`${col}=not.${op}.${val}`); return chain; },
      in(col, vals) { filters.push(`${col}=in.(${vals.map(v => `"${v}"`).join(',')})`); return chain; },
      limit(n) { limitVal = n; return chain; },
      order(col, opts) { params.push(`order=${col}.${opts?.ascending ? 'asc' : 'desc'}`); return chain; },
      async then(resolve) {
        let allParams = [...params, ...filters];
        if (selectFields) allParams.push(`select=${selectFields}`);
        if (limitVal) allParams.push(`limit=${limitVal}`);

        const reqHeaders = { ...headers };
        if (countType) reqHeaders['Prefer'] = `count=${countType}`;
        if (headOnly) { method = 'HEAD'; }

        try {
          const res = await fetch(`${url}/rest/v1/${table}?${allParams.join('&')}`, { method, headers: reqHeaders });
          const count = res.headers.get('content-range')?.split('/')[1];
          const data = headOnly ? null : await res.json();
          resolve({ data, error: null, count: count ? parseInt(count) : (data ? data.length : 0) });
        } catch (err) {
          resolve({ data: null, error: err, count: 0 });
        }
      }
    };
    return chain;
  }

  return {
    from(table) {
      const q = buildQuery(table);
      q.update = (updates) => {
        return {
          eq: (col, val) => fetch(`${url}/rest/v1/${table}?${col}=eq.${val}`, {
            method: 'PATCH', headers, body: JSON.stringify(updates)
          }).then(r => ({ error: r.ok ? null : { message: r.statusText } })),
          in: (col, vals) => fetch(`${url}/rest/v1/${table}?${col}=in.(${vals.map(v => `"${v}"`).join(',')})`, {
            method: 'PATCH', headers, body: JSON.stringify(updates)
          }).then(r => ({ error: r.ok ? null : { message: r.statusText } })),
        };
      };
      q.delete = () => ({
        in: (col, vals) => fetch(`${url}/rest/v1/${table}?${col}=in.(${vals.map(v => `"${v}"`).join(',')})`, {
          method: 'DELETE', headers
        }).then(r => ({ error: r.ok ? null : { message: r.statusText } })),
        eq: (col, val) => fetch(`${url}/rest/v1/${table}?${col}=eq.${val}`, {
          method: 'DELETE', headers
        }).then(r => ({ error: r.ok ? null : { message: r.statusText } })),
      });
      return q;
    },
    rpc(fn, params) {
      return fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers, body: JSON.stringify(params)
      }).then(r => r.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error }));
    }
  };
}

// ============================================================================
// HELPER: Run a query and return result
// ============================================================================
async function query(sql) {
  // Use the Supabase management API if available, otherwise use RPC
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();
  if (error) {
    // Fallback: use the REST API with raw SQL via pg_net or similar
    // For now, use supabase-js queries
    throw new Error(`SQL error: ${error.message}`);
  }
  return data;
}

// Helper to count matching rows
async function countWhere(table, filter) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .or(filter);
  if (error) throw error;
  return count || 0;
}

async function countAll(table) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

async function countNull(table, column) {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .is(column, null);
  if (error) throw error;
  return count || 0;
}

async function countEmpty(table, column) {
  const { count: nullCount } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .is(column, null);
  const { count: emptyCount } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, '');
  return (nullCount || 0) + (emptyCount || 0);
}

// ============================================================================
// FIX 1: Extract embedded times from event_date into start_time
// ============================================================================
async function fixEmbeddedTimes() {
  // Find events with time in event_date and no start_time
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date')
    .is('start_time', null)
    .not('event_date', 'is', null)
    .limit(5000);

  if (error || !events) return 0;

  let fixed = 0;
  const timeRegex = /(\d{1,2}:\d{2}\s*(am|pm|AM|PM))/;
  const timeOnlyRegex = /(\d{1,2})(am|pm|AM|PM)/;

  for (const event of events) {
    let match = event.event_date.match(timeRegex);
    if (!match) match = event.event_date.match(timeOnlyRegex);
    if (!match) continue;

    const startTime = match[0].toUpperCase().replace(/(\d)(AM|PM)/, '$1:00 $2');
    const cleanDate = event.event_date.replace(/\s+\d{1,2}(:\d{2})?\s*(am|pm|AM|PM).*$/i, '').trim();

    const { error: updateErr } = await supabase
      .from('events')
      .update({ start_time: startTime, event_date: cleanDate })
      .eq('id', event.id);

    if (!updateErr) fixed++;
  }
  return fixed;
}

// ============================================================================
// FIX 2: Delete past events
// ============================================================================
async function fixPastEvents() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all events and check dates client-side (safer than SQL date parsing)
  const { data: events, error } = await supabase
    .from('events')
    .select('id, event_date')
    .not('event_date', 'is', null)
    .limit(15000);

  if (error || !events) return 0;

  const pastIds = [];
  const dateRegex = /^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/;

  for (const event of events) {
    const match = event.event_date.match(dateRegex);
    if (!match) continue;

    const monthIdx = months.indexOf(match[1]);
    if (monthIdx === -1) continue;

    const eventDate = new Date(parseInt(match[3]), monthIdx, parseInt(match[2]));
    if (eventDate < today) pastIds.push(event.id);
  }

  // Delete in batches
  let deleted = 0;
  for (let i = 0; i < pastIds.length; i += 100) {
    const batch = pastIds.slice(i, i + 100);
    const { error: delErr } = await supabase.from('events').delete().in('id', batch);
    if (!delErr) deleted += batch.length;
  }
  return deleted;
}

// ============================================================================
// FIX 3: Remove adult-only events
// ============================================================================
async function fixAdultEvents() {
  const adultPatterns = ['21+', '21 and over', 'adults only', 'bar crawl', 'pub crawl',
    'happy hour', 'speed dating', 'burlesque', 'singles mixer'];

  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, description')
    .limit(15000);

  if (error || !events) return 0;

  const adultIds = [];
  const adultRegex = new RegExp(adultPatterns.join('|'), 'i');
  const descRegex = /21\+|21 and over|adults only|must be 21|no children|no kids allowed|adults-only|18\+ only/i;

  for (const event of events) {
    if (adultRegex.test(event.name) || (event.description && descRegex.test(event.description))) {
      adultIds.push(event.id);
    }
  }

  let deleted = 0;
  for (let i = 0; i < adultIds.length; i += 100) {
    const batch = adultIds.slice(i, i + 100);
    const { error: delErr } = await supabase.from('events').delete().in('id', batch);
    if (!delErr) deleted += batch.length;
  }
  return deleted;
}

// ============================================================================
// FIX 4: Assign missing categories
// ============================================================================
async function fixCategories() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, venue')
    .or('category.is.null,category.eq.')
    .limit(15000);

  if (error || !events) return 0;

  const rules = [
    { category: 'Storytimes & Library', venue: /library|libraries|bookmobile|outreach/i,
      name: /storytime|story time|story hour|book club|reading program|read aloud|bookworm|pajama stories|read.*sing|rhyme/i },
    { category: 'Outdoor & Nature', venue: /park|nature center|garden|trail|farm|botanical|flower field|ranch|vineyard|orchard/i,
      name: /park|trail|hike|hiking|nature walk|garden|outdoor|camping|fishing|kayak|canoe|bird|planting|seeds/i },
    { category: 'Festivals', venue: null,
      name: /festival|fair|carnival|parade|celebration|fireworks|egg hunt|trunk or treat|halloween|christmas|holiday/i },
    { category: 'Arts & Culture', venue: /theatre|theater|playhouse|arts center|gallery|studio|opera|philharmonic/i,
      name: /art|craft|paint|drawing|museum|gallery|theater|theatre|concert|music|dance|ballet|symphony|puppet|magic show|comedy show|movie|film|cinema|ceramics|pottery|sewing|knitting|crochet|quilting|coloring/i },
    { category: 'Classes & Workshops', venue: null,
      name: /class|workshop|lesson|camp|program|clinic|tutorial|seminar|training|coding|stem|science experiment|robotics/i },
    { category: 'Animals & Wildlife', venue: /zoo|aquarium|sanctuary|wildlife/i,
      name: /animal|zoo|farm|pet|petting|aquarium|wildlife|butterfly|reptile|horse|pony|dog show|cat show/i },
    { category: 'Indoor', venue: /museum|children|pretend city|discovery|science center|planetarium|rec center|recreation center|community center|ymca|ywca/i,
      name: /lego|play|game night|board game|bounce|trampoline|bowling|skating|gymnastics|swim|pool party|arcade|escape room|laser tag|toddler|baby|preschool|sensory|playdate|playgroup|little|tiny tot/i },
    { category: 'Community', venue: /church|chapel|baptist|methodist|lutheran|catholic|synagogue|mosque|temple/i,
      name: /community|volunteer|food drive|donation|meeting|town hall|cleanup|market|flea market|yard sale|fundraiser|benefit|charity|open house|teen|tween|homeschool|homework|tutoring|mentor|scout|4-h|walking group/i },
  ];

  let fixed = 0;
  const updates = []; // { id, category }

  for (const event of events) {
    let assigned = null;
    for (const rule of rules) {
      if (rule.venue && rule.venue.test(event.venue)) { assigned = rule.category; break; }
      if (rule.name && rule.name.test(event.name)) { assigned = rule.category; break; }
    }
    if (!assigned) assigned = 'Community'; // safe default
    updates.push({ id: event.id, category: assigned });
  }

  // Batch update by category
  const byCat = {};
  for (const u of updates) {
    if (!byCat[u.category]) byCat[u.category] = [];
    byCat[u.category].push(u.id);
  }

  for (const [category, ids] of Object.entries(byCat)) {
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      const { error: updateErr } = await supabase
        .from('events')
        .update({ category })
        .in('id', batch);
      if (!updateErr) fixed += batch.length;
    }
  }
  return fixed;
}

// ============================================================================
// FIX 5: Backfill state from activity or zip code
// ============================================================================
async function fixMissingState() {
  // From linked activity
  const { data: eventsNoState, error } = await supabase
    .from('events')
    .select('id, activity_id, zip_code')
    .or('state.is.null,state.eq.')
    .not('activity_id', 'is', null)
    .limit(5000);

  let fixed = 0;

  if (!error && eventsNoState) {
    // Get all relevant activity states
    const actIds = [...new Set(eventsNoState.map(e => e.activity_id).filter(Boolean))];
    if (actIds.length > 0) {
      const { data: activities } = await supabase
        .from('activities')
        .select('id, state')
        .in('id', actIds)
        .not('state', 'is', null);

      if (activities) {
        const stateMap = {};
        for (const a of activities) stateMap[a.id] = a.state;

        for (const event of eventsNoState) {
          if (stateMap[event.activity_id]) {
            const { error: updateErr } = await supabase
              .from('events')
              .update({ state: stateMap[event.activity_id] })
              .eq('id', event.id);
            if (!updateErr) fixed++;
          }
        }
      }
    }
  }

  // From zip code prefix
  const zipStateMap = {
    '200': 'DC', '201': 'DC', '202': 'DC', '203': 'DC', '204': 'DC', '205': 'DC',
    '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD', '210': 'MD', '211': 'MD',
    '212': 'MD', '213': 'MD', '214': 'MD', '215': 'MD', '216': 'MD', '217': 'MD',
    '218': 'MD', '219': 'MD',
    '220': 'VA', '221': 'VA', '222': 'VA', '223': 'VA', '224': 'VA', '225': 'VA',
    '226': 'VA', '227': 'VA', '228': 'VA', '229': 'VA', '230': 'VA', '231': 'VA',
    '232': 'VA', '233': 'VA', '234': 'VA', '235': 'VA', '236': 'VA', '237': 'VA',
    '238': 'VA', '239': 'VA', '240': 'VA', '241': 'VA', '242': 'VA', '243': 'VA',
    '244': 'VA', '245': 'VA', '246': 'VA',
  };
  // Add more states by first 2 digits
  const zip2StateMap = {
    '10': 'NY', '11': 'NY', '12': 'NY', '13': 'NY', '14': 'NY',
    '15': 'PA', '16': 'PA', '17': 'PA', '18': 'PA', '19': 'PA',
    '27': 'NC', '28': 'NC',
    '29': 'SC',
    '30': 'GA', '31': 'GA',
    '32': 'FL', '33': 'FL', '34': 'FL',
    '35': 'AL', '36': 'AL',
    '37': 'TN', '38': 'TN',
    '40': 'KY', '41': 'KY', '42': 'KY',
    '43': 'OH', '44': 'OH', '45': 'OH',
    '46': 'IN', '47': 'IN',
    '48': 'MI', '49': 'MI',
    '50': 'IA', '51': 'IA', '52': 'IA',
    '53': 'WI', '54': 'WI',
    '55': 'MN', '56': 'MN',
    '57': 'SD',
    '58': 'ND',
    '59': 'MT',
    '60': 'IL', '61': 'IL', '62': 'IL',
    '63': 'MO', '64': 'MO', '65': 'MO',
    '66': 'KS', '67': 'KS',
    '68': 'NE', '69': 'NE',
    '70': 'LA', '71': 'LA',
    '72': 'AR',
    '73': 'OK', '74': 'OK',
    '75': 'TX', '76': 'TX', '77': 'TX', '78': 'TX', '79': 'TX',
    '80': 'CO', '81': 'CO',
    '82': 'WY', '83': 'ID',
    '84': 'UT',
    '85': 'AZ', '86': 'AZ',
    '87': 'NM',
    '88': 'TX', // El Paso area
    '89': 'NV',
    '90': 'CA', '91': 'CA', '92': 'CA', '93': 'CA', '94': 'CA', '95': 'CA', '96': 'CA',
    '97': 'OR',
    '98': 'WA', '99': 'WA',
    '01': 'MA', '02': 'MA',
    '03': 'NH',
    '04': 'ME',
    '05': 'VT',
    '06': 'CT',
    '07': 'NJ', '08': 'NJ',
  };

  const { data: eventsZip } = await supabase
    .from('events')
    .select('id, zip_code')
    .or('state.is.null,state.eq.')
    .not('zip_code', 'is', null)
    .neq('zip_code', '')
    .limit(5000);

  if (eventsZip) {
    for (const event of eventsZip) {
      const zip = String(event.zip_code).trim().slice(0, 5);
      const prefix3 = zip.slice(0, 3);
      const prefix2 = zip.slice(0, 2);
      const state = zipStateMap[prefix3] || zip2StateMap[prefix2];
      if (state) {
        const { error: updateErr } = await supabase
          .from('events')
          .update({ state })
          .eq('id', event.id);
        if (!updateErr) fixed++;
      }
    }
  }

  return fixed;
}

// ============================================================================
// FIX 6: Enrich venue data from linked events
// ============================================================================
async function fixVenueEnrichment() {
  let fixed = 0;

  // Get activities missing url
  const { data: noUrl } = await supabase
    .from('activities')
    .select('id')
    .or('url.is.null,url.eq.')
    .limit(2000);

  if (noUrl && noUrl.length > 0) {
    const ids = noUrl.map(a => a.id);
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const { data: events } = await supabase
        .from('events')
        .select('activity_id, url')
        .in('activity_id', batch)
        .not('url', 'is', null)
        .neq('url', '')
        .limit(500);

      if (events) {
        const urlMap = {};
        for (const e of events) {
          if (!urlMap[e.activity_id]) urlMap[e.activity_id] = e.url;
        }
        for (const [actId, url] of Object.entries(urlMap)) {
          const { error: updateErr } = await supabase
            .from('activities')
            .update({ url })
            .eq('id', actId);
          if (!updateErr) fixed++;
        }
      }
    }
  }

  // Get activities missing description
  const { data: noDesc } = await supabase
    .from('activities')
    .select('id')
    .or('description.is.null,description.eq.')
    .limit(2000);

  if (noDesc && noDesc.length > 0) {
    const ids = noDesc.map(a => a.id);
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const { data: events } = await supabase
        .from('events')
        .select('activity_id, description')
        .in('activity_id', batch)
        .not('description', 'is', null)
        .neq('description', '')
        .limit(500);

      if (events) {
        const descMap = {};
        for (const e of events) {
          if (!descMap[e.activity_id] || e.description.length > descMap[e.activity_id].length) {
            descMap[e.activity_id] = e.description;
          }
        }
        for (const [actId, description] of Object.entries(descMap)) {
          if (description.length > 20) {
            const { error: updateErr } = await supabase
              .from('activities')
              .update({ description })
              .eq('id', actId);
            if (!updateErr) fixed++;
          }
        }
      }
    }
  }

  return fixed;
}

// ============================================================================
// FIX 7: Remove bad activity records (page dumps, absurdly long names)
// ============================================================================
async function fixBadActivityRecords() {
  const { data: activities } = await supabase
    .from('activities')
    .select('id, name')
    .limit(5000);

  if (!activities) return 0;

  const badIds = [];
  const dayPattern = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\w+\s+\d{1,2}/i;
  const timePattern = /\d{1,2}:\d{2}\s*(am|pm)/i;

  for (const a of activities) {
    if (!a.name) continue;
    // Flag activities with excessively long names (page dumps)
    if (a.name.length > 200) { badIds.push(a.id); continue; }
    // Flag names with embedded day+time patterns (event data as venue name)
    if (dayPattern.test(a.name) && timePattern.test(a.name)) { badIds.push(a.id); continue; }
    // Flag names with multiple "Registration" markers (scraped event lists)
    if ((a.name.match(/Registration/gi) || []).length >= 2) { badIds.push(a.id); continue; }
  }

  let deleted = 0;
  for (let i = 0; i < badIds.length; i += 100) {
    const batch = badIds.slice(i, i + 100);
    const { error: delErr } = await supabase.from('activities').delete().in('id', batch);
    if (!delErr) deleted += batch.length;
  }
  return deleted;
}

// ============================================================================
// AUDIT: Field completeness
// ============================================================================
async function auditFieldCompleteness() {
  const totalEvents = await countAll('events');
  const totalActivities = await countAll('activities');

  const eventFields = {};
  for (const field of ['event_date', 'city', 'state', 'venue', 'description', 'category',
    'image_url', 'url', 'address', 'zip_code', 'start_time', 'end_time', 'scraper_name']) {
    eventFields[field] = { missing: await countEmpty('events', field), total: totalEvents };
    eventFields[field].pct_filled = Math.round((1 - eventFields[field].missing / totalEvents) * 100);
  }
  // Location (geometry) is special - check for null only
  eventFields.location = { missing: await countNull('events', 'location'), total: totalEvents };
  eventFields.location.pct_filled = Math.round((1 - eventFields.location.missing / totalEvents) * 100);

  const activityFields = {};
  for (const field of ['description', 'category', 'city', 'state', 'address', 'url',
    'phone', 'hours', 'image_url', 'age_range', 'price_range', 'zip_code']) {
    activityFields[field] = { missing: await countEmpty('activities', field), total: totalActivities };
    activityFields[field].pct_filled = Math.round((1 - activityFields[field].missing / totalActivities) * 100);
  }
  activityFields.location = { missing: await countNull('activities', 'location'), total: totalActivities };
  activityFields.location.pct_filled = Math.round((1 - activityFields.location.missing / totalActivities) * 100);

  return { events: { total: totalEvents, fields: eventFields }, activities: { total: totalActivities, fields: activityFields } };
}

// ============================================================================
// AUDIT: Duplicates
// ============================================================================
async function auditDuplicates() {
  // True event duplicates: same name + date + venue
  const { data: events } = await supabase
    .from('events')
    .select('name, event_date, venue')
    .not('event_date', 'is', null)
    .limit(15000);

  const eventCounts = {};
  if (events) {
    for (const e of events) {
      const key = `${e.name}|${e.event_date}|${e.venue}`;
      eventCounts[key] = (eventCounts[key] || 0) + 1;
    }
  }
  const dupEvents = Object.entries(eventCounts)
    .filter(([, cnt]) => cnt > 1)
    .map(([key, cnt]) => { const [name, date, venue] = key.split('|'); return { name, date, venue, count: cnt }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // True activity duplicates: same name + address
  const { data: activities } = await supabase
    .from('activities')
    .select('name, address, city, state')
    .limit(5000);

  const actCounts = {};
  if (activities) {
    for (const a of activities) {
      const key = `${a.name}|${a.address}|${a.city}|${a.state}`;
      actCounts[key] = (actCounts[key] || 0) + 1;
    }
  }
  const dupActivities = Object.entries(actCounts)
    .filter(([, cnt]) => cnt > 1)
    .map(([key, cnt]) => { const [name, address, city, state] = key.split('|'); return { name, address, city, state, count: cnt }; })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { duplicate_events: dupEvents, duplicate_activities: dupActivities };
}

// ============================================================================
// AUDIT: Scraper health
// ============================================================================
async function auditScraperHealth() {
  const { data: scraperData } = await supabase
    .from('events')
    .select('scraper_name, created_at')
    .not('scraper_name', 'is', null)
    .neq('scraper_name', '')
    .limit(15000);

  if (!scraperData) return {};

  const scrapers = {};
  for (const e of scraperData) {
    if (!scrapers[e.scraper_name]) {
      scrapers[e.scraper_name] = { count: 0, latest: null };
    }
    scrapers[e.scraper_name].count++;
    if (!scrapers[e.scraper_name].latest || e.created_at > scrapers[e.scraper_name].latest) {
      scrapers[e.scraper_name].latest = e.created_at;
    }
  }

  return Object.entries(scrapers)
    .map(([name, info]) => ({
      scraper: name,
      event_count: info.count,
      last_activity: info.latest,
      days_since_active: Math.floor((Date.now() - new Date(info.latest).getTime()) / 86400000)
    }))
    .sort((a, b) => b.event_count - a.event_count);
}

// ============================================================================
// AUDIT: Event date coverage
// ============================================================================
async function auditDateCoverage() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const today = new Date();

  const { data: events } = await supabase
    .from('events')
    .select('event_date')
    .not('event_date', 'is', null)
    .limit(15000);

  if (!events) return {};

  let futureCount = 0;
  let maxDate = today;
  const dateRegex = /^([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/;

  for (const e of events) {
    const match = e.event_date.match(dateRegex);
    if (!match) continue;
    const monthIdx = months.indexOf(match[1]);
    if (monthIdx === -1) continue;
    const d = new Date(parseInt(match[3]), monthIdx, parseInt(match[2]));
    if (d >= today) {
      futureCount++;
      if (d > maxDate) maxDate = d;
    }
  }

  const daysCoverage = Math.floor((maxDate.getTime() - today.getTime()) / 86400000);

  return {
    future_events: futureCount,
    latest_event_date: maxDate.toISOString().split('T')[0],
    days_of_coverage: daysCoverage,
    warning: daysCoverage < 14 ? 'Less than 2 weeks of future events — scrapers may need attention' : null
  };
}

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  await initSupabase();
  console.log('FunHive Data Quality Check - ' + new Date().toISOString());
  console.log('Mode: ' + (auditOnly ? 'AUDIT ONLY' : 'FIX + AUDIT'));
  console.log('---');

  if (!auditOnly) {
    console.log('Running fixes...');

    console.log('  Fix 1: Extracting embedded times...');
    report.fixes.embedded_times_fixed = await fixEmbeddedTimes();
    console.log('    Fixed: ' + report.fixes.embedded_times_fixed);

    console.log('  Fix 2: Deleting past events...');
    report.fixes.past_events_deleted = await fixPastEvents();
    console.log('    Deleted: ' + report.fixes.past_events_deleted);

    console.log('  Fix 3: Removing adult-only events...');
    report.fixes.adult_events_deleted = await fixAdultEvents();
    console.log('    Deleted: ' + report.fixes.adult_events_deleted);

    console.log('  Fix 4: Assigning missing categories...');
    report.fixes.categories_assigned = await fixCategories();
    console.log('    Assigned: ' + report.fixes.categories_assigned);

    console.log('  Fix 5: Backfilling missing state...');
    report.fixes.states_backfilled = await fixMissingState();
    console.log('    Backfilled: ' + report.fixes.states_backfilled);

    console.log('  Fix 6: Enriching venue data...');
    report.fixes.venues_enriched = await fixVenueEnrichment();
    console.log('    Enriched: ' + report.fixes.venues_enriched);

    console.log('  Fix 7: Removing bad activity records (page dumps)...');
    report.fixes.bad_activities_deleted = await fixBadActivityRecords();
    console.log('    Deleted: ' + report.fixes.bad_activities_deleted);
  }

  console.log('Running audit...');

  console.log('  Audit: Field completeness...');
  report.audit.field_completeness = await auditFieldCompleteness();

  console.log('  Audit: Duplicates...');
  report.audit.duplicates = await auditDuplicates();

  console.log('  Audit: Scraper health...');
  report.audit.scraper_health = await auditScraperHealth();

  console.log('  Audit: Date coverage...');
  report.audit.date_coverage = await auditDateCoverage();

  console.log('---');
  console.log('REPORT:');
  console.log(JSON.stringify(report, null, 2));

  // Save report to file
  const reportPath = path.join(__dirname, '..', '..', '..', 'data-quality-reports');
  if (!fs.existsSync(reportPath)) fs.mkdirSync(reportPath, { recursive: true });
  const filename = `dq-report-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(path.join(reportPath, filename), JSON.stringify(report, null, 2));
  console.log('\nReport saved to: data-quality-reports/' + filename);
}

main().catch(err => {
  console.error('FATAL ERROR:', err.message);
  process.exit(1);
});
