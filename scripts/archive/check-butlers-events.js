#!/usr/bin/env node
const { supabase } = require('../../scrapers/helpers/supabase-adapter');

(async () => {
  // Check events table
  const { data: events } = await supabase
    .from('events')
    .select('id, name, venue, event_date, date, description, url, scraper_name, category, subcategory')
    .or('name.ilike.%butler%,venue.ilike.%butler%')
    .order('date', { ascending: true });

  console.log(`Found ${events?.length || 0} Butler's Orchard events:\n`);
  for (const e of (events || [])) {
    console.log('─'.repeat(60));
    console.log(`  Name:       ${e.name}`);
    console.log(`  Venue:      ${e.venue}`);
    console.log(`  Event Date: ${e.event_date}`);
    console.log(`  Date:       ${e.date}`);
    console.log(`  Category:   ${e.category} → ${e.subcategory || 'n/a'}`);
    console.log(`  URL:        ${e.url}`);
    console.log(`  Scraper:    ${e.scraper_name}`);
    console.log(`  ID:         ${e.id}`);
    console.log(`  Desc:       ${(e.description || '').substring(0, 100)}`);
  }

  // Also check activities table
  const { data: activities } = await supabase
    .from('activities')
    .select('id, name, category, subcategory, scraper_name')
    .ilike('name', '%butler%');

  console.log(`\n\nFound ${activities?.length || 0} Butler's Orchard venues:\n`);
  for (const a of (activities || [])) {
    console.log(`  [${a.scraper_name}] ${a.name} — ${a.category} → ${a.subcategory}`);
  }
})();
