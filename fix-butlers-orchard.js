#!/usr/bin/env node
/**
 * Fix Butler's Orchard:
 * 1. Delete "Bunnyland Festival at Butler's Orchard" venue (it's a past event, not a venue)
 * 2. Fix "Butler's Orchard" venue category to "Outdoor & Nature"
 * 3. Create Spring Festival events for April 18, 19, 25, 26
 *
 * Usage:
 *   node fix-butlers-orchard.js          # dry run
 *   node fix-butlers-orchard.js --save   # apply changes
 */
const { supabase } = require('./scrapers/helpers/supabase-adapter');
const SAVE = process.argv.includes('--save');

(async () => {
  console.log(SAVE ? '🔧 SAVE mode\n' : '🧪 DRY RUN\n');

  // ── 1. Delete the Bunnyland Festival venue (it's a past event, not a venue) ──
  const { data: bunnyland } = await supabase
    .from('activities')
    .select('id, name, scraper_name')
    .ilike('name', '%Bunnyland%Butler%');

  if (bunnyland?.length) {
    console.log('1. DELETE venue:', bunnyland[0].name);
    if (SAVE) {
      await supabase.from('activities').delete().eq('id', bunnyland[0].id);
      console.log('   ✅ Deleted');
    }
  } else {
    console.log('1. Bunnyland venue not found (already deleted?)');
  }

  // ── 2. Fix Butler's Orchard venue category ──
  const { data: butlers } = await supabase
    .from('activities')
    .select('id, name, category, subcategory')
    .ilike('name', "Butler's Orchard")
    .not('name', 'ilike', '%Bunnyland%');

  if (butlers?.length) {
    const venue = butlers[0];
    console.log(`\n2. FIX venue: "${venue.name}" — ${venue.category} → Outdoor & Nature`);
    if (SAVE) {
      await supabase.from('activities').update({
        category: 'Outdoor & Nature',
        subcategory: 'Family Farm',
      }).eq('id', venue.id);
      console.log('   ✅ Updated category');
    }
  } else {
    console.log('\n2. Butler\'s Orchard venue not found');
  }

  // ── 3. Create Spring Festival events for all 4 dates ──
  const festivalDates = [
    { date: '2026-04-18', display: 'Saturday, April 18, 2026' },
    { date: '2026-04-19', display: 'Sunday, April 19, 2026' },
    { date: '2026-04-25', display: 'Saturday, April 25, 2026' },
    { date: '2026-04-26', display: 'Sunday, April 26, 2026' },
  ];

  console.log('\n3. CREATE Spring Festival events:');

  // Check for existing Spring Festival events
  const { data: existing } = await supabase
    .from('events')
    .select('id, name, date')
    .ilike('name', '%Spring Festival%Butler%');

  const existingDates = new Set((existing || []).map(e => e.date?.substring(0, 10)));

  for (const { date, display } of festivalDates) {
    if (existingDates.has(date)) {
      console.log(`   ⏭️ ${display} — already exists`);
      continue;
    }

    console.log(`   ✅ ${display}`);

    if (SAVE) {
      const eventId = `spring-festival-butlers-orchard-${date}`;
      const { error } = await supabase.from('events').insert({
        id: eventId,
        name: "Spring Festival at Butler's Orchard",
        venue: "Butler's Orchard",
        event_date: display,
        date: `${date}T10:00:00-04:00`,
        description: "Celebrate the Orchard coming back to life at the Spring Festival! Enjoy seasonal activities, fresh spring produce, and family fun at Butler's Orchard. 10am-5pm.",
        address: '22222 Davis Mill Rd',
        city: 'Germantown',
        state: 'MD',
        zip_code: '20876',
        geohash: 'dqcncwn',
        location: 'SRID=4326;POINT(-77.2711 39.1726)',
        category: 'Outdoor & Nature',
        url: 'https://www.butlersorchard.com',
        image_url: '',
        scraper_name: 'Farms-Eastern-US',
        source_url: 'https://www.butlersorchard.com',
        platform: 'farm-events-aggregator',
        scraped_at: new Date().toISOString(),
      });

      if (error) console.log(`   ❌ Error: ${error.message}`);
    }
  }

  if (!SAVE) {
    console.log('\n🧪 Dry run. Run with --save to apply changes.');
  } else {
    console.log('\n✅ Done!');
  }
})();
