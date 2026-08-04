# Age Range Audit

Tracks how many events, per individual site, land in each of the 6 standard age brackets every time that site is scraped. Covers every scraper that ran that day, not just libraries.

**Methodology note:** `age_range` is queried directly from the `events` table. Because many scrapers write per-library/per-site values into the `scraper_name` column instead of the registry display name (confirmed empirically for LibCal-*, Communico-*, RecDesk-Parks, Drupal-Parks, Orange-County-Library-FL, and others), rows are attributed to a scraper by matching each row's `created_at` timestamp against that scraper's [start, completion] window from `scrapers/logs/scraper-run-2026-08-04.log` (the runner is single-threaded — one scraper at a time — confirmed from the log's sequential Starting/completed pairs). The one exception is `MacaroniKid-DE`, a manual verification run in a separate concurrent process; it was carved out by its distinctive stored name (`Macaroni Kid Wilmington-New Castle`) instead of by time. Because of this, and because some "New" events reported by a scraper's own run log turn out to collide server-side with an existing row's stable ID (an UPDATE, which does not reset `created_at`), the Total column here reflects genuinely fresh DB rows and can run lower than the scraper log's self-reported New count — this is expected, not a bug in this audit.

Scrapers with a large number of individual sites (>20 distinct scraper_name/venue groups) are shown as one aggregated row per scraper, with any individually-flagged sites called out in prose below the table.

## 2026-08-04

| Site | Scraper | All Ages | Babies 0-2 | Preschool 3-5 | Kids 6-8 | Tweens 9-12 | Teens 13-18 | Total |
|---|---|---|---|---|---|---|---|---|
| Main Library Meeting Room | LibCal-FL | 1 | 0 | 0 | 2 | 0 | 1 | 4 |
| Lakeland Public Library | LibCal-FL | 1 | 0 | 0 | 0 | 0 | 1 | 2 |
| The Commons | LibCal-FL | 0 | 0 | 0 | 1 | 0 | 1 | 2 |
| Bookmobile | LibCal-FL | 0 | 0 | 0 | 2 | 0 | 0 | 2 |
| Arts & Crafts Room at Kelly Rec Complex | LibCal-FL | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Book Sale Building - Mannington | LibCal-FL | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| (39 sites, aggregated) | LibCal-NJ | 1294 | 30 | 47 | 285 | 0 | 145 | 1801 |
| Charleston County Public Library | LibCal-SC | 1 | 1 | 2 | 1 | 0 | 0 | 5 |
| Activity Room | LibCal-SC | 2 | 0 | 0 | 2 | 0 | 0 | 4 |
| Berkeley County Library System | LibCal-SC | 0 | 0 | 0 | 3 | 0 | 0 | 3 |
| Mobile Library | LibCal-SC | 0 | 0 | 0 | 2 | 0 | 0 | 2 |
| South Carolina State Library | LibCal-SC | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Ashley River Branch - 2824 Bacons Bridge Rd | LibCal-SC | 0 | 0 | 0 | 2 | 0 | 0 | 2 |
| Keith Summey North Charleston | LibCal-SC | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Folly Beach | LibCal-SC | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Baxter-Patrick James Island | LibCal-SC | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Dorchester | LibCal-SC | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Otranto Road | LibCal-SC | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| West Ashley | LibCal-SC | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Chapin Branch Library | LibCal-SC | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Gaston Branch Library | LibCal-SC | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Pelion Branch Library | LibCal-SC | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Cayce-West Columbia Branch Library | LibCal-SC | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| North Charleston Branch - 8620 Patriot Blvd | LibCal-SC | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| (27 sites, aggregated) | LibCal-VA | 4 | 2 | 14 | 12 | 0 | 4 | 36 |
| Story Room | LibCal-ME | 0 | 1 | 0 | 3 | 0 | 0 | 4 |
| Teen Lounge | LibCal-ME | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| (92 sites, aggregated) | Communico-FL | 105 | 5 | 12 | 37 | 0 | 26 | 185 |
| (62 sites, aggregated) | Communico-MD | 37 | 10 | 26 | 24 | 0 | 8 | 105 |
| Main Library | Communico-NY | 4 | 1 | 0 | 1 | 0 | 0 | 6 |
| Huntington Public Library Station Branch | Communico-NY | 3 | 0 | 0 | 1 | 0 | 1 | 5 |
| Greene Room 1 at Boardman Road Branch Library | Communico-NY | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Huntington Public Library Main Building | Communico-NY | 2 | 1 | 0 | 0 | 0 | 0 | 3 |
| Marcotte Computer Lab (Main Floor) at Adriance Memorial Library | Communico-NY | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Medford Branch | Communico-NY | 1 | 0 | 1 | 0 | 0 | 0 | 2 |
| Charwat Room (Ground Floor) at Adriance Memorial Library | Communico-NY | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Teen Study Room (Second Floor) at Adriance Memorial Library | Communico-NY | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Rover at Rover: The Roaming Library Bookmobile | Communico-NY | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Carnegie Library | Communico-NY | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Children's Room Story Nook (Second Floor) at Adriance Memorial Library | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Office for the Aging (OFA) at Rover: The Roaming Library Bookmobile | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Mid-Hudson Auditorium at Offsite | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Greene Rooms 2 & 3 at Boardman Road Branch Library | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Joba Children's Program Room at Boardman Road Branch Library | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| In the Community at Offsite | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| JLP Pre-Schooler Learning Center (Second Floor) at Adriance Memorial Library | Communico-NY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Reading Public Library | Communico-PA | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| Faneuil | BiblioCommons-MA | 0 | 0 | 1 | 30 | 0 | 0 | 31 |
| Central Library in Copley Square | BiblioCommons-MA | 4 | 0 | 0 | 11 | 0 | 2 | 17 |
| Roslindale | BiblioCommons-MA | 3 | 0 | 0 | 14 | 0 | 0 | 17 |
| Lawrence Public Library | BiblioCommons-MA | 9 | 3 | 0 | 2 | 0 | 0 | 14 |
| Connolly | BiblioCommons-MA | 1 | 0 | 0 | 6 | 0 | 0 | 7 |
| Hyde Park | BiblioCommons-MA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Adams Street | BiblioCommons-MA | 0 | 0 | 0 | 2 | 0 | 0 | 2 |
| Lower Mills | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Grove Hall | BiblioCommons-MA | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| North End | BiblioCommons-MA | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Chinatown | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Charlestown | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Brighton | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| South Boston | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| East Boston | BiblioCommons-MA | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Mattapan | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Uphams Corner | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Jamaica Plain | BiblioCommons-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Bookmobile | Wicomico-Public | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Paul S. Sarbanes Branch | Wicomico-Public | 0 | 0 | 1 | 2 | 0 | 0 | 3 |
| Riley Branch | Wicomico-Public | 0 | 0 | 2 | 0 | 0 | 1 | 3 |
| Centre Branch | Wicomico-Public | 0 | 0 | 1 | 0 | 0 | 1 | 2 |
| Mobile Learning Lab | Wicomico-Public | 1 | 0 | 1 | 0 | 0 | 0 | 2 |
| Off Site | Wicomico-Public | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Hampton Public Library | WithApps-Libraries | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Wythe-Grayson Regional Library | WordPress-Events-Calendar | 26 | 0 | 0 | 4 | 0 | 1 | 31 |
| Pittsylvania County Public Library | WordPress-Events-Calendar | 23 | 0 | 4 | 1 | 0 | 2 | 30 |
| Rappahannock County Library | WordPress-Events-Calendar | 11 | 0 | 5 | 0 | 0 | 0 | 16 |
| Galax Public Library | WordPress-Events-Calendar | 12 | 0 | 0 | 0 | 0 | 0 | 12 |
| Carrollton | WordPress-Events-Calendar | 8 | 0 | 0 | 1 | 0 | 0 | 9 |
| Smithfield | WordPress-Events-Calendar | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Franklin | WordPress-Events-Calendar | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Windsor | WordPress-Events-Calendar | 3 | 0 | 0 | 0 | 0 | 2 | 5 |
| Outreach Services | WordPress-Events-Calendar | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| Galax-Carroll Regional Library | WordPress-Events-Calendar | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Charlotte Court House Library | WordPress-Events-Calendar | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Courtland | WordPress-Events-Calendar | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Carroll County Public Library | WordPress-Events-Calendar | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Keysville Library | WordPress-Events-Calendar | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Wylliesburg Library | WordPress-Events-Calendar | 0 | 0 | 0 | 0 | 0 | 2 | 2 |
| Surry | WordPress-Events-Calendar | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Osterhout Free Library | WordPress-Events-Calendar | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Charlotte County Library | WordPress-Events-Calendar | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Waverly | WordPress-Events-Calendar | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Queen Anne's County Library | Squarespace-Libraries | 23 | 0 | 0 | 0 | 0 | 0 | 23 |
| Handley Regional Library | Drupal-Virginia | 8 | 0 | 2 | 8 | 0 | 3 | 21 |
| Rolly Pollies | RollyPollies-MD | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Camden County Library System | Intercept-Camden | 1 | 0 | 1 | 4 | 0 | 0 | 6 |
| (24 sites, aggregated) | WordPress-PA | 132 | 5 | 9 | 2 | 8 | 3 | 159 |
| (37 sites, aggregated) | WordPress-MA | 267 | 14 | 5 | 1 | 8 | 5 | 300 |
| Kenton County Public Library | WordPress-KY | 21 | 4 | 2 | 0 | 0 | 0 | 27 |
| Louisville Free Public Library | WordPress-KY | 8 | 9 | 0 | 3 | 3 | 0 | 23 |
| Laurel County Public Library | WordPress-KY | 15 | 0 | 1 | 0 | 1 | 0 | 17 |
| Oldham County Public Library | WordPress-KY | 13 | 0 | 0 | 0 | 1 | 0 | 14 |
| Bracken County Public Library | WordPress-KY | 11 | 0 | 0 | 0 | 0 | 0 | 11 |
| Warren County Public Library | WordPress-KY | 5 | 2 | 1 | 0 | 0 | 0 | 8 |
| Rowan County Public Library | WordPress-KY | 7 | 0 | 0 | 0 | 0 | 0 | 7 |
| Gallatin County Public Library | WordPress-KY | 5 | 1 | 0 | 0 | 0 | 0 | 6 |
| Newport Branch | WordPress-KY | 4 | 1 | 0 | 0 | 0 | 0 | 5 |
| Henderson County Public Library | WordPress-KY | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| Florence Branch | WordPress-KY | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Sturgis Branch | WordPress-KY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| McCracken County Public Library | WordPress-KY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Henderson, KY | WordPress-KY | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Florence County Library System | WordPress-SC | 14 | 0 | 0 | 0 | 0 | 0 | 14 |
| Anderson County Library | WordPress-SC | 11 | 0 | 0 | 0 | 0 | 0 | 11 |
| Allendale County Library | WordPress-SC | 10 | 0 | 0 | 0 | 0 | 0 | 10 |
| Orangeburg County Library Commission | WordPress-SC | 6 | 0 | 1 | 1 | 1 | 0 | 9 |
| Greenwood County Library System | WordPress-SC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Great Falls Library | WordPress-SC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Sand Hill Public Library | WordPress-WV | 8 | 0 | 0 | 0 | 0 | 0 | 8 |
| Center Point Public Library | WordPress-WV | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Kanawha County Public Library | WordPress-WV | 4 | 2 | 0 | 0 | 0 | 0 | 6 |
| Boone-Madison Public Library | WordPress-WV | 1 | 0 | 2 | 2 | 0 | 0 | 5 |
| Harrison County Public Library | WordPress-WV | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Monroe County Public Library | WordPress-WV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Barrett-Wharton Public Library | WordPress-WV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Jackson County Public Library | WordPress-WV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Laurel Public Library | WordPress-DE | 16 | 0 | 0 | 0 | 0 | 0 | 16 |
| Rehoboth Beach Public Library | WordPress-DE | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Greenwood Public Library | WordPress-DE | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Fairmount Branch | WordPress-RI | 2 | 1 | 1 | 2 | 1 | 0 | 7 |
| Woonsocket Harris Public Library | WordPress-RI | 2 | 1 | 1 | 2 | 1 | 0 | 7 |
| Wanskuck Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Olneyville Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Providence, RI | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Fox Point Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| South Providence Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Washington Park Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Knight Memorial Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Rochambeau Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Smith Hill Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Mount Pleasant Library | WordPress-RI | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Anne Arundel County Recreation | AARecParks-MD | 19 | 0 | 0 | 0 | 0 | 0 | 19 |
| South County Rec Ctr | AARecParks-MD | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| N/A | AARecParks-MD | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Melrose Center | Orange-County-Library-FL | 223 | 0 | 0 | 0 | 0 | 0 | 223 |
| Online | Orange-County-Library-FL | 206 | 0 | 8 | 1 | 0 | 1 | 216 |
| Orlando Public Library | Orange-County-Library-FL | 181 | 21 | 8 | 0 | 0 | 5 | 215 |
| Winter Garden Branch | Orange-County-Library-FL | 90 | 24 | 7 | 3 | 0 | 4 | 128 |
| Alafaya Branch | Orange-County-Library-FL | 77 | 20 | 11 | 1 | 0 | 3 | 112 |
| South Trail Branch | Orange-County-Library-FL | 83 | 5 | 0 | 0 | 0 | 2 | 90 |
| Windermere Branch | Orange-County-Library-FL | 51 | 18 | 7 | 0 | 0 | 3 | 79 |
| North Orange Branch | Orange-County-Library-FL | 51 | 11 | 9 | 1 | 0 | 4 | 76 |
| Chickasaw Branch | Orange-County-Library-FL | 59 | 7 | 9 | 0 | 0 | 0 | 75 |
| Southeast Branch | Orange-County-Library-FL | 49 | 16 | 5 | 0 | 0 | 1 | 71 |
| Southwest Branch | Orange-County-Library-FL | 48 | 14 | 7 | 1 | 0 | 1 | 71 |
| Fairview Shores Branch | Orange-County-Library-FL | 47 | 11 | 4 | 0 | 0 | 2 | 64 |
| West Oaks Branch and Genealogy Center | Orange-County-Library-FL | 52 | 6 | 4 | 0 | 0 | 0 | 62 |
| South Creek Branch | Orange-County-Library-FL | 47 | 7 | 5 | 0 | 0 | 2 | 61 |
| Hiawassee Branch | Orange-County-Library-FL | 48 | 4 | 0 | 0 | 0 | 2 | 54 |
| Eatonville Branch | Orange-County-Library-FL | 28 | 7 | 4 | 0 | 0 | 0 | 39 |
| Washington Park Branch | Orange-County-Library-FL | 30 | 5 | 1 | 0 | 0 | 1 | 37 |
| Offsite | Orange-County-Library-FL | 11 | 9 | 4 | 0 | 0 | 0 | 24 |
| Brandywine Zoo | Venue-Events-ZoosAquariums | 161 | 0 | 1 | 0 | 0 | 0 | 162 |
| Virginia Zoo | Venue-Events-ZoosAquariums | 63 | 6 | 3 | 0 | 0 | 0 | 72 |
| Alabama Gulf Coast Zoo | Venue-Events-ZoosAquariums | 10 | 0 | 0 | 0 | 0 | 0 | 10 |
| ZooTampa at Lowry Park | Venue-Events-ZoosAquariums | 7 | 3 | 0 | 0 | 0 | 0 | 10 |
| Fort Wayne Children's Zoo | Venue-Events-ZoosAquariums | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Louisville Zoo | Venue-Events-ZoosAquariums | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Clearwater Marine Aquarium | Venue-Events-ZoosAquariums | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Brevard Zoo | Venue-Events-ZoosAquariums | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Bennett Orchards | Farms-Eastern-US | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Butler's Orchard | Farms-Eastern-US | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Peterborough Town Library | Communico-NH | 9 | 0 | 0 | 0 | 0 | 1 | 10 |
| Peterborough Town Library - Eben Jones Classroom | Communico-NH | 6 | 0 | 0 | 0 | 0 | 1 | 7 |
| River Terrace | Communico-NH | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Lucius E. & Elsie C. Burch, Jr. Library | Communico-TN | 1 | 1 | 0 | 1 | 0 | 1 | 4 |
| Goodlettsville | Nashville-Library-TN | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Donelson | Nashville-Library-TN | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Bridgeport Public Library | Communico-WV | 1 | 0 | 0 | 4 | 0 | 0 | 5 |
| York County Libraries | LibraryMarket-PA | 5 | 5 | 0 | 9 | 0 | 2 | 21 |
| Lancaster Public Library | LibraryMarket-PA | 11 | 7 | 0 | 0 | 2 | 0 | 20 |
| Bethlehem Area Public Library | LibraryMarket-PA | 16 | 1 | 0 | 1 | 1 | 0 | 19 |
| Buncombe County Libraries | LibraryMarket-NC | 3 | 0 | 2 | 1 | 1 | 0 | 7 |
| Hickory Public Library | LibraryMarket-NC | 4 | 1 | 0 | 0 | 1 | 0 | 6 |
| Hill Public Library | WordPress-NH | 19 | 0 | 0 | 0 | 0 | 0 | 19 |
| Stark Public Library | WordPress-NH | 10 | 0 | 0 | 0 | 0 | 0 | 10 |
| Nichols Memorial Library | WordPress-NH | 4 | 0 | 0 | 0 | 2 | 0 | 6 |
| Richards Free Library | WordPress-NH | 5 | 1 | 0 | 0 | 0 | 0 | 6 |
| Madison Library | WordPress-NH | 1 | 0 | 2 | 2 | 0 | 0 | 5 |
| Belmont Public Library | WordPress-NH | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Newfields Public Library | WordPress-NH | 3 | 1 | 0 | 0 | 0 | 0 | 4 |
| Durham Public Library | WordPress-NH | 3 | 0 | 0 | 0 | 1 | 0 | 4 |
| Wakefield Public Library | WordPress-NH | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Berlin Public Library | WordPress-NH | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Meriden Library | WordPress-NH | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Goodwin Library | WordPress-NH | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| New Durham Public Library | WordPress-NH | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Olivia Rodham Memorial Library | WordPress-NH | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Hampton Falls Free Library | WordPress-NH | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Cook Memorial Library | WordPress-NH | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Manchester City Library | WordPress-NH | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Thomas Crane Public Library | Assabet-NH-MA | 101 | 15 | 23 | 1 | 4 | 1 | 145 |
| Somerville Public Library | Assabet-NH-MA | 94 | 14 | 21 | 0 | 2 | 0 | 131 |
| Weymouth Public Libraries | Assabet-NH-MA | 65 | 2 | 21 | 5 | 19 | 0 | 112 |
| Pollard Memorial Library | Assabet-NH-MA | 77 | 2 | 9 | 0 | 15 | 0 | 103 |
| Malden Public Library | Assabet-NH-MA | 47 | 0 | 8 | 0 | 0 | 0 | 55 |
| Goffstown Public Library | Assabet-NH-MA | 19 | 2 | 18 | 0 | 12 | 0 | 51 |
| Derry Public Library | Assabet-NH-MA | 36 | 4 | 2 | 0 | 4 | 0 | 46 |
| Haverhill Public Library | Assabet-NH-MA | 25 | 4 | 7 | 3 | 4 | 1 | 44 |
| Kelley Library | Assabet-NH-MA | 36 | 0 | 4 | 0 | 0 | 0 | 40 |
| Taunton Public Library | Assabet-NH-MA | 30 | 4 | 4 | 0 | 0 | 0 | 38 |
| Leach Library | Assabet-NH-MA | 27 | 0 | 6 | 1 | 2 | 0 | 36 |
| Chicopee Public Library | Assabet-NH-MA | 23 | 2 | 10 | 0 | 1 | 0 | 36 |
| Wadleigh Memorial Library | Assabet-NH-MA | 31 | 0 | 0 | 0 | 1 | 0 | 32 |
| Bedford Public Library | Assabet-NH-MA | 29 | 0 | 0 | 0 | 0 | 0 | 29 |
| Nesmith Library | Assabet-NH-MA | 24 | 0 | 1 | 1 | 1 | 0 | 27 |
| Dover Public Library | Assabet-NH-MA | 20 | 0 | 2 | 0 | 1 | 0 | 23 |
| Lane Memorial Library | Assabet-NH-MA | 21 | 0 | 1 | 0 | 0 | 0 | 22 |
| Amherst Town Library | Assabet-NH-MA | 11 | 2 | 5 | 0 | 0 | 0 | 18 |
| (76 sites, aggregated) | Patch-Community-Eastern | 120 | 2 | 4 | 0 | 2 | 0 | 128 |
| (256 sites, aggregated) | CivicRec-Parks-Eastern | 1476 | 8 | 93 | 80 | 51 | 38 | 1746 |
| (22 sites, aggregated) | Gardens-Nature-Eastern | 129 | 1 | 5 | 1 | 2 | 0 | 138 |
| Lobby Art Exhibit | LibCal-DE | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Kent County Public Library | LibCal-DE | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Children's Wing | LibCal-DE | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Children's Area | LibCal-DE | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Grove Park (Off location) | LibCal-DE | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Children's Room | LibCal-DE | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Youth Services | LibCal-DE | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Lobby | LibCal-DE | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| (28 sites, aggregated) | LibCal-NC | 12 | 6 | 4 | 18 | 0 | 5 | 45 |
| Freeport Memorial Library | LibCal-NY2 | 2 | 0 | 0 | 3 | 0 | 1 | 6 |
| Wantagh Public Library | LibCal-NY2 | 0 | 0 | 0 | 3 | 0 | 0 | 3 |
| Saw Mill Elementary School - Classroom | LibCal-NY2 | 0 | 0 | 1 | 2 | 0 | 0 | 3 |
| Children's Room | LibCal-NY2 | 0 | 1 | 0 | 1 | 0 | 0 | 2 |
| Helen Kraus Room | LibCal-NY2 | 0 | 1 | 0 | 1 | 0 | 0 | 2 |
| Oceanside Public Library | LibCal-NY2 | 0 | 0 | 1 | 0 | 0 | 1 | 2 |
| North Merrick Community Room | LibCal-NY2 | 0 | 1 | 1 | 0 | 0 | 0 | 2 |
| Buschel DLC | LibCal-NY2 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Story Time Room | LibCal-NY2 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Children's Program Room | LibCal-NY2 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Discovery Lab | LibCal-NY2 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Community Room | LibCal-NY2 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Children's Story Hour Room | LibCal-NY2 | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| North Bellmore Public Library | LibCal-NY2 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Community Room | LibCal-NY2 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| (23 sites, aggregated) | LibCal-RI | 2 | 2 | 3 | 14 | 0 | 11 | 32 |
| Orange Park | LibCal-KY | 0 | 0 | 1 | 2 | 0 | 0 | 3 |
| Keystone Heights - General | LibCal-KY | 1 | 0 | 1 | 0 | 0 | 0 | 2 |
| Fleming Island | LibCal-KY | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Green Cove Springs | LibCal-KY | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Middleburg-Clay Hill | LibCal-KY | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Martin Luther King Jr. Memorial Library - Central Library | Communico-DC | 3 | 0 | 0 | 1 | 0 | 1 | 5 |
| Cleveland Park Neighborhood Library | Communico-DC | 0 | 0 | 0 | 3 | 0 | 0 | 3 |
| Lamond-Riggs/Lillian J. Huff Neighborhood Library | Communico-DC | 2 | 0 | 0 | 0 | 0 | 1 | 3 |
| Francis A. Gregory Neighborhood Library | Communico-DC | 0 | 0 | 0 | 1 | 0 | 2 | 3 |
| Bellevue (William O. Lockridge) Neighborhood Library | Communico-DC | 0 | 0 | 0 | 2 | 0 | 0 | 2 |
| Takoma Park Neighborhood Library | Communico-DC | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Northwest One Neighborhood Library | Communico-DC | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| Georgetown Neighborhood Library | Communico-DC | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| Northeast Neighborhood Library | Communico-DC | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Woodridge Neighborhood Library | Communico-DC | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Parklands-Turner Neighborhood Library | Communico-DC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Deanwood Neighborhood Library | Communico-DC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Southwest Neighborhood Library | Communico-DC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Mt. Pleasant Neighborhood Library | Communico-DC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Benning (Dorothy I. Height) Neighborhood Library | Communico-DC | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Tenley-Friendship Neighborhood Library | Communico-DC | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Shepherd Park (Juanita E. Thornton) Neighborhood Library | Communico-DC | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Chevy Chase Neighborhood Library | Communico-DC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Main Library | Communico-MA | 7 | 0 | 0 | 2 | 0 | 1 | 10 |
| Great Brook Valley Branch | Communico-MA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Ashburn Library | Communico-VA | 3 | 0 | 0 | 1 | 0 | 1 | 5 |
| Rust Library | Communico-VA | 3 | 0 | 0 | 1 | 0 | 1 | 5 |
| Gum Spring Library | Communico-VA | 1 | 0 | 0 | 2 | 0 | 1 | 4 |
| Purcellville Library | Communico-VA | 1 | 0 | 0 | 0 | 0 | 2 | 3 |
| Sterling Library | Communico-VA | 2 | 0 | 0 | 0 | 0 | 1 | 3 |
| Brambleton Library | Communico-VA | 1 | 0 | 0 | 0 | 0 | 2 | 3 |
| Haymarket Gainesville Library | Communico-VA | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Cascades Library | Communico-VA | 0 | 0 | 0 | 2 | 0 | 0 | 2 |
| Lovettsville Library | Communico-VA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Middleburg Library | Communico-VA | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| Bull Run Library | Communico-VA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Independent Hill Library | Communico-VA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Manassas City Library | Communico-VA | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| Nokesville Library | Communico-VA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Online | Communico-VA | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Lake Ridge Library | Communico-VA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Montclair Library | Communico-VA | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Central Library | Communico-VA | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Potomac Library | Communico-VA | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Bordentown Library | BiblioCommons-NJ | 4 | 0 | 0 | 2 | 0 | 0 | 6 |
| Maple Shade Library | BiblioCommons-NJ | 3 | 1 | 0 | 0 | 0 | 0 | 4 |
| Pemberton Library | BiblioCommons-NJ | 3 | 1 | 0 | 0 | 0 | 0 | 4 |
| Cinnaminson Library | BiblioCommons-NJ | 1 | 1 | 0 | 0 | 0 | 0 | 2 |
| Evesham Library | BiblioCommons-NJ | 0 | 1 | 1 | 0 | 0 | 0 | 2 |
| Pinelands Library | BiblioCommons-NJ | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Riverton Free Library | BiblioCommons-NJ | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Central Rappahannock Regional Library | BiblioCommons-VA | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Newton Branch | BiblioCommons-VA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Montross Branch | BiblioCommons-VA | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Towne Centre Branch | BiblioCommons-VA | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Central Library | Pratt-Library | 2 | 0 | 1 | 2 | 0 | 0 | 5 |
| Northwood Library | Pratt-Library | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Southeast Anchor Library | Pratt-Library | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Canton Library | Pratt-Library | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Cherry Hill Library | Pratt-Library | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Herring Run Library | Pratt-Library | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Brooklyn Library | Pratt-Library | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| (28 sites, aggregated) | FreeLibrary-Philadelphia | 33 | 0 | 18 | 18 | 0 | 3 | 72 |
| Anne Arundel County Library | AACPL | 0 | 1 | 1 | 0 | 0 | 0 | 2 |
| Odenton Library | AACPL | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Discoveries Library | AACPL | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Deale Library | AACPL | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Broadneck Library | AACPL | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Edgewater Library | AACPL | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Severn Library | AACPL | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Mountain Road Library | AACPL | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Prince George's County Memorial Library System | Prince-Georges-County | 13 | 0 | 2 | 9 | 0 | 4 | 28 |
| Delmont Public Library 75 School Rd, Delmont, PA, United States | Westmoreland-Library | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Penn Area Library 2001 Municipal Court, Harrison City, PA, United States | Westmoreland-Library | 0 | 1 | 1 | 0 | 0 | 0 | 2 |
| Peoples Library 880 Barnes Street, New Kensington, PA, United States | Westmoreland-Library | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Ligonier Valley Library 120 West Main Street, Ligonier, PA, United States | Westmoreland-Library | 1 | 0 | 0 | 1 | 0 | 0 | 2 |
| Mount Pleasant Public Library 120 S. Church Street, Mount Pleasant, PA, United States | Westmoreland-Library | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Rostraver Public Library 700 Plaza Drive, Belle Vernon, PA, United States | Westmoreland-Library | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Greensburg Hempfield Area Library 237 S. Pennsylvania Avenue, Greensburg, PA, United States | Westmoreland-Library | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Patrick County Library | FullCalendar-Libraries | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Frederick County Public Libraries | LibraryCalendar-Libraries | 9 | 0 | 0 | 9 | 0 | 2 | 20 |
| Atlantic County Library System | LibraryCalendar-Libraries | 4 | 5 | 0 | 9 | 0 | 0 | 18 |
| Howard County Library System | LibraryCalendar-Libraries | 1 | 0 | 0 | 9 | 0 | 5 | 15 |
| Gloucester County Library System | LibraryCalendar-Libraries | 6 | 1 | 1 | 2 | 0 | 2 | 12 |
| Cumberland County Public Library | LibraryCalendar-Libraries | 11 | 0 | 0 | 0 | 0 | 0 | 11 |
| York County Library | LibraryCalendar-Libraries | 7 | 1 | 1 | 0 | 0 | 0 | 9 |
| Portsmouth Public Library | LibraryCalendar-Libraries | 5 | 0 | 0 | 0 | 0 | 2 | 7 |
| Bloomingdale Public Library | LibraryCalendar-Libraries | 2 | 0 | 0 | 2 | 0 | 3 | 7 |
| Bedford Public Library System | LibraryCalendar-Libraries | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| York County Public Library | LibraryCalendar-Libraries | 1 | 1 | 0 | 0 | 0 | 3 | 5 |
| Forsyth County Public Library | LibraryCalendar-Libraries | 1 | 0 | 0 | 1 | 0 | 3 | 5 |
| Waynesboro Public Library | LibraryCalendar-Libraries | 2 | 0 | 0 | 0 | 0 | 1 | 3 |
| Talbot County Free Library | LibraryCalendar-Libraries | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Amherst County Public Library | LibraryCalendar-Libraries | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Appomattox Regional Library | LibraryCalendar-Libraries | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Lynchburg Public Library | LibraryCalendar-Libraries | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| Petersburg Public Library | LibraryCalendar-Libraries | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Poquoson Public Library | LibraryCalendar-Libraries | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| Powhatan County Public Library | LibraryCalendar-Libraries | 0 | 0 | 0 | 1 | 0 | 0 | 1 |
| (21 sites, aggregated) | Drupal-Pennsylvania | 37 | 37 | 5 | 13 | 0 | 17 | 109 |
| Riverbend Park | Fairfax-Parks | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| Fairfax County Parks | Fairfax-Parks | 3 | 0 | 0 | 0 | 1 | 0 | 4 |
| Burke Lake Park | Fairfax-Parks | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Spartanburg County Public Libraries | Trumba-Spartanburg | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| at Aiken County Public Library | WordPress-Abbe-Regional | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| ABBE Regional Library System | WordPress-Abbe-Regional | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Culpeper County Library | WordPress-VA | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Manassas Park City Library | WordPress-VA | 2 | 1 | 0 | 0 | 0 | 0 | 3 |
| Centerville Branch Library | WordPress-GA | 105 | 0 | 0 | 0 | 0 | 0 | 105 |
| Pelham-Carnegie Library | WordPress-GA | 25 | 0 | 0 | 0 | 0 | 0 | 25 |
| Chattahoochee Valley Regional Library System | WordPress-GA | 23 | 0 | 0 | 0 | 0 | 0 | 23 |
| Hancock County Library | WordPress-GA | 15 | 0 | 0 | 0 | 0 | 6 | 21 |
| Athens Regional Library System | WordPress-GA | 15 | 0 | 1 | 0 | 3 | 0 | 19 |
| Banks County Public Library | WordPress-GA | 10 | 0 | 1 | 0 | 0 | 0 | 11 |
| Alma-Bacon County Public Library | WordPress-GA | 6 | 0 | 0 | 0 | 0 | 0 | 6 |
| Morgan County Library | WordPress-GA | 1 | 0 | 2 | 2 | 0 | 0 | 5 |
| New Georgia Public Library | WordPress-GA | 2 | 2 | 0 | 0 | 0 | 0 | 4 |
| Warwick City Library | WordPress-GA | 0 | 2 | 1 | 1 | 0 | 0 | 4 |
| Ida Hilton Public Library | WordPress-GA | 2 | 0 | 0 | 0 | 1 | 0 | 3 |
| Wayne County Library | WordPress-GA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Lagrange Memorial Library | WordPress-GA | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Bowman Branch | WordPress-GA | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Douglas-Coffee County Public Library | WordPress-GA | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Saluda Branch Library | WordPress-NC | 116 | 0 | 0 | 0 | 0 | 0 | 116 |
| Robbins Area Branch | WordPress-NC | 70 | 0 | 0 | 0 | 0 | 11 | 81 |
| Alleghany County Public Library | WordPress-NC | 15 | 0 | 0 | 0 | 0 | 6 | 21 |
| Cleveland County Memorial Library | WordPress-NC | 7 | 0 | 0 | 0 | 0 | 0 | 7 |
| Belmont Branch Library | WordPress-NC | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Madison Branch Library | WordPress-NC | 1 | 0 | 2 | 2 | 0 | 0 | 5 |
| Dallas Branch Library | WordPress-NC | 2 | 2 | 0 | 0 | 0 | 0 | 4 |
| Bragtown Branch Library | WordPress-NC | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| Wayne County Public Library, Fremont | WordPress-NC | 2 | 1 | 0 | 0 | 0 | 0 | 3 |
| Warsaw-Kornegay Public Library | WordPress-NC | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| La Grange Branch Library | WordPress-NC | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Franklin County Library | WordPress-NC | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Harwinton Public Library | WordPress-CT | 99 | 0 | 0 | 0 | 0 | 0 | 99 |
| Seymour Public Library | WordPress-CT | 87 | 0 | 0 | 0 | 0 | 3 | 90 |
| Willimantic Public Library | WordPress-CT | 11 | 0 | 0 | 0 | 0 | 9 | 20 |
| West Hartford Public Library | WordPress-CT | 7 | 0 | 0 | 0 | 2 | 0 | 9 |
| Wallingford Public Library | WordPress-CT | 2 | 1 | 1 | 0 | 2 | 0 | 6 |
| Darien Library | WordPress-CT | 3 | 0 | 0 | 0 | 1 | 0 | 4 |
| Westport Library | WordPress-CT | 3 | 0 | 1 | 0 | 0 | 0 | 4 |
| Brookfield Library | WordPress-CT | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Berlin Free Library Association | WordPress-CT | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Cheshire Public Library | WordPress-CT | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| New Fairfield Free Public Library | WordPress-CT | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Chattanooga Public Library | WordPress-TN | 94 | 0 | 0 | 22 | 15 | 0 | 131 |
| Hickman County Public Library | WordPress-TN | 83 | 0 | 0 | 0 | 0 | 0 | 83 |
| Seymour Branch Library | WordPress-TN | 71 | 0 | 0 | 0 | 0 | 3 | 74 |
| Germantown Community Library | WordPress-TN | 40 | 13 | 1 | 0 | 0 | 0 | 54 |
| Baxter Branch Library | WordPress-TN | 20 | 0 | 3 | 0 | 0 | 0 | 23 |
| White County Public Library | WordPress-TN | 15 | 0 | 0 | 0 | 0 | 6 | 21 |
| Athens Public Library | WordPress-TN | 15 | 0 | 1 | 0 | 3 | 0 | 19 |
| Adams Memorial Library | WordPress-TN | 6 | 0 | 1 | 0 | 0 | 0 | 7 |
| Knox County Public Library | WordPress-TN | 4 | 1 | 0 | 0 | 0 | 0 | 5 |
| Memphis Public Libraries | WordPress-TN | 1 | 2 | 0 | 0 | 0 | 1 | 4 |
| Johnson City Public Library | WordPress-TN | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Lauderdale County Library | WordPress-TN | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Vestavia Hills Library | WordPress-AL | 95 | 0 | 0 | 0 | 1 | 33 | 129 |
| Fairhope Public Library | WordPress-AL | 105 | 0 | 0 | 0 | 0 | 3 | 108 |
| Wilsonville - Vernice Stoudenmire Library | WordPress-AL | 54 | 0 | 0 | 0 | 0 | 0 | 54 |
| Montgomery City-County Public Library | WordPress-AL | 27 | 0 | 0 | 0 | 0 | 0 | 27 |
| Athens-Limestone Public Library | WordPress-AL | 15 | 0 | 1 | 0 | 3 | 0 | 19 |
| Tuscaloosa Public Library | WordPress-AL | 12 | 0 | 0 | 0 | 0 | 0 | 12 |
| Mobile Public Library | WordPress-AL | 6 | 1 | 0 | 1 | 0 | 0 | 8 |
| Madison Public Library | WordPress-AL | 1 | 0 | 2 | 2 | 0 | 0 | 5 |
| Hoover Public Library | WordPress-AL | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| Leighton Public Library | WordPress-AL | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Dothan Houston County Library System | WordPress-AL | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Fayette County Memorial Library | WordPress-AL | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Brooks Memorial Library | WordPress-VT | 110 | 0 | 0 | 0 | 0 | 23 | 133 |
| Kellogg-Hubbard Library | WordPress-VT | 58 | 0 | 0 | 0 | 0 | 74 | 132 |
| Norman Williams Public Library | WordPress-VT | 122 | 0 | 0 | 0 | 0 | 0 | 122 |
| Bennington Free | WordPress-VT | 25 | 0 | 94 | 0 | 0 | 0 | 119 |
| Ainsworth Public | WordPress-VT | 45 | 0 | 3 | 0 | 3 | 0 | 51 |
| Pierson Library | WordPress-VT | 32 | 0 | 0 | 2 | 2 | 0 | 36 |
| Franklin-Grand Isle Bookmobile | WordPress-VT | 26 | 0 | 0 | 0 | 0 | 1 | 27 |
| Ilsley Public Library | WordPress-VT | 20 | 0 | 0 | 0 | 0 | 0 | 20 |
| Putney Public | WordPress-VT | 19 | 0 | 0 | 0 | 0 | 0 | 19 |
| Alice M. Ward Memorial | WordPress-VT | 8 | 1 | 4 | 0 | 0 | 0 | 13 |
| West Hartford | WordPress-VT | 10 | 1 | 0 | 0 | 2 | 0 | 13 |
| Woodbury Community | WordPress-VT | 6 | 0 | 1 | 0 | 0 | 0 | 7 |
| Gilbert Hart | WordPress-VT | 2 | 1 | 1 | 0 | 2 | 0 | 6 |
| Brookfield Free Public | WordPress-VT | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Tunbridge Public | WordPress-VT | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Allentown Public Library | KidsOutAndAbout-DMV | 13 | 0 | 0 | 0 | 0 | 0 | 13 |
| Third Space for Kids | KidsOutAndAbout-DMV | 4 | 0 | 0 | 0 | 0 | 0 | 4 |
| Bender JCC of Greater Washington | KidsOutAndAbout-DMV | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| National Gallery of Art - East Building, 4th Street Northwest, Washington, DC, USA See map: Google Maps | KidsOutAndAbout-DMV | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Third Space for Kids, 7801 Norfolk Avenue suite 200, Bethesda, MD 20814, United States See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Silver Spring Civic Building at Veterans Plaza, 1 Veterans Pl, Silver Spring, MD 20910, United States See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| 2400 East Capitol Street Southeast, Washington, DC, USA See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Sandalwood Lot See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| National Children's Museum | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Frederick | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| City Hall Of Frederick, 101 North Court Street, Frederick, MD 21701, United States See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Boomerang Boat Tours, 3050 K Street Northwest, Washington D.C., DC 20007, United States See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| 735 Water Street Southwest, Washington, DC 20024, United States See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Cox Farms | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Big Bear Marina See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Barracks Row Main Street, 8th Street Southeast, Washington, DC, USA See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Smithsonian's National Air and Space Museum | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| National Law Enforcement Museum, 444 E St NW, Washington D.C., DC 20001, United States See map: Google Maps | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Eastern Market Metro Station | KidsOutAndAbout-DMV | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Port Discovery Children's Museum | PortDiscovery-MD | 13 | 0 | 0 | 0 | 0 | 0 | 13 |
| (40 sites, aggregated) | State-Parks-Events | 105 | 1 | 0 | 4 | 1 | 0 | 111 |
| Wisconsin State Parks | Drupal-Parks | 8 | 0 | 3 | 0 | 0 | 0 | 11 |
| (179 sites, aggregated) | RecDesk-Parks | 1578 | 0 | 92 | 27 | 26 | 6 | 1729 |
| Milwaukee Art Museum | Venue-Events-ScienceArts | 9 | 0 | 0 | 0 | 0 | 0 | 9 |
| NC Museum of Natural Sciences | Venue-Events-ScienceArts | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Academy of Natural Sciences | Venue-Events-ScienceArts | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| Connecticut Science Center | Venue-Events-ScienceArts | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Yale Peabody Museum | Venue-Events-ScienceArts | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Frost Science Museum | Venue-Events-ScienceArts | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Indiana State Museum | Venue-Events-ScienceArts | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Corning Museum of Glass | Venue-Events-ScienceArts | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| (258 sites, aggregated) | FairsFestivals-Eastern | 545 | 36 | 81 | 1 | 17 | 0 | 680 |
| Manchester City Library | LibCal-NH | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| Keene Public Library | LibCal-NH | 4 | 0 | 0 | 1 | 0 | 0 | 5 |
| Hooksett Public Library | LibCal-NH | 3 | 2 | 0 | 0 | 0 | 0 | 5 |
| Lebanon Public Libraries | LibCal-NH | 3 | 1 | 0 | 0 | 0 | 0 | 4 |
| Nashua Public Library | LibCal-NH | 2 | 0 | 0 | 0 | 1 | 0 | 3 |
| Pelham Public Library | LibCal-NH | 1 | 0 | 0 | 0 | 0 | 2 | 3 |
| Hollis Social Library | LibCal-NH | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| Merrimack Public Library | LibCal-NH | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Sharon Forks Library | Communico-NC | 1 | 0 | 0 | 0 | 0 | 1 | 2 |
| Post Road Library | Communico-NC | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Bookmobile | Communico-NC | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| Hampton Park Library | Communico-NC | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| Denmark Library | Communico-NC | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Ferguson Library | LibraryMarket-CT | 6 | 1 | 1 | 0 | 0 | 0 | 8 |
| Beaufort County Library | LibraryMarket-SC | 7 | 1 | 1 | 0 | 0 | 0 | 9 |
| (874 sites, aggregated) | Eventbrite-Family-Eastern | 1374 | 120 | 200 | 17 | 45 | 11 | 1767 |
| (272 sites, aggregated) | KidsOutAndAbout-Eastern | 494 | 44 | 52 | 0 | 16 | 0 | 606 |
| (52 sites, aggregated) | MacaroniKid-DE | 153 | 3 | 12 | 4 | 2 | 0 | 174 |

### Scrapers with zero attributable new events today

These ran today per `scraper-summary.log` but either found 0 new events, or their log-reported "New" events all collided with existing stable IDs (an UPDATE, not an INSERT) so nothing landed with a fresh `created_at` in their window:

- Dorchester-County
- Allentown-Public
- Activities-ChildrensMuseums-DMV
- Activities-GymnasticsCenters-DMV
- Activities-MinigolfBatting-DMV
- Activities-RollerSkating-DMV
- Activities-TrampolineNinja-DMV
- WordPressTec-Parks
- CivicEngage-Libraries
- EventON-Lexington
- Activities-ArtStudios-DMV
- Activities-ClimbingGyms-DMV
- Activities-IceRinks-DMV
- Activities-MovieTheaters-DMV
- Activities-ScienceDiscovery-DMV

### Flagged: All Ages >= 70% (total >= 20 events)

- **Squarespace-Libraries** — Queen Anne's County Library — 100.0% All Ages (23 events)
- **Squarespace-Libraries** — (scraper aggregate) — 100.0% All Ages (23 events)
- **WordPress-MA** — Pelham Library — 100.0% All Ages (26 events)
- **AARecParks-MD** — (scraper aggregate) — 100.0% All Ages (24 events)
- **Orange-County-Library-FL** — Melrose Center — 100.0% All Ages (223 events)
- **Assabet-NH-MA** — Bedford Public Library — 100.0% All Ages (29 events)
- **CivicRec-Parks-Eastern** — Jackson County Parks & Recreation — 100.0% All Ages (115 events)
- **CivicRec-Parks-Eastern** — Nottingham, NH — 100.0% All Ages (24 events)
- **CivicRec-Parks-Eastern** — Nassau County Parks & Recreation — 100.0% All Ages (54 events)
- **CivicRec-Parks-Eastern** — Flagler County Parks & Recreation — 100.0% All Ages (109 events)
- **CivicRec-Parks-Eastern** — DeFuniak Springs, FL — 100.0% All Ages (22 events)
- **CivicRec-Parks-Eastern** — Forsyth County Parks & Recreation — 100.0% All Ages (52 events)
- **CivicRec-Parks-Eastern** — St. Mary's County Recreation — 100.0% All Ages (23 events)
- **CivicRec-Parks-Eastern** — City of Concord Parks & Recreation — 100.0% All Ages (71 events)
- **CivicRec-Parks-Eastern** — City of Gastonia Parks & Recreation — 100.0% All Ages (34 events)
- **CivicRec-Parks-Eastern** — Broome County Parks & Recreation — 100.0% All Ages (94 events)
- **CivicRec-Parks-Eastern** — CRAWFORD-RODRIGUEZ ELEMENTARY SCHOOL — 100.0% All Ages (22 events)
- **CivicRec-Parks-Eastern** — Daviess County Parks & Recreation — 100.0% All Ages (29 events)
- **CivicRec-Parks-Eastern** — Maury County Parks & Recreation — 100.0% All Ages (25 events)
- **CivicRec-Parks-Eastern** — Danville, VA — 100.0% All Ages (40 events)
- **WordPress-GA** — Centerville Branch Library — 100.0% All Ages (105 events)
- **WordPress-GA** — Pelham-Carnegie Library — 100.0% All Ages (25 events)
- **WordPress-GA** — Chattahoochee Valley Regional Library System — 100.0% All Ages (23 events)
- **WordPress-NC** — Saluda Branch Library — 100.0% All Ages (116 events)
- **WordPress-CT** — Harwinton Public Library — 100.0% All Ages (99 events)
- **WordPress-TN** — Hickman County Public Library — 100.0% All Ages (83 events)
- **WordPress-AL** — Wilsonville - Vernice Stoudenmire Library — 100.0% All Ages (54 events)
- **WordPress-AL** — Montgomery City-County Public Library — 100.0% All Ages (27 events)
- **WordPress-VT** — Norman Williams Public Library — 100.0% All Ages (122 events)
- **WordPress-VT** — Ilsley Public Library — 100.0% All Ages (20 events)
- **RecDesk-Parks** — Joseph C. Dotch Community Center & Park — 100.0% All Ages (49 events)
- **RecDesk-Parks** — Connie Hudson Gym — 100.0% All Ages (22 events)
- **RecDesk-Parks** — Hillsdale Community Center & Park — 100.0% All Ages (52 events)
- **RecDesk-Parks** — Robert Hope Community Center — 100.0% All Ages (26 events)
- **RecDesk-Parks** — Springhill Fitness & Community Center — 100.0% All Ages (20 events)
- **RecDesk-Parks** — Stotts Community Center & Park — 100.0% All Ages (26 events)
- **RecDesk-Parks** — Laun Community Center & Park — 100.0% All Ages (47 events)
- **RecDesk-Parks** — Sandymount Field 1 — 100.0% All Ages (30 events)
- **RecDesk-Parks** — Mayeski Legore Memorial Softball Field — 100.0% All Ages (34 events)
- **RecDesk-Parks** — Deer Park Meadow Field — 100.0% All Ages (22 events)
- **RecDesk-Parks** — Mayeski Field 3 Softball with MP Overlay — 100.0% All Ages (52 events)
- **RecDesk-Parks** — Mayeski Field 2 Softball with MP overlay — 100.0% All Ages (32 events)
- **RecDesk-Parks** — Mayeski Field 4 Baseball with MP overlay — 100.0% All Ages (52 events)
- **RecDesk-Parks** — Sheppard Chase Gym (RMC) — 100.0% All Ages (27 events)
- **RecDesk-Parks** — -None Specified- — 100.0% All Ages (31 events)
- **Venue-Events-ScienceArts** — (scraper aggregate) — 100.0% All Ages (20 events)
- **Venue-Events-ZoosAquariums** — Brandywine Zoo — 99.4% All Ages (162 events)
- **WordPress-AL** — Fairhope Public Library — 97.2% All Ages (108 events)
- **Assabet-NH-MA** — Wadleigh Memorial Library — 96.9% All Ages (32 events)
- **WordPress-CT** — Seymour Public Library — 96.7% All Ages (90 events)
- **RecDesk-Parks** — James Seals Community Center & Park — 96.7% All Ages (30 events)
- **WordPress-MA** — Dudley Branch Library — 96.6% All Ages (29 events)
- **WordPress-MA** — Joshua Hyde Public Library — 96.6% All Ages (29 events)
- **WordPress-VT** — Franklin-Grand Isle Bookmobile — 96.3% All Ages (27 events)
- **WordPress-TN** — Seymour Branch Library — 95.9% All Ages (74 events)
- **MacaroniKid-DE** — Claymont Library — 95.8% All Ages (24 events)
- **Assabet-NH-MA** — Lane Memorial Library — 95.5% All Ages (22 events)
- **Orange-County-Library-FL** — Online — 95.4% All Ages (216 events)
- **Venue-Events-ZoosAquariums** — (scraper aggregate) — 95.2% All Ages (271 events)
- **State-Parks-Events** — (scraper aggregate) — 94.6% All Ages (111 events)
- **Patch-Community-Eastern** — (scraper aggregate) — 93.8% All Ages (128 events)
- **WordPress-SC** — (scraper aggregate) — 93.5% All Ages (46 events)
- **Gardens-Nature-Eastern** — (scraper aggregate) — 93.5% All Ages (138 events)
- **Orange-County-Library-FL** — South Trail Branch — 92.2% All Ages (90 events)
- **WordPress-CT** — (scraper aggregate) — 91.6% All Ages (237 events)
- **RecDesk-Parks** — (scraper aggregate) — 91.3% All Ages (1729 events)
- **WordPress-GA** — (scraper aggregate) — 90.5% All Ages (232 events)
- **WordPress-NC** — (scraper aggregate) — 90.5% All Ages (253 events)
- **Assabet-NH-MA** — Kelley Library — 90.0% All Ages (40 events)
- **WordPress-MA** — (scraper aggregate) — 89.0% All Ages (300 events)
- **Orange-County-Library-FL** — Hiawassee Branch — 88.9% All Ages (54 events)
- **Assabet-NH-MA** — Nesmith Library — 88.9% All Ages (27 events)
- **WordPress-VT** — Pierson Library — 88.9% All Ages (36 events)
- **CivicRec-Parks-Eastern** — Huntsville, AL — 88.5% All Ages (26 events)
- **WordPress-NH** — (scraper aggregate) — 88.3% All Ages (77 events)
- **WordPress-VT** — Ainsworth Public — 88.2% All Ages (51 events)
- **MacaroniKid-DE** — (scraper aggregate) — 87.9% All Ages (174 events)
- **Venue-Events-ZoosAquariums** — Virginia Zoo — 87.5% All Ages (72 events)
- **WordPress-AL** — (scraper aggregate) — 87.3% All Ages (370 events)
- **Assabet-NH-MA** — Dover Public Library — 87.0% All Ages (23 events)
- **WordPress-TN** — Baxter Branch Library — 87.0% All Ages (23 events)
- **WordPress-NC** — Robbins Area Branch — 86.4% All Ages (81 events)
- **Assabet-NH-MA** — Malden Public Library — 85.5% All Ages (55 events)
- **CivicRec-Parks-Eastern** — (scraper aggregate) — 84.5% All Ages (1746 events)
- **Orange-County-Library-FL** — Orlando Public Library — 84.2% All Ages (215 events)
- **WordPress-Events-Calendar** — (scraper aggregate) — 84.1% All Ages (138 events)
- **WordPress-Events-Calendar** — Wythe-Grayson Regional Library — 83.9% All Ages (31 events)
- **Orange-County-Library-FL** — West Oaks Branch and Genealogy Center — 83.9% All Ages (62 events)
- **WordPress-PA** — Spalding Memorial Library — 83.3% All Ages (30 events)
- **WordPress-PA** — (scraper aggregate) — 83.0% All Ages (159 events)
- **WordPress-TN** — (scraper aggregate) — 83.0% All Ages (423 events)
- **WordPress-VT** — Brooks Memorial Library — 82.7% All Ages (133 events)
- **CivicRec-Parks-Eastern** — Bluefield, WV — 81.8% All Ages (22 events)
- **Communico-NY** — (scraper aggregate) — 81.6% All Ages (38 events)
- **Orange-County-Library-FL** — (scraper aggregate) — 81.4% All Ages (1697 events)
- **Orange-County-Library-FL** — Washington Park Branch — 81.1% All Ages (37 events)
- **WordPress-WV** — (scraper aggregate) — 80.6% All Ages (31 events)
- **Assabet-NH-MA** — Taunton Public Library — 78.9% All Ages (38 events)
- **Orange-County-Library-FL** — Chickasaw Branch — 78.7% All Ages (75 events)
- **Assabet-NH-MA** — Derry Public Library — 78.3% All Ages (46 events)
- **WordPress-KY** — Kenton County Public Library — 77.8% All Ages (27 events)
- **WordPress-KY** — (scraper aggregate) — 77.3% All Ages (128 events)
- **RecDesk-Parks** — Carroll Gymnastics, Inc. — 77.3% All Ages (22 events)
- **Orange-County-Library-FL** — South Creek Branch — 77.0% All Ages (61 events)
- **WordPress-Events-Calendar** — Pittsylvania County Public Library — 76.7% All Ages (30 events)
- **Assabet-NH-MA** — Leach Library — 75.0% All Ages (36 events)
- **LibCal-NH** — (scraper aggregate) — 75.0% All Ages (28 events)
- **Assabet-NH-MA** — Pollard Memorial Library — 74.8% All Ages (103 events)
- **LibCal-NJ** — BCCLS - Bergen County Cooperative Library System — 74.6% All Ages (1718 events)
- **WordPress-TN** — Germantown Community Library — 74.1% All Ages (54 events)
- **WordPress-AL** — Vestavia Hills Library — 73.6% All Ages (129 events)
- **Orange-County-Library-FL** — Fairview Shores Branch — 73.4% All Ages (64 events)
- **Assabet-NH-MA** — (scraper aggregate) — 72.5% All Ages (988 events)
- **LibCal-NJ** — (scraper aggregate) — 71.8% All Ages (1801 events)
- **Orange-County-Library-FL** — Eatonville Branch — 71.8% All Ages (39 events)
- **Assabet-NH-MA** — Somerville Public Library — 71.8% All Ages (131 events)
- **WordPress-TN** — Chattanooga Public Library — 71.8% All Ages (131 events)
- **WordPress-GA** — Hancock County Library — 71.4% All Ages (21 events)
- **WordPress-NC** — Alleghany County Public Library — 71.4% All Ages (21 events)
- **WordPress-TN** — White County Public Library — 71.4% All Ages (21 events)
- **Orange-County-Library-FL** — Winter Garden Branch — 70.3% All Ages (128 events)
