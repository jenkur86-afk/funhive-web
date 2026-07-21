#!/usr/bin/env node

/**
 * ANALYTICS DASHBOARD
 *
 * A local, service-role report over the write-only `click_events` table plus
 * Supabase Auth and `user_settings`. Answers the questions the app itself can't:
 *   - Traffic:     distinct sessions/day (rough visitor count), interactions by type
 *   - Accounts:    total users, new signups in window, premium/subscriber counts
 *   - Content:     most-viewed events + venues, top outbound link clicks
 *   - Search:      top search terms
 *   - Acquisition: top referrers / UTM sources — IF the columns exist (see below)
 *
 * `click_events` has no anon SELECT policy by design, so this MUST run locally
 * with the service-role key. It reuses the shared service-role client from
 * `scrapers/helpers/supabase-adapter.js` (loads `.env`, bypasses RLS).
 *
 * EGRESS NOTE: reads count against the Supabase egress budget (writes don't).
 * This pulls only light columns within the time window, paginated. On a
 * low-traffic site a 30-day window is a few MB. Widen with care.
 *
 * ACQUISITION NOTE: referrer/UTM reporting only works once `click_events` has
 * `referrer` / `utm_source` / `utm_medium` / `utm_campaign` columns AND the
 * client logs them. Until then this section prints setup guidance. See TODO.md
 * ("Analytics & tracking") for the migration + client change.
 *
 * Usage:
 *   node scripts/analytics-dashboard.js            # last 30 days
 *   node scripts/analytics-dashboard.js --days=7   # last 7 days
 *   node scripts/analytics-dashboard.js --days=90 --top=25
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
function argNum(name, def) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return def;
  const n = parseInt(hit.split('=')[1], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
const DAYS = argNum('days', 30);
const TOP = argNum('top', 15);
const sinceISO = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

// ---- small helpers ---------------------------------------------------------
const PAGE = 1000;

function fmt(n) {
  return Number(n).toLocaleString('en-US');
}
function pct(part, whole) {
  if (!whole) return '0.0%';
  return `${((part / whole) * 100).toFixed(1)}%`;
}
function bar(count, max, width = 24) {
  if (!max) return '';
  return '█'.repeat(Math.max(1, Math.round((count / max) * width)));
}
function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}
function section(title) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

// exact count without downloading rows. `col` must be a real column on the
// table (user_settings is keyed by user_id and has no `id`).
async function count(table, col, filterFn) {
  let q = supabase.from(table).select(col, { count: 'exact', head: true });
  if (filterFn) q = filterFn(q);
  const { count: c, error } = await q;
  if (error) throw error;
  return c || 0;
}

// Probe whether the acquisition columns exist yet (they don't until the
// migration in TODO.md runs). Returns the subset of columns that are present.
async function detectAcqColumns() {
  const candidates = ['referrer', 'utm_source', 'utm_medium', 'utm_campaign'];
  const present = [];
  for (const col of candidates) {
    const { error } = await supabase.from('click_events').select(col, { head: true, count: 'exact' }).limit(1);
    if (!error) present.push(col);
  }
  return present;
}

// Pull light columns for the window, paginated. ORDER BY is mandatory before
// .range() (see CLAUDE.md — un-ordered pagination duplicates/drops rows).
async function pullWindow(extraCols) {
  const cols = ['interaction_type', 'event_id', 'activity_id', 'search_query', 'session_id', 'created_at', ...extraCols];
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('click_events')
      .select(cols.join(', '))
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// Fetch display names for a handful of top ids (one round-trip, lean columns).
async function namesFor(table, ids, cols) {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from(table).select(cols).in('id', ids);
  if (error) throw error;
  return new Map((data || []).map((r) => [r.id, r]));
}

// Count new auth users created within the window (paginated admin API).
async function newSignups() {
  let total = 0;
  let inWindow = 0;
  const since = new Date(sinceISO).getTime();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    if (users.length === 0) break;
    total += users.length;
    inWindow += users.filter((u) => new Date(u.created_at).getTime() >= since).length;
    if (users.length < 200) break;
  }
  return { total, inWindow };
}

// ---- report ----------------------------------------------------------------
async function main() {
  console.log(`\n📊 FunHive Analytics — last ${DAYS} days (since ${sinceISO.slice(0, 10)})`);
  console.log('═'.repeat(60));

  const acqCols = await detectAcqColumns();
  const rows = await pullWindow(acqCols);

  // ---- Traffic -------------------------------------------------------------
  section('TRAFFIC');
  const sessions = new Set();
  const byType = new Map();
  const byDaySessions = new Map(); // day -> Set(session)
  const byDayCount = new Map(); // day -> interactions
  for (const r of rows) {
    if (r.session_id) sessions.add(r.session_id);
    byType.set(r.interaction_type, (byType.get(r.interaction_type) || 0) + 1);
    const day = (r.created_at || '').slice(0, 10);
    if (!byDaySessions.has(day)) byDaySessions.set(day, new Set());
    if (r.session_id) byDaySessions.get(day).add(r.session_id);
    byDayCount.set(day, (byDayCount.get(day) || 0) + 1);
  }
  console.log(`Total interactions logged : ${fmt(rows.length)}`);
  console.log(`Distinct sessions (visitors≈): ${fmt(sessions.size)}`);
  if (rows.length === 0) {
    console.log('\n(no click_events in this window — nothing else to report)');
    console.log('If you expected data, confirm the site is live and logInteraction() is firing.');
    return;
  }

  // ---- Interactions by type ------------------------------------------------
  section('ENGAGEMENT BY TYPE');
  const typeEntries = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  const maxType = typeEntries[0][1];
  for (const [type, c] of typeEntries) {
    console.log(`${type.padEnd(18)} ${fmt(c).padStart(7)}  ${bar(c, maxType)}`);
  }

  // ---- Accounts ------------------------------------------------------------
  section('ACCOUNTS');
  try {
    const { total, inWindow } = await newSignups();
    const premium = await count('user_settings', 'user_id', (q) => q.eq('is_premium', true));
    const subscribers = await count('user_settings', 'user_id', (q) => q.not('stripe_customer_id', 'is', null));
    console.log(`Total registered users     : ${fmt(total)}`);
    console.log(`New signups (last ${DAYS}d)     : ${fmt(inWindow)}`);
    console.log(`Premium users              : ${fmt(premium)}`);
    console.log(`Stripe subscribers         : ${fmt(subscribers)}`);
  } catch (e) {
    console.log(`(could not read accounts: ${e.message})`);
  }

  // ---- Top events ----------------------------------------------------------
  section(`TOP EVENTS (by view_event, top ${TOP})`);
  const eventViews = new Map();
  for (const r of rows) if (r.interaction_type === 'view_event' && r.event_id) eventViews.set(r.event_id, (eventViews.get(r.event_id) || 0) + 1);
  const topEvents = topN(eventViews, TOP);
  const eventNames = await namesFor('events', topEvents.map(([id]) => id), 'id, name, city, state');
  if (topEvents.length === 0) console.log('(none)');
  for (const [id, c] of topEvents) {
    const e = eventNames.get(id);
    const label = e ? `${e.name} — ${e.city || '?'}, ${e.state || '?'}` : `(deleted event ${id.slice(0, 8)})`;
    console.log(`${fmt(c).padStart(5)}  ${label}`);
  }

  // ---- Top venues ----------------------------------------------------------
  section(`TOP VENUES (by view_activity, top ${TOP})`);
  const venueViews = new Map();
  for (const r of rows) if (r.interaction_type === 'view_activity' && r.activity_id) venueViews.set(r.activity_id, (venueViews.get(r.activity_id) || 0) + 1);
  const topVenues = topN(venueViews, TOP);
  const venueNames = await namesFor('activities', topVenues.map(([id]) => id), 'id, name, city, state');
  if (topVenues.length === 0) console.log('(none)');
  for (const [id, c] of topVenues) {
    const a = venueNames.get(id);
    const label = a ? `${a.name} — ${a.city || '?'}, ${a.state || '?'}` : `(deleted venue ${id.slice(0, 8)})`;
    console.log(`${fmt(c).padStart(5)}  ${label}`);
  }

  // ---- Outbound link clicks ------------------------------------------------
  section('OUTBOUND & ACTION CLICKS');
  const linkTypes = ['click_source_url', 'click_venue_link', 'click_directions'];
  for (const t of linkTypes) console.log(`${t.padEnd(18)} ${fmt(byType.get(t) || 0).padStart(7)}`);

  // ---- Top searches --------------------------------------------------------
  section(`TOP SEARCHES (top ${TOP})`);
  const searches = new Map();
  for (const r of rows) {
    if (r.interaction_type === 'search' && r.search_query && r.search_query.trim()) {
      const q = r.search_query.trim().toLowerCase();
      searches.set(q, (searches.get(q) || 0) + 1);
    }
  }
  const topSearches = topN(searches, TOP);
  if (topSearches.length === 0) console.log('(none)');
  for (const [q, c] of topSearches) console.log(`${fmt(c).padStart(5)}  "${q}"`);

  // ---- Acquisition ---------------------------------------------------------
  section('ACQUISITION (how visitors arrive)');
  if (acqCols.length === 0) {
    console.log('Not tracked yet — click_events has no referrer / utm_* columns.');
    console.log('To enable: add the columns + log them client-side. See TODO.md → "Analytics & tracking".');
  } else {
    for (const col of acqCols) {
      const counts = new Map();
      for (const r of rows) {
        const v = (r[col] || '').trim();
        if (v) counts.set(v, (counts.get(v) || 0) + 1);
      }
      const top = topN(counts, TOP);
      console.log(`\nBy ${col}:`);
      if (top.length === 0) console.log('  (no values captured yet)');
      for (const [v, c] of top) console.log(`  ${fmt(c).padStart(5)}  ${v}`);
    }
  }

  // ---- Daily trend ---------------------------------------------------------
  section('DAILY TREND (sessions / interactions)');
  const days = [...byDayCount.keys()].sort();
  const maxDaySess = Math.max(...days.map((d) => byDaySessions.get(d)?.size || 0));
  for (const d of days) {
    const s = byDaySessions.get(d)?.size || 0;
    const i = byDayCount.get(d) || 0;
    console.log(`${d}  sess ${fmt(s).padStart(5)}  int ${fmt(i).padStart(6)}  ${bar(s, maxDaySess)}`);
  }

  console.log('\n═'.repeat(60));
  console.log(`Tip: pair this with Vercel Web Analytics (referrers, top pages, devices)`);
  console.log(`     and Google Search Console (organic search discovery).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Dashboard failed:', err.message);
    process.exit(1);
  });
