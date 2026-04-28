#!/usr/bin/env node

/**
 * FIX: Report newsletter/promo events
 *
 * Reports events matching newsletter/mailing list promotional patterns:
 * - "You're Invited 📲 Join our e-newsletter"
 * - "Sign up for our newsletter"
 * - "Subscribe to our newsletter"
 * - "Join our email list"
 *
 * These are promotional content, not real events.
 *
 * Usage:
 *   node fix-report-newsletter-events.js          # Dry run
 *   node fix-report-newsletter-events.js --save   # Actually report them
 */

const { supabase } = require('../../scrapers/helpers/supabase-adapter');
const save = process.argv.includes('--save');

async function main() {
  console.log(`\n${save ? '💾 SAVE MODE' : '🔍 DRY RUN'}\n`);

  // Query for newsletter/promo events that aren't already reported
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, city, state')
    .eq('reported', false)
    .or(
      'name.ilike.%join our e-newsletter%,' +
      'name.ilike.%join our newsletter%,' +
      'name.ilike.%sign up for%newsletter%,' +
      'name.ilike.%subscribe to%newsletter%,' +
      'name.ilike.%join our email list%,' +
      'name.ilike.%join our mailing list%,' +
      'name.ilike.%you\'re invited%newsletter%'
    );

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${events.length} newsletter/promo events to report:\n`);

  for (const event of events) {
    console.log(`  📧 "${event.name}" — ${event.city || '?'}, ${event.state || '?'}`);
  }

  if (events.length === 0) {
    console.log('  No matching events found. All clean!');
    process.exit(0);
  }

  if (save) {
    const ids = events.map(e => e.id);
    const { error: updateError } = await supabase
      .from('events')
      .update({ reported: true })
      .in('id', ids);

    if (updateError) {
      console.error('\nUpdate error:', updateError.message);
      process.exit(1);
    }

    console.log(`\n✅ Reported ${events.length} newsletter/promo events`);
  } else {
    console.log(`\nRun with --save to report these ${events.length} events`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
