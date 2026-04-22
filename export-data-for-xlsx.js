#!/usr/bin/env node
/**
 * Export all activities and events to JSON for spreadsheet creation.
 * Usage: node export-data-for-xlsx.js
 */
const fs = require('fs');
const { supabase } = require('./scrapers/helpers/supabase-adapter');

(async () => {
  // Export all activities
  console.log('Fetching all activities...');
  let allActivities = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .range(offset, offset + PAGE - 1);
    if (error) { console.error('Activities error:', error.message); break; }
    if (!data || data.length === 0) break;
    allActivities = allActivities.concat(data);
    console.log(`  ...fetched ${allActivities.length} activities`);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  fs.writeFileSync('export-activities.json', JSON.stringify(allActivities, null, 2));
  console.log(`✅ Saved ${allActivities.length} activities to export-activities.json`);

  // Export all events
  console.log('\nFetching all events...');
  let allEvents = [];
  offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .range(offset, offset + PAGE - 1);
    if (error) { console.error('Events error:', error.message); break; }
    if (!data || data.length === 0) break;
    allEvents = allEvents.concat(data);
    console.log(`  ...fetched ${allEvents.length} events`);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  fs.writeFileSync('export-events.json', JSON.stringify(allEvents, null, 2));
  console.log(`✅ Saved ${allEvents.length} events to export-events.json`);
})();
