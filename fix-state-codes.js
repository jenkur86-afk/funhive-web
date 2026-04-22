#!/usr/bin/env node

/**
 * Fix events with missing or invalid state codes.
 *
 * Usage:
 *   node fix-state-codes.js          # Dry run — shows what would be fixed
 *   node fix-state-codes.js --save   # Actually save fixes to DB
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');

const SAVE = process.argv.includes('--save');

const VALID_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DC','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

// Common state name → abbreviation
const STATE_NAMES = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
  'colorado':'CO','connecticut':'CT','delaware':'DE','district of columbia':'DC',
  'florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL',
  'indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA',
  'maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN',
  'mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
  'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
  'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR',
  'pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD',
  'tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA',
  'washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY'
};

// Try to extract a valid state from the address string
function extractStateFromAddress(address) {
  if (!address) return null;
  // Look for 2-letter state code in the address
  const stateCodeMatch = address.match(/\b([A-Z]{2})\b/g);
  if (stateCodeMatch) {
    for (const code of stateCodeMatch) {
      if (VALID_STATES.includes(code)) return code;
    }
  }
  // Look for full state name
  const lower = address.toLowerCase();
  for (const [name, abbr] of Object.entries(STATE_NAMES)) {
    if (lower.includes(name)) return abbr;
  }
  return null;
}

// Known MacaroniKid scraper city names → state mapping
const MACARONI_CITY_STATES = {
  'riverbank':'CA','upland':'CA','lodi':'CA','pasadena':'CA','fresno':'CA',
  'sacramento':'CA','bakersfield':'CA','stockton':'CA','modesto':'CA',
  'roseville':'CA','oceanside':'CA','temecula':'CA','murrieta':'CA',
  'austin':'TX','houston':'TX','dallas':'TX','sanantonio':'TX','plano':'TX',
  'katy':'TX','sugarland':'TX','pearland':'TX','woodlands':'TX',
  'phoenix':'AZ','tucson':'AZ','chandler':'AZ','gilbert':'AZ','scottsdale':'AZ',
  'denver':'CO','boulder':'CO','aurora':'CO','springs':'CO',
  'portland':'OR','eugene':'OR','salem':'OR','bend':'OR',
  'seattle':'WA','tacoma':'WA','spokane':'WA','bellevue':'WA',
  'atlanta':'GA','savannah':'GA','marietta':'GA','alpharetta':'GA',
  'charlotte':'NC','raleigh':'NC','durham':'NC','greensboro':'NC',
  'nashville':'TN','memphis':'TN','knoxville':'TN','chattanooga':'TN',
  'miami':'FL','tampa':'FL','orlando':'FL','jacksonville':'FL',
  'chicago':'IL','naperville':'IL','springfield':'IL',
  'detroit':'MI','annarbor':'MI','grandrapids':'MI',
  'columbus':'OH','cleveland':'OH','cincinnati':'OH',
  'pittsburgh':'PA','philadelphia':'PA','allentown':'PA',
  'boston':'MA','cambridge':'MA','worcester':'MA',
  'minneapolis':'MN','stpaul':'MN',
  'lasvegas':'NV','reno':'NV','henderson':'NV',
  'neworleans':'LA','batonrouge':'LA',
  'baltimore':'MD','bethesda':'MD','rockville':'MD',
  'richmond':'VA','norfolk':'VA','arlington':'VA',
};

// Try to derive state from scraper_name (e.g., "macaroni-nc" → NC, "Macaroni Kid upland" → CA)
function extractStateFromScraper(scraperName) {
  if (!scraperName) return null;
  // Standard format: macaroni-nc
  const match = scraperName.match(/macaroni-([a-z]{2})(?:-|$)/i);
  if (match) {
    const code = match[1].toUpperCase();
    if (VALID_STATES.includes(code)) return code;
  }
  // "Macaroni Kid {cityname}" format
  const cityMatch = scraperName.match(/macaroni\s+kid\s+(.+)/i);
  if (cityMatch) {
    const city = cityMatch[1].toLowerCase().replace(/\s+/g, '');
    if (MACARONI_CITY_STATES[city]) return MACARONI_CITY_STATES[city];
  }
  // Other scraper patterns
  const stateMatch = scraperName.match(/\b([a-z]{2})(?:-|$)/i);
  if (stateMatch) {
    const code = stateMatch[1].toUpperCase();
    if (VALID_STATES.includes(code)) return code;
  }
  return null;
}

// Normalize state value — fix common issues like lowercase, full names, extra spaces
function normalizeState(state) {
  if (!state) return null;
  const trimmed = state.trim();
  // Already valid
  if (VALID_STATES.includes(trimmed.toUpperCase()) && trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  // Full state name
  const lower = trimmed.toLowerCase();
  if (STATE_NAMES[lower]) return STATE_NAMES[lower];
  // 2-letter but wrong case
  if (trimmed.length === 2 && VALID_STATES.includes(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  return null;
}

async function fixStates() {
  console.log(`\n🏛️  STATE CODE FIX ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log('─'.repeat(50));

  // Fetch events with missing state
  const { data: missingState, error: e1 } = await supabase
    .from('events')
    .select('id, name, state, city, address, scraper_name, venue')
    .is('state', null)
    .limit(500);

  if (e1) { console.error('Error fetching missing-state events:', e1.message); return; }

  // Fetch events with invalid state
  const { data: allEvents, error: e2 } = await supabase
    .from('events')
    .select('id, name, state, city, address, scraper_name, venue')
    .not('state', 'is', null)
    .limit(50000);

  if (e2) { console.error('Error fetching events:', e2.message); return; }

  const invalidState = allEvents.filter(e => !VALID_STATES.includes((e.state || '').toUpperCase()));

  console.log(`  Events missing state: ${missingState.length}`);
  console.log(`  Events invalid state: ${invalidState.length}`);

  const toFix = [];

  // Process missing state events
  for (const evt of missingState) {
    let newState = null;
    let source = '';

    // Try address first
    newState = extractStateFromAddress(evt.address);
    if (newState) { source = 'address'; }

    // Try city (some have "City, ST" format)
    if (!newState && evt.city) {
      const cityMatch = evt.city.match(/,\s*([A-Z]{2})$/);
      if (cityMatch && VALID_STATES.includes(cityMatch[1])) {
        newState = cityMatch[1];
        source = 'city field';
      }
    }

    // Try scraper name
    if (!newState) {
      newState = extractStateFromScraper(evt.scraper_name);
      if (newState) source = 'scraper_name';
    }

    // Try venue
    if (!newState) {
      newState = extractStateFromAddress(evt.venue);
      if (newState) source = 'venue';
    }

    if (newState) {
      toFix.push({ id: evt.id, name: evt.name, oldState: null, newState, source });
    } else {
      console.log(`  ❌ Can't fix: "${evt.name}" | city=${evt.city} | addr=${evt.address} | scraper=${evt.scraper_name}`);
    }
  }

  // Process invalid state events
  for (const evt of invalidState) {
    let newState = null;
    let source = '';

    // Try normalizing the existing value first
    newState = normalizeState(evt.state);
    if (newState) { source = 'normalized'; }

    // Try address
    if (!newState) {
      newState = extractStateFromAddress(evt.address);
      if (newState) source = 'address';
    }

    // Try scraper name
    if (!newState) {
      newState = extractStateFromScraper(evt.scraper_name);
      if (newState) source = 'scraper_name';
    }

    if (newState) {
      toFix.push({ id: evt.id, name: evt.name, oldState: evt.state, newState, source });
    } else {
      console.log(`  ❌ Can't fix: "${evt.name}" | state="${evt.state}" | scraper=${evt.scraper_name}`);
    }
  }

  console.log(`\n  Can fix: ${toFix.length}/${missingState.length + invalidState.length}`);

  if (toFix.length > 0) {
    console.log('\n  Fixes:');
    for (const fix of toFix) {
      console.log(`    "${fix.name}" — ${fix.oldState || '(null)'} → ${fix.newState} (from ${fix.source})`);
    }
  }

  if (SAVE && toFix.length > 0) {
    console.log('\n  Saving...');
    let saved = 0;
    for (const fix of toFix) {
      const { error } = await supabase
        .from('events')
        .update({ state: fix.newState })
        .eq('id', fix.id);
      if (error) {
        console.log(`    ❌ Failed: ${fix.name} — ${error.message}`);
      } else {
        saved++;
      }
    }
    console.log(`  ✅ Fixed ${saved} events`);
  } else if (!SAVE && toFix.length > 0) {
    console.log('\n  Run with --save to apply fixes');
  }

  // Also check for events that can be deleted (no useful info)
  const unfixable = [...missingState, ...invalidState].filter(
    evt => !toFix.find(f => f.id === evt.id)
  );
  if (unfixable.length > 0) {
    console.log(`\n  ${unfixable.length} unfixable event(s) — review manually or delete:`);
    for (const evt of unfixable) {
      console.log(`    id=${evt.id} | "${evt.name}" | city=${evt.city} | scraper=${evt.scraper_name}`);
    }
  }

  console.log('');
}

fixStates().catch(console.error);
