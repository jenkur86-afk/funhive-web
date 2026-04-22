#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
console.log('FunHive — Add Eastern US Region Filter to Frontend\n');
let changes = 0;

// =============================================================================
// Eastern 1/3 of US: everything east of the Mississippi + border states
// =============================================================================
const EASTERN_STATES = [
  'DC', 'MD', 'VA', 'WV', 'PA', 'NJ', 'DE',
  'NY', 'CT', 'MA', 'RI', 'VT', 'NH', 'ME',
  'NC', 'SC', 'GA', 'FL',
  'AL', 'MS', 'TN', 'KY',
  'OH', 'IN', 'MI', 'IL', 'WI'
];

// =============================================================================
// STEP 1: Create shared region config for the frontend
// =============================================================================
const configFile = path.join(ROOT, 'src/lib/region-filter.ts');
if (!fs.existsSync(configFile)) {
  const configContent = `// Active region filter — controls which states appear on the website
// To expand coverage, add states to the array or set ACTIVE_STATES to null to show all
export const ACTIVE_STATES: string[] | null = [
  // DMV (core)
  'DC', 'MD', 'VA',
  // Mid-Atlantic
  'WV', 'PA', 'NJ', 'DE', 'NY',
  // New England
  'CT', 'MA', 'RI', 'VT', 'NH', 'ME',
  // Southeast
  'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY',
  // Great Lakes / Midwest (east of Mississippi)
  'OH', 'IN', 'MI', 'IL', 'WI',
]

// Helper to add state filter to a Supabase query
export function applyStateFilter(query: any) {
  if (ACTIVE_STATES && ACTIVE_STATES.length > 0) {
    return query.in('state', ACTIVE_STATES)
  }
  return query
}
`;
  fs.writeFileSync(configFile, configContent);
  console.log('✅ Created src/lib/region-filter.ts');
  changes++;
} else {
  console.log('⚠️ src/lib/region-filter.ts already exists');
}

// =============================================================================
// STEP 2: Add state filter to Events page (src/app/events/page.tsx)
// =============================================================================
const eventsFile = path.join(ROOT, 'src/app/events/page.tsx');
if (fs.existsSync(eventsFile)) {
  let events = fs.readFileSync(eventsFile, 'utf8');
  let eventsChanged = false;

  // Add import
  if (!events.includes('region-filter')) {
    const importTarget = "import { getCategoryIcon } from '@/lib/category-icons'";
    if (events.includes(importTarget)) {
      events = events.replace(importTarget, importTarget + "\nimport { ACTIVE_STATES } from '@/lib/region-filter'");
      eventsChanged = true;
      console.log('  ✅ Events page — added import');
    }
  }

  // Add state filter to standard query (no location)
  // Find the .order('event_date') in the standard query and add .in('state') before it
  const stdOld = `.not('event_date', 'is', null)
          .order('event_date', { ascending: true })
          .limit(500)`;
  const stdNew = `.not('event_date', 'is', null)
          .in('state', ACTIVE_STATES || [])
          .order('event_date', { ascending: true })
          .limit(500)`;
  if (events.includes(stdOld) && !events.includes(".in('state', ACTIVE_STATES")) {
    events = events.replace(stdOld, stdNew);
    eventsChanged = true;
    console.log('  ✅ Events page — added state filter to standard query');
  }

  // Add state filter to supplementary query
  const suppOld = `.is('location', null)
          .gte('event_date', today)
          .not('event_date', 'is', null)
          .limit(300)`;
  const suppNew = `.is('location', null)
          .gte('event_date', today)
          .not('event_date', 'is', null)
          .in('state', ACTIVE_STATES || [])
          .limit(300)`;
  if (events.includes(suppOld)) {
    events = events.replace(suppOld, suppNew);
    eventsChanged = true;
    console.log('  ✅ Events page — added state filter to supplementary query');
  }

  // Add client-side state filter for RPC results (which don't support .in())
  const rpcFilter = `isEventOnOrAfterToday(e))`;
  const rpcFilterNew = `isEventOnOrAfterToday(e) && (!ACTIVE_STATES || ACTIVE_STATES.includes(e.state)))`;
  if (events.includes(rpcFilter) && !events.includes('ACTIVE_STATES.includes(e.state)')) {
    events = events.replace(rpcFilter, rpcFilterNew);
    eventsChanged = true;
    console.log('  ✅ Events page — added state filter to RPC results');
  }

  if (eventsChanged) {
    fs.writeFileSync(eventsFile, events);
    console.log('✅ Events page patched\n');
    changes++;
  } else {
    console.log('⚠️ Events page — no changes needed\n');
  }
} else {
  console.log('⚠️ Events page not found\n');
}

// =============================================================================
// STEP 3: Add state filter to Activities/Venues page (src/app/activities/page.tsx)
// =============================================================================
const activitiesFile = path.join(ROOT, 'src/app/activities/page.tsx');
if (fs.existsSync(activitiesFile)) {
  let activities = fs.readFileSync(activitiesFile, 'utf8');
  let activitiesChanged = false;

  // Add import
  if (!activities.includes('region-filter')) {
    // Find last import line
    const lastImport = activities.lastIndexOf("import ");
    const endOfLine = activities.indexOf('\n', lastImport);
    if (endOfLine > -1) {
      const importLine = activities.substring(lastImport, endOfLine);
      activities = activities.replace(importLine, importLine + "\nimport { ACTIVE_STATES } from '@/lib/region-filter'");
      activitiesChanged = true;
      console.log('  ✅ Activities page — added import');
    }
  }

  // Add .in('state') to the activities queries
  // Look for .from('activities').select patterns and add state filter
  const actOld1 = `.from('activities')
          .select('*')
          .order('name', { ascending: true })`;
  const actNew1 = `.from('activities')
          .select('*')
          .in('state', ACTIVE_STATES || [])
          .order('name', { ascending: true })`;

  if (activities.includes(actOld1) && !activities.includes(".in('state', ACTIVE_STATES")) {
    // Replace only the first occurrence
    activities = activities.replace(actOld1, actNew1);
    activitiesChanged = true;
    console.log('  ✅ Activities page — added state filter to main query');
  }

  // Also handle the location-based query if it exists
  const actOld2 = `.from('activities')
          .select('*')
          .not('state', 'is', null)`;
  const actNew2 = `.from('activities')
          .select('*')
          .in('state', ACTIVE_STATES || [])
          .not('state', 'is', null)`;

  if (activities.includes(actOld2) && !activities.includes(".in('state', ACTIVE_STATES")) {
    activities = activities.replace(actOld2, actNew2);
    activitiesChanged = true;
    console.log('  ✅ Activities page — added state filter to location query');
  }

  if (activitiesChanged) {
    fs.writeFileSync(activitiesFile, activities);
    console.log('✅ Activities page patched\n');
    changes++;
  } else {
    console.log('⚠️ Activities page — no changes needed\n');
  }
} else {
  console.log('⚠️ Activities page not found\n');
}

// =============================================================================
// STEP 4: Add state filter to Homepage (src/app/page.tsx)
// =============================================================================
const homeFile = path.join(ROOT, 'src/app/page.tsx');
if (fs.existsSync(homeFile)) {
  let home = fs.readFileSync(homeFile, 'utf8');
  let homeChanged = false;

  // Add import
  if (!home.includes('region-filter')) {
    const homeImportTarget = home.indexOf("import ");
    const endLine = home.indexOf('\n', homeImportTarget);
    const firstImport = home.substring(homeImportTarget, endLine);
    home = home.replace(firstImport, firstImport + "\nimport { ACTIVE_STATES } from '@/lib/region-filter'");
    homeChanged = true;
    console.log('  ✅ Homepage — added import');
  }

  // Add state filter to rawUpcoming query if it exists
  if (home.includes('rawUpcoming') && !home.includes(".in('state', ACTIVE_STATES")) {
    const homeOld = `.not('event_date', 'is', null)
    .order('event_date', { ascending: true })
    .limit(200)`;
    const homeNew = `.not('event_date', 'is', null)
    .in('state', ACTIVE_STATES || [])
    .order('event_date', { ascending: true })
    .limit(200)`;
    if (home.includes(homeOld)) {
      // Replace both occurrences (upcoming + weekend)
      home = home.split(homeOld).join(homeNew);
      homeChanged = true;
      console.log('  ✅ Homepage — added state filter to queries');
    }
  }

  if (homeChanged) {
    fs.writeFileSync(homeFile, home);
    console.log('✅ Homepage patched\n');
    changes++;
  } else {
    console.log('⚠️ Homepage — no changes needed\n');
  }
} else {
  console.log('⚠️ Homepage not found\n');
}

// =============================================================================
// STEP 5: Update region-config.json to activate eastern region for scrapers
// =============================================================================
const regionFile = path.join(ROOT, 'scrapers/region-config.json');
if (fs.existsSync(regionFile)) {
  let region = fs.readFileSync(regionFile, 'utf8');

  const oldActive = '"activeRegions": ["dmv"]';
  const newActive = '"activeRegions": ["dmv", "eastern"]';

  if (region.includes(oldActive)) {
    region = region.replace(oldActive, newActive);
    fs.writeFileSync(regionFile, region);
    console.log('✅ region-config.json — activated eastern region for scrapers\n');
    changes++;
  } else if (region.includes('"eastern"')) {
    console.log('⚠️ region-config.json — eastern already active\n');
  }
} else {
  console.log('⚠️ region-config.json not found\n');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`Done! ${changes} file(s) patched.`);
console.log(`\nEastern US region: ${EASTERN_STATES.length} states + DC`);
if (changes > 0) {
  console.log('\nCommit with:');
  console.log('  git add src/lib/region-filter.ts src/app/events/page.tsx src/app/activities/page.tsx src/app/page.tsx scrapers/region-config.json');
  console.log('  git commit -m "Add Eastern US region filter to frontend + activate eastern scrapers"');
  console.log('  git push origin main');
}
