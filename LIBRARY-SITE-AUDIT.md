# Library Site Audit

Standing inventory of every individual library website FunHive scrapes, with the event count found on its most recent scrape. Scrapers run on a 3-day Group 1/2/3 rotation, so a full inventory takes 3 consecutive days to assemble.

## 2026-08-04

**Day 1 of a 3-day cycle in progress.** Two runner processes wrote to the logs today: the tail of a Group 3 run (started 2026-08-03 8:05 PM EST, finished 2026-08-04 12:48 AM EST) and a Group 1 run (started 2026-08-04 3:00 AM EST), plus a handful of scrapers (LibCal-NH, Communico-NC, LibraryMarket-CT, LibraryMarket-SC) that executed for real after an unrelated Group 2 dry-run invocation printed noise into the same log around 13:38 UTC without actually running anything.

**Known data gap:** `scrapers/logs/scraper-stdout.log` has a complete gap for the entire Group 3 run window (2026-08-04T00:05Z–04:49Z) — the runner’s own `scraper-run-2026-08-04.log` and `scraper-summary.log` both have correct aggregate FOUND numbers for every Group 3 scraper, but the raw per-library stdout that would normally let us pair each library with its own count was never written to `scraper-stdout.log` for this run. (A separate, wholly-failed browser-launch run from 2026-08-03 07:00 UTC — already logged in `SCRAPER-FIX-LOG.jsonl` / commit `1cfecc9` — happens to list the same scrapers in the same order and was initially mistaken for this run; its Found/New/Duplicate counts do not match today’s real numbers and it was discarded.) All Group 3 rows below are therefore aggregate-only, flagged individually.

| Library Website | State | Scraper | Events Found |
|---|---|---|---|
| Delaware Libraries | DE | LibCal-DE | 20 |
| Durham County Library | NC | LibCal-NC | 20 |
| New Hanover County Public Library | NC | LibCal-NC | 20 |
| Gaston County Public Library | NC | LibCal-NC | 20 |
| Union County Public Library | NC | LibCal-NC | 25 |
| Alamance County Library | NC | LibCal-NC | 48 |
| Brunswick County Public Library | NC | LibCal-NC | 10 |
| Iredell County Public Library | NC | LibCal-NC | 48 |
| Henderson County Public Library | NC | LibCal-NC | 5 |
| Craven-Pamlico Regional Library | NC | LibCal-NC | 0 |
| Freeport Memorial Library | NY | LibCal-NY2 | 20 |
| Rockville Centre Public Library | NY | LibCal-NY2 | 20 |
| Oceanside Public Library | NY | LibCal-NY2 | 20 |
| North Merrick Public Library | NY | LibCal-NY2 | 20 |
| Wantagh Public Library | NY | LibCal-NY2 | 20 |
| East Meadow Public Library | NY | LibCal-NY2 | 20 |
| Baldwin Public Library | NY | LibCal-NY2 | 0 |
| North Bellmore Public Library | NY | LibCal-NY2 | 20 |
| Levittown Public Library | NY | LibCal-NY2 | 163 |
| Plainview-Old Bethpage Public Library | NY | LibCal-NY2 | 155 |
| Warwick Public Library | RI | LibCal-RI | 20 |
| Cranston Public Library | RI | LibCal-RI | 20 |
| East Providence Public Library | RI | LibCal-RI | 20 |
| West Warwick Public Library | RI | LibCal-RI | 20 |
| Pawtucket Public Library | RI | LibCal-RI | 10 |
| Newport Public Library | RI | LibCal-RI | 20 |
| North Kingstown Free Library | RI | LibCal-RI | 0 |
| Cumberland Public Library | RI | LibCal-RI | 25 |
| Barrington Public Library | RI | LibCal-RI | 20 |
| Kenton County Public Library | KY | LibCal-KY | 0 |
| Boone County Public Library | KY | LibCal-KY | 0 |
| Warren County Public Library | KY | LibCal-KY | 0 |
| Clay County Public Library | KY | LibCal-KY | 20 |
| Manchester City Library | NH | LibCal-NH | 48 |
| Nashua Public Library | NH | LibCal-NH | 48 |
| Concord Public Library | NH | LibCal-NH | 42 |
| Keene Public Library | NH | LibCal-NH | 48 |
| Lebanon Public Libraries | NH | LibCal-NH | 48 |
| Merrimack Public Library | NH | LibCal-NH | 48 |
| Hooksett Public Library | NH | LibCal-NH | 48 |
| Hollis Social Library | NH | LibCal-NH | 48 |
| Pelham Public Library | NH | LibCal-NH | 48 |
| DC Public Library | DC | Communico-DC | 37 |
| Worcester Public Library | MA | Communico-MA | 13 |
| Loudoun County Public Library | VA | Communico-VA | 43 |
| Prince William Public Library | VA | Communico-VA | 16 |
| Forsyth County Public Library | NC | Communico-NC | 6 |
| Wake County Public Libraries | NC | Communico-NC | 0 *(puppeteer fallback found 0 after AJAX-render retries)* |
| Burlington County Library System | NJ | BiblioCommons-NJ | 481 *(API returned 481 (10 pages); scraper summary reported 423 after de-dup/filtering)* |
| Central Rappahannock Regional Library | VA | BiblioCommons-VA | 499 *(API returned 499 (10 pages); scraper summary reported 354 after de-dup/filtering)* |
| Ferguson Library | CT | LibraryMarket-CT | 24 |
| New Britain Public Library | CT | LibraryMarket-CT | 0 |
| West Hartford Public Library | CT | LibraryMarket-CT | 34 |
| Meriden Public Library | CT | LibraryMarket-CT | 4 |
| Fairfield Public Library | CT | LibraryMarket-CT | 113 |
| Sumter County Library | SC | LibraryMarket-SC | 9 |
| Beaufort County Library | SC | LibraryMarket-SC | 34 |
| Alexandria Library | VA | WordPress-VA | 0 |
| Chesapeake Public Library | VA | WordPress-VA | 0 |
| Henrico County Public Library | VA | WordPress-VA | 0 |
| Jefferson-Madison Regional Library | VA | WordPress-VA | 0 |
| Manassas Park City Library | VA | WordPress-VA | 8 |
| Culpeper County Library | VA | WordPress-VA | 22 |
| Wilcox County Public Library (Abbeville, GA) | GA | WordPress-GA | 7 |
| Wheeler County Library (Alamo, GA) | GA | WordPress-GA | 0 |
| Alma-Bacon County Public Library (Alma, GA) | GA | WordPress-GA | 9 |
| Athens Regional Library System (Athens, GA) | GA | WordPress-GA | 37 |
| Auburn Library (Auburn, GA) | GA | WordPress-GA | 0 |
| Appleby Branch (Augusta, GA) | GA | WordPress-GA | 1 |
| Decatur County - Gilbert H. Gragg Library (Bainbridge, GA) | GA | WordPress-GA | 0 |
| Berlin Community Library (Berlin, GA) | GA | WordPress-GA | 11 |
| Boston Carnegie Library (Boston, GA) | GA | WordPress-GA | 0 |
| Bowman Branch (Bowman, GA) | GA | WordPress-GA | 18 |
| Warren P. Sewell Memorial Library-Bremen (Bremen, GA) | GA | WordPress-GA | 0 |
| Brunswick Glynn County Regional Library (Brunswick, GA) | GA | WordPress-GA | 1 |
| Marion County Library (Buena Vista, GA) | GA | WordPress-GA | 108 |
| Butler Public Library (Butler, GA) | GA | WordPress-GA | 0 |
| Byron Public Library (Byron, GA) | GA | WordPress-GA | 85 |
| Roddenbery Memorial Library System (Cairo, GA) | GA | WordPress-GA | 0 |
| Hickory Flat Public Library (Canton, GA) | GA | WordPress-GA | 1 |
| Cedartown Library (Cedartown, GA) | GA | WordPress-GA | 7 |
| Centerville Branch Library (Centerville, GA) | GA | WordPress-GA | 150 |
| Clarkesville-Habersham Co. Lib. (Clarkesville, GA) | GA | WordPress-GA | 0 |
| Clarkston Branch (Clarkston, GA) | GA | WordPress-GA | 0 |
| Rabun Co. Public Library (Clayton, GA) | GA | WordPress-GA | 0 |
| Clermont Library (Clermont, GA) | GA | WordPress-GA | 0 |
| White County Public Library-Cleveland Branch (Cleveland, GA) | GA | WordPress-GA | 1 |
| Chattahoochee Valley Regional Library System (Columbus, GA) | GA | WordPress-GA | 26 |
| Commerce Public Library (Commerce, GA) | GA | WordPress-GA | 0 |
| Coolidge Public Library (Coolidge, GA) | GA | WordPress-GA | 0 |
| Cornelia-Habersham Co. Lib. (Cornelia, GA) | GA | WordPress-GA | 1 |
| New Georgia Public Library (Dallas, GA) | GA | WordPress-GA | 912 |
| Dalton-Whitfield County Public Library (Dalton, GA) | GA | WordPress-GA | 23 |
| Ida Hilton Public Library (Darien, GA) | GA | WordPress-GA | 25 |
| Covington Branch (Decatur, GA) | GA | WordPress-GA | 107 |
| Douglas-Coffee County Public Library (Douglas, GA) | GA | WordPress-GA | 1 |
| Laurens County Library (Dublin, GA) | GA | WordPress-GA | 0 |
| Duluth (Duluth, GA) | GA | WordPress-GA | 0 |
| Gibbs Memorial Library (Evans, GA) | GA | WordPress-GA | 0 |
| Fayette County Public Library (Fayetteville, GA) | GA | WordPress-GA | 0 |
| Monroe County Library (Forsyth, GA) | GA | WordPress-GA | 0 |
| Heard County Public Library (Franklin, GA) | GA | WordPress-GA | 0 |
| Gordon Public Library (Gordon, GA) | GA | WordPress-GA | 0 |
| Grantville Public Library (Grantville, GA) | GA | WordPress-GA | 4 |
| Greene County Library (Greensboro, GA) | GA | WordPress-GA | 0 |
| Greenville Area Public Library (Greenville, GA) | GA | WordPress-GA | 13 |
| Harris County Public Library (Hamilton, GA) | GA | WordPress-GA | 0 |
| Banks County Public Library (Homer, GA) | GA | WordPress-GA | 135 |
| Wayne County Library (Jesup, GA) | GA | WordPress-GA | 17 |
| Cherokee Regional Library System (Lafayette, GA) | GA | WordPress-GA | 1 |
| Lagrange Memorial Library (Lagrange, GA) | GA | WordPress-GA | 4 |
| Miller Lakeland Library (Lakeland, GA) | GA | WordPress-GA | 5 |
| Oglethorpe County Library (Lexington, GA) | GA | WordPress-GA | 0 |
| Jefferson County Library System (Louisville, GA) | GA | WordPress-GA | 15 |
| Nelle Brown Memorial Public Library (Lyons, GA) | GA | WordPress-GA | 0 |
| Middle Georgia Regional Library System (Macon, GA) | GA | WordPress-GA | 0 |
| Morgan County Library (Madison, GA) | GA | WordPress-GA | 14 |
| Manchester Public Library (Manchester, GA) | GA | WordPress-GA | 0 |
| Maysville Public Library (Maysville, GA) | GA | WordPress-GA | 0 |
| Meigs Public Library (Meigs, GA) | GA | WordPress-GA | 4 |
| Lake Sinclair Library (Milledgeville, GA) | GA | WordPress-GA | 0 |
| Monroe-Walton County Library (Monroe, GA) | GA | WordPress-GA | 0 |
| Baker County (Newton, GA) | GA | WordPress-GA | 0 |
| Pelham-Carnegie Library (Pelham, GA) | GA | WordPress-GA | 80 |
| Pembroke Public Library (Pembroke, GA) | GA | WordPress-GA | 0 |
| Houston County Public Libraries System (Perry, GA) | GA | WordPress-GA | 0 |
| Webster County Library (Preston, GA) | GA | WordPress-GA | 0 |
| Brooks County Public Library System (Quitman, GA) | GA | WordPress-GA | 0 |
| Parks Memorial Library (Richland, GA) | GA | WordPress-GA | 52 |
| Riverdale Branch Library (Riverdale, GA) | GA | WordPress-GA | 1 |
| Rockmart Library (Rockmart, GA) | GA | WordPress-GA | 0 |
| Rossville Public Library (Rossville, GA) | GA | WordPress-GA | 0 |
| Scottdale-Tobie Grant Branch (Scottdale, GA) | GA | WordPress-GA | 0 |
| Senoia Area Public Library (Senoia, GA) | GA | WordPress-GA | 4 |
| Lewis A. Ray Library (Smyrna, GA) | GA | WordPress-GA | 0 |
| Hancock County Library (Sparta, GA) | GA | WordPress-GA | 37 |
| Effingham (Springfield, GA) | GA | WordPress-GA | 1 |
| Cochran Public Library (Stockbridge, GA) | GA | WordPress-GA | 13 |
| Chattooga County Library System (Summerville, GA) | GA | WordPress-GA | 0 |
| Hightower Memorial Library (Thomaston, GA) | GA | WordPress-GA | 0 |
| Thomson-Mcduffie County Library (Thomson, GA) | GA | WordPress-GA | 0 |
| Tyrone Public Library (Tyrone, GA) | GA | WordPress-GA | 0 |
| Elizabeth Harris Library (Unadilla, GA) | GA | WordPress-GA | 1 |
| Warren County Public Library (Warrenton, GA) | GA | WordPress-GA | 0 |
| Warwick City Library (Warwick, GA) | GA | WordPress-GA | 7 |
| Harlie Fulford Memorial Library (Wrightsville, GA) | GA | WordPress-GA | 0 |
| Hazel W. Guilford Memorial Library (Aurora, NC) | NC | WordPress-NC | 0 |
| Bath Community Library (Bath, NC) | NC | WordPress-NC | 1 |
| Belmont Branch Library (Belmont, NC) | NC | WordPress-NC | 5 |
| Mary Duncan Public Library (Benson, NC) | NC | WordPress-NC | 0 |
| Margaret Little Blount Library (Bethel, NC) | NC | WordPress-NC | 0 |
| Black Creek Branch Library (Black Creek, NC) | NC | WordPress-NC | 3 |
| Watauga County Public Library (Boone, NC) | NC | WordPress-NC | 0 |
| Boonville Community Public Library (Boonville, NC) | NC | WordPress-NC | 0 |
| Bunn Branch Library (Bunn, NC) | NC | WordPress-NC | 0 |
| Alamance County Public Library (Burlington, NC) | NC | WordPress-NC | 40 |
| Canton Branch Library (Canton, NC) | NC | WordPress-NC | 0 |
| Moore County Library (Carthage, NC) | NC | WordPress-NC | 0 |
| Cary Branch Library (Cary, NC) | NC | WordPress-NC | 4 |
| Beatties Ford Road Branch Library (Charlotte, NC) | NC | WordPress-NC | 1 |
| Claremont Branch Library (Claremont, NC) | NC | WordPress-NC | 0 |
| Hocutt Ellington Memorial Library (Clayton, NC) | NC | WordPress-NC | 0 |
| J.C. Holliday Library (Clinton, NC) | NC | WordPress-NC | 0 |
| Tyrrell County Library (Columbia, NC) | NC | WordPress-NC | 0 |
| Polk County Public Library (Columbus, NC) | NC | WordPress-NC | 2 |
| Cabarrus County Public Library (Concord, NC) | NC | WordPress-NC | 1 |
| Dallas Branch Library (Dallas, NC) | NC | WordPress-NC | 912 |
| Danbury Public Library (Danbury, NC) | NC | WordPress-NC | 0 |
| Florence S. Shanklin Branch Library (Denver, NC) | NC | WordPress-NC | 37 |
| Dobson Community Library (Dobson, NC) | NC | WordPress-NC | 0 |
| Bragtown Branch Library (Durham, NC) | NC | WordPress-NC | 31 |
| Erwin Public Library (Erwin, NC) | NC | WordPress-NC | 0 |
| Fairview Branch Library (Fairview, NC) | NC | WordPress-NC | 0 |
| Farmville Public Library (Farmville, NC) | NC | WordPress-NC | 0 |
| Bordeaux Branch Library (Fayetteville, NC) | NC | WordPress-NC | 0 |
| Macon County Public Library (Franklin, NC) | NC | WordPress-NC | 0 |
| John W. Clark Public Library (Franklinville, NC) | NC | WordPress-NC | 17 |
| Wayne County Public Library, Fremont (Fremont, NC) | NC | WordPress-NC | 6 |
| Graham Public Library (Graham, NC) | NC | WordPress-NC | 0 |
| Blanche Benjamin Branch Library (Greensboro, NC) | NC | WordPress-NC | 0 |
| Carver Branch Library (Greenville, NC) | NC | WordPress-NC | 13 |
| Halifax County Library System (Halifax, NC) | NC | WordPress-NC | 150 |
| Hampstead Branch Library (Hampstead, NC) | NC | WordPress-NC | 0 |
| Harmony Branch Library (Harmony, NC) | NC | WordPress-NC | 0 |
| Harrisburg Library (Harrisburg, NC) | NC | WordPress-NC | 17 |
| Havelock-Craven County Public (Havelock, NC) | NC | WordPress-NC | 0 |
| Henderson County Public Library (Hendersonville, NC) | NC | WordPress-NC | 0 |
| Hickory Public Library (Hickory, NC) | NC | WordPress-NC | 0 |
| Hudson Branch Library (Hudson, NC) | NC | WordPress-NC | 1 |
| Union West Branch Library (Indian Trail, NC) | NC | WordPress-NC | 0 |
| King Public Library (King, NC) | NC | WordPress-NC | 0 |
| La Grange Branch Library (La Grange, NC) | NC | WordPress-NC | 4 |
| Leicester Branch Library (Leicester, NC) | NC | WordPress-NC | 0 |
| Leland Branch Library (Leland, NC) | NC | WordPress-NC | 0 |
| Davidson County Public Library System (Lexington, NC) | NC | WordPress-NC | 0 |
| Liberty Public Library (Liberty, NC) | NC | WordPress-NC | 0 |
| Littleton Public Library (Wc Jones Memorial) (Littleton, NC) | NC | WordPress-NC | 0 |
| Franklin County Library (Louisburg, NC) | NC | WordPress-NC | 5 |
| Lowell Branch Library (Lowell, NC) | NC | WordPress-NC | 0 |
| Madison Branch Library (Madison, NC) | NC | WordPress-NC | 14 |
| Florence Gallier Library (Magnolia, NC) | NC | WordPress-NC | 0 |
| Mcdowell County Law Library (Marion, NC) | NC | WordPress-NC | 3 |
| Madison County Public Library (Marshall, NC) | NC | WordPress-NC | 0 |
| Matthews Branch Library (Matthews, NC) | NC | WordPress-NC | 0 |
| Maysville Public Library (Maysville, NC) | NC | WordPress-NC | 0 |
| Union County Public Library (Monroe, NC) | NC | WordPress-NC | 0 |
| Mooresville Public Library (Mooresville, NC) | NC | WordPress-NC | 1 |
| Craven-Pamlico-Carteret Regional Library (New Bern, NC) | NC | WordPress-NC | 16 |
| Newport Public Library (Newport, NC) | NC | WordPress-NC | 0 |
| Catawba County Library (Newton, NC) | NC | WordPress-NC | 0 |
| Norwood Branch Library (Norwood, NC) | NC | WordPress-NC | 1 |
| Berea Branch Library (Oxford, NC) | NC | WordPress-NC | 0 |
| Pembroke Public Library (Pembroke, NC) | NC | WordPress-NC | 0 |
| Pinebluff Public Library (Pinebluff, NC) | NC | WordPress-NC | 3 |
| Pettigrew Regional Library (Plymouth, NC) | NC | WordPress-NC | 0 |
| Princeton Public Library (Princeton, NC) | NC | WordPress-NC | 0 |
| Roanoke Rapids Public Library (Roanoke Rapids, NC) | NC | WordPress-NC | 5 |
| Robbins Area Branch (Robbins, NC) | NC | WordPress-NC | 150 |
| Leath Memorial Library (Rockingham, NC) | NC | WordPress-NC | 6 |
| Rowan Public Library (Salisbury, NC) | NC | WordPress-NC | 0 |
| Saluda Branch Library (Saluda, NC) | NC | WordPress-NC | 117 |
| Selma Public Library (Selma, NC) | NC | WordPress-NC | 1 |
| Cleveland County Memorial Library (Shelby, NC) | NC | WordPress-NC | 17 |
| Public Library Of Johnston County Smithfield (Smithfield, NC) | NC | WordPress-NC | 0 |
| Brunswick County Library (Southport, NC) | NC | WordPress-NC | 0 |
| Alleghany County Public Library (Sparta, NC) | NC | WordPress-NC | 37 |
| Spring Lake Branch (Spring Lake, NC) | NC | WordPress-NC | 4 |
| Stanley Branch Library (Stanley, NC) | NC | WordPress-NC | 1 |
| Star Branch (Star, NC) | NC | WordPress-NC | 0 |
| Montgomery County Library (Troy, NC) | NC | WordPress-NC | 0 |
| Warren County Memorial Library (Warrenton, NC) | NC | WordPress-NC | 0 |
| Warsaw-Kornegay Public Library (Warsaw, NC) | NC | WordPress-NC | 10 |
| Myrtle Grove Branch (Wilmington, NC) | NC | WordPress-NC | 3 |
| East Branch Library (Wilson, NC) | NC | WordPress-NC | 0 |
| Lawrence Memorial Library (Windsor, NC) | NC | WordPress-NC | 0 |
| Hartford Public Library (Hartford, CT) | CT | WordPress-CT | 0 |
| New Haven Free Public Library (New Haven, CT) | CT | WordPress-CT | 1 |
| Bridgeport Public Library (Bridgeport, CT) | CT | WordPress-CT | 14 |
| Stamford Public Library (Stamford, CT) | CT | WordPress-CT | 0 |
| Waterbury Public Library (Waterbury, CT) | CT | WordPress-CT | 0 |
| Norwalk Public Library (Norwalk, CT) | CT | WordPress-CT | 0 |
| Danbury Public Library (Danbury, CT) | CT | WordPress-CT | 0 |
| New Britain Public Library (New Britain, CT) | CT | WordPress-CT | 57 |
| West Hartford Public Library (West Hartford, CT) | CT | WordPress-CT | 91 |
| Greenwich Library (Greenwich, CT) | CT | WordPress-CT | 0 |
| Fairfield Public Library (Fairfield, CT) | CT | WordPress-CT | 77 |
| Bristol Public Library (Bristol, CT) | CT | WordPress-CT | 190 |
| Manchester Public Library (Manchester, CT) | CT | WordPress-CT | 9 |
| Milford Public Library (Milford, CT) | CT | WordPress-CT | 0 |
| Stratford Library (Stratford, CT) | CT | WordPress-CT | 1 |
| East Hartford Public Library (East Hartford, CT) | CT | WordPress-CT | 0 |
| Middletown Public Library (Middletown, CT) | CT | WordPress-CT | 1 |
| Wallingford Public Library (Wallingford, CT) | CT | WordPress-CT | 31 |
| Enfield Public Library (Enfield, CT) | CT | WordPress-CT | 4 |
| Southington Public Library (Southington, CT) | CT | WordPress-CT | 0 |
| Shelton Public Library (Shelton, CT) | CT | WordPress-CT | 36 |
| Torrington Library (Torrington, CT) | CT | WordPress-CT | 0 |
| Trumbull Library (Trumbull, CT) | CT | WordPress-CT | 0 |
| Vernon Public Library (Vernon, CT) | CT | WordPress-CT | 0 |
| Andover Public Library (Andover, CT) | CT | WordPress-CT | 0 |
| Ansonia Public Library (Ansonia, CT) | CT | WordPress-CT | 0 |
| Avon Free Public Library (Avon, CT) | CT | WordPress-CT | 0 |
| Beacon Falls Public Library (Beacon Falls, CT) | CT | WordPress-CT | 0 |
| Berlin Free Library Association (Berlin, CT) | CT | WordPress-CT | 10 |
| Clark Memorial Library (Bethany, CT) | CT | WordPress-CT | 10 |
| Bethel Public Library (Bethel, CT) | CT | WordPress-CT | 0 |
| Bethlehem Public Library (Bethlehem, CT) | CT | WordPress-CT | 0 |
| Brookfield Library (Brookfield, CT) | CT | WordPress-CT | 86 |
| Burlington Public Library (Burlington, CT) | CT | WordPress-CT | 45 |
| Canterbury Public Library (Canterbury, CT) | CT | WordPress-CT | 0 |
| Canton Public Library (Canton, CT) | CT | WordPress-CT | 0 |
| Cheshire Public Library (Cheshire, CT) | CT | WordPress-CT | 2 |
| Chester Public Library (Chester, CT) | CT | WordPress-CT | 0 |
| Henry Carter Hull Library (Clinton, CT) | CT | WordPress-CT | 0 |
| Saxton B. Little Free Library (Columbia, CT) | CT | WordPress-CT | 1 |
| Cornwall Library Association (Cornwall, CT) | CT | WordPress-CT | 4 |
| Booth Dimock Memorial Library (Coventry, CT) | CT | WordPress-CT | 2 |
| Darien Library (Darien, CT) | CT | WordPress-CT | 24 |
| Durham Public Library (Durham, CT) | CT | WordPress-CT | 39 |
| East Hampton Public Library (East Hampton, CT) | CT | WordPress-CT | 26 |
| Easton Public Library (Easton, CT) | CT | WordPress-CT | 0 |
| Hall Memorial Library (Ellington, CT) | CT | WordPress-CT | 0 |
| Essex Library Association (Essex, CT) | CT | WordPress-CT | 0 |
| Farmington Library (Farmington, CT) | CT | WordPress-CT | 9 |
| Janet Carlson Calvert Library (Franklin, CT) | CT | WordPress-CT | 3 |
| Goshen Public Library (Goshen, CT) | CT | WordPress-CT | 0 |
| Frederick H. Cossitt Library (Granby, CT) | CT | WordPress-CT | 1 |
| Community Branch Library (Hamden, CT) | CT | WordPress-CT | 1 |
| Hartland Public Library (Hartland, CT) | CT | WordPress-CT | 0 |
| Harwinton Public Library (Harwinton, CT) | CT | WordPress-CT | 109 |
| Douglas Library Of Hebron (Hebron, CT) | CT | WordPress-CT | 0 |
| Ivoryton Library Association (Ivoryton, CT) | CT | WordPress-CT | 0 |
| Kent Library Association (Kent, CT) | CT | WordPress-CT | 59 |
| Killingworth Library (Killingworth, CT) | CT | WordPress-CT | 0 |
| Jonathan Trumbull Library (Lebanon, CT) | CT | WordPress-CT | 0 |
| Bill Library (Ledyard, CT) | CT | WordPress-CT | 1 |
| E.C. Scranton Memorial Library (Madison, CT) | CT | WordPress-CT | 9 |
| Mansfield Public Library (Mansfield, CT) | CT | WordPress-CT | 0 |
| Middlebury Public Library (Middlebury, CT) | CT | WordPress-CT | 22 |
| Levi E.Coe Library (Middlefield, CT) | CT | WordPress-CT | 0 |
| Edith Wheeler Memorial Library (Monroe, CT) | CT | WordPress-CT | 0 |
| Mystic Noank Library (Mystic, CT) | CT | WordPress-CT | 0 |
| New Canaan Library (New Canaan, CT) | CT | WordPress-CT | 74 |
| New Fairfield Free Public Library (New Fairfield, CT) | CT | WordPress-CT | 6 |
| Public Library Of New London (New London, CT) | CT | WordPress-CT | 11 |
| New Milford Public Library (New Milford, CT) | CT | WordPress-CT | 1 |
| Cyrenius H. Booth Library (Newtown, CT) | CT | WordPress-CT | 0 |
| Norfolk Library (Norfolk, CT) | CT | WordPress-CT | 13 |
| North Haven Memorial Library (North Haven, CT) | CT | WordPress-CT | 0 |
| Otis Library (Norwich, CT) | CT | WordPress-CT | 1 |
| Old Lyme - Phoebe Griffin Noyes Library (Old Lyme, CT) | CT | WordPress-CT | 0 |
| Oxford Public Library (Oxford, CT) | CT | WordPress-CT | 0 |
| Central Village Public Library (Plainfield, CT) | CT | WordPress-CT | 7 |
| Plainville Public Library (Plainville, CT) | CT | WordPress-CT | 0 |
| Plymouth Library Association (Plymouth, CT) | CT | WordPress-CT | 0 |
| Pomfret Public Library (Pomfret, CT) | CT | WordPress-CT | 0 |
| Portland Public Library (Portland, CT) | CT | WordPress-CT | 0 |
| Preston Public Library (Preston, CT) | CT | WordPress-CT | 1 |
| Prospect Public Library (Prospect, CT) | CT | WordPress-CT | 0 |
| Ridgefield Library (Ridgefield, CT) | CT | WordPress-CT | 10 |
| Minor Memorial Library (Roxbury, CT) | CT | WordPress-CT | 44 |
| Salem Free Public Library (Salem, CT) | CT | WordPress-CT | 0 |
| Scoville Memorial Library (Salisbury, CT) | CT | WordPress-CT | 0 |
| Seymour Public Library (Seymour, CT) | CT | WordPress-CT | 128 |
| Sherman Library Assn. (Sherman, CT) | CT | WordPress-CT | 1 |
| Somers Public Library (Somers, CT) | CT | WordPress-CT | 14 |
| South Windsor Public Library (South Windsor, CT) | CT | WordPress-CT | 68 |
| Southbury Public Library (Southbury, CT) | CT | WordPress-CT | 61 |
| Pequot Library Association (Southport, CT) | CT | WordPress-CT | 0 |
| Stafford Library Association (Stafford, CT) | CT | WordPress-CT | 1 |
| Stonington Free Library (Stonington, CT) | CT | WordPress-CT | 0 |
| Kent Memorial Library (Suffield, CT) | CT | WordPress-CT | 0 |
| Thomaston Public Library (Thomaston, CT) | CT | WordPress-CT | 0 |
| Union Free Public Library (Union, CT) | CT | WordPress-CT | 111 |
| Warren Public Library (Warren, CT) | CT | WordPress-CT | 1 |
| Waterford Public Library (Waterford, CT) | CT | WordPress-CT | 0 |
| Oakville Branch Library (Watertown, CT) | CT | WordPress-CT | 0 |
| Louis Piantino Branch Library (West Haven, CT) | CT | WordPress-CT | 0 |
| Westbrook Public Library (Westbrook, CT) | CT | WordPress-CT | 91 |
| Weston Public Library (Weston, CT) | CT | WordPress-CT | 0 |
| Westport Library (Westport, CT) | CT | WordPress-CT | 44 |
| Wethersfield Public Library (Wethersfield, CT) | CT | WordPress-CT | 0 |
| Willimantic Public Library (Willimantic, CT) | CT | WordPress-CT | 25 |
| Wilton Library Association (Wilton, CT) | CT | WordPress-CT | 1 |
| Beardsley Memorial Library (Winchester, CT) | CT | WordPress-CT | 1 |
| Windham Free Library (Windham, CT) | CT | WordPress-CT | 2 |
| Wilson Branch Library (Windsor, CT) | CT | WordPress-CT | 0 |
| Windsor Locks Public Library (Windsor Locks, CT) | CT | WordPress-CT | 0 |
| Wolcott Public Library (Wolcott, CT) | CT | WordPress-CT | 1 |
| Woodbridge Town Library (Woodbridge, CT) | CT | WordPress-CT | 0 |
| Woodbury Public Library (Woodbury, CT) | CT | WordPress-CT | 28 |
| Nashville Public Library | TN | WordPress-TN | 1 |
| Memphis Public Libraries | TN | WordPress-TN | 32 |
| Knox County Public Library | TN | WordPress-TN | 24 |
| Chattanooga Public Library | TN | WordPress-TN | 150 |
| Clarksville-Montgomery County Public Library | TN | WordPress-TN | 0 |
| Johnson City Public Library | TN | WordPress-TN | 17 |
| Kingsport Public Library | TN | WordPress-TN | 0 |
| Williamson County Public Library | TN | WordPress-TN | 0 |
| Rutherford County Library System | TN | WordPress-TN | 0 |
| Blount County Public Library | TN | WordPress-TN | 0 |
| Cleveland-Bradley County Public Library | TN | WordPress-TN | 1 |
| Germantown Community Library | TN | WordPress-TN | 150 |
| Collierville Burch Library | TN | WordPress-TN | 0 |
| Bartlett Library | TN | WordPress-TN | 0 |
| Hendersonville Public Library | TN | WordPress-TN | 0 |
| Morristown-Hamblen Library | TN | WordPress-TN | 0 |
| Smyrna Public Library | TN | WordPress-TN | 0 |
| Sevier County Public Library System | TN | WordPress-TN | 0 |
| Tullahoma Public Library | TN | WordPress-TN | 0 |
| Athens Public Library | TN | WordPress-TN | 37 |
| Lawrenceburg Public Library | TN | WordPress-TN | 0 |
| Crossville-Cumberland County Public Library | TN | WordPress-TN | 0 |
| Manchester Public Library | TN | WordPress-TN | 0 |
| Rogersville Public Library | TN | WordPress-TN | 0 |
| Tipton County Public Library | TN | WordPress-TN | 0 |
| Savannah-Hardin County Library | TN | WordPress-TN | 1 |
| Crockett County Library | TN | WordPress-TN | 0 |
| Alexandria Branch Library | TN | WordPress-TN | 6 |
| Southeast Branch Library | TN | WordPress-TN | 0 |
| Ardmore Public Library | TN | WordPress-TN | 0 |
| Sam T. Wilson Public Library | TN | WordPress-TN | 0 |
| Auburntown Public Library | TN | WordPress-TN | 1 |
| Baxter Branch Library | TN | WordPress-TN | 150 |
| The Brentwood Library | TN | WordPress-TN | 0 |
| Benton County Library | TN | WordPress-TN | 0 |
| Smith County Public Library | TN | WordPress-TN | 0 |
| Hickman County Public Library | TN | WordPress-TN | 150 |
| Clinton Public Library | TN | WordPress-TN | 0 |
| Cordova Branch Library | TN | WordPress-TN | 0 |
| Meigs-Decatur Public Library | TN | WordPress-TN | 96 |
| Stewart County Public Library | TN | WordPress-TN | 0 |
| Sequatchie County Public Library | TN | WordPress-TN | 0 |
| Englewood Public Library | TN | WordPress-TN | 0 |
| Unicoi County Public Library | TN | WordPress-TN | 0 |
| Fairview Public Library | TN | WordPress-TN | 0 |
| Gleason Memorial Library | TN | WordPress-TN | 0 |
| Dr. Nathan Porter Library | TN | WordPress-TN | 3 |
| Harriman Public Library | TN | WordPress-TN | 0 |
| Carroll County Library | TN | WordPress-TN | 0 |
| Fentress County Library | TN | WordPress-TN | 0 |
| Kingston Public Library | TN | WordPress-TN | 10 |
| Macon County Public Library | TN | WordPress-TN | 1 |
| Millard Oakley Public Library | TN | WordPress-TN | 0 |
| Nashville Talking Library | TN | WordPress-TN | 8 |
| Madisonville Public Library | TN | WordPress-TN | 0 |
| Middleton Community Library | TN | WordPress-TN | 0 |
| Mildred G. Fields Memorial Library | TN | WordPress-TN | 1 |
| Monterey Branch Library | TN | WordPress-TN | 0 |
| Mt. Juliet-Harvey Freeman Public Library | TN | WordPress-TN | 0 |
| Newbern City Library | TN | WordPress-TN | 16 |
| Palmer Public Library | TN | WordPress-TN | 0 |
| Parsons Public Library | TN | WordPress-TN | 0 |
| Portland Public Library | TN | WordPress-TN | 9 |
| Lauderdale County Library | TN | WordPress-TN | 1 |
| Seymour Branch Library | TN | WordPress-TN | 128 |
| Somerville-Fayette County Library | TN | WordPress-TN | 0 |
| White County Public Library | TN | WordPress-TN | 37 |
| Audrey Pack Memorial Library | TN | WordPress-TN | 0 |
| Spring Hill Public Library | TN | WordPress-TN | 0 |
| Sweetwater Public Library | TN | WordPress-TN | 1 |
| Mary E. Tippitt Memorial Library | TN | WordPress-TN | 0 |
| Hamilton Parks Public Library | TN | WordPress-TN | 1 |
| Washburn Public Library | TN | WordPress-TN | 10 |
| Watertown-Wilson County Library | TN | WordPress-TN | 0 |
| Humphreys County Public Library | TN | WordPress-TN | 1 |
| Westmoreland Public Library | TN | WordPress-TN | 0 |
| White Pine Public Library | TN | WordPress-TN | 0 |
| Franklin County Public Library | TN | WordPress-TN | 0 |
| Winfield Public Library | TN | WordPress-TN | 0 |
| Adams Memorial Library | TN | WordPress-TN | 28 |
| Franklin Public Library | TN | WordPress-TN | 0 |
| Birmingham Public Library | AL | WordPress-AL | 1 |
| Huntsville-Madison County Public Library | AL | WordPress-AL | 13 |
| Mobile Public Library | AL | WordPress-AL | 30 |
| Montgomery City-County Public Library | AL | WordPress-AL | 28 |
| Tuscaloosa Public Library | AL | WordPress-AL | 150 |
| Auburn Public Library | AL | WordPress-AL | 1 |
| Dothan Houston County Library System | AL | WordPress-AL | 73 |
| Decatur Public Library | AL | WordPress-AL | 107 |
| Florence-Lauderdale Public Library | AL | WordPress-AL | 0 |
| Hoover Public Library | AL | WordPress-AL | 8 |
| Vestavia Hills Library | AL | WordPress-AL | 150 |
| Homewood Public Library | AL | WordPress-AL | 0 |
| Jefferson County Library Cooperative | AL | WordPress-AL | 0 |
| Selma-Dallas County Public Library | AL | WordPress-AL | 1 |
| Athens-Limestone Public Library | AL | WordPress-AL | 37 |
| Fairhope Public Library | AL | WordPress-AL | 150 |
| Daphne Public Library | AL | WordPress-AL | 0 |
| Scottsboro Public Library | AL | WordPress-AL | 0 |
| Troy Public Library | AL | WordPress-AL | 0 |
| Pelham Public Library | AL | WordPress-AL | 80 |
| Trussville Public Library | AL | WordPress-AL | 3 |
| Gardendale Public Library | AL | WordPress-AL | 1 |
| Abbeville Memorial Library | AL | WordPress-AL | 7 |
| Akron Public Library | AL | WordPress-AL | 0 |
| Andalusia Public Library | AL | WordPress-AL | 0 |
| Ashland City Public Library | AL | WordPress-AL | 0 |
| Bridgeport - Lena Cagle Public Library | AL | WordPress-AL | 0 |
| Choctaw County Public Library | AL | WordPress-AL | 0 |
| Wilcox County Library | AL | WordPress-AL | 0 |
| Chelsea Public Library | AL | WordPress-AL | 0 |
| Clayton Town And County Public Library | AL | WordPress-AL | 0 |
| Collinsville Public Library | AL | WordPress-AL | 0 |
| Houston-Love Memorial Library - Columbia | AL | WordPress-AL | 0 |
| Cordova Public Library | AL | WordPress-AL | 0 |
| Daleville Public Library | AL | WordPress-AL | 1 |
| Walter J. Hanna Memorial Library | AL | WordPress-AL | 1 |
| Fayette County Memorial Library | AL | WordPress-AL | 78 |
| Foley Public Library | AL | WordPress-AL | 0 |
| Grant Public Library | AL | WordPress-AL | 0 |
| Hale County Library | AL | WordPress-AL | 0 |
| Butler County Public Library | AL | WordPress-AL | 13 |
| Guntersville Public Library | AL | WordPress-AL | 0 |
| Clyde Nix Public Library | AL | WordPress-AL | 0 |
| Hartford - Mcgregor-Mckinney Public Library | AL | WordPress-AL | 0 |
| Blanche R. Solomon Memorial Library | AL | WordPress-AL | 0 |
| Jane B. Holmes Public Library | AL | WordPress-AL | 0 |
| Hueytown Public Library | AL | WordPress-AL | 0 |
| Irondale Public Library | AL | WordPress-AL | 0 |
| City Of Bayou La Batre Public Library | AL | WordPress-AL | 0 |
| Kennedy Public Library | AL | WordPress-AL | 0 |
| Lafayette Pilot Public Library | AL | WordPress-AL | 1 |
| Jane Culbreth Library | AL | WordPress-AL | 0 |
| Leighton Public Library | AL | WordPress-AL | 21 |
| Burchell Campbell Memorial Library | AL | WordPress-AL | 0 |
| Lincoln Public Library | AL | WordPress-AL | 0 |
| Ruby Pickens Tartt Public Library | AL | WordPress-AL | 1 |
| Louisville Public Library | AL | WordPress-AL | 15 |
| Madison Public Library | AL | WordPress-AL | 14 |
| Marion-Perry County Library | AL | WordPress-AL | 3 |
| Millbrook Public Library | AL | WordPress-AL | 0 |
| Monroe County Public Library | AL | WordPress-AL | 0 |
| Doris Stanley Memorial Library | AL | WordPress-AL | 1 |
| Newton Public Library | AL | WordPress-AL | 0 |
| Opp Public Library | AL | WordPress-AL | 0 |
| Orange Beach Public Library | AL | WordPress-AL | 0 |
| Oxford Public Library | AL | WordPress-AL | 0 |
| Piedmont Public Library | AL | WordPress-AL | 0 |
| Pine Hill Branch Public Library | AL | WordPress-AL | 1 |
| Clay Public Library | AL | WordPress-AL | 0 |
| Satsuma Public Library | AL | WordPress-AL | 0 |
| Evergreen Public Library | AL | WordPress-AL | 0 |
| Sheffield Public Library | AL | WordPress-AL | 0 |
| Somerville Public Library | AL | WordPress-AL | 0 |
| Stevenson Public Library | AL | WordPress-AL | 0 |
| H. Grady Bradshaw - Chambers County Library | AL | WordPress-AL | 1 |
| Vernon - Mary Wallace Cobb Memorial Library | AL | WordPress-AL | 0 |
| Warrior Public Library | AL | WordPress-AL | 0 |
| Wilsonville - Vernice Stoudenmire Library | AL | WordPress-AL | 82 |
| Northwest Regional Library | AL | WordPress-AL | 0 |
| Woodville Public Library | AL | WordPress-AL | 0 |
| Hightower Memorial Library | AL | WordPress-AL | 0 |
| Fletcher Free Library (Burlington, VT) | VT | WordPress-VT | 6 |
| Kellogg-Hubbard Library (Montpelier, VT) | VT | WordPress-VT | 150 |
| Brooks Memorial Library (Brattleboro, VT) | VT | WordPress-VT | 150 |
| St. Johnsbury Athenaeum (St. Johnsbury, VT) | VT | WordPress-VT | 3 |
| Ilsley Public Library (Middlebury, VT) | VT | WordPress-VT | 20 |
| Norman Williams Public Library (Woodstock, VT) | VT | WordPress-VT | 150 |
| Aldrich Public Library (Barre, VT) | VT | WordPress-VT | 0 |
| Brownell Library (Essex Junction, VT) | VT | WordPress-VT | 0 |
| Pierson Library (Shelburne, VT) | VT | WordPress-VT | 45 |
| Rockingham Free Public Library (Bellows Falls, VT) | VT | WordPress-VT | 6 |
| Springfield Town Library (Springfield, VT) | VT | WordPress-VT | 2 |
| Morristown Centennial Library (Morrisville, VT) | VT | WordPress-VT | 0 |
| Haskell Free Library (Derby Line, VT) | VT | WordPress-VT | 0 |
| Cobleigh Public Library (Lyndonville, VT) | VT | WordPress-VT | 0 |
| Hartland Public Library (Hartland, VT) | VT | WordPress-VT | 0 |
| Deborah Rawson Memorial Library (Jericho, VT) | VT | WordPress-VT | 16 |
| Martha Canfield Memorial (Arlington, VT) | VT | WordPress-VT | 0 |
| Barton Public (Barton, VT) | VT | WordPress-VT | 0 |
| Mount Holly (Belmont, VT) | VT | WordPress-VT | 10 |
| Bennington Free (Bennington, VT) | VT | WordPress-VT | 150 |
| Benson Public (Benson, VT) | VT | WordPress-VT | 0 |
| Bethel Public (Bethel, VT) | VT | WordPress-VT | 0 |
| Bradford Public (Bradford, VT) | VT | WordPress-VT | 0 |
| Brandon Free Public (Brandon, VT) | VT | WordPress-VT | 62 |
| Brookfield Free Public (Brookfield, VT) | VT | WordPress-VT | 86 |
| Cabot Public (Cabot, VT) | VT | WordPress-VT | 0 |
| Alice M. Ward Memorial (Canaan, VT) | VT | WordPress-VT | 15 |
| Charlotte (Charlotte, VT) | VT | WordPress-VT | 68 |
| Chelsea Public (Chelsea, VT) | VT | WordPress-VT | 0 |
| Whiting (Chester, VT) | VT | WordPress-VT | 0 |
| Concord Public Library (Concord, VT) | VT | WordPress-VT | 3 |
| Cornwall Free Public (Cornwall, VT) | VT | WordPress-VT | 4 |
| Pope Memorial (Danville, VT) | VT | WordPress-VT | 0 |
| Essex Free (Essex, VT) | VT | WordPress-VT | 0 |
| Fair Haven Free (Fair Haven, VT) | VT | WordPress-VT | 1 |
| Fairfax Community (Fairfax, VT) | VT | WordPress-VT | 0 |
| Bent Northrup Memorial (Fairfield, VT) | VT | WordPress-VT | 1 |
| Haston (Franklin, VT) | VT | WordPress-VT | 3 |
| Gilman Public Library (Gilman, VT) | VT | WordPress-VT | 0 |
| Glover Public (Glover, VT) | VT | WordPress-VT | 0 |
| Grafton Public (Grafton, VT) | VT | WordPress-VT | 0 |
| Greensboro Free (Greensboro, VT) | VT | WordPress-VT | 0 |
| Hancock Free Public (Hancock, VT) | VT | WordPress-VT | 4 |
| Hartford (Hartford, VT) | VT | WordPress-VT | 0 |
| Huntington Public (Huntington, VT) | VT | WordPress-VT | 0 |
| Lanpher Memorial (Hyde Park, VT) | VT | WordPress-VT | 42 |
| Lincoln (Lincoln, VT) | VT | WordPress-VT | 0 |
| Lowell Community (Lowell, VT) | VT | WordPress-VT | 0 |
| Alden Balch Memorial (Lunenburg, VT) | VT | WordPress-VT | 0 |
| Mark Skinner (Manchester, VT) | VT | WordPress-VT | 0 |
| Jaquith Public (Marshfield, VT) | VT | WordPress-VT | 0 |
| Milton Public Library (Milton, VT) | VT | WordPress-VT | 0 |
| Russell Memorial (Monkton, VT) | VT | WordPress-VT | 1 |
| Tenney Memorial (Newbury, VT) | VT | WordPress-VT | 1 |
| Moore Free (Newfane, VT) | VT | WordPress-VT | 0 |
| Goodrich Memorial (Newport, VT) | VT | WordPress-VT | 1 |
| North Hero Public (North Hero, VT) | VT | WordPress-VT | 1 |
| Norwich Public (Norwich, VT) | VT | WordPress-VT | 1 |
| Peacham (Peacham, VT) | VT | WordPress-VT | 1 |
| Roger Clark Memorial (Pittsfield, VT) | VT | WordPress-VT | 3 |
| Cutler Memorial (Plainfield, VT) | VT | WordPress-VT | 7 |
| Proctor Free (Proctor, VT) | VT | WordPress-VT | 0 |
| Putney Public (Putney, VT) | VT | WordPress-VT | 23 |
| Quechee (Quechee, VT) | VT | WordPress-VT | 8 |
| Kimball Public (Randolph, VT) | VT | WordPress-VT | 0 |
| Reading Public (Reading, VT) | VT | WordPress-VT | 1 |
| Readsboro Community (Readsboro, VT) | VT | WordPress-VT | 0 |
| Richmond Free (Richmond, VT) | VT | WordPress-VT | 0 |
| Rochester Public (Rochester, VT) | VT | WordPress-VT | 0 |
| Roxbury Free (Roxbury, VT) | VT | WordPress-VT | 44 |
| Salisbury Free Public (Salisbury, VT) | VT | WordPress-VT | 0 |
| Sheldon Public (Sheldon, VT) | VT | WordPress-VT | 0 |
| Shrewsbury (Shrewsbury, VT) | VT | WordPress-VT | 0 |
| Stamford Community (Stamford, VT) | VT | WordPress-VT | 0 |
| Stowe Free (Stowe, VT) | VT | WordPress-VT | 0 |
| Morrill Mem. Harris (Strafford, VT) | VT | WordPress-VT | 0 |
| Franklin-Grand Isle Bookmobile (Swanton, VT) | VT | WordPress-VT | 34 |
| Latham Memorial (Thetford, VT) | VT | WordPress-VT | 1 |
| Tunbridge Public (Tunbridge, VT) | VT | WordPress-VT | 35 |
| Vernon Free (Vernon, VT) | VT | WordPress-VT | 7 |
| Gilbert Hart (Wallingford, VT) | VT | WordPress-VT | 31 |
| Warren Public (Warren, VT) | VT | WordPress-VT | 1 |
| Waterville Town (Waterville, VT) | VT | WordPress-VT | 21 |
| Wells Village (Wells, VT) | VT | WordPress-VT | 0 |
| West Hartford (West Hartford, VT) | VT | WordPress-VT | 91 |
| Hitchcock Museum (Westfield, VT) | VT | WordPress-VT | 1 |
| Westford Town (Westford, VT) | VT | WordPress-VT | 1 |
| Butterfield (Westminster, VT) | VT | WordPress-VT | 0 |
| Westminster West Public (Westminster West, VT) | VT | WordPress-VT | 0 |
| Wilder Memorial (Weston, VT) | VT | WordPress-VT | 0 |
| Ainsworth Public (Williamstown, VT) | VT | WordPress-VT | 150 |
| Pettee Memorial (Wilmington, VT) | VT | WordPress-VT | 3 |
| Windham Town (Windham, VT) | VT | WordPress-VT | 2 |
| Windsor Public (Windsor, VT) | VT | WordPress-VT | 0 |
| G. M. Kelley Community (Wolcott, VT) | VT | WordPress-VT | 1 |
| Woodbury Community (Woodbury, VT) | VT | WordPress-VT | 28 |
| Enoch Pratt Free Library (Pratt-Library) | MD | Pratt-Library | 955 *(log shows aggregate "2500 events in calendar" scraped from paginated calendar before de-dup/filtering; 955 is the scraper-summary FOUND figure)* |
| Free Library of Philadelphia | PA | FreeLibrary-Philadelphia | 1000 *(log paginated 10 pages x 20 = 200+ raw hits per page-cap; 1000 is the scraper-summary FOUND figure (likely page-limited))* |
| Anne Arundel County Public Library (AACPL) | MD | AACPL | 20 |
| Prince George’s County Memorial Library System | MD | Prince-Georges-County | 72 |
| Westmoreland County Library | PA | Westmoreland-Library | 24 |
| Colonial Heights Public Library | VA | CivicEngage-Libraries | 0 |
| Blue Ridge Regional Library | VA | FullCalendar-Libraries | 268 *(log line shows Found 268; scraper-summary reported 216 after de-dup/filtering)* |
| Dorchester County Public Library | MD | Dorchester-County | 17 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Wicomico Public Libraries | MD | Wicomico-Public | 21 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Allentown Public Library | PA | Allentown-Public | 0 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| WithApps-Libraries (system not itemized in log) | Multi | WithApps-Libraries | 37 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| WordPress-Events-Calendar (system not itemized in log) | Multi | WordPress-Events-Calendar | 302 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Squarespace-Libraries (system not itemized in log) | Multi | Squarespace-Libraries | 54 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Drupal-Virginia (system not itemized in log) | VA | Drupal-Virginia | 22 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Orange County Library System | FL | Orange-County-Library-FL | 2178 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Nashville Public Library | TN | Nashville-Library-TN | 153 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Assabet-NH-MA (system not itemized in log) | Multi | Assabet-NH-MA | 1111 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| LibraryMarket-PA (system not itemized in log) | PA | LibraryMarket-PA | 70 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| LibraryMarket-NC (system not itemized in log) | NC | LibraryMarket-NC | 17 *(Group 3 run — no per-library breakdown available (stdout log gap, see notes))* |
| Camden County Library System (Intercept-Camden) | NJ | Intercept-Camden | 10 *(Group 3 run — confirmed library scraper (checked scraper-intercept-camden-nj.js); no per-library breakdown needed, single library)* |
| ABBE Regional Library System | SC | WordPress-Abbe-Regional | 20 |
| Library System of Lancaster County | PA | Drupal-Pennsylvania | (see note) *(No per-library FOUND count printed for this platform; combined scraper-summary FOUND = 1663 for both PA systems together)* |
| York County Libraries | PA | Drupal-Pennsylvania | (see note) *(No per-library FOUND count printed for this platform; combined scraper-summary FOUND = 1663 for both PA systems together)* |
| Howard County Library System | MD | LibraryCalendar-Libraries | 21 *(NOTE: LibraryCalendar-Libraries is a multi-system file (21 distinct library systems across MD/VA/NC/NJ/SC/IL), not a single site)* |
| Frederick County Public Libraries | MD | LibraryCalendar-Libraries | 20 |
| Talbot County Free Library | MD | LibraryCalendar-Libraries | 22 |
| Caroline County Public Library | MD | LibraryCalendar-Libraries | 18 |
| Amherst County Public Library | VA | LibraryCalendar-Libraries | 17 |
| Appomattox Regional Library | VA | LibraryCalendar-Libraries | 13 |
| Bedford Public Library System | VA | LibraryCalendar-Libraries | 18 |
| Essex Public Library | VA | LibraryCalendar-Libraries | 15 |
| Lynchburg Public Library | VA | LibraryCalendar-Libraries | 15 |
| Petersburg Public Library | VA | LibraryCalendar-Libraries | 8 |
| Poquoson Public Library | VA | LibraryCalendar-Libraries | 19 |
| Powhatan County Public Library | VA | LibraryCalendar-Libraries | 13 |
| Waynesboro Public Library | VA | LibraryCalendar-Libraries | 13 |
| York County Public Library | VA | LibraryCalendar-Libraries | 23 |
| Portsmouth Public Library | VA | LibraryCalendar-Libraries | 23 |
| Forsyth County Public Library (NC) | NC | LibraryCalendar-Libraries | 22 *(distinct system from the NC "Forsyth County Public Library" scraped by Communico-NC — same name, different underlying platform/branch set)* |
| Cumberland County Public Library | NC | LibraryCalendar-Libraries | 22 |
| Atlantic County Library System | NJ | LibraryCalendar-Libraries | 23 |
| Gloucester County Library System | NJ | LibraryCalendar-Libraries | 19 |
| York County Library | SC | LibraryCalendar-Libraries | 23 |
| Bloomingdale Public Library | IL | LibraryCalendar-Libraries | 23 *(IL is outside FunHive’s 22-state active region; included here because it is a real library in the shared LibraryCalendar-Libraries scraper output, not a fabrication)* |
| LibCal libraries (5 systems) | FL | LibCal-FL | 32 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| LibCal libraries (8 systems) | NJ | LibCal-NJ | 2172 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| LibCal libraries | SC | LibCal-SC | 73 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| LibCal libraries | VA | LibCal-VA | 59 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| LibCal libraries | ME | LibCal-ME | 12 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | FL | Communico-FL | 309 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | MD | Communico-MD | 135 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | NY | Communico-NY | 236 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | PA | Communico-PA | 2 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| BiblioCommons libraries | MA | BiblioCommons-MA | 607 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | PA | WordPress-PA | 705 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | MA | WordPress-MA | 2069 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | KY | WordPress-KY | 721 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | SC | WordPress-SC | 521 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | WV | WordPress-WV | 860 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | DE | WordPress-DE | 232 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | RI | WordPress-RI | 370 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| WordPress libraries | NH | WordPress-NH | 1366 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | NH | Communico-NH | 19 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | TN | Communico-TN | 6 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |
| Communico libraries | WV | Communico-WV | 18 *(Group 3 run (2026-08-03T20:05–04:48 EST) — no per-library breakdown available: scraper-stdout.log has a total gap for this run window (see Notes))* |

### Cycle-completion check

Not complete — this is day 1 of 3. Only Group 3 (partial/aggregate-only, see gap above) and Group 1 (full breakdown) plus a few stray real Group 2 completions have run so far. The following active library-family/standalone scrapers are assigned to **Group 2** and have **not** run yet; they are expected on the next Group 2 day:

- LibCal-CT, LibCal-GA, LibCal-MA, LibCal-NY1, LibCal-PA, LibCal-TN, LibCal-WV, LibCal-VT
- Communico-GA, Communico-NJ, Communico-KY, Communico-SC, Communico-AL
- BiblioCommons-GA, BiblioCommons-NC
- LibraryMarket-ME-NH-MA, LibraryMarket-GA
- WordPress-MD, WordPress-NY, WordPress-FL, WordPress-NJ, WordPress-MS, WordPress-ME
- Howard-County, Brooklyn-Library, Cecil-County, Somerset-County, Berks-County, Rockbridge-Regional, EventActions-Libraries, CustomDrupal-Libraries, Graniculator-Morris, Louisville-Library, Tockify-Horry

(This pending list was compiled from the literal Group 2 dry-run scraper list printed in `scraper-run-2026-08-04.log` at 13:38 UTC, cross-referenced against `scraper-registry.js` for library-matching names. It has not been independently verified against `isScraperActive()` output for every entry, so treat it as a best-effort punch list rather than an exhaustive audit.)
