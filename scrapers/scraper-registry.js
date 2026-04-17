/**
 * SCRAPER REGISTRY
 * Maps all cloud function scrapers to their local files and configurations
 * Used by local-scraper-runner.js to execute scrapers locally
 *
 * Created: January 2026 - Cloud-to-Local Migration
 * Updated: April 2026 - Regional expansion support
 */

const fs = require('fs');
const path = require('path');
const REGION_CONFIG_PATH = path.join(__dirname, 'region-config.json');
function loadRegionConfig() { try { return JSON.parse(fs.readFileSync(REGION_CONFIG_PATH, 'utf-8')); } catch(e) { return null; } }
function getActiveStates() { const c = loadRegionConfig(); if (!c) return null; const s = []; for (const k of c.activeRegions||[]) { const r = c.regions[k]; if (r && r.active) s.push(...r.states); } return s; }
function getRegionForState(sc) { const c = loadRegionConfig(); if (!c) return null; for (const [k,r] of Object.entries(c.regions)) { if (r.states.includes(sc)) return k; } return null; }
function isScraperActive(sc, as) { if (!as) return true; if (!sc.state) return true; if (sc.state === 'Multi') return true; return as.includes(sc.state); }

// Day groups for 3-day rotation schedule
// Group 1: Days 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
// Group 2: Days 2, 5, 8, 11, 14, 17, 20, 23, 26, 29
// Group 3: Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30

const SCRAPERS = {
  // ============================================================================
  // LIBCAL PLATFORM SCRAPERS (23 states - using combined file)
  // Combined file: scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js
  // MD has its own file
  // ============================================================================
  'LibCal-CA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalCA',
    type: 'puppeteer',
    group: 1,
    state: 'CA'
  },
  'LibCal-CO': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalCO',
    type: 'puppeteer',
    group: 3,
    state: 'CO'
  },
  'LibCal-CT': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalCT',
    type: 'puppeteer',
    group: 2,
    state: 'CT'
  },
  'LibCal-DE': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalDE',
    type: 'puppeteer',
    group: 1,
    state: 'DE'
  },
  'LibCal-FL': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalFL',
    type: 'puppeteer',
    group: 3,
    state: 'FL'
  },
  'LibCal-GA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalGA',
    type: 'puppeteer',
    group: 2,
    state: 'GA'
  },
  'LibCal-IA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalIA',
    type: 'puppeteer',
    group: 1,
    state: 'IA'
  },
  'LibCal-LA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalLA',
    type: 'puppeteer',
    group: 3,
    state: 'LA'
  },
  'LibCal-MA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalMA',
    type: 'puppeteer',
    group: 2,
    state: 'MA'
  },
  // DISABLED: kent-md + worcester already covered by Kent-County and Worcester-County dedicated scrapers,
  // and those are also disabled since multi-state LibCal covers them. 0 saved across 4 runs.
  // 'LibCal-MD': { file: './scraper-libcal-libraries-md.js', exportName: 'scrapeLibCalEvents', type: 'puppeteer', group: 3, state: 'MD' },
  'LibCal-NC': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalNC',
    type: 'puppeteer',
    group: 1,
    state: 'NC'
  },
  'LibCal-NJ': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalNJ',
    type: 'puppeteer',
    group: 3,
    state: 'NJ'
  },
  'LibCal-NY1': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalNY1',
    type: 'puppeteer',
    group: 2,
    state: 'NY'
  },
  'LibCal-NY2': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalNY2',
    type: 'puppeteer',
    group: 1,
    state: 'NY'
  },
  'LibCal-OH': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalOH',
    type: 'puppeteer',
    group: 3,
    state: 'OH'
  },
  'LibCal-PA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalPA',
    type: 'puppeteer',
    group: 2,
    state: 'PA'
  },
  'LibCal-RI': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalRI',
    type: 'puppeteer',
    group: 1,
    state: 'RI'
  },
  'LibCal-SC': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalSC',
    type: 'puppeteer',
    group: 3,
    state: 'SC'
  },
  'LibCal-TN': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalTN',
    type: 'puppeteer',
    group: 2,
    state: 'TN'
  },
  'LibCal-TX': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalTX',
    type: 'puppeteer',
    group: 1,
    state: 'TX'
  },
  'LibCal-VA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalVA',
    type: 'puppeteer',
    group: 3,
    state: 'VA'
  },
  'LibCal-WA': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalWA',
    type: 'puppeteer',
    group: 2,
    state: 'WA'
  },
  'LibCal-WV': {
    file: './scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js',
    exportName: 'scrapeLibCalWV',
    type: 'puppeteer',
    group: 1,
    state: 'WV'
  },

  // ============================================================================
  // COMMUNICO PLATFORM SCRAPERS (19)
  // ============================================================================
  'Communico-CA': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoCA',
    type: 'puppeteer',
    group: 3,
    state: 'CA'
  },
  'Communico-CO': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoCO',
    type: 'puppeteer',
    group: 2,
    state: 'CO'
  },
  'Communico-DC': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoDC',
    type: 'puppeteer',
    group: 1,
    state: 'DC'
  },
  'Communico-FL': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoFL',
    type: 'puppeteer',
    group: 3,
    state: 'FL'
  },
  'Communico-GA': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoGA',
    type: 'puppeteer',
    group: 2,
    state: 'GA'
  },
  'Communico-IA': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoIA',
    type: 'puppeteer',
    group: 1,
    state: 'IA'
  },
  'Communico-IL': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoIL',
    type: 'puppeteer',
    group: 3,
    state: 'IL'
  },
  'Communico-IN': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoIN',
    type: 'puppeteer',
    group: 2,
    state: 'IN'
  },
  'Communico-MA': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoMA',
    type: 'puppeteer',
    group: 1,
    state: 'MA'
  },
  'Communico-MD': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoMD',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },
  'Communico-NJ': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoNJ',
    type: 'puppeteer',
    group: 2,
    state: 'NJ'
  },
  'Communico-NV': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoNV',
    type: 'puppeteer',
    group: 1,
    state: 'NV'
  },
  'Communico-NY': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoNY',
    type: 'puppeteer',
    group: 3,
    state: 'NY'
  },
  'Communico-OH': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoOH',
    type: 'puppeteer',
    group: 2,
    state: 'OH'
  },
  'Communico-OR': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoOR',
    type: 'puppeteer',
    group: 1,
    state: 'OR'
  },
  'Communico-PA': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoPA',
    type: 'puppeteer',
    group: 3,
    state: 'PA'
  },
  'Communico-TX': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoTX',
    type: 'puppeteer',
    group: 2,
    state: 'TX'
  },
  'Communico-VA': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoVA',
    type: 'puppeteer',
    group: 1,
    state: 'VA'
  },
  'Communico-WI': {
    file: './scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
    exportName: 'scrapeCommunicoWI',
    type: 'puppeteer',
    group: 3,
    state: 'WI'
  },

  // ============================================================================
  // BIBLIOCOMMONS PLATFORM SCRAPERS (16)
  // ============================================================================
  'BiblioCommons-AZ': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsAZ',
    type: 'puppeteer',
    group: 3,
    state: 'AZ'
  },
  'BiblioCommons-CA1': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsCA1',
    type: 'puppeteer',
    group: 2,
    state: 'CA'
  },
  'BiblioCommons-CA2': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsCA2',
    type: 'puppeteer',
    group: 1,
    state: 'CA'
  },
  'BiblioCommons-CO': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsCO',
    type: 'puppeteer',
    group: 3,
    state: 'CO'
  },
  'BiblioCommons-GA': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsGA',
    type: 'puppeteer',
    group: 2,
    state: 'GA'
  },
  'BiblioCommons-IL': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsIL',
    type: 'puppeteer',
    group: 1,
    state: 'IL'
  },
  'BiblioCommons-MA': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsMA',
    type: 'puppeteer',
    group: 3,
    state: 'MA'
  },
  'BiblioCommons-MI': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsMI',
    type: 'puppeteer',
    group: 2,
    state: 'MI'
  },
  'BiblioCommons-MN': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsMN',
    type: 'puppeteer',
    group: 1,
    state: 'MN'
  },
  'BiblioCommons-MO': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsMO',
    type: 'puppeteer',
    group: 3,
    state: 'MO'
  },
  'BiblioCommons-NC': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsNC',
    type: 'puppeteer',
    group: 2,
    state: 'NC'
  },
  'BiblioCommons-NJ': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsNJ',
    type: 'puppeteer',
    group: 1,
    state: 'NJ'
  },
  'BiblioCommons-OH': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsOH',
    type: 'puppeteer',
    group: 3,
    state: 'OH'
  },
  'BiblioCommons-TX': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsTX',
    type: 'puppeteer',
    group: 2,
    state: 'TX'
  },
  'BiblioCommons-VA': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsVA',
    type: 'puppeteer',
    group: 1,
    state: 'VA'
  },
  'BiblioCommons-WA': {
    file: './scraper-bibliocommons-libraries-CA-CO-IL-MA-TX-VA-WA.js',
    exportName: 'scrapeBiblioCommonsWA',
    type: 'puppeteer',
    group: 2,
    state: 'WA'
  },

  // ============================================================================
  // INDIVIDUAL LIBRARY SCRAPERS
  // ============================================================================
  'Pratt-Library': {
    file: './scraper-pratt-library-MD.js',
    exportName: 'scrapePrattLibrary',
    type: 'puppeteer',
    group: 1,
    state: 'MD'
  },
  'Howard-County': {
    file: './scraper-howard-county-library-MD.js',
    exportName: 'scrapeHowardCountyLibrary',
    type: 'puppeteer',
    group: 2,
    state: 'MD'
  },
  'LibraryMarket': {
    file: './scraper-librarymarket-libraries-CA-CO-FL-MD-TX-VA.js',
    exportName: 'scrapeLibraryMarketEvents',
    type: 'puppeteer',
    group: 2,
    state: 'Multi'
  },
  'SanAntonio-Library': {
    file: './scraper-san-antonio-library.js',
    exportName: 'scrapeSanAntonioLibrary',
    type: 'puppeteer',
    group: 1,
    state: 'TX'
  },
  'LA-Public-Library': {
    file: './scraper-la-public-library-CA.js',
    exportName: 'scrapeLAPublicLibrary',
    type: 'puppeteer',
    group: 2,
    state: 'CA'
  },
  'DesMoines-Library': {
    file: './scraper-des-moines-library-IA.js',
    exportName: 'scrapeDesMoinesLibrary',
    type: 'puppeteer',
    group: 1,
    state: 'IA'
  },
  'Brooklyn-Library': {
    file: './scraper-brooklyn-library-NY.js',
    exportName: 'scrapeBrooklynLibrary',
    type: 'puppeteer',
    group: 2,
    state: 'NY'
  },
  'FreeLibrary-Philadelphia': {
    file: './scraper-free-library-philadelphia-PA.js',
    exportName: 'scrapeFreeLibraryPhiladelphia',
    type: 'puppeteer',
    group: 1,
    state: 'PA'
  },

  // ============================================================================
  // MARYLAND COUNTY LIBRARIES
  // ============================================================================
  'AACPL': {
    file: './scraper-aacpl-library-MD.js',
    exportName: 'scrapeAACPL',
    type: 'puppeteer',
    group: 1,
    state: 'MD'
  },
  'Cecil-County': {
    file: './scraper-cecil-county-library-MD.js',
    exportName: 'scrapeCecilCountyLibrary',
    type: 'puppeteer',
    group: 2,
    state: 'MD'
  },
  'Dorchester-County': {
    file: './scraper-dorchester-county-library-MD.js',
    exportName: 'scrapeDorchesterCountyLibrary',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },
  'Prince-Georges-County': {
    file: './scraper-prince-georges-county-library-MD.js',
    exportName: 'scrapePrinceGeorgesCountyLibrary',
    type: 'puppeteer',
    group: 1,
    state: 'MD'
  },
  'Somerset-County': {
    file: './scraper-somerset-county-library-MD.js',
    exportName: 'scrapeSomersetCountyLibrary',
    type: 'puppeteer',
    group: 2,
    state: 'MD'
  },
  'Wicomico-Public': {
    file: './scraper-wicomico-libraries-MD.js',
    exportName: 'scrapeWicomicoEvents',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },
  // DISABLED: Redundant with multi-state LibraryMarket scraper (saved=7356 events)
  // 'Allegany-County': { file: './scraper-allegany-county-library-MD.js', exportName: 'scrapeAlleganyCountyLibrary', type: 'puppeteer', group: 1, state: 'MD' },
  // DISABLED: Redundant with LibCal-MD scraper (kent-md.libcal.com already covered)
  // 'Kent-County': { file: './scraper-kent-county-library-MD.js', exportName: 'scrapeKentCountyLibrary', type: 'puppeteer', group: 2, state: 'MD' },
  // DISABLED: Redundant with LibCal-MD scraper (worcesterlibrary.libcal.com already covered)
  // 'Worcester-County': { file: './scraper-worcester-county-library-MD.js', exportName: 'scrapeWorcesterCountyLibrary', type: 'puppeteer', group: 3, state: 'MD' },
  // DISABLED: Redundant with multi-state LibraryMarket scraper (relib.librarymarket.com already covered)
  // 'Ruth-Enlow': { file: './scraper-ruth-enlow-library-MD.js', exportName: 'scrapeRuthEnlowLibrary', type: 'puppeteer', group: 1, state: 'MD' },

  // ============================================================================
  // PENNSYLVANIA LIBRARIES
  // ============================================================================
  'Berks-County': {
    file: './scraper-berks-county-libraries-PA.js',
    exportName: 'scrapeBerksCountyLibraries',
    type: 'puppeteer',
    group: 2,
    state: 'PA'
  },
  'Allentown-Public': {
    file: './scraper-allentown-library-PA.js',
    exportName: 'scrapeAllentownLibrary',
    type: 'puppeteer',
    group: 3,
    state: 'PA'
  },
  'Westmoreland-Library': {
    file: './scraper-westmoreland-libraries-PA.js',
    exportName: 'scrapeWestmorelandLibraries',
    type: 'puppeteer',
    group: 1,
    state: 'PA'
  },

  // ============================================================================
  // VIRGINIA LIBRARIES
  // ============================================================================
  'Rockbridge-Regional': {
    file: './scraper-rockbridge-regional-library-VA.js',
    exportName: 'scrapeRockbridgeRegionalLibrary',
    type: 'puppeteer',
    group: 2,
    state: 'VA'
  },

  // ============================================================================
  // SPECIALIZED PLATFORM SCRAPERS
  // ============================================================================
  'CivicEngage-Libraries': {
    file: './scraper-civicengage-libraries-VA.js',
    exportName: 'scrapeCivicEngageLibraries',
    type: 'puppeteer',
    group: 1,
    state: 'VA'
  },
  'EventActions-Libraries': {
    file: './scraper-eventactions-libraries-VA.js',
    exportName: 'scrapeEventActionsLibraries',
    type: 'puppeteer',
    group: 2,
    state: 'VA'
  },
  'Firespring-Libraries': {
    file: './scraper-firespring-libraries-VA.js',
    exportName: 'scrapeFirespringLibraries',
    type: 'puppeteer',
    group: 3,
    state: 'VA'
  },
  'FullCalendar-Libraries': {
    file: './scraper-fullcalendar-libraries-VA.js',
    exportName: 'scrapeFullCalendarLibraries',
    type: 'puppeteer',
    group: 1,
    state: 'VA'
  },
  'WithApps-Libraries': {
    file: './scraper-withapps-libraries-VA.js',
    exportName: 'scrapeWithAppsLibraries',
    type: 'puppeteer',
    group: 3,
    state: 'VA'
  },
  'WordPress-Events-Calendar': {
    file: './scraper-wordpress-events-calendar-libraries-VA-PA.js',
    exportName: 'scrapeWordPressEventsCalendarLibraries',
    type: 'puppeteer',
    group: 3,
    state: 'Multi'
  },
  'Squarespace-Libraries': {
    file: './scraper-squarespace-libraries-MD.js',
    exportName: 'scrapeSquarespaceLibraries',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },

  // ============================================================================
  // OTHER LIBRARY PLATFORMS
  // ============================================================================
  'LibraryCalendar-Libraries': {
    file: './scraper-librarycalendar-libraries-MD-VA.js',
    exportName: 'scrapeLibraryCalendarLibraries',
    type: 'puppeteer',
    group: 1,
    state: 'Multi'
  },
  'CustomDrupal-Libraries': {
    file: './scraper-custom-drupal-libraries-GA-NC-SC-WV.js',
    exportName: 'scrapeCustomDrupalLibraries',
    type: 'puppeteer',
    group: 2,
    state: 'Multi'
  },
  'Drupal-Virginia': {
    file: './scraper-drupal-libraries-VA.js',
    exportName: 'scrapeDrupalVirginiaLibraries',
    type: 'puppeteer',
    group: 3,
    state: 'VA'
  },
  'Drupal-Pennsylvania': {
    file: './scraper-drupal-libraries-PA.js',
    exportName: 'scrapeDrupalPennsylvaniaLibraries',
    type: 'puppeteer',
    group: 1,
    state: 'PA'
  },
  // 'CustomDrupal-MultiState': {  // DISABLED - scraper file not yet created
  //   file: './scraper-custom-drupal-multi-state-libraries.js',
  //   exportName: 'scrapeCustomDrupalMultiStateLibraries',
  //   type: 'puppeteer',
  //   group: 2,
  //   state: 'Multi'
  // },
  // DISABLED: Redundant with multi-state LibraryMarket scraper. 0 saved across 4 runs.
  // 'LibraryMarket-MD': { file: './scraper-librarymarket-libraries-md.js', exportName: 'scrapeLibraryMarketEvents', type: 'puppeteer', group: 3, state: 'MD' },

  // ============================================================================
  // DMV PARKS & ACTIVITIES
  // ============================================================================
  'Fairfax-Parks': {
    file: './scraper-fairfax-parks-va.js',
    exportName: 'scrapeFairfaxParks',
    type: 'puppeteer',
    group: 1,
    state: 'VA'
  },
  'PG-Parks': {
    file: './scraper-pgparks-md.js',
    exportName: 'scrapePGParks',
    type: 'puppeteer',
    group: 2,
    state: 'MD'
  },
  'RollyPollies-MD': {
    file: './scraper-rolly-pollies-MD.js',
    exportName: 'scrapeRollyPollies',
    type: 'puppeteer',
    group: 3,
    state: 'MD'
  },

  // ============================================================================
  // SPECIALIZED CALENDAR SYSTEMS
  // ============================================================================
  'Trumba-Spartanburg': {
    file: './scraper-trumba-spartanburg-sc.js',
    exportName: 'scrapeTrumbaLibrary',
    type: 'puppeteer',
    group: 1,
    state: 'SC'
  },
  'Tockify-Horry': {
    file: './scraper-tockify-horry-sc.js',
    exportName: 'scrapeTockifyHorry',
    type: 'puppeteer',
    group: 2,
    state: 'SC'
  },
  'Intercept-Camden': {
    file: './scraper-intercept-camden-nj.js',
    exportName: 'scrapeInterceptLibrary',
    type: 'puppeteer',
    group: 3,
    state: 'NJ'
  },
  'EventON-Lexington': {
    file: './scraper-eventon-lexington-sc.js',
    exportName: 'scrapeEventONLexington',
    type: 'puppeteer',
    group: 1,
    state: 'SC'
  },
  'Graniculator-Morris': {
    file: './scraper-granicus-morris-county-nj.js',
    exportName: 'scrapeGranicusMorrisCounty',
    type: 'axios',
    group: 2,
    state: 'NJ'
  },
  'CalendarWiz-Beaufort': {
    file: './scraper-calendarwiz-beaufort-county-sc.js',
    exportName: 'scrapeCalendarWizBeaufort',
    type: 'puppeteer',
    group: 3,
    state: 'SC'
  },
  'WordPress-Abbe-Regional': {
    file: './scraper-wordpress-abbe-regional-sc.js',
    exportName: 'scrapeWordPressAbbeRegional',
    type: 'puppeteer',
    group: 1,
    state: 'SC'
  },


  // ============================================================================
  // WORDPRESS PER-STATE LIBRARY SCRAPERS
  // ============================================================================
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
  // DISABLED: lprlibrary.org uses Google Calendar embeds which cannot be scraped. 0 saved across 2 runs.
  // 'ModernEventsCalendar-VA': { file: './scraper-wordpress-modern-events-calendar-libraries-VA.js', exportName: 'scrapeModernEventsCalendarLibraries', type: 'puppeteer', group: 2, state: 'VA' },

  // ============================================================================
  // DMV ACTIVITY SCRAPERS + PARKS
  // ============================================================================
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
  // REMOVED: WordPress-NH - All 16 NH libraries use incompatible platforms (Assabet Interactive iframes, LibCal, Wix)
  // Scraper file archived to functions/scrapers/archived/scraper-wordpress-libraries-nh.js

  // ============================================================================
  // PHASE 2: DEDICATED LIBRARY SCRAPERS (custom platforms)
  // ============================================================================
  'Louisville-Library': { file: './scraper-louisville-library-KY.js', exportName: 'scrapeLouisvilleLibrary', type: 'puppeteer', group: 2, state: 'KY' },
  'Miami-Dade-Library': { file: './scraper-miami-dade-library-FL.js', exportName: 'scrapeMiamiDadeLibrary', type: 'puppeteer', group: 1, state: 'FL' },
  'Orange-County-Library-FL': { file: './scraper-orange-county-library-FL.js', exportName: 'scrapeOrangeCountyLibraryFL', type: 'puppeteer', group: 3, state: 'FL' },

  // ============================================================================
  // PHASE 3: PARKS & RECREATION EVENT SCRAPERS
  // ============================================================================
  'State-Parks-Events': { file: './scraper-state-parks-events.js', exportName: 'scrapeStateParksEvents', type: 'puppeteer', group: 1, state: 'Multi' },

  // ============================================================================
  // EASTERN US VENUE/ACTIVITY SCRAPER (data-driven)
  // ============================================================================
  'Activities-Eastern-US': { file: './scraper-activities-eastern-us.js', exportName: 'scrapeEasternUSActivities', type: 'puppeteer', group: 2, state: 'Multi' },

  // ============================================================================
  // PHASE 4: MAJOR VENUE EVENT SCRAPERS (data-driven, multi-state)
  // ============================================================================
  'Venue-Events-ChildrensMuseums': { file: './scraper-venue-events-childrens-museums.js', exportName: 'scrapeChildrensMuseumEvents', type: 'puppeteer', group: 2, state: 'Multi' },
  'Venue-Events-ZoosAquariums': { file: './scraper-venue-events-zoos-aquariums.js', exportName: 'scrapeZooAquariumEvents', type: 'puppeteer', group: 3, state: 'Multi' },
  'Venue-Events-ScienceArts': { file: './scraper-venue-events-science-arts.js', exportName: 'scrapeScienceArtsEvents', type: 'puppeteer', group: 1, state: 'Multi' },

  // ============================================================================
  // PHASE 5: FESTIVALS & FAIRS (all eastern states)
  // ============================================================================
  'Festivals-Eastern-US': { file: './scraper-festivals-eastern-us.js', exportName: 'scrapeFestivalsEasternUSCloudFunction', type: 'puppeteer', group: 2, state: 'Multi' },
  'Farms-Eastern-US': { file: './scraper-farms-eastern-us.js', exportName: 'scrapeFarmsEasternUSCloudFunction', type: 'puppeteer', group: 3, state: 'Multi' },
};

// ============================================================================
// MACARONI KID SCRAPERS (43 states + DC = 44 total)
// Now automated on 3-day rotation (previously manual)
// Browser restarts every 5 states to prevent memory issues
// ============================================================================
const MACARONI_SCRAPERS = {
  // GROUP 1 (15 states, ~139 sites): Days 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
  'MacaroniKid-CA': {
    file: './scraper-macaroni-ca.js',
    exportName: 'scrapeMacaroniKidCalifornia',
    type: 'puppeteer',
    group: 1,
    state: 'CA',
    sites: 45
  },
  'MacaroniKid-PA': {
    file: './scraper-macaroni-pa.js',
    exportName: 'scrapeMacaroniKidPennsylvania',
    type: 'puppeteer',
    group: 1,
    state: 'PA',
    sites: 34
  },
  'MacaroniKid-NC': {
    file: './scraper-macaroni-nc.js',
    exportName: 'scrapeMacaroniKidNorthCarolina',
    type: 'puppeteer',
    group: 1,
    state: 'NC',
    sites: 14
  },
  'MacaroniKid-MA': {
    file: './scraper-macaroni-ma.js',
    exportName: 'scrapeMacaroniKidMassachusetts',
    type: 'puppeteer',
    group: 1,
    state: 'MA',
    sites: 10
  },
  'MacaroniKid-TN': {
    file: './scraper-macaroni-tn.js',
    exportName: 'scrapeMacaroniKidTennessee',
    type: 'puppeteer',
    group: 1,
    state: 'TN',
    sites: 8
  },
  'MacaroniKid-AL': {
    file: './scraper-macaroni-al.js',
    exportName: 'scrapeMacaroniKidAlabama',
    type: 'puppeteer',
    group: 1,
    state: 'AL',
    sites: 7
  },
  'MacaroniKid-MN': {
    file: './scraper-macaroni-mn.js',
    exportName: 'scrapeMacaroniKidMinnesota',
    type: 'puppeteer',
    group: 1,
    state: 'MN',
    sites: 5
  },
  'MacaroniKid-KY': {
    file: './scraper-macaroni-ky.js',
    exportName: 'scrapeMacaroniKidKentucky',
    type: 'puppeteer',
    group: 1,
    state: 'KY',
    sites: 4
  },
  'MacaroniKid-IA': {
    file: './scraper-macaroni-ia.js',
    exportName: 'scrapeMacaroniKidIowa',
    type: 'puppeteer',
    group: 1,
    state: 'IA',
    sites: 3
  },
  'MacaroniKid-HI': {
    file: './scraper-macaroni-hi.js',
    exportName: 'scrapeMacaroniKidHawaii',
    type: 'puppeteer',
    group: 1,
    state: 'HI',
    sites: 2
  },
  'MacaroniKid-NE': {
    file: './scraper-macaroni-ne.js',
    exportName: 'scrapeMacaroniKidNebraska',
    type: 'puppeteer',
    group: 1,
    state: 'NE',
    sites: 2
  },
  'MacaroniKid-RI': {
    file: './scraper-macaroni-ri.js',
    exportName: 'scrapeMacaroniKidRhodeIsland',
    type: 'puppeteer',
    group: 1,
    state: 'RI',
    sites: 2
  },
  'MacaroniKid-DC': {
    file: './scraper-macaroni-dc.js',
    exportName: 'scrapeMacaroniKidDC',
    type: 'puppeteer',
    group: 1,
    state: 'DC',
    sites: 1
  },
  'MacaroniKid-WV': {
    file: './scraper-macaroni-wv.js',
    exportName: 'scrapeMacaroniKidWestVirginia',
    type: 'puppeteer',
    group: 1,
    state: 'WV',
    sites: 1
  },
  'MacaroniKid-SD': {
    file: './scraper-macaroni-sd.js',
    exportName: 'scrapeMacaroniKidSouthDakota',
    type: 'puppeteer',
    group: 1,
    state: 'SD',
    sites: 1
  },

  // GROUP 2 (14 states, ~131 sites): Days 2, 5, 8, 11, 14, 17, 20, 23, 26, 29
  'MacaroniKid-FL': {
    file: './scraper-macaroni-fl.js',
    exportName: 'scrapeMacaroniKidFlorida',
    type: 'puppeteer',
    group: 2,
    state: 'FL',
    sites: 31
  },
  'MacaroniKid-NY': {
    file: './scraper-macaroni-ny.js',
    exportName: 'scrapeMacaroniKidNewYork',
    type: 'puppeteer',
    group: 2,
    state: 'NY',
    sites: 24
  },
  'MacaroniKid-GA': {
    file: './scraper-macaroni-ga.js',
    exportName: 'scrapeMacaroniKidGeorgia',
    type: 'puppeteer',
    group: 2,
    state: 'GA',
    sites: 17
  },
  'MacaroniKid-MI': {
    file: './scraper-macaroni-mi.js',
    exportName: 'scrapeMacaroniKidMichigan',
    type: 'puppeteer',
    group: 2,
    state: 'MI',
    sites: 12
  },
  'MacaroniKid-CT': {
    file: './scraper-macaroni-ct.js',
    exportName: 'scrapeMacaroniKidConnecticut',
    type: 'puppeteer',
    group: 2,
    state: 'CT',
    sites: 8
  },
  'MacaroniKid-MD': {
    file: './scraper-macaroni-md.js',
    exportName: 'scrapeMacaroniKidMaryland',
    type: 'puppeteer',
    group: 2,
    state: 'MD',
    sites: 8
  },
  'MacaroniKid-AZ': {
    file: './scraper-macaroni-az.js',
    exportName: 'scrapeMacaroniKidArizona',
    type: 'puppeteer',
    group: 2,
    state: 'AZ',
    sites: 7
  },
  'MacaroniKid-OR': {
    file: './scraper-macaroni-or.js',
    exportName: 'scrapeMacaroniKidOregon',
    type: 'puppeteer',
    group: 2,
    state: 'OR',
    sites: 6
  },
  'MacaroniKid-LA': {
    file: './scraper-macaroni-la.js',
    exportName: 'scrapeMacaroniKidLouisiana',
    type: 'puppeteer',
    group: 2,
    state: 'LA',
    sites: 5
  },
  'MacaroniKid-KS': {
    file: './scraper-macaroni-ks.js',
    exportName: 'scrapeMacaroniKidKansas',
    type: 'puppeteer',
    group: 2,
    state: 'KS',
    sites: 4
  },
  'MacaroniKid-AR': {
    file: './scraper-macaroni-ar.js',
    exportName: 'scrapeMacaroniKidArkansas',
    type: 'puppeteer',
    group: 2,
    state: 'AR',
    sites: 3
  },
  'MacaroniKid-NH': {
    file: './scraper-macaroni-nh.js',
    exportName: 'scrapeMacaroniKidNewHampshire',
    type: 'puppeteer',
    group: 2,
    state: 'NH',
    sites: 3
  },
  'MacaroniKid-NM': {
    file: './scraper-macaroni-nm.js',
    exportName: 'scrapeMacaroniKidNewMexico',
    type: 'puppeteer',
    group: 2,
    state: 'NM',
    sites: 2
  },
  'MacaroniKid-ME': {
    file: './scraper-macaroni-me.js',
    exportName: 'scrapeMacaroniKidMaine',
    type: 'puppeteer',
    group: 2,
    state: 'ME',
    sites: 1
  },

  // GROUP 3 (14 states, ~149 sites): Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
  'MacaroniKid-TX': {
    file: './scraper-macaroni-tx.js',
    exportName: 'scrapeMacaroniKidTexas',
    type: 'puppeteer',
    group: 3,
    state: 'TX',
    sites: 31
  },
  'MacaroniKid-IL': {
    file: './scraper-macaroni-il.js',
    exportName: 'scrapeMacaroniKidIllinois',
    type: 'puppeteer',
    group: 3,
    state: 'IL',
    sites: 19
  },
  'MacaroniKid-NJ': {
    file: './scraper-macaroni-nj.js',
    exportName: 'scrapeMacaroniKidNewJersey',
    type: 'puppeteer',
    group: 3,
    state: 'NJ',
    sites: 17
  },
  'MacaroniKid-OH': {
    file: './scraper-macaroni-oh.js',
    exportName: 'scrapeMacaroniKidOhio',
    type: 'puppeteer',
    group: 3,
    state: 'OH',
    sites: 15
  },
  'MacaroniKid-VA': {
    file: './scraper-macaroni-va.js',
    exportName: 'scrapeMacaroniKidVirginia',
    type: 'puppeteer',
    group: 3,
    state: 'VA',
    sites: 12
  },
  'MacaroniKid-CO': {
    file: './scraper-macaroni-co.js',
    exportName: 'scrapeMacaroniKidColorado',
    type: 'puppeteer',
    group: 3,
    state: 'CO',
    sites: 11
  },
  'MacaroniKid-WA': {
    file: './scraper-macaroni-wa.js',
    exportName: 'scrapeMacaroniKidWashington',
    type: 'puppeteer',
    group: 3,
    state: 'WA',
    sites: 9
  },
  'MacaroniKid-IN': {
    file: './scraper-macaroni-in.js',
    exportName: 'scrapeMacaroniKidIndiana',
    type: 'puppeteer',
    group: 3,
    state: 'IN',
    sites: 8
  },
  'MacaroniKid-SC': {
    file: './scraper-macaroni-sc.js',
    exportName: 'scrapeMacaroniKidSouthCarolina',
    type: 'puppeteer',
    group: 3,
    state: 'SC',
    sites: 8
  },
  'MacaroniKid-MO': {
    file: './scraper-macaroni-mo.js',
    exportName: 'scrapeMacaroniKidMissouri',
    type: 'puppeteer',
    group: 3,
    state: 'MO',
    sites: 6
  },
  'MacaroniKid-WI': {
    file: './scraper-macaroni-wi.js',
    exportName: 'scrapeMacaroniKidWisconsin',
    type: 'puppeteer',
    group: 3,
    state: 'WI',
    sites: 6
  },
  'MacaroniKid-ID': {
    file: './scraper-macaroni-id.js',
    exportName: 'scrapeMacaroniKidIdaho',
    type: 'puppeteer',
    group: 3,
    state: 'ID',
    sites: 3
  },
  'MacaroniKid-DE': {
    file: './scraper-macaroni-de.js',
    exportName: 'scrapeMacaroniKidDelaware',
    type: 'puppeteer',
    group: 3,
    state: 'DE',
    sites: 2
  },
  'MacaroniKid-AK': {
    file: './scraper-macaroni-ak.js',
    exportName: 'scrapeMacaroniKidAlaska',
    type: 'puppeteer',
    group: 3,
    state: 'AK',
    sites: 2
  }
};

// ============================================================================
// OSM SCRAPERS (Monthly - Days 1-10)
// These run monthly, not on the 3-day rotation
// ============================================================================
const OSM_SCRAPERS = {
  'OSM-Batch1': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch1',
    type: 'axios',
    day: 1,
    states: ['AL', 'AK', 'AZ', 'AR', 'CA']
  },
  'OSM-Batch2': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch2',
    type: 'axios',
    day: 2,
    states: ['CO', 'CT', 'DE', 'FL', 'GA']
  },
  'OSM-Batch3': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch3',
    type: 'axios',
    day: 3,
    states: ['HI', 'ID', 'IL', 'IN', 'IA']
  },
  'OSM-Batch4': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch4',
    type: 'axios',
    day: 4,
    states: ['KS', 'KY', 'LA', 'ME', 'MD']
  },
  'OSM-Batch5': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch5',
    type: 'axios',
    day: 5,
    states: ['MA', 'MI', 'MN', 'MS', 'MO']
  },
  'OSM-Batch6': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch6',
    type: 'axios',
    day: 6,
    states: ['MT', 'NE', 'NV', 'NH', 'NJ']
  },
  'OSM-Batch7': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch7',
    type: 'axios',
    day: 7,
    states: ['NM', 'NY', 'NC', 'ND', 'OH']
  },
  'OSM-Batch8': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch8',
    type: 'axios',
    day: 8,
    states: ['OK', 'OR', 'PA', 'RI', 'SC']
  },
  'OSM-Batch9': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch9',
    type: 'axios',
    day: 9,
    states: ['SD', 'TN', 'TX', 'UT', 'VT']
  },
  'OSM-Batch10': {
    file: './scraper-osm-batch-activities.js',
    exportName: 'scrapeOSMBatch10',
    type: 'axios',
    day: 10,
    states: ['VA', 'WA', 'WV', 'WI', 'WY']
  },
  'OSM-California': {
    file: './scraper-osm-california.js',
    exportName: 'scrapeOSMCalifornia',
    type: 'axios',
    day: 1,
    states: ['CA']
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get day group for a given day of month
 * @param {number} dayOfMonth - Day of the month (1-31)
 * @returns {number} Group number (1, 2, or 3)
 */
function getDayGroup(dayOfMonth) {
  // Group 1: Days 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
  // Group 2: Days 2, 5, 8, 11, 14, 17, 20, 23, 26, 29
  // Group 3: Days 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
  return ((dayOfMonth - 1) % 3) + 1;
}

/**
 * Get all scrapers for a specific group
 * @param {number} group - Group number (1, 2, or 3)
 * @returns {Object} Object with scraper names as keys
 */
function getScrapersForGroup(group) {
  const result = {};
  for (const [name, config] of Object.entries(SCRAPERS)) {
    if (config.group === group) {
      result[name] = config;
    }
  }
  return result;
}

/**
 * Get OSM scrapers for a specific day
 * @param {number} dayOfMonth - Day of the month (1-10)
 * @returns {Object} Object with scraper names as keys
 */
function getOSMScrapersForDay(dayOfMonth) {
  const result = {};
  for (const [name, config] of Object.entries(OSM_SCRAPERS)) {
    if (config.day === dayOfMonth) {
      result[name] = config;
    }
  }
  return result;
}

/**
 * Get all scraper names (excluding Macaroni Kid)
 * @returns {string[]} Array of scraper names
 */
function getAllScraperNames() {
  return Object.keys(SCRAPERS);
}

/**
 * Get all Macaroni Kid scraper names
 * @returns {string[]} Array of Macaroni Kid scraper names
 */
function getAllMacaroniScraperNames() {
  return Object.keys(MACARONI_SCRAPERS);
}

/**
 * Get Macaroni Kid scrapers for a specific group
 * @param {number} group - Group number (1, 2, or 3)
 * @returns {Object} Object with scraper names as keys
 */
function getMacaroniScrapersForGroup(group) {
  const result = {};
  for (const [name, config] of Object.entries(MACARONI_SCRAPERS)) {
    if (config.group === group) {
      result[name] = config;
    }
  }
  return result;
}

/**
 * Get scraper count by group (regular scrapers only)
 * @returns {Object} Object with group counts
 */
function getGroupCounts() {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const config of Object.values(SCRAPERS)) {
    counts[config.group]++;
  }
  return counts;
}

/**
 * Get Macaroni Kid scraper count by group
 * @returns {Object} Object with group counts
 */
function getMacaroniGroupCounts() {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const config of Object.values(MACARONI_SCRAPERS)) {
    counts[config.group]++;
  }
  return counts;
}

/**
 * Get total site count by group for Macaroni Kid
 * @returns {Object} Object with site counts per group
 */
function getMacaroniSiteCounts() {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const config of Object.values(MACARONI_SCRAPERS)) {
    counts[config.group] += config.sites || 0;
  }
  return counts;
}

function getScrapersForGroupByRegion(g, o={}) { const as = o.regionFilter||getActiveStates(); const r={}; for (const [n,c] of Object.entries(SCRAPERS)) { if (c.group===g && isScraperActive(c,as)) r[n]=c; } return r; }
function getMacaroniScrapersForGroupByRegion(g, o={}) { const as = o.regionFilter||getActiveStates(); const r={}; for (const [n,c] of Object.entries(MACARONI_SCRAPERS)) { if (c.group===g && isScraperActive(c,as)) r[n]=c; } return r; }
function getOSMScrapersForDayByRegion(d, o={}) { const as = o.regionFilter||getActiveStates(); if (!as) return getOSMScrapersForDay(d); const r={}; for (const [n,c] of Object.entries(OSM_SCRAPERS)) { if (c.day===d) { const bs=c.states||[]; const ab=bs.filter(s=>as.includes(s)); if (ab.length>0) r[n]={...c,activeStates:ab}; } } return r; }
function getRegionSummary() { const c=loadRegionConfig(); if(!c) return null; const s={}; for (const [k,r] of Object.entries(c.regions)) { const st=r.states; let sc=0,mc=0; for (const v of Object.values(SCRAPERS)){if(st.includes(v.state))sc++;} for (const v of Object.values(MACARONI_SCRAPERS)){if(st.includes(v.state))mc++;} s[k]={name:r.name,active:r.active,phase:r.phase,states:st.length,scrapers:sc,macaroni:mc,total:sc+mc}; } return s; }

module.exports = { SCRAPERS, MACARONI_SCRAPERS, OSM_SCRAPERS, getDayGroup, getScrapersForGroup, getMacaroniScrapersForGroup, getOSMScrapersForDay, getAllScraperNames, getAllMacaroniScraperNames, getGroupCounts, getMacaroniGroupCounts, getMacaroniSiteCounts, getActiveStates, getRegionForState, isScraperActive, getScrapersForGroupByRegion, getMacaroniScrapersForGroupByRegion, getOSMScrapersForDayByRegion, getRegionSummary, loadRegionConfig };
