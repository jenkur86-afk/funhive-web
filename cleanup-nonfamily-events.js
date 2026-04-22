#!/usr/bin/env node

/**
 * Clean up non-family events from the database.
 *
 * Three tiers:
 * 1. AUTO-DELETE: Clearly non-family (booze, sexy, cannabis, explicit 21+)
 * 2. KEEP: False positives (library trivia nights, family events at breweries, etc.)
 * 3. REVIEW: Borderline — exported to CSV for manual review
 *
 * Usage: node cleanup-nonfamily-events.js [--save]
 */

const { supabase } = require('./scrapers/helpers/supabase-adapter');
const fs = require('fs');

const SAVE = process.argv.includes('--save');

// ─── TIER 1: AUTO-DELETE patterns (clearly not family-friendly) ─────────────
const AUTO_DELETE_PATTERNS = [
  { pattern: /\bsexy\b/i, label: 'sexy' },
  { pattern: /\bsensual\b/i, label: 'sensual' },
  { pattern: /\berotic\b/i, label: 'erotic' },
  { pattern: /\bburlesque\b/i, label: 'burlesque' },
  { pattern: /\bkink\b/i, label: 'kink' },
  { pattern: /\bbooze\b/i, label: 'booze' },
  { pattern: /\bcannabis\b/i, label: 'cannabis' },
  { pattern: /\bmarijuana\b/i, label: 'marijuana' },
  { pattern: /\b420\b/i, label: '420' },
  { pattern: /\bstoner\b/i, label: 'stoner' },
  { pattern: /\bbar\s*crawl/i, label: 'bar crawl' },
  { pattern: /\bsingles?\s*(night|mixer|mingle|event)\b/i, label: 'singles event' },
  { pattern: /\bspeed\s*dating\b/i, label: 'speed dating' },
  { pattern: /\bnight\s*club\b/i, label: 'nightclub' },
  { pattern: /\badults?\s*only\s*(night|event|party|swim|hours?|session)?\b/i, label: 'adults only' },
  { pattern: /\b21\s*\+\s*(only|event|night|party)\b/i, label: '21+ event' },
  { pattern: /\bgambling\b/i, label: 'gambling' },
  { pattern: /\bgun\s*show\b/i, label: 'gun show' },
  { pattern: /\bfirearms?\s*(show|expo|sale)\b/i, label: 'firearms' },
];

// ─── TIER 2: FALSE POSITIVE safeguards (override delete if matched) ─────────
function isFalsePositive(name, description, venue) {
  const text = `${name || ''} ${description || ''} ${venue || ''}`.toLowerCase();
  const nameLower = (name || '').toLowerCase();

  // Library trivia nights are family events
  if (/trivia/i.test(nameLower) && (/library|teen|family|kid|all ages|children/i.test(text))) return 'library/family trivia';

  // "Toddler Happy Hour", "Baby Happy Hour" — kids' events
  if (/\b(toddler|baby|kid|children|family)\b.*\bhappy\s*hour/i.test(nameLower)) return 'kids happy hour';

  // "Teens Speed Date Books" — library reading program
  if (/speed\s*date?\s*books?/i.test(nameLower)) return 'speed date books (library)';

  // "After Dark" nature programs at parks/libraries
  if (/after\s*dark/i.test(nameLower) && /\b(amphibian|nature|park|library|printing|3d|animal|wildlife|hike|astronomy|star|owl|garden|botanical|museum|zoo|aquarium)\b/i.test(text)) return 'nature/garden after dark';

  // "Glow Night" / "Glow Jump" at trampoline parks — family
  if (/glow\s*(night|jump|party)/i.test(nameLower) && /sky\s*zone|trampoline|bounce/i.test(text)) return 'glow night (trampoline park)';

  // "Strip District" in Pittsburgh
  if (/strip\s*district/i.test(text)) return 'Strip District (neighborhood)';

  // "Comic strip" / "Create a Comic"
  if (/comic/i.test(text) && /strip/i.test(text)) return 'comic strip';

  // "Guys & Dolls Jr" — kids musical that mentions nightclub in plot
  if (/guys\s*&?\s*dolls\s*jr/i.test(nameLower)) return 'kids musical';

  // "Mocktail" — non-alcoholic
  if (/mocktail/i.test(nameLower)) return 'mocktail (non-alcoholic)';

  // Events about weed removal / gardening
  if (/\bweed\b/i.test(text) && /\b(garden|plant|pull|remov|invasive|native|preserve|service|volunteer)\b/i.test(text)) return 'weed (gardening)';

  // Drug Take Back programs (public safety, not drug use)
  if (/drug\s*take\s*back/i.test(text)) return 'drug take back (public safety)';

  // "In The Park After Dark" nature programs
  if (/park\s*after\s*dark/i.test(text) && /moth|nature|animal|firefl|star|astrono/i.test(text)) return 'park after dark (nature)';

  return false;
}

// ─── TIER 3: BORDERLINE patterns (review needed) ───────────────────────────
const BORDERLINE_PATTERNS = [
  { pattern: /\bbrewery\b/i, label: 'brewery mention' },
  { pattern: /\bbeer\s*(fest|garden|tasting|crawl|pairing)/i, label: 'beer event' },
  { pattern: /\bwine\s*(tasting|pairing|night|fest)/i, label: 'wine event' },
  { pattern: /\bcocktail/i, label: 'cocktail mention' },
  { pattern: /\bhappy\s*hour/i, label: 'happy hour' },
  { pattern: /\btrivia\s*night/i, label: 'trivia night' },
  { pattern: /\bafter\s*dark/i, label: 'after dark' },
  { pattern: /\bdrinks?\s*(night|special)/i, label: 'drinks mention' },
  { pattern: /\bpub\b/i, label: 'pub mention' },
  { pattern: /\bdrag\s*(brunch|show|queen|night|bingo)/i, label: 'drag event' },
  { pattern: /\b21\+/i, label: '21+' },
  { pattern: /\b18\+/i, label: '18+' },
  { pattern: /\bdating\b/i, label: 'dating' },
  { pattern: /\bstrip\b/i, label: 'strip' },
  { pattern: /\bweed\b/i, label: 'weed' },
];

async function fetchAll(select, filters) {
  let all = [];
  let from = 0;
  while (true) {
    let q = supabase.from('events').select(select);
    if (filters) q = filters(q);
    q = q.range(from, from + 999);
    const { data, error } = await q;
    if (error) { console.error(`Error: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  CLEANUP NON-FAMILY EVENTS ${SAVE ? '(SAVING)' : '(DRY RUN)'}`);
  console.log(`${'═'.repeat(60)}\n`);

  // 1. Delete the specific junk "Spring" event
  const JUNK_IDS = ['f3b7e48d-1b12-456c-82b3-156046e05901'];

  const allEvents = await fetchAll('id, name, description, venue, scraper_name, event_date, url, age_range');
  console.log(`Total events scanned: ${allEvents.length}\n`);

  const autoDelete = [];
  const borderline = [];
  const kept = [];

  for (const e of allEvents) {
    const text = `${e.name || ''} ${e.description || ''}`;

    // Check if it's a known junk event
    if (JUNK_IDS.includes(e.id)) {
      autoDelete.push({ ...e, reason: 'junk/malformed event' });
      continue;
    }

    // Check auto-delete patterns
    let deleteMatch = null;
    for (const { pattern, label } of AUTO_DELETE_PATTERNS) {
      if (pattern.test(text)) {
        deleteMatch = label;
        break;
      }
    }

    if (deleteMatch) {
      // Check false positive overrides
      const fpReason = isFalsePositive(e.name, e.description, e.venue);
      if (fpReason) {
        kept.push({ ...e, reason: `FALSE POSITIVE: ${fpReason} (would have matched: ${deleteMatch})` });
      } else {
        autoDelete.push({ ...e, reason: deleteMatch });
      }
      continue;
    }

    // Check borderline patterns
    let borderlineMatch = null;
    for (const { pattern, label } of BORDERLINE_PATTERNS) {
      if (pattern.test(text)) {
        borderlineMatch = label;
        break;
      }
    }

    if (borderlineMatch) {
      const fpReason = isFalsePositive(e.name, e.description, e.venue);
      if (fpReason) {
        kept.push({ ...e, reason: `FALSE POSITIVE: ${fpReason}` });
      } else {
        borderline.push({ ...e, matchReason: borderlineMatch });
      }
    }
  }

  // ─── Report ───
  console.log(`AUTO-DELETE (clearly non-family): ${autoDelete.length}`);
  for (const e of autoDelete) {
    console.log(`  ❌ [${e.scraper_name}] "${(e.name || '').substring(0, 60)}" → ${e.reason}`);
  }

  console.log(`\nKEPT (false positives correctly identified): ${kept.length}`);
  for (const e of kept.slice(0, 10)) {
    console.log(`  ✅ "${(e.name || '').substring(0, 55)}" → ${e.reason}`);
  }
  if (kept.length > 10) console.log(`  ... and ${kept.length - 10} more`);

  console.log(`\nBORDERLINE (needs your review): ${borderline.length}`);
  for (const e of borderline.slice(0, 10)) {
    console.log(`  ⚠️ [${e.scraper_name}] "${(e.name || '').substring(0, 55)}" → ${e.matchReason}`);
  }
  if (borderline.length > 10) console.log(`  ... and ${borderline.length - 10} more`);

  // ─── Save borderline to CSV for review ───
  if (borderline.length > 0) {
    const csvRows = ['id,name,venue,date,scraper,match_reason,url'];
    for (const e of borderline) {
      const esc = (s) => `"${(s || '').replace(/"/g, '""').replace(/\n/g, ' ').substring(0, 200)}"`;
      csvRows.push([esc(e.id), esc(e.name), esc(e.venue), esc(e.event_date), esc(e.scraper_name), esc(e.matchReason), esc(e.url)].join(','));
    }
    fs.writeFileSync('borderline-events-review.csv', csvRows.join('\n'));
    console.log(`\n📄 Borderline events saved to borderline-events-review.csv for your review`);
  }

  // ─── Execute deletes ───
  if (SAVE && autoDelete.length > 0) {
    console.log(`\n🗑️ Deleting ${autoDelete.length} non-family events...`);
    const ids = autoDelete.map(e => e.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (error) {
        console.error(`  Error: ${error.message}`);
      } else {
        deleted += batch.length;
      }
    }
    console.log(`✅ Deleted ${deleted} events`);
  } else if (!SAVE && autoDelete.length > 0) {
    console.log(`\n⚠️ Dry run — add --save to delete the ${autoDelete.length} non-family events`);
  }

  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
