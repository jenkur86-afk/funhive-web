const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * New Jersey Public Libraries Scraper - Coverage: All New Jersey public libraries
 */
const LIBRARIES = [
  { name: 'Absecon Public Library', url: 'https://www.abseconlibrary.org', eventsUrl: 'https://www.abseconlibrary.org/events', city: 'Absecon', state: 'NJ', zipCode: '08201', county: 'Absecon County'},
  { name: 'Lee Memorial Library', url: 'https://www.allendalelibrary.org', eventsUrl: 'https://www.allendalelibrary.org/events', city: 'Allendale', state: 'NJ', zipCode: '07401', county: 'Allendale County'},
  { name: 'W.H. Walters Free Public Library', url: 'https://www.alphalibrary.org', eventsUrl: 'https://www.alphalibrary.org/events', city: 'Alpha', state: 'NJ', zipCode: '08865', county: 'Alpha County'},
  { name: 'Asbury Park Free Public Library', url: 'https://www.asburyparklibrary.org', eventsUrl: 'https://www.asburyparklibrary.org/events', city: 'Asbury Park', state: 'NJ', zipCode: '07712', county: 'Asbury Park County'},
  { name: 'Waterford Township Public Library', url: 'https://www.atcolibrary.org', eventsUrl: 'https://www.atcolibrary.org/events', city: 'Atco', state: 'NJ', zipCode: '08004', county: 'Atco County'},
  { name: 'Atlantic City Free Public Library', url: 'https://www.atlanticcitylibrary.org', eventsUrl: 'https://www.atlanticcitylibrary.org/events', city: 'Atlantic City', state: 'NJ', zipCode: '08401', county: 'Atlantic City County'},
  { name: 'Atlantic Highlands Public Library', url: 'https://www.atlantichighlandslibrary.org', eventsUrl: 'https://www.atlantichighlandslibrary.org/events', city: 'Atlantic Highlands', state: 'NJ', zipCode: '07716', county: 'Atlantic Highlands County'},
  { name: 'Audubon Free Public Library', url: 'https://www.audubonlibrary.org', eventsUrl: 'https://www.audubonlibrary.org/events', city: 'Audubon', state: 'NJ', zipCode: '08106', county: 'Audubon County'},
  { name: 'Avalon Free Public Library', url: 'https://www.avalonlibrary.org', eventsUrl: 'https://www.avalonlibrary.org/events', city: 'Avalon', state: 'NJ', zipCode: '08202', county: 'Avalon County'},
  { name: 'Libraries Of Middlesex Automation Consortium', url: 'https://www.avenellibrary.org', eventsUrl: 'https://www.avenellibrary.org/events', city: 'Avenel', state: 'NJ', zipCode: '07001', county: 'Avenel County'},
  { name: 'Avon Free Public Library', url: 'https://www.avonbythesealibrary.org', eventsUrl: 'https://www.avonbythesealibrary.org/events', city: 'Avon-By-The-Sea', state: 'NJ', zipCode: '07717', county: 'Avon-By-The-Sea County'},
  { name: 'Bernards Township Library', url: 'https://www.baskingridgelibrary.org', eventsUrl: 'https://www.baskingridgelibrary.org/events', city: 'Basking Ridge', state: 'NJ', zipCode: '07920', county: 'Basking Ridge County'},
  { name: 'Bayonne Free Public Library', url: 'https://www.bayonnelibrary.org', eventsUrl: 'https://www.bayonnelibrary.org/events', city: 'Bayonne', state: 'NJ', zipCode: '07002', county: 'Bayonne County'},
  { name: 'Beach Haven Free Public Library', url: 'https://www.beachhavenlibrary.org', eventsUrl: 'https://www.beachhavenlibrary.org/events', city: 'Beach Haven', state: 'NJ', zipCode: '08008', county: 'Beach Haven County'},
  { name: 'Bedminster-Far Hills', url: 'https://www.bedminsterlibrary.org', eventsUrl: 'https://www.bedminsterlibrary.org/events', city: 'Bedminster', state: 'NJ', zipCode: '07921', county: 'Bedminster County'},
  { name: 'Belleville Public Library', url: 'https://www.bellevillelibrary.org', eventsUrl: 'https://www.bellevillelibrary.org/events', city: 'Belleville', state: 'NJ', zipCode: '07109', county: 'Belleville County'},
  { name: 'Belmar Public Library', url: 'https://www.belmarlibrary.org', eventsUrl: 'https://www.belmarlibrary.org/events', city: 'Belmar', state: 'NJ', zipCode: '07719', county: 'Belmar County'},
  { name: 'Belvidere Free Public Library', url: 'https://www.belviderelibrary.org', eventsUrl: 'https://www.belviderelibrary.org/events', city: 'Belvidere', state: 'NJ', zipCode: '07823', county: 'Belvidere County'},
  { name: 'Bergenfield Free Public Library', url: 'https://www.bergenfieldlibrary.org', eventsUrl: 'https://www.bergenfieldlibrary.org/events', city: 'Bergenfield', state: 'NJ', zipCode: '07621', county: 'Bergenfield County'},
  { name: 'Berkeley Heights Free Public Library', url: 'https://www.berkeleyheightslibrary.org', eventsUrl: 'https://www.berkeleyheightslibrary.org/events', city: 'Berkeley Heights', state: 'NJ', zipCode: '07922', county: 'Berkeley Heights County'},
  { name: 'Marie Fleche Memorial Library', url: 'https://www.berlinlibrary.org', eventsUrl: 'https://www.berlinlibrary.org/events', city: 'Berlin', state: 'NJ', zipCode: '08009', county: 'Berlin County'},
  { name: 'Bernardsville Public Library', url: 'https://www.bernardsvillelibrary.org', eventsUrl: 'https://www.bernardsvillelibrary.org/events', city: 'Bernardsville', state: 'NJ', zipCode: '07924', county: 'Bernardsville County'},
  { name: 'Beverly Free Library', url: 'https://www.beverlylibrary.org', eventsUrl: 'https://www.beverlylibrary.org/events', city: 'Beverly', state: 'NJ', zipCode: '08010', county: 'Beverly County'},
  { name: 'Bloomfield Public Library', url: 'https://www.bloomfieldlibrary.org', eventsUrl: 'https://www.bloomfieldlibrary.org/events', city: 'Bloomfield', state: 'NJ', zipCode: '07003', county: 'Bloomfield County'},
  { name: 'Bloomingdale Free Public Library', url: 'https://www.bloomingdalelibrary.org', eventsUrl: 'https://www.bloomingdalelibrary.org/events', city: 'Bloomingdale', state: 'NJ', zipCode: '07403', county: 'Bloomingdale County'},
  { name: 'Bogota Public Library', url: 'https://www.bogotalibrary.org', eventsUrl: 'https://www.bogotalibrary.org/events', city: 'Bogota', state: 'NJ', zipCode: '07603', county: 'Bogota County'},
  { name: 'Boonton Holmes Public Library', url: 'https://www.boontonlibrary.org', eventsUrl: 'https://www.boontonlibrary.org/events', city: 'Boonton', state: 'NJ', zipCode: '07005', county: 'Boonton County'},
  { name: 'Bradley Beach Public Library', url: 'https://www.bradleybeachlibrary.org', eventsUrl: 'https://www.bradleybeachlibrary.org/events', city: 'Bradley Beach', state: 'NJ', zipCode: '07720', county: 'Bradley Beach County'},
  { name: 'Bridgeton Free Public Library', url: 'https://www.bridgetonlibrary.org', eventsUrl: 'https://www.bridgetonlibrary.org/events', city: 'Bridgeton', state: 'NJ', zipCode: '08302', county: 'Bridgeton County'},
  { name: 'Somerset County Library', url: 'https://www.bridgewaterlibrary.org', eventsUrl: 'https://www.bridgewaterlibrary.org/events', city: 'Bridgewater', state: 'NJ', zipCode: '08807', county: 'Bridgewater County'},
  { name: 'Brielle Public Library', url: 'https://www.briellelibrary.org', eventsUrl: 'https://www.briellelibrary.org/events', city: 'Brielle', state: 'NJ', zipCode: '08730', county: 'Brielle County'},
  { name: 'Mendham Township Library', url: 'https://www.brooksidelibrary.org', eventsUrl: 'https://www.brooksidelibrary.org/events', city: 'Brookside', state: 'NJ', zipCode: '07926', county: 'Brookside County'},
  { name: 'Library Company Of Burlington', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'NJ', zipCode: '08016', county: 'Burlington County'},
  { name: 'Butler Public Library', url: 'https://www.butlerlibrary.org', eventsUrl: 'https://www.butlerlibrary.org/events', city: 'Butler', state: 'NJ', zipCode: '07405', county: 'Butler County'},
  { name: 'Caldwell Free Public Library', url: 'https://www.caldwelllibrary.org', eventsUrl: 'https://www.caldwelllibrary.org/events', city: 'Caldwell', state: 'NJ', zipCode: '07006', county: 'Caldwell County'},
  { name: 'Camden Free Public Library', url: 'https://www.camdenlibrary.org', eventsUrl: 'https://www.camdenlibrary.org/events', city: 'Camden', state: 'NJ', zipCode: '08103', county: 'Camden County'},
  { name: 'Cape May County Library', url: 'https://www.capemaycourthouselibrary.org', eventsUrl: 'https://www.capemaycourthouselibrary.org/events', city: 'Cape May Court House', state: 'NJ', zipCode: '08210', county: 'Cape May Court House County'},
  { name: 'William E. Dermody Free Public Library', url: 'https://www.carlstadtlibrary.org', eventsUrl: 'https://www.carlstadtlibrary.org/events', city: 'Carlstadt', state: 'NJ', zipCode: '07072', county: 'Carlstadt County'},
  { name: 'Carteret Free Public Library', url: 'https://www.carteretlibrary.org', eventsUrl: 'https://www.carteretlibrary.org/events', city: 'Carteret', state: 'NJ', zipCode: '07008', county: 'Carteret County'},
  { name: 'Cedar Grove Free Public Library', url: 'https://www.cedargrovelibrary.org', eventsUrl: 'https://www.cedargrovelibrary.org/events', city: 'Cedar Grove', state: 'NJ', zipCode: '07009', county: 'Cedar Grove County'},
  { name: 'Chathams Joint Free Public Library', url: 'https://www.chathamlibrary.org', eventsUrl: 'https://www.chathamlibrary.org/events', city: 'Chatham', state: 'NJ', zipCode: '07928', county: 'Chatham County'},
  { name: 'Cherry Hill Free Public Library', url: 'https://www.cherryhilllibrary.org', eventsUrl: 'https://www.cherryhilllibrary.org/events', city: 'Cherry Hill', state: 'NJ', zipCode: '08034', county: 'Cherry Hill County'},
  { name: 'Chester Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'NJ', zipCode: '07930', county: 'Chester County'},
  { name: 'Clark Public Library', url: 'https://www.clarklibrary.org', eventsUrl: 'https://www.clarklibrary.org/events', city: 'Clark', state: 'NJ', zipCode: '07066', county: 'Clark County'},
  { name: 'Clementon Memorial Library', url: 'https://www.clementonlibrary.org', eventsUrl: 'https://www.clementonlibrary.org/events', city: 'Clementon', state: 'NJ', zipCode: '08021', county: 'Clementon County'},
  { name: 'Cliffside Park Free Public Library', url: 'https://www.cliffsideparklibrary.org', eventsUrl: 'https://www.cliffsideparklibrary.org/events', city: 'Cliffside Park', state: 'NJ', zipCode: '07010', county: 'Cliffside Park County'},
  { name: 'Clifton Public Library', url: 'https://www.cliftonlibrary.org', eventsUrl: 'https://www.cliftonlibrary.org/events', city: 'Clifton', state: 'NJ', zipCode: '07011', county: 'Clifton County'},
  { name: 'Closter Public Library', url: 'https://www.closterlibrary.org', eventsUrl: 'https://www.closterlibrary.org/events', city: 'Closter', state: 'NJ', zipCode: '07624', county: 'Closter County'},
  { name: 'Collingswood Free Public Library', url: 'https://www.collingswoodlibrary.org', eventsUrl: 'https://www.collingswoodlibrary.org/events', city: 'Collingswood', state: 'NJ', zipCode: '08108', county: 'Collingswood County'},
  { name: 'Cranbury Public Library', url: 'https://www.cranburylibrary.org', eventsUrl: 'https://www.cranburylibrary.org/events', city: 'Cranbury', state: 'NJ', zipCode: '08512', county: 'Cranbury County'},
  { name: 'Cranford Public Library', url: 'https://www.cranfordlibrary.org', eventsUrl: 'https://www.cranfordlibrary.org/events', city: 'Cranford', state: 'NJ', zipCode: '07016', county: 'Cranford County'},
  { name: 'Cresskill Public Library', url: 'https://www.cresskilllibrary.org', eventsUrl: 'https://www.cresskilllibrary.org/events', city: 'Cresskill', state: 'NJ', zipCode: '07626', county: 'Cresskill County'},
  { name: 'Crosswicks Library Company', url: 'https://www.crosswickslibrary.org', eventsUrl: 'https://www.crosswickslibrary.org/events', city: 'Crosswicks', state: 'NJ', zipCode: '08015', county: 'Crosswicks County'},
  { name: 'Delanco Public Library', url: 'https://www.delancolibrary.org', eventsUrl: 'https://www.delancolibrary.org/events', city: 'Delanco', state: 'NJ', zipCode: '08075', county: 'Delanco County'},
  { name: 'Demarest Public Library Association', url: 'https://www.demarestlibrary.org', eventsUrl: 'https://www.demarestlibrary.org/events', city: 'Demarest', state: 'NJ', zipCode: '07627', county: 'Demarest County'},
  { name: 'Denville Free Public Library', url: 'https://www.denvillelibrary.org', eventsUrl: 'https://www.denvillelibrary.org/events', city: 'Denville', state: 'NJ', zipCode: '07834', county: 'Denville County'},
  { name: 'James H. Johnson Memorial Library', url: 'https://www.deptfordlibrary.org', eventsUrl: 'https://www.deptfordlibrary.org/events', city: 'Deptford', state: 'NJ', zipCode: '08096', county: 'Deptford County'},
  { name: 'Dover Free Public Library', url: 'https://www.doverlibrary.org', eventsUrl: 'https://www.doverlibrary.org/events', city: 'Dover', state: 'NJ', zipCode: '07801', county: 'Dover County'},
  { name: 'Dixon Homestead Library', url: 'https://www.dumontlibrary.org', eventsUrl: 'https://www.dumontlibrary.org/events', city: 'Dumont', state: 'NJ', zipCode: '07628', county: 'Dumont County'},
  { name: 'Dunellen Free Public Library', url: 'https://www.dunellenlibrary.org', eventsUrl: 'https://www.dunellenlibrary.org/events', city: 'Dunellen', state: 'NJ', zipCode: '08812', county: 'Dunellen County'},
  { name: 'East Brunswick Public Library', url: 'https://www.eastbrunswicklibrary.org', eventsUrl: 'https://www.eastbrunswicklibrary.org/events', city: 'East Brunswick', state: 'NJ', zipCode: '08816', county: 'East Brunswick County'},
  { name: 'East Hanover Township Free Public Library', url: 'https://www.easthanoverlibrary.org', eventsUrl: 'https://www.easthanoverlibrary.org/events', city: 'East Hanover', state: 'NJ', zipCode: '07936', county: 'East Hanover County'},
  { name: 'East Orange Public Library', url: 'https://www.eastorangelibrary.org', eventsUrl: 'https://www.eastorangelibrary.org/events', city: 'East Orange', state: 'NJ', zipCode: '07018', county: 'East Orange County'},
  { name: 'East Rutherford Memorial Library', url: 'https://www.eastrutherfordlibrary.org', eventsUrl: 'https://www.eastrutherfordlibrary.org/events', city: 'East Rutherford', state: 'NJ', zipCode: '07073', county: 'East Rutherford County'},
  { name: 'Eatontown Public Library', url: 'https://www.eatontownlibrary.org', eventsUrl: 'https://www.eatontownlibrary.org/events', city: 'Eatontown', state: 'NJ', zipCode: '07724', county: 'Eatontown County'},
  { name: 'Edgewater Free Public Library', url: 'https://www.edgewaterlibrary.org', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'NJ', zipCode: '07020', county: 'Edgewater County'},
  { name: 'Edison Township Free Public Library', url: 'https://www.edisonlibrary.org', eventsUrl: 'https://www.edisonlibrary.org/events', city: 'Edison', state: 'NJ', zipCode: '08817', county: 'Edison County'},
  { name: 'Elizabeth Free Public Library', url: 'https://www.elizabethlibrary.org', eventsUrl: 'https://www.elizabethlibrary.org/events', city: 'Elizabeth', state: 'NJ', zipCode: '07202', county: 'Elizabeth County'},
  { name: 'Elmer Public Library', url: 'https://www.elmerlibrary.org', eventsUrl: 'https://www.elmerlibrary.org/events', city: 'Elmer', state: 'NJ', zipCode: '08318', county: 'Elmer County'},
  { name: 'Elmwood Park Free Public Library', url: 'https://www.elmwoodparklibrary.org', eventsUrl: 'https://www.elmwoodparklibrary.org/events', city: 'Elmwood Park', state: 'NJ', zipCode: '07407', county: 'Elmwood Park County'},
  { name: 'Emerson Public Library', url: 'https://www.emersonlibrary.org', eventsUrl: 'https://www.emersonlibrary.org/events', city: 'Emerson', state: 'NJ', zipCode: '07630', county: 'Emerson County'},
  { name: 'Englewood Free Public Library', url: 'https://www.englewoodlibrary.org', eventsUrl: 'https://www.englewoodlibrary.org/events', city: 'Englewood', state: 'NJ', zipCode: '07631', county: 'Englewood County'},
  { name: 'Fair Haven Public Library', url: 'https://www.fairhavenlibrary.org', eventsUrl: 'https://www.fairhavenlibrary.org/events', city: 'Fair Haven', state: 'NJ', zipCode: '07704', county: 'Fair Haven County'},
  { name: 'Maurice M. Pine Free Public Library', url: 'https://www.fairlawnlibrary.org', eventsUrl: 'https://www.fairlawnlibrary.org/events', city: 'Fair Lawn', state: 'NJ', zipCode: '07410', county: 'Fair Lawn County'},
  { name: 'Anthony Pio Costa Memorial Library', url: 'https://www.fairfieldlibrary.org', eventsUrl: 'https://www.fairfieldlibrary.org/events', city: 'Fairfield', state: 'NJ', zipCode: '07004', county: 'Fairfield County'},
  { name: 'Fairview Free Public Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'NJ', zipCode: '07022', county: 'Fairview County'},
  { name: 'Fanwood Memorial Library', url: 'https://www.fanwoodlibrary.org', eventsUrl: 'https://www.fanwoodlibrary.org/events', city: 'Fanwood', state: 'NJ', zipCode: '07023', county: 'Fanwood County'},
  { name: 'Mount Olive Public Library', url: 'https://www.flanderslibrary.org', eventsUrl: 'https://www.flanderslibrary.org/events', city: 'Flanders', state: 'NJ', zipCode: '07836', county: 'Flanders County'},
  { name: 'Flemington Free Public Library', url: 'https://www.flemingtonlibrary.org', eventsUrl: 'https://www.flemingtonlibrary.org/events', city: 'Flemington', state: 'NJ', zipCode: '08822', county: 'Flemington County'},
  { name: 'Florham Park Free Public Library', url: 'https://www.florhamparklibrary.org', eventsUrl: 'https://www.florhamparklibrary.org/events', city: 'Florham Park', state: 'NJ', zipCode: '07932', county: 'Florham Park County'},
  { name: 'Fort Lee Free Public Library', url: 'https://www.fortleelibrary.org', eventsUrl: 'https://www.fortleelibrary.org/events', city: 'Fort Lee', state: 'NJ', zipCode: '07024', county: 'Fort Lee County'},
  { name: 'Franklin Lakes Free Public Library', url: 'https://www.franklinlakeslibrary.org', eventsUrl: 'https://www.franklinlakeslibrary.org/events', city: 'Franklin Lakes', state: 'NJ', zipCode: '07417', county: 'Franklin Lakes County'},
  { name: 'Franklin Twp Public Library-Gloucester', url: 'https://www.franklinvillelibrary.org', eventsUrl: 'https://www.franklinvillelibrary.org/events', city: 'Franklinville', state: 'NJ', zipCode: '08322', county: 'Franklinville County'},
  { name: 'Freehold Public Library', url: 'https://www.freeholdlibrary.org', eventsUrl: 'https://www.freeholdlibrary.org/events', city: 'Freehold', state: 'NJ', zipCode: '07728', county: 'Freehold County'},
  { name: 'Frenchtown Public Library', url: 'https://www.frenchtownlibrary.org', eventsUrl: 'https://www.frenchtownlibrary.org/events', city: 'Frenchtown', state: 'NJ', zipCode: '08825', county: 'Frenchtown County'},
  { name: 'Garfield Free Public Library', url: 'https://www.garfieldlibrary.org', eventsUrl: 'https://www.garfieldlibrary.org/events', city: 'Garfield', state: 'NJ', zipCode: '07026', county: 'Garfield County'},
  { name: 'Garwood Free Public Library', url: 'https://www.garwoodlibrary.org', eventsUrl: 'https://www.garwoodlibrary.org/events', city: 'Garwood', state: 'NJ', zipCode: '07027', county: 'Garwood County'},
  { name: 'Gibbsboro Public Library', url: 'https://www.gibbsborolibrary.org', eventsUrl: 'https://www.gibbsborolibrary.org/events', city: 'Gibbsboro', state: 'NJ', zipCode: '08026', county: 'Gibbsboro County'},
  { name: 'Gloucester County Library - Greenwich Township', url: 'https://www.gibbstownlibrary.org', eventsUrl: 'https://www.gibbstownlibrary.org/events', city: 'Gibbstown', state: 'NJ', zipCode: '08027', county: 'Gibbstown County'},
  { name: 'Long Hill Township Free Public Library', url: 'https://www.gillettelibrary.org', eventsUrl: 'https://www.gillettelibrary.org/events', city: 'Gillette', state: 'NJ', zipCode: '07980', county: 'Gillette County'},
  { name: 'Gloucester County Library - Glassboro', url: 'https://www.glassborolibrary.org', eventsUrl: 'https://www.glassborolibrary.org/events', city: 'Glassboro', state: 'NJ', zipCode: '08028', county: 'Glassboro County'},
  { name: 'Glen Ridge Free Public Library', url: 'https://www.glenridgelibrary.org', eventsUrl: 'https://www.glenridgelibrary.org/events', city: 'Glen Ridge', state: 'NJ', zipCode: '07028', county: 'Glen Ridge County'},
  { name: 'Glen Rock Public Library', url: 'https://www.glenrocklibrary.org', eventsUrl: 'https://www.glenrocklibrary.org/events', city: 'Glen Rock', state: 'NJ', zipCode: '07452', county: 'Glen Rock County'},
  { name: 'Gloucester City Library', url: 'https://www.gloucestercitylibrary.org', eventsUrl: 'https://www.gloucestercitylibrary.org/events', city: 'Gloucester City', state: 'NJ', zipCode: '08030', county: 'Gloucester City County'},
  { name: 'Johnson Free Public Library', url: 'https://www.hackensacklibrary.org', eventsUrl: 'https://www.hackensacklibrary.org/events', city: 'Hackensack', state: 'NJ', zipCode: '07601', county: 'Hackensack County'},
  { name: 'Hackettstown Free Public Library', url: 'https://www.hackettstownlibrary.org', eventsUrl: 'https://www.hackettstownlibrary.org/events', city: 'Hackettstown', state: 'NJ', zipCode: '07840', county: 'Hackettstown County'},
  { name: 'Haddon Heights Public Library', url: 'https://www.haddonheightslibrary.org', eventsUrl: 'https://www.haddonheightslibrary.org/events', city: 'Haddon Heights', state: 'NJ', zipCode: '08035', county: 'Haddon Heights County'},
  { name: 'Haddonfield Public Library', url: 'https://www.haddonfieldlibrary.org', eventsUrl: 'https://www.haddonfieldlibrary.org/events', city: 'Haddonfield', state: 'NJ', zipCode: '08033', county: 'Haddonfield County'},
  { name: 'Haledon Free Public Library', url: 'https://www.haledonlibrary.org', eventsUrl: 'https://www.haledonlibrary.org/events', city: 'Haledon', state: 'NJ', zipCode: '07508', county: 'Haledon County'},
  { name: 'Hamilton Township Free Public Library', url: 'https://www.hamiltonlibrary.org', eventsUrl: 'https://www.hamiltonlibrary.org/events', city: 'Hamilton', state: 'NJ', zipCode: '08619', county: 'Hamilton County'},
  { name: 'Harrington Park Public Library', url: 'https://www.harringtonparklibrary.org', eventsUrl: 'https://www.harringtonparklibrary.org/events', city: 'Harrington Park', state: 'NJ', zipCode: '07640', county: 'Harrington Park County'},
  { name: 'Harrison Public Library', url: 'https://www.harrisonlibrary.org', eventsUrl: 'https://www.harrisonlibrary.org/events', city: 'Harrison', state: 'NJ', zipCode: '07029', county: 'Harrison County'},
  { name: 'Hasbrouck Heights Free Public Library', url: 'https://www.hasbrouckheightslibrary.org', eventsUrl: 'https://www.hasbrouckheightslibrary.org/events', city: 'Hasbrouck Heights', state: 'NJ', zipCode: '07604', county: 'Hasbrouck Heights County'},
  { name: 'Haworth Municipal Library', url: 'https://www.haworthlibrary.org', eventsUrl: 'https://www.haworthlibrary.org/events', city: 'Haworth', state: 'NJ', zipCode: '07641', county: 'Haworth County'},
  { name: 'Louis Bay 2nd Library', url: 'https://www.hawthornelibrary.org', eventsUrl: 'https://www.hawthornelibrary.org/events', city: 'Hawthorne', state: 'NJ', zipCode: '07506', county: 'Hawthorne County'},
  { name: 'High Bridge Public Library', url: 'https://www.highbridgelibrary.org', eventsUrl: 'https://www.highbridgelibrary.org/events', city: 'High Bridge', state: 'NJ', zipCode: '08829', county: 'High Bridge County'},
  { name: 'Highland Park Public Library', url: 'https://www.highlandparklibrary.org', eventsUrl: 'https://www.highlandparklibrary.org/events', city: 'Highland Park', state: 'NJ', zipCode: '08904', county: 'Highland Park County'},
  { name: 'Hillsdale Free Public Library', url: 'https://www.hillsdalelibrary.org', eventsUrl: 'https://www.hillsdalelibrary.org/events', city: 'Hillsdale', state: 'NJ', zipCode: '07642', county: 'Hillsdale County'},
  { name: 'Hillside Free Public Library', url: 'https://www.hillsidelibrary.org', eventsUrl: 'https://www.hillsidelibrary.org/events', city: 'Hillside', state: 'NJ', zipCode: '07205', county: 'Hillside County'},
  { name: 'Worth Pinkham Memorial Library', url: 'https://www.hohokuslibrary.org', eventsUrl: 'https://www.hohokuslibrary.org/events', city: 'Ho-Ho-Kus', state: 'NJ', zipCode: '07423', county: 'Ho-Ho-Kus County'},
  { name: 'Hoboken Public Library', url: 'https://www.hobokenlibrary.org', eventsUrl: 'https://www.hobokenlibrary.org/events', city: 'Hoboken', state: 'NJ', zipCode: '07030', county: 'Hoboken County'},
  { name: 'Hopewell Public Library', url: 'https://www.hopewelllibrary.org', eventsUrl: 'https://www.hopewelllibrary.org/events', city: 'Hopewell', state: 'NJ', zipCode: '08525', county: 'Hopewell County'},
  { name: 'Margaret E. Heggan Free Public Library', url: 'https://www.hurffvillelibrary.org', eventsUrl: 'https://www.hurffvillelibrary.org/events', city: 'Hurffville', state: 'NJ', zipCode: '08080', county: 'Hurffville County'},
  { name: 'Irvington Public Library', url: 'https://www.irvingtonlibrary.org', eventsUrl: 'https://www.irvingtonlibrary.org/events', city: 'Irvington', state: 'NJ', zipCode: '07111', county: 'Irvington County'},
  { name: 'Jamesburg Public Library', url: 'https://www.jamesburglibrary.org', eventsUrl: 'https://www.jamesburglibrary.org/events', city: 'Jamesburg', state: 'NJ', zipCode: '08831', county: 'Jamesburg County'},
  { name: 'Jersey City Free Public Library', url: 'https://www.jerseycitylibrary.org', eventsUrl: 'https://www.jerseycitylibrary.org/events', city: 'Jersey City', state: 'NJ', zipCode: '07302', county: 'Jersey City County'},
  { name: 'Kearny Public Library', url: 'https://www.kearnylibrary.org', eventsUrl: 'https://www.kearnylibrary.org/events', city: 'Kearny', state: 'NJ', zipCode: '07032', county: 'Kearny County'},
  { name: 'Kenilworth Public Library', url: 'https://www.kenilworthlibrary.org', eventsUrl: 'https://www.kenilworthlibrary.org/events', city: 'Kenilworth', state: 'NJ', zipCode: '07033', county: 'Kenilworth County'},
  { name: 'Keyport Free Public Library', url: 'https://www.keyportlibrary.org', eventsUrl: 'https://www.keyportlibrary.org/events', city: 'Keyport', state: 'NJ', zipCode: '07735', county: 'Keyport County'},
  { name: 'Kinnelon Public Library', url: 'https://www.kinnelonlibrary.org', eventsUrl: 'https://www.kinnelonlibrary.org/events', city: 'Kinnelon', state: 'NJ', zipCode: '07405', county: 'Kinnelon County'},
  { name: 'Lambertville Free Public Library', url: 'https://www.lambertvillelibrary.org', eventsUrl: 'https://www.lambertvillelibrary.org/events', city: 'Lambertville', state: 'NJ', zipCode: '08530', county: 'Lambertville County'},
  { name: 'Mercer County Library', url: 'https://www.lawrencevillelibrary.org', eventsUrl: 'https://www.lawrencevillelibrary.org/events', city: 'Lawrenceville', state: 'NJ', zipCode: '08648', county: 'Lawrenceville County'},
  { name: 'Leonia Public Library', url: 'https://www.leonialibrary.org', eventsUrl: 'https://www.leonialibrary.org/events', city: 'Leonia', state: 'NJ', zipCode: '07605', county: 'Leonia County'},
  { name: 'Lincoln Park Public Library', url: 'https://www.lincolnparklibrary.org', eventsUrl: 'https://www.lincolnparklibrary.org/events', city: 'Lincoln Park', state: 'NJ', zipCode: '07035', county: 'Lincoln Park County'},
  { name: 'Linden Free Public Library', url: 'https://www.lindenlibrary.org', eventsUrl: 'https://www.lindenlibrary.org/events', city: 'Linden', state: 'NJ', zipCode: '07036', county: 'Linden County'},
  { name: 'Linwood Public Library', url: 'https://www.linwoodlibrary.org', eventsUrl: 'https://www.linwoodlibrary.org/events', city: 'Linwood', state: 'NJ', zipCode: '08221', county: 'Linwood County'},
  { name: 'Little Falls Public Library', url: 'https://www.littlefallslibrary.org', eventsUrl: 'https://www.littlefallslibrary.org/events', city: 'Little Falls', state: 'NJ', zipCode: '07424', county: 'Little Falls County'},
  { name: 'Little Ferry Free Public Library', url: 'https://www.littleferrylibrary.org', eventsUrl: 'https://www.littleferrylibrary.org/events', city: 'Little Ferry', state: 'NJ', zipCode: '07643', county: 'Little Ferry County'},
  { name: 'Little Silver Public Library', url: 'https://www.littlesilverlibrary.org', eventsUrl: 'https://www.littlesilverlibrary.org/events', city: 'Little Silver', state: 'NJ', zipCode: '07739', county: 'Little Silver County'},
  { name: 'Ruth L. Rockwood Memorial Library', url: 'https://www.livingstonlibrary.org', eventsUrl: 'https://www.livingstonlibrary.org/events', city: 'Livingston', state: 'NJ', zipCode: '07039', county: 'Livingston County'},
  { name: 'Lodi Memorial Library', url: 'https://www.lodilibrary.org', eventsUrl: 'https://www.lodilibrary.org/events', city: 'Lodi', state: 'NJ', zipCode: '07644', county: 'Lodi County'},
  { name: 'Gloucester County Library - Logan Township', url: 'https://www.logantownshiplibrary.org', eventsUrl: 'https://www.logantownshiplibrary.org/events', city: 'Logan Township', state: 'NJ', zipCode: '08085', county: 'Logan Township County'},
  { name: 'Long Branch Free Public Library', url: 'https://www.longbranchlibrary.org', eventsUrl: 'https://www.longbranchlibrary.org/events', city: 'Long Branch', state: 'NJ', zipCode: '07740', county: 'Long Branch County'},
  { name: 'Washington Twp Public Library-Morris', url: 'https://www.longvalleylibrary.org', eventsUrl: 'https://www.longvalleylibrary.org/events', city: 'Long Valley', state: 'NJ', zipCode: '07853', county: 'Long Valley County'},
  { name: 'Lyndhurst Free Public Library', url: 'https://www.lyndhurstlibrary.org', eventsUrl: 'https://www.lyndhurstlibrary.org/events', city: 'Lyndhurst', state: 'NJ', zipCode: '07071', county: 'Lyndhurst County'},
  { name: 'Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'NJ', zipCode: '07940', county: 'Madison County'},
  { name: 'Mahwah Free Public Library', url: 'https://www.mahwahtownshiplibrary.org', eventsUrl: 'https://www.mahwahtownshiplibrary.org/events', city: 'Mahwah Township', state: 'NJ', zipCode: '07430', county: 'Mahwah Township County'},
  { name: 'Monmouth County Library', url: 'https://www.manalapanlibrary.org', eventsUrl: 'https://www.manalapanlibrary.org/events', city: 'Manalapan', state: 'NJ', zipCode: '07726', county: 'Manalapan County'},
  { name: 'Manasquan Public Library', url: 'https://www.manasquanlibrary.org', eventsUrl: 'https://www.manasquanlibrary.org/events', city: 'Manasquan', state: 'NJ', zipCode: '08736', county: 'Manasquan County'},
  { name: 'Manville Public Library', url: 'https://www.manvillelibrary.org', eventsUrl: 'https://www.manvillelibrary.org/events', city: 'Manville', state: 'NJ', zipCode: '08835', county: 'Manville County'},
  { name: 'Maplewood Memorial Library', url: 'https://www.maplewoodlibrary.org', eventsUrl: 'https://www.maplewoodlibrary.org/events', city: 'Maplewood', state: 'NJ', zipCode: '07040', county: 'Maplewood County'},
  { name: 'Margate City Public Library', url: 'https://www.margatelibrary.org', eventsUrl: 'https://www.margatelibrary.org/events', city: 'Margate', state: 'NJ', zipCode: '08402', county: 'Margate County'},
  { name: 'Matawan-Aberdeen Public Library', url: 'https://www.matawanlibrary.org', eventsUrl: 'https://www.matawanlibrary.org/events', city: 'Matawan', state: 'NJ', zipCode: '07747', county: 'Matawan County'},
  { name: 'Atlantic County Library System', url: 'https://www.mayslandinglibrary.org', eventsUrl: 'https://www.mayslandinglibrary.org/events', city: 'Mays Landing', state: 'NJ', zipCode: '08330', county: 'Mays Landing County'},
  { name: 'Maywood Public Library', url: 'https://www.maywoodlibrary.org', eventsUrl: 'https://www.maywoodlibrary.org/events', city: 'Maywood', state: 'NJ', zipCode: '07607', county: 'Maywood County'},
  { name: 'Mendham Free Public Library', url: 'https://www.mendhamlibrary.org', eventsUrl: 'https://www.mendhamlibrary.org/events', city: 'Mendham', state: 'NJ', zipCode: '07945', county: 'Mendham County'},
  { name: 'Metuchen Public Library', url: 'https://www.metuchenlibrary.org', eventsUrl: 'https://www.metuchenlibrary.org/events', city: 'Metuchen', state: 'NJ', zipCode: '08840', county: 'Metuchen County'},
  { name: 'Gloucester County Library - East Greenwich', url: 'https://www.mickletonlibrary.org', eventsUrl: 'https://www.mickletonlibrary.org/events', city: 'Mickleton', state: 'NJ', zipCode: '08056', county: 'Mickleton County'},
  { name: 'Middlesex Public Library', url: 'https://www.middlesexlibrary.org', eventsUrl: 'https://www.middlesexlibrary.org/events', city: 'Middlesex', state: 'NJ', zipCode: '08846', county: 'Middlesex County'},
  { name: 'Middletown Township Public Library', url: 'https://www.middletownlibrary.org', eventsUrl: 'https://www.middletownlibrary.org/events', city: 'Middletown', state: 'NJ', zipCode: '07748', county: 'Middletown County'},
  { name: 'Midland Park Memorial Library', url: 'https://www.midlandparklibrary.org', eventsUrl: 'https://www.midlandparklibrary.org/events', city: 'Midland Park', state: 'NJ', zipCode: '07432', county: 'Midland Park County'},
  { name: 'Holland Township Free Public Library', url: 'https://www.milfordlibrary.org', eventsUrl: 'https://www.milfordlibrary.org/events', city: 'Milford', state: 'NJ', zipCode: '08848', county: 'Milford County'},
  { name: 'Millburn Free Public Library', url: 'https://www.millburnlibrary.org', eventsUrl: 'https://www.millburnlibrary.org/events', city: 'Millburn', state: 'NJ', zipCode: '07041', county: 'Millburn County'},
  { name: 'Milltown Public Library', url: 'https://www.milltownlibrary.org', eventsUrl: 'https://www.milltownlibrary.org/events', city: 'Milltown', state: 'NJ', zipCode: '08850', county: 'Milltown County'},
  { name: 'Millville Public Library', url: 'https://www.millvillelibrary.org', eventsUrl: 'https://www.millvillelibrary.org/events', city: 'Millville', state: 'NJ', zipCode: '08332', county: 'Millville County'},
  { name: 'Monmouth Beach Public Library', url: 'https://www.monmouthbeachlibrary.org', eventsUrl: 'https://www.monmouthbeachlibrary.org/events', city: 'Monmouth Beach', state: 'NJ', zipCode: '07750', county: 'Monmouth Beach County'},
  { name: 'South Brunswick Public Library', url: 'https://www.monmouthjunctionlibrary.org', eventsUrl: 'https://www.monmouthjunctionlibrary.org/events', city: 'Monmouth Junction', state: 'NJ', zipCode: '08852', county: 'Monmouth Junction County'},
  { name: 'Monroe Twp Public Library-Middlesex', url: 'https://www.monroetownshiplibrary.org', eventsUrl: 'https://www.monroetownshiplibrary.org/events', city: 'Monroe Township', state: 'NJ', zipCode: '08831', county: 'Monroe Township County'},
  { name: 'Montclair Public Library', url: 'https://www.montclairlibrary.org', eventsUrl: 'https://www.montclairlibrary.org/events', city: 'Montclair', state: 'NJ', zipCode: '07042', county: 'Montclair County'},
  { name: 'Montvale Free Public Library', url: 'https://www.montvalelibrary.org', eventsUrl: 'https://www.montvalelibrary.org/events', city: 'Montvale', state: 'NJ', zipCode: '07645', county: 'Montvale County'},
  { name: 'Montville Township Public Library', url: 'https://www.montvillelibrary.org', eventsUrl: 'https://www.montvillelibrary.org/events', city: 'Montville', state: 'NJ', zipCode: '07045', county: 'Montville County'},
  { name: 'Moorestown Library', url: 'https://www.moorestownlibrary.org', eventsUrl: 'https://www.moorestownlibrary.org/events', city: 'Moorestown', state: 'NJ', zipCode: '08057', county: 'Moorestown County'},
  { name: 'Morris Plains Library', url: 'https://www.morrisplainslibrary.org', eventsUrl: 'https://www.morrisplainslibrary.org/events', city: 'Morris Plains', state: 'NJ', zipCode: '07950', county: 'Morris Plains County'},
  { name: 'Morristown-Morris Twp Joint Public Library', url: 'https://www.morristownlibrary.org', eventsUrl: 'https://www.morristownlibrary.org/events', city: 'Morristown', state: 'NJ', zipCode: '07960', county: 'Morristown County'},
  { name: 'Mount Arlington Public Library', url: 'https://www.mountarlingtonlibrary.org', eventsUrl: 'https://www.mountarlingtonlibrary.org/events', city: 'Mount Arlington', state: 'NJ', zipCode: '07856', county: 'Mount Arlington County'},
  { name: 'Mount Holly Library And Lyceum', url: 'https://www.mounthollylibrary.org', eventsUrl: 'https://www.mounthollylibrary.org/events', city: 'Mount Holly', state: 'NJ', zipCode: '08060', county: 'Mount Holly County'},
  { name: 'Mount Laurel Library', url: 'https://www.mountlaurellibrary.org', eventsUrl: 'https://www.mountlaurellibrary.org/events', city: 'Mount Laurel', state: 'NJ', zipCode: '08054', county: 'Mount Laurel County'},
  { name: 'Mountain Lakes Free Public Library', url: 'https://www.mountainlakeslibrary.org', eventsUrl: 'https://www.mountainlakeslibrary.org/events', city: 'Mountain Lakes', state: 'NJ', zipCode: '07046', county: 'Mountain Lakes County'},
  { name: 'Mountainside Free Public Library', url: 'https://www.mountainsidelibrary.org', eventsUrl: 'https://www.mountainsidelibrary.org/events', city: 'Mountainside', state: 'NJ', zipCode: '07092', county: 'Mountainside County'},
  { name: 'Gloucester County Library - Mullica Hill', url: 'https://www.mullicahilllibrary.org', eventsUrl: 'https://www.mullicahilllibrary.org/events', city: 'Mullica Hill', state: 'NJ', zipCode: '08062', county: 'Mullica Hill County'},
  { name: 'Neptune Township Public Library', url: 'https://www.neptunelibrary.org', eventsUrl: 'https://www.neptunelibrary.org/events', city: 'Neptune', state: 'NJ', zipCode: '07753', county: 'Neptune County'},
  { name: 'New Brunswick Free Public Library', url: 'https://www.newbrunswicklibrary.org', eventsUrl: 'https://www.newbrunswicklibrary.org/events', city: 'New Brunswick', state: 'NJ', zipCode: '08901', county: 'New Brunswick County'},
  { name: 'Bass River Community Library', url: 'https://www.newgretnalibrary.org', eventsUrl: 'https://www.newgretnalibrary.org/events', city: 'New Gretna', state: 'NJ', zipCode: '08224', county: 'New Gretna County'},
  { name: 'New Milford Public Library', url: 'https://www.newmilfordlibrary.org', eventsUrl: 'https://www.newmilfordlibrary.org/events', city: 'New Milford', state: 'NJ', zipCode: '07646', county: 'New Milford County'},
  { name: 'New Providence Memorial Library', url: 'https://www.newprovidencelibrary.org', eventsUrl: 'https://www.newprovidencelibrary.org/events', city: 'New Providence', state: 'NJ', zipCode: '07974', county: 'New Providence County'},
  { name: 'Harding Township Library', url: 'https://www.newvernonlibrary.org', eventsUrl: 'https://www.newvernonlibrary.org/events', city: 'New Vernon', state: 'NJ', zipCode: '07976', county: 'New Vernon County'},
  { name: 'Newark Public Library', url: 'https://www.newarklibrary.org', eventsUrl: 'https://www.newarklibrary.org/events', city: 'Newark', state: 'NJ', zipCode: '07102', county: 'Newark County'},
  { name: 'Newfield Public Library', url: 'https://www.newfieldlibrary.org', eventsUrl: 'https://www.newfieldlibrary.org/events', city: 'Newfield', state: 'NJ', zipCode: '08344', county: 'Newfield County'},
  { name: 'Sussex County Library', url: 'https://www.newtonlibrary.org', eventsUrl: 'https://www.newtonlibrary.org/events', city: 'Newton', state: 'NJ', zipCode: '07860', county: 'Newton County'},
  { name: 'North Arlington Public Library', url: 'https://www.northarlingtonlibrary.org', eventsUrl: 'https://www.northarlingtonlibrary.org/events', city: 'North Arlington', state: 'NJ', zipCode: '07031', county: 'North Arlington County'},
  { name: 'North Bergen Free Public Library', url: 'https://www.northbergenlibrary.org', eventsUrl: 'https://www.northbergenlibrary.org/events', city: 'North Bergen', state: 'NJ', zipCode: '07047', county: 'North Bergen County'},
  { name: 'North Brunswick Free Public Library', url: 'https://www.northbrunswicklibrary.org', eventsUrl: 'https://www.northbrunswicklibrary.org/events', city: 'North Brunswick', state: 'NJ', zipCode: '08902', county: 'North Brunswick County'},
  { name: 'North Haledon Free Public Library', url: 'https://www.northhaledonlibrary.org', eventsUrl: 'https://www.northhaledonlibrary.org/events', city: 'North Haledon', state: 'NJ', zipCode: '07508', county: 'North Haledon County'},
  { name: 'Otto Bruyns Public Library', url: 'https://www.northfieldlibrary.org', eventsUrl: 'https://www.northfieldlibrary.org/events', city: 'Northfield', state: 'NJ', zipCode: '08225', county: 'Northfield County'},
  { name: 'Norwood Public Library', url: 'https://www.norwoodlibrary.org', eventsUrl: 'https://www.norwoodlibrary.org/events', city: 'Norwood', state: 'NJ', zipCode: '07648', county: 'Norwood County'},
  { name: 'Nutley Free Public Library', url: 'https://www.nutleylibrary.org', eventsUrl: 'https://www.nutleylibrary.org/events', city: 'Nutley', state: 'NJ', zipCode: '07110', county: 'Nutley County'},
  { name: 'Jefferson Township Public Library', url: 'https://www.oakridgelibrary.org', eventsUrl: 'https://www.oakridgelibrary.org/events', city: 'Oak Ridge', state: 'NJ', zipCode: '07438', county: 'Oak Ridge County'},
  { name: 'Oakland Public Library', url: 'https://www.oaklandlibrary.org', eventsUrl: 'https://www.oaklandlibrary.org/events', city: 'Oakland', state: 'NJ', zipCode: '07436', county: 'Oakland County'},
  { name: 'Oaklyn Memorial Library', url: 'https://www.oaklynlibrary.org', eventsUrl: 'https://www.oaklynlibrary.org/events', city: 'Oaklyn', state: 'NJ', zipCode: '08107', county: 'Oaklyn County'},
  { name: 'Ocean City Free Public Library', url: 'https://www.oceancitylibrary.org', eventsUrl: 'https://www.oceancitylibrary.org/events', city: 'Ocean City', state: 'NJ', zipCode: '08226', county: 'Ocean City County'},
  { name: 'Old Bridge Public Library', url: 'https://www.oldbridgelibrary.org', eventsUrl: 'https://www.oldbridgelibrary.org/events', city: 'Old Bridge', state: 'NJ', zipCode: '08857', county: 'Old Bridge County'},
  { name: 'Old Tappan Free Public Library', url: 'https://www.oldtappanlibrary.org', eventsUrl: 'https://www.oldtappanlibrary.org/events', city: 'Old Tappan', state: 'NJ', zipCode: '07675', county: 'Old Tappan County'},
  { name: 'Tewksbury Township Public Library', url: 'https://www.oldwicklibrary.org', eventsUrl: 'https://www.oldwicklibrary.org/events', city: 'Oldwick', state: 'NJ', zipCode: '08858', county: 'Oldwick County'},
  { name: 'Oradell Public Library', url: 'https://www.oradelllibrary.org', eventsUrl: 'https://www.oradelllibrary.org/events', city: 'Oradell', state: 'NJ', zipCode: '07649', county: 'Oradell County'},
  { name: 'The Orange Public Library', url: 'https://www.orangelibrary.org', eventsUrl: 'https://www.orangelibrary.org/events', city: 'Orange', state: 'NJ', zipCode: '07050', county: 'Orange County'},
  { name: 'Oxford Public Library', url: 'https://www.oxfordlibrary.org', eventsUrl: 'https://www.oxfordlibrary.org/events', city: 'Oxford', state: 'NJ', zipCode: '07863', county: 'Oxford County'},
  { name: 'Palisades Park Free Public Library', url: 'https://www.palisadesparklibrary.org', eventsUrl: 'https://www.palisadesparklibrary.org/events', city: 'Palisades Park', state: 'NJ', zipCode: '07650', county: 'Palisades Park County'},
  { name: 'Paramus Public Library', url: 'https://www.paramuslibrary.org', eventsUrl: 'https://www.paramuslibrary.org/events', city: 'Paramus', state: 'NJ', zipCode: '07652', county: 'Paramus County'},
  { name: 'Park Ridge Free Public Library', url: 'https://www.parkridgelibrary.org', eventsUrl: 'https://www.parkridgelibrary.org/events', city: 'Park Ridge', state: 'NJ', zipCode: '07656', county: 'Park Ridge County'},
  { name: 'Sayreville Free Public Library', url: 'https://www.parlinlibrary.org', eventsUrl: 'https://www.parlinlibrary.org/events', city: 'Parlin', state: 'NJ', zipCode: '08859', county: 'Parlin County'},
  { name: 'Parsippany-Troy Hills Public Library', url: 'https://www.parsippanylibrary.org', eventsUrl: 'https://www.parsippanylibrary.org/events', city: 'Parsippany', state: 'NJ', zipCode: '07054', county: 'Parsippany County'},
  { name: 'Passaic Public Library', url: 'https://www.passaiclibrary.org', eventsUrl: 'https://www.passaiclibrary.org/events', city: 'Passaic', state: 'NJ', zipCode: '07055', county: 'Passaic County'},
  { name: 'Paterson Free Public Library', url: 'https://www.patersonlibrary.org', eventsUrl: 'https://www.patersonlibrary.org/events', city: 'Paterson', state: 'NJ', zipCode: '07501', county: 'Paterson County'},
  { name: 'Gill Memorial Library', url: 'https://www.paulsborolibrary.org', eventsUrl: 'https://www.paulsborolibrary.org/events', city: 'Paulsboro', state: 'NJ', zipCode: '08066', county: 'Paulsboro County'},
  { name: 'Pennington Free Public Library', url: 'https://www.penningtonlibrary.org', eventsUrl: 'https://www.penningtonlibrary.org/events', city: 'Pennington', state: 'NJ', zipCode: '08534', county: 'Pennington County'},
  { name: 'Penns Grove-Carneys Point Public Library', url: 'https://www.pennsgrovelibrary.org', eventsUrl: 'https://www.pennsgrovelibrary.org/events', city: 'Penns Grove', state: 'NJ', zipCode: '08069', county: 'Penns Grove County'},
  { name: 'Pennsauken Free Public Library', url: 'https://www.pennsaukenlibrary.org', eventsUrl: 'https://www.pennsaukenlibrary.org/events', city: 'Pennsauken', state: 'NJ', zipCode: '08110', county: 'Pennsauken County'},
  { name: 'Pennsville Public Library', url: 'https://www.pennsvillelibrary.org', eventsUrl: 'https://www.pennsvillelibrary.org/events', city: 'Pennsville', state: 'NJ', zipCode: '08070', county: 'Pennsville County'},
  { name: 'Perth Amboy Free Public Library', url: 'https://www.perthamboylibrary.org', eventsUrl: 'https://www.perthamboylibrary.org/events', city: 'Perth Amboy', state: 'NJ', zipCode: '08861', county: 'Perth Amboy County'},
  { name: 'Phillipsburg Free Public Library', url: 'https://www.phillipsburglibrary.org', eventsUrl: 'https://www.phillipsburglibrary.org/events', city: 'Phillipsburg', state: 'NJ', zipCode: '08865', county: 'Phillipsburg County'},
  { name: 'Piscataway Public Library', url: 'https://www.piscatawaylibrary.org', eventsUrl: 'https://www.piscatawaylibrary.org/events', city: 'Piscataway', state: 'NJ', zipCode: '08854', county: 'Piscataway County'},
  { name: 'Mccowan Memorial Library', url: 'https://www.pitmanlibrary.org', eventsUrl: 'https://www.pitmanlibrary.org/events', city: 'Pitman', state: 'NJ', zipCode: '08071', county: 'Pitman County'},
  { name: 'Plainfield Free Public Library', url: 'https://www.plainfieldlibrary.org', eventsUrl: 'https://www.plainfieldlibrary.org/events', city: 'Plainfield', state: 'NJ', zipCode: '07060', county: 'Plainfield County'},
  { name: 'Plainsboro Free Public Library', url: 'https://www.plainsborolibrary.org', eventsUrl: 'https://www.plainsborolibrary.org/events', city: 'Plainsboro', state: 'NJ', zipCode: '08536', county: 'Plainsboro County'},
  { name: 'Pompton Lakes Borough Free Public Library', url: 'https://www.pomptonlakeslibrary.org', eventsUrl: 'https://www.pomptonlakeslibrary.org/events', city: 'Pompton Lakes', state: 'NJ', zipCode: '07442', county: 'Pompton Lakes County'},
  { name: 'Pequannock Township Public Library', url: 'https://www.pomptonplainslibrary.org', eventsUrl: 'https://www.pomptonplainslibrary.org/events', city: 'Pompton Plains', state: 'NJ', zipCode: '07444', county: 'Pompton Plains County'},
  { name: 'Princeton Public Library', url: 'https://www.princetonlibrary.org', eventsUrl: 'https://www.princetonlibrary.org/events', city: 'Princeton', state: 'NJ', zipCode: '08542', county: 'Princeton County'},
  { name: 'Rahway Public Library', url: 'https://www.rahwaylibrary.org', eventsUrl: 'https://www.rahwaylibrary.org/events', city: 'Rahway', state: 'NJ', zipCode: '07065', county: 'Rahway County'},
  { name: 'Ramsey Free Public Library', url: 'https://www.ramseylibrary.org', eventsUrl: 'https://www.ramseylibrary.org/events', city: 'Ramsey', state: 'NJ', zipCode: '07446', county: 'Ramsey County'},
  { name: 'Randolph Township Free Public Library', url: 'https://www.randolphlibrary.org', eventsUrl: 'https://www.randolphlibrary.org/events', city: 'Randolph', state: 'NJ', zipCode: '07869', county: 'Randolph County'},
  { name: 'Raritan Public Library', url: 'https://www.raritanlibrary.org', eventsUrl: 'https://www.raritanlibrary.org/events', city: 'Raritan', state: 'NJ', zipCode: '08869', county: 'Raritan County'},
  { name: 'Red Bank Public Library', url: 'https://www.redbanklibrary.org', eventsUrl: 'https://www.redbanklibrary.org/events', city: 'Red Bank', state: 'NJ', zipCode: '07701', county: 'Red Bank County'},
  { name: 'Ridgefield Free Public Library', url: 'https://www.ridgefieldlibrary.org', eventsUrl: 'https://www.ridgefieldlibrary.org/events', city: 'Ridgefield', state: 'NJ', zipCode: '07657', county: 'Ridgefield County'},
  { name: 'Ridgefield Park Public Library', url: 'https://www.ridgefieldparklibrary.org', eventsUrl: 'https://www.ridgefieldparklibrary.org/events', city: 'Ridgefield Park', state: 'NJ', zipCode: '07660', county: 'Ridgefield Park County'},
  { name: 'Ridgewood Public Library', url: 'https://www.ridgewoodlibrary.org', eventsUrl: 'https://www.ridgewoodlibrary.org/events', city: 'Ridgewood', state: 'NJ', zipCode: '07450', county: 'Ridgewood County'},
  { name: 'Ringwood Public Library', url: 'https://www.ringwoodlibrary.org', eventsUrl: 'https://www.ringwoodlibrary.org/events', city: 'Ringwood', state: 'NJ', zipCode: '07456', county: 'Ringwood County'},
  { name: 'River Edge Free Public Library', url: 'https://www.riveredgelibrary.org', eventsUrl: 'https://www.riveredgelibrary.org/events', city: 'River Edge', state: 'NJ', zipCode: '07661', county: 'River Edge County'},
  { name: 'River Vale Public Library', url: 'https://www.rivervalelibrary.org', eventsUrl: 'https://www.rivervalelibrary.org/events', city: 'River Vale', state: 'NJ', zipCode: '07675', county: 'River Vale County'},
  { name: 'Riverdale Public Library', url: 'https://www.riverdalelibrary.org', eventsUrl: 'https://www.riverdalelibrary.org/events', city: 'Riverdale', state: 'NJ', zipCode: '07457', county: 'Riverdale County'},
  { name: 'Riverside Public Library', url: 'https://www.riversidelibrary.org', eventsUrl: 'https://www.riversidelibrary.org/events', city: 'Riverside', state: 'NJ', zipCode: '08075', county: 'Riverside County'},
  { name: 'Rochelle Park Public Library', url: 'https://www.rochelleparklibrary.org', eventsUrl: 'https://www.rochelleparklibrary.org/events', city: 'Rochelle Park', state: 'NJ', zipCode: '07662', county: 'Rochelle Park County'},
  { name: 'Rockaway Borough Free Public Library', url: 'https://www.rockawaylibrary.org', eventsUrl: 'https://www.rockawaylibrary.org/events', city: 'Rockaway', state: 'NJ', zipCode: '07866', county: 'Rockaway County'},
  { name: 'Florence Township Library', url: 'https://www.roeblinglibrary.org', eventsUrl: 'https://www.roeblinglibrary.org/events', city: 'Roebling', state: 'NJ', zipCode: '08554', county: 'Roebling County'},
  { name: 'Roseland Free Public Library', url: 'https://www.roselandlibrary.org', eventsUrl: 'https://www.roselandlibrary.org/events', city: 'Roseland', state: 'NJ', zipCode: '07068', county: 'Roseland County'},
  { name: 'Roselle Free Public Library', url: 'https://www.rosellelibrary.org', eventsUrl: 'https://www.rosellelibrary.org/events', city: 'Roselle', state: 'NJ', zipCode: '07203', county: 'Roselle County'},
  { name: 'Roselle Park Veterans Memorial Library', url: 'https://www.roselleparklibrary.org', eventsUrl: 'https://www.roselleparklibrary.org/events', city: 'Roselle Park', state: 'NJ', zipCode: '07204', county: 'Roselle Park County'},
  { name: 'Oceanic Free Library', url: 'https://www.rumsonlibrary.org', eventsUrl: 'https://www.rumsonlibrary.org/events', city: 'Rumson', state: 'NJ', zipCode: '07760', county: 'Rumson County'},
  { name: 'Runnemede Public Library', url: 'https://www.runnemedelibrary.org', eventsUrl: 'https://www.runnemedelibrary.org/events', city: 'Runnemede', state: 'NJ', zipCode: '08078', county: 'Runnemede County'},
  { name: 'Rutherford Free Public Library', url: 'https://www.rutherfordlibrary.org', eventsUrl: 'https://www.rutherfordlibrary.org/events', city: 'Rutherford', state: 'NJ', zipCode: '07070', county: 'Rutherford County'},
  { name: 'Saddle Brook Free Public Library', url: 'https://www.saddlebrooklibrary.org', eventsUrl: 'https://www.saddlebrooklibrary.org/events', city: 'Saddle Brook', state: 'NJ', zipCode: '07663', county: 'Saddle Brook County'},
  { name: 'Salem Free Public Library', url: 'https://www.salemlibrary.org', eventsUrl: 'https://www.salemlibrary.org/events', city: 'Salem', state: 'NJ', zipCode: '08079', county: 'Salem County'},
  { name: 'Scotch Plains Public Library', url: 'https://www.scotchplainslibrary.org', eventsUrl: 'https://www.scotchplainslibrary.org/events', city: 'Scotch Plains', state: 'NJ', zipCode: '07076', county: 'Scotch Plains County'},
  { name: 'Sea Girt Library', url: 'https://www.seagirtlibrary.org', eventsUrl: 'https://www.seagirtlibrary.org/events', city: 'Sea Girt', state: 'NJ', zipCode: '08750', county: 'Sea Girt County'},
  { name: 'Secaucus Free Public Library', url: 'https://www.secaucuslibrary.org', eventsUrl: 'https://www.secaucuslibrary.org/events', city: 'Secaucus', state: 'NJ', zipCode: '07094', county: 'Secaucus County'},
  { name: 'Franklin Twp Public Library-Somerset', url: 'https://www.somersetlibrary.org', eventsUrl: 'https://www.somersetlibrary.org/events', city: 'Somerset', state: 'NJ', zipCode: '08873', county: 'Somerset County'},
  { name: 'Somerville Public Library', url: 'https://www.somervillelibrary.org', eventsUrl: 'https://www.somervillelibrary.org/events', city: 'Somerville', state: 'NJ', zipCode: '08876', county: 'Somerville County'},
  { name: 'Dowdell Library Of South Amboy', url: 'https://www.southamboylibrary.org', eventsUrl: 'https://www.southamboylibrary.org/events', city: 'South Amboy', state: 'NJ', zipCode: '08879', county: 'South Amboy County'},
  { name: 'South Orange Public Library', url: 'https://www.southorangelibrary.org', eventsUrl: 'https://www.southorangelibrary.org/events', city: 'South Orange', state: 'NJ', zipCode: '07079', county: 'South Orange County'},
  { name: 'South Plainfield Free Public Library', url: 'https://www.southplainfieldlibrary.org', eventsUrl: 'https://www.southplainfieldlibrary.org/events', city: 'South Plainfield', state: 'NJ', zipCode: '07080', county: 'South Plainfield County'},
  { name: 'South River Public Library', url: 'https://www.southriverlibrary.org', eventsUrl: 'https://www.southriverlibrary.org/events', city: 'South River', state: 'NJ', zipCode: '08882', county: 'South River County'},
  { name: 'Sparta Public Library', url: 'https://www.spartalibrary.org', eventsUrl: 'https://www.spartalibrary.org/events', city: 'Sparta', state: 'NJ', zipCode: '07871', county: 'Sparta County'},
  { name: 'Spotswood Public Library', url: 'https://www.spotswoodlibrary.org', eventsUrl: 'https://www.spotswoodlibrary.org/events', city: 'Spotswood', state: 'NJ', zipCode: '08884', county: 'Spotswood County'},
  { name: 'Spring Lake Public Library', url: 'https://www.springlakelibrary.org', eventsUrl: 'https://www.springlakelibrary.org/events', city: 'Spring Lake', state: 'NJ', zipCode: '07762', county: 'Spring Lake County'},
  { name: 'Springfield Free Public Library', url: 'https://www.springfieldlibrary.org', eventsUrl: 'https://www.springfieldlibrary.org/events', city: 'Springfield', state: 'NJ', zipCode: '07081', county: 'Springfield County'},
  { name: 'Stratford Public Library', url: 'https://www.stratfordlibrary.org', eventsUrl: 'https://www.stratfordlibrary.org/events', city: 'Stratford', state: 'NJ', zipCode: '08084', county: 'Stratford County'},
  { name: 'Roxbury Township Public Library', url: 'https://www.succasunnalibrary.org', eventsUrl: 'https://www.succasunnalibrary.org/events', city: 'Succasunna', state: 'NJ', zipCode: '07876', county: 'Succasunna County'},
  { name: 'Summit Free Public Library', url: 'https://www.summitlibrary.org', eventsUrl: 'https://www.summitlibrary.org/events', city: 'Summit', state: 'NJ', zipCode: '07901', county: 'Summit County'},
  { name: 'Teaneck Public Library', url: 'https://www.teanecklibrary.org', eventsUrl: 'https://www.teanecklibrary.org/events', city: 'Teaneck', state: 'NJ', zipCode: '07666', county: 'Teaneck County'},
  { name: 'Tenafly Free Public Library', url: 'https://www.tenaflylibrary.org', eventsUrl: 'https://www.tenaflylibrary.org/events', city: 'Tenafly', state: 'NJ', zipCode: '07670', county: 'Tenafly County'},
  { name: 'Tinton Falls Public Library', url: 'https://www.tintonfallslibrary.org', eventsUrl: 'https://www.tintonfallslibrary.org/events', city: 'Tinton Falls', state: 'NJ', zipCode: '07724', county: 'Tinton Falls County'},
  { name: 'Ocean County Library', url: 'https://www.tomsriverlibrary.org', eventsUrl: 'https://www.tomsriverlibrary.org/events', city: 'Toms River', state: 'NJ', zipCode: '08753', county: 'Toms River County'},
  { name: 'Dwight D. Eisenhower Library', url: 'https://www.totowalibrary.org', eventsUrl: 'https://www.totowalibrary.org/events', city: 'Totowa', state: 'NJ', zipCode: '07512', county: 'Totowa County'},
  { name: 'Trenton Free Public Library', url: 'https://www.trentonlibrary.org', eventsUrl: 'https://www.trentonlibrary.org/events', city: 'Trenton', state: 'NJ', zipCode: '08608', county: 'Trenton County'},
  { name: 'Washington Twp Public Library-Bergen', url: 'https://www.twpofwashingtonlibrary.org', eventsUrl: 'https://www.twpofwashingtonlibrary.org/events', city: 'Twp. Of Washington', state: 'NJ', zipCode: '07676', county: 'Twp. Of Washington County'},
  { name: 'Union Free Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'NJ', zipCode: '07083', county: 'Union County'},
  { name: 'Union Beach Memorial Library', url: 'https://www.unionbeachlibrary.org', eventsUrl: 'https://www.unionbeachlibrary.org/events', city: 'Union Beach', state: 'NJ', zipCode: '07735', county: 'Union Beach County'},
  { name: 'Union City Public Library', url: 'https://www.unioncitylibrary.org', eventsUrl: 'https://www.unioncitylibrary.org/events', city: 'Union City', state: 'NJ', zipCode: '07087', county: 'Union City County'},
  { name: 'Upper Saddle River Public Library', url: 'https://www.uppersaddlerivelibrary.org', eventsUrl: 'https://www.uppersaddlerivelibrary.org/events', city: 'Upper Saddle Rive', state: 'NJ', zipCode: '07458', county: 'Upper Saddle Rive County'},
  { name: 'Verona Free Public Library', url: 'https://www.veronalibrary.org', eventsUrl: 'https://www.veronalibrary.org/events', city: 'Verona', state: 'NJ', zipCode: '07044', county: 'Verona County'},
  { name: 'Sally Stretch Keen Memorial Library', url: 'https://www.vincentownlibrary.org', eventsUrl: 'https://www.vincentownlibrary.org/events', city: 'Vincentown', state: 'NJ', zipCode: '08088', county: 'Vincentown County'},
  { name: 'Vineland Public Library', url: 'https://www.vinelandlibrary.org', eventsUrl: 'https://www.vinelandlibrary.org/events', city: 'Vineland', state: 'NJ', zipCode: '08360', county: 'Vineland County'},
  { name: 'Camden County Library', url: 'https://www.voorheeslibrary.org', eventsUrl: 'https://www.voorheeslibrary.org/events', city: 'Voorhees', state: 'NJ', zipCode: '08043', county: 'Voorhees County'},
  { name: 'Waldwick Public Library', url: 'https://www.waldwicklibrary.org', eventsUrl: 'https://www.waldwicklibrary.org/events', city: 'Waldwick', state: 'NJ', zipCode: '07463', county: 'Waldwick County'},
  { name: 'John F. Kennedy Memorial Library', url: 'https://www.wallingtonlibrary.org', eventsUrl: 'https://www.wallingtonlibrary.org/events', city: 'Wallington', state: 'NJ', zipCode: '07057', county: 'Wallington County'},
  { name: 'Wanaque Borough Free Public Library', url: 'https://www.wanaquelibrary.org', eventsUrl: 'https://www.wanaquelibrary.org/events', city: 'Wanaque', state: 'NJ', zipCode: '07465', county: 'Wanaque County'},
  { name: 'Washington Public Library', url: 'https://www.washingtonlibrary.org', eventsUrl: 'https://www.washingtonlibrary.org/events', city: 'Washington', state: 'NJ', zipCode: '07882', county: 'Washington County'},
  { name: 'Wayne Public Library', url: 'https://www.waynelibrary.org', eventsUrl: 'https://www.waynelibrary.org/events', city: 'Wayne', state: 'NJ', zipCode: '07470', county: 'Wayne County'},
  { name: 'Weehawken Free Public Library', url: 'https://www.weehawkenlibrary.org', eventsUrl: 'https://www.weehawkenlibrary.org/events', city: 'Weehawken', state: 'NJ', zipCode: '07086', county: 'Weehawken County'},
  { name: 'Wenonah Free Public Library', url: 'https://www.wenonahlibrary.org', eventsUrl: 'https://www.wenonahlibrary.org/events', city: 'Wenonah', state: 'NJ', zipCode: '08090', county: 'Wenonah County'},
  { name: 'West Caldwell Public Library', url: 'https://www.westcaldwelllibrary.org', eventsUrl: 'https://www.westcaldwelllibrary.org/events', city: 'West Caldwell', state: 'NJ', zipCode: '07006', county: 'West Caldwell County'},
  { name: 'West Deptford Free Public Library', url: 'https://www.westdeptfordlibrary.org', eventsUrl: 'https://www.westdeptfordlibrary.org/events', city: 'West Deptford', state: 'NJ', zipCode: '08086', county: 'West Deptford County'},
  { name: 'West Long Branch Public Library', url: 'https://www.westlongbranchlibrary.org', eventsUrl: 'https://www.westlongbranchlibrary.org/events', city: 'West Long Branch', state: 'NJ', zipCode: '07764', county: 'West Long Branch County'},
  { name: 'West Milford Township Library', url: 'https://www.westmilfordlibrary.org', eventsUrl: 'https://www.westmilfordlibrary.org/events', city: 'West Milford', state: 'NJ', zipCode: '07480', county: 'West Milford County'},
  { name: 'West New York Free Public Library', url: 'https://www.westnewyorklibrary.org', eventsUrl: 'https://www.westnewyorklibrary.org/events', city: 'West New York', state: 'NJ', zipCode: '07093', county: 'West New York County'},
  { name: 'West Orange Free Public Library', url: 'https://www.westorangelibrary.org', eventsUrl: 'https://www.westorangelibrary.org/events', city: 'West Orange', state: 'NJ', zipCode: '07052', county: 'West Orange County'},
  { name: 'Burlington County Library', url: 'https://www.westamptonlibrary.org', eventsUrl: 'https://www.westamptonlibrary.org/events', city: 'Westampton', state: 'NJ', zipCode: '08060', county: 'Westampton County'},
  { name: 'Westfield Memorial Library', url: 'https://www.westfieldlibrary.org', eventsUrl: 'https://www.westfieldlibrary.org/events', city: 'Westfield', state: 'NJ', zipCode: '07090', county: 'Westfield County'},
  { name: 'Westville Public Library', url: 'https://www.westvillelibrary.org', eventsUrl: 'https://www.westvillelibrary.org/events', city: 'Westville', state: 'NJ', zipCode: '08093', county: 'Westville County'},
  { name: 'Westwood Free Public Library', url: 'https://www.westwoodlibrary.org', eventsUrl: 'https://www.westwoodlibrary.org/events', city: 'Westwood', state: 'NJ', zipCode: '07675', county: 'Westwood County'},
  { name: 'Wharton Public Library', url: 'https://www.whartonlibrary.org', eventsUrl: 'https://www.whartonlibrary.org/events', city: 'Wharton', state: 'NJ', zipCode: '07885', county: 'Wharton County'},
  { name: 'Morris County Library', url: 'https://www.whippanylibrary.org', eventsUrl: 'https://www.whippanylibrary.org/events', city: 'Whippany', state: 'NJ', zipCode: '07981', county: 'Whippany County'},
  { name: 'Monroe Twp Public Library-Gloucester', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'NJ', zipCode: '08094', county: 'Williamstown County'},
  { name: 'Willingboro Public Library', url: 'https://www.willingborolibrary.org', eventsUrl: 'https://www.willingborolibrary.org/events', city: 'Willingboro', state: 'NJ', zipCode: '08046', county: 'Willingboro County'},
  { name: 'Wood-Ridge Memorial Library', url: 'https://www.woodridgelibrary.org', eventsUrl: 'https://www.woodridgelibrary.org/events', city: 'Wood-Ridge', state: 'NJ', zipCode: '07075', county: 'Wood-Ridge County'},
  { name: 'Woodbridge Public Library', url: 'https://www.woodbridgelibrary.org', eventsUrl: 'https://www.woodbridgelibrary.org/events', city: 'Woodbridge', state: 'NJ', zipCode: '07095', county: 'Woodbridge County'},
  { name: 'Woodbury Public Library', url: 'https://www.woodburylibrary.org', eventsUrl: 'https://www.woodburylibrary.org/events', city: 'Woodbury', state: 'NJ', zipCode: '08096', county: 'Woodbury County'},
  { name: 'Alfred H. Baumann Library-West Paterso', url: 'https://www.woodlandparklibrary.org', eventsUrl: 'https://www.woodlandparklibrary.org/events', city: 'Woodland Park', state: 'NJ', zipCode: '07424', county: 'Woodland Park County'},
  { name: 'Woodstown-Pilesgrove Library', url: 'https://www.woodstownlibrary.org', eventsUrl: 'https://www.woodstownlibrary.org/events', city: 'Woodstown', state: 'NJ', zipCode: '08098', county: 'Woodstown County'},
  { name: 'Wyckoff Free Public Library', url: 'https://www.wyckofflibrary.org', eventsUrl: 'https://www.wyckofflibrary.org/events', city: 'Wyckoff', state: 'NJ', zipCode: '07481', county: 'Wyckoff County'}
];

const SCRAPER_NAME = 'wordpress-NJ';

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
      await page.goto(library.eventsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      const libraryEvents = await page.evaluate((libName) => {
        const events = [];
        const eventSelectors = [
          '[class*="event"]',
          '[class*="program"]',
          '[class*="calendar"]',
          '[id*="event"]',
          'article',
          '.post',
          '.item'
        ];

        const foundElements = new Set();

        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              const possibleTitles = [
                card.querySelector('h1, h2, h3, h4, h5'),
                card.querySelector('[class*="title"]'),
                card.querySelector('[class*="name"]'),
                card.querySelector('a')
              ].filter(el => el && el.textContent.trim().length > 0);

              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\w+ \d{1,2},? \d{4}|^\d{1,2}:\d{2}/i)
                )
              ].filter(el => el);

              const possibleDescs = [
                card.querySelector('[class*="description"]'),
                card.querySelector('[class*="summary"]'),
                card.querySelector('p')
              ].filter(el => el && el.textContent.trim().length > 20);

              const linkEl = card.querySelector('a[href]');
              const imageEl = card.querySelector('img');

              const ageEl = [
                card.querySelector('[class*="audience"]'),
                card.querySelector('[class*="age-range"]'),
                card.querySelector('[class*="age_range"]'),
                card.querySelector('[class*="ages"]'),
                card.querySelector('[class*="age-group"]'),
                card.querySelector('[class*="category"]')
              ].find(el => el && el.textContent.trim().length > 0 && el.textContent.trim().length < 80);

              if (possibleTitles.length > 0) {
                const event = {
                  title: possibleTitles[0].textContent.trim(),
                  date: possibleDates.length > 0 ? possibleDates[0].textContent.trim() : '',
                  time: possibleDates.length > 1 ? possibleDates[1].textContent.trim() : '',
                  description: possibleDescs.length > 0 ? possibleDescs[0].textContent.trim() : '',
                  url: linkEl ? linkEl.href : window.location.href,
                  imageUrl: imageEl ? imageEl.src : '',
                  ageRange: ageEl ? ageEl.textContent.trim() : '',
                  location: libName,
                  venueName: libName
                };

                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      libraryEvents.forEach(event => {
        events.push({
          ...event,
          metadata: {
            sourceName: library.name,
            sourceUrl: library.url,
            scrapedAt: new Date().toISOString(),
            scraperName: SCRAPER_NAME,
            category: 'library',
            platform: 'generic',
            state: 'NJ',
            city: library.city,
            zipCode: library.zipCode,
            needsReview: true
          }
        });
      });

      await page.close();
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();
  console.log(`\n📊 Total events found: ${events.length}`);
  return events;
}

async function saveToDatabase(events) {
  return await saveEventsWithGeocoding(events, LIBRARIES, {
    scraperName: SCRAPER_NAME,
    state: 'NJ',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  New Jersey Libraries Scraper (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeGenericEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}


/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressNJCloudFunction() {
  console.log('☁️ Running WordPress NJ as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-NJ', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  await logScraperResult('WordPress-NJ', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressNJCloudFunction };
