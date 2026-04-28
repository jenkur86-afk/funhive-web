#!/usr/bin/env node
/**
 * Remove 3 remaining iffy farm events:
 *   - "Saturday at Kingsbury's Orchard"
 *   - "Sat May Play Days at Milburn Orchards"
 *   - "Raspberries Saturday at Bob Pond Blueberry Farm"
 */
const { supabase } = require('../../scrapers/helpers/supabase-adapter');

(async () => {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, state, venue')
    .eq('scraper_name', 'Farms-Eastern-US');

  if (error) { console.error('Error:', error.message); return; }

  const iffy = data.filter(e =>
    /^Sat(?:urday)?\s+(at|May)\s/i.test(e.name) ||
    /^Raspberries Saturday/i.test(e.name)
  );

  console.log(`Deleting ${iffy.length} iffy events:`);
  iffy.forEach(e => console.log(`  ❌ [${e.state}] "${e.name}"`));

  if (iffy.length > 0) {
    const { error: delErr } = await supabase.from('events').delete().in('id', iffy.map(e => e.id));
    if (delErr) console.error('Delete error:', delErr.message);
    else console.log(`✅ Deleted.`);
  }

  const remaining = data.filter(e => !iffy.includes(e));
  console.log(`\nRemaining farm events (${remaining.length}):`);
  remaining.forEach(e => console.log(`  ✅ [${e.state}] "${e.name}"`));
})();
