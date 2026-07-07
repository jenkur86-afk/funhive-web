const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Minnesota Public Libraries Scraper
 * State: MN
 * Coverage: All Minnesota Public Libraries
 */

const LIBRARIES = [
  // Major Metro Libraries
  { name: 'Minneapolis Public Library', url: 'https://www.hclib.org', eventsUrl: 'https://www.hclib.org/events', city: 'Minneapolis', state: 'MN', zipCode: '55401', county: 'Hennepin County'},
  { name: 'St. Paul Public Library', url: 'https://sppl.org', eventsUrl: 'https://sppl.org/events', city: 'St. Paul', state: 'MN', zipCode: '55102', county: 'Ramsey County'},
  { name: 'Duluth Public Library', url: 'https://duluthlibrary.org/', eventsUrl: 'https://duluthlibrary.org/', city: 'Duluth', state: 'MN', zipCode: '55802', county: 'St. Louis County'},
  // Regional Libraries
  { name: 'Bloomington Public Library', url: 'https://www.bloomingtonmn.gov/library', eventsUrl: 'https://www.bloomingtonmn.gov/library/events', city: 'Bloomington', state: 'MN', zipCode: '55431', county: 'Hennepin County'},
  { name: 'Plymouth Public Library', url: 'https://www.plymouthmn.gov/library', eventsUrl: 'https://www.plymouthmn.gov/library/events', city: 'Plymouth', state: 'MN', zipCode: '55441', county: 'Hennepin County'},
  { name: 'Edina Public Library', url: 'https://www.edinamn.gov/library', eventsUrl: 'https://www.edinamn.gov/library/events', city: 'Edina', state: 'MN', zipCode: '55424', county: 'Hennepin County'},
  { name: 'Moorhead Public Library', url: 'https://www.larl.org', eventsUrl: 'https://www.larl.org/events', city: 'Moorhead', state: 'MN', zipCode: '56560', county: 'Clay County'},
  { name: 'Dakota County Library', url: 'https://www.dakotacounty.us/library', eventsUrl: 'https://www.dakotacounty.us/library/events', city: 'Apple Valley', state: 'MN', zipCode: '55124', county: 'Dakota County'},
  { name: 'Anoka County Library', url: 'https://www.anokacounty.us/library', eventsUrl: 'https://www.anokacounty.us/library/events', city: 'Blaine', state: 'MN', zipCode: '55434', county: 'Anoka County'},
  { name: 'Washington County Library', url: 'https://www.washcolib.org', eventsUrl: 'https://www.washcolib.org/events', city: 'Woodbury', state: 'MN', zipCode: '55125', county: 'Washington County'},
  { name: 'Scott County Library', url: 'https://www.scottlib.org', eventsUrl: 'https://www.scottlib.org/events', city: 'Savage', state: 'MN', zipCode: '55378', county: 'Scott County'},
  { name: 'Ramsey County Library', url: 'https://www.rclreads.org/', eventsUrl: 'https://www.rclreads.org/', city: 'Roseville', state: 'MN', zipCode: '55113', county: 'Ramsey County'},
  { name: 'Minnetonka Library', url: 'https://www.minnetonkamn.gov/library', eventsUrl: 'https://www.minnetonkamn.gov/library/events', city: 'Minnetonka', state: 'MN', zipCode: '55305', county: 'Hennepin County'},
  { name: 'Brooklyn Park Library', url: 'https://www.brooklynpark.org/', eventsUrl: 'https://www.brooklynpark.org/events/', city: 'Brooklyn Park', state: 'MN', zipCode: '55443', county: 'Hennepin County'},
  { name: 'Eagan Library', url: 'https://www.eaganmn.gov/library', eventsUrl: 'https://www.eaganmn.gov/library/events', city: 'Eagan', state: 'MN', zipCode: '55121', county: 'Dakota County'},
  { name: 'Burnsville Library', url: 'https://www.burnsville.org/library', eventsUrl: 'https://www.burnsville.org/library/events', city: 'Burnsville', state: 'MN', zipCode: '55337', county: 'Dakota County'},
  { name: 'Woodbury Library', url: 'https://www.woodburymn.gov/library', eventsUrl: 'https://www.woodburymn.gov/library/events', city: 'Woodbury', state: 'MN', zipCode: '55125', county: 'Washington County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Ada Public Library', url: 'https://www.adalibrary.org/', eventsUrl: 'https://www.adalibrary.org/', city: 'Ada', state: 'MN', zipCode: '56510', county: 'Ada County'},
  { name: 'Douglas County Library', url: 'https://www.alexandrialibrary.org', eventsUrl: 'https://www.alexandrialibrary.org/events', city: 'Alexandria', state: 'MN', zipCode: '56308', county: 'Alexandria County'},
  { name: 'Arlington Public Library', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'MN', zipCode: '00000', county: 'Arlington County'},
  { name: 'Aurora Public Library', url: 'https://www.auroralibrary.org', eventsUrl: 'https://www.auroralibrary.org/events', city: 'Aurora', state: 'MN', zipCode: '55705', county: 'Aurora County'},
  { name: 'Austin Public Library', url: 'https://www.austinlibrary.org', eventsUrl: 'https://www.austinlibrary.org/events', city: 'Austin', state: 'MN', zipCode: '55912', county: 'Austin County'},
  { name: 'Bayport Public Library', url: 'https://www.bayportlibrary.org/', eventsUrl: 'https://www.bayportlibrary.org/', city: 'Bayport', state: 'MN', zipCode: '55003', county: 'Bayport County'},
  { name: 'Great River Regional Library - Belgrade (Myrtle Mabee Library)', url: 'https://www.belgrademt.gov/', eventsUrl: 'https://www.belgrademt.gov/544/Library', city: 'Belgrade', state: 'MN', zipCode: '56312', county: 'Belgrade County'},
  { name: 'Benson Public Library', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'MN', zipCode: '00000', county: 'Benson County'},
  { name: 'Brainerd Public Library', url: 'https://www.brainerdlibrary.org', eventsUrl: 'https://www.brainerdlibrary.org/events', city: 'Brainerd', state: 'MN', zipCode: '00000', county: 'Brainerd County'},
  { name: 'Great River Regional Library - Buffalo Branch', url: 'https://www.buffalolibrary.org', eventsUrl: 'https://www.buffalolibrary.org/events', city: 'Buffalo', state: 'MN', zipCode: '00000', county: 'Buffalo County'},
  { name: 'Butterfield Branch Library', url: 'https://www.butterfieldlibrary.org', eventsUrl: 'https://www.butterfieldlibrary.org/events', city: 'Butterfield', state: 'MN', zipCode: '00000', county: 'Butterfield County'},
  { name: 'Caledonia Public Library', url: 'https://www.caledonialibrary.org', eventsUrl: 'https://www.caledonialibrary.org/events', city: 'Caledonia', state: 'MN', zipCode: '55921', county: 'Caledonia County'},
  { name: 'Cambridge Public Library', url: 'https://www.cambridgelibrary.org', eventsUrl: 'https://www.cambridgelibrary.org/events', city: 'Cambridge', state: 'MN', zipCode: '00000', county: 'Cambridge County'},
  { name: 'Canby Public Library', url: 'https://canbypubliclibrary.libcal.com/', eventsUrl: 'https://canbypubliclibrary.libcal.com/calendar', city: 'Canby', state: 'MN', zipCode: '00000', county: 'Canby County'},
  { name: 'Cleveland Public Library', url: 'https://clevelandlibrary.org/', eventsUrl: 'https://clevelandlibrary.org/', city: 'Cleveland', state: 'MN', zipCode: '00000', county: 'Cleveland County'},
  { name: 'Cloquet Public Library', url: 'https://www.cloquetlibrary.org', eventsUrl: 'https://www.cloquetlibrary.org/events', city: 'Cloquet', state: 'MN', zipCode: '55720', county: 'Cloquet County'},
  { name: 'Cosmos Public Library', url: 'https://www.cosmoslibrary.org', eventsUrl: 'https://www.cosmoslibrary.org/events', city: 'Cosmos', state: 'MN', zipCode: '00000', county: 'Cosmos County'},
  { name: 'Jessie F. Hallett Memorial Library', url: 'https://www.crosbylibrary.org', eventsUrl: 'https://www.crosbylibrary.org/events', city: 'Crosby', state: 'MN', zipCode: '56441', county: 'Crosby County'},
  { name: 'Edgerton Public Library', url: 'https://www.edgertonlibrary.org', eventsUrl: 'https://www.edgertonlibrary.org/events', city: 'Edgerton', state: 'MN', zipCode: '56128', county: 'Edgerton County'},
  { name: 'Elbow Lake Thorson Mem Library', url: 'https://www.elbowlakelibrary.org/', eventsUrl: 'https://www.elbowlakelibrary.org/client/en_US/el/', city: 'Elbow Lake', state: 'MN', zipCode: '56531', county: 'Elbow Lake County'},
  { name: 'Ely Public Library', url: 'https://www.elylibrary.org/', eventsUrl: 'https://www.elylibrary.org/', city: 'Ely', state: 'MN', zipCode: '55731', county: 'Ely County'},
  { name: 'Fairfax Public Library', url: 'https://www.fairfaxlibrary.org', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'MN', zipCode: '00000', county: 'Fairfax County'},
  { name: 'Farmington Community Library', url: 'https://www.farmingtonpublic.org/', eventsUrl: 'https://www.farmingtonpublic.org/', city: 'Farmington', state: 'MN', zipCode: '00000', county: 'Farmington County'},
  { name: 'Great River Regional Library - Foley', url: 'https://www.foleylibrary.org/', eventsUrl: 'https://www.foleylibrary.org/', city: 'Foley', state: 'MN', zipCode: '00000', county: 'Foley County'},
  { name: 'Fulda Memorial Library', url: 'https://www.fuldalibrary.org', eventsUrl: 'https://www.fuldalibrary.org/events', city: 'Fulda', state: 'MN', zipCode: '56131', county: 'Fulda County'},
  { name: 'Gaylord Public Library', url: 'https://gaylordlibrary.org/', eventsUrl: 'https://gaylordlibrary.org/', city: 'Gaylord', state: 'MN', zipCode: '00000', county: 'Gaylord County'},
  { name: 'Gilbert Public Library', url: 'https://www.gilbertlibrary.org/', eventsUrl: 'https://www.gilbertlibrary.org/', city: 'Gilbert', state: 'MN', zipCode: '55741', county: 'Gilbert County'},
  { name: 'Glencoe Public Library', url: 'https://www.glencoelibrary.org/', eventsUrl: 'https://www.glencoelibrary.org/', city: 'Glencoe', state: 'MN', zipCode: '00000', county: 'Glencoe County'},
  { name: 'Glenwood Public Library', url: 'https://glenwoodlibrary.org/', eventsUrl: 'https://glenwoodlibrary.org/', city: 'Glenwood', state: 'MN', zipCode: '56334', county: 'Glenwood County'},
  { name: 'Grand Marais Public Library', url: 'https://www.grandmaraislibrary.org/', eventsUrl: 'https://www.grandmaraislibrary.org/', city: 'Grand Marais', state: 'MN', zipCode: '55604', county: 'Grand Marais County'},
  { name: 'Hancock Community Library', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'MN', zipCode: '56244', county: 'Hancock County'},
  { name: 'Harmony Public Library', url: 'https://www.harmonylibrary.org', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Harmony', state: 'MN', zipCode: '55939', county: 'Harmony County'},
  { name: 'Pleasant Hill Library', url: 'https://hastingslibrary.org/', eventsUrl: 'https://hastingslibrary.org/calendar/', city: 'Hastings', state: 'MN', zipCode: '00000', county: 'Hastings County'},
  { name: 'Hawley Public Library', url: 'https://www.hawleylibrary.org/', eventsUrl: 'https://www.hawleylibrary.org/', city: 'Hawley', state: 'MN', zipCode: '00000', county: 'Hawley County'},
  { name: 'Hinckley Public Library', url: 'https://www.hinckleylibrary.org', eventsUrl: 'https://www.hinckleylibrary.org/events', city: 'Hinckley', state: 'MN', zipCode: '00000', county: 'Hinckley County'},
  { name: 'Hennepin County Library - Hopkins', url: 'https://www.hopkinslibrary.org/', eventsUrl: 'https://www.hopkinslibrary.org/calendar', city: 'Hopkins', state: 'MN', zipCode: '55343', county: 'Hopkins County'},
  { name: 'Houston Public Library', url: 'https://www.houstonlibrary.org', eventsUrl: 'https://www.houstonlibrary.org/events', city: 'Houston', state: 'MN', zipCode: '55943', county: 'Houston County'},
  { name: 'Hoyt Lakes Public Library', url: 'https://www.hoytlakeslibrary.org/', eventsUrl: 'https://www.hoytlakeslibrary.org/upcoming-events', city: 'Hoyt Lakes', state: 'MN', zipCode: '55750', county: 'Hoyt Lakes County'},
  { name: 'Ivanhoe Public Library', url: 'https://www.ivanhoelibrary.org', eventsUrl: 'https://www.ivanhoelibrary.org/events', city: 'Ivanhoe', state: 'MN', zipCode: '56142', county: 'Ivanhoe County'},
  { name: 'Jordan Branch Library', url: 'https://www.jordanlibrary.org', eventsUrl: 'https://www.jordanlibrary.org/events', city: 'Jordan', state: 'MN', zipCode: '00000', county: 'Jordan County'},
  { name: 'Great River Regional Library - Kimball', url: 'https://www.kimballlibrary.org', eventsUrl: 'https://www.kimballlibrary.org/events', city: 'Kimball', state: 'MN', zipCode: '00000', county: 'Kimball County'},
  { name: 'Lake Benton Public Library', url: 'https://www.lakebentonlibrary.org', eventsUrl: 'https://www.lakebentonlibrary.org/events', city: 'Lake Benton', state: 'MN', zipCode: '56149', county: 'Lake Benton County'},
  { name: 'Valley Library', url: 'https://llcoop.org/', eventsUrl: 'https://llcoop.org/calendar/', city: 'Lakeland', state: 'MN', zipCode: '55043', county: 'Lakeland County'},
  { name: 'Heritage Library', url: 'https://lakevillelibrary.org/', eventsUrl: 'https://lakevillelibrary.org/', city: 'Lakeville', state: 'MN', zipCode: '00000', county: 'Lakeville County'},
  { name: 'Lamberton Public Library', url: 'https://www.lambertonlibrary.org', eventsUrl: 'https://www.lambertonlibrary.org/events', city: 'Lamberton', state: 'MN', zipCode: '56152', county: 'Lamberton County'},
  { name: 'Le Roy Public Library', url: 'https://www.leroylibrary.org/', eventsUrl: 'https://www.leroylibrary.org/', city: 'Le Roy', state: 'MN', zipCode: '55951', county: 'Le Roy County'},
  { name: 'Great River Regional Library - Little Falls', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'MN', zipCode: '00000', county: 'Little Falls County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'MN', zipCode: '00000', county: 'Madison County'},
  { name: 'Maplewood Library', url: 'https://www.maplewoodlibrary.org/', eventsUrl: 'https://www.maplewoodlibrary.org/', city: 'Maplewood', state: 'MN', zipCode: '00000', county: 'Maplewood County'},
  { name: 'Marshall-Lyon County Library', url: 'https://www.marshalllibrary.org', eventsUrl: 'https://www.marshalllibrary.org/events', city: 'Marshall', state: 'MN', zipCode: '56258', county: 'Marshall County'},
  { name: 'Mckinley Public Library', url: 'https://sites.google.com/', eventsUrl: 'https://sites.google.com/view/mckinleylibrary', city: 'Mckinley', state: 'MN', zipCode: '55741', county: 'Mckinley County'},
  { name: 'Milan Public Library', url: 'https://milanlibrary.org/', eventsUrl: 'https://milanlibrary.org/', city: 'Milan', state: 'MN', zipCode: '00000', county: 'Milan County'},
  { name: 'Minneota Public Library', url: 'https://www.minneotalibrary.org', eventsUrl: 'https://www.minneotalibrary.org/events', city: 'Minneota', state: 'MN', zipCode: '56264', county: 'Minneota County'},
  { name: 'Montgomery Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'MN', zipCode: '00000', county: 'Montgomery County'},
  { name: 'Great River Regional Library - Monticello', url: 'https://www.allertonpubliclibrary.org/', eventsUrl: 'https://www.allertonpubliclibrary.org/calendar', city: 'Monticello', state: 'MN', zipCode: '00000', county: 'Monticello County'},
  { name: 'Morgan Public Library', url: 'https://www.morganlibrary.org', eventsUrl: 'https://www.morganlibrary.org/events', city: 'Morgan', state: 'MN', zipCode: '56266', county: 'Morgan County'},
  { name: 'Mountain Lake Public Library', url: 'https://www.mountainlakelibrary.org', eventsUrl: 'https://www.mountainlakelibrary.org/events', city: 'Mountain Lake', state: 'MN', zipCode: '56159', county: 'Mountain Lake County'},
  { name: 'New London Public Library', url: 'https://www.newlondonlibrary.org', eventsUrl: 'https://www.newlondonlibrary.org/events', city: 'New London', state: 'MN', zipCode: '00000', county: 'New London County'},
  { name: 'New Market Branch Library', url: 'https://newmarketlibrary.org/', eventsUrl: 'https://newmarketlibrary.org/index.html', city: 'New Market', state: 'MN', zipCode: '00000', county: 'New Market County'},
  { name: 'New Ulm Public Library', url: 'https://www.newulmmn.gov/', eventsUrl: 'https://www.newulmmn.gov/513/Library', city: 'New Ulm', state: 'MN', zipCode: '56073', county: 'New Ulm County'},
  { name: 'New York Mills Public Library', url: 'https://www.newyorkmillslibrary.org/', eventsUrl: 'https://www.newyorkmillslibrary.org/', city: 'New York Mills', state: 'MN', zipCode: '56567', county: 'New York Mills County'},
  { name: 'Newport Library and Community Center', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'MN', zipCode: '55055', county: 'Newport County'},
  { name: 'Norwood Young America Public Library', url: 'https://norwoodlibrary.org/', eventsUrl: 'https://norwoodlibrary.org/', city: 'Norwood', state: 'MN', zipCode: '00000', county: 'Norwood County'},
  { name: 'Perham Area Public Library', url: 'https://www.perhamlibrary.org/', eventsUrl: 'https://www.perhamlibrary.org/client/en_US/pe/', city: 'Perham', state: 'MN', zipCode: '56573', county: 'Perham County'},
  { name: 'Kitchigami Regional Library', url: 'https://www.pineriverlibrary.org', eventsUrl: 'https://www.pineriverlibrary.org/events', city: 'Pine River', state: 'MN', zipCode: '56474', county: 'Pine River County'},
  { name: 'Preston Public Library', url: 'https://prestonpubliclibrary.org/', eventsUrl: 'https://prestonpubliclibrary.org/events/', city: 'Preston', state: 'MN', zipCode: '55965', county: 'Preston County'},
  { name: 'Princeton Area Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'MN', zipCode: '00000', county: 'Princeton County'},
  { name: 'Redwood Falls Public Library', url: 'https://www.redwoodfallslibrary.org', eventsUrl: 'https://www.redwoodfallslibrary.org/events', city: 'Redwood Falls', state: 'MN', zipCode: '56283', county: 'Redwood Falls County'},
  { name: 'Hennepin County Library - Augsburg Park', url: 'https://www.richfieldlibrary.org', eventsUrl: 'https://www.richfieldlibrary.org/events', city: 'Richfield', state: 'MN', zipCode: '55423', county: 'Richfield County'},
  { name: 'Great River Regional Library - Richmond', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'MN', zipCode: '00000', county: 'Richmond County'},
  { name: 'Great River Regional Library - Royalton', url: 'https://www.royaltonlibrary.org', eventsUrl: 'https://www.royaltonlibrary.org/events', city: 'Royalton', state: 'MN', zipCode: '00000', county: 'Royalton County'},
  { name: 'Slayton Public Library', url: 'https://www.slaytonlibrary.org', eventsUrl: 'https://www.slaytonlibrary.org/events', city: 'Slayton', state: 'MN', zipCode: '56172', county: 'Slayton County'},
  { name: 'Spring Valley Public Library', url: 'https://www.springvalleylibrary.org', eventsUrl: 'https://www.springvalleylibrary.org/events', city: 'Spring Valley', state: 'MN', zipCode: '55975', county: 'Spring Valley County'},
  { name: 'Springfield Public Library', url: 'https://www.springfieldlibrary.org/', eventsUrl: 'https://www.springfieldlibrary.org/library/', city: 'Springfield', state: 'MN', zipCode: '56087', county: 'Springfield County'},
  { name: 'St. Francis Branch Library', url: 'https://www.stfrancislibrary.org', eventsUrl: 'https://www.stfrancislibrary.org/events', city: 'St Francis', state: 'MN', zipCode: '00000', county: 'St Francis County'},
  { name: 'St. Charles Public Library', url: 'https://www.scpld.org/', eventsUrl: 'https://www.scpld.org/', city: 'St. Charles', state: 'MN', zipCode: '55972', county: 'St. Charles County'},
  { name: 'Stewartville Public Library', url: 'https://stewartvillelibrary.org/', eventsUrl: 'https://stewartvillelibrary.org/calendar/', city: 'Stewartville', state: 'MN', zipCode: '55976', county: 'Stewartville County'},
  { name: 'Stillwater Public Library', url: 'https://www.stillwaterlibrary.org', eventsUrl: 'https://www.stillwaterlibrary.org/events', city: 'Stillwater', state: 'MN', zipCode: '55082', county: 'Stillwater County'},
  { name: 'Tracy Public Library', url: 'https://www.tracylibrary.org', eventsUrl: 'https://www.tracylibrary.org/events', city: 'Tracy', state: 'MN', zipCode: '56175', county: 'Tracy County'},
  { name: 'Tyler Public Library', url: 'https://www.tylerlibrary.com/', eventsUrl: 'https://www.tylerlibrary.com/Home', city: 'Tyler', state: 'MN', zipCode: '56178', county: 'Tyler County'},
  { name: 'Wabasso Public Library', url: 'https://www.wabassolibrary.org', eventsUrl: 'https://www.wabassolibrary.org/events', city: 'Wabasso', state: 'MN', zipCode: '56293', county: 'Wabasso County'},
  { name: 'Waldorf Public Library', url: 'https://www.waldorflibrary.org/', eventsUrl: 'https://www.waldorflibrary.org/', city: 'Waldorf', state: 'MN', zipCode: '00000', county: 'Waldorf County'},
  { name: 'Walker Public Library', url: 'https://www.westbrookmaine.gov/', eventsUrl: 'https://www.westbrookmaine.gov/936/Library', city: 'Walker', state: 'MN', zipCode: '00000', county: 'Walker County'},
  { name: 'Godel Memorial Library', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'MN', zipCode: '00000', county: 'Warren County'},
  { name: 'Watertown Library', url: 'https://www.watertownlibrary.org/', eventsUrl: 'https://www.watertownlibrary.org/', city: 'Watertown', state: 'MN', zipCode: '00000', county: 'Watertown County'},
  { name: 'Waterville Public Library', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'MN', zipCode: '00000', county: 'Waterville County'},
  { name: 'Wells Public Library', url: 'https://wellslibrary.org/', eventsUrl: 'https://wellslibrary.org/', city: 'Wells', state: 'MN', zipCode: '56097', county: 'Wells County'},
  { name: 'Westbrook Public Library', url: 'https://www.westbrooklibrary.org', eventsUrl: 'https://www.westbrooklibrary.org/events', city: 'Westbrook', state: 'MN', zipCode: '56183', county: 'Westbrook County'},
  { name: 'Wheaton Community Library', url: 'https://www.wheatonlibrary.org', eventsUrl: 'https://www.wheatonlibrary.org/events', city: 'Wheaton', state: 'MN', zipCode: '56296', county: 'Wheaton County'},
  { name: 'Windom Public Library', url: 'https://www.windomlibrary.org', eventsUrl: 'https://www.windomlibrary.org/events', city: 'Windom', state: 'MN', zipCode: '56101', county: 'Windom County'},
  { name: 'Winthrop Public Library', url: 'https://www.winthroplibrary.org/', eventsUrl: 'https://www.winthroplibrary.org/', city: 'Winthrop', state: 'MN', zipCode: '00000', county: 'Winthrop County'},

];

const SCRAPER_NAME = 'wordpress-MN';

async function scrapeGenericEvents() {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless
  });
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'MN', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'MN',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressMNCloudFunction() {
  console.log('☁️ Running WordPress MN as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-MN', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-MN', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressMNCloudFunction };
