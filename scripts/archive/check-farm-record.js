#!/usr/bin/env node
/**
 * Quick lookup: show a farm record from the activities table
 * Usage: node check-farm-record.js "Butler's Orchard"
 */
const { supabase } = require('../../scrapers/helpers/supabase-adapter');
const search = process.argv[2] || "Butler's Orchard";

(async () => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .ilike('name', `%${search}%`)
    .limit(5);

  if (error) { console.error('Error:', error.message); process.exit(1); }
  if (!data || data.length === 0) { console.log(`No records found matching "${search}"`); return; }

  for (const row of data) {
    console.log('\n' + '='.repeat(60));
    console.log(`🌾 ${row.name}`);
    console.log('='.repeat(60));
    console.log(`  ID:          ${row.id}`);
    console.log(`  Category:    ${row.category} → ${row.subcategory || 'n/a'}`);
    console.log(`  Description: ${row.description || 'n/a'}`);
    console.log(`  Address:     ${row.address || 'n/a'}`);
    console.log(`  City:        ${row.city || 'n/a'}`);
    console.log(`  State:       ${row.state || 'n/a'}`);
    console.log(`  ZIP:         ${row.zip_code || 'n/a'}`);
    console.log(`  Phone:       ${row.phone || 'n/a'}`);
    console.log(`  Website:     ${row.url || 'n/a'}`);
    console.log(`  Location:    ${row.location ? (typeof row.location === 'object' ? JSON.stringify(row.location) : row.location) : 'NULL'}`);
    console.log(`  Geohash:     ${row.geohash || 'n/a'}`);
    console.log(`  Age Range:   ${row.age_range || 'n/a'}`);
    console.log(`  Is Free:     ${row.is_free}`);
    console.log(`  Source:      ${row.source || 'n/a'}`);
    console.log(`  Scraper:     ${row.scraper_name || 'n/a'}`);
    console.log(`  Scraped At:  ${row.scraped_at || 'n/a'}`);
  }
})();
