const { launchBrowser } = require('./helpers/puppeteer-config');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * Vermont Public Libraries Scraper - Coverage: All Vermont public libraries
 */
const LIBRARIES = [
  { name: 'Fletcher Free Library', url: 'https://fletcherfree.org/', eventsUrl: 'https://fletcherfree.org/', city: 'Burlington', state: 'VT', zipCode: '05401', county: 'Burlington County'},
  { name: 'Kellogg-Hubbard Library', url: 'https://kellogghubbard.org/', eventsUrl: 'https://kellogghubbard.org/calendar/', city: 'Montpelier', state: 'VT', zipCode: '05602', county: 'Montpelier County'},
  { name: 'Brooks Memorial Library', url: 'https://www.brookslibraryvt.org', eventsUrl: 'https://www.brookslibraryvt.org/events', city: 'Brattleboro', state: 'VT', zipCode: '05301', county: 'Brattleboro County'},
  { name: 'St. Johnsbury Athenaeum', url: 'https://www.stjathenaeum.org', eventsUrl: 'https://www.stjathenaeum.org/events', city: 'St. Johnsbury', state: 'VT', zipCode: '05819', county: 'St. Johnsbury County'},
  { name: 'Ilsley Public Library', url: 'https://www.ilsleypubliclibrary.org', eventsUrl: 'https://www.ilsleypubliclibrary.org/events', city: 'Middlebury', state: 'VT', zipCode: '05753', county: 'Middlebury County'},
  { name: 'Norman Williams Public Library', url: 'https://www.normanwilliams.org', eventsUrl: 'https://www.normanwilliams.org/events', city: 'Woodstock', state: 'VT', zipCode: '05091', county: 'Woodstock County'},
  { name: 'Aldrich Public Library', url: 'https://www.aldrichpubliclibrary.org', eventsUrl: 'https://www.aldrichpubliclibrary.org/events', city: 'Barre', state: 'VT', zipCode: '05641', county: 'Barre County'},
  { name: 'Brownell Library', url: 'https://www.brownelllibrary.org', eventsUrl: 'https://www.brownelllibrary.org/events', city: 'Essex Junction', state: 'VT', zipCode: '05452', county: 'Essex Junction County'},
  { name: 'Pierson Library', url: 'https://www.piersonlibrary.org', eventsUrl: 'https://www.piersonlibrary.org/events', city: 'Shelburne', state: 'VT', zipCode: '05482', county: 'Shelburne County'},
  { name: 'Rockingham Free Public Library', url: 'https://www.rockinghamlibrary.org', eventsUrl: 'https://www.rockinghamlibrary.org/events', city: 'Bellows Falls', state: 'VT', zipCode: '05101', county: 'Bellows Falls County'},
  { name: 'Springfield Town Library', url: 'https://www.springfieldtownlibrary.org/', eventsUrl: 'https://www.springfieldtownlibrary.org/calendar', city: 'Springfield', state: 'VT', zipCode: '05156', county: 'Springfield County'},
  { name: 'Morristown Centennial Library', url: 'https://www.centenniallibrary.org/', eventsUrl: 'https://www.centenniallibrary.org/', city: 'Morrisville', state: 'VT', zipCode: '05661', county: 'Morrisville County'},
  { name: 'Haskell Free Library', url: 'https://www.haskellopera.com/library', eventsUrl: 'https://www.haskellopera.com/library/events', city: 'Derby Line', state: 'VT', zipCode: '05830', county: 'Derby Line County'},
  { name: 'Cobleigh Public Library', url: 'https://www.cobleighlibrary.org', eventsUrl: 'https://www.cobleighlibrary.org/events', city: 'Lyndonville', state: 'VT', zipCode: '05851', county: 'Lyndonville County'},
  { name: 'Hartland Public Library', url: 'https://www.hartlandlibraryvt.org/', eventsUrl: 'https://www.hartlandlibraryvt.org/calendar/', city: 'Hartland', state: 'VT', zipCode: '05048', county: 'Hartland County'},
  { name: 'Deborah Rawson Memorial Library', url: 'https://www.drml.org/', eventsUrl: 'https://www.drml.org/programs/calendar/', city: 'Jericho', state: 'VT', zipCode: '05465', county: 'Jericho County'},
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Martha Canfield Memorial', url: 'https://www.arlingtonlibrary.org/', eventsUrl: 'https://www.arlingtonlibrary.org/home', city: 'Arlington', state: 'VT', zipCode: '05250', county: 'Arlington County'},
  { name: 'Barton Public', url: 'https://www.bartonlibrary.org', eventsUrl: 'https://www.bartonlibrary.org/events', city: 'Barton', state: 'VT', zipCode: '05822', county: 'Barton County'},
  { name: 'Mount Holly', url: 'https://smcl.org/', eventsUrl: 'https://smcl.org/', city: 'Belmont', state: 'VT', zipCode: '05730', county: 'Belmont County'},
  { name: 'Bennington Free', url: 'https://www.benningtonlibrary.org', eventsUrl: 'https://www.benningtonlibrary.org/events', city: 'Bennington', state: 'VT', zipCode: '05201', county: 'Bennington County'},
  { name: 'Benson Public', url: 'https://www.bensonlibrary.org', eventsUrl: 'https://www.bensonlibrary.org/events', city: 'Benson', state: 'VT', zipCode: '05731', county: 'Benson County'},
  { name: 'Bethel Public', url: 'https://www.bethellibrary.org', eventsUrl: 'https://www.bethellibrary.org/events', city: 'Bethel', state: 'VT', zipCode: '05032', county: 'Bethel County'},
  { name: 'Bradford Public', url: 'https://bradfordlibrary.org/', eventsUrl: 'https://bradfordlibrary.org/', city: 'Bradford', state: 'VT', zipCode: '05033', county: 'Bradford County'},
  { name: 'Brandon Free Public', url: 'https://www.brandonlibrary.org/', eventsUrl: 'https://www.brandonlibrary.org/events-calendar', city: 'Brandon', state: 'VT', zipCode: '05733', county: 'Brandon County'},
  { name: 'Brookfield Free Public', url: 'https://www.brookfieldlibrary.org', eventsUrl: 'https://www.brookfieldlibrary.org/events', city: 'Brookfield', state: 'VT', zipCode: '05036', county: 'Brookfield County'},
  { name: 'Cabot Public', url: 'https://www.cabotlibrary.org', eventsUrl: 'https://www.cabotlibrary.org/events', city: 'Cabot', state: 'VT', zipCode: '05647', county: 'Cabot County'},
  { name: 'Alice M. Ward Memorial', url: 'https://www.canaanlibrary.org', eventsUrl: 'https://www.canaanlibrary.org/events', city: 'Canaan', state: 'VT', zipCode: '05903', county: 'Canaan County'},
  { name: 'Charlotte', url: 'https://charlottelibrary.org/', eventsUrl: 'https://charlottelibrary.org/calendar/', city: 'Charlotte', state: 'VT', zipCode: '05445', county: 'Charlotte County'},
  { name: 'Chelsea Public', url: 'https://www.chelsealibrary.org', eventsUrl: 'https://www.chelsealibrary.org/events', city: 'Chelsea', state: 'VT', zipCode: '05038', county: 'Chelsea County'},
  { name: 'Whiting', url: 'https://www.chesterlibrary.org/', eventsUrl: 'https://www.chesterlibrary.org/', city: 'Chester', state: 'VT', zipCode: '05143', county: 'Chester County'},
  { name: 'Concord Public Library', url: 'https://www.concordlibrary.org', eventsUrl: 'https://www.concordlibrary.org/events', city: 'Concord', state: 'VT', zipCode: '05824', county: 'Concord County'},
  { name: 'Cornwall Free Public', url: 'https://www.cornwalllibrary.org', eventsUrl: 'https://www.cornwalllibrary.org/events', city: 'Cornwall', state: 'VT', zipCode: '05753', county: 'Cornwall County'},
  { name: 'Pope Memorial', url: 'https://www.danvillelibrary.org', eventsUrl: 'https://www.danvillelibrary.org/events', city: 'Danville', state: 'VT', zipCode: '05828', county: 'Danville County'},
  { name: 'Essex Free', url: 'https://www.essexlibrary.org', eventsUrl: 'https://www.essexlibrary.org/events', city: 'Essex', state: 'VT', zipCode: '05451', county: 'Essex County'},
  { name: 'Fair Haven Free', url: 'https://fairhavenlibrary.org/', eventsUrl: 'https://fairhavenlibrary.org/', city: 'Fair Haven', state: 'VT', zipCode: '05743', county: 'Fair Haven County'},
  { name: 'Fairfax Community', url: 'https://www.fairfaxlibrary.org', eventsUrl: 'https://www.fairfaxlibrary.org/events', city: 'Fairfax', state: 'VT', zipCode: '05454', county: 'Fairfax County'},
  { name: 'Bent Northrup Memorial', url: 'https://fairfieldlibrary.org/', eventsUrl: 'https://fairfieldlibrary.org/', city: 'Fairfield', state: 'VT', zipCode: '05455', county: 'Fairfield County'},
  { name: 'Haston', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'VT', zipCode: '05457', county: 'Franklin County'},
  { name: 'Gilman Public Library', url: 'https://gilmanlibrary.org/', eventsUrl: 'https://gilmanlibrary.org/calendar', city: 'Gilman', state: 'VT', zipCode: '05904', county: 'Gilman County'},
  { name: 'Glover Public', url: 'https://gloverlibrary.org/', eventsUrl: 'https://gloverlibrary.org/', city: 'Glover', state: 'VT', zipCode: '05839', county: 'Glover County'},
  { name: 'Grafton Public', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'VT', zipCode: '05146', county: 'Grafton County'},
  { name: 'Greensboro Free', url: 'https://www.greensborolibrary.org', eventsUrl: 'https://www.greensborolibrary.org/events', city: 'Greensboro', state: 'VT', zipCode: '05841', county: 'Greensboro County'},
  { name: 'Hancock Free Public', url: 'https://hancocklibrary.org/', eventsUrl: 'https://hancocklibrary.org/', city: 'Hancock', state: 'VT', zipCode: '05748', county: 'Hancock County'},
  { name: 'Hartford', url: 'https://www.hartfordlibrary.org', eventsUrl: 'https://www.hartfordlibrary.org/events', city: 'Hartford', state: 'VT', zipCode: '05047', county: 'Hartford County'},
  { name: 'Huntington Public', url: 'https://www.huntingtonlibrary.org/', eventsUrl: 'https://www.huntingtonlibrary.org/', city: 'Huntington', state: 'VT', zipCode: '05462', county: 'Huntington County'},
  { name: 'Lanpher Memorial', url: 'https://www.hydeparklibrary.org', eventsUrl: 'https://www.hydeparklibrary.org/events', city: 'Hyde Park', state: 'VT', zipCode: '05655', county: 'Hyde Park County'},
  { name: 'Lincoln', url: 'https://www.lincolnlibrary.org', eventsUrl: 'https://www.lincolnlibrary.org/events', city: 'Lincoln', state: 'VT', zipCode: '05443', county: 'Lincoln County'},
  { name: 'Lowell Community', url: 'https://www.lowelllibrary.org', eventsUrl: 'https://www.lowelllibrary.org/events', city: 'Lowell', state: 'VT', zipCode: '05847', county: 'Lowell County'},
  { name: 'Alden Balch Memorial', url: 'https://lunenburglibrary.org/', eventsUrl: 'https://lunenburglibrary.org/', city: 'Lunenburg', state: 'VT', zipCode: '05906', county: 'Lunenburg County'},
  { name: 'Mark Skinner', url: 'https://www.manchesterlibrary.org', eventsUrl: 'https://www.manchesterlibrary.org/events', city: 'Manchester', state: 'VT', zipCode: '05254', county: 'Manchester County'},
  { name: 'Jaquith Public', url: 'https://marshfieldlibrary.org/', eventsUrl: 'https://marshfieldlibrary.org/', city: 'Marshfield', state: 'VT', zipCode: '05658', county: 'Marshfield County'},
  { name: 'Milton Public Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'VT', zipCode: '05468', county: 'Milton County'},
  { name: 'Russell Memorial', url: 'https://www.monktonlibrary.org', eventsUrl: 'https://www.monktonlibrary.org/events', city: 'Monkton', state: 'VT', zipCode: '05469', county: 'Monkton County'},
  { name: 'Tenney Memorial', url: 'https://www.newburylibrary.org', eventsUrl: 'https://www.newburylibrary.org/events', city: 'Newbury', state: 'VT', zipCode: '05051', county: 'Newbury County'},
  { name: 'Moore Free', url: 'https://www.newfanelibrary.org', eventsUrl: 'https://www.newfanelibrary.org/events', city: 'Newfane', state: 'VT', zipCode: '05345', county: 'Newfane County'},
  { name: 'Goodrich Memorial', url: 'https://www.newportlibrary.org', eventsUrl: 'https://www.newportlibrary.org/events', city: 'Newport', state: 'VT', zipCode: '05855', county: 'Newport County'},
  { name: 'North Hero Public', url: 'https://northherolibrary.org/', eventsUrl: 'https://northherolibrary.org/', city: 'North Hero', state: 'VT', zipCode: '05474', county: 'North Hero County'},
  { name: 'Norwich Public', url: 'https://www.norwichlibrary.org/', eventsUrl: 'https://www.norwichlibrary.org/category/events/', city: 'Norwich', state: 'VT', zipCode: '05055', county: 'Norwich County'},
  { name: 'Peacham', url: 'https://www.peachamlibrary.org/', eventsUrl: 'https://www.peachamlibrary.org/', city: 'Peacham', state: 'VT', zipCode: '05862', county: 'Peacham County'},
  { name: 'Roger Clark Memorial', url: 'https://www.pittsfieldlibrary.org/', eventsUrl: 'https://www.pittsfieldlibrary.org/', city: 'Pittsfield', state: 'VT', zipCode: '05762', county: 'Pittsfield County'},
  { name: 'Cutler Memorial', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'VT', zipCode: '05667', county: 'Plainfield County'},
  { name: 'Proctor Free', url: 'https://www.proctorlibrary.org', eventsUrl: 'https://www.proctorlibrary.org/events', city: 'Proctor', state: 'VT', zipCode: '05765', county: 'Proctor County'},
  { name: 'Putney Public', url: 'https://www.putneylibrary.org', eventsUrl: 'https://www.putneylibrary.org/events', city: 'Putney', state: 'VT', zipCode: '05346', county: 'Putney County'},
  { name: 'Quechee', url: 'https://www.quecheeandwilderlibraries.com/', eventsUrl: 'https://www.quecheeandwilderlibraries.com/', city: 'Quechee', state: 'VT', zipCode: '05059', county: 'Quechee County'},
  { name: 'Kimball Public', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'VT', zipCode: '05060', county: 'Randolph County'},
  { name: 'Reading Public', url: 'https://www.readinglibrary.org', eventsUrl: 'https://www.readinglibrary.org/events', city: 'Reading', state: 'VT', zipCode: '05060', county: 'Reading County'},
  { name: 'Readsboro Community', url: 'https://www.readsborolibrary.org', eventsUrl: 'https://www.readsborolibrary.org/events', city: 'Readsboro', state: 'VT', zipCode: '05350', county: 'Readsboro County'},
  { name: 'Richmond Free', url: 'https://www.richmondlibrary.org', eventsUrl: 'https://www.richmondlibrary.org/events', city: 'Richmond', state: 'VT', zipCode: '05477', county: 'Richmond County'},
  { name: 'Rochester Public', url: 'https://www.rochesterlibrary.org/', eventsUrl: 'https://www.rochesterlibrary.org/', city: 'Rochester', state: 'VT', zipCode: '05767', county: 'Rochester County'},
  { name: 'Roxbury Free', url: 'https://www.roxburylibrary.org', eventsUrl: 'https://www.roxburylibrary.org/events', city: 'Roxbury', state: 'VT', zipCode: '05669', county: 'Roxbury County'},
  { name: 'Salisbury Free Public', url: 'https://www.salisburylibrary.org/', eventsUrl: 'https://www.salisburylibrary.org/', city: 'Salisbury', state: 'VT', zipCode: '05769', county: 'Salisbury County'},
  { name: 'Sheldon Public', url: 'https://www.sheldonlibrary.org', eventsUrl: 'https://www.sheldonlibrary.org/events', city: 'Sheldon', state: 'VT', zipCode: '05483', county: 'Sheldon County'},
  { name: 'Shrewsbury', url: 'https://www.shrewsburylibrary.org', eventsUrl: 'https://www.shrewsburylibrary.org/events', city: 'Shrewsbury', state: 'VT', zipCode: '05738', county: 'Shrewsbury County'},
  { name: 'Stamford Community', url: 'https://www.stamfordlibrary.org', eventsUrl: 'https://www.stamfordlibrary.org/events', city: 'Stamford', state: 'VT', zipCode: '05352', county: 'Stamford County'},
  { name: 'Stowe Free', url: 'https://www.stowelibrary.org', eventsUrl: 'https://www.stowelibrary.org/events', city: 'Stowe', state: 'VT', zipCode: '05672', county: 'Stowe County'},
  { name: 'Morrill Mem. Harris', url: 'https://www.straffordlibrary.org/', eventsUrl: 'https://www.straffordlibrary.org/', city: 'Strafford', state: 'VT', zipCode: '05072', county: 'Strafford County'},
  { name: 'Franklin-Grand Isle Bookmobile', url: 'https://www.swantonlibrary.org', eventsUrl: 'https://www.swantonlibrary.org/events', city: 'Swanton', state: 'VT', zipCode: '05488', county: 'Swanton County'},
  { name: 'Latham Memorial', url: 'https://www.thetfordlibrary.org', eventsUrl: 'https://www.thetfordlibrary.org/events', city: 'Thetford', state: 'VT', zipCode: '05074', county: 'Thetford County'},
  { name: 'Tunbridge Public', url: 'https://www.tunbridgelibrary.org', eventsUrl: 'https://www.tunbridgelibrary.org/events', city: 'Tunbridge', state: 'VT', zipCode: '05077', county: 'Tunbridge County'},
  { name: 'Vernon Free', url: 'https://www.vernonlibrary.org/', eventsUrl: 'https://www.vernonlibrary.org/', city: 'Vernon', state: 'VT', zipCode: '05354', county: 'Vernon County'},
  { name: 'Gilbert Hart', url: 'https://www.wallingfordlibrary.org', eventsUrl: 'https://www.wallingfordlibrary.org/events', city: 'Wallingford', state: 'VT', zipCode: '05773', county: 'Wallingford County'},
  { name: 'Warren Public', url: 'https://www.warrenlibrary.org', eventsUrl: 'https://www.warrenlibrary.org/events', city: 'Warren', state: 'VT', zipCode: '05674', county: 'Warren County'},
  { name: 'Waterville Town', url: 'https://www.watervillelibrary.org', eventsUrl: 'https://www.watervillelibrary.org/events', city: 'Waterville', state: 'VT', zipCode: '05492', county: 'Waterville County'},
  { name: 'Wells Village', url: 'https://wellslibrary.org/', eventsUrl: 'https://wellslibrary.org/', city: 'Wells', state: 'VT', zipCode: '05774', county: 'Wells County'},
  { name: 'West Hartford', url: 'https://www.westhartfordlibrary.org/', eventsUrl: 'https://www.westhartfordlibrary.org/', city: 'West Hartford', state: 'VT', zipCode: '05084', county: 'West Hartford County'},
  { name: 'Hitchcock Museum', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'VT', zipCode: '05874', county: 'Westfield County'},
  { name: 'Westford Town', url: 'https://www.westfordlibrary.org', eventsUrl: 'https://www.westfordlibrary.org/events', city: 'Westford', state: 'VT', zipCode: '05494', county: 'Westford County'},
  { name: 'Butterfield', url: 'https://www.westminsterlibrary.org', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'VT', zipCode: '05158', county: 'Westminster County'},
  { name: 'Westminster West Public', url: 'https://www.westminsterwestlibrary.org', eventsUrl: 'https://www.westminsterwestlibrary.org/events', city: 'Westminster West', state: 'VT', zipCode: '05346', county: 'Westminster West County'},
  { name: 'Wilder Memorial', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'VT', zipCode: '05161', county: 'Weston County'},
  { name: 'Ainsworth Public', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'VT', zipCode: '05679', county: 'Williamstown County'},
  { name: 'Pettee Memorial', url: 'https://www.wilmingtonlibrary.org', eventsUrl: 'https://www.wilmingtonlibrary.org/events', city: 'Wilmington', state: 'VT', zipCode: '05363', county: 'Wilmington County'},
  { name: 'Windham Town', url: 'https://windhamlibrary.org/', eventsUrl: 'https://windhamlibrary.org/', city: 'Windham', state: 'VT', zipCode: '05359', county: 'Windham County'},
  { name: 'Windsor Public', url: 'https://www.windsorlibrary.org', eventsUrl: 'https://www.windsorlibrary.org/events', city: 'Windsor', state: 'VT', zipCode: '05089', county: 'Windsor County'},
  { name: 'G. M. Kelley Community', url: 'https://www.wolcottlibrary.org', eventsUrl: 'https://www.wolcottlibrary.org/events', city: 'Wolcott', state: 'VT', zipCode: '05680', county: 'Wolcott County'},
  { name: 'Woodbury Community', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'VT', zipCode: '05681', county: 'Woodbury County'}

];

const SCRAPER_NAME = 'wordpress-VT';

async function scrapeGenericEvents() {
  const browser = await launchBrowser();
  const events = [];
  for (const library of LIBRARIES) {
    try {
      const page = await browser.newPage();
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        document.querySelectorAll('[class*="event"], article, .post').forEach(card => {
          const title = card.querySelector('h1, h2, h3, h4, [class*="title"], a');
          const date = card.querySelector('[class*="date"], time');
          if (title && title.textContent.trim()) {
            // Look for age/audience info on the event card
            const ageEl = card ? [card.querySelector('[class*="audience"]'), card.querySelector('[class*="age"]'), card.querySelector('[class*="category"]')].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80) : null;
            const descEl = card.querySelector('[class*="description"], [class*="excerpt"], [class*="summary"], p');
            events.push({ title: title.textContent.trim(), date: date ? date.textContent.trim() : '', ageRange: ageEl ? ageEl.textContent.trim() : '', description: descEl ? descEl.textContent.trim() : '', location: libName, venueName: libName });
          }
        });
        const seen = new Set();
        return events.filter(e => { if (seen.has(e.title.toLowerCase())) return false; seen.add(e.title.toLowerCase()); return true; });
      }, library.name);
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'VT', city: library.city, zipCode: library.zipCode }}));
      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) { console.error(`Error: ${library.name}:`, error.message); }
  }
  await browser.close();
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'VT',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressVTCloudFunction() {
  console.log('☁️ Running WordPress VT as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-VT', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-VT', {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  }, { dataType: 'events' });

  return {
    found: events.length,
    new: result?.saved || 0,
    duplicates: result?.skipped || 0,
    invalidDate: result?.invalidDate || 0
  };
}

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressVTCloudFunction };
