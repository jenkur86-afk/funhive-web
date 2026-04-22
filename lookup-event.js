const { supabase } = require('./scrapers/helpers/supabase-adapter');
async function main() {
  const id = process.argv[2];
  if (!id) { console.log('Usage: node lookup-event.js <event-id>'); process.exit(1); }
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) console.log('Error:', error.message);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('Not found in events table. Trying by string ID pattern...');
    // Try partial match
    const { data: d2 } = await supabase.from('events').select('*').ilike('id', `%${id}%`).limit(3);
    if (d2 && d2.length) console.log(JSON.stringify(d2, null, 2));
    else console.log('Not found anywhere');
  }
  process.exit(0);
}
main();
