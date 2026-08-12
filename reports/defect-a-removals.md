# Defect A — removed library entries

Generated 2026-08-09 by `scripts/fix-url-collisions.js`.

These entries were removed because their configured domain resolves to a **different**
state's library, or is dead/parked. They were not producing that library's events — they
were producing ANOTHER library's events under the wrong name and state, which is worse
than an honest zero.

**Nothing here is written off.** Each row keeps the library name, city, state and the old
URL so it can be restored the moment a real URL is verified. A removal is a recorded
coverage gap, not a decision that the library does not matter.

**Removed: 234 entries across 19 files.**

| Library | City | State | Old URL | Why |
|---|---|---|---|---|
| Milton Public Library | Milton | PA | `miltonlibrary.org` | host is MA, entry claims PA — Milton Public Library - Milton, Massachusetts |
| Sarah Hull Hallock Free Library | Milton | NY | `miltonlibrary.org` | host is MA, entry claims NY — Milton Public Library - Milton, Massachusetts |
| Milton Library | Milton | FL | `miltonlibrary.org` | host is MA, entry claims FL — Milton Public Library - Milton, Massachusetts |
| Milton Branch Library | Milton | WV | `miltonlibrary.org` | host is MA, entry claims WV — Milton Public Library - Milton, Massachusetts |
| Milton Public Library | Milton | VT | `miltonlibrary.org` | host is MA, entry claims VT — Milton Public Library - Milton, Massachusetts |
| Milton Public Library | Milton | DE | `miltonlibrary.org` | host is MA, entry claims DE — Milton Public Library - Milton, Massachusetts |
| Nute Library | Milton | NH | `miltonlibrary.org` | host is MA, entry claims NH — Milton Public Library - Milton, Massachusetts |
| Newport Public Library | Newport | PA | `newportlibrary.org` | host is OR, entry claims PA — Newport, OR |
| Newport Free Library | Newport | NY | `newportlibrary.org` | host is OR, entry claims NY — Newport, OR |
| Newport Public Library | Newport | NC | `newportlibrary.org` | host is OR, entry claims NC — Newport, OR |
| Newport Branch | Newport | KY | `newportlibrary.org` | host is OR, entry claims KY — Newport, OR |
| Newport Public Library | Newport | ME | `newportlibrary.org` | host is OR, entry claims ME — Newport, OR |
| Goodrich Memorial | Newport | VT | `newportlibrary.org` | host is OR, entry claims VT — Newport, OR |
| Richards Free Library | Newport | NH | `newportlibrary.org` | host is OR, entry claims NH — Newport, OR |
| Ashland Public Library | Ashland | PA | `ashlandlibrary.org` | dead/parked domain (HTTP 404) |
| Ashland Public Library | Ashland | MA | `ashlandlibrary.org` | dead/parked domain (HTTP 404) |
| Ashland City Public Library | Ashland | AL | `ashlandlibrary.org` | dead/parked domain (HTTP 404) |
| Benton County Library | Ashland | MS | `ashlandlibrary.org` | dead/parked domain (HTTP 404) |
| Ashland Community Library | Ashland | ME | `ashlandlibrary.org` | dead/parked domain (HTTP 404) |
| Ashland Town Library | Ashland | NH | `ashlandlibrary.org` | dead/parked domain (HTTP 404) |
| Lancaster Public Library | Lancaster | PA | `lancasterlibrary.org` | host is VA, entry claims PA — LCL Home |
| Lancaster Public Library | Lancaster | NY | `lancasterlibrary.org` | host is VA, entry claims NY — LCL Home |
| Thayer Memorial Library | Lancaster | MA | `lancasterlibrary.org` | host is VA, entry claims MA — LCL Home |
| Garrard County Public Library | Lancaster | KY | `lancasterlibrary.org` | host is VA, entry claims KY — LCL Home |
| Lancaster County Library System | Lancaster | SC | `lancasterlibrary.org` | host is VA, entry claims SC — LCL Home |
| William D. Weeks Memorial Library | Lancaster | NH | `lancasterlibrary.org` | host is VA, entry claims NH — LCL Home |
| Berlin Free Town Library | Berlin | NY | `berlinlibrary.org` | host is WI, entry claims NY — Welcome to Berlin Public Library in Wisconsin, USA \| Berlin Public Library |
| Berlin Community Library | Berlin | GA | `berlinlibrary.org` | host is WI, entry claims GA — Welcome to Berlin Public Library in Wisconsin, USA \| Berlin Public Library |
| Marie Fleche Memorial Library | Berlin | NJ | `berlinlibrary.org` | host is WI, entry claims NJ — Welcome to Berlin Public Library in Wisconsin, USA \| Berlin Public Library |
| Berlin Public Library | Berlin | MA | `berlinlibrary.org` | host is WI, entry claims MA — Welcome to Berlin Public Library in Wisconsin, USA \| Berlin Public Library |
| Berlin Free Library Association | Berlin | CT | `berlinlibrary.org` | host is WI, entry claims CT — Welcome to Berlin Public Library in Wisconsin, USA \| Berlin Public Library |
| Berlin Public Library | Berlin | NH | `berlinlibrary.org` | host is WI, entry claims NH — Welcome to Berlin Public Library in Wisconsin, USA \| Berlin Public Library |
| Lincoln Public Library | Lincoln | MA | `lincolnlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Lincoln Public Library | Lincoln | AL | `lincolnlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Lincoln Memorial Library | Lincoln | ME | `lincolnlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Lincoln | Lincoln | VT | `lincolnlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Lincoln Public Library | Lincoln | RI | `lincolnlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Lincoln Public Library | Lincoln | NH | `lincolnlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Grafton Community Library | Grafton | NY | `graftonlibrary.org` | host is MA, entry claims NY — Home \| Grafton Public Library |
| Taylor County Public Library | Grafton | WV | `graftonlibrary.org` | host is MA, entry claims WV — Home \| Grafton Public Library |
| Grafton Public | Grafton | VT | `graftonlibrary.org` | host is MA, entry claims VT — Home \| Grafton Public Library |
| Grafton Public Library | Grafton | NH | `graftonlibrary.org` | host is MA, entry claims NH — Home \| Grafton Public Library |
| Pelham-Carnegie Library | Pelham | GA | `pelhamlibrary.org` | host is NY, entry claims GA — Home - Town of Pelham Public Library |
| Pelham Library | Pelham | MA | `pelhamlibrary.org` | host is NY, entry claims MA — Home - Town of Pelham Public Library |
| Pelham Public Library | Pelham | AL | `pelhamlibrary.org` | host is NY, entry claims AL — Home - Town of Pelham Public Library |
| Pelham Public Library | Pelham | NH | `pelhamlibrary.org` | host is NY, entry claims NH — Home - Town of Pelham Public Library |
| Randolph Free Library | Randolph | NY | `randolphlibrary.org` | dead/parked domain (only 295 bytes of HTML — placeholder or redirect stub) |
| Randolph Township Free Public Library | Randolph | NJ | `randolphlibrary.org` | dead/parked domain (only 295 bytes of HTML — placeholder or redirect stub) |
| Turner Free Library | Randolph | MA | `randolphlibrary.org` | dead/parked domain (only 295 bytes of HTML — placeholder or redirect stub) |
| Kimball Public | Randolph | VT | `randolphlibrary.org` | dead/parked domain (only 295 bytes of HTML — placeholder or redirect stub) |
| Randolph Public Library | Randolph | NH | `randolphlibrary.org` | dead/parked domain (only 295 bytes of HTML — placeholder or redirect stub) |
| Weston Reading Center | Weston | FL | `westonlibrary.org` | host is MA, entry claims FL — Weston Public Library \| Weston, MA |
| Weston Public Library | Weston | CT | `westonlibrary.org` | host is MA, entry claims CT — Weston Public Library \| Weston, MA |
| Louis Bennett Public Library | Weston | WV | `westonlibrary.org` | host is MA, entry claims WV — Weston Public Library \| Weston, MA |
| Wilder Memorial | Weston | VT | `westonlibrary.org` | host is MA, entry claims VT — Weston Public Library \| Weston, MA |
| Richmond Free Public Library | Richmond | MA | `richmondlibrary.org` | host is CA, entry claims MA — Library \| Richmond, CA - Official Website |
| Isaac F Umberhine Public Library | Richmond | ME | `richmondlibrary.org` | host is CA, entry claims ME — Library \| Richmond, CA - Official Website |
| Richmond Free | Richmond | VT | `richmondlibrary.org` | host is CA, entry claims VT — Library \| Richmond, CA - Official Website |
| Clark Memorial Library | Richmond | RI | `richmondlibrary.org` | host is CA, entry claims RI — Library \| Richmond, CA - Official Website |
| Richmond Public Library | Richmond | NH | `richmondlibrary.org` | host is CA, entry claims NH — Library \| Richmond, CA - Official Website |
| Guthrie Memorial Library - Hanovers Public Library | Hanover | PA | `hanoverlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| John Curtis Free Library | Hanover | MA | `hanoverlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Hanover Public Library | Hanover | WV | `hanoverlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Howe Library | Hanover | NH | `hanoverlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Pike County Public Library - Dingman Township Branch | Milford | PA | `milfordlibrary.org` | host is CT, entry claims PA — Milford Public Library \| Milford, CT |
| Milford Free Library | Milford | NY | `milfordlibrary.org` | host is CT, entry claims NY — Milford Public Library \| Milford, CT |
| Holland Township Free Public Library | Milford | NJ | `milfordlibrary.org` | host is CT, entry claims NJ — Milford Public Library \| Milford, CT |
| Milford Town Library | Milford | MA | `milfordlibrary.org` | host is CT, entry claims MA — Milford Public Library \| Milford, CT |
| Plymouth Public Library | Plymouth | PA | `plymouthlibrary.org` | host is MI, entry claims PA — Plymouth District Library |
| Plymouth Public Library | Plymouth | MA | `plymouthlibrary.org` | host is MI, entry claims MA — Plymouth District Library |
| Plymouth Library Association | Plymouth | CT | `plymouthlibrary.org` | host is MI, entry claims CT — Plymouth District Library |
| Pease Public Library | Plymouth | NH | `plymouthlibrary.org` | host is MI, entry claims NH — Plymouth District Library |
| Allen F. Pierce Free Library | Troy | PA | `troylibrary.org` | host is IL, entry claims PA — Tri-Township Public Library \| Troy, IL |
| Brunswick Community Library | Troy | NY | `troylibrary.org` | host is IL, entry claims NY — Tri-Township Public Library \| Troy, IL |
| Troy Public Library | Troy | AL | `troylibrary.org` | host is IL, entry claims AL — Tri-Township Public Library \| Troy, IL |
| Gay-Kimball Library | Troy | NH | `troylibrary.org` | host is IL, entry claims NH — Tri-Township Public Library \| Troy, IL |
| Avon Free Library | Avon | NY | `avonlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Avon Public Library | Avon | MA | `avonlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Avon Free Public Library | Avon | CT | `avonlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Avon Public Library | Avon | MS | `avonlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Chautauqua-Cattaraugus Library System | Jamestown | NY | `jamestownlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Fentress County Library | Jamestown | TN | `jamestownlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Russell County Public Library District | Jamestown | KY | `jamestownlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Jamestown Philomenian Library | Jamestown | RI | `jamestownlibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| East Hounsfield Free Library | Watertown | NY | `watertownlibrary.org` | host is CT, entry claims NY — Watertown Library Association - Home Page |
| East Branch Library | Watertown | MA | `watertownlibrary.org` | host is CT, entry claims MA — Watertown Library Association - Home Page |
| Watertown-Wilson County Library | Watertown | TN | `watertownlibrary.org` | host is CT, entry claims TN — Watertown Library Association - Home Page |
| East Hernando Branch Library | Brooksville | FL | `brooksvillelibrary.org` | host is ME, entry claims FL — Brooksville Free Public Library |
| Bracken County Public Library | Brooksville | KY | `brooksvillelibrary.org` | host is ME, entry claims KY — Brooksville Free Public Library |
| Brooksville Public Library | Brooksville | MS | `brooksvillelibrary.org` | host is ME, entry claims MS — Brooksville Free Public Library |
| Manchester Public Library | Manchester | GA | `manchesterlibrary.org` | host is NH, entry claims GA — Manchester City Library |
| Manchester Public Library | Manchester | TN | `manchesterlibrary.org` | host is NH, entry claims TN — Manchester City Library |
| Clay County Public Library | Manchester | KY | `manchesterlibrary.org` | host is NH, entry claims KY — Manchester City Library |
| Mark Skinner | Manchester | VT | `manchesterlibrary.org` | host is NH, entry claims VT — Manchester City Library |
| Fairview Branch Library | Fairview | NC | `fairviewlibrary.org` | host is NY, entry claims NC — Fairview Public Library &#124; 43 Walnut St, Margaretville, NY 12455 (845)586-3791 |
| Fairview Free Public Library | Fairview | NJ | `fairviewlibrary.org` | host is NY, entry claims NJ — Fairview Public Library &#124; 43 Walnut St, Margaretville, NY 12455 (845)586-3791 |
| Fairview Public Library | Fairview | TN | `fairviewlibrary.org` | host is NY, entry claims TN — Fairview Public Library &#124; 43 Walnut St, Margaretville, NY 12455 (845)586-3791 |
| Fairview Public Library | Fairview | WV | `fairviewlibrary.org` | host is NY, entry claims WV — Fairview Public Library &#124; 43 Walnut St, Margaretville, NY 12455 (845)586-3791 |
| Library Company Of Burlington | Burlington | NJ | `burlingtonlibrary.org` | host is WI, entry claims NJ — Burlington Public Library is the Public Library for Burlington Wisconsin \| Offering a large collection of books, referen |
| Burlington Public Library | Burlington | MA | `burlingtonlibrary.org` | host is WI, entry claims MA — Burlington Public Library is the Public Library for Burlington Wisconsin \| Offering a large collection of books, referen |
| Burlington Public Library | Burlington | CT | `burlingtonlibrary.org` | host is WI, entry claims CT — Burlington Public Library is the Public Library for Burlington Wisconsin \| Offering a large collection of books, referen |
| Burlington Public Library | Burlington | WV | `burlingtonlibrary.org` | host is WI, entry claims WV — Burlington Public Library is the Public Library for Burlington Wisconsin \| Offering a large collection of books, referen |
| Princeton Public Library | Princeton | MA | `princetonlibrary.org` | host is NJ, entry claims MA — Home - Princeton Public Library |
| George Coon Public Library | Princeton | KY | `princetonlibrary.org` | host is NJ, entry claims KY — Home - Princeton Public Library |
| Princeton Public Library | Princeton | ME | `princetonlibrary.org` | host is NJ, entry claims ME — Home - Princeton Public Library |
| Adams Street Branch Library | Dorchester | MA | `dorchesterlibrary.org` | host is MD, entry claims MA — Dorchester County Public Library |
| Halifax County Library System | Halifax | NC | `halifaxlibrary.org` | host is VA, entry claims NC — Halifax South Boston Library \| Read &#8211; Learn &#8211; Explore |
| Holmes Public Library | Halifax | MA | `halifaxlibrary.org` | host is VA, entry claims MA — Halifax South Boston Library \| Read &#8211; Learn &#8211; Explore |
| Thomas Beaver Free Library | Danville | PA | `danvilleva.gov` | host is VA, entry claims PA — Danville, VA - Official Website \| Official Website |
| Boyle County Public Library | Danville | KY | `danvilleva.gov` | host is VA, entry claims KY — Danville, VA - Official Website \| Official Website |
| Colby Memorial Library | Danville | NH | `danvilleva.gov` | host is VA, entry claims NH — Danville, VA - Official Website \| Official Website |
| Adams Free Library | Adams | NY | `adamslibrary.org` | host is PA, entry claims NY — Homepage \| Adams County Library |
| Adams Free Library | Adams | MA | `adamslibrary.org` | host is PA, entry claims MA — Homepage \| Adams County Library |
| Mansfield Free Public Library | Mansfield | PA | `mansfieldlibrary.org` | host is TX, entry claims PA — Library \| Mansfield, TX |
| Mansfield Public Library | Mansfield | MA | `mansfieldlibrary.org` | host is TX, entry claims MA — Library \| Mansfield, TX |
| Mansfield Public Library | Mansfield | CT | `mansfieldlibrary.org` | host is TX, entry claims CT — Library \| Mansfield, TX |
| Bucks County Free Library - Southampton Free Library | Southampton | PA | `southamptonlibrary.org` | host is MA, entry claims PA — Edwards Public Library &#8211; 30 East St., Southampton, MA 01073 • Phone/FAX 413-527-9480 |
| Rogers Memorial Library | Southampton | NY | `southamptonlibrary.org` | host is MA, entry claims NY — Edwards Public Library &#8211; 30 East St., Southampton, MA 01073 • Phone/FAX 413-527-9480 |
| Helen Kate Furness Fr Library | Wallingford | PA | `wallingfordlibrary.org` | host is CT, entry claims PA — Home \| Wallingford Public Library |
| Gilbert Hart | Wallingford | VT | `wallingfordlibrary.org` | host is CT, entry claims VT — Home \| Wallingford Public Library |
| Frankfort Free Library | Frankfort | NY | `frankfortlibrary.org` | host is IL, entry claims NY — Frankfort Public Library District \| Frankfort, IL |
| Franklin County Public Library | Frankfort | KY | `frankfortlibrary.org` | host is IL, entry claims KY — Frankfort Public Library District \| Frankfort, IL |
| Frankfort - Pierce Reading Room Library | Frankfort | ME | `frankfortlibrary.org` | host is IL, entry claims ME — Frankfort Public Library District \| Frankfort, IL |
| Harrison Public Library | Harrison | NJ | `harrisonpl.org` | host is NY, entry claims NJ — Home &middot; Harrison Public Library |
| Bolsters Mills Village Library | Harrison | ME | `harrisonpl.org` | host is NY, entry claims ME — Home &middot; Harrison Public Library |
| Peninsula Public Library | Lawrence | NY | `lawrencelibrary.org` | host is MA, entry claims NY — Lawrence Library |
| Lawrenceburg Public Library | Lawrenceburg | TN | `lawrencelibrary.org` | host is MA, entry claims TN — Lawrence Library |
| Collier County Public Library | Naples | FL | `napleslibrary.org` | host is NY, entry claims FL — Naples Library |
| Naples Public Library | Naples | ME | `napleslibrary.org` | host is NY, entry claims ME — Naples Library |
| Hepburn Library Of Norfolk | Norfolk | NY | `norfolklibrary.org` | host is CT, entry claims NY — Norfolk Library \| Norfolk, Connecticut |
| Norfolk Public Library | Norfolk | MA | `norfolklibrary.org` | host is CT, entry claims MA — Norfolk Library \| Norfolk, Connecticut |
| Albert Wisner Public Library | Warwick | NY | `warwicklibrary.org` | host is RI, entry claims NY — Home \| Warwick Public Library |
| Warwick City Library | Warwick | GA | `warwicklibrary.org` | host is RI, entry claims GA — Home \| Warwick Public Library |
| Warwick Free Public Library | Warwick | MA | `warwicklibrary.org` | host is RI, entry claims MA — Home \| Warwick Public Library |
| Waterville Public Library | Waterville | NY | `watervillelibrary.org` | host is ME, entry claims NY — Waterville Public Library - Home |
| Waterville Town | Waterville | VT | `watervillelibrary.org` | host is ME, entry claims VT — Waterville Public Library - Home |
| Elsie Quirk Library | Englewood | FL | `englewoodlibrary.org` | host is NJ, entry claims FL — Home - Englewood Public Library |
| Englewood Public Library | Englewood | TN | `englewoodlibrary.org` | host is NJ, entry claims TN — Home - Englewood Public Library |
| Cabarrus County Public Library | Concord | NC | `concordlibrary.org` | host is MA, entry claims NC — Concord Free Public Library |
| Concord Public Library | Concord | VT | `concordlibrary.org` | host is MA, entry claims VT — Concord Free Public Library |
| Bragtown Branch Library | Durham | NC | `durhamlibrary.org` | host is CT, entry claims NC — page evidence points to CT (score 10 vs runner-up - 0) |
| Durham Public Library | Durham | NH | `durhamlibrary.org` | host is CT, entry claims NH — page evidence points to CT (score 10 vs runner-up - 0) |
| Merrick Public Library | Brookfield | MA | `brookfieldlibrary.org` | host is CT, entry claims MA — Home \| The Brookfield Library |
| Brookfield Free Public | Brookfield | VT | `brookfieldlibrary.org` | host is CT, entry claims VT — Home \| The Brookfield Library |
| Greenfield Public Library | Greenfield | MA | `greenfieldlibrary.org` | host is WI, entry claims MA — Home · Greenfield Public Library |
| Dr. Nathan Porter Library | Greenfield | TN | `greenfieldlibrary.org` | host is WI, entry claims TN — Home · Greenfield Public Library |
| Stephenson Memorial Library | Greenfield | NH | `greenfieldlibrary.org` | host is WI, entry claims NH — Home · Greenfield Public Library |
| Fayette County Memorial Library | Fayette | AL | `fayettelibrary.org` | host is IN, entry claims AL — Home \| Fayette County Public Library |
| Jefferson County Public Library | Fayette | MS | `fayettelibrary.org` | host is IN, entry claims MS — Home \| Fayette County Public Library |
| Underwood Memorial Library | Fayette | ME | `fayettelibrary.org` | host is IN, entry claims ME — Home \| Fayette County Public Library |
| Berkeley County Library - Daniel Island | Charleston | SC | `charlestonlibrary.org` | host is IL, entry claims SC — Charleston Carnegie Public Library in Charleston, Illinois |
| Charleston Public Library | Charleston | MS | `charlestonlibrary.org` | host is IL, entry claims MS — Charleston Carnegie Public Library in Charleston, Illinois |
| Charleston Public Library | Charleston | ME | `charlestonlibrary.org` | host is IL, entry claims ME — Charleston Carnegie Public Library in Charleston, Illinois |
| Greenwood County Library System | Greenwood | SC | `greenwoodlibrary.org` | host is IN, entry claims SC — Greenwood Public Library Indiana :: |
| Greenwood-Leflore Public Library | Greenwood | MS | `greenwoodlibrary.org` | host is IN, entry claims MS — Greenwood Public Library Indiana :: |
| Greenwood Public Library | Greenwood | DE | `greenwoodlibrary.org` | host is IN, entry claims DE — Greenwood Public Library Indiana :: |
| Canaan Public Library | Canaan | ME | `canaanlibrary.org` | host is NH, entry claims ME — Canaan Town Library &#8211; Canaan, NH |
| Alice M. Ward Memorial | Canaan | VT | `canaanlibrary.org` | host is NH, entry claims VT — Canaan Town Library &#8211; Canaan, NH |
| Ardmore Library | Ardmore | PA | `ardmore.okpls.org` | host is OK, entry claims PA — Ardmore Public Library |
| Ardmore Public Library | Ardmore | TN | `ardmore.okpls.org` | host is OK, entry claims TN — Ardmore Public Library |
| Avalon Free Public Library | Avalon | NJ | `avalonlibrary.org` | host is PA, entry claims NJ — Avalon Public Library |
| Parlin Memorial Library | Everett | MA | `everettlibrary.org` | host is PA, entry claims MA — Everett Free Library \| library \| 137 East Main Street, Everett, PA, USA |
| Arthur Hufnagel Public Library Of Glen Rock | Glen Rock | PA | `glenrocklibrary.org` | host is NJ, entry claims PA — Glen Rock Public Library - Bergen County New Jersey - BCCLS Member - Get a Library Card |
| Hastings Public Library | Hastings | PA | `hastingslibrary.org` | host is NY, entry claims PA — Hastings-on-Hudson Public Library \| Part of the Westchester Library System |
| Hastings Branch Library | Hastings | FL | `hastingslibrary.org` | host is NY, entry claims FL — Hastings-on-Hudson Public Library \| Part of the Westchester Library System |
| Knox Public Library | Knox | PA | `knoxlibrary.org` | dead/parked domain (only 122 bytes of HTML — placeholder or redirect stub) |
| Knox County Public Library | Barbourville | KY | `knoxlibrary.org` | dead/parked domain (only 122 bytes of HTML — placeholder or redirect stub) |
| Susquehanna County Historical Society Free Library Association | Montrose | PA | `montroselibrary.org` | host is CO, entry claims PA — Montrose Regional Library District - Montrose Regional Library District |
| Hendrick Hudson Free Library | Montrose | NY | `montroselibrary.org` | host is CO, entry claims NY — Montrose Regional Library District - Montrose Regional Library District |
| Belleville Free Library | Belleville | NY | `bellevillelibrary.org` | host is KS, entry claims NY — Belleville Public Library &#8211; Belleville, Kansas |
| Belleville Public Library | Belleville | NJ | `bellevillelibrary.org` | host is KS, entry claims NJ — Belleville Public Library &#8211; Belleville, Kansas |
| Boston Free Library | Boston | NY | `bostonlibrary.org` | dead/parked domain (only 1072 bytes of HTML — placeholder or redirect stub) |
| Boston Public Library | Boston | MA | `bostonlibrary.org` | dead/parked domain (only 1072 bytes of HTML — placeholder or redirect stub) |
| Caledonia Public Library | Caledonia | MS | `caledonialibrary.org` | host is NY, entry claims MS — Caledonia Library |
| Carthage Free Library | Carthage | NY | `carthagelibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Smith County Public Library | Carthage | TN | `carthagelibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Easton Library | Greenwich | NY | `greenwichlibrary.org` | host is CT, entry claims NY — Greenwich Library in Connecticut \| 101 West Putnam Avenue |
| Roeliff Jansen Community Library Association | Hillsdale | NY | `cityofsanmateo.org` | host is CA, entry claims NY — San Mateo, CA - Official Website \| Official Website |
| Hillsdale Free Public Library | Hillsdale | NJ | `cityofsanmateo.org` | host is CA, entry claims NJ — San Mateo, CA - Official Website \| Official Website |
| Newark Public Library | Newark | NJ | `newarklibrary.org` | host is NY, entry claims NJ — Newark Public Library &#8211; Connect. Explore. Imagine |
| Phelps Community Memorial Library | Phelps | NY | `phelpslibrary.org` | dead/parked domain (HTTP 404) |
| Phelps Branch | Phelps | KY | `phelpslibrary.org` | dead/parked domain (HTTP 404) |
| Piermont Public Library | Piermont | NH | `piermontlibrary.org` | host is NY, entry claims NH — Piermont Public Library – 25 Flywheel Park West, Piermont, NY 10968-1040 |
| Pine Hill Branch Public Library | Pine Hill | AL | `pinehilllibrary.org` | host is NY, entry claims AL — Morton Memorial Library |
| Queens Borough Public Library - Ridgewood | Ridgewood | NY | `ridgewoodlibrary.org` | host is NJ, entry claims NY — Home - Ridgewood Public Library |
| Seaford District Library | Seaford | DE | `seafordlibrary.org` | host is NY, entry claims DE — Seaford Public Library – Your Doorway to the Past, the Present, &amp; the Future |
| Mastics-Moriches-Shirley Community Lib | Shirley | NY | `shirleylibrary.org` | host is MA, entry claims NY — Hazen Memorial Library |
| Somers Public Library | Somers | CT | `somerslibrary.org` | host is NY, entry claims CT — Somers Library Your Library in the Park |
| Brookhaven National Laboratory | Upton | NY | `uptonlibrarystaff.wixsite.com` | dead/parked domain (HTTP 404) |
| Upton Town Library | Upton | MA | `uptonlibrarystaff.wixsite.com` | dead/parked domain (HTTP 404) |
| Williamson Public Library | Williamson | WV | `williamsonlibrary.org` | host is NY, entry claims WV — Williamson Public Library \| Public Library \| 6380 Route 21 South, Williamson, NY, USA |
| Hawthorne Branch Library | Hawthorne | FL | `hawthornelibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Louis Bay 2nd Library | Hawthorne | NJ | `hawthornelibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Gadsden County Public Library | Quincy | FL | `quincylibrary.org` | host is IL, entry claims FL — Home \| Quincy Public Library |
| Adams Shore Branch Library | Quincy | MA | `quincylibrary.org` | host is IL, entry claims MA — Home \| Quincy Public Library |
| Little Red Schoolhouse Branch | Spring Hill | FL | `springhilllibrary.org` | host is TN, entry claims FL — Spring Hill Public Library \| Spring Hill, TN - Official Website |
| Cochran Public Library | Stockbridge | GA | `stockbridgelibrary.org` | host is MA, entry claims GA — The Stockbridge Library Museum &amp; Archives |
| Warren County Public Library | Warrenton | GA | `warrentonlibrary.org` | host is OR, entry claims GA — Warrenton Community Library \| Library \| 160 South Main Avenue, Warrenton, OR, USA |
| Warren County Memorial Library | Warrenton | NC | `warrentonlibrary.org` | host is OR, entry claims NC — Warrenton Community Library \| Library \| 160 South Main Avenue, Warrenton, OR, USA |
| Erwin Public Library | Erwin | NC | `erwinlibrary.org` | host is NY, entry claims NC — Erwin Library and Institute &#8211; Boonville&#039;s Public Library |
| Unicoi County Public Library | Erwin | TN | `erwinlibrary.org` | host is NY, entry claims TN — Erwin Library and Institute &#8211; Boonville&#039;s Public Library |
| Leicester Branch Library | Leicester | NC | `leicesterlibrary.org` | host is MA, entry claims NC — Library \| Leicester, MA |
| Saluda Branch Library | Saluda | NC | `saludalibrary.org` | host is SC, entry claims NC — Saluda County Library - South Carolina |
| Lee Memorial Library | Allendale | NJ | `allendalelibrary.org` | host is MI, entry claims NJ — Home \| Allendale Township Library |
| Allendale County Library | Allendale | SC | `allendalelibrary.org` | host is MI, entry claims SC — Home \| Allendale Township Library |
| Beverly Free Library | Beverly | NJ | `beverlylibrary.org` | dead/parked domain (HTTP 404) |
| Beverly Farms Branch Library | Beverly | MA | `beverlylibrary.org` | dead/parked domain (HTTP 404) |
| Woodbridge Town Library | Woodbridge | CT | `woodbridgelibrary.org` | host is NJ, entry claims CT — Public Library \| Woodbridge Township, NJ |
| Brookline Public Library | Brookline | NH | `brooklinelibrary.org` | host is MA, entry claims NH — The Brookline Public Library: Home |
| Cheshire Public Library | Cheshire | MA | `cheshirelibrary.org` | host is CT, entry claims MA — Cheshire Public Library \| |
| Lowell Community | Lowell | VT | `lowelllibrary.org` | host is MA, entry claims VT — Home 📚 Pollard Memorial Library |
| Alden Balch Memorial | Lunenburg | VT | `lunenburglibrary.org` | host is MA, entry claims VT — Lunenburg Public Library &#8211; Welcome |
| Rockland Memorial Library | Rockland | MA | `rocklandlibrary.org` | host is ME, entry claims MA — Library \| Rockland, ME |
| Westford Town | Westford | VT | `westfordlibrary.org` | host is MA, entry claims VT — Home - J.V. Fletcher Library |
| Winthrop Public Library | Winthrop | MA | `winthroplibrary.org` | dead/parked domain (only 115 bytes of HTML — placeholder or redirect stub) |
| Bailey Public Library | Winthrop | ME | `winthroplibrary.org` | dead/parked domain (only 115 bytes of HTML — placeholder or redirect stub) |
| Booth Dimock Memorial Library | Coventry | CT | `coventrylibrary.org` | host is RI, entry claims CT — Home \| Coventry Public Library |
| Portland Public Library | Portland | CT | `portlandlibrary.org` | host is ME, entry claims CT — Explore Your Public Library \| Portland Public Library |
| Portland Public Library | Portland | TN | `portlandlibrary.org` | host is ME, entry claims TN — Explore Your Public Library \| Portland Public Library |
| Seymour Public Library | Seymour | CT | `seymourlibrary.org` | host is NY, entry claims CT — Seymour Library Home Page \| Seymour Library Welcomes You |
| Seymour Branch Library | Seymour | TN | `seymourlibrary.org` | host is NY, entry claims TN — Seymour Library Home Page \| Seymour Library Welcomes You |
| Somerville-Fayette County Library | Somerville | TN | `somervillelibrary.org` | dead/parked domain (only 170 bytes of HTML — placeholder or redirect stub) |
| Somerville Public Library | Somerville | AL | `somervillelibrary.org` | dead/parked domain (only 170 bytes of HTML — placeholder or redirect stub) |
| Marshall County Public Library | Benton | KY | `marshallcountylibrary.org` | host is TN, entry claims KY — Home \| Marshall County Memorial Library \| Lewisburg, TN \| Chapel Hill, TN |
| Marshall County Public Library | Moundsville | WV | `marshallcountylibrary.org` | host is TN, entry claims WV — Home \| Marshall County Memorial Library \| Lewisburg, TN \| Chapel Hill, TN |
| Sturgis Branch | Sturgis | KY | `sturgislibrary.org` | host is MA, entry claims KY — Sturgis Library Barnstable, MA \| Cape Cod Genealogy &amp; Maritime History \| Cape Cod Library |
| Sturgis Public Library | Sturgis | MS | `sturgislibrary.org` | host is MA, entry claims MS — Sturgis Library Barnstable, MA \| Cape Cod Genealogy &amp; Maritime History \| Cape Cod Library |
| Spartanburg County Public Library - Middle Tyger Branch Library | Lyman | SC | `lymanlibrary.org` | host is ME, entry claims SC — Lyman Community Library |
| Hope Library | Hope | ME | `hopelibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Hope Library | Scituate | RI | `hopelibrary.org` | dead/parked domain (only 114 bytes of HTML — placeholder or redirect stub) |
| Dorothy W Quimby Library | Unity | ME | `unitylibrary.org` | dead/parked domain (only 489 bytes of HTML — placeholder or redirect stub) |
| Unity Free Public Library | Unity | NH | `unitylibrary.org` | dead/parked domain (only 489 bytes of HTML — placeholder or redirect stub) |
| Portsmouth Public Library | Portsmouth | NH | `portsmouthlibrary.org` | host is RI, entry claims NH — Home \| Portsmouth Free Public Library |
| Meriden Library | Meriden | NH | `meridenlibrary.org` | host is CT, entry claims NH — Home \| Meriden Public Library |

## Identified but NOT acted on

Evidence suggests these are also wrong, but not conclusively enough to delete. They are
left in place deliberately — a confident wrong call is the failure mode this project has
paid for most.

**210 entries.**

| Library | City | State | Host | Note |
|---|---|---|---|---|
| Oxford Public Library | Oxford | PA | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Oxford Memorial Library | Oxford | NY | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Berea Branch Library | Oxford | NC | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Oxford Public Library | Oxford | NJ | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Oxford Free Public Library | Oxford | MA | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Oxford Public Library | Oxford | CT | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Oxford Public Library | Oxford | AL | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Lafayette County-Oxford Public Library | Oxford | MS | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Freeland Holmes Library | Oxford | ME | `oxfordlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Canton Free Library | Canton | NY | `cantonlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 6 vs runner-up - 0)) |
| Hickory Flat Public Library | Canton | GA | `cantonlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 6 vs runner-up - 0)) |
| Canton Branch Library | Canton | NC | `cantonlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 6 vs runner-up - 0)) |
| Canton Public Library | Canton | MA | `cantonlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 6 vs runner-up - 0)) |
| Canton Public Library | Canton | CT | `cantonlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 6 vs runner-up - 0)) |
| Liberty Public Library | Liberty | NY | `libertylibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 8 vs runner-up - 0)) |
| Liberty Public Library | Liberty | NC | `libertylibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 8 vs runner-up - 0)) |
| Casey County Public Library | Liberty | KY | `libertylibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 8 vs runner-up - 0)) |
| Pickens County Library - Sarlin Branch Library | Liberty | SC | `libertylibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 8 vs runner-up - 0)) |
| Liberty Public Library | Liberty | MS | `libertylibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 8 vs runner-up - 0)) |
| Ivan O. Davis-Liberty Library | Liberty | ME | `libertylibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 8 vs runner-up - 0)) |
| Spalding Memorial Library | Athens | PA | `athenslibrary.org` | evidence points to GA but not conclusively (page evidence points to GA (score 7 vs runner-up - 0)) |
| D.R. Evarts Library | Athens | NY | `athenslibrary.org` | evidence points to GA but not conclusively (page evidence points to GA (score 7 vs runner-up - 0)) |
| Athens Public Library | Athens | TN | `athenslibrary.org` | evidence points to GA but not conclusively (page evidence points to GA (score 7 vs runner-up - 0)) |
| Athens-Limestone Public Library | Athens | AL | `athenslibrary.org` | evidence points to GA but not conclusively (page evidence points to GA (score 7 vs runner-up - 0)) |
| Westfield Public Library | Westfield | PA | `westfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up - 0)) |
| Patterson Library | Westfield | NY | `westfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up - 0)) |
| Westfield Memorial Library | Westfield | NJ | `westfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up - 0)) |
| Westfield Athenaeum | Westfield | MA | `westfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up - 0)) |
| Hitchcock Museum | Westfield | VT | `westfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up - 0)) |
| Harris County Public Library | Hamilton | GA | `hamiltonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Hamilton Township Free Public Library | Hamilton | NJ | `hamiltonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Clyde Nix Public Library | Hamilton | AL | `hamiltonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Hamilton Public Library | Hamilton | MS | `hamiltonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Pembroke Public Library | Pembroke | GA | `pembrokelibrary.org` | evidence points to ME but not conclusively (page evidence points to ME (score 9 vs runner-up - 0)) |
| Pembroke Public Library | Pembroke | NC | `pembrokelibrary.org` | evidence points to ME but not conclusively (page evidence points to ME (score 9 vs runner-up - 0)) |
| Pembroke Public Library | Pembroke | MA | `pembrokelibrary.org` | evidence points to ME but not conclusively (page evidence points to ME (score 9 vs runner-up - 0)) |
| Pembroke Town Library | Pembroke | NH | `pembrokelibrary.org` | evidence points to ME but not conclusively (page evidence points to ME (score 9 vs runner-up - 0)) |
| Plainfield Free Public Library | Plainfield | NJ | `plainfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Shaw Memorial Library | Plainfield | MA | `plainfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Central Village Public Library | Plainfield | CT | `plainfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Cutler Memorial | Plainfield | VT | `plainfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Philip Read Memorial Library | Plainfield | NH | `plainfieldlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Dover Area Community Library | Dover | PA | `doverlibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 5 vs runner-up - 0)) |
| Dover Free Public Library | Dover | NJ | `doverlibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 5 vs runner-up - 0)) |
| Dover Town Library | Dover | MA | `doverlibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 5 vs runner-up - 0)) |
| Stewart County Public Library | Dover | TN | `doverlibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 5 vs runner-up - 0)) |
| Hyde Park Public Library | Hyde Park | PA | `hydeparklibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Hyde Park Branch Library | Hyde Park | MA | `hydeparklibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Lanpher Memorial | Hyde Park | VT | `hydeparklibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Seymour Public Library District | Auburn | NY | `auburnlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Auburn Branch | Auburn | KY | `auburnlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Griffin Free Public Library | Auburn | NH | `auburnlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Hawn Memorial Library | Clayton | NY | `claytonlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up - 0)) |
| Rabun Co. Public Library | Clayton | GA | `claytonlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up - 0)) |
| Hocutt Ellington Memorial Library | Clayton | NC | `claytonlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up - 0)) |
| Clayton Town And County Public Library | Clayton | AL | `claytonlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up - 0)) |
| Fair Haven Public Library | Fair Haven | NJ | `fairhavenlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Millicent Library | Fairhaven | MA | `fairhavenlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Fair Haven Free | Fair Haven | VT | `fairhavenlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Louise Adelia Read Memorial Library | Hancock | NY | `hancocklibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up TX 1)) |
| Taylor Memorial Library | Hancock | MA | `hancocklibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up TX 1)) |
| Hancock Free Public | Hancock | VT | `hancocklibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up TX 1)) |
| Hancock Town Library | Hancock | NH | `hancocklibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 6 vs runner-up TX 1)) |
| Irvington Public Library | Irvington | NJ | `irvingtonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Irvington Branch | Irvington | KY | `irvingtonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| City Of Bayou La Batre Public Library | Irvington | AL | `irvingtonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Cherokee Regional Library System | Lafayette | GA | `lafayettelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 6 vs runner-up - 0)) |
| Macon County Public Library | Lafayette | TN | `lafayettelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 6 vs runner-up - 0)) |
| Lafayette Pilot Public Library | Lafayette | AL | `lafayettelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 6 vs runner-up - 0)) |
| Lauderdale County Library | Ripley | TN | `ripleylibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Ripley Public Library | Ripley | MS | `ripleylibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Jackson County Public Library | Ripley | WV | `ripleylibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Roxbury Library Association | Roxbury | NY | `roxburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 7 vs runner-up NY 1)) |
| Dudley Branch Library | Roxbury | MA | `roxburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 7 vs runner-up NY 1)) |
| Minor Memorial Library | Roxbury | CT | `roxburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 7 vs runner-up NY 1)) |
| Roxbury Free | Roxbury | VT | `roxburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 7 vs runner-up NY 1)) |
| Wilmington E.M. Cooper Memorial Public Library | Wilmington | NY | `wilmingtonlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 6 vs runner-up - 0)) |
| Myrtle Grove Branch | Wilmington | NC | `wilmingtonlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 6 vs runner-up - 0)) |
| Wilmington Memorial Library | Wilmington | MA | `wilmingtonlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 6 vs runner-up - 0)) |
| Pettee Memorial | Wilmington | VT | `wilmingtonlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 6 vs runner-up - 0)) |
| Covington Branch | Decatur | GA | `decaturlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Meigs-Decatur Public Library | Decatur | TN | `decaturlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Decatur Public Library | Decatur | AL | `decaturlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Decatur Public Library | Decatur | MS | `decaturlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Anthony Pio Costa Memorial Library | Fairfield | NJ | `fairfieldlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up IL 1)) |
| Walter J. Hanna Memorial Library | Fairfield | AL | `fairfieldlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up IL 1)) |
| Lawrence Public Library | Fairfield | ME | `fairfieldlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up IL 1)) |
| Bent Northrup Memorial | Fairfield | VT | `fairfieldlibrary.org` | evidence points to CA but not conclusively (page evidence points to CA (score 6 vs runner-up IL 1)) |
| Woodbury Public Library | Woodbury | CT | `woodburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 5 vs runner-up DE 1)) |
| Adams Memorial Library | Woodbury | TN | `woodburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 5 vs runner-up DE 1)) |
| Woodbury Community | Woodbury | VT | `woodburylibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 5 vs runner-up DE 1)) |
| Pittsfield Public Library | Pittsfield | ME | `pittsfieldlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Roger Clark Memorial | Pittsfield | VT | `pittsfieldlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Josiah Carpenter Library | Pittsfield | NH | `pittsfieldlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Albion Area Public Library | Albion | PA | `albionlibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 5 vs runner-up - 0)) |
| Swan Library | Albion | NY | `albionlibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 5 vs runner-up - 0)) |
| Albion Public Library | Albion | ME | `albionlibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 5 vs runner-up - 0)) |
| Easton Area Public Library | Easton | PA | `eastonlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Five Corners Library | Easton | MA | `eastonlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Prospect Free Library | Prospect | NY | `prospectlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 5 vs runner-up - 0)) |
| Prospect Public Library | Prospect | CT | `prospectlibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 5 vs runner-up - 0)) |
| Mary S Biesecker Public Library | Somerset | PA | `somersetlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Franklin Twp Public Library-Somerset | Somerset | NJ | `somersetlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Somerset Public Library | Somerset | MA | `somersetlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Audubon Branch | Amherst | NY | `amherstlibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up - 0)) |
| Jones Library, Inc. | Amherst | MA | `amherstlibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up - 0)) |
| Chatham Public Library | Chatham | NY | `chathamlibrary.librarycalendar.com` | evidence points to NJ but not conclusively (page evidence points to NJ (score 5 vs runner-up - 0)) |
| Eldredge Public Library | Chatham | MA | `chathamlibrary.librarycalendar.com` | evidence points to NJ but not conclusively (page evidence points to NJ (score 5 vs runner-up - 0)) |
| John W. Clark Public Library | Franklinville | NC | `franklinvillelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Franklin Twp Public Library-Gloucester | Franklinville | NJ | `franklinvillelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Queens Borough Public Library - Hollis | Hollis | NY | `hollislibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up - 0)) |
| Hollis Center Public Library | Hollis | ME | `hollislibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up - 0)) |
| Guernsey Memorial Library Of Norwich | Norwich | NY | `norwichlibrary.org` | evidence points to VT but not conclusively (page evidence points to VT (score 5 vs runner-up - 0)) |
| Otis Library | Norwich | CT | `norwichlibrary.org` | evidence points to VT but not conclusively (page evidence points to VT (score 5 vs runner-up - 0)) |
| Stamford Village Library | Stamford | NY | `stamfordlibrary.org` | evidence points to VT but not conclusively (page evidence points to VT (score 5 vs runner-up - 0)) |
| Stamford Public Library | Stamford | CT | `stamfordlibrary.org` | evidence points to VT but not conclusively (page evidence points to VT (score 5 vs runner-up - 0)) |
| Waverly Free Library | Waverly | NY | `waverlylibrary.com` | evidence points to NE but not conclusively (page evidence points to NE (score 5 vs runner-up - 0)) |
| Humphreys County Public Library | Waverly | TN | `waverlylibrary.com` | evidence points to NE but not conclusively (page evidence points to NE (score 5 vs runner-up - 0)) |
| Waverly Library | Waverly | WV | `waverlylibrary.com` | evidence points to NE but not conclusively (page evidence points to NE (score 5 vs runner-up - 0)) |
| Windham Free Library | Windham | CT | `windhamlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Windham Town | Windham | VT | `windhamlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Wolcott Civic Free Library | Wolcott | NY | `wolcottlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 7 vs runner-up - 0)) |
| G. M. Kelley Community | Wolcott | VT | `wolcottlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 7 vs runner-up - 0)) |
| Wilcox County Public Library | Abbeville | GA | `abbevillelibrary.org` | evidence points to AL but not conclusively (page evidence points to AL (score 9 vs runner-up WA 1)) |
| Abbeville County Library System | Abbeville | SC | `abbevillelibrary.org` | evidence points to AL but not conclusively (page evidence points to AL (score 9 vs runner-up WA 1)) |
| Centerville Branch Library | Centerville | GA | `centervillelibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Hickman County Public Library | Centerville | TN | `centervillelibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Jefferson County Library System | Louisville | GA | `louisvillelibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 6 vs runner-up - 0)) |
| Louisville Public Library | Louisville | AL | `louisvillelibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 6 vs runner-up - 0)) |
| Winston County Library | Louisville | MS | `louisvillelibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 6 vs runner-up - 0)) |
| Maysville Public Library | Maysville | GA | `maysvillelibrary.org` | evidence points to MO but not conclusively (page evidence points to MO (score 5 vs runner-up - 0)) |
| Maysville Public Library | Maysville | NC | `maysvillelibrary.org` | evidence points to MO but not conclusively (page evidence points to MO (score 5 vs runner-up - 0)) |
| Mason County Public Library | Maysville | KY | `maysvillelibrary.org` | evidence points to MO but not conclusively (page evidence points to MO (score 5 vs runner-up - 0)) |
| Chesterfield Public Library | Chesterfield | MA | `chesterfieldlibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up - 0)) |
| Chesterfield County Library System | Chesterfield | SC | `chesterfieldlibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up - 0)) |
| Rochester Public Library | Rochester | NY | `rochesterpubliclibrary.librarymarket.com` | evidence points to MN but not conclusively (page evidence points to MN (score 5 vs runner-up - 0)) |
| Rochester Public Library | Rochester | NH | `rochesterpubliclibrary.librarymarket.com` | evidence points to MN but not conclusively (page evidence points to MN (score 5 vs runner-up - 0)) |
| Bethany Public Library | Bethany | PA | `bethanylibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Bridgeville Public Library | Bridgeville | DE | `bridgevillelibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 5 vs runner-up - 0)) |
| Greensburg Hempfield Area Library | Greensburg | PA | `greensburglibrary.org` | evidence points to IN but not conclusively (page evidence points to IN (score 9 vs runner-up - 0)) |
| Green County Public Library | Greensburg | KY | `greensburglibrary.org` | evidence points to IN but not conclusively (page evidence points to IN (score 9 vs runner-up - 0)) |
| Hamburg Public Library | Hamburg | PA | `hamburglibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 6 vs runner-up - 0)) |
| Hamburg Library | Hamburg | NY | `hamburglibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 6 vs runner-up - 0)) |
| Chartiers-Houston Com Library | Houston | PA | `houstonlibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 5 vs runner-up - 0)) |
| Houston Carnegie Library | Houston | MS | `houstonlibrary.org` | evidence points to TX but not conclusively (page evidence points to TX (score 5 vs runner-up - 0)) |
| Northern Wayne Community Library | Lakewood | PA | `lakewoodlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Monroe County Public Library | Monroeville | AL | `monroevillelibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 5 vs runner-up - 0)) |
| Tyrone Public Library | Tyrone | GA | `tyronelibrary.org` | evidence points to PA but not conclusively (page evidence points to PA (score 6 vs runner-up - 0)) |
| Addison Public Library | Addison | NY | `addisonlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Mayhew Library Assn | Addison | ME | `addisonlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Roddenbery Memorial Library System | Cairo | GA | `cairolibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Cambridge Public Library | Cambridge | NY | `cambridgelibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 7 vs runner-up - 0)) |
| Simpson Memorial Library | Carmel | ME | `carmellibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Hall Memorial Library | Ellington | CT | `ellingtonlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 9 vs runner-up - 0)) |
| Gorham Free Library | Gorham | NY | `gorhamlibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 5 vs runner-up WA 1)) |
| Lake Placid Memorial Library | Lake Placid | FL | `lakeplacidlibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 6 vs runner-up - 0)) |
| Machias - Porter Memorial Library | Machias | ME | `machiaslibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 7 vs runner-up - 0)) |
| Morristown Public Library | Morristown | NY | `morristownlibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 8 vs runner-up - 0)) |
| Rye Public Library | Rye | NH | `ryelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 6 vs runner-up - 0)) |
| Allen County Public Library | Scottsville | KY | `scottsvillelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Wayland Free Library | Wayland | NY | `waylandlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Whitesville Public Library | Whitesville | WV | `whitesvillelibrary.org` | evidence points to NY but not conclusively (page evidence points to NY (score 5 vs runner-up - 0)) |
| Auburndale Public Library | Auburndale | FL | `auburndalelibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Ida Hilton Public Library | Darien | GA | `darienlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Douglas-Coffee County Public Library | Douglas | GA | `douglaslibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Simon Fairfield Public Library | Douglas | MA | `douglaslibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Webster County Library | Preston | GA | `prestonpubliclibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Riverdale Branch Library | Riverdale | GA | `riverdalelibrary.org` | evidence points to NJ but not conclusively (page evidence points to NJ (score 6 vs runner-up - 0)) |
| Wayne County Public Library, Fremont | Fremont | NC | `fremontlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 6 vs runner-up - 0)) |
| Fremont Public Library | Fremont | NH | `fremontlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 6 vs runner-up - 0)) |
| Hampstead Branch Library | Hampstead | NC | `hampsteadlibrary.org` | evidence points to NH but not conclusively (page evidence points to NH (score 6 vs runner-up - 0)) |
| Henderson County Public Library | Hendersonville | NC | `youseemore.com` | evidence points to WV but not conclusively (page evidence points to WV (score 5 vs runner-up CA 1)) |
| Hendersonville Public Library | Hendersonville | TN | `youseemore.com` | evidence points to WV but not conclusively (page evidence points to WV (score 5 vs runner-up CA 1)) |
| Florence Gallier Library | Magnolia | NC | `magnolialibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 6 vs runner-up - 0)) |
| Magnolia Public Library | Magnolia | MS | `magnolialibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 6 vs runner-up - 0)) |
| Craven-Pamlico-Carteret Regional Library | New Bern | NC | `newbernlibrary.org` | evidence points to AL but not conclusively (page evidence points to AL (score 8 vs runner-up - 0)) |
| Newbern City Library | Newbern | TN | `newbernlibrary.org` | evidence points to AL but not conclusively (page evidence points to AL (score 8 vs runner-up - 0)) |
| Cleveland County Memorial Library | Shelby | NC | `shelbylibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 5 vs runner-up - 0)) |
| Dr. Robert T. Hollingsworth Library | Shelby | MS | `shelbylibrary.org` | evidence points to MI but not conclusively (page evidence points to MI (score 5 vs runner-up - 0)) |
| Millville Public Library | Millville | NJ | `millvillelibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Ridgefield Free Public Library | Ridgefield | NJ | `ridgefieldlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 9 vs runner-up NY 4)) |
| Acton Memorial Library | Acton | MA | `actonlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 6 vs runner-up NY 1)) |
| Acton Public Library | Acton | ME | `actonlibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 6 vs runner-up NY 1)) |
| Frederick H. Cossitt Library | Granby | CT | `granbylibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Levi E.Coe Library | Middlefield | CT | `middlefieldlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Palmer Public Library | Palmer | TN | `palmerlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Rockport Public Library | Rockport | ME | `rockportlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Lexington County Library - Swansea | Swansea | SC | `swansealibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| Wakefield Public Library | Wakefield | NH | `wakefieldlibrary.org` | evidence points to MA but not conclusively (page evidence points to MA (score 5 vs runner-up - 0)) |
| George Gamble Library | Danbury | NH | `danburylibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Elkins Library | Canterbury | NH | `canterburylibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 5 vs runner-up - 0)) |
| Westbrook Public Library | Westbrook | ME | `westbrooklibrary.org` | evidence points to CT but not conclusively (page evidence points to CT (score 6 vs runner-up - 0)) |
| Alexandria Branch Library | Alexandria | TN | `alexandrialibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 9 vs runner-up - 0)) |
| Haynes Library | Alexandria | NH | `alexandrialibrary.org` | evidence points to OH but not conclusively (page evidence points to OH (score 9 vs runner-up - 0)) |
| Baxter Branch Library | Baxter | TN | `baxterlibrary.org` | evidence points to ME but not conclusively (page evidence points to ME (score 8 vs runner-up - 0)) |
| Cordova Branch Library | Cordova | TN | `cordovalibrary.org` | evidence points to AK but not conclusively (page evidence points to AK (score 6 vs runner-up - 0)) |
| Cordova Public Library | Cordova | AL | `cordovalibrary.org` | evidence points to AK but not conclusively (page evidence points to AK (score 6 vs runner-up - 0)) |
| Washburn Public Library | Washburn | TN | `washburnlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up WA 1)) |
| Washburn Memorial Library | Washburn | ME | `washburnlibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up WA 1)) |
| Winfield Public Library | Winfield | TN | `winfieldlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Northwest Regional Library | Winfield | AL | `winfieldlibrary.org` | evidence points to IL but not conclusively (page evidence points to IL (score 5 vs runner-up - 0)) |
| Rebecca Caudill Public Library | Cumberland | KY | `cumberlandlibrary.org` | evidence points to RI but not conclusively (page evidence points to RI (score 5 vs runner-up - 0)) |
| Prince Memorial Library | Cumberland | ME | `cumberlandlibrary.org` | evidence points to RI but not conclusively (page evidence points to RI (score 5 vs runner-up - 0)) |
| Mary Wood Weldon Memorial Public Library | Glasgow | KY | `glasgowlibrary.org` | evidence points to MT but not conclusively (page evidence points to MT (score 5 vs runner-up - 0)) |
| Glasgow Branch Library | Glasgow | WV | `glasgowlibrary.org` | evidence points to MT but not conclusively (page evidence points to MT (score 5 vs runner-up - 0)) |
| Woodville Public Library | Woodville | AL | `woodvillelibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Woodville Public Library | Woodville | MS | `woodvillelibrary.org` | evidence points to WI but not conclusively (page evidence points to WI (score 5 vs runner-up - 0)) |
| Wells Village | Wells | VT | `wellslibrary.org` | evidence points to ME but not conclusively (page evidence points to ME (score 9 vs runner-up - 0)) |
| Bennington Free | Bennington | VT | `benningtonlibrary.org` | evidence points to NE but not conclusively (page evidence points to NE (score 9 vs runner-up NY 1)) |
| G. E.P. Dodge Library | Bennington | NH | `benningtonlibrary.org` | evidence points to NE but not conclusively (page evidence points to NE (score 9 vs runner-up NY 1)) |


## Removed 2026-08-11 — acted on the "identified but not acted on" backlog

These were listed as known collisions on 2026-08-09 but left in config. They became urgent
once the 2026-08-11 date-extraction fixes made these scrapers able to read pages they used to
fail on: a working extraction against a wrong-state host imports that state's events under the
wrong name. Each is a RECORDED COVERAGE GAP, restorable once a real URL is verified.

| Library | City | State | Old URL | Why |
|---|---|---|---|---|
| Oxford Public Library | Oxford | PA | `oxfordlibrary.org` | host serves WI — removed 2026-08-11 |
| Berea Branch Library | Oxford | NC | `oxfordlibrary.org` | host serves WI — removed 2026-08-11 |
| Oxford Public Library | Oxford | NJ | `oxfordlibrary.org` | host serves WI — removed 2026-08-11 |
| Oxford Public Library | Oxford | CT | `oxfordlibrary.org` | host serves WI — removed 2026-08-11 |
| Oxford Public Library | Oxford | AL | `oxfordlibrary.org` | host serves WI — removed 2026-08-11 |
| Canton Branch Library | Canton | NC | `cantonlibrary.org` | host serves PA — removed 2026-08-11 |
| Canton Public Library | Canton | MA | `cantonlibrary.org` | host serves PA — removed 2026-08-11 |
| Canton Public Library | Canton | CT | `cantonlibrary.org` | host serves PA — removed 2026-08-11 |
| Harris County Public Library | Hamilton | GA | `hamiltonlibrary.org` | host serves NY — removed 2026-08-11 |
| Clyde Nix Public Library | Hamilton | AL | `hamiltonlibrary.org` | host serves NY — removed 2026-08-11 |
| Pembroke Public Library | Pembroke | GA | `pembrokelibrary.org` | host serves ME — removed 2026-08-11 |
| Pembroke Public Library | Pembroke | NC | `pembrokelibrary.org` | host serves ME — removed 2026-08-11 |
| Pembroke Public Library | Pembroke | MA | `pembrokelibrary.org` | host serves ME — removed 2026-08-11 |
| Stewart County Public Library | Dover | TN | `doverlibrary.org` | host serves OH — removed 2026-08-11 |
| Rabun Co. Public Library | Clayton | GA | `claytonlibrary.org` | host serves CA — removed 2026-08-11 |
| Hocutt Ellington Memorial Library | Clayton | NC | `claytonlibrary.org` | host serves CA — removed 2026-08-11 |
| Prospect Public Library | Prospect | CT | `prospectlibrary.org` | host serves PA — removed 2026-08-11 |
| Stamford Public Library | Stamford | CT | `stamfordlibrary.org` | host serves VT — removed 2026-08-11 |
| Maysville Public Library | Maysville | GA | `maysvillelibrary.org` | host serves MO — removed 2026-08-11 |
| Maysville Public Library | Maysville | NC | `maysvillelibrary.org` | host serves MO — removed 2026-08-11 |
| Monroe County Public Library | Monroeville | AL | `monroevillelibrary.org` | host serves PA — removed 2026-08-11 |
| Tyrone Public Library | Tyrone | GA | `tyronelibrary.org` | host serves PA — removed 2026-08-11 |
| Roddenbery Memorial Library System | Cairo | GA | `cairolibrary.org` | host serves NY — removed 2026-08-11 |
| Hall Memorial Library | Ellington | CT | `ellingtonlibrary.org` | host serves NY — removed 2026-08-11 |
| Webster County Library | Preston | GA | `prestonpubliclibrary.org` | host serves CT — removed 2026-08-11 |
| Hampstead Branch Library | Hampstead | NC | `hampsteadlibrary.org` | host serves NH — removed 2026-08-11 |
| Henderson County Public Library | Hendersonville | NC | `youseemore.com` | host serves TN — removed 2026-08-11 |
| Florence Gallier Library | Magnolia | NC | `magnolialibrary.org` | host serves MA — removed 2026-08-11 |
| Levi E.Coe Library | Middlefield | CT | `middlefieldlibrary.org` | host serves MA — removed 2026-08-11 |
| Palmer Public Library | Palmer | TN | `palmerlibrary.org` | host serves MA — removed 2026-08-11 |
| Cordova Branch Library | Cordova | TN | `cordovalibrary.org` | host serves AK — removed 2026-08-11 |
| Cordova Public Library | Cordova | AL | `cordovalibrary.org` | host serves AK — removed 2026-08-11 |
| Wells Village | Wells | VT | `wellslibrary.org` | host serves ME — removed 2026-08-11 |
| Liberty Public Library |  | NY | `` | host serves TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX) — removed 2026-08-11 |
| Liberty Public Library |  | NC | `` | host serves TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX) — removed 2026-08-11 |
| Liberty Public Library |  | MS | `` | host serves TX (not a library — Liberty Library Project, a political nonprofit in Conroe TX) — removed 2026-08-11 |
| Macon County Public Library |  | TN | `` | host serves dead — 301s off-host to running-care.com, a French running blog — removed 2026-08-11 |


## Removed 2026-08-11 — URL lookup found no verifiable site

Each was searched for during the collision cleanup and no official site could be verified.
Recorded so they can be restored if one is found later.

| Library | City | State | Old URL | Why |
|---|---|---|---|---|
| Dr. Robert T. Hollingsworth Library | Shelby | MS | | no verifiable official site — Bolivar County Library System branches page lists Dr. Robert T. Hollingsworth Public Library as Closed Until Further Not |
| Clayton Town And County Public Library | Clayton | AL | | no verifiable official site — Real name Town and County Library, 45 N Midway St Clayton AL 36016, 334-775-3506, Barbour County - only a Facebook page  |
| Woodville Public Library | Woodville | AL | | no verifiable official site — 26 Venson Street Woodville AL 35776, phone 256-776-2796, Jackson County - library has only a Facebook page, no official  |
| Mayhew Library Assn | Addison | ME | | no verifiable official site — Mayhew Library 290 Water St Addison ME 04606, 207-598-8350 per town site addisonmaine.org, but library has no website of |
| Haynes Library | Alexandria | NH | | no verifiable official site — Haynes Library 33-567 Washburn Rd Alexandria NH 03222, 603-744-6529, but closed since 2019 with all trustees resigned pe |
| Central Village Public Library | Plainfield | CT | | no verifiable official site — Town of Plainfield CT library page lists only Aldrich Free Public Library, 299 Main St Moosup. Central Village branch at |
| Louisville Public Library | Louisville | AL | | no verifiable official site — Library exists at 1951 Main St, Louisville AL 36048, phone 334-266-5210 per library directories, but no official website |
| Hyde Park Public Library | Hyde Park | PA | | no verifiable official site — Exists at 700 Main St Hyde Park PA 15641, ph 724-845-1944, but contact is a comcast.net email; no site in POWER Library  |


## Removed 2026-08-11 — URL lookup found no verifiable site

Each was searched for during the collision cleanup and no official site could be verified.
Recorded so they can be restored if one is found later.

| Library | City | State | Old URL | Why |
|---|---|---|---|---|
| Green County Public Library | Greensburg | KY | | no verifiable official site — 112 West Court St Greensburg KY, phone 270-932-7081, but no standalone official site could be verified - only a Facebook |
