#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const SCRAPERS_DIR = __dirname;
console.log('FunHive - Add WordPress + DMV Activity Scrapers to Registry\n');

let reg = fs.readFileSync(path.join(SCRAPERS_DIR, 'scraper-registry.js'), 'utf-8');

// WordPress per-state scrapers to add
const wpScrapers = {
  'WordPress-MD': { file: './scraper-wordpress-libraries-md.js', exportName: 'scrapeWordpressMDCloudFunction', type: 'puppeteer', group: 2, state: 'MD' },
  'WordPress-VA': { file: './scraper-wordpress-libraries-va.js', exportName: 'scrapeWordpressVACloudFunction', type: 'puppeteer', group: 1, state: 'VA' },
  'WordPress-PA': { file: './scraper-wordpress-libraries-pa.js', exportName: 'scrapeWordpressPACloudFunction', type: 'puppeteer', group: 3, state: 'PA' },
  'WordPress-NY': { file: './scraper-wordpress-libraries-ny.js', exportName: 'scrapeWordpressNYCloudFunction', type: 'puppeteer', group: 2, state: 'NY' },
  'WordPress-CA': { file: './scraper-wordpress-libraries-ca.js', exportName: 'scrapeWordpressCACloudFunction', type: 'puppeteer', group: 1, state: 'CA' },
  'WordPress-TX': { file: './scraper-wordpress-libraries-tx.js', exportName: 'scrapeWordpressTXCloudFunction', type: 'puppeteer', group: 3, state: 'TX' },
  'WordPress-FL': { file: './scraper-wordpress-libraries-fl.js', exportName: 'scrapeWordpressFLCloudFunction', type: 'puppeteer', group: 2, state: 'FL' },
  'WordPress-GA': { file: './scraper-wordpress-libraries-ga.js', exportName: 'scrapeWordpressGACloudFunction', type: 'puppeteer', group: 1, state: 'GA' },
  'WordPress-OH': { file: './scraper-wordpress-libraries-oh.js', exportName: 'scrapeWordpressOHCloudFunction', type: 'puppeteer', group: 3, state: 'OH' },
  'WordPress-IL': { file: './scraper-wordpress-libraries-il.js', exportName: 'scrapeWordpressILCloudFunction', type: 'puppeteer', group: 2, state: 'IL' },
  'WordPress-NC': { file: './scraper-wordpress-libraries-nc.js', exportName: 'scrapeWordpressNCCloudFunction', type: 'puppeteer', group: 1, state: 'NC' },
  'WordPress-MI': { file: './scraper-wordpress-libraries-mi.js', exportName: 'scrapeWordpressMICloudFunction', type: 'puppeteer', group: 3, state: 'MI' },
  'WordPress-NJ': { file: './scraper-wordpress-libraries-nj.js', exportName: 'scrapeWordpressNJCloudFunction', type: 'puppeteer', group: 2, state: 'NJ' },
  'WordPress-CO': { file: './scraper-wordpress-libraries-co.js', exportName: 'scrapeWordpressCOCloudFunction', type: 'puppeteer', group: 1, state: 'CO' },
  'WordPress-MA': { file: './scraper-wordpress-libraries-ma.js', exportName: 'scrapeWordpressMACloudFunction', type: 'puppeteer', group: 3, state: 'MA' },
  'WordPress-WA': { file: './scraper-wordpress-libraries-wa.js', exportName: 'scrapeWordpressWACloudFunction', type: 'puppeteer', group: 2, state: 'WA' },
  'WordPress-CT': { file: './scraper-wordpress-libraries-ct.js', exportName: 'scrapeWordpressCTCloudFunction', type: 'puppeteer', group: 1, state: 'CT' },
  'WordPress-OR': { file: './scraper-wordpress-libraries-or.js', exportName: 'scrapeWordpressORCloudFunction', type: 'puppeteer', group: 3, state: 'OR' },
  'WordPress-IN': { file: './scraper-wordpress-libraries-in.js', exportName: 'scrapeWordpressINCloudFunction', type: 'puppeteer', group: 2, state: 'IN' },
  'WordPress-MO': { file: './scraper-wordpress-libraries-mo.js', exportName: 'scrapeWordpressMOCloudFunction', type: 'puppeteer', group: 1, state: 'MO' },
  'WordPress-WI': { file: './scraper-wordpress-libraries-wi.js', exportName: 'scrapeWordpressWICloudFunction', type: 'puppeteer', group: 3, state: 'WI' },
  'WordPress-MN': { file: './scraper-wordpress-libraries-mn.js', exportName: 'scrapeWordpressMNCloudFunction', type: 'puppeteer', group: 2, state: 'MN' },
  'WordPress-TN': { file: './scraper-wordpress-libraries-tn.js', exportName: 'scrapeWordpressTNCloudFunction', type: 'puppeteer', group: 1, state: 'TN' },
  'WordPress-KY': { file: './scraper-wordpress-libraries-ky.js', exportName: 'scrapeWordpressKYCloudFunction', type: 'puppeteer', group: 3, state: 'KY' },
  'WordPress-LA': { file: './scraper-wordpress-libraries-la.js', exportName: 'scrapeWordpressLACloudFunction', type: 'puppeteer', group: 2, state: 'LA' },
  'WordPress-AL': { file: './scraper-wordpress-libraries-al.js', exportName: 'scrapeWordpressALCloudFunction', type: 'puppeteer', group: 1, state: 'AL' },
  'WordPress-SC': { file: './scraper-wordpress-libraries-sc.js', exportName: 'scrapeWordpressSCCloudFunction', type: 'puppeteer', group: 3, state: 'SC' },
  'WordPress-AZ': { file: './scraper-wordpress-libraries-az.js', exportName: 'scrapeWordpressAZCloudFunction', type: 'puppeteer', group: 2, state: 'AZ' },
  'WordPress-KS': { file: './scraper-wordpress-libraries-ks.js', exportName: 'scrapeWordpressKSCloudFunction', type: 'puppeteer', group: 1, state: 'KS' },
  'WordPress-NE': { file: './scraper-wordpress-libraries-ne.js', exportName: 'scrapeWordpressNECloudFunction', type: 'puppeteer', group: 3, state: 'NE' },
  'WordPress-MS': { file: './scraper-wordpress-libraries-ms.js', exportName: 'scrapeWordpressMSCloudFunction', type: 'puppeteer', group: 2, state: 'MS' },
  'WordPress-AR': { file: './scraper-wordpress-libraries-ar.js', exportName: 'scrapeWordpressARCloudFunction', type: 'puppeteer', group: 1, state: 'AR' },
  'WordPress-UT': { file: './scraper-wordpress-libraries-ut.js', exportName: 'scrapeWordpressUTCloudFunction', type: 'puppeteer', group: 3, state: 'UT' },
  'WordPress-NV': { file: './scraper-wordpress-libraries-nv.js', exportName: 'scrapeWordpressNVCloudFunction', type: 'puppeteer', group: 2, state: 'NV' },
  'WordPress-NM': { file: './scraper-wordpress-libraries-nm.js', exportName: 'scrapeWordpressNMCloudFunction', type: 'puppeteer', group: 1, state: 'NM' },
  'WordPress-WV': { file: './scraper-wordpress-libraries-wv.js', exportName: 'scrapeWordpressWVCloudFunction', type: 'puppeteer', group: 3, state: 'WV' },
  'WordPress-ID': { file: './scraper-wordpress-libraries-id.js', exportName: 'scrapeWordpressIDCloudFunction', type: 'puppeteer', group: 2, state: 'ID' },
  'WordPress-MT': { file: './scraper-wordpress-libraries-mt.js', exportName: 'scrapeWordpressMTCloudFunction', type: 'puppeteer', group: 1, state: 'MT' },
  'WordPress-WY': { file: './scraper-wordpress-libraries-wy.js', exportName: 'scrapeWordpressWYCloudFunction', type: 'puppeteer', group: 3, state: 'WY' },
  'WordPress-ME': { file: './scraper-wordpress-libraries-me.js', exportName: 'scrapeWordpressMECloudFunction', type: 'puppeteer', group: 2, state: 'ME' },
  'WordPress-VT': { file: './scraper-wordpress-libraries-vt.js', exportName: 'scrapeWordpressVTCloudFunction', type: 'puppeteer', group: 1, state: 'VT' },
  'WordPress-SD': { file: './scraper-wordpress-libraries-sd.js', exportName: 'scrapeWordpressSDCloudFunction', type: 'puppeteer', group: 3, state: 'SD' },
  'WordPress-ND': { file: './scraper-wordpress-libraries-nd.js', exportName: 'scrapeWordpressNDCloudFunction', type: 'puppeteer', group: 2, state: 'ND' },
  'WordPress-OK': { file: './scraper-wordpress-libraries-ok.js', exportName: 'scrapeWordpressOKCloudFunction', type: 'puppeteer', group: 1, state: 'OK' },
  'WordPress-DE': { file: './scraper-wordpress-libraries-de.js', exportName: 'scrapeWordpressDECloudFunction', type: 'puppeteer', group: 3, state: 'DE' },
  'WordPress-AK': { file: './scraper-wordpress-libraries-ak.js', exportName: 'scrapeWordpressAKCloudFunction', type: 'puppeteer', group: 2, state: 'AK' },
  'WordPress-HI': { file: './scraper-wordpress-libraries-hi.js', exportName: 'scrapeWordpressHICloudFunction', type: 'puppeteer', group: 1, state: 'HI' },
  'WordPress-RI': { file: './scraper-wordpress-libraries-ri.js', exportName: 'scrapeWordpressRICloudFunction', type: 'puppeteer', group: 3, state: 'RI' },
  'ModernEventsCalendar-VA': { file: './scraper-wordpress-modern-events-calendar-libraries-VA.js', exportName: 'scrapeModernEventsCalendarLibraries', type: 'puppeteer', group: 2, state: 'VA' },
};

// DMV Activity scrapers
const activityScrapers = {
  'Activities-ArtStudios-DMV': { file: './scraper-activities-art-studios-dmv.js', exportName: 'scrapeArtStudiosDMV', type: 'puppeteer', group: 1, state: 'Multi' },
  'Activities-BowlingAlleys-DMV': { file: './scraper-activities-bowling-alleys-dmv.js', exportName: 'scrapeBowlingAlleysDMV', type: 'puppeteer', group: 2, state: 'Multi' },
  'Activities-ChildrensMuseums-DMV': { file: './scraper-activities-childrens-museums-dmv.js', exportName: 'scrapeChildrensMuseumsDMV', type: 'puppeteer', group: 3, state: 'Multi' },
  'Activities-ClimbingGyms-DMV': { file: './scraper-activities-climbing-gyms-dmv.js', exportName: 'scrapeClimbingGymsDMV', type: 'puppeteer', group: 1, state: 'Multi' },
  'Activities-FamilyEntertainment-DMV': { file: './scraper-activities-family-entertainment-dmv.js', exportName: 'scrapeFamilyEntertainmentDMV', type: 'puppeteer', group: 2, state: 'Multi' },
  'Activities-GymnasticsCenters-DMV': { file: './scraper-activities-gymnastics-centers-dmv.js', exportName: 'scrapeGymnasticsCentersDMV', type: 'puppeteer', group: 3, state: 'Multi' },
  'Activities-IceRinks-DMV': { file: './scraper-activities-ice-rinks-dmv.js', exportName: 'scrapeIceRinksDMV', type: 'puppeteer', group: 1, state: 'Multi' },
  'Activities-IndoorPlaygrounds-DMV': { file: './scraper-activities-indoor-playgrounds-dmv.js', exportName: 'scrapeIndoorPlaygroundsDMV', type: 'puppeteer', group: 2, state: 'Multi' },
  'Activities-MinigolfBatting-DMV': { file: './scraper-activities-minigolf-batting-dmv.js', exportName: 'scrapeMinigolfBattingDMV', type: 'puppeteer', group: 3, state: 'Multi' },
  'Activities-MovieTheaters-DMV': { file: './scraper-activities-movie-theaters-dmv.js', exportName: 'scrapeMovieTheatersDMV', type: 'puppeteer', group: 1, state: 'Multi' },
  'Activities-NatureFarms-DMV': { file: './scraper-activities-nature-farms-dmv.js', exportName: 'scrapeNatureFarmsDMV', type: 'puppeteer', group: 2, state: 'Multi' },
  'Activities-RollerSkating-DMV': { file: './scraper-activities-roller-skating-dmv.js', exportName: 'scrapeRollerSkatingDMV', type: 'puppeteer', group: 3, state: 'Multi' },
  'Activities-ScienceDiscovery-DMV': { file: './scraper-activities-science-discovery-dmv.js', exportName: 'scrapeScienceDiscoveryDMV', type: 'puppeteer', group: 1, state: 'Multi' },
  'Activities-SwimmingPools-DMV': { file: './scraper-activities-swimming-pools-dmv.js', exportName: 'scrapeSwimmingPoolsDMV', type: 'puppeteer', group: 2, state: 'Multi' },
  'Activities-TrampolineNinja-DMV': { file: './scraper-activities-trampoline-ninja-dmv.js', exportName: 'scrapeTrampolineNinjaDMV', type: 'puppeteer', group: 3, state: 'Multi' },
  'KidsOutAndAbout-DMV': { file: './scraper-kidsoutandabout-dmv.js', exportName: 'scrapeKidsOutAndAboutDMV', type: 'puppeteer', group: 1, state: 'Multi' },
  'Montgomery-Parks': { file: './scraper-montgomery-parks-md.js', exportName: 'scrapeMontgomeryParks', type: 'puppeteer', group: 2, state: 'MD' },
  'AARecParks-MD': { file: './scraper-aarecparks-md.js', exportName: 'scrapeAARecParks', type: 'puppeteer', group: 3, state: 'MD' },
  'PortDiscovery-MD': { file: './scraper-port-discovery-md.js', exportName: 'scrapePortDiscovery', type: 'puppeteer', group: 1, state: 'MD' },
};

// Build the new entries as a string
let wpBlock = '\n  // ============================================================================\n  // WORDPRESS PER-STATE LIBRARY SCRAPERS (48 states)\n  // ============================================================================\n';
for (const [name, config] of Object.entries(wpScrapers)) {
  wpBlock += `  '${name}': {\n    file: '${config.file}',\n    exportName: '${config.exportName}',\n    type: '${config.type}',\n    group: ${config.group},\n    state: '${config.state}'\n  },\n`;
}

let actBlock = '\n  // ============================================================================\n  // DMV ACTIVITY SCRAPERS + PARKS\n  // ============================================================================\n';
for (const [name, config] of Object.entries(activityScrapers)) {
  actBlock += `  '${name}': {\n    file: '${config.file}',\n    exportName: '${config.exportName}',\n    type: '${config.type}',\n    group: ${config.group},\n    state: '${config.state}'\n  },\n`;
}

// Check what's already there
let wpAdded = 0, actAdded = 0;
for (const name of Object.keys(wpScrapers)) {
  if (reg.includes(`'${name}':`)) wpAdded++;
}
for (const name of Object.keys(activityScrapers)) {
  if (reg.includes(`'${name}':`)) actAdded++;
}

if (wpAdded >= Object.keys(wpScrapers).length && actAdded >= Object.keys(activityScrapers).length) {
  console.log('All scrapers already in registry. Nothing to do.');
  process.exit(0);
}

// Insert before the closing of SCRAPERS object (before MACARONI_SCRAPERS section)
const insertMarker = "// REMOVED: WordPress-NH";
if (reg.includes(insertMarker)) {
  reg = reg.replace(insertMarker, wpBlock + actBlock + '  ' + insertMarker);
  console.log('1/2 Added ' + Object.keys(wpScrapers).length + ' WordPress per-state scrapers');
  console.log('2/2 Added ' + Object.keys(activityScrapers).length + ' DMV activity + parks scrapers');
} else {
  // Fallback: insert before MACARONI_SCRAPERS
  const macMarker = 'const MACARONI_SCRAPERS = {';
  if (reg.includes(macMarker)) {
    reg = reg.replace(macMarker, wpBlock + actBlock + '\n};\n\n' + macMarker);
    // Need to remove the extra closing brace we just added - tricky
    console.log('Used fallback insertion point');
  } else {
    console.log('ERROR: Could not find insertion point in registry');
    process.exit(1);
  }
}

fs.writeFileSync(path.join(SCRAPERS_DIR, 'scraper-registry.js'), reg);
console.log('\nDone! Verifying...');

delete require.cache[require.resolve(path.join(SCRAPERS_DIR, 'scraper-registry.js'))];
const { SCRAPERS, getActiveStates, getScrapersForGroupByRegion } = require(path.join(SCRAPERS_DIR, 'scraper-registry.js'));
const total = Object.keys(SCRAPERS).length;
const dmvG1 = Object.keys(getScrapersForGroupByRegion(1)).length;
const dmvG2 = Object.keys(getScrapersForGroupByRegion(2)).length;
const dmvG3 = Object.keys(getScrapersForGroupByRegion(3)).length;
console.log('Total scrapers in registry: ' + total);
console.log('DMV scrapers: Group 1=' + dmvG1 + ', Group 2=' + dmvG2 + ', Group 3=' + dmvG3 + ', Total=' + (dmvG1+dmvG2+dmvG3));
console.log('Active states: ' + JSON.stringify(getActiveStates()));

// Verify specific ones
const checks = ['WordPress-MD', 'WordPress-VA', 'Activities-ClimbingGyms-DMV', 'KidsOutAndAbout-DMV', 'Montgomery-Parks'];
const missing = checks.filter(c => !SCRAPERS[c]);
if (missing.length === 0) {
  console.log('\nAll spot checks passed!');
} else {
  console.log('\nMissing: ' + missing.join(', '));
}
