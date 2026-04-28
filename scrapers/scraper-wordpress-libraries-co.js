const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * AUTO-GENERATED GENERIC SCRAPER
 * State: CO
 * Platform: Unknown/Custom
 * Libraries: [
  {
    "name": "Denver Public Library",
    "url": "https://www.denverlibrary.org",
    "platform": "wordpress",
    "eventsUrl": "https://www.denverlibrary.org/events"
  }
]
 */

const LIBRARIES = [
  { name: 'Denver Public Library', url: 'https://www.denverlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.denverlibrary.org/events', city: 'Denver', state: 'CO', zipCode: '', county: '' },
  { name: 'Aguilar Public Library', url: 'https://www.aguilarlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.aguilarlibrary.org/events', city: 'Aguilar', state: 'CO', zipCode: '81020', county: '' },
  { name: 'Akron Public Library', url: 'https://www.akronlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.akronlibrary.org/events', city: 'Akron', state: 'CO', zipCode: '80720', county: '' },
  { name: 'Alamosa-Southern Peaks Public Library', url: 'https://www.alamosasouthernpeakslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.alamosasouthernpeakslibrary.org/events', city: 'Alamosa', state: 'CO', zipCode: '81101', county: '' },
  { name: 'Southern Peaks Public Library', url: 'https://www.southernpeakslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southernpeakslibrary.org/events', city: 'Alamosa', state: 'CO', zipCode: '', county: '' },
  { name: 'Arvada Library', url: 'https://www.arvadalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.arvadalibrary.org/events', city: 'Arvada', state: 'CO', zipCode: '', county: '' },
  { name: 'Standley Lake Library', url: 'https://www.standleylakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.standleylakelibrary.org/events', city: 'Arvada', state: 'CO', zipCode: '', county: '' },
  { name: 'Pitkin County Library', url: 'https://www.pitkincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.pitkincountylibrary.org/events', city: 'Aspen', state: 'CO', zipCode: '81611', county: '' },
  { name: 'Northern Plains Public Library', url: 'https://www.northernplainslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northernplainslibrary.org/events', city: 'Ault', state: 'CO', zipCode: '', county: '' },
  { name: 'Avon Branch Library', url: 'https://www.avonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.avonlibrary.org/events', city: 'Avon', state: 'CO', zipCode: '', county: '' },
  { name: 'Park County Public Library', url: 'https://www.parkcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.parkcountylibrary.org/events', city: 'Bailey', state: 'CO', zipCode: '', county: '' },
  { name: 'Basalt Regional Library District', url: 'https://www.basaltregionallibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.basaltregionallibrarydistrict.org/events', city: 'Basalt', state: 'CO', zipCode: '81621', county: '' },
  { name: 'Pine River Public Library District-Bayfield', url: 'https://www.pineriverpubliclibrarydistrictbayfield.org', platform: 'wordpress', eventsUrl: 'https://www.pineriverpubliclibrarydistrictbayfield.org/events', city: 'Bayfield', state: 'CO', zipCode: '81122', county: '' },
  { name: 'Bennett Branch Library', url: 'https://www.bennettlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bennettlibrary.org/events', city: 'Bennett', state: 'CO', zipCode: '', county: '' },
  { name: 'Berthoud Community Library District', url: 'https://www.berthoudcommunitylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.berthoudcommunitylibrarydistrict.org/events', city: 'Berthoud', state: 'CO', zipCode: '80513', county: '' },
  { name: 'Gilpin County Library District', url: 'https://www.gilpincountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gilpincountylibrary.org/events', city: 'Black Hawk', state: 'CO', zipCode: '80422', county: '' },
  { name: 'South Branch Library', url: 'https://www.southlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southlibrary.org/events', city: 'Breckenridge', state: 'CO', zipCode: '', county: '' },
  { name: 'Brighton Branch Library', url: 'https://www.brightonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.brightonlibrary.org/events', city: 'Brighton', state: 'CO', zipCode: '', county: '' },
  { name: 'Broomfield-Eisenhower Public Library', url: 'https://www.broomfieldeisenhowerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.broomfieldeisenhowerlibrary.org/events', city: 'Broomfield', state: 'CO', zipCode: '80020', county: '' },
  { name: 'Mamie Doud Eisenhower Public Library', url: 'https://www.mamiedoudeisenhowerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mamiedoudeisenhowerlibrary.org/events', city: 'Broomfield', state: 'CO', zipCode: '', county: '' },
  { name: 'East Morgan County Library District-Brush', url: 'https://www.eastmorgancountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastmorgancountylibrary.org/events', city: 'Brush', state: 'CO', zipCode: '80723', county: '' },
  { name: 'Northern Chaffee County Lib Dist-Buena Vista', url: 'https://www.northernchaffeecountylibdistbuenavista.org', platform: 'wordpress', eventsUrl: 'https://www.northernchaffeecountylibdistbuenavista.org/events', city: 'Buena Vista', state: 'CO', zipCode: '81211', county: '' },
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'CO', zipCode: '80807', county: '' },
  { name: 'Kelver Library', url: 'https://www.kelverlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kelverlibrary.org/events', city: 'Byers', state: 'CO', zipCode: '', county: '' },
  { name: 'Canon City Public Library', url: 'https://www.canoncitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.canoncitylibrary.org/events', city: 'Canon City', state: 'CO', zipCode: '81212', county: '' },
  { name: 'Garfield County Library - Gordon Cooper', url: 'https://www.garfieldcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/events', city: 'Carbondale', state: 'CO', zipCode: '', county: '' },
  { name: 'Ute Pass Branch', url: 'https://www.utepassbranch.org', platform: 'wordpress', eventsUrl: 'https://www.utepassbranch.org/events', city: 'Cascade', state: 'CO', zipCode: '', county: '' },
  { name: 'Cedaredge Public Library', url: 'https://www.cedaredgelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cedaredgelibrary.org/events', city: 'Cedaredge', state: 'CO', zipCode: '', county: '' },
  { name: 'Castlewood Library', url: 'https://www.castlewoodlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.castlewoodlibrary.org/events', city: 'Centennial', state: 'CO', zipCode: '', county: '' },
  { name: 'Koelbel Library', url: 'https://www.koelbellibrary.org', platform: 'wordpress', eventsUrl: 'https://www.koelbellibrary.org/events', city: 'Centennial', state: 'CO', zipCode: '', county: '' },
  { name: 'Smoky Hill Public Library', url: 'https://www.smokyhilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.smokyhilllibrary.org/events', city: 'Centennial', state: 'CO', zipCode: '', county: '' },
  { name: 'Southglenn Library', url: 'https://www.southglennlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southglennlibrary.org/events', city: 'Centennial', state: 'CO', zipCode: '', county: '' },
  { name: 'Center Public Library', url: 'https://www.centerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.centerlibrary.org/events', city: 'Center', state: 'CO', zipCode: '', county: '' },
  { name: 'East Cheyenne County Library District', url: 'https://www.eastcheyennecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eastcheyennecountylibrary.org/events', city: 'Cheyenne Wells', state: 'CO', zipCode: '80810', county: '' },
  { name: 'Clifton Branch', url: 'https://www.cliftonbranch.org', platform: 'wordpress', eventsUrl: 'https://www.cliftonbranch.org/events', city: 'Clifton', state: 'CO', zipCode: '', county: '' },
  { name: 'Collbran Branch Library', url: 'https://www.collbranlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.collbranlibrary.org/events', city: 'Collbran', state: 'CO', zipCode: '', county: '' },
  { name: 'Commerce City Branch Library', url: 'https://www.commercecitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.commercecitylibrary.org/events', city: 'Commerce City', state: 'CO', zipCode: '', county: '' },
  { name: 'Conifer Library', url: 'https://www.coniferlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.coniferlibrary.org/events', city: 'Conifer', state: 'CO', zipCode: '', county: '' },
  { name: 'Cortez Public Library', url: 'https://www.cortezlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cortezlibrary.org/events', city: 'Cortez', state: 'CO', zipCode: '81321', county: '' },
  { name: 'Cotopaxi School-Community Library', url: 'https://www.cotopaxischoolcommunitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.cotopaxischoolcommunitylibrary.org/events', city: 'Cotopaxi', state: 'CO', zipCode: '81223', county: '' },
  { name: 'Moffat County Library', url: 'https://www.moffatcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.moffatcountylibrary.org/events', city: 'Craig', state: 'CO', zipCode: '81625', county: '' },
  { name: 'Crawford Community Library', url: 'https://www.crawfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crawfordlibrary.org/events', city: 'Crawford', state: 'CO', zipCode: '', county: '' },
  { name: 'Mineral County School-Regional Public Library', url: 'https://www.mineralcountyschoolregionallibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mineralcountyschoolregionallibrary.org/events', city: 'Creede', state: 'CO', zipCode: '81130', county: '' },
  { name: 'Crested Butte Branch Library', url: 'https://www.crestedbuttelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.crestedbuttelibrary.org/events', city: 'Crested Butte', state: 'CO', zipCode: '', county: '' },
  { name: 'Franklin Ferguson Memorial Library', url: 'https://www.franklinfergusonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.franklinfergusonlibrary.org/events', city: 'Cripple Creek', state: 'CO', zipCode: '', county: '' },
  { name: 'Southern Teller County School-Public Lib Dist', url: 'https://www.southerntellercountyschoolpubliclibdist.org', platform: 'wordpress', eventsUrl: 'https://www.southerntellercountyschoolpubliclibdist.org/events', city: 'Cripple Creek', state: 'CO', zipCode: '80813', county: '' },
  { name: 'Dacono Public Library', url: 'https://www.daconolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.daconolibrary.org/events', city: 'Dacono', state: 'CO', zipCode: '80514', county: '' },
  { name: 'Debeque Branch Library', url: 'https://www.debequelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.debequelibrary.org/events', city: 'Debeque', state: 'CO', zipCode: '', county: '' },
  { name: 'Davies Library', url: 'https://www.davieslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.davieslibrary.org/events', city: 'Deer Trail', state: 'CO', zipCode: '', county: '' },
  { name: 'Del Norte Public Library', url: 'https://www.delnortelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.delnortelibrary.org/events', city: 'Del Norte', state: 'CO', zipCode: '', county: '' },
  { name: 'Dinosaur Branch Library', url: 'https://www.dinosaurlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.dinosaurlibrary.org/events', city: 'Dinosaur', state: 'CO', zipCode: '', county: '' },
  { name: 'Dolores Library District-Montezuma County', url: 'https://www.doloreslibrarydistrictmontezumacounty.org', platform: 'wordpress', eventsUrl: 'https://www.doloreslibrarydistrictmontezumacounty.org/events', city: 'Dolores', state: 'CO', zipCode: '81323', county: '' },
  { name: 'Dolores Public Library', url: 'https://www.doloreslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.doloreslibrary.org/events', city: 'Dolores', state: 'CO', zipCode: '', county: '' },
  { name: 'Adult-High School Branch', url: 'https://www.adulthighschoolbranch.org', platform: 'wordpress', eventsUrl: 'https://www.adulthighschoolbranch.org/events', city: 'Dove Creek', state: 'CO', zipCode: '', county: '' },
  { name: 'Children-Elementary School Branch', url: 'https://www.childrenelementaryschoolbranch.org', platform: 'wordpress', eventsUrl: 'https://www.childrenelementaryschoolbranch.org/events', city: 'Dove Creek', state: 'CO', zipCode: '', county: '' },
  { name: 'Dolores County School-Public Lib Dove Creek', url: 'https://www.dolorescountyschoolpubliclibdovecreek.org', platform: 'wordpress', eventsUrl: 'https://www.dolorescountyschoolpubliclibdovecreek.org/events', city: 'Dove Creek', state: 'CO', zipCode: '81324', county: '' },
  { name: 'Durango Public Library', url: 'https://www.durangolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.durangolibrary.org/events', city: 'Durango', state: 'CO', zipCode: '81301', county: '' },
  { name: 'Durango-Sunnyside Branch', url: 'https://www.durangosunnysidebranch.org', platform: 'wordpress', eventsUrl: 'https://www.durangosunnysidebranch.org/events', city: 'Durango', state: 'CO', zipCode: '', county: '' },
  { name: 'Kiowa County Public Library District', url: 'https://www.kiowacountypubliclibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.kiowacountypubliclibrarydistrict.org/events', city: 'Eads', state: 'CO', zipCode: '81036', county: '' },
  { name: 'Eagle Valley Library District', url: 'https://www.eaglevalleylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.eaglevalleylibrarydistrict.org/events', city: 'Eagle', state: 'CO', zipCode: '81631', county: '' },
  { name: 'Eaton Public Library', url: 'https://www.eatonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.eatonlibrary.org/events', city: 'Eaton', state: 'CO', zipCode: '', county: '' },
  { name: 'Edgewater Library', url: 'https://www.edgewaterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.edgewaterlibrary.org/events', city: 'Edgewater', state: 'CO', zipCode: '', county: '' },
  { name: 'Elbert County Library District', url: 'https://www.elbertcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elbertcountylibrary.org/events', city: 'Elizabeth', state: 'CO', zipCode: '80107', county: '' },
  { name: 'Elizabeth Branch Library', url: 'https://www.elizabethlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.elizabethlibrary.org/events', city: 'Elizabeth', state: 'CO', zipCode: '', county: '' },
  { name: 'Estes Valley Public Library District', url: 'https://www.estesvalleypubliclibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.estesvalleypubliclibrarydistrict.org/events', city: 'Estes Park', state: 'CO', zipCode: '80517', county: '' },
  { name: 'Evergreen Library', url: 'https://www.evergreenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.evergreenlibrary.org/events', city: 'Evergreen', state: 'CO', zipCode: '', county: '' },
  { name: 'Fairplay Branch Library', url: 'https://www.fairplaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fairplaylibrary.org/events', city: 'Fairplay', state: 'CO', zipCode: '', county: '' },
  { name: 'Park County Public Library', url: 'https://www.parkcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.parkcountylibrary.org/events', city: 'Fairplay', state: 'CO', zipCode: '80440', county: '' },
  { name: 'Flagler Community Library', url: 'https://www.flaglerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.flaglerlibrary.org/events', city: 'Flagler', state: 'CO', zipCode: '80815', county: '' },
  { name: 'Fleming Community Library (School-Public)', url: 'https://www.flemingcommunitylibraryschoolpublic.org', platform: 'wordpress', eventsUrl: 'https://www.flemingcommunitylibraryschoolpublic.org/events', city: 'Fleming', state: 'CO', zipCode: '80728', county: '' },
  { name: 'John C. Fremont Library District (Florence)', url: 'https://www.johncfremontlibrarydistrictflorence.org', platform: 'wordpress', eventsUrl: 'https://www.johncfremontlibrarydistrictflorence.org/events', city: 'Florence', state: 'CO', zipCode: '81226', county: '' },
  { name: 'Florissant Branch', url: 'https://www.florissantbranch.org', platform: 'wordpress', eventsUrl: 'https://www.florissantbranch.org/events', city: 'Florissant', state: 'CO', zipCode: '', county: '' },
  { name: 'Fort Collins Public Library', url: 'https://www.fortcollinslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fortcollinslibrary.org/events', city: 'Fort Collins', state: 'CO', zipCode: '', county: '' },
  { name: 'Harmony Library', url: 'https://www.harmonylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.harmonylibrary.org/events', city: 'Fort Collins', state: 'CO', zipCode: '', county: '' },
  { name: 'Poudre River Public Library District', url: 'https://www.poudreriverpubliclibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.poudreriverpubliclibrarydistrict.org/events', city: 'Fort Collins', state: 'CO', zipCode: '80524', county: '' },
  { name: 'Fort Lupton Public School Library', url: 'https://www.fortluptonpublicschoollibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fortluptonpublicschoollibrary.org/events', city: 'Fort Lupton', state: 'CO', zipCode: '', county: '' },
  { name: 'Fort Morgan Public Library', url: 'https://www.fortmorganlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fortmorganlibrary.org/events', city: 'Fort Morgan', state: 'CO', zipCode: '80701', county: '' },
  { name: 'Fountain Branch Library', url: 'https://www.fountainlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fountainlibrary.org/events', city: 'Fountain', state: 'CO', zipCode: '', county: '' },
  { name: 'Fowler Public Library', url: 'https://www.fowlerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fowlerlibrary.org/events', city: 'Fowler', state: 'CO', zipCode: '81039', county: '' },
  { name: 'Fowler Public Library', url: 'https://www.fowlerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fowlerlibrary.org/events', city: 'Fowler', state: 'CO', zipCode: '', county: '' },
  { name: 'Fraser Valley Library', url: 'https://www.fraservalleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fraservalleylibrary.org/events', city: 'Fraser', state: 'CO', zipCode: '', county: '' },
  { name: 'Carbon Valley Branch Library', url: 'https://www.carbonvalleylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.carbonvalleylibrary.org/events', city: 'Frederick', state: 'CO', zipCode: '', county: '' },
  { name: 'Summit County Library', url: 'https://www.summitcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.summitcountylibrary.org/events', city: 'Frisco', state: 'CO', zipCode: '80443', county: '' },
  { name: 'Fruita Branch Library', url: 'https://www.fruitalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.fruitalibrary.org/events', city: 'Fruita', state: 'CO', zipCode: '', county: '' },
  { name: 'Gateway Branch Library', url: 'https://www.gatewaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gatewaylibrary.org/events', city: 'Gateway', state: 'CO', zipCode: '', county: '' },
  { name: 'Clear Creek Library District', url: 'https://www.clearcreeklibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.clearcreeklibrarydistrict.org/events', city: 'Georgetown', state: 'CO', zipCode: '80444', county: '' },
  { name: 'John Tomay Memorial Library', url: 'https://www.johntomaylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.johntomaylibrary.org/events', city: 'Georgetown', state: 'CO', zipCode: '', county: '' },
  { name: 'Glendale Library', url: 'https://www.glendalelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.glendalelibrary.org/events', city: 'Glendale', state: 'CO', zipCode: '', county: '' },
  { name: 'Garfield County Library - Glenwood Springs', url: 'https://www.garfieldcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/events', city: 'Glenwood Springs', state: 'CO', zipCode: '81601', county: '' },
  { name: 'Golden Library', url: 'https://www.goldenlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.goldenlibrary.org/events', city: 'Golden', state: 'CO', zipCode: '', county: '' },
  { name: 'Granby Branch Library', url: 'https://www.granbylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.granbylibrary.org/events', city: 'Granby', state: 'CO', zipCode: '', county: '' },
  { name: 'Grand County Library District', url: 'https://www.grandcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.grandcountylibrary.org/events', city: 'Granby', state: 'CO', zipCode: '80446', county: '' },
  { name: 'Juniper Library', url: 'https://www.juniperlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.juniperlibrary.org/events', city: 'Grand Lake', state: 'CO', zipCode: '', county: '' },
  { name: 'Centennial Park Branch', url: 'https://www.centennialparkbranch.org', platform: 'wordpress', eventsUrl: 'https://www.centennialparkbranch.org/events', city: 'Greeley', state: 'CO', zipCode: '', county: '' },
  { name: 'Farr Branch', url: 'https://www.farrbranch.org', platform: 'wordpress', eventsUrl: 'https://www.farrbranch.org/events', city: 'Greeley', state: 'CO', zipCode: '', county: '' },
  { name: 'High Plains Library District', url: 'https://www.highplainslibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.highplainslibrarydistrict.org/events', city: 'Greeley', state: 'CO', zipCode: '80634', county: '' },
  { name: 'Lincoln Park Branch', url: 'https://www.lincolnparkbranch.org', platform: 'wordpress', eventsUrl: 'https://www.lincolnparkbranch.org/events', city: 'Greeley', state: 'CO', zipCode: '', county: '' },
  { name: 'Guffey Branch Library', url: 'https://www.guffeylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.guffeylibrary.org/events', city: 'Guffey', state: 'CO', zipCode: '', county: '' },
  { name: 'Gunnison County Public Library', url: 'https://www.gunnisoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gunnisoncountylibrary.org/events', city: 'Gunnison', state: 'CO', zipCode: '81230', county: '' },
  { name: 'Gypsum Public Library', url: 'https://www.gypsumlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.gypsumlibrary.org/events', city: 'Gypsum', state: 'CO', zipCode: '', county: '' },
  { name: 'Haxtun Public Library', url: 'https://www.haxtunlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.haxtunlibrary.org/events', city: 'Haxtun', state: 'CO', zipCode: '80731', county: '' },
  { name: 'West Routt Library District-Hayden', url: 'https://www.westrouttlibrarydistricthayden.org', platform: 'wordpress', eventsUrl: 'https://www.westrouttlibrarydistricthayden.org/events', city: 'Hayden', state: 'CO', zipCode: '81639', county: '' },
  { name: 'Fort Lewis Mesa Branch', url: 'https://www.fortlewismesabranch.org', platform: 'wordpress', eventsUrl: 'https://www.fortlewismesabranch.org/events', city: 'Hesperus', state: 'CO', zipCode: '', county: '' },
  { name: 'Highlands Ranch Library', url: 'https://www.highlandsranchlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.highlandsranchlibrary.org/events', city: 'Highlands Ranch', state: 'CO', zipCode: '', county: '' },
  { name: 'Holly Public Library', url: 'https://www.hollylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hollylibrary.org/events', city: 'Holly', state: 'CO', zipCode: '81047', county: '' },
  { name: 'Holyoke-Heginbotham Library', url: 'https://www.holyokeheginbothamlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.holyokeheginbothamlibrary.org/events', city: 'Holyoke', state: 'CO', zipCode: '80734', county: '' },
  { name: 'Hot Sulphur Springs Library', url: 'https://www.hotsulphurspringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hotsulphurspringslibrary.org/events', city: 'Hot Sulphur Springs', state: 'CO', zipCode: '', county: '' },
  { name: 'Delta County Public Library District', url: 'https://www.deltacountypubliclibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.deltacountypubliclibrarydistrict.org/events', city: 'Hotchkiss', state: 'CO', zipCode: '81419', county: '' },
  { name: 'Hotchkiss Public Library', url: 'https://www.hotchkisslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hotchkisslibrary.org/events', city: 'Hotchkiss', state: 'CO', zipCode: '', county: '' },
  { name: 'Hudson Public Library', url: 'https://www.hudsonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hudsonlibrary.org/events', city: 'Hudson', state: 'CO', zipCode: '', county: '' },
  { name: 'Hugo Public Library', url: 'https://www.hugolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.hugolibrary.org/events', city: 'Hugo', state: 'CO', zipCode: '80821', county: '' },
  { name: 'Idaho Springs Public Library', url: 'https://www.idahospringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.idahospringslibrary.org/events', city: 'Idaho Springs', state: 'CO', zipCode: '', county: '' },
  { name: 'Ignacio Library District', url: 'https://www.ignaciolibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.ignaciolibrarydistrict.org/events', city: 'Ignacio', state: 'CO', zipCode: '81137', county: '' },
  { name: 'Mcclanahan Memorial Library', url: 'https://www.mcclanahanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mcclanahanlibrary.org/events', city: 'Ignacio', state: 'CO', zipCode: '', county: '' },
  { name: 'Glenn A. Jones, M.D. Memorial Library', url: 'https://www.glennajonesmdlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.glennajonesmdlibrary.org/events', city: 'Johnstown', state: 'CO', zipCode: '', county: '' },
  { name: 'Julesburg Public Library', url: 'https://www.julesburglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.julesburglibrary.org/events', city: 'Julesburg', state: 'CO', zipCode: '80737', county: '' },
  { name: 'Kremmling Library', url: 'https://www.kremmlinglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.kremmlinglibrary.org/events', city: 'Kremmling', state: 'CO', zipCode: '', county: '' },
  { name: 'Conejos County Library District', url: 'https://www.conejoscountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.conejoscountylibrary.org/events', city: 'La Jara', state: 'CO', zipCode: '81140', county: '' },
  { name: 'La Junta-Woodruff Memorial Library', url: 'https://www.lajuntawoodrufflibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lajuntawoodrufflibrary.org/events', city: 'La Junta', state: 'CO', zipCode: '81050', county: '' },
  { name: 'La Veta Regional Library District', url: 'https://www.lavetaregionallibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.lavetaregionallibrarydistrict.org/events', city: 'La Veta', state: 'CO', zipCode: '81055', county: '' },
  { name: 'Hinsdale Library District-Lake City', url: 'https://www.hinsdalelibrarydistrictlakecity.org', platform: 'wordpress', eventsUrl: 'https://www.hinsdalelibrarydistrictlakecity.org/events', city: 'Lake City', state: 'CO', zipCode: '81235', county: '' },
  { name: 'Lake George Branch Library', url: 'https://www.lakegeorgelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakegeorgelibrary.org/events', city: 'Lake George', state: 'CO', zipCode: '', county: '' },
  { name: 'Lamar Public Library', url: 'https://www.lamarlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lamarlibrary.org/events', city: 'Lamar', state: 'CO', zipCode: '81052', county: '' },
  { name: 'Bent County Library District', url: 'https://www.bentcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bentcountylibrary.org/events', city: 'Las Animas', state: 'CO', zipCode: '', county: '' },
  { name: 'Las Animas-Bent County Library District', url: 'https://www.lasanimasbentcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lasanimasbentcountylibrary.org/events', city: 'Las Animas', state: 'CO', zipCode: '81054', county: '' },
  { name: 'Lake County Public Library', url: 'https://www.lakecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lakecountylibrary.org/events', city: 'Leadville', state: 'CO', zipCode: '80461', county: '' },
  { name: 'Limon Memorial Library', url: 'https://www.limonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.limonlibrary.org/events', city: 'Limon', state: 'CO', zipCode: '80828', county: '' },
  { name: 'Columbine Library', url: 'https://www.columbinelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.columbinelibrary.org/events', city: 'Littleton', state: 'CO', zipCode: '', county: '' },
  { name: 'Koelbel Public Library', url: 'https://www.koelbellibrary.org', platform: 'wordpress', eventsUrl: 'https://www.koelbellibrary.org/events', city: 'Littleton', state: 'CO', zipCode: '', county: '' },
  { name: 'Littleton-Bemis Public Library', url: 'https://www.littletonbemislibrary.org', platform: 'wordpress', eventsUrl: 'https://www.littletonbemislibrary.org/events', city: 'Littleton', state: 'CO', zipCode: '80120', county: '' },
  { name: 'Neighborhood Library At Roxborough', url: 'https://www.neighborhoodlibraryatroxborough.org', platform: 'wordpress', eventsUrl: 'https://www.neighborhoodlibraryatroxborough.org/events', city: 'Littleton', state: 'CO', zipCode: '', county: '' },
  { name: 'Southglenn Public Library', url: 'https://www.southglennlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.southglennlibrary.org/events', city: 'Littleton', state: 'CO', zipCode: '', county: '' },
  { name: 'Neighborhood Library At Lone Tree', url: 'https://www.neighborhoodlibraryatlonetree.org', platform: 'wordpress', eventsUrl: 'https://www.neighborhoodlibraryatlonetree.org/events', city: 'Lone Tree', state: 'CO', zipCode: '', county: '' },
  { name: 'Longmont Public Library', url: 'https://www.longmontlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.longmontlibrary.org/events', city: 'Longmont', state: 'CO', zipCode: '80501', county: '' },
  { name: 'Louisville Public Library', url: 'https://www.louisvillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.louisvillelibrary.org/events', city: 'Louisville', state: 'CO', zipCode: '80027', county: '' },
  { name: 'Louviers Library', url: 'https://www.louvierslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.louvierslibrary.org/events', city: 'Louviers', state: 'CO', zipCode: '', county: '' },
  { name: 'Loveland Public Library', url: 'https://www.lovelandlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lovelandlibrary.org/events', city: 'Loveland', state: 'CO', zipCode: '80537', county: '' },
  { name: 'Lyons Depot Library', url: 'https://www.lyonsdepotlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lyonsdepotlibrary.org/events', city: 'Lyons', state: 'CO', zipCode: '80540', county: '' },
  { name: 'Mancos Public Library', url: 'https://www.mancoslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.mancoslibrary.org/events', city: 'Mancos', state: 'CO', zipCode: '81328', county: '' },
  { name: 'Manitou Springs Public Library', url: 'https://www.manitouspringslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.manitouspringslibrary.org/events', city: 'Manitou Springs', state: 'CO', zipCode: '80829', county: '' },
  { name: 'Manzanola School-Public Library', url: 'https://www.manzanolaschoolpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.manzanolaschoolpubliclibrary.org/events', city: 'Manzanola', state: 'CO', zipCode: '81058', county: '' },
  { name: 'Maybell Branch Library', url: 'https://www.maybelllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.maybelllibrary.org/events', city: 'Maybell', state: 'CO', zipCode: '', county: '' },
  { name: 'Meeker Regional Library District', url: 'https://www.meekerregionallibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.meekerregionallibrarydistrict.org/events', city: 'Meeker', state: 'CO', zipCode: '81641', county: '' },
  { name: 'Rio Grande Library District', url: 'https://www.riograndelibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.riograndelibrarydistrict.org/events', city: 'Monte Vista', state: 'CO', zipCode: '81144', county: '' },
  { name: 'Montrose Regional Library District', url: 'https://www.montroseregionallibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.montroseregionallibrarydistrict.org/events', city: 'Montrose', state: 'CO', zipCode: '81401', county: '' },
  { name: 'Monument Library', url: 'https://www.monumentlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.monumentlibrary.org/events', city: 'Monument', state: 'CO', zipCode: '', county: '' },
  { name: 'Naturita Library', url: 'https://www.naturitalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.naturitalibrary.org/events', city: 'Naturita', state: 'CO', zipCode: '', county: '' },
  { name: 'Nederland Community Library District', url: 'https://www.nederlandcommunitylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.nederlandcommunitylibrarydistrict.org/events', city: 'Nederland', state: 'CO', zipCode: '80466', county: '' },
  { name: 'Garfield County Library - New Castle', url: 'https://www.garfieldcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/events', city: 'New Castle', state: 'CO', zipCode: '81647', county: '' },
  { name: 'Northglenn Branch Library', url: 'https://www.northglennlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northglennlibrary.org/events', city: 'Northglenn', state: 'CO', zipCode: '', county: '' },
  { name: 'Rangeview Library District', url: 'https://www.rangeviewlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.rangeviewlibrarydistrict.org/events', city: 'Northglenn', state: 'CO', zipCode: '80234', county: '' },
  { name: 'San Miguel Library District 2-Norwood Pl', url: 'https://www.sanmiguellibrarydistrict2norwoodpl.org', platform: 'wordpress', eventsUrl: 'https://www.sanmiguellibrarydistrict2norwoodpl.org/events', city: 'Norwood', state: 'CO', zipCode: '81423', county: '' },
  { name: 'Nucla Public Library', url: 'https://www.nuclalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.nuclalibrary.org/events', city: 'Nucla', state: 'CO', zipCode: '81424', county: '' },
  { name: 'South Routt Library District', url: 'https://www.southrouttlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.southrouttlibrarydistrict.org/events', city: 'Oak Creek', state: 'CO', zipCode: '80467', county: '' },
  { name: 'Ordway Combined Community Library', url: 'https://www.ordwaycombinedlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ordwaycombinedlibrary.org/events', city: 'Ordway', state: 'CO', zipCode: '81063', county: '' },
  { name: 'Ouray Library District', url: 'https://www.ouraylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.ouraylibrarydistrict.org/events', city: 'Ouray', state: 'CO', zipCode: '81427', county: '' },
  { name: 'Ruby M. Sisson Memorial Public Library', url: 'https://www.rubymsissonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rubymsissonlibrary.org/events', city: 'Pagosa Springs', state: 'CO', zipCode: '', county: '' },
  { name: 'Upper San Juan Library District', url: 'https://www.uppersanjuanlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.uppersanjuanlibrarydistrict.org/events', city: 'Pagosa Springs', state: 'CO', zipCode: '81147', county: '' },
  { name: 'Palisade Branch Library', url: 'https://www.palisadelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palisadelibrary.org/events', city: 'Palisade', state: 'CO', zipCode: '', county: '' },
  { name: 'Palmer Lake Branch Library', url: 'https://www.palmerlakelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.palmerlakelibrary.org/events', city: 'Palmer Lake', state: 'CO', zipCode: '', county: '' },
  { name: 'Paonia Public Library', url: 'https://www.paonialibrary.org', platform: 'wordpress', eventsUrl: 'https://www.paonialibrary.org/events', city: 'Paonia', state: 'CO', zipCode: '', county: '' },
  { name: 'Garfield County Library - Parachute', url: 'https://www.garfieldcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/events', city: 'Parachute', state: 'CO', zipCode: '81635', county: '' },
  { name: 'Paradox Branch', url: 'https://www.paradoxbranch.org', platform: 'wordpress', eventsUrl: 'https://www.paradoxbranch.org/events', city: 'Paradox', state: 'CO', zipCode: '', county: '' },
  { name: 'Parker Library', url: 'https://www.parkerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.parkerlibrary.org/events', city: 'Parker', state: 'CO', zipCode: '80138', county: '' },
  { name: 'Penrose Library District', url: 'https://www.penroselibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.penroselibrarydistrict.org/events', city: 'Penrose', state: 'CO', zipCode: '81240', county: '' },
  { name: 'Penrose Library District', url: 'https://www.penroselibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.penroselibrarydistrict.org/events', city: 'Penrose', state: 'CO', zipCode: '', county: '' },
  { name: 'Platteville Public Library', url: 'https://www.plattevillelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.plattevillelibrary.org/events', city: 'Platteville', state: 'CO', zipCode: '', county: '' },
  { name: 'Barkman Branch Library', url: 'https://www.barkmanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.barkmanlibrary.org/events', city: 'Pueblo', state: 'CO', zipCode: '', county: '' },
  { name: 'Lamb Branch Library', url: 'https://www.lamblibrary.org', platform: 'wordpress', eventsUrl: 'https://www.lamblibrary.org/events', city: 'Pueblo', state: 'CO', zipCode: '', county: '' },
  { name: 'Pueblo City-County Library District', url: 'https://www.pueblocitycountylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.pueblocitycountylibrarydistrict.org/events', city: 'Pueblo', state: 'CO', zipCode: '81004', county: '' },
  { name: 'Robert Hoag Rawlings Public Library', url: 'https://www.roberthoagrawlingslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.roberthoagrawlingslibrary.org/events', city: 'Pueblo', state: 'CO', zipCode: '', county: '' },
  { name: 'White Branch', url: 'https://www.whitebranch.org', platform: 'wordpress', eventsUrl: 'https://www.whitebranch.org/events', city: 'Pueblo West', state: 'CO', zipCode: '', county: '' },
  { name: 'Rangely Regional Library District', url: 'https://www.rangelyregionallibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.rangelyregionallibrarydistrict.org/events', city: 'Rangely', state: 'CO', zipCode: '81648', county: '' },
  { name: 'Red Feather Lakes Community Library', url: 'https://www.redfeatherlakeslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.redfeatherlakeslibrary.org/events', city: 'Red Feather Lakes', state: 'CO', zipCode: '', county: '' },
  { name: 'Red Feather Mountain Library District', url: 'https://www.redfeathermountainlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.redfeathermountainlibrarydistrict.org/events', city: 'Red Feather Lakes', state: 'CO', zipCode: '80545', county: '' },
  { name: 'Rico Public Library', url: 'https://www.ricolibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ricolibrary.org/events', city: 'Rico', state: 'CO', zipCode: '', county: '' },
  { name: 'Ridgway Library District', url: 'https://www.ridgwaylibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.ridgwaylibrarydistrict.org/events', city: 'Ridgway', state: 'CO', zipCode: '81432', county: '' },
  { name: 'Garfield County Public Libary District', url: 'https://www.garfieldcountypubliclibarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountypubliclibarydistrict.org/events', city: 'Rifle', state: 'CO', zipCode: '81650', county: '' },
  { name: 'Garfield County Public Library - Rifle', url: 'https://www.garfieldcountypubliclibraryrifle.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountypubliclibraryrifle.org/events', city: 'Rifle', state: 'CO', zipCode: '81650', county: '' },
  { name: 'Rocky Ford Public Library', url: 'https://www.rockyfordlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.rockyfordlibrary.org/events', city: 'Rocky Ford', state: 'CO', zipCode: '81067', county: '' },
  { name: 'Northern Saguache County Library District', url: 'https://www.northernsaguachecountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northernsaguachecountylibrary.org/events', city: 'Saguache', state: 'CO', zipCode: '81149', county: '' },
  { name: 'Salida Regional Library', url: 'https://www.salidalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.salidalibrary.org/events', city: 'Salida', state: 'CO', zipCode: '81201', county: '' },
  { name: 'Costilla County Public Library', url: 'https://www.costillacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.costillacountylibrary.org/events', city: 'San Luis', state: 'CO', zipCode: '81152', county: '' },
  { name: 'Security Public Library', url: 'https://www.securitylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.securitylibrary.org/events', city: 'Security', state: 'CO', zipCode: '80911', county: '' },
  { name: 'Sheridan Library', url: 'https://www.sheridanlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sheridanlibrary.org/events', city: 'Sheridan', state: 'CO', zipCode: '', county: '' },
  { name: 'Garfield County Library - Silt', url: 'https://www.garfieldcountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.garfieldcountylibrary.org/events', city: 'Silt', state: 'CO', zipCode: '81652', county: '' },
  { name: 'North Branch Library', url: 'https://www.northlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.northlibrary.org/events', city: 'Silverthorne', state: 'CO', zipCode: '', county: '' },
  { name: 'Silverton Public Library', url: 'https://www.silvertonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.silvertonlibrary.org/events', city: 'Silverton', state: 'CO', zipCode: '81433', county: '' },
  { name: 'Simla Branch Library', url: 'https://www.simlalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.simlalibrary.org/events', city: 'Simla', state: 'CO', zipCode: '', county: '' },
  { name: 'Ruth Tabor Memorial Library', url: 'https://www.ruthtaborlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.ruthtaborlibrary.org/events', city: 'South Fork', state: 'CO', zipCode: '', county: '' },
  { name: 'Baca County Public Library', url: 'https://www.bacacountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.bacacountylibrary.org/events', city: 'Springfield', state: 'CO', zipCode: '81073', county: '' },
  { name: 'Bud Werner Memorial Library', url: 'https://www.budwernerlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.budwernerlibrary.org/events', city: 'Steamboat Springs', state: 'CO', zipCode: '', county: '' },
  { name: 'East Routt Library District', url: 'https://www.eastrouttlibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.eastrouttlibrarydistrict.org/events', city: 'Steamboat Springs', state: 'CO', zipCode: '80487', county: '' },
  { name: 'Sterling Public Library', url: 'https://www.sterlinglibrary.org', platform: 'wordpress', eventsUrl: 'https://www.sterlinglibrary.org/events', city: 'Sterling', state: 'CO', zipCode: '80751', county: '' },
  { name: 'Stratton Public Library', url: 'https://www.strattonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.strattonlibrary.org/events', city: 'Stratton', state: 'CO', zipCode: '80836', county: '' },
  { name: 'Swink School-Public Library', url: 'https://www.swinkschoolpubliclibrary.org', platform: 'wordpress', eventsUrl: 'https://www.swinkschoolpubliclibrary.org/events', city: 'Swink', state: 'CO', zipCode: '81077', county: '' },
  { name: 'San Miguel Library District 1-Telluride', url: 'https://www.sanmiguellibrarydistrict1telluride.org', platform: 'wordpress', eventsUrl: 'https://www.sanmiguellibrarydistrict1telluride.org/events', city: 'Telluride', state: 'CO', zipCode: '81435', county: '' },
  { name: 'Wilkinson Public Library', url: 'https://www.wilkinsonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wilkinsonlibrary.org/events', city: 'Telluride', state: 'CO', zipCode: '', county: '' },
  { name: 'Thornton Branch Library', url: 'https://www.thorntonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.thorntonlibrary.org/events', city: 'Thornton', state: 'CO', zipCode: '', county: '' },
  { name: 'Toponas Public Library', url: 'https://www.toponaslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.toponaslibrary.org/events', city: 'Toponas', state: 'CO', zipCode: '', county: '' },
  { name: 'Trinidad-Carnegie Public Library', url: 'https://www.trinidadcarnegielibrary.org', platform: 'wordpress', eventsUrl: 'https://www.trinidadcarnegielibrary.org/events', city: 'Trinidad', state: 'CO', zipCode: '81082', county: '' },
  { name: 'Two Buttes Branch Library', url: 'https://www.twobutteslibrary.org', platform: 'wordpress', eventsUrl: 'https://www.twobutteslibrary.org/events', city: 'Two Buttes', state: 'CO', zipCode: '', county: '' },
  { name: 'Vail Public Library', url: 'https://www.vaillibrary.org', platform: 'wordpress', eventsUrl: 'https://www.vaillibrary.org/events', city: 'Vail', state: 'CO', zipCode: '81657', county: '' },
  { name: 'Victor Public Library', url: 'https://www.victorlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.victorlibrary.org/events', city: 'Victor', state: 'CO', zipCode: '', county: '' },
  { name: 'Jackson County Public Library', url: 'https://www.jacksoncountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.jacksoncountylibrary.org/events', city: 'Walden', state: 'CO', zipCode: '80480', county: '' },
  { name: 'Spanish Peaks Library District', url: 'https://www.spanishpeakslibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.spanishpeakslibrarydistrict.org/events', city: 'Walsenburg', state: 'CO', zipCode: '81089', county: '' },
  { name: 'Walsh Public Library', url: 'https://www.walshlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.walshlibrary.org/events', city: 'Walsh', state: 'CO', zipCode: '', county: '' },
  { name: 'Wellington Public Library', url: 'https://www.wellingtonlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wellingtonlibrary.org/events', city: 'Wellington', state: 'CO', zipCode: '80549', county: '' },
  { name: 'West Custer County Library District', url: 'https://www.westcustercountylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westcustercountylibrary.org/events', city: 'Westcliffe', state: 'CO', zipCode: '81252', county: '' },
  { name: '76th Avenue Branch', url: 'https://www.76thavenuebranch.org', platform: 'wordpress', eventsUrl: 'https://www.76thavenuebranch.org/events', city: 'Westminster', state: 'CO', zipCode: '', county: '' },
  { name: 'College Hill Library', url: 'https://www.collegehilllibrary.org', platform: 'wordpress', eventsUrl: 'https://www.collegehilllibrary.org/events', city: 'Westminster', state: 'CO', zipCode: '', county: '' },
  { name: 'Westminster Public Library', url: 'https://www.westminsterlibrary.org', platform: 'wordpress', eventsUrl: 'https://www.westminsterlibrary.org/events', city: 'Westminster', state: 'CO', zipCode: '80031', county: '' },
  { name: 'Wetmore Community Library', url: 'https://www.wetmorelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wetmorelibrary.org/events', city: 'Wetmore', state: 'CO', zipCode: '81253', county: '' },
  { name: 'Wetmore Community Library', url: 'https://www.wetmorelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wetmorelibrary.org/events', city: 'Wetmore', state: 'CO', zipCode: '', county: '' },
  { name: 'Wheat Ridge Library', url: 'https://www.wheatridgelibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wheatridgelibrary.org/events', city: 'Wheat Ridge', state: 'CO', zipCode: '', county: '' },
  { name: 'Windsor Severance Library District', url: 'https://www.windsorseverancelibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.windsorseverancelibrarydistrict.org/events', city: 'Windsor', state: 'CO', zipCode: '', county: '' },
  { name: 'Windsor-Severance Library District', url: 'https://www.windsorseverancelibrarydistrict.org', platform: 'wordpress', eventsUrl: 'https://www.windsorseverancelibrarydistrict.org/events', city: 'Windsor', state: 'CO', zipCode: '80550', county: '' },
  { name: 'Rampart Library District-Woodland Parkflorissant', url: 'https://www.rampartlibrarydistrictwoodlandparkflorissant.org', platform: 'wordpress', eventsUrl: 'https://www.rampartlibrarydistrictwoodlandparkflorissant.org/events', city: 'Woodland Park', state: 'CO', zipCode: '80863', county: '' },
  { name: 'Woodland Park Public Library', url: 'https://www.woodlandparklibrary.org', platform: 'wordpress', eventsUrl: 'https://www.woodlandparklibrary.org/events', city: 'Woodland Park', state: 'CO', zipCode: '', county: '' },
  { name: 'Northeast Colorado Bookmobile Services', url: 'https://www.northeastcoloradobookmobileservices.org', platform: 'wordpress', eventsUrl: 'https://www.northeastcoloradobookmobileservices.org/events', city: 'Wray', state: 'CO', zipCode: '80758', county: '' },
  { name: 'Wray Public Library', url: 'https://www.wraylibrary.org', platform: 'wordpress', eventsUrl: 'https://www.wraylibrary.org/events', city: 'Wray', state: 'CO', zipCode: '80758', county: '' },
  { name: 'Yampa Public Library', url: 'https://www.yampalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yampalibrary.org/events', city: 'Yampa', state: 'CO', zipCode: '', county: '' },
  { name: 'Yuma Public Library', url: 'https://www.yumalibrary.org', platform: 'wordpress', eventsUrl: 'https://www.yumalibrary.org/events', city: 'Yuma', state: 'CO', zipCode: '80759', county: '' }
];

const SCRAPER_NAME = 'generic-CO';

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
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for any event-like content
      await new Promise(resolve => setTimeout(resolve, 3000));

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Generic selectors for event cards/items
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

        // Try each selector
        eventSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(card => {
            if (foundElements.has(card)) return;
            foundElements.add(card);

            try {
              // Try to find title, date, description
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

              // Look for age/audience info on the event card
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

                // Only add if it looks like an event (has title and some other field)
                if (event.title && (event.date || event.description)) {
                  events.push(event);
                }
              }
            } catch (e) {
              // Skip problematic elements
            }
          });
        });

        // Deduplicate by title
        const seen = new Set();
        return events.filter(evt => {
          const key = evt.title.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }, library.name);

      console.log(`   ✅ Found ${libraryEvents.length} events`);

      // Transform and add to collection
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
            state: 'CO',
            needsReview: true // Flag for manual review
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 3000));

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
    state: 'CO',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Generic Scraper - CO (${LIBRARIES.length} libraries)  ║`);
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
async function scrapeWordpressCOCloudFunction() {
  console.log('☁️ Running WordPress CO as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-CO', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-CO', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressCOCloudFunction };
