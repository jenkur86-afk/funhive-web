#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

console.log('FunHive Scraper Issue Fixer\n');
let changes = 0;

// =============================================================================
// FIX 1: RollyPollies-MD — remove scheduleDescription field & query
// The events table has no schedule_description column. The flattenEvent()
// function reads scheduleDescription for time extraction, so we keep it in the
// doc but remove it from the .where() duplicate-check query (which tries to
// query a non-existent column).
// =============================================================================
const rpFile = path.join(ROOT, 'scrapers/scraper-rolly-pollies-MD.js');
if (fs.existsSync(rpFile)) {
  let rp = fs.readFileSync(rpFile, 'utf8');
  let rpChanged = false;

  // Remove the .where('scheduleDescription', ...) line from duplicate check
  const rpOld = `.where('scheduleDescription', '==', eventDoc.scheduleDescription)\n          .where('metadata.sourceName', '==', VENUE.fullName)`;
  const rpNew = `.where('metadata.sourceName', '==', VENUE.fullName)`;

  if (rp.includes(rpOld)) {
    rp = rp.replace(rpOld, rpNew);
    rpChanged = true;
  }

  if (rpChanged) {
    fs.writeFileSync(rpFile, rp);
    console.log('✅ RollyPollies-MD — removed scheduleDescription from duplicate query');
    changes++;
  } else {
    console.log('⚠️  RollyPollies-MD — pattern not found (may already be patched)');
  }
} else {
  console.log('⚠️  RollyPollies-MD — file not found');
}

// =============================================================================
// FIX 2: supabase-adapter.js — Fix UUID generation for scraper logs
// The saveScraperLog() function doesn't set an id, and the Firestore wrapper's
// .add() generates base64url IDs that aren't valid UUIDs.
// Fix: Use crypto.randomUUID() in saveScraperLog.
// =============================================================================
const adapterFile = path.join(ROOT, 'scrapers/helpers/supabase-adapter.js');
if (fs.existsSync(adapterFile)) {
  let adapter = fs.readFileSync(adapterFile, 'utf8');
  let adapterChanged = false;

  // Fix 2a: Add id to saveScraperLog insert
  const logOld = `  const { error } = await supabase.from('scraper_logs').insert({
    scraper_name: logData.scraperName,`;
  const logNew = `  const { error } = await supabase.from('scraper_logs').insert({
    id: crypto.randomUUID(),
    scraper_name: logData.scraperName,`;

  if (adapter.includes(logOld)) {
    adapter = adapter.replace(logOld, logNew);
    adapterChanged = true;
    console.log('✅ supabase-adapter — saveScraperLog now generates proper UUID');
    changes++;
  } else {
    console.log('⚠️  supabase-adapter saveScraperLog — pattern not found');
  }

  // Fix 2b: Also fix the Firestore wrapper .add() to use UUID instead of base64url
  const addOld = `const id = data.id || crypto.randomBytes(15).toString('base64url');`;
  const addNew = `const id = data.id || crypto.randomUUID();`;

  if (adapter.includes(addOld)) {
    adapter = adapter.replace(addOld, addNew);
    adapterChanged = true;
    console.log('✅ supabase-adapter — Firestore .add() now generates proper UUIDs');
    changes++;
  } else {
    console.log('⚠️  supabase-adapter .add() — pattern not found');
  }

  // Fix 2c: Add 'cost' -> 'price_range' to mapFieldName so .update() works
  const fieldMapOld = `'priceRange': 'price_range',`;
  const fieldMapNew = `'priceRange': 'price_range',
    'cost': 'price_range',`;

  if (adapter.includes(fieldMapOld) && !adapter.includes("'cost': 'price_range'")) {
    adapter = adapter.replace(fieldMapOld, fieldMapNew);
    adapterChanged = true;
    console.log('✅ supabase-adapter — added cost → price_range field mapping');
    changes++;
  } else if (adapter.includes("'cost': 'price_range'")) {
    console.log('⚠️  supabase-adapter cost mapping — already present');
  } else {
    console.log('⚠️  supabase-adapter cost mapping — pattern not found');
  }

  if (adapterChanged) {
    fs.writeFileSync(adapterFile, adapter);
  }
} else {
  console.log('⚠️  supabase-adapter.js — file not found');
}

// =============================================================================
// FIX 3: LibraryMarket-MD — when date is time-only, use today's date as fallback
// Events with dates like "10:00am–11:00am" get stripped to empty string.
// Fix: detect time-only pattern and prepend today's date.
// =============================================================================
const lmFile = path.join(ROOT, 'scrapers/scraper-librarymarket-libraries-md.js');
if (fs.existsSync(lmFile)) {
  let lm = fs.readFileSync(lmFile, 'utf8');
  let lmChanged = false;

  // Replace the skip logic with a fallback that uses the event page date or today
  const lmOld = `        const normalizedDate = normalizeDateString(event.date);
        if (!normalizedDate && event.date) {
          console.log(\`   ⚠️ Skipping event with invalid date: "\${event.date}"\`);
          continue;
        }`;

  const lmNew = `        let normalizedDate = normalizeDateString(event.date);
        // If date is time-only (e.g. "10:00am–11:00am"), it normalizes to empty.
        // Use today's date as fallback so we don't lose the event.
        if (!normalizedDate && event.date) {
          const timeOnly = /^\\s*\\d{1,2}:\\d{2}\\s*[ap]m/i.test(event.date.trim());
          if (timeOnly) {
            const today = new Date().toISOString().split('T')[0];
            normalizedDate = today;
            console.log(\`   ℹ️ Date "\${event.date}" is time-only — using today (\${today})\`);
          } else {
            console.log(\`   ⚠️ Skipping event with invalid date: "\${event.date}"\`);
            continue;
          }
        }`;

  if (lm.includes(lmOld)) {
    lm = lm.replace(lmOld, lmNew);
    fs.writeFileSync(lmFile, lm);
    lmChanged = true;
    console.log('✅ LibraryMarket-MD — time-only dates now fallback to today');
    changes++;
  } else {
    console.log('⚠️  LibraryMarket-MD — pattern not found (may already be patched)');
  }
} else {
  console.log('⚠️  LibraryMarket-MD — file not found');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`\nDone! ${changes} fix(es) applied.`);
if (changes > 0) {
  console.log('\nFiles modified:');
  console.log('  scrapers/scraper-rolly-pollies-MD.js');
  console.log('  scrapers/helpers/supabase-adapter.js');
  console.log('  scrapers/scraper-librarymarket-libraries-md.js');
  console.log('\nCommit with:');
  console.log('  cd ~/Desktop/funhive-web');
  console.log('  git add scrapers/scraper-rolly-pollies-MD.js scrapers/helpers/supabase-adapter.js scrapers/scraper-librarymarket-libraries-md.js');
  console.log('  git commit -m "Fix scraper issues: RollyPollies query, UUID generation, cost mapping, date parsing"');
  console.log('  git push origin main');
}
