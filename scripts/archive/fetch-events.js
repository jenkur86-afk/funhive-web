const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 1. Fetch the LOCAL FUN CHEAT SHEET event
  const { data: cheatSheet, error: e1 } = await supabase
    .from('events')
    .select('id, name, description, category, city, state, venue, scraper_name')
    .eq('id', '68aa3049-51d8-4f73-9c75-4a85475a3a62')
    .single();
  console.log('=== CHEAT SHEET EVENT ===');
  console.log(JSON.stringify(cheatSheet, null, 2));

  // 2. Count all events with that name
  const { data: allCheat, error: e2 } = await supabase
    .from('events')
    .select('id, name, event_date, city, state, scraper_name, reported')
    .ilike('name', '%LOCAL FUN CHEAT SHEET%')
    .eq('reported', false);
  console.log('\n=== ALL CHEAT SHEET EVENTS (not yet reported) ===');
  console.log(`Count: ${allCheat?.length}`);
  if (allCheat) allCheat.forEach(e => console.log(`  ${e.id} | ${e.event_date} | ${e.city}, ${e.state} | ${e.scraper_name}`));

  // 3. Fetch the age range event
  const { data: ageEvent, error: e3 } = await supabase
    .from('events')
    .select('id, name, description, age_range, category, city, state, venue, scraper_name')
    .eq('id', 'b1566f77-6075-4605-8e9f-de30abe9fef5')
    .single();
  console.log('\n=== AGE RANGE EVENT ===');
  console.log(JSON.stringify(ageEvent, null, 2));

  // 4. Check events in Jun 12-16 range
  const { data: junEvents, count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .gte('date', '2026-06-12')
    .lte('date', '2026-06-16')
    .eq('reported', false);
  console.log('\n=== JUNE 12-16 EVENT COUNT ===');
  console.log(`Events with date between Jun 12-16: ${count}`);

  // 5. Check overall date distribution at the tail end
  const { data: lateDates } = await supabase
    .from('events')
    .select('date')
    .eq('reported', false)
    .not('date', 'is', null)
    .gte('date', '2026-06-01')
    .order('date', { ascending: true })
    .limit(5);
  console.log('\n=== EARLIEST JUNE EVENTS ===');
  console.log(lateDates);

  const { data: latestDates } = await supabase
    .from('events')
    .select('date')
    .eq('reported', false)
    .not('date', 'is', null)
    .order('date', { ascending: false })
    .limit(5);
  console.log('\n=== LATEST EVENTS IN DB ===');
  console.log(latestDates);
}
main().catch(console.error);
