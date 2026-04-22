#!/usr/bin/env node
/**
 * Quick diagnostic: find events with invalid state values
 */
const { supabase } = require('./scrapers/helpers/supabase-adapter');

const VALID_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

async function main() {
  // Get all distinct non-null state values from events
  const { data, error } = await supabase
    .from('events')
    .select('state')
    .not('state', 'is', null)
    .limit(50000);

  if (error) { console.error(error.message); return; }

  // Count by state value
  const counts = {};
  for (const row of data) {
    const s = row.state;
    if (!VALID_STATES.includes(s?.toUpperCase())) {
      counts[s] = (counts[s] || 0) + 1;
    }
  }

  console.log('Invalid state values in events:');
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [val, count] of sorted) {
    console.log(`  "${val}" — ${count} events`);
  }
  console.log(`\nTotal: ${sorted.reduce((s, [, c]) => s + c, 0)} events with invalid states`);

  // Show a sample event for each invalid state
  console.log('\nSample events per invalid state:');
  for (const [val] of sorted.slice(0, 10)) {
    const { data: sample } = await supabase
      .from('events')
      .select('id, name, city, scraper_name')
      .eq('state', val)
      .limit(2);
    for (const s of (sample || [])) {
      console.log(`  "${val}" → "${s.name}" (city: ${s.city}, scraper: ${s.scraper_name})`);
    }
  }
}

main();
