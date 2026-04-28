const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { admin, db } = require('./helpers/supabase-adapter');

const { logScraperResult } = require('./scraper-logger');
const { saveEventsWithGeocoding } = require('./event-save-helper');
const ngeohash = require('ngeohash');
/**
 * West Virginia Public Libraries Scraper - Coverage: All West Virginia public libraries
 */
const LIBRARIES = [
  { name: 'Kanawha County Public Library', url: 'https://www.kanawhalibrary.org', eventsUrl: 'https://www.kanawhalibrary.org/events', city: 'Charleston', state: 'WV', zipCode: '25301', county: 'Charleston County'},
  { name: 'Cabell County Public Library', url: 'https://www.caaborlibrary.org', eventsUrl: 'https://www.caaborlibrary.org/events', city: 'Huntington', state: 'WV', zipCode: '25701', county: 'Huntington County'},
  { name: 'Ohio County Public Library', url: 'https://www.ohiocountylibrary.org', eventsUrl: 'https://www.ohiocountylibrary.org/events', city: 'Wheeling', state: 'WV', zipCode: '26003' },
  { name: 'Raleigh County Public Library', url: 'https://www.raleighcountylibrary.org', eventsUrl: 'https://www.raleighcountylibrary.org/events', city: 'Beckley', state: 'WV', zipCode: '25801' },
  { name: 'Monongalia County Public Library', url: 'https://www.moncpl.org', eventsUrl: 'https://www.moncpl.org/events', city: 'Morgantown', state: 'WV', zipCode: '26501', county: 'Morgantown County'},
  { name: 'Wood County Public Library', url: 'https://www.woodcountylibrary.org', eventsUrl: 'https://www.woodcountylibrary.org/events', city: 'Parkersburg', state: 'WV', zipCode: '26101' },
  { name: 'Berkeley County Public Library', url: 'https://www.bcpls.org', eventsUrl: 'https://www.bcpls.org/events', city: 'Martinsburg', state: 'WV', zipCode: '25401', county: 'Martinsburg County'},
  { name: 'Harrison County Public Library', url: 'https://www.clarksburglibrary.org', eventsUrl: 'https://www.clarksburglibrary.org/events', city: 'Clarksburg', state: 'WV', zipCode: '26301', county: 'Clarksburg County'},
  { name: 'Marion County Public Library', url: 'https://www.marioncountylibrary.org', eventsUrl: 'https://www.marioncountylibrary.org/events', city: 'Fairmont', state: 'WV', zipCode: '26554' },
  { name: 'Mercer County Public Library', url: 'https://www.mercercountylibrary.org', eventsUrl: 'https://www.mercercountylibrary.org/events', city: 'Princeton', state: 'WV', zipCode: '24740' },
  { name: 'Jefferson County Public Library', url: 'https://www.jcpl.lib.wv.us', eventsUrl: 'https://www.jcpl.lib.wv.us/events', city: 'Charles Town', state: 'WV', zipCode: '25414', county: 'Jefferson'},
  { name: 'Putnam County Public Library', url: 'https://www.putnamcountylibrary.org', eventsUrl: 'https://www.putnamcountylibrary.org/events', city: 'Hurricane', state: 'WV', zipCode: '25526' },
  { name: 'Marshall County Public Library', url: 'https://www.marshallcountylibrary.org', eventsUrl: 'https://www.marshallcountylibrary.org/events', city: 'Moundsville', state: 'WV', zipCode: '26041' },
  { name: 'Greenbrier County Public Library', url: 'https://www.greenbrierlib.org', eventsUrl: 'https://www.greenbrierlib.org/events', city: 'Lewisburg', state: 'WV', zipCode: '24901', county: 'Lewisburg County'},
  { name: 'Logan County Public Library', url: 'https://www.logancountylibrary.org', eventsUrl: 'https://www.logancountylibrary.org/events', city: 'Logan', state: 'WV', zipCode: '25601' },
  { name: 'Fayette County Public Library', url: 'https://www.fayettecountylibraries.org', eventsUrl: 'https://www.fayettecountylibraries.org/events', city: 'Fayetteville', state: 'WV', zipCode: '25840' },
  { name: 'Brooke County Public Library', url: 'https://www.brookecountylibrary.org', eventsUrl: 'https://www.brookecountylibrary.org/events', city: 'Wellsburg', state: 'WV', zipCode: '26070' },
  { name: 'Wyoming County Public Library', url: 'https://www.wyomingcountylibrary.org', eventsUrl: 'https://www.wyomingcountylibrary.org/events', city: 'Pineville', state: 'WV', zipCode: '24874' },
  { name: 'Nicholas County Public Library', url: 'https://www.nicholascountylibrary.org', eventsUrl: 'https://www.nicholascountylibrary.org/events', city: 'Summersville', state: 'WV', zipCode: '26651' },
  { name: 'McDowell County Public Library', url: 'https://www.mcdowellcountylibrary.org', eventsUrl: 'https://www.mcdowellcountylibrary.org/events', city: 'Welch', state: 'WV', zipCode: '24801' },
  // Additional libraries from spreadsheet coverage expansion
  { name: 'Alderson Public Library', url: 'https://www.aldersonlibrary.org', eventsUrl: 'https://www.aldersonlibrary.org/events', city: 'Alderson', state: 'WV', zipCode: '24910', county: 'Alderson County'},
  { name: 'Alum Creek Public Library', url: 'https://www.alumcreeklibrary.org', eventsUrl: 'https://www.alumcreeklibrary.org/events', city: 'Alum Creek', state: 'WV', zipCode: '25003', county: 'Alum Creek County'},
  { name: 'Ansted Public Library', url: 'https://www.anstedlibrary.org', eventsUrl: 'https://www.anstedlibrary.org/events', city: 'Ansted', state: 'WV', zipCode: '25812', county: 'Ansted County'},
  { name: 'Hannan Public Library', url: 'https://www.ashtonlibrary.org', eventsUrl: 'https://www.ashtonlibrary.org/events', city: 'Ashton', state: 'WV', zipCode: '25503', county: 'Ashton County'},
  { name: 'East Hardy Branch Public Library', url: 'https://www.bakerlibrary.org', eventsUrl: 'https://www.bakerlibrary.org/events', city: 'Baker', state: 'WV', zipCode: '26801', county: 'Baker County'},
  { name: 'Barboursville Public Library', url: 'https://www.barboursvillelibrary.org', eventsUrl: 'https://www.barboursvillelibrary.org/events', city: 'Barboursville', state: 'WV', zipCode: '25504', county: 'Barboursville County'},
  { name: 'Barrett-Wharton Public Library', url: 'https://www.barrettlibrary.org', eventsUrl: 'https://www.barrettlibrary.org/events', city: 'Barrett', state: 'WV', zipCode: '25208', county: 'Barrett County'},
  { name: 'Belington Public Library', url: 'https://www.belingtonlibrary.org', eventsUrl: 'https://www.belingtonlibrary.org/events', city: 'Belington', state: 'WV', zipCode: '26250', county: 'Belington County'},
  { name: 'Riverside Public Library', url: 'https://www.bellelibrary.org', eventsUrl: 'https://www.bellelibrary.org/events', city: 'Belle', state: 'WV', zipCode: '25015', county: 'Belle County'},
  { name: 'Morgan County Public Library', url: 'https://www.berkeleyspringslibrary.org', eventsUrl: 'https://www.berkeleyspringslibrary.org/events', city: 'Berkeley Springs', state: 'WV', zipCode: '25411', county: 'Berkeley Springs County'},
  { name: 'Elk Valley Branch Library', url: 'https://www.bigchimneylibrary.org', eventsUrl: 'https://www.bigchimneylibrary.org/events', city: 'Big Chimney', state: 'WV', zipCode: '25302', county: 'Big Chimney County'},
  { name: 'Clay Battelle Public Library', url: 'https://www.blacksvillelibrary.org', eventsUrl: 'https://www.blacksvillelibrary.org/events', city: 'Blacksville', state: 'WV', zipCode: '26521', county: 'Blacksville County'},
  { name: 'Craft Memorial Library', url: 'https://www.bluefieldlibrary.org', eventsUrl: 'https://www.bluefieldlibrary.org/events', city: 'Bluefield', state: 'WV', zipCode: '24701', county: 'Bluefield County'},
  { name: 'Bradshaw Public Library', url: 'https://www.bradshawlibrary.org', eventsUrl: 'https://www.bradshawlibrary.org/events', city: 'Bradshaw', state: 'WV', zipCode: '24828', county: 'Bradshaw County'},
  { name: 'Branchland Public Library', url: 'https://www.branchlandlibrary.org', eventsUrl: 'https://www.branchlandlibrary.org/events', city: 'Branchland', state: 'WV', zipCode: '25506', county: 'Branchland County'},
  { name: 'Bridgeport Public Library', url: 'https://www.bridgeportlibrary.org', eventsUrl: 'https://www.bridgeportlibrary.org/events', city: 'Bridgeport', state: 'WV', zipCode: '26330', county: 'Bridgeport County'},
  { name: 'Charles W. Gibson Public Library', url: 'https://www.buckhannonlibrary.org', eventsUrl: 'https://www.buckhannonlibrary.org/events', city: 'Buckhannon', state: 'WV', zipCode: '26201', county: 'Buckhannon County'},
  { name: 'Burlington Public Library', url: 'https://www.burlingtonlibrary.org', eventsUrl: 'https://www.burlingtonlibrary.org/events', city: 'Burlington', state: 'WV', zipCode: '26710', county: 'Burlington County'},
  { name: 'Burnsville Public Library', url: 'https://www.burnsvillelibrary.org', eventsUrl: 'https://www.burnsvillelibrary.org/events', city: 'Burnsville', state: 'WV', zipCode: '26335', county: 'Burnsville County'},
  { name: 'Cameron Public Library', url: 'https://www.cameronlibrary.org', eventsUrl: 'https://www.cameronlibrary.org/events', city: 'Cameron', state: 'WV', zipCode: '26033', county: 'Cameron County'},
  { name: 'Capon Bridge Public Library', url: 'https://www.caponbridgelibrary.org', eventsUrl: 'https://www.caponbridgelibrary.org/events', city: 'Capon Bridge', state: 'WV', zipCode: '26711', county: 'Capon Bridge County'},
  { name: 'Center Point Public Library', url: 'https://www.centerpointlibrary.org', eventsUrl: 'https://www.centerpointlibrary.org/events', city: 'Center Point', state: 'WV', zipCode: '26339', county: 'Center Point County'},
  { name: 'Chapmanville Public Library', url: 'https://www.chapmanvillelibrary.org', eventsUrl: 'https://www.chapmanvillelibrary.org/events', city: 'Chapmanville', state: 'WV', zipCode: '25508', county: 'Chapmanville County'},
  { name: 'Lynn Murray Memorial Library', url: 'https://www.chesterlibrary.org', eventsUrl: 'https://www.chesterlibrary.org/events', city: 'Chester', state: 'WV', zipCode: '26034', county: 'Chester County'},
  { name: 'Clay County Public Library', url: 'https://www.claylibrary.org', eventsUrl: 'https://www.claylibrary.org/events', city: 'Clay', state: 'WV', zipCode: '25043', county: 'Clay County'},
  { name: 'Clendenin Branch Library', url: 'https://www.clendeninlibrary.org', eventsUrl: 'https://www.clendeninlibrary.org/events', city: 'Clendenin', state: 'WV', zipCode: '25045', county: 'Clendenin County'},
  { name: 'Cowen Public Library', url: 'https://www.cowenlibrary.org', eventsUrl: 'https://www.cowenlibrary.org/events', city: 'Cowen', state: 'WV', zipCode: '26206', county: 'Cowen County'},
  { name: 'Craigsville Public Library', url: 'https://www.craigsvillelibrary.org', eventsUrl: 'https://www.craigsvillelibrary.org/events', city: 'Craigsville', state: 'WV', zipCode: '26205', county: 'Craigsville County'},
  { name: 'Cross Lanes Branch Library', url: 'https://www.crosslaneslibrary.org', eventsUrl: 'https://www.crosslaneslibrary.org/events', city: 'Cross Lanes', state: 'WV', zipCode: '25313', county: 'Cross Lanes County'},
  { name: 'Sand Hill Public Library', url: 'https://www.dallaslibrary.org', eventsUrl: 'https://www.dallaslibrary.org/events', city: 'Dallas', state: 'WV', zipCode: '26036', county: 'Dallas County'},
  { name: 'Mingo County Public Library', url: 'https://www.delbartonlibrary.org', eventsUrl: 'https://www.delbartonlibrary.org/events', city: 'Delbarton', state: 'WV', zipCode: '25670', county: 'Delbarton County'},
  { name: 'Dunbar Branch Library', url: 'https://www.dunbarlibrary.org', eventsUrl: 'https://www.dunbarlibrary.org/events', city: 'Dunbar', state: 'WV', zipCode: '25064', county: 'Dunbar County'},
  { name: 'Durbin Public Library', url: 'https://www.durbinlibrary.org', eventsUrl: 'https://www.durbinlibrary.org/events', city: 'Durbin', state: 'WV', zipCode: '26264', county: 'Durbin County'},
  { name: 'Eleanor Branch Library', url: 'https://www.eleanorlibrary.org', eventsUrl: 'https://www.eleanorlibrary.org/events', city: 'Eleanor', state: 'WV', zipCode: '25070', county: 'Eleanor County'},
  { name: 'Dora Bee Woodyard Memorial Library', url: 'https://www.elizabethlibrary.org', eventsUrl: 'https://www.elizabethlibrary.org/events', city: 'Elizabeth', state: 'WV', zipCode: '26143', county: 'Elizabeth County'},
  { name: 'Elkins-Randolph Public Library', url: 'https://www.elkinslibrary.org', eventsUrl: 'https://www.elkinslibrary.org/events', city: 'Elkins', state: 'WV', zipCode: '26241', county: 'Elkins County'},
  { name: 'Fairview Public Library', url: 'https://www.fairviewlibrary.org', eventsUrl: 'https://www.fairviewlibrary.org/events', city: 'Fairview', state: 'WV', zipCode: '26570', county: 'Fairview County'},
  { name: 'North Berkeley Public Library', url: 'https://www.fallingwaterslibrary.org', eventsUrl: 'https://www.fallingwaterslibrary.org/events', city: 'Falling Waters', state: 'WV', zipCode: '25419', county: 'Falling Waters County'},
  { name: 'Follansbee Public Library', url: 'https://www.follansbeelibrary.org', eventsUrl: 'https://www.follansbeelibrary.org/events', city: 'Follansbee', state: 'WV', zipCode: '26037', county: 'Follansbee County'},
  { name: 'Fort Ashby Public Library', url: 'https://www.fortashbylibrary.org', eventsUrl: 'https://www.fortashbylibrary.org/events', city: 'Fort Ashby', state: 'WV', zipCode: '26719', county: 'Fort Ashby County'},
  { name: 'Fort Gay Public Library', url: 'https://www.fortgaylibrary.org', eventsUrl: 'https://www.fortgaylibrary.org/events', city: 'Fort Gay', state: 'WV', zipCode: '25514', county: 'Fort Gay County'},
  { name: 'Pendleton County Public Library', url: 'https://www.franklinlibrary.org', eventsUrl: 'https://www.franklinlibrary.org/events', city: 'Franklin', state: 'WV', zipCode: '26807', county: 'Franklin County'},
  { name: 'James Curry Public Library', url: 'https://www.frenchcreeklibrary.org', eventsUrl: 'https://www.frenchcreeklibrary.org/events', city: 'French Creek', state: 'WV', zipCode: '26218', county: 'French Creek County'},
  { name: 'Gassaway Public Library', url: 'https://www.gassawaylibrary.org', eventsUrl: 'https://www.gassawaylibrary.org/events', city: 'Gassaway', state: 'WV', zipCode: '26624', county: 'Gassaway County'},
  { name: 'Gauley Bridge Public Library', url: 'https://www.gauleybridgelibrary.org', eventsUrl: 'https://www.gauleybridgelibrary.org/events', city: 'Gauley Bridge', state: 'WV', zipCode: '25085', county: 'Gauley Bridge County'},
  { name: 'Gilbert Public Library', url: 'https://www.gilbertlibrary.org', eventsUrl: 'https://www.gilbertlibrary.org/events', city: 'Gilbert', state: 'WV', zipCode: '25621', county: 'Gilbert County'},
  { name: 'Glasgow Branch Library', url: 'https://www.glasgowlibrary.org', eventsUrl: 'https://www.glasgowlibrary.org/events', city: 'Glasgow', state: 'WV', zipCode: '25086', county: 'Glasgow County'},
  { name: 'Gilmer Public Library', url: 'https://www.glenvillelibrary.org', eventsUrl: 'https://www.glenvillelibrary.org/events', city: 'Glenville', state: 'WV', zipCode: '26351', county: 'Glenville County'},
  { name: 'Taylor County Public Library', url: 'https://www.graftonlibrary.org', eventsUrl: 'https://www.graftonlibrary.org/events', city: 'Grafton', state: 'WV', zipCode: '26354', county: 'Grafton County'},
  { name: 'Calhoun County Public Library', url: 'https://www.grantsvillelibrary.org', eventsUrl: 'https://www.grantsvillelibrary.org/events', city: 'Grantsville', state: 'WV', zipCode: '26147', county: 'Grantsville County'},
  { name: 'Green Bank Public Library', url: 'https://www.greenbanklibrary.org', eventsUrl: 'https://www.greenbanklibrary.org/events', city: 'Green Bank', state: 'WV', zipCode: '24944', county: 'Green Bank County'},
  { name: 'Guyandotte Branch Library', url: 'https://www.guyandottelibrary.org', eventsUrl: 'https://www.guyandottelibrary.org/events', city: 'Guyandotte', state: 'WV', zipCode: '25702', county: 'Guyandotte County'},
  { name: 'Hamlin-Lincoln County Public Library', url: 'https://www.hamlinlibrary.org', eventsUrl: 'https://www.hamlinlibrary.org/events', city: 'Hamlin', state: 'WV', zipCode: '25523', county: 'Hamlin County'},
  { name: 'Hanover Public Library', url: 'https://www.hanoverlibrary.org', eventsUrl: 'https://www.hanoverlibrary.org/events', city: 'Hanover', state: 'WV', zipCode: '24839', county: 'Hanover County'},
  { name: 'Pioneer Memorial Public Library', url: 'https://www.harmanlibrary.org', eventsUrl: 'https://www.harmanlibrary.org/events', city: 'Harman', state: 'WV', zipCode: '26270', county: 'Harman County'},
  { name: 'Bolivar-Harpers Ferry Public Library', url: 'https://www.harpersferrylibrary.org', eventsUrl: 'https://www.harpersferrylibrary.org/events', city: 'Harpers Ferry', state: 'WV', zipCode: '25425', county: 'Harpers Ferry County'},
  { name: 'Ritchie County Public Library', url: 'https://www.harrisvillelibrary.org', eventsUrl: 'https://www.harrisvillelibrary.org/events', city: 'Harrisville', state: 'WV', zipCode: '26362', county: 'Harrisville County'},
  { name: 'Naylor Memorial Library', url: 'https://www.hedgesvillelibrary.org', eventsUrl: 'https://www.hedgesvillelibrary.org/events', city: 'Hedgesville', state: 'WV', zipCode: '25427', county: 'Hedgesville County'},
  { name: 'Helvetia Public Library', url: 'https://www.helvetialibrary.org', eventsUrl: 'https://www.helvetialibrary.org/events', city: 'Helvetia', state: 'WV', zipCode: '26224', county: 'Helvetia County'},
  { name: 'Hillsboro Public Library', url: 'https://www.hillsborolibrary.org', eventsUrl: 'https://www.hillsborolibrary.org/events', city: 'Hillsboro', state: 'WV', zipCode: '24946', county: 'Hillsboro County'},
  { name: 'Summers County Public Library', url: 'https://www.hintonlibrary.org', eventsUrl: 'https://www.hintonlibrary.org/events', city: 'Hinton', state: 'WV', zipCode: '25951', county: 'Hinton County'},
  { name: 'Hundred Public Library', url: 'https://www.hundredlibrary.org', eventsUrl: 'https://www.hundredlibrary.org/events', city: 'Hundred', state: 'WV', zipCode: '26575', county: 'Hundred County'},
  { name: 'Iaeger Public Library', url: 'https://www.iaegerlibrary.org', eventsUrl: 'https://www.iaegerlibrary.org/events', city: 'Iaeger', state: 'WV', zipCode: '24844', county: 'Iaeger County'},
  { name: 'Musselman-South Berkeley Community Library', url: 'https://www.inwoodlibrary.org', eventsUrl: 'https://www.inwoodlibrary.org/events', city: 'Inwood', state: 'WV', zipCode: '25428', county: 'Inwood County'},
  { name: 'Ceredo-Kenova Library', url: 'https://www.kenovalibrary.org', eventsUrl: 'https://www.kenovalibrary.org/events', city: 'Kenova', state: 'WV', zipCode: '25530', county: 'Kenova County'},
  { name: 'Kermit Public Public Library', url: 'https://www.kermitlibrary.org', eventsUrl: 'https://www.kermitlibrary.org/events', city: 'Kermit', state: 'WV', zipCode: '25674', county: 'Kermit County'},
  { name: 'Keyser-Mineral County Public Library', url: 'https://www.keyserlibrary.org', eventsUrl: 'https://www.keyserlibrary.org/events', city: 'Keyser', state: 'WV', zipCode: '26726', county: 'Keyser County'},
  { name: 'Kingwood Public Library', url: 'https://www.kingwoodlibrary.org', eventsUrl: 'https://www.kingwoodlibrary.org/events', city: 'Kingwood', state: 'WV', zipCode: '26537', county: 'Kingwood County'},
  { name: 'Geary Public Library', url: 'https://www.lefthandlibrary.org', eventsUrl: 'https://www.lefthandlibrary.org/events', city: 'Left Hand', state: 'WV', zipCode: '25251', county: 'Left Hand County'},
  { name: 'Cox Landing Branch Library', url: 'https://www.lesagelibrary.org', eventsUrl: 'https://www.lesagelibrary.org/events', city: 'Lesage', state: 'WV', zipCode: '25537', county: 'Lesage County'},
  { name: 'Southern Area Public Library', url: 'https://www.lostcreeklibrary.org', eventsUrl: 'https://www.lostcreeklibrary.org/events', city: 'Lost Creek', state: 'WV', zipCode: '26385', county: 'Lost Creek County'},
  { name: 'Boone-Madison Public Library', url: 'https://www.madisonlibrary.org', eventsUrl: 'https://www.madisonlibrary.org/events', city: 'Madison', state: 'WV', zipCode: '25130', county: 'Madison County'},
  { name: 'Buffalo Creek Memorial Library', url: 'https://www.manlibrary.org', eventsUrl: 'https://www.manlibrary.org/events', city: 'Man', state: 'WV', zipCode: '25635', county: 'Man County'},
  { name: 'Mannington Public Library', url: 'https://www.manningtonlibrary.org', eventsUrl: 'https://www.manningtonlibrary.org/events', city: 'Mannington', state: 'WV', zipCode: '26582', county: 'Mannington County'},
  { name: 'Mcclintic Public Library', url: 'https://www.marlintonlibrary.org', eventsUrl: 'https://www.marlintonlibrary.org/events', city: 'Marlinton', state: 'WV', zipCode: '24954', county: 'Marlinton County'},
  { name: 'Marmet Branch Library', url: 'https://www.marmetlibrary.org', eventsUrl: 'https://www.marmetlibrary.org/events', city: 'Marmet', state: 'WV', zipCode: '25315', county: 'Marmet County'},
  { name: 'Matewan Public Library', url: 'https://www.matewanlibrary.org', eventsUrl: 'https://www.matewanlibrary.org/events', city: 'Matewan', state: 'WV', zipCode: '25678', county: 'Matewan County'},
  { name: 'Benwood-Mcmechen Public Library', url: 'https://www.mcmechenlibrary.org', eventsUrl: 'https://www.mcmechenlibrary.org/events', city: 'Mcmechen', state: 'WV', zipCode: '26040', county: 'Mcmechen County'},
  { name: 'Meadow Bridge Public Library', url: 'https://www.meadowbridgelibrary.org', eventsUrl: 'https://www.meadowbridgelibrary.org/events', city: 'Meadow Bridge', state: 'WV', zipCode: '25976', county: 'Meadow Bridge County'},
  { name: 'Tyler County Public Library', url: 'https://www.middlebournelibrary.org', eventsUrl: 'https://www.middlebournelibrary.org/events', city: 'Middlebourne', state: 'WV', zipCode: '26149', county: 'Middlebourne County'},
  { name: 'Tygart Valley Public Library', url: 'https://www.millcreeklibrary.org', eventsUrl: 'https://www.millcreeklibrary.org/events', city: 'Mill Creek', state: 'WV', zipCode: '26280', county: 'Mill Creek County'},
  { name: 'Milton Branch Library', url: 'https://www.miltonlibrary.org', eventsUrl: 'https://www.miltonlibrary.org/events', city: 'Milton', state: 'WV', zipCode: '25541', county: 'Milton County'},
  { name: 'Montgomery Public Library', url: 'https://www.montgomerylibrary.org', eventsUrl: 'https://www.montgomerylibrary.org/events', city: 'Montgomery', state: 'WV', zipCode: '25136', county: 'Montgomery County'},
  { name: 'Hardy County Public Library', url: 'https://www.moorefieldlibrary.org', eventsUrl: 'https://www.moorefieldlibrary.org/events', city: 'Moorefield', state: 'WV', zipCode: '26836', county: 'Moorefield County'},
  { name: 'Mt. Hope Public Library', url: 'https://www.mthopelibrary.org', eventsUrl: 'https://www.mthopelibrary.org/events', city: 'Mt. Hope', state: 'WV', zipCode: '25880', county: 'Mt. Hope County'},
  { name: 'Allegheny Mt. Top Public Library', url: 'https://www.mtstormlibrary.org', eventsUrl: 'https://www.mtstormlibrary.org/events', city: 'Mt. Storm', state: 'WV', zipCode: '26739', county: 'Mt. Storm County'},
  { name: 'Mullens Area Public Library', url: 'https://www.mullenslibrary.org', eventsUrl: 'https://www.mullenslibrary.org/events', city: 'Mullens', state: 'WV', zipCode: '25882', county: 'Mullens County'},
  { name: 'Marsh Fork Public Library', url: 'https://www.naomalibrary.org', eventsUrl: 'https://www.naomalibrary.org/events', city: 'Naoma', state: 'WV', zipCode: '25140', county: 'Naoma County'},
  { name: 'Swaney Memorial Library', url: 'https://www.newcumberlandlibrary.org', eventsUrl: 'https://www.newcumberlandlibrary.org/events', city: 'New Cumberland', state: 'WV', zipCode: '26047', county: 'New Cumberland County'},
  { name: 'New Haven Public Library', url: 'https://www.newhavenlibrary.org', eventsUrl: 'https://www.newhavenlibrary.org/events', city: 'New Haven', state: 'WV', zipCode: '25265', county: 'New Haven County'},
  { name: 'New Martinsville Public Library', url: 'https://www.newmartinsvillelibrary.org', eventsUrl: 'https://www.newmartinsvillelibrary.org/events', city: 'New Martinsville', state: 'WV', zipCode: '26155', county: 'New Martinsville County'},
  { name: 'Nitro Public Library', url: 'https://www.nitrolibrary.org', eventsUrl: 'https://www.nitrolibrary.org/events', city: 'Nitro', state: 'WV', zipCode: '25143', county: 'Nitro County'},
  { name: 'Northfork Public Library', url: 'https://www.northforklibrary.org', eventsUrl: 'https://www.northforklibrary.org/events', city: 'Northfork', state: 'WV', zipCode: '24868', county: 'Northfork County'},
  { name: 'Nutter Fort Public Library', url: 'https://www.nutterfortlibrary.org', eventsUrl: 'https://www.nutterfortlibrary.org/events', city: 'Nutter Fort', state: 'WV', zipCode: '26301', county: 'Nutter Fort County'},
  { name: 'Fayette County Public Library', url: 'https://www.oakhilllibrary.org', eventsUrl: 'https://www.oakhilllibrary.org/events', city: 'Oak Hill', state: 'WV', zipCode: '25901', county: 'Oak Hill County'},
  { name: 'Oceana Public Library', url: 'https://www.oceanalibrary.org', eventsUrl: 'https://www.oceanalibrary.org/events', city: 'Oceana', state: 'WV', zipCode: '24870', county: 'Oceana County'},
  { name: 'Paden City Public Library', url: 'https://www.padencitylibrary.org', eventsUrl: 'https://www.padencitylibrary.org/events', city: 'Paden City', state: 'WV', zipCode: '26159', county: 'Paden City County'},
  { name: 'Five Rivers Public Library', url: 'https://www.parsonslibrary.org', eventsUrl: 'https://www.parsonslibrary.org/events', city: 'Parsons', state: 'WV', zipCode: '26287', county: 'Parsons County'},
  { name: 'Paw Paw Public Library', url: 'https://www.pawpawlibrary.org', eventsUrl: 'https://www.pawpawlibrary.org/events', city: 'Paw Paw', state: 'WV', zipCode: '25434', county: 'Paw Paw County'},
  { name: 'Pennsboro Branch', url: 'https://www.pennsborolibrary.org', eventsUrl: 'https://www.pennsborolibrary.org/events', city: 'Pennsboro', state: 'WV', zipCode: '26415', county: 'Pennsboro County'},
  { name: 'Grant County Public Library', url: 'https://www.petersburglibrary.org', eventsUrl: 'https://www.petersburglibrary.org/events', city: 'Petersburg', state: 'WV', zipCode: '26847', county: 'Petersburg County'},
  { name: 'Peterstown Public Library', url: 'https://www.peterstownlibrary.org', eventsUrl: 'https://www.peterstownlibrary.org/events', city: 'Peterstown', state: 'WV', zipCode: '24963', county: 'Peterstown County'},
  { name: 'Philippi Public Library', url: 'https://www.philippilibrary.org', eventsUrl: 'https://www.philippilibrary.org/events', city: 'Philippi', state: 'WV', zipCode: '26416', county: 'Philippi County'},
  { name: 'Piedmont Public Library', url: 'https://www.piedmontlibrary.org', eventsUrl: 'https://www.piedmontlibrary.org/events', city: 'Piedmont', state: 'WV', zipCode: '26750', county: 'Piedmont County'},
  { name: 'Pine Grove Public Library', url: 'https://www.pinegrovelibrary.org', eventsUrl: 'https://www.pinegrovelibrary.org/events', city: 'Pine Grove', state: 'WV', zipCode: '26419', county: 'Pine Grove County'},
  { name: 'Poca Branch Library', url: 'https://www.pocalibrary.org', eventsUrl: 'https://www.pocalibrary.org/events', city: 'Poca', state: 'WV', zipCode: '25159', county: 'Poca County'},
  { name: 'Mason County Public Library', url: 'https://www.pointpleasantlibrary.org', eventsUrl: 'https://www.pointpleasantlibrary.org/events', city: 'Point Pleasant', state: 'WV', zipCode: '25550', county: 'Point Pleasant County'},
  { name: 'Quinwood Public Library', url: 'https://www.quinwoodlibrary.org', eventsUrl: 'https://www.quinwoodlibrary.org/events', city: 'Quinwood', state: 'WV', zipCode: '25981', county: 'Quinwood County'},
  { name: 'Coal River Branch Library', url: 'https://www.racinelibrary.org', eventsUrl: 'https://www.racinelibrary.org/events', city: 'Racine', state: 'WV', zipCode: '25165', county: 'Racine County'},
  { name: 'Rainelle Public Library', url: 'https://www.rainellelibrary.org', eventsUrl: 'https://www.rainellelibrary.org/events', city: 'Rainelle', state: 'WV', zipCode: '25962', county: 'Rainelle County'},
  { name: 'Ravenswood Branch Library', url: 'https://www.ravenswoodlibrary.org', eventsUrl: 'https://www.ravenswoodlibrary.org/events', city: 'Ravenswood', state: 'WV', zipCode: '26164', county: 'Ravenswood County'},
  { name: 'Richwood Public Library', url: 'https://www.richwoodlibrary.org', eventsUrl: 'https://www.richwoodlibrary.org/events', city: 'Richwood', state: 'WV', zipCode: '26261', county: 'Richwood County'},
  { name: 'Jackson County Public Library', url: 'https://www.ripleylibrary.org', eventsUrl: 'https://www.ripleylibrary.org/events', city: 'Ripley', state: 'WV', zipCode: '25271', county: 'Ripley County'},
  { name: 'Hampshire County Public Library', url: 'https://www.romneylibrary.org', eventsUrl: 'https://www.romneylibrary.org/events', city: 'Romney', state: 'WV', zipCode: '26757', county: 'Romney County'},
  { name: 'Ronceverte Public Library', url: 'https://www.roncevertelibrary.org', eventsUrl: 'https://www.roncevertelibrary.org/events', city: 'Ronceverte', state: 'WV', zipCode: '24970', county: 'Ronceverte County'},
  { name: 'Rupert Public Library', url: 'https://www.rupertlibrary.org', eventsUrl: 'https://www.rupertlibrary.org/events', city: 'Rupert', state: 'WV', zipCode: '25984', county: 'Rupert County'},
  { name: 'Salt Rock Branch Library', url: 'https://www.saltrocklibrary.org', eventsUrl: 'https://www.saltrocklibrary.org/events', city: 'Salt Rock', state: 'WV', zipCode: '25559', county: 'Salt Rock County'},
  { name: 'Shady Spring District Library', url: 'https://www.shadyspringlibrary.org', eventsUrl: 'https://www.shadyspringlibrary.org/events', city: 'Shady Spring', state: 'WV', zipCode: '25918', county: 'Shady Spring County'},
  { name: 'Shepherdstown Public Library', url: 'https://www.shepherdstownlibrary.org', eventsUrl: 'https://www.shepherdstownlibrary.org/events', city: 'Shepherdstown', state: 'WV', zipCode: '25443', county: 'Shepherdstown County'},
  { name: 'Lowe Public Library', url: 'https://www.shinnstonlibrary.org', eventsUrl: 'https://www.shinnstonlibrary.org/events', city: 'Shinnston', state: 'WV', zipCode: '26431', county: 'Shinnston County'},
  { name: 'Sistersville Public Library', url: 'https://www.sistersvillelibrary.org', eventsUrl: 'https://www.sistersvillelibrary.org/events', city: 'Sistersville', state: 'WV', zipCode: '26175', county: 'Sistersville County'},
  { name: 'Sophia Public Library', url: 'https://www.sophialibrary.org', eventsUrl: 'https://www.sophialibrary.org/events', city: 'Sophia', state: 'WV', zipCode: '25921', county: 'Sophia County'},
  { name: 'South Charleston Public Library', url: 'https://www.southcharlestonlibrary.org', eventsUrl: 'https://www.southcharlestonlibrary.org/events', city: 'South Charleston', state: 'WV', zipCode: '25303', county: 'South Charleston County'},
  { name: 'Roane County Public Library', url: 'https://www.spencerlibrary.org', eventsUrl: 'https://www.spencerlibrary.org/events', city: 'Spencer', state: 'WV', zipCode: '25276', county: 'Spencer County'},
  { name: 'St. Albans Branch Library', url: 'https://www.stalbanslibrary.org', eventsUrl: 'https://www.stalbanslibrary.org/events', city: 'St. Albans', state: 'WV', zipCode: '25177', county: 'St. Albans County'},
  { name: 'Pleasants County Public Library', url: 'https://www.stmaryslibrary.org', eventsUrl: 'https://www.stmaryslibrary.org/events', city: 'St. Marys', state: 'WV', zipCode: '26170', county: 'St. Marys County'},
  { name: 'South Jefferson Public Library', url: 'https://www.summitpointlibrary.org', eventsUrl: 'https://www.summitpointlibrary.org/events', city: 'Summit Point', state: 'WV', zipCode: '25446', county: 'Summit Point County'},
  { name: 'Sutton Public Library', url: 'https://www.suttonlibrary.org', eventsUrl: 'https://www.suttonlibrary.org/events', city: 'Sutton', state: 'WV', zipCode: '26601', county: 'Sutton County'},
  { name: 'Terra Alta Public Library', url: 'https://www.terraaltalibrary.org', eventsUrl: 'https://www.terraaltalibrary.org/events', city: 'Terra Alta', state: 'WV', zipCode: '26764', county: 'Terra Alta County'},
  { name: 'Mountaintop Public Library', url: 'https://www.thomaslibrary.org', eventsUrl: 'https://www.thomaslibrary.org/events', city: 'Thomas', state: 'WV', zipCode: '26292', county: 'Thomas County'},
  { name: 'Monroe County Public Library', url: 'https://www.unionlibrary.org', eventsUrl: 'https://www.unionlibrary.org/events', city: 'Union', state: 'WV', zipCode: '24983', county: 'Union County'},
  { name: 'Valley Head Public Library', url: 'https://www.valleyheadlibrary.org', eventsUrl: 'https://www.valleyheadlibrary.org/events', city: 'Valley Head', state: 'WV', zipCode: '26294', county: 'Valley Head County'},
  { name: 'Vienna Public Library', url: 'https://www.viennalibrary.org', eventsUrl: 'https://www.viennalibrary.org/events', city: 'Vienna', state: 'WV', zipCode: '26105', county: 'Vienna County'},
  { name: 'Walton Public Library', url: 'https://www.waltonlibrary.org', eventsUrl: 'https://www.waltonlibrary.org/events', city: 'Walton', state: 'WV', zipCode: '25286', county: 'Walton County'},
  { name: 'War Public Library', url: 'https://www.warlibrary.org', eventsUrl: 'https://www.warlibrary.org/events', city: 'War', state: 'WV', zipCode: '24892', county: 'War County'},
  { name: 'Waverly Library', url: 'https://www.waverlylibrary.org', eventsUrl: 'https://www.waverlylibrary.org/events', city: 'Waverly', state: 'WV', zipCode: '26184', county: 'Waverly County'},
  { name: 'Webster-Addison Public Library', url: 'https://www.websterspringslibrary.org', eventsUrl: 'https://www.websterspringslibrary.org/events', city: 'Webster Springs', state: 'WV', zipCode: '26288', county: 'Webster Springs County'},
  { name: 'Mary H. Weir Public Library', url: 'https://www.weirtonlibrary.org', eventsUrl: 'https://www.weirtonlibrary.org/events', city: 'Weirton', state: 'WV', zipCode: '26062', county: 'Weirton County'},
  { name: 'Doddridge County Public Library', url: 'https://www.westunionlibrary.org', eventsUrl: 'https://www.westunionlibrary.org/events', city: 'West Union', state: 'WV', zipCode: '26456', county: 'West Union County'},
  { name: 'Louis Bennett Public Library', url: 'https://www.westonlibrary.org', eventsUrl: 'https://www.westonlibrary.org/events', city: 'Weston', state: 'WV', zipCode: '26452', county: 'Weston County'},
  { name: 'White Sulphur Springs Public Library', url: 'https://www.whitesulphurspringlibrary.org', eventsUrl: 'https://www.whitesulphurspringlibrary.org/events', city: 'White Sulphur Spring', state: 'WV', zipCode: '24986', county: 'White Sulphur Spring County'},
  { name: 'Whitesville Public Library', url: 'https://www.whitesvillelibrary.org', eventsUrl: 'https://www.whitesvillelibrary.org/events', city: 'Whitesville', state: 'WV', zipCode: '25209', county: 'Whitesville County'},
  { name: 'Williamson Public Library', url: 'https://www.williamsonlibrary.org', eventsUrl: 'https://www.williamsonlibrary.org/events', city: 'Williamson', state: 'WV', zipCode: '25661', county: 'Williamson County'},
  { name: 'Williamstown Library', url: 'https://www.williamstownlibrary.org', eventsUrl: 'https://www.williamstownlibrary.org/events', city: 'Williamstown', state: 'WV', zipCode: '26187', county: 'Williamstown County'}

];

const SCRAPER_NAME = 'wordpress-WV';

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
      libraryEvents.forEach(event => events.push({ ...event, metadata: { sourceName: library.name, sourceUrl: library.url, scrapedAt: new Date().toISOString(), scraperName: SCRAPER_NAME, category: 'library', state: 'WV', city: library.city, zipCode: library.zipCode }}));
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
    state: 'WV',
    category: 'library',
    platform: 'wordpress'
  });
}

async function main() { const events = await scrapeGenericEvents(); if (events.length > 0) await saveToDatabase(events); process.exit(0); }
if (require.main === module) main();

/**
 * Cloud Function export - scrapes and saves, returns stats
 */
async function scrapeWordpressWVCloudFunction() {
  console.log('☁️ Running WordPress WV as Cloud Function');
  const events = await scrapeGenericEvents();
  if (events.length === 0) {
    await logScraperResult('WordPress-WV', { found: 0, new: 0, duplicates: 0 }, { dataType: 'events' });
    return { found: 0, new: 0, duplicates: 0 };
  }
  const result = await saveToDatabase(events);
  // Log scraper stats to database
  await logScraperResult('WordPress-WV', {
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

module.exports = { scrapeGenericEvents, saveToDatabase, scrapeWordpressWVCloudFunction };
