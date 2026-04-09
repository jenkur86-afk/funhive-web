/**
 * CLEANUP SCRIPT — Remove non-family events, past events, and backfill age tags.
 *
 * Run the SQL first:  ALTER TABLE events ADD COLUMN IF NOT EXISTS age_range TEXT;
 *
 * Usage:
 *   cd ~/Desktop/funhive-web
 *   node scrapers/cleanup-events.js --dry-run    (preview, no changes)
 *   node scrapers/cleanup-events.js              (delete + tag)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DRY_RUN = process.argv.includes('--dry-run');

// Import shared logic from the adapter
const NON_FAMILY_PATTERNS = [
  /\badults?\s*only\b/i,
  /\b(18|21)\s*\+/i,
  /\b(18|21)\s*and\s*(over|up|older)\b/i,
  /\bfor\s+(older\s+)?adults\b/i,
  /\badult\s+(program|workshop|class|craft|event)\b/i,
  /\bsenior\s+(program|workshop|class|event|group|circle|social|lunch|exercise|fitness|yoga|tai\s*chi|bingo|trip)\b/i,
  /\bseniors?\s+only\b/i,
  /\bfor\s+seniors\b/i,
  /\b(50|55|60|65)\s*\+/i,
  /\bolder\s+adults\b/i,
  /\bretire[ed]/i,
  /\baarp\b/i,
  /\bmedicare\b/i,
  /\bdementia\b/i,
  /\balzheimer/i,
  /\bcaregiver\s+support\b/i,
  /\bwine\s+tasting\b/i,
  /\bbeer\s+tasting\b/i,
  /\bcocktail\s+(class|hour|making|tasting)\b/i,
  /\bhappy\s+hour\b/i,
  /\bbar\s+crawl\b/i,
  /\bpub\s+crawl\b/i,
  /\bbrewery\s+tour\b/i,
  /\bbyob\b/i,
  /\bsingles?\s+night\b/i,
  /\bspeed\s+dating\b/i,
  /\bdate\s+night\b/i,
  /\bburlesque\b/i,
  /\bbook\s+club\b/i,
  /\bknitting\s+(circle|club|group)\b/i,
  /\bquilting\b/i,
  /\bcrochet\s+(circle|club|group)\b/i,
  /\bmahjong\b/i,
  /\bbridge\s+club\b/i,
  /\bjob\s+(search|seeker|fair|workshop)\b/i,
  /\bresume\s+(writing|workshop|help|review)\b/i,
  /\btax\s+(prep|help|assistance|filing)\b/i,
  /\bestate\s+planning\b/i,
  /\bscam[\s-]proof/i,
  /\bfraud\s+prevention\b/i,
  /\bgenealogy\b/i,
  /\bblood\s+(drive|donation)\b/i,
  /\bnarcan\b/i,
];

const FAMILY_RESCUE_PATTERNS = [
  /\bfamil(y|ies)\b/i, /\bkid/i, /\bchild/i, /\btoddler/i,
  /\bbab(y|ies)\b/i, /\binfant/i, /\ball\s*ages\b/i, /\bstorytime/i,
  /\bpuppet/i, /\bteen/i, /\byouth\b/i, /\bjunior\b/i,
  /\bpreschool/i, /\belementary/i,
];

function isNonFamily(event) {
  const text = `${event.name || ''} ${event.description || ''}`;
  for (const p of NON_FAMILY_PATTERNS) {
    if (p.test(text)) {
      if (!FAMILY_RESCUE_PATTERNS.some(fp => fp.test(text))) return p.source;
    }
  }
  return null;
}

function detectAge(event) {
  const text = `${event.name || ''} ${event.description || ''}`.toLowerCase();
  const m = text.match(/\bages?\s+(\d{1,2})\s*[-–to]+\s*(\d{1,2})\b/);
  if (m) return `${m[1]}-${m[2]}`;
  const p = text.match(/\((?:ages?\s+)?(\d{1,2})\s*[-–]\s*(\d{1,2})(?:\s*(?:yrs?|years?))?\)/);
  if (p) return `${p[1]}-${p[2]}`;
  if (/\b(baby|babies|infant|lap\s*sit)\b/.test(text)) return '0-2';
  if (/\btoddler/.test(text)) return '1-3';
  if (/\b(preschool|pre-k|prek|pre\s*k)\b/.test(text)) return '3-5';
  if (/\btween/.test(text)) return '9-12';
  if (/\bteen\b/.test(text) && !/\bfamil(y|ies)\b/.test(text)) return '11-18';
  if (/\belementary/.test(text)) return '5-11';
  if (/\b(kids?|children)\b/.test(text) && !/\bfamil(y|ies)\b/.test(text)) return '4-12';
  if (/\ball\s*ages\b/.test(text)) return 'All Ages';
  if (/\bfamil(y|ies)\b/.test(text)) return 'All Ages';
  return null;
}

function isPast(event) {
  if (!event.event_date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(event.event_date) < today;
}

async function run() {
  console.log(DRY_RUN ? 'DRY RUN — no changes\n' : 'LIVE RUN\n');

  // Fetch all events
  let allEvents = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, description, event_date, venue, category, age_range')
      .range(from, from + 999);
    if (error) {
      // If age_range column doesn't exist yet, fetch without it
      if (error.message.includes('age_range')) {
        console.log('age_range column not found — fetching without it...');
        console.log('Run this SQL in Supabase dashboard first:');
        console.log('  ALTER TABLE events ADD COLUMN IF NOT EXISTS age_range TEXT;\n');
        const { data: d2, error: e2 } = await supabase
          .from('events')
          .select('id, name, description, event_date, venue, category')
          .range(from, from + 999);
        if (e2) { console.error('Fetch error:', e2.message); break; }
        if (!d2 || d2.length === 0) break;
        allEvents = allEvents.concat(d2);
        from += 1000;
        continue;
      }
      console.error('Fetch error:', error.message); break;
    }
    if (!data || data.length === 0) break;
    allEvents = allEvents.concat(data);
    from += 1000;
  }
  console.log(`Total events: ${allEvents.length}\n`);

  const toDelete = [];
  const toTag = [];

  for (const event of allEvents) {
    // Check non-family
    const reason = isNonFamily(event);
    if (reason) { toDelete.push({ event, reason: `non-family: ${reason}` }); continue; }

    // Check past
    if (isPast(event)) { toDelete.push({ event, reason: 'past event' }); continue; }

    // Check age tagging needed
    if (!event.age_range) {
      const age = detectAge(event);
      if (age) toTag.push({ event, age });
    }
  }

  console.log(`TO DELETE: ${toDelete.length}`);
  const nonFamily = toDelete.filter(d => d.reason.startsWith('non-family'));
  const past = toDelete.filter(d => d.reason === 'past event');
  console.log(`  Non-family: ${nonFamily.length}`);
  nonFamily.slice(0, 20).forEach(({ event, reason }) => console.log(`    "${event.name}" [${reason}]`));
  if (nonFamily.length > 20) console.log(`    ... and ${nonFamily.length - 20} more`);
  console.log(`  Past: ${past.length}`);
  past.slice(0, 5).forEach(({ event }) => console.log(`    "${event.name}" (${event.event_date})`));
  if (past.length > 5) console.log(`    ... and ${past.length - 5} more`);

  console.log(`\nTO TAG WITH AGE: ${toTag.length}`);
  toTag.slice(0, 15).forEach(({ event, age }) => console.log(`  "${event.name}" -> ${age}`));
  if (toTag.length > 15) console.log(`  ... and ${toTag.length - 15} more`);

  console.log(`\nRemaining family events (untagged): ${allEvents.length - toDelete.length - toTag.length}`);

  if (DRY_RUN) { console.log('\nDry run done. Run without --dry-run to apply.'); return; }

  // Delete
  const ids = toDelete.map(d => d.event.id);
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error } = await supabase.from('events').delete().in('id', batch);
    if (error) console.error(`Delete error: ${error.message}`);
    else deleted += batch.length;
    process.stdout.write(`\rDeleted ${deleted}/${ids.length}`);
  }
  if (deleted) console.log('');

  // Tag
  let tagged = 0;
  for (const { event, age } of toTag) {
    const { error } = await supabase.from('events').update({ age_range: age }).eq('id', event.id);
    if (!error) tagged++;
    if (tagged % 50 === 0) process.stdout.write(`\rTagged ${tagged}/${toTag.length}`);
  }
  if (tagged) console.log('');

  console.log(`\nDone! Deleted ${deleted}, tagged ${tagged}.`);
}

run().catch(console.error);
