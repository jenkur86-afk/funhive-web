#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ==========================================
// ALL MACARONI KID STATE SCRAPERS
// ==========================================

const MACARONI_STATES = {
  'AL': { scraper: 'scraper-macaroni-al', function: 'scrapeMacaroniKidAlabama', sites: 7 },
  'AK': { scraper: 'scraper-macaroni-ak', function: 'scrapeMacaroniKidAlaska', sites: 2 },
  'AZ': { scraper: 'scraper-macaroni-az', function: 'scrapeMacaroniKidArizona', sites: 7 },
  'AR': { scraper: 'scraper-macaroni-ar', function: 'scrapeMacaroniKidArkansas', sites: 3 },
  'CA': { scraper: 'scraper-macaroni-ca', function: 'scrapeMacaroniKidCalifornia', sites: 45 },
  'CO': { scraper: 'scraper-macaroni-co', function: 'scrapeMacaroniKidColorado', sites: 11 },
  'CT': { scraper: 'scraper-macaroni-ct', function: 'scrapeMacaroniKidConnecticut', sites: 8 },
  'DE': { scraper: 'scraper-macaroni-de', function: 'scrapeMacaroniKidDelaware', sites: 2 },
  'FL': { scraper: 'scraper-macaroni-fl', function: 'scrapeMacaroniKidFlorida', sites: 31 },
  'GA': { scraper: 'scraper-macaroni-ga', function: 'scrapeMacaroniKidGeorgia', sites: 17 },
  'HI': { scraper: 'scraper-macaroni-hi', function: 'scrapeMacaroniKidHawaii', sites: 2 },
  'ID': { scraper: 'scraper-macaroni-id', function: 'scrapeMacaroniKidIdaho', sites: 3 },
  'IL': { scraper: 'scraper-macaroni-il', function: 'scrapeMacaroniKidIllinois', sites: 19 },
  'IN': { scraper: 'scraper-macaroni-in', function: 'scrapeMacaroniKidIndiana', sites: 8 },
  'IA': { scraper: 'scraper-macaroni-ia', function: 'scrapeMacaroniKidIowa', sites: 3 },
  'KS': { scraper: 'scraper-macaroni-ks', function: 'scrapeMacaroniKidKansas', sites: 4 },
  'KY': { scraper: 'scraper-macaroni-ky', function: 'scrapeMacaroniKidKentucky', sites: 4 },
  'LA': { scraper: 'scraper-macaroni-la', function: 'scrapeMacaroniKidLouisiana', sites: 5 },
  'ME': { scraper: 'scraper-macaroni-me', function: 'scrapeMacaroniKidMaine', sites: 1 },
  'MD': { scraper: 'scraper-macaroni-md', function: 'scrapeMacaroniKidMaryland', sites: 8 },
  'MA': { scraper: 'scraper-macaroni-ma', function: 'scrapeMacaroniKidMassachusetts', sites: 10 },
  'MI': { scraper: 'scraper-macaroni-mi', function: 'scrapeMacaroniKidMichigan', sites: 12 },
  'MN': { scraper: 'scraper-macaroni-mn', function: 'scrapeMacaroniKidMinnesota', sites: 5 },
  'MO': { scraper: 'scraper-macaroni-mo', function: 'scrapeMacaroniKidMissouri', sites: 6 },
  'NE': { scraper: 'scraper-macaroni-ne', function: 'scrapeMacaroniKidNebraska', sites: 2 },
  'NH': { scraper: 'scraper-macaroni-nh', function: 'scrapeMacaroniKidNewHampshire', sites: 3 },
  'NJ': { scraper: 'scraper-macaroni-nj', function: 'scrapeMacaroniKidNewJersey', sites: 17 },
  'NM': { scraper: 'scraper-macaroni-nm', function: 'scrapeMacaroniKidNewMexico', sites: 2 },
  'NY': { scraper: 'scraper-macaroni-ny', function: 'scrapeMacaroniKidNewYork', sites: 24 },
  'NC': { scraper: 'scraper-macaroni-nc', function: 'scrapeMacaroniKidNorthCarolina', sites: 14 },
  'OH': { scraper: 'scraper-macaroni-oh', function: 'scrapeMacaroniKidOhio', sites: 15 },
  'OR': { scraper: 'scraper-macaroni-or', function: 'scrapeMacaroniKidOregon', sites: 6 },
  'PA': { scraper: 'scraper-macaroni-pa', function: 'scrapeMacaroniKidPennsylvania', sites: 34 },
  'RI': { scraper: 'scraper-macaroni-ri', function: 'scrapeMacaroniKidRhodeIsland', sites: 2 },
  'SC': { scraper: 'scraper-macaroni-sc', function: 'scrapeMacaroniKidSouthCarolina', sites: 8 },
  'SD': { scraper: 'scraper-macaroni-sd', function: 'scrapeMacaroniKidSouthDakota', sites: 1 },
  'TN': { scraper: 'scraper-macaroni-tn', function: 'scrapeMacaroniKidTennessee', sites: 8 },
  'TX': { scraper: 'scraper-macaroni-tx', function: 'scrapeMacaroniKidTexas', sites: 31 },
  'VA': { scraper: 'scraper-macaroni-va', function: 'scrapeMacaroniKidVirginia', sites: 12 },
  'WA': { scraper: 'scraper-macaroni-wa', function: 'scrapeMacaroniKidWashington', sites: 9 },
  'WI': { scraper: 'scraper-macaroni-wi', function: 'scrapeMacaroniKidWisconsin', sites: 6 },
  'WV': { scraper: 'scraper-macaroni-wv', function: 'scrapeMacaroniKidWestVirginia', sites: 1 },
  'DC': { scraper: 'scraper-macaroni-dc', function: 'scrapeMacaroniKidDC', sites: 1 }
};

const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MO': 'Missouri',
  'NE': 'Nebraska', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'OH': 'Ohio', 'OR': 'Oregon',
  'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota',
  'TN': 'Tennessee', 'TX': 'Texas', 'VA': 'Virginia', 'WA': 'Washington',
  'WI': 'Wisconsin', 'WV': 'West Virginia', 'DC': 'District of Columbia'
};

// ==========================================
// SCRAPER FUNCTIONS
// ==========================================

async function runStateScraper(stateCode, stateInfo) {
  const stateName = STATE_NAMES[stateCode];
  const startTime = Date.now();

  console.log(`\n🏛️  ===== ${stateName.toUpperCase()} (${stateCode}) =====`);
  console.log(`   ${stateInfo.sites} Macaroni Kid sites`);

  try {
    // Load the scraper dynamically
    const scraperPath = path.join(__dirname, '..', 'functions', 'scrapers', stateInfo.scraper);
    const scraper = require(scraperPath);

    if (!scraper[stateInfo.function]) {
      throw new Error(`Function ${stateInfo.function} not found in ${stateInfo.scraper}`);
    }

    console.log(`   ⏳ Running scraper...`);

    // Run the scraper function
    const result = await scraper[stateInfo.function]();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // State scrapers return { imported, failed } not an array
    const imported = result.imported || 0;
    const failed = result.failed || 0;
    const total = imported + failed;

    console.log(`   ✅ Complete in ${duration}s`);
    console.log(`   📊 Events imported: ${imported} | Failed: ${failed}`);

    // Note: Individual state scrapers already log to Firebase via ScraperLogger.finish()
    // No duplicate logging needed here

    return {
      stateCode,
      stateName,
      success: true,
      events: imported,
      failed: failed,
      duration: parseFloat(duration)
    };

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   ⏱️  Failed after ${duration}s`);

    // Note: ScraperLogger handles error logging via trackError() and finish()
    // Only log here if scraper crashed before logger could finish
    try {
      await db.collection('scraperLogs').add({
        scraperName: `Macaroni Kid ${stateName}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        success: false,
        errors: 1,
        error: error.message,
        executionTime: parseFloat(duration),
        source: 'local-mac-error'
      });
    } catch (logError) {
      console.log(`   ⚠️  Failed to log error: ${logError.message}`);
    }

    return {
      stateCode,
      stateName,
      success: false,
      error: error.message,
      duration: parseFloat(duration)
    };
  }
}

// ==========================================
// CHECKPOINT SAVE
// ==========================================

function saveCheckpoint(results, stateCode) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, `checkpoint-macaroni-${stateCode}-${timestamp}.json`);

  try {
    const allEvents = results
      .filter(r => r.success && r.eventData)
      .flatMap(r => r.eventData);

    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      statesCompleted: results.length,
      totalEvents: allEvents.length,
      results: results.map(r => ({
        stateCode: r.stateCode,
        stateName: r.stateName,
        success: r.success,
        events: r.events,
        duration: r.duration,
        error: r.error || null
      })),
      events: allEvents
    }, null, 2));

    console.log(`   💾 Checkpoint: ${path.basename(filename)}`);
    return filename;
  } catch (error) {
    console.error(`   ⚠️  Checkpoint failed: ${error.message}`);
    return null;
  }
}

// ==========================================
// MAIN SCRAPER
// ==========================================

async function scrapeMacaroniKidUSA(statesToScrape = null) {
  const allResults = [];

  const states = statesToScrape || Object.keys(MACARONI_STATES);
  const totalSites = states.reduce((sum, code) => sum + MACARONI_STATES[code].sites, 0);

  console.log('🍝 Starting USA Macaroni Kid Scraper (Local)...\n');
  console.log(`📍 States: ${states.length}`);
  console.log(`🌐 Total Macaroni Kid sites: ${totalSites}`);
  console.log(`⏱️  Estimated time: ${Math.ceil(states.length * 2)} - ${Math.ceil(states.length * 4)} minutes\n`);

  let statesCompleted = 0;
  let totalEvents = 0;
  let successfulStates = 0;
  let failedStates = 0;

  for (const stateCode of states) {
    const stateInfo = MACARONI_STATES[stateCode];

    const result = await runStateScraper(stateCode, stateInfo);
    allResults.push(result);

    if (result.success) {
      successfulStates++;
      totalEvents += result.events;
    } else {
      failedStates++;
    }

    statesCompleted++;

    // Save checkpoint every 5 states
    if (statesCompleted % 5 === 0) {
      console.log(`\n📊 Progress: ${statesCompleted}/${states.length} states`);
      console.log(`✅ Successful: ${successfulStates} | ❌ Failed: ${failedStates}`);
      console.log(`📊 Total events: ${totalEvents}`);
      saveCheckpoint(allResults, stateCode);
    }

    // Rate limiting - wait 3 seconds between states
    if (statesCompleted < states.length) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log(`\n\n✅ SCRAPING COMPLETE!`);
  console.log(`📊 States processed: ${statesCompleted}/${states.length}`);
  console.log(`✅ Successful: ${successfulStates}`);
  console.log(`❌ Failed: ${failedStates}`);
  console.log(`📊 Total events: ${totalEvents}`);

  return allResults;
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  USA MACARONI KID SCRAPER - LOCAL EXECUTION');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Parse command line args
    const args = process.argv.slice(2);
    let statesToScrape = null;

    if (args.length > 0 && args[0] === '--states') {
      statesToScrape = args[1].split(',').map(s => s.trim().toUpperCase());
      console.log(`🎯 Scraping: ${statesToScrape.join(', ')}\n`);
    }

    const results = await scrapeMacaroniKidUSA(statesToScrape);

    // Save final results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(__dirname, `macaroni-usa-${timestamp}.json`);

    const allEvents = results
      .filter(r => r.success && r.eventData)
      .flatMap(r => r.eventData);

    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalStates: results.length,
      successfulStates: results.filter(r => r.success).length,
      failedStates: results.filter(r => !r.success).length,
      totalEvents: allEvents.length,
      results: results.map(r => ({
        stateCode: r.stateCode,
        stateName: r.stateName,
        success: r.success,
        events: r.events,
        duration: r.duration,
        error: r.error || null
      })),
      events: allEvents
    }, null, 2));

    console.log(`\n📁 Final results: ${path.basename(filename)}`);

    // Show failed states if any
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log(`\n⚠️  Failed States:`);
      failed.forEach(r => {
        console.log(`   ❌ ${r.stateName} (${r.stateCode}): ${r.error}`);
      });
    }

    // Show top states by events
    const topStates = results
      .filter(r => r.success && r.events > 0)
      .sort((a, b) => b.events - a.events)
      .slice(0, 10);

    if (topStates.length > 0) {
      console.log(`\n🏆 Top States by Events:`);
      topStates.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.stateName}: ${r.events} events`);
      });
    }

    console.log('\n✅ Done! Events are already in Firebase (imported by individual scrapers)');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  scrapeMacaroniKidUSA
};
