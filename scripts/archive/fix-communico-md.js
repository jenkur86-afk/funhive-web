#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
console.log('FunHive — Fix Communico-MD (add missing libraries + switch to multi-state scraper)\n');
let changes = 0;

// =============================================================================
// FIX 1: Add Anne Arundel, Howard County, Frederick County to multi-state scraper
// These 3 libraries are only in the broken dedicated MD scraper.
// The multi-state scraper already has Baltimore County, Montgomery County,
// Harford County, Calvert, Charles County, and St. Mary's County.
// =============================================================================
const multiFile = path.join(ROOT, 'scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js');
if (fs.existsSync(multiFile)) {
  let multi = fs.readFileSync(multiFile, 'utf8');

  // Add 3 libraries after St. Mary's County (last MD entry), before Nevada
  const insertAfter = `  {
    name: "St. Mary's County Library",
    url: 'https://stmalib.libnet.info/events',
    county: "St. Mary's",
    state: 'MD',
    website: 'https://www.stmalib.org',
    city: 'Leonardtown',
    zipCode: '20650'
  },

  // NEVADA`;

  const insertNew = `  {
    name: "St. Mary's County Library",
    url: 'https://stmalib.libnet.info/events',
    county: "St. Mary's",
    state: 'MD',
    website: 'https://www.stmalib.org',
    city: 'Leonardtown',
    zipCode: '20650'
  },
  {
    name: 'Anne Arundel County Public Library',
    url: 'https://www.aacpl.net/events',
    county: 'Anne Arundel',
    state: 'MD',
    website: 'https://www.aacpl.net',
    city: 'Annapolis',
    zipCode: '21401'
  },
  {
    name: 'Howard County Library System',
    url: 'https://hclibrary.org/events',
    county: 'Howard',
    state: 'MD',
    website: 'https://www.hclibrary.org',
    city: 'Columbia',
    zipCode: '21044'
  },
  {
    name: 'Frederick County Public Libraries',
    url: 'https://www.fcpl.org/events',
    county: 'Frederick',
    state: 'MD',
    website: 'https://www.fcpl.org',
    city: 'Frederick',
    zipCode: '21701'
  },

  // NEVADA`;

  if (multi.includes(insertAfter)) {
    // Also check we haven't already added them
    if (multi.includes('Anne Arundel County Public Library')) {
      console.log('⚠️  Multi-state scraper — Anne Arundel already present');
    } else {
      multi = multi.replace(insertAfter, insertNew);

      // Update the comment count
      multi = multi.replace('// MARYLAND (6 libraries)', '// MARYLAND (9 libraries)');
      multi = multi.replace('MD (6 libraries - 2.2M people):', 'MD (9 libraries - 3.5M people):');

      fs.writeFileSync(multiFile, multi);
      console.log('✅ Multi-state scraper — added Anne Arundel, Howard County, Frederick County');
      changes++;
    }
  } else {
    console.log('⚠️  Multi-state scraper — insertion pattern not found');
    // Debug: show what's actually around the St. Mary's entry
    const stMarys = multi.indexOf("St. Mary's County Library");
    if (stMarys > -1) {
      console.log('   Found St. Mary\'s at position', stMarys);
      console.log('   Context:', JSON.stringify(multi.substring(stMarys - 10, stMarys + 200)));
    }
  }
} else {
  console.log('⚠️  Multi-state scraper file not found');
}

// =============================================================================
// FIX 2: Switch registry from broken dedicated scraper to multi-state scraper
// =============================================================================
const regFile = path.join(ROOT, 'scrapers/scraper-registry.js');
if (fs.existsSync(regFile)) {
  let reg = fs.readFileSync(regFile, 'utf8');

  const regOld = `  'Communico-MD': {
    file: './scraper-communico-libraries-md.js',
    exportName: 'scrapeCommunicoEvents',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },`;

  const regNew = `  'Communico-MD': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoMD',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },`;

  if (reg.includes(regOld)) {
    reg = reg.replace(regOld, regNew);
    fs.writeFileSync(regFile, reg);
    console.log('✅ Registry — Communico-MD now points to multi-state scraper');
    changes++;
  } else if (reg.includes("'Communico-MD'") && reg.includes('scrapeCommunicoMD')) {
    console.log('⚠️  Registry — already pointing to multi-state scraper');
  } else {
    console.log('⚠️  Registry — pattern not found');
    // Debug
    const idx = reg.indexOf("'Communico-MD'");
    if (idx > -1) {
      console.log('   Found Communico-MD at position', idx);
      console.log('   Context:', JSON.stringify(reg.substring(idx, idx + 200)));
    }
  }
} else {
  console.log('⚠️  Registry file not found');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`\nDone! ${changes} fix(es) applied.`);
if (changes > 0) {
  console.log('\nFiles modified:');
  console.log('  scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js');
  console.log('  scrapers/scraper-registry.js');
  console.log('\nCommit with:');
  console.log('  git add scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js scrapers/scraper-registry.js');
  console.log('  git commit -m "Fix Communico-MD: add 3 missing libraries, switch to multi-state scraper"');
  console.log('  git push origin main');
}
