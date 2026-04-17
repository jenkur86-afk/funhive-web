#!/usr/bin/env node
/**
 * Clean up farm venue records from the Farms-Eastern-US scraper.
 * Deletes all activities where scraper_name = 'Farms-Eastern-US'
 * so the scraper can be re-run cleanly with fixes applied.
 *
 * Usage:
 *   node fix-farm-dupes.js          # dry run
 *   node fix-farm-dupes.js --save   # delete
 */
const { supabase } = require('./scrapers/helpers/supabase-adapter');
const SAVE = process.argv.includes('--save');

(async () => {
  console.log(SAVE ? '🔧 SAVE mode — will DELETE\n' : '🧪 DRY RUN\n');

  const { data, error } = await supabase
    .from('activities')
    .select('id, name, state, city')
    .eq('scraper_name', 'Farms-Eastern-US');

  if (error) { console.error('Error:', error.message); process.exit(1); }
  if (!data || data.length === 0) { console.log('No Farms-Eastern-US records found.'); return; }

  console.log(`Found ${data.length} farm venue records:\n`);
  for (const r of data) {
    console.log(`  [${r.state}] ${r.name} — ${r.city || 'no city'}`);
  }

  if (!SAVE) {
    console.log(`\n🧪 Dry run. ${data.length} records would be deleted.`);
    console.log('Run with --save to delete.');
    return;
  }

  const ids = data.map(r => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error: delErr } = await supabase.from('activities').delete().in('id', chunk);
    if (delErr) console.error(`  ❌ Delete error: ${delErr.message}`);
  }

  console.log(`\n✅ Deleted ${data.length} farm venue records.`);
})();
