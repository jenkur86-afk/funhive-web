#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
console.log('FunHive — Fix Date Filtering (handle non-ISO event_date strings)\n');
let changes = 0;

// =============================================================================
// The event_date column in Supabase contains strings like "April 1, 2026 10:00am"
// not "2026-04-01". The .gte('event_date', '2026-04-09') does a STRING comparison
// where "April..." > "2026..." (because 'A' > '2' in char codes), so every event
// passes the filter. Fix: add client-side date parsing + filtering after fetch.
// =============================================================================

// Helper function to add to both pages
const PARSE_HELPER = `
// Parse event_date strings like "April 1, 2026 10:00am" or "2026-04-09" into Date objects
function parseEventDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Already ISO format
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(dateStr)) return new Date(dateStr + 'T00:00:00')
  // Try native parsing ("April 1, 2026 10:00am" works in most browsers)
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d
  return null
}

function isEventOnOrAfterToday(event: any): boolean {
  if (!event.event_date) return false
  const d = parseEventDate(event.event_date)
  if (!d) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d >= today
}
`;

// =============================================================================
// FIX 1: Events page (src/app/events/page.tsx)
// =============================================================================
const eventsFile = path.join(ROOT, 'src/app/events/page.tsx');
if (fs.existsSync(eventsFile)) {
  let events = fs.readFileSync(eventsFile, 'utf8');
  let eventsChanged = false;

  // Add the helper function before loadEvents
  if (!events.includes('parseEventDate')) {
    // Insert helper right before the loadEvents function
    const insertBefore = '  async function loadEvents()';
    if (events.includes(insertBefore)) {
      events = events.replace(insertBefore, PARSE_HELPER + '\n  ' + insertBefore.trim());
      eventsChanged = true;
      console.log('  ✅ Added parseEventDate helper');
    } else {
      console.log('  ⚠️ Could not find loadEvents insertion point');
    }
  } else {
    console.log('  ⚠️ parseEventDate already exists');
  }

  // Add client-side filter after each data fetch
  // Path 1: RPC result (line ~187)
  const rpcOld = `allData = result.data.filter((e: any) => !e.event_date || e.event_date >= today)`;
  const rpcNew = `allData = result.data.filter((e: any) => isEventOnOrAfterToday(e))`;
  if (events.includes(rpcOld)) {
    events = events.replace(rpcOld, rpcNew);
    eventsChanged = true;
    console.log('  ✅ Fixed RPC result filter');
  }

  // Path 2: After standard query result (line ~217)
  const stdOld = `if (!result.error && result.data) allData = result.data`;
  const stdNew = `if (!result.error && result.data) allData = result.data.filter((e: any) => isEventOnOrAfterToday(e))`;
  if (events.includes(stdOld)) {
    events = events.replace(stdOld, stdNew);
    eventsChanged = true;
    console.log('  ✅ Fixed standard query filter');
  }

  // Path 3: supplementary query results already go through dedup, add filter there
  const suppOld = `const additional = supplementary.data.filter((e: any) => !existingIds.has(e.id))`;
  const suppNew = `const additional = supplementary.data.filter((e: any) => !existingIds.has(e.id) && isEventOnOrAfterToday(e))`;
  if (events.includes(suppOld)) {
    events = events.replace(suppOld, suppNew);
    eventsChanged = true;
    console.log('  ✅ Fixed supplementary query filter');
  }

  if (eventsChanged) {
    fs.writeFileSync(eventsFile, events);
    console.log('✅ Events page — client-side date filtering added\n');
    changes++;
  } else {
    console.log('⚠️ Events page — no changes needed\n');
  }
} else {
  console.log('⚠️ Events page not found\n');
}

// =============================================================================
// FIX 2: Homepage (src/app/page.tsx) — server component, different approach
// The homepage uses a server component so we can't add runtime JS easily.
// Instead, filter the results after the Supabase query.
// =============================================================================
const homeFile = path.join(ROOT, 'src/app/page.tsx');
if (fs.existsSync(homeFile)) {
  let home = fs.readFileSync(homeFile, 'utf8');
  let homeChanged = false;

  if (!home.includes('parseEventDateServer')) {
    // Find where the component function starts and add the helper
    // First, let's add a server-side parse function
    const serverHelper = `
// Parse non-ISO event_date strings for filtering
function parseEventDateServer(dateStr: string): Date | null {
  if (!dateStr) return null
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(dateStr)) return new Date(dateStr + 'T00:00:00')
  const d = new Date(dateStr)
  if (!isNaN(d.getTime())) return d
  return null
}
`;

    // Insert before the default export
    const exportMatch = home.indexOf('export default async function');
    if (exportMatch > -1) {
      home = home.substring(0, exportMatch) + serverHelper + '\n' + home.substring(exportMatch);
      homeChanged = true;
      console.log('  ✅ Added server-side parseEventDateServer helper');
    }

    // Filter upcoming events result
    const upcomingOld = `const { data: upcomingEvents } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(6)`;

    if (home.includes(upcomingOld)) {
      const upcomingNew = `const { data: rawUpcoming } = await supabase
    .from('events')
    .select('*')
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })
    .limit(200)
  const upcomingEvents = (rawUpcoming || []).filter(e => {
    const d = parseEventDateServer(e.event_date)
    if (!d) return false
    const t = new Date(today + 'T00:00:00')
    d.setHours(0,0,0,0)
    return d >= t
  }).slice(0, 6)`;
      home = home.replace(upcomingOld, upcomingNew);
      homeChanged = true;
      console.log('  ✅ Fixed upcoming events filter');
    }

    // Filter weekend events result
    const weekendOld = `const { data: weekendEvents } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', weekend.start)
    .lte('event_date', weekend.end)
    .order('event_date', { ascending: true })
    .limit(6)`;

    if (home.includes(weekendOld)) {
      const weekendNew = `const { data: rawWeekend } = await supabase
    .from('events')
    .select('*')
    .not('event_date', 'is', null)
    .order('event_date', { ascending: true })
    .limit(200)
  const weekendEvents = (rawWeekend || []).filter(e => {
    const d = parseEventDateServer(e.event_date)
    if (!d) return false
    const ds = d.toISOString().split('T')[0]
    return ds >= weekend.start && ds <= weekend.end
  }).slice(0, 6)`;
      home = home.replace(weekendOld, weekendNew);
      homeChanged = true;
      console.log('  ✅ Fixed weekend events filter');
    }
  } else {
    console.log('  ⚠️ parseEventDateServer already exists');
  }

  if (homeChanged) {
    fs.writeFileSync(homeFile, home);
    console.log('✅ Homepage — server-side date filtering added\n');
    changes++;
  } else {
    console.log('⚠️ Homepage — no changes needed\n');
  }
} else {
  console.log('⚠️ Homepage not found\n');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`Done! ${changes} file(s) patched.`);
if (changes > 0) {
  console.log('\nCommit with:');
  console.log('  git add src/app/events/page.tsx src/app/page.tsx');
  console.log('  git commit -m "Fix date filtering: parse non-ISO event_date strings client-side"');
  console.log('  git push origin main');
}
