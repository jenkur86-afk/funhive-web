#!/usr/bin/env node

/**
 * FUNHIVE DATA QUALITY FIX SCRIPT (v2)
 *
 * Comprehensive data quality fixes:
 *   1. Delete past events
 *   2. Fix missing geohash (compute from PostGIS location via SQL)
 *   3. Fix missing/invalid state codes (infer from scraper, zip, address)
 *   4. Fix missing city (extract from address or venue)
 *   5. Fill in missing addresses via Nominatim reverse geocoding
 *   6. Forward-geocode activities/events with address but no location
 *   7. Categorize uncategorized events
 *   8. Clear stale scraper log errors
 *
 * Usage:
 *   node data-quality-fix.js              # Dry run
 *   node data-quality-fix.js --save       # Apply all fixes
 *   node data-quality-fix.js --save --past-only
 *   node data-quality-fix.js --save --geo-only
 *   node data-quality-fix.js --save --address-only
 *   node data-quality-fix.js --save --category-only
 */

const { supabase } = require('../scrapers/helpers/supabase-adapter');
let ngeohash;
try { ngeohash = require('ngeohash'); } catch { ngeohash = require('../scrapers/node_modules/ngeohash'); }

let axios;
try { axios = require('axios'); } catch { axios = require('../scrapers/node_modules/axios'); }
const fs = require('fs');
const path = require('path');

// Import categorization helper
const { categorizeEvent } = require('../scrapers/helpers/event-categorization-helper');

const DRY_RUN = !process.argv.includes('--save');
const PAST_ONLY = process.argv.includes('--past-only');
const GEO_ONLY = process.argv.includes('--geo-only');
const ADDRESS_ONLY = process.argv.includes('--address-only');
const CATEGORY_ONLY = process.argv.includes('--category-only');
const RUN_ALL = !PAST_ONLY && !GEO_ONLY && !ADDRESS_ONLY && !CATEGORY_ONLY;

const VALID_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

const STATE_FROM_NAME = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
  'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY'
};

// US zip code to state mapping (first 3 digits → state)
const ZIP_TO_STATE = {
  '006': 'PR', '007': 'PR', '008': 'PR', '009': 'PR',
  '010': 'MA', '011': 'MA', '012': 'MA', '013': 'MA', '014': 'MA', '015': 'MA', '016': 'MA', '017': 'MA', '018': 'MA', '019': 'MA', '020': 'MA', '021': 'MA', '022': 'MA', '023': 'MA', '024': 'MA', '025': 'MA', '026': 'MA', '027': 'MA',
  '028': 'RI', '029': 'RI',
  '030': 'NH', '031': 'NH', '032': 'NH', '033': 'NH', '034': 'NH', '035': 'NH', '036': 'NH', '037': 'NH', '038': 'NH',
  '039': 'ME', '040': 'ME', '041': 'ME', '042': 'ME', '043': 'ME', '044': 'ME', '045': 'ME', '046': 'ME', '047': 'ME', '048': 'ME', '049': 'ME',
  '050': 'VT', '051': 'VT', '052': 'VT', '053': 'VT', '054': 'VT', '055': 'VT', '056': 'VT', '057': 'VT', '058': 'VT', '059': 'VT',
  '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT', '065': 'CT', '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
  '070': 'NJ', '071': 'NJ', '072': 'NJ', '073': 'NJ', '074': 'NJ', '075': 'NJ', '076': 'NJ', '077': 'NJ', '078': 'NJ', '079': 'NJ', '080': 'NJ', '081': 'NJ', '082': 'NJ', '083': 'NJ', '084': 'NJ', '085': 'NJ', '086': 'NJ', '087': 'NJ', '088': 'NJ', '089': 'NJ',
  '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY', '105': 'NY', '106': 'NY', '107': 'NY', '108': 'NY', '109': 'NY', '110': 'NY', '111': 'NY', '112': 'NY', '113': 'NY', '114': 'NY', '115': 'NY', '116': 'NY', '117': 'NY', '118': 'NY', '119': 'NY', '120': 'NY', '121': 'NY', '122': 'NY', '123': 'NY', '124': 'NY', '125': 'NY', '126': 'NY', '127': 'NY', '128': 'NY', '129': 'NY', '130': 'NY', '131': 'NY', '132': 'NY', '133': 'NY', '134': 'NY', '135': 'NY', '136': 'NY', '137': 'NY', '138': 'NY', '139': 'NY', '140': 'NY', '141': 'NY', '142': 'NY', '143': 'NY', '144': 'NY', '145': 'NY', '146': 'NY', '147': 'NY', '148': 'NY', '149': 'NY',
  '150': 'PA', '151': 'PA', '152': 'PA', '153': 'PA', '154': 'PA', '155': 'PA', '156': 'PA', '157': 'PA', '158': 'PA', '159': 'PA', '160': 'PA', '161': 'PA', '162': 'PA', '163': 'PA', '164': 'PA', '165': 'PA', '166': 'PA', '167': 'PA', '168': 'PA', '169': 'PA', '170': 'PA', '171': 'PA', '172': 'PA', '173': 'PA', '174': 'PA', '175': 'PA', '176': 'PA', '177': 'PA', '178': 'PA', '179': 'PA', '180': 'PA', '181': 'PA', '182': 'PA', '183': 'PA', '184': 'PA', '185': 'PA', '186': 'PA', '187': 'PA', '188': 'PA', '189': 'PA', '190': 'PA', '191': 'PA', '192': 'PA', '193': 'PA', '194': 'PA', '195': 'PA', '196': 'PA',
  '197': 'DE', '198': 'DE', '199': 'DE',
  '200': 'DC', '201': 'VA', '202': 'DC', '203': 'DC', '204': 'DC', '205': 'DC',
  '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD', '210': 'MD', '211': 'MD', '212': 'MD', '214': 'MD', '215': 'MD', '216': 'MD', '217': 'MD', '218': 'MD', '219': 'MD',
  '220': 'VA', '221': 'VA', '222': 'VA', '223': 'VA', '224': 'VA', '225': 'VA', '226': 'VA', '227': 'VA', '228': 'VA', '229': 'VA', '230': 'VA', '231': 'VA', '232': 'VA', '233': 'VA', '234': 'VA', '235': 'VA', '236': 'VA', '237': 'VA', '238': 'VA', '239': 'VA', '240': 'VA', '241': 'VA', '242': 'VA', '243': 'VA', '244': 'VA', '245': 'VA', '246': 'VA',
  '247': 'WV', '248': 'WV', '249': 'WV', '250': 'WV', '251': 'WV', '252': 'WV', '253': 'WV', '254': 'WV', '255': 'WV', '256': 'WV', '257': 'WV', '258': 'WV', '259': 'WV', '260': 'WV', '261': 'WV', '262': 'WV', '263': 'WV', '264': 'WV', '265': 'WV', '266': 'WV', '267': 'WV', '268': 'WV',
  '270': 'NC', '271': 'NC', '272': 'NC', '273': 'NC', '274': 'NC', '275': 'NC', '276': 'NC', '277': 'NC', '278': 'NC', '279': 'NC', '280': 'NC', '281': 'NC', '282': 'NC', '283': 'NC', '284': 'NC', '285': 'NC', '286': 'NC', '287': 'NC', '288': 'NC', '289': 'NC',
  '290': 'SC', '291': 'SC', '292': 'SC', '293': 'SC', '294': 'SC', '295': 'SC', '296': 'SC', '297': 'SC', '298': 'SC', '299': 'SC',
  '300': 'GA', '301': 'GA', '302': 'GA', '303': 'GA', '304': 'GA', '305': 'GA', '306': 'GA', '307': 'GA', '308': 'GA', '309': 'GA', '310': 'GA', '311': 'GA', '312': 'GA', '313': 'GA', '314': 'GA', '315': 'GA', '316': 'GA', '317': 'GA', '318': 'GA', '319': 'GA',
  '320': 'FL', '321': 'FL', '322': 'FL', '323': 'FL', '324': 'FL', '325': 'FL', '326': 'FL', '327': 'FL', '328': 'FL', '329': 'FL', '330': 'FL', '331': 'FL', '332': 'FL', '333': 'FL', '334': 'FL', '335': 'FL', '336': 'FL', '337': 'FL', '338': 'FL', '339': 'FL',
  '340': 'FL',
  '350': 'AL', '351': 'AL', '352': 'AL', '354': 'AL', '355': 'AL', '356': 'AL', '357': 'AL', '358': 'AL', '359': 'AL', '360': 'AL', '361': 'AL', '362': 'AL', '363': 'AL', '364': 'AL', '365': 'AL', '366': 'AL', '367': 'AL', '368': 'AL', '369': 'AL',
  '370': 'TN', '371': 'TN', '372': 'TN', '373': 'TN', '374': 'TN', '375': 'TN', '376': 'TN', '377': 'TN', '378': 'TN', '379': 'TN', '380': 'TN', '381': 'TN', '382': 'TN', '383': 'TN', '384': 'TN', '385': 'TN',
  '386': 'MS', '387': 'MS', '388': 'MS', '389': 'MS', '390': 'MS', '391': 'MS', '392': 'MS', '393': 'MS', '394': 'MS', '395': 'MS', '396': 'MS', '397': 'MS',
  '400': 'KY', '401': 'KY', '402': 'KY', '403': 'KY', '404': 'KY', '405': 'KY', '406': 'KY', '407': 'KY', '408': 'KY', '409': 'KY', '410': 'KY', '411': 'KY', '412': 'KY', '413': 'KY', '414': 'KY', '415': 'KY', '416': 'KY', '417': 'KY', '418': 'KY',
  '420': 'KY', '421': 'KY', '422': 'KY', '423': 'KY', '424': 'KY', '425': 'KY', '426': 'KY', '427': 'KY',
  '430': 'OH', '431': 'OH', '432': 'OH', '433': 'OH', '434': 'OH', '435': 'OH', '436': 'OH', '437': 'OH', '438': 'OH', '439': 'OH', '440': 'OH', '441': 'OH', '442': 'OH', '443': 'OH', '444': 'OH', '445': 'OH', '446': 'OH', '447': 'OH', '448': 'OH', '449': 'OH', '450': 'OH', '451': 'OH', '452': 'OH', '453': 'OH', '454': 'OH', '455': 'OH', '456': 'OH', '457': 'OH', '458': 'OH',
  '460': 'IN', '461': 'IN', '462': 'IN', '463': 'IN', '464': 'IN', '465': 'IN', '466': 'IN', '467': 'IN', '468': 'IN', '469': 'IN', '470': 'IN', '471': 'IN', '472': 'IN', '473': 'IN', '474': 'IN', '475': 'IN', '476': 'IN', '477': 'IN', '478': 'IN', '479': 'IN',
  '480': 'MI', '481': 'MI', '482': 'MI', '483': 'MI', '484': 'MI', '485': 'MI', '486': 'MI', '487': 'MI', '488': 'MI', '489': 'MI', '490': 'MI', '491': 'MI', '492': 'MI', '493': 'MI', '494': 'MI', '495': 'MI', '496': 'MI', '497': 'MI', '498': 'MI', '499': 'MI',
  '500': 'IA', '501': 'IA', '502': 'IA', '503': 'IA', '504': 'IA', '505': 'IA', '506': 'IA', '507': 'IA', '508': 'IA', '509': 'IA', '510': 'IA', '511': 'IA', '512': 'IA', '513': 'IA', '514': 'IA', '515': 'IA', '516': 'IA', '520': 'IA', '521': 'IA', '522': 'IA', '523': 'IA', '524': 'IA', '525': 'IA', '526': 'IA', '527': 'IA', '528': 'IA',
  '530': 'WI', '531': 'WI', '532': 'WI', '534': 'WI', '535': 'WI', '537': 'WI', '538': 'WI', '539': 'WI', '540': 'WI', '541': 'WI', '542': 'WI', '543': 'WI', '544': 'WI', '545': 'WI', '546': 'WI', '547': 'WI', '548': 'WI', '549': 'WI',
  '550': 'MN', '551': 'MN', '553': 'MN', '554': 'MN', '555': 'MN', '556': 'MN', '557': 'MN', '558': 'MN', '559': 'MN', '560': 'MN', '561': 'MN', '562': 'MN', '563': 'MN', '564': 'MN', '565': 'MN', '566': 'MN', '567': 'MN',
  '570': 'SD', '571': 'SD', '572': 'SD', '573': 'SD', '574': 'SD', '575': 'SD', '576': 'SD', '577': 'SD',
  '580': 'ND', '581': 'ND', '582': 'ND', '583': 'ND', '584': 'ND', '585': 'ND', '586': 'ND', '587': 'ND', '588': 'ND',
  '590': 'MT', '591': 'MT', '592': 'MT', '593': 'MT', '594': 'MT', '595': 'MT', '596': 'MT', '597': 'MT', '598': 'MT', '599': 'MT',
  '600': 'IL', '601': 'IL', '602': 'IL', '603': 'IL', '604': 'IL', '605': 'IL', '606': 'IL', '607': 'IL', '608': 'IL', '609': 'IL', '610': 'IL', '611': 'IL', '612': 'IL', '613': 'IL', '614': 'IL', '615': 'IL', '616': 'IL', '617': 'IL', '618': 'IL', '619': 'IL', '620': 'IL', '621': 'IL', '622': 'IL', '623': 'IL', '624': 'IL', '625': 'IL', '626': 'IL', '627': 'IL', '628': 'IL', '629': 'IL',
  '630': 'MO', '631': 'MO', '633': 'MO', '634': 'MO', '635': 'MO', '636': 'MO', '637': 'MO', '638': 'MO', '639': 'MO', '640': 'MO', '641': 'MO', '644': 'MO', '645': 'MO', '646': 'MO', '647': 'MO', '648': 'MO', '649': 'MO', '650': 'MO', '651': 'MO', '652': 'MO', '653': 'MO', '654': 'MO', '655': 'MO', '656': 'MO', '657': 'MO', '658': 'MO',
  '660': 'KS', '661': 'KS', '662': 'KS', '664': 'KS', '665': 'KS', '666': 'KS', '667': 'KS', '668': 'KS', '669': 'KS', '670': 'KS', '671': 'KS', '672': 'KS', '673': 'KS', '674': 'KS', '675': 'KS', '676': 'KS', '677': 'KS', '678': 'KS', '679': 'KS',
  '680': 'NE', '681': 'NE', '683': 'NE', '684': 'NE', '685': 'NE', '686': 'NE', '687': 'NE', '688': 'NE', '689': 'NE', '690': 'NE', '691': 'NE', '692': 'NE', '693': 'NE',
  '700': 'LA', '701': 'LA', '703': 'LA', '704': 'LA', '705': 'LA', '706': 'LA', '707': 'LA', '708': 'LA', '710': 'LA', '711': 'LA', '712': 'LA', '713': 'LA', '714': 'LA',
  '716': 'AR', '717': 'AR', '718': 'AR', '719': 'AR', '720': 'AR', '721': 'AR', '722': 'AR', '723': 'AR', '724': 'AR', '725': 'AR', '726': 'AR', '727': 'AR', '728': 'AR', '729': 'AR',
  '730': 'OK', '731': 'OK', '733': 'OK', '734': 'OK', '735': 'OK', '736': 'OK', '737': 'OK', '738': 'OK', '739': 'OK', '740': 'OK', '741': 'OK', '743': 'OK', '744': 'OK', '745': 'OK', '746': 'OK', '747': 'OK', '748': 'OK', '749': 'OK',
  '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX', '755': 'TX', '756': 'TX', '757': 'TX', '758': 'TX', '759': 'TX', '760': 'TX', '761': 'TX', '762': 'TX', '763': 'TX', '764': 'TX', '765': 'TX', '766': 'TX', '767': 'TX', '768': 'TX', '769': 'TX', '770': 'TX', '771': 'TX', '772': 'TX', '773': 'TX', '774': 'TX', '775': 'TX', '776': 'TX', '777': 'TX', '778': 'TX', '779': 'TX', '780': 'TX', '781': 'TX', '782': 'TX', '783': 'TX', '784': 'TX', '785': 'TX', '786': 'TX', '787': 'TX', '788': 'TX', '789': 'TX', '790': 'TX', '791': 'TX', '792': 'TX', '793': 'TX', '794': 'TX', '795': 'TX', '796': 'TX', '797': 'TX', '798': 'TX', '799': 'TX',
  '800': 'CO', '801': 'CO', '802': 'CO', '803': 'CO', '804': 'CO', '805': 'CO', '806': 'CO', '807': 'CO', '808': 'CO', '809': 'CO', '810': 'CO', '811': 'CO', '812': 'CO', '813': 'CO', '814': 'CO', '815': 'CO', '816': 'CO',
  '820': 'WY', '821': 'WY', '822': 'WY', '823': 'WY', '824': 'WY', '825': 'WY', '826': 'WY', '827': 'WY', '828': 'WY', '829': 'WY', '830': 'WY', '831': 'WY',
  '832': 'ID', '833': 'ID', '834': 'ID', '835': 'ID', '836': 'ID', '837': 'ID', '838': 'ID',
  '840': 'UT', '841': 'UT', '842': 'UT', '843': 'UT', '844': 'UT', '845': 'UT', '846': 'UT', '847': 'UT',
  '850': 'AZ', '851': 'AZ', '852': 'AZ', '853': 'AZ', '855': 'AZ', '856': 'AZ', '857': 'AZ', '859': 'AZ', '860': 'AZ', '863': 'AZ', '864': 'AZ', '865': 'AZ',
  '870': 'NM', '871': 'NM', '872': 'NM', '873': 'NM', '874': 'NM', '875': 'NM', '877': 'NM', '878': 'NM', '879': 'NM', '880': 'NM', '881': 'NM', '882': 'NM', '883': 'NM', '884': 'NM',
  '889': 'NV', '890': 'NV', '891': 'NV', '893': 'NV', '894': 'NV', '895': 'NV', '896': 'NV', '897': 'NV', '898': 'NV',
  '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA', '905': 'CA', '906': 'CA', '907': 'CA', '908': 'CA', '910': 'CA', '911': 'CA', '912': 'CA', '913': 'CA', '914': 'CA', '915': 'CA', '916': 'CA', '917': 'CA', '918': 'CA', '919': 'CA', '920': 'CA', '921': 'CA', '922': 'CA', '923': 'CA', '924': 'CA', '925': 'CA', '926': 'CA', '927': 'CA', '928': 'CA', '930': 'CA', '931': 'CA', '932': 'CA', '933': 'CA', '934': 'CA', '935': 'CA', '936': 'CA', '937': 'CA', '938': 'CA', '939': 'CA', '940': 'CA', '941': 'CA', '942': 'CA', '943': 'CA', '944': 'CA', '945': 'CA', '946': 'CA', '947': 'CA', '948': 'CA', '949': 'CA', '950': 'CA', '951': 'CA', '952': 'CA', '953': 'CA', '954': 'CA', '955': 'CA', '956': 'CA', '957': 'CA', '958': 'CA', '959': 'CA', '960': 'CA', '961': 'CA',
  '970': 'OR', '971': 'OR', '972': 'OR', '973': 'OR', '974': 'OR', '975': 'OR', '976': 'OR', '977': 'OR', '978': 'OR', '979': 'OR',
  '980': 'WA', '981': 'WA', '982': 'WA', '983': 'WA', '984': 'WA', '985': 'WA', '986': 'WA', '988': 'WA', '989': 'WA', '990': 'WA', '991': 'WA', '992': 'WA', '993': 'WA', '994': 'WA',
  '995': 'AK', '996': 'AK', '997': 'AK', '998': 'AK', '999': 'AK',
  '967': 'HI', '968': 'HI'
};

const MONTH_NAMES = {
  'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
  'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
};

let totalFixed = 0;

// ==========================================
// GEOCODING (Nominatim)
// ==========================================

const CACHE_FILE = path.join(__dirname, 'scrapers', '.geocode-cache.json');
let geocodeCache = {};
try {
  if (fs.existsSync(CACHE_FILE)) {
    geocodeCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
} catch { geocodeCache = {}; }

let lastNominatimCall = 0;
let nominatimCallCount = 0;
let rateLimitedUntil = 0; // Global 429 cooldown timestamp

async function rateLimitedDelay() {
  // Respect global 429 cooldown first
  const now = Date.now();
  if (now < rateLimitedUntil) {
    const waitMs = rateLimitedUntil - now;
    console.log(`  ⏳ Global 429 cooldown: waiting ${Math.ceil(waitMs / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  const elapsed = Date.now() - lastNominatimCall;
  if (elapsed < 1500) {
    await new Promise(resolve => setTimeout(resolve, 1500 - elapsed));
  }
  lastNominatimCall = Date.now();
}

function saveGeocodeCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(geocodeCache, null, 0));
  } catch (e) {
    console.warn('  ⚠️ Failed to save geocode cache:', e.message);
  }
}

async function nominatimForward(query, retries = 3) {
  const cacheKey = `fwd:${query}`;
  if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];
  if (geocodeCache[query]) return geocodeCache[query]; // legacy cache format

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimitedDelay();
      nominatimCallCount++;
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: query, format: 'json', limit: 1, countrycodes: 'us' },
        headers: { 'User-Agent': 'FunHive-DataFix/1.0 (jenkur86@gmail.com)' },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const result = {
          latitude: parseFloat(response.data[0].lat),
          longitude: parseFloat(response.data[0].lon),
          display_name: response.data[0].display_name
        };
        geocodeCache[cacheKey] = result;
        geocodeCache[query] = result; // also cache under raw key
        if (nominatimCallCount % 20 === 0) saveGeocodeCache();
        return result;
      }
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        const cooldownMs = Math.min(60000 * (attempt + 1), 180000); // 60s, 120s, 180s
        rateLimitedUntil = Date.now() + cooldownMs;
        console.log(`  ⏳ Rate limited (429), global cooldown ${cooldownMs / 1000}s (attempt ${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, cooldownMs));
        lastNominatimCall = Date.now();
        continue;
      }
      if (nominatimCallCount <= 3) console.log(`    Forward geocode error: ${error.message}`);
      return null;
    }
  }
  return null;
}

async function nominatimReverse(lat, lng, retries = 3) {
  const cacheKey = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimitedDelay();
      nominatimCallCount++;
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: { lat, lon: lng, format: 'json', addressdetails: 1 },
        headers: { 'User-Agent': 'FunHive-DataFix/1.0 (jenkur86@gmail.com)' },
        timeout: 10000
      });

      if (response.data && response.data.address) {
        const addr = response.data.address;
        const result = {
          address: response.data.display_name,
          road: addr.road || addr.pedestrian || addr.footway || '',
          house_number: addr.house_number || '',
          city: addr.city || addr.town || addr.village || addr.hamlet || addr.county || '',
          state: addr.state || '',
          zip_code: addr.postcode || '',
          formatted: buildAddress(addr)
        };
        geocodeCache[cacheKey] = result;
        if (nominatimCallCount % 20 === 0) saveGeocodeCache();
        return result;
      }
      if (response.data?.error) {
        if (nominatimCallCount <= 3) console.log(`    Nominatim error: ${response.data.error}`);
      }
      return null;
    } catch (error) {
      if (error.response?.status === 429) {
        const cooldownMs = Math.min(60000 * (attempt + 1), 180000); // 60s, 120s, 180s
        rateLimitedUntil = Date.now() + cooldownMs;
        console.log(`  ⏳ Rate limited (429), global cooldown ${cooldownMs / 1000}s (attempt ${attempt + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, cooldownMs));
        lastNominatimCall = Date.now();
        continue;
      }
      if (nominatimCallCount <= 3) console.log(`    Geocode error: ${error.message}`);
      return null;
    }
  }
  return null;
}

function buildAddress(addr) {
  const parts = [];
  if (addr.house_number && addr.road) parts.push(`${addr.house_number} ${addr.road}`);
  else if (addr.road) parts.push(addr.road);
  const city = addr.city || addr.town || addr.village || addr.hamlet || '';
  if (city) parts.push(city);
  const state = addr.state || '';
  const zip = addr.postcode || '';
  if (state && zip) parts.push(`${stateToAbbr(state)} ${zip}`);
  else if (state) parts.push(stateToAbbr(state));
  return parts.join(', ');
}

function stateToAbbr(stateName) {
  if (!stateName) return '';
  if (stateName.length === 2) return stateName.toUpperCase();
  return STATE_FROM_NAME[stateName.toLowerCase()] || stateName;
}

// ==========================================
// HELPERS
// ==========================================

async function fetchAll(table, select = '*') {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) { console.error(`Error fetching ${table}:`, error.message); break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

function parseDateString(dateStr) {
  if (!dateStr) return null;
  // ISO format: 2026-04-12 or 2026-04-12T...
  const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  // "Month Day, Year" or "Month Day Year": "April 12, 2026", "Apr 12 2026"
  const mdy = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdy) {
    const monthIdx = MONTH_NAMES[mdy[1].toLowerCase()];
    if (monthIdx !== undefined) return new Date(parseInt(mdy[3]), monthIdx, parseInt(mdy[2]));
  }
  // MM/DD/YYYY
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) return new Date(parseInt(slashMatch[3]), parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
  // "Month Day" without year (assume current year): "Apr 12", "December 25"
  const mdNoYear = dateStr.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (mdNoYear) {
    const monthIdx = MONTH_NAMES[mdNoYear[1].toLowerCase()];
    if (monthIdx !== undefined) return new Date(new Date().getFullYear(), monthIdx, parseInt(mdNoYear[2]));
  }
  // Try JavaScript Date.parse as last resort
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) return parsed;
  return null;
}

function inferStateFromZip(zipCode) {
  if (!zipCode) return null;
  const zip3 = zipCode.toString().padStart(5, '0').substring(0, 3);
  return ZIP_TO_STATE[zip3] || null;
}

function inferStateFromAddress(address) {
  if (!address) return null;
  // Try to find ", ST " or ", ST " pattern at end of address
  const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  if (stateMatch && VALID_STATES.includes(stateMatch[1])) return stateMatch[1];
  // Try full state names
  for (const [name, abbr] of Object.entries(STATE_FROM_NAME)) {
    if (address.toLowerCase().includes(name)) return abbr;
  }
  return null;
}

function inferStateFromScraper(scraperName) {
  if (!scraperName) return null;
  // Patterns: "WordPress-VA", "LibCal-GA", "MacaroniKid-MD", "scraper-name-MD"
  const match = scraperName.match(/[-_]([A-Z]{2})(?:\d|$|-|_)/i) || scraperName.match(/\b([A-Z]{2})$/);
  if (match) {
    const st = match[1].toUpperCase();
    if (VALID_STATES.includes(st)) return st;
  }
  return null;
}

function extractCityFromAddress(address) {
  if (!address) return null;
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    // City is typically second-to-last (before "ST 12345")
    const cityCandidate = parts[parts.length - 2] || parts[1];
    if (cityCandidate && cityCandidate.length > 1 && !/^\d{5}/.test(cityCandidate) && !/^[A-Z]{2}\s+\d{5}/.test(cityCandidate)) {
      return cityCandidate;
    }
  }
  return null;
}

function extractCityFromVenue(venue) {
  if (!venue) return null;
  // Venues like "Library Name - CityName" or "Library Name, CityName"
  const dashMatch = venue.match(/\s[-–—]\s+(.+)$/);
  if (dashMatch) return dashMatch[1].trim();
  return null;
}

async function batchUpdate(table, updates, fieldName) {
  let fixed = 0;
  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);
    for (const update of batch) {
      const { id, ...fields } = update;
      const { error } = await supabase.from(table).update(fields).eq('id', id);
      if (!error) fixed++;
    }
    if (i > 0 && i % 500 === 0) {
      console.log(`    ...${i}/${updates.length} ${fieldName} updated`);
    }
  }
  return fixed;
}

// ==========================================
// 1. DELETE PAST EVENTS
// ==========================================

async function fixPastEvents() {
  console.log('\n📅 PAST EVENTS CLEANUP');
  console.log('─'.repeat(50));

  const events = await fetchAll('events', 'id, event_date, name, scraper_name');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastEvents = [];
  const noDateEvents = [];

  for (const event of events) {
    if (!event.event_date) { noDateEvents.push(event); continue; }
    const eventDate = parseDateString(event.event_date);
    if (eventDate && eventDate < today) pastEvents.push(event);
  }

  console.log(`  Found ${pastEvents.length} past events to delete`);
  console.log(`  Found ${noDateEvents.length} events with no date`);

  if (pastEvents.length > 0) {
    const bySource = {};
    for (const e of pastEvents) {
      const src = e.scraper_name || 'unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    }
    for (const [src, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`    ${src}: ${count}`);
    }
  }

  if (!DRY_RUN && pastEvents.length > 0) {
    const ids = pastEvents.map(e => e.id);
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      const { error } = await supabase.from('events').delete().in('id', batch);
      if (!error) deleted += batch.length;
    }
    console.log(`  ✅ Deleted ${deleted} past events`);
    totalFixed += deleted;
  }

  if (!DRY_RUN && noDateEvents.length > 0) {
    const ids = noDateEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      await supabase.from('events').delete().in('id', batch);
    }
    console.log(`  ✅ Deleted ${noDateEvents.length} events with no date`);
    totalFixed += noDateEvents.length;
  }
}

// ==========================================
// 2. VENUE-BASED DATA PROPAGATION
//    (Copies city/state/address/geohash from activities → events)
// ==========================================

async function propagateFromVenues() {
  console.log('\n🔗 VENUE-BASED DATA PROPAGATION');
  console.log('─'.repeat(50));

  // Load all activities as a venue lookup
  const activities = await fetchAll('activities', 'id, name, address, city, state, zip_code, geohash');

  // Build lookup maps keyed by normalized venue name
  const venueLookup = {};
  for (const act of activities) {
    if (!act.name) continue;
    const key = act.name.toLowerCase().trim();
    // Keep the most complete record per venue name
    if (!venueLookup[key] || (act.address && !venueLookup[key].address)) {
      venueLookup[key] = act;
    }
  }
  console.log(`  Built venue lookup: ${Object.keys(venueLookup).length} unique venues`);

  // Load events missing key fields
  const events = await fetchAll('events', 'id, venue, city, state, address, zip_code, geohash');
  const needsFix = events.filter(e =>
    !e.city || !e.state || !e.address || !e.geohash
  );
  console.log(`  Events with missing data: ${needsFix.length}`);

  const fixable = [];
  let matched = 0;
  const fieldsFilled = { city: 0, state: 0, address: 0, zip_code: 0, geohash: 0 };

  // Also build a secondary lookup from events that DO have full data
  // so we can propagate from sibling events at the same venue
  const eventVenueLookup = {};
  for (const evt of events) {
    if (!evt.venue || !evt.city || !evt.state) continue;
    const key = evt.venue.toLowerCase().trim();
    if (!eventVenueLookup[key]) {
      eventVenueLookup[key] = { city: evt.city, state: evt.state, address: evt.address, zip_code: evt.zip_code, geohash: evt.geohash };
    }
  }
  console.log(`  Event-to-event venue lookup: ${Object.keys(eventVenueLookup).length} venues`);

  for (const evt of needsFix) {
    if (!evt.venue) continue;
    const venueName = evt.venue.toLowerCase().trim();

    // Try exact match to activity first
    let match = venueLookup[venueName];

    // Try partial match: "Library Name - Branch" → look for "Library Name"
    if (!match) {
      const baseName = venueName.replace(/\s*[-–—]\s*.+$/, '').trim();
      if (baseName !== venueName) match = venueLookup[baseName];
    }

    // Try event-to-event propagation (same venue name, different event has data)
    if (!match && eventVenueLookup[venueName]) {
      match = eventVenueLookup[venueName];
    }

    if (!match) continue;

    const update = { id: evt.id };
    let hasUpdate = false;

    if (!evt.city && match.city) { update.city = match.city; fieldsFilled.city++; hasUpdate = true; }
    if (!evt.state && match.state) { update.state = match.state; fieldsFilled.state++; hasUpdate = true; }
    if (!evt.address && match.address) { update.address = match.address; fieldsFilled.address++; hasUpdate = true; }
    if (!evt.zip_code && match.zip_code) { update.zip_code = match.zip_code; fieldsFilled.zip_code++; hasUpdate = true; }
    if (!evt.geohash && match.geohash) { update.geohash = match.geohash; fieldsFilled.geohash++; hasUpdate = true; }

    if (hasUpdate) {
      fixable.push(update);
      matched++;
    }
  }

  console.log(`  Matched ${matched} events to venues`);
  for (const [field, count] of Object.entries(fieldsFilled)) {
    if (count > 0) console.log(`    ${field}: ${count} filled`);
  }

  if (!DRY_RUN && fixable.length > 0) {
    const fixed = await batchUpdate('events', fixable, 'venue-propagated fields');
    console.log(`  ✅ Propagated data for ${fixed} events from venue records`);
    totalFixed += fixed;
  }

  return venueLookup; // Return for use by later steps
}

// ==========================================
// 3. FIX MISSING STATE CODES
// ==========================================

async function fixMissingStates(venueLookup) {
  console.log('\n🏛️ STATE CODE FIX');
  console.log('─'.repeat(50));

  const events = await fetchAll('events', 'id, state, city, venue, address, zip_code, scraper_name');
  const activities = await fetchAll('activities', 'id, state, city, name, address, zip_code, scraper_name');

  for (const [table, items] of [['events', events], ['activities', activities]]) {
    const missing = items.filter(i => !i.state);
    const invalid = items.filter(i => i.state && !VALID_STATES.includes(i.state.toUpperCase()));

    if (missing.length === 0 && invalid.length === 0) {
      console.log(`  ${table}: all states valid ✓`);
      continue;
    }

    console.log(`  ${table} missing state: ${missing.length}`);
    console.log(`  ${table} invalid state: ${invalid.length}`);

    const fixable = [];
    for (const item of missing) {
      let state = inferStateFromZip(item.zip_code)
        || inferStateFromAddress(item.address)
        || inferStateFromScraper(item.scraper_name);

      // Try matching venue to an activity with a known state
      if (!state && item.venue && venueLookup) {
        const match = venueLookup[(item.venue || '').toLowerCase().trim()];
        if (match && match.state) state = match.state;
      }

      // Try to find 2-letter state code at end of venue/scraper text
      if (!state && item.venue) {
        const venueStateMatch = (item.venue || '').match(/\b([A-Z]{2})$/);
        if (venueStateMatch && VALID_STATES.includes(venueStateMatch[1])) {
          state = venueStateMatch[1];
        }
      }

      // Try to infer from city name + known city-state combos in existing data
      if (!state && item.city) {
        // Look through activities for any with the same city that has a state
        const cityLower = item.city.toLowerCase();
        for (const act of activities) {
          if (act.state && act.city && act.city.toLowerCase() === cityLower) {
            state = act.state;
            break;
          }
        }
      }

      if (state) fixable.push({ id: item.id, state });
    }

    // Fix invalid states
    for (const item of invalid) {
      const normalized = STATE_FROM_NAME[item.state.toLowerCase()] ||
        (VALID_STATES.includes(item.state.toUpperCase()) ? item.state.toUpperCase() : null);
      if (normalized) fixable.push({ id: item.id, state: normalized });
    }

    console.log(`  Can fix: ${fixable.length}/${missing.length + invalid.length}`);

    if (!DRY_RUN && fixable.length > 0) {
      const fixed = await batchUpdate(table, fixable, 'states');
      console.log(`  ✅ Fixed ${fixed} ${table} state codes`);
      totalFixed += fixed;
    }
  }
}

// ==========================================
// 4. FIX MISSING CITY
// ==========================================

async function fixMissingCity(venueLookup) {
  console.log('\n🏙️ MISSING CITY FIX');
  console.log('─'.repeat(50));

  for (const table of ['activities', 'events']) {
    const selectFields = table === 'activities'
      ? 'id, name, city, address, geohash'
      : 'id, name, city, address, venue, geohash';
    const items = await fetchAll(table, selectFields);
    const missing = items.filter(i => !i.city);

    if (missing.length === 0) {
      console.log(`  ${table}: all have city ✓`);
      continue;
    }

    console.log(`  ${table} missing city: ${missing.length}`);

    const fixable = [];
    const needsGeocode = [];

    for (const item of missing) {
      // Strategy 1: Extract from address text
      let city = extractCityFromAddress(item.address);

      // Strategy 2: Extract from venue name
      if (!city) city = extractCityFromVenue(item.venue || item.name);

      // Strategy 3: Match venue to activity lookup
      if (!city && item.venue && venueLookup) {
        const match = venueLookup[(item.venue || '').toLowerCase().trim()];
        if (match && match.city) city = match.city;
      }

      if (city) {
        fixable.push({ id: item.id, city });
      } else if (item.geohash) {
        needsGeocode.push(item);
      }
    }

    console.log(`  Can extract city: ${fixable.length}/${missing.length}`);

    // Strategy 4: Reverse geocode remaining items that have geohash
    if (needsGeocode.length > 0) {
      const MAX_CITY_GEOCODE = 200;
      const toGeocode = needsGeocode.slice(0, MAX_CITY_GEOCODE);
      console.log(`  Will reverse geocode ${toGeocode.length} for city...`);
      let geocoded = 0;

      for (const item of toGeocode) {
        try {
          const { latitude, longitude } = ngeohash.decode(item.geohash);
          const result = await nominatimReverse(latitude, longitude);
          if (result && result.city) {
            fixable.push({ id: item.id, city: result.city });
            geocoded++;
          }
        } catch { /* skip */ }

        if (geocoded % 50 === 0 && geocoded > 0) {
          console.log(`    ...${geocoded} cities found via geocoding`);
          saveGeocodeCache();
        }
      }
      console.log(`  Geocoded ${geocoded} cities`);
    }

    if (!DRY_RUN && fixable.length > 0) {
      const fixed = await batchUpdate(table, fixable, 'city');
      console.log(`  ✅ Fixed city for ${fixed} ${table}`);
      totalFixed += fixed;
    }
  }
}

// ==========================================
// 4. FILL IN MISSING ADDRESSES (reverse geocode)
// ==========================================

async function fixMissingAddresses() {
  console.log('\n📍 MISSING ADDRESS FIX (reverse geocoding)');
  console.log('─'.repeat(50));

  // We need activities that have location geometry but no address
  // Since we can't extract coords from PostGIS via JS client directly,
  // first get all activities, then use a Supabase RPC to extract coords

  // Step 1: Get activities with location but no address using raw SQL via RPC
  // We'll create a temporary approach: get activities missing address that DO have geohash
  // (geohash implies they have coords we can decode)
  const activities = await fetchAll('activities', 'id, name, address, city, state, zip_code, geohash, scraper_name');
  const missing = activities.filter(a => !a.address && a.geohash);
  const missingNoGeo = activities.filter(a => !a.address && !a.geohash);

  console.log(`  Activities missing address (with geohash): ${missing.length}`);
  console.log(`  Activities missing address (no geohash): ${missingNoGeo.length}`);

  if (missing.length === 0) {
    console.log('  No activities to reverse geocode ✓');
    return;
  }

  // Decode geohash to get approximate coordinates, then reverse geocode
  const MAX_GEOCODE = 500; // Limit to avoid hammering Nominatim
  const toGeocode = missing.slice(0, MAX_GEOCODE);
  console.log(`  Will reverse geocode up to ${toGeocode.length} activities...`);

  const fixable = [];
  let geocoded = 0;
  let failed = 0;

  for (const act of toGeocode) {
    try {
      // Decode geohash to lat/lng
      const { latitude, longitude } = ngeohash.decode(act.geohash);

      const result = await nominatimReverse(latitude, longitude);
      if (result && result.formatted) {
        const update = { id: act.id, address: result.formatted };

        // Also fill in city/state/zip if missing
        if (!act.city && result.city) update.city = result.city;
        if (!act.state && result.state) {
          const st = stateToAbbr(result.state);
          if (VALID_STATES.includes(st)) update.state = st;
        }
        if (!act.zip_code && result.zip_code) update.zip_code = result.zip_code;

        fixable.push(update);
        geocoded++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }

    // Progress every 50
    if ((geocoded + failed) % 50 === 0) {
      console.log(`    ...${geocoded + failed}/${toGeocode.length} processed (${geocoded} found, ${failed} failed)`);
      saveGeocodeCache();
    }
  }

  console.log(`  Reverse geocoded: ${geocoded}/${toGeocode.length} (${failed} failed)`);

  if (!DRY_RUN && fixable.length > 0) {
    const fixed = await batchUpdate('activities', fixable, 'addresses');
    console.log(`  ✅ Filled in ${fixed} activity addresses`);
    totalFixed += fixed;
  }

  // Also try to fill addresses for events missing them
  console.log('\n  Checking events missing address...');
  const events = await fetchAll('events', 'id, name, address, city, state, zip_code, geohash, venue');
  const eventsMissing = events.filter(e => !e.address && e.geohash);
  console.log(`  Events missing address (with geohash): ${eventsMissing.length}`);

  if (eventsMissing.length > 0) {
    // For events, try to copy address from matching activity/venue first
    const activityAddresses = {};
    for (const act of activities) {
      if (act.address && act.name) {
        activityAddresses[act.name.toLowerCase()] = {
          address: act.address,
          city: act.city,
          state: act.state,
          zip_code: act.zip_code
        };
      }
    }

    const eventFixable = [];
    let matchedFromActivity = 0;

    for (const evt of eventsMissing) {
      // First try matching venue name to an activity
      const venueLower = (evt.venue || '').toLowerCase();
      if (venueLower && activityAddresses[venueLower]) {
        const match = activityAddresses[venueLower];
        const update = { id: evt.id, address: match.address };
        if (!evt.city && match.city) update.city = match.city;
        if (!evt.state && match.state) update.state = match.state;
        if (!evt.zip_code && match.zip_code) update.zip_code = match.zip_code;
        eventFixable.push(update);
        matchedFromActivity++;
        continue;
      }
    }

    console.log(`  Events matched from activity venues: ${matchedFromActivity}`);

    // For remaining, reverse geocode (limit to avoid overuse)
    const eventsToGeocode = eventsMissing
      .filter(e => !eventFixable.find(f => f.id === e.id))
      .slice(0, Math.max(0, MAX_GEOCODE - geocoded));

    if (eventsToGeocode.length > 0) {
      console.log(`  Will reverse geocode up to ${eventsToGeocode.length} events...`);
      let evtGeocoded = 0;

      for (const evt of eventsToGeocode) {
        try {
          const { latitude, longitude } = ngeohash.decode(evt.geohash);
          const result = await nominatimReverse(latitude, longitude);
          if (result && result.formatted) {
            const update = { id: evt.id, address: result.formatted };
            if (!evt.city && result.city) update.city = result.city;
            if (!evt.state && result.state) {
              const st = stateToAbbr(result.state);
              if (VALID_STATES.includes(st)) update.state = st;
            }
            if (!evt.zip_code && result.zip_code) update.zip_code = result.zip_code;
            eventFixable.push(update);
            evtGeocoded++;
          }
        } catch { /* skip */ }

        if (evtGeocoded % 50 === 0 && evtGeocoded > 0) {
          console.log(`    ...${evtGeocoded}/${eventsToGeocode.length} events geocoded`);
          saveGeocodeCache();
        }
      }
      console.log(`  Events reverse geocoded: ${evtGeocoded}`);
    }

    if (!DRY_RUN && eventFixable.length > 0) {
      const fixed = await batchUpdate('events', eventFixable, 'event addresses');
      console.log(`  ✅ Filled in ${fixed} event addresses`);
      totalFixed += fixed;
    }
  }

  saveGeocodeCache();
}

// ==========================================
// 5. FIX MISSING GEOHASH / LOCATION
// ==========================================

async function fixMissingGeohash() {
  console.log('\n🌍 GEOHASH & LOCATION FIX');
  console.log('─'.repeat(50));

  // For items WITH PostGIS location but missing geohash, provide SQL
  console.log('  ℹ️ SQL to fix geohash from existing PostGIS location:');
  console.log('     UPDATE activities SET geohash = encode(ST_GeoHash(location, 7)::bytea, \'escape\') WHERE geohash IS NULL AND location IS NOT NULL;');
  console.log('     UPDATE events SET geohash = encode(ST_GeoHash(location, 7)::bytea, \'escape\') WHERE geohash IS NULL AND location IS NOT NULL;');

  // For items WITHOUT location but WITH address, forward-geocode
  for (const table of ['activities', 'events']) {
    const items = await fetchAll(table, 'id, name, address, city, state, zip_code, geohash, location');
    const missingGeo = items.filter(i => !i.geohash && !i.location);
    const hasAddressNoGeo = missingGeo.filter(i => i.address || (i.city && i.state));

    console.log(`\n  ${table} missing all location data: ${missingGeo.length}`);
    console.log(`  ${table} can forward-geocode (have address): ${hasAddressNoGeo.length}`);

    if (hasAddressNoGeo.length === 0) continue;

    const MAX_FWD = 300;
    const toGeocode = hasAddressNoGeo.slice(0, MAX_FWD);
    console.log(`  Will forward geocode up to ${toGeocode.length} ${table}...`);

    const fixable = [];
    let geocoded = 0;

    for (const item of toGeocode) {
      const query = item.address || `${item.city}, ${item.state}`;
      const result = await nominatimForward(query);
      if (result) {
        const geohash = ngeohash.encode(result.latitude, result.longitude, 7);
        fixable.push({ id: item.id, geohash });
        geocoded++;
      }

      if (geocoded % 50 === 0 && geocoded > 0) {
        console.log(`    ...${geocoded} ${table} geocoded`);
        saveGeocodeCache();
      }
    }

    console.log(`  Forward geocoded: ${geocoded}/${toGeocode.length}`);

    if (!DRY_RUN && fixable.length > 0) {
      const fixed = await batchUpdate(table, fixable, 'geohash');
      console.log(`  ✅ Fixed geohash for ${fixed} ${table}`);
      totalFixed += fixed;

      // Also set PostGIS location via SQL (can't do it from JS easily)
      console.log(`  ℹ️ To also set PostGIS location column, run:`);
      console.log(`     UPDATE ${table} SET location = ST_SetSRID(ST_MakePoint(` +
        `(SELECT ST_X(ST_PointFromGeoHash(geohash))), ` +
        `(SELECT ST_Y(ST_PointFromGeoHash(geohash)))), 4326) ` +
        `WHERE location IS NULL AND geohash IS NOT NULL;`);
    }
  }

  saveGeocodeCache();
}

// ==========================================
// 6. CATEGORIZE UNCATEGORIZED EVENTS
// ==========================================

async function fixMissingCategories() {
  console.log('\n🏷️ CATEGORIZE UNCATEGORIZED EVENTS');
  console.log('─'.repeat(50));

  const events = await fetchAll('events', 'id, name, description, category, venue');
  const uncategorized = events.filter(e => !e.category || e.category === 'Uncategorized');

  console.log(`  Events without category: ${uncategorized.length}`);

  if (uncategorized.length === 0) {
    console.log('  All events categorized ✓');
    return;
  }

  const fixable = [];
  for (const event of uncategorized) {
    const { parentCategory } = categorizeEvent({
      name: event.name || '',
      description: event.description || ''
    });

    // Events table only has 'category' column — no display_category or subcategory
    if (parentCategory) {
      fixable.push({ id: event.id, category: parentCategory });
    }
  }

  console.log(`  Can categorize: ${fixable.length}/${uncategorized.length}`);

  // Show category breakdown
  const byCat = {};
  for (const f of fixable) {
    byCat[f.category] = (byCat[f.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${cat}: ${count}`);
  }

  if (!DRY_RUN && fixable.length > 0) {
    const fixed = await batchUpdate('events', fixable, 'categories');
    console.log(`  ✅ Categorized ${fixed} events`);
    totalFixed += fixed;
  }
}

// ==========================================
// 7. CLEAR STALE SCRAPER LOG ERRORS
// ==========================================

async function fixStaleScraperLogs() {
  console.log('\n🧹 STALE SCRAPER LOG CLEANUP');
  console.log('─'.repeat(50));

  const logs = await fetchAll('scraper_logs', 'id, scraper_name, status, error_message');

  const stalePatterns = [
    'dataType',
    'invalid input syntax for type uuid',
    'Scraper file not found',
    "Cannot find module '@sparticuz/chromium'",
    "Cannot find module 'xml2js'",
  ];

  const staleLogs = logs.filter(log =>
    log.error_message && stalePatterns.some(p => log.error_message.includes(p))
  );

  console.log(`  Total scraper logs: ${logs.length}`);
  console.log(`  Logs with stale/fixed errors: ${staleLogs.length}`);

  if (staleLogs.length > 0) {
    const byError = {};
    for (const log of staleLogs) {
      const key = stalePatterns.find(p => log.error_message.includes(p)) || 'other';
      byError[key] = (byError[key] || 0) + 1;
    }
    for (const [pattern, count] of Object.entries(byError)) {
      console.log(`    "${pattern}": ${count} entries`);
    }

    if (!DRY_RUN) {
      const ids = staleLogs.map(l => l.id);
      for (let i = 0; i < ids.length; i += 500) {
        const batch = ids.slice(i, i + 500);
        await supabase.from('scraper_logs').delete().in('id', batch);
      }
      console.log(`  ✅ Deleted ${staleLogs.length} stale log entries`);
      totalFixed += staleLogs.length;
    }
  }
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('  FUNHIVE DATA QUALITY FIX v2');
  console.log('═'.repeat(60));
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (use --save to apply)' : '💾 SAVING CHANGES'}`);

  if (RUN_ALL || PAST_ONLY) {
    await fixPastEvents();
  }

  // Venue propagation runs early — fast, no API calls, fixes bulk of missing data
  let venueLookup = {};
  if (RUN_ALL) {
    venueLookup = await propagateFromVenues();
    await fixMissingStates(venueLookup);
    await fixMissingCity(venueLookup);
  }

  if (RUN_ALL || ADDRESS_ONLY) {
    await fixMissingAddresses();
  }

  if (RUN_ALL || GEO_ONLY) {
    await fixMissingGeohash();
  }

  if (RUN_ALL || CATEGORY_ONLY) {
    await fixMissingCategories();
  }

  if (RUN_ALL) {
    await fixStaleScraperLogs();
  }

  // Final cache save
  saveGeocodeCache();

  console.log('\n' + '═'.repeat(60));
  if (DRY_RUN) {
    console.log('  🔍 DRY RUN COMPLETE — no changes made');
    console.log('  Run with --save to apply fixes');
  } else {
    console.log(`  ✅ FIX COMPLETE — ${totalFixed} items fixed`);
    if (nominatimCallCount > 0) {
      console.log(`  📍 Nominatim API calls made: ${nominatimCallCount}`);
    }
  }
  console.log('═'.repeat(60) + '\n');
}

main().then(() => process.exit(0)).catch(e => { console.error('❌ Fatal error:', e); process.exit(1); });
