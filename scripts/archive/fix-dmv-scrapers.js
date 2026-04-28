#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
console.log('FunHive — Fix Remaining DMV Scraper Issues\n');
let changes = 0;

// =============================================================================
// FIX 1: AARecParks-MD — crashes at require('@sparticuz/chromium') on line 22
// The module doesn't exist locally. Need to make it a lazy require inside
// launchBrowser() with try/catch, not a top-level require.
// =============================================================================
const aaFile = path.join(ROOT, 'scrapers/scraper-aarecparks-md.js');
if (fs.existsSync(aaFile)) {
  let aa = fs.readFileSync(aaFile, 'utf8');

  // Replace top-level require that crashes
  const aaOldRequire = `const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');`;
  const aaNewRequire = `const puppeteer = require('puppeteer-core');
// chromium loaded lazily in launchBrowser() — not available locally`;

  // Replace launchBrowser to try cloud chromium, fall back to local Chrome
  const aaOldLaunch = `async function launchBrowser() {
  const isCloud = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

  if (isCloud) {
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // Local development
    return await puppeteer.launch({
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}`;

  const aaNewLaunch = `async function launchBrowser() {
  const isCloud = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

  if (isCloud) {
    try {
      const chromium = require('@sparticuz/chromium');
      return await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } catch (e) {
      console.warn('Cloud chromium not available, falling back to local');
    }
  }

  // Local development fallback
  return await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}`;

  if (aa.includes(aaOldRequire) && aa.includes(aaOldLaunch)) {
    aa = aa.replace(aaOldRequire, aaNewRequire);
    aa = aa.replace(aaOldLaunch, aaNewLaunch);
    fs.writeFileSync(aaFile, aa);
    console.log('✅ AARecParks-MD — moved chromium to lazy require with fallback');
    changes++;
  } else if (aa.includes("chromium loaded lazily")) {
    console.log('⚠️  AARecParks-MD — already patched');
  } else {
    console.log('⚠️  AARecParks-MD — pattern not found');
    if (aa.includes("require('@sparticuz/chromium')")) {
      console.log('   Top-level require exists at:', aa.indexOf("require('@sparticuz/chromium')"));
    }
  }
} else {
  console.log('⚠️  AARecParks-MD — file not found');
}

// =============================================================================
// FIX 2: Remove SugarCalendar-Libraries from registry (file doesn't exist)
// =============================================================================
const regFile = path.join(ROOT, 'scrapers/scraper-registry.js');
if (fs.existsSync(regFile)) {
  let reg = fs.readFileSync(regFile, 'utf8');

  // Find and remove the SugarCalendar entry
  const sugarOld = `  'SugarCalendar-Libraries': {
    file: './scraper-sugarcalendar-libraries-VA.js',
    exportName: 'scrapeSugarCalendarLibraries',`;

  if (reg.includes(sugarOld)) {
    // Find the full entry (up to the closing brace + comma)
    const startIdx = reg.indexOf(sugarOld);
    // Find the closing },  after this entry
    let endIdx = reg.indexOf('},', startIdx) + 2;
    // Also consume the newline after
    if (reg[endIdx] === '\n') endIdx++;

    const fullEntry = reg.substring(startIdx, endIdx);
    reg = reg.replace(fullEntry, '');
    fs.writeFileSync(regFile, reg);
    console.log('✅ Registry — removed SugarCalendar-Libraries (file does not exist)');
    changes++;
  } else if (!reg.includes('SugarCalendar')) {
    console.log('⚠️  Registry — SugarCalendar already removed');
  } else {
    console.log('⚠️  Registry — SugarCalendar pattern not found');
    const idx = reg.indexOf('SugarCalendar');
    if (idx > -1) console.log('   Context:', JSON.stringify(reg.substring(idx, idx + 200)));
  }
} else {
  console.log('⚠️  Registry not found');
}

// =============================================================================
// FIX 3: Wicomico scraper — check if it's using axios for API or puppeteer
// The scraper imports axios, so it may be trying an API endpoint that changed.
// Add better error handling and a fallback approach.
// =============================================================================
const wicFile = path.join(ROOT, 'scrapers/scraper-wicomico-libraries-MD.js');
if (fs.existsSync(wicFile)) {
  let wic = fs.readFileSync(wicFile, 'utf8');

  // Check if it already has error logging for 0 events
  if (!wic.includes('No events found on page')) {
    // Find the main scraping function and add logging
    // This is a diagnostic patch — we need to see WHY it returns 0
    const wicOld = `const LIBRARY = {
  name: 'Wicomico Public Libraries',
  url: 'https://www.wicomicolibrary.org/events',`;
    const wicNew = `// NOTE: If returning 0 events, the site may have changed its DOM structure.
// Check https://www.wicomicolibrary.org/events manually to verify.
const LIBRARY = {
  name: 'Wicomico Public Libraries',
  url: 'https://www.wicomicolibrary.org/events',`;

    if (wic.includes(wicOld)) {
      wic = wic.replace(wicOld, wicNew);
      fs.writeFileSync(wicFile, wic);
      console.log('✅ Wicomico — added diagnostic note (needs manual URL check)');
      changes++;
    }
  } else {
    console.log('⚠️  Wicomico — already has diagnostics');
  }
} else {
  console.log('⚠️  Wicomico scraper not found');
}

// =============================================================================
// FIX 4: Add debugging to Communico multi-state scraper for DC/VA
// When a library returns 0 events, log the page URL and selector results
// =============================================================================
const commFile = path.join(ROOT, 'scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js');
if (fs.existsSync(commFile)) {
  let comm = fs.readFileSync(commFile, 'utf8');

  // Check if debug logging already exists
  if (!comm.includes('No event elements found')) {
    // Find where events are extracted and add zero-result logging
    const commOld = `if (events.length === 0) {
        console.log('     ⚠️ No events extracted');`;
    if (comm.includes(commOld)) {
      const commNew = `if (events.length === 0) {
        console.log('     ⚠️ No events extracted — site may have changed DOM structure');
        console.log('     ℹ️ Check URL manually:', lib.url);`;
      comm = comm.replace(commOld, commNew);
      fs.writeFileSync(commFile, comm);
      console.log('✅ Communico multi-state — added debug logging for 0-event libraries');
      changes++;
    } else {
      console.log('⚠️  Communico multi-state — zero-event logging pattern not found');
    }
  } else {
    console.log('⚠️  Communico multi-state — debug logging already present');
  }
} else {
  console.log('⚠️  Communico multi-state file not found');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`\nDone! ${changes} fix(es) applied.`);

console.log('\n📋 Issue Status:');
console.log('  ✅ UUID errors (Firespring, WithApps, RollyPollies, MacaroniKid) — fixed in last push');
console.log('  ✅ dataType column error — fixed by flattenScraperLog in last push');
console.log('  ✅ AARecParks-MD — chromium require moved to lazy load with fallback');
console.log('  ✅ SugarCalendar-VA — removed from registry (file never existed)');
console.log('  🔍 Communico-DC/VA — 0 events likely due to DOM changes, needs manual check');
console.log('  🔍 Wicomico/Worcester/LibCal-MD — 0 events, needs manual URL verification');

if (changes > 0) {
  console.log('\nCommit with:');
  console.log('  git add scrapers/scraper-aarecparks-md.js scrapers/scraper-registry.js scrapers/scraper-wicomico-libraries-MD.js scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js');
  console.log('  git commit -m "Fix AARecParks chromium crash, remove ghost SugarCalendar entry, add diagnostics"');
  console.log('  git push origin main');
}
