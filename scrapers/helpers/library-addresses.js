/**
 * LIBRARY ADDRESSES DATABASE
 *
 * Comprehensive library system addresses for backfilling missing event locations
 */

const LIBRARY_ADDRESSES = {
  // Maryland Libraries
  'Allegany County Library System': {
    mainAddress: '31 Washington St, Cumberland, MD 21502',
    branches: {
      'Washington Street Library': '31 Washington St, Cumberland, MD 21502',
      'Washington Street': '31 Washington St, Cumberland, MD 21502',
      'South Cumberland': '100 Seymour St, Cumberland, MD 21502',
      'South Cumberland Library': '100 Seymour St, Cumberland, MD 21502',
      'LaVale': '815 National Hwy, LaVale, MD 21502',
      'LaVale Library': '815 National Hwy, LaVale, MD 21502',
      'Frostburg': '65 E Main St, Frostburg, MD 21532',
      'Frostburg Library': '65 E Main St, Frostburg, MD 21532',
      'Westernport': '66 Main St, Westernport, MD 21562',
      'Westernport Library': '66 Main St, Westernport, MD 21562'
    }
  },

  'Kent County Public Library': {
    mainAddress: '408 High St, Chestertown, MD 21620',
    branches: {
      'Chestertown': '408 High St, Chestertown, MD 21620',
      'Chestertown Branch': '408 High St, Chestertown, MD 21620',
      'North County': '201 Scheeler Rd, Millington, MD 21651',
      'North County Branch': '201 Scheeler Rd, Millington, MD 21651',
      'Rock Hall': '5585 Main St, Rock Hall, MD 21661',
      'Rock Hall Branch': '5585 Main St, Rock Hall, MD 21661',
      'Outreach': '408 High St, Chestertown, MD 21620',
      'Outreach/Off-site': '408 High St, Chestertown, MD 21620'
    }
  },

  'Worcester County Library': {
    mainAddress: '307 N Washington St, Snow Hill, MD 21863',
    branches: {
      'Snow Hill': '307 N Washington St, Snow Hill, MD 21863',
      'Snow Hill Branch': '307 N Washington St, Snow Hill, MD 21863',
      'Berlin': '13 Harrison Ave, Berlin, MD 21811',
      'Berlin Branch': '13 Harrison Ave, Berlin, MD 21811',
      'Ocean City': '10003 Coastal Hwy, Ocean City, MD 21842',
      'Ocean City Branch': '10003 Coastal Hwy, Ocean City, MD 21842',
      'Ocean Pines': '11107 Cathell Rd, Ocean Pines, MD 21811',
      'Ocean Pines Branch': '11107 Cathell Rd, Ocean Pines, MD 21811',
      'Pocomoke': '301 Market St, Pocomoke City, MD 21851',
      'Pocomoke Branch': '301 Market St, Pocomoke City, MD 21851'
    }
  },

  'Ruth Enlow Library of Garrett County': {
    mainAddress: '6 N Second St, Oakland, MD 21550',
    branches: {
      'Oakland': '6 N Second St, Oakland, MD 21550',
      'Oakland Branch': '6 N Second St, Oakland, MD 21550',
      'Accident': '108 S Main St, Accident, MD 21520',
      'Accident Branch': '108 S Main St, Accident, MD 21520',
      'Friendsville': '47 2nd Ave, Friendsville, MD 21531',
      'Friendsville Branch': '47 2nd Ave, Friendsville, MD 21531',
      'Grantsville': '150 Main St, Grantsville, MD 21536',
      'Grantsville Branch': '150 Main St, Grantsville, MD 21536',
      'Kitzmiller': '141 1st St, Kitzmiller, MD 21538',
      'Kitzmiller Branch': '141 1st St, Kitzmiller, MD 21538'
    }
  },

  'Enoch Pratt Free Library': {
    mainAddress: '400 Cathedral Street, Baltimore, MD 21201',
    branches: {
      'Central Library': '400 Cathedral Street, Baltimore, MD 21201',
      'Canton': '1030 S Ellwood Ave, Baltimore, MD 21224',
      'Edmondson Avenue': '4330 Edmondson Ave, Baltimore, MD 21229',
      'Pennsylvania Avenue': '1531 W North Ave, Baltimore, MD 21217',
      'Roland Park': '5108 Roland Ave, Baltimore, MD 21210',
      'Waverly': '400 E 33rd St, Baltimore, MD 21218',
      'Govans': '5714 Bellona Ave, Baltimore, MD 21212',
      'Hampden': '3641 Falls Rd, Baltimore, MD 21211',
      'Patterson Park': '101 S Linwood Ave, Baltimore, MD 21224',
      'Herring Run': '3801 Erdman Ave, Baltimore, MD 21213',
      'Northwood': '4420 Loch Raven Blvd, Baltimore, MD 21218',
      'Orleans Street': '1303 Orleans St, Baltimore, MD 21231',
      'Southeast Anchor': '3601 Eastern Ave, Baltimore, MD 21224',
      'Brooklyn': '3305 Waterview Ave, Baltimore, MD 21230',
      'Light Street': '1230 Light St, Baltimore, MD 21230',
      'Penn-North': '1926 N Charles St, Baltimore, MD 21218',
      'Reisterstown Road': '6310 Reisterstown Rd, Baltimore, MD 21215'
    }
  },

  'Somerset County Library': {
    mainAddress: '11767 Beechwood Street, Princess Anne, MD 21853',
    branches: {
      'Somerset County Library': '11767 Beechwood Street, Princess Anne, MD 21853'
    }
  },

  'Gloucester County Library System': {
    mainAddress: '389 Wolfert Station Road, Mullica Hill, NJ 08062',
    branches: {
      'Logan': '498 Beckett Road, Logan Township, NJ 08085',
      'Mullica Hill': '389 Wolfert Station Road, Mullica Hill, NJ 08062',
      'Newfield': '115 Catawba Avenue, Newfield, NJ 08344',
      'Glassboro': '2 Center Street, Glassboro, NJ 08028',
      'Swedesboro': '1442 Kings Highway, Swedesboro, NJ 08085',
      'Greenwich': '411 Ye Greate Street, Greenwich, NJ 08323'
    }
  },

  'Frederick County Public Libraries': {
    mainAddress: '110 E Patrick St, Frederick, MD 21701',
    branches: {
      'C. Burr Artz Library': '110 E Patrick St, Frederick, MD 21701',
      'Brunswick': '915 N Maple Ave, Brunswick, MD 21716',
      'Brunswick Branch Library': '915 N Maple Ave, Brunswick, MD 21716',
      'Emmitsburg': '300 S Seton Ave, Emmitsburg, MD 21727',
      'Middletown': '10 E Main St, Middletown, MD 21769',
      'Middletown Branch Library': '10 E Main St, Middletown, MD 21769',
      'Urbana Regional': '9020 Amelung Street, Frederick, MD 21704',
      'Walkersville': '8 E Frederick St, Walkersville, MD 21793',
      'Walkersville Branch Library': '8 E Frederick St, Walkersville, MD 21793',
      'Myersville Community Library': '6 W Main St, Myersville, MD 21773'
    }
  },

  'Carroll County Public Library': {
    mainAddress: '50 E Main St, Westminster, MD 21157',
    branches: {
      'Westminster': '50 E Main St, Westminster, MD 21157',
      'Westminster Branch': '50 E Main St, Westminster, MD 21157',
      'Eldersburg': '6400 W Hemlock Dr, Eldersburg, MD 21784',
      'Eldersburg Branch': '6400 W Hemlock Dr, Eldersburg, MD 21784',
      'Finksburg': '2741 Cape Horn Rd, Finksburg, MD 21048',
      'Finksburg Branch': '2741 Cape Horn Rd, Finksburg, MD 21048',
      'Mount Airy': '705 Ridge Ave, Mount Airy, MD 21771',
      'Mount Airy Branch': '705 Ridge Ave, Mount Airy, MD 21771',
      'North Carroll': '2255 Hanover Pike, Hampstead, MD 21074',
      'North Carroll Branch': '2255 Hanover Pike, Hampstead, MD 21074',
      'Taneytown': '10 Grand Dr, Taneytown, MD 21787',
      'Taneytown Branch': '10 Grand Dr, Taneytown, MD 21787',
      'Exploration Commons': '50 E Main St, Westminster, MD 21157',
      'Administrative Offices': '1100 Green Valley Rd, Westminster, MD 21157'
    }
  },

  'Howard County Library System': {
    mainAddress: '10375 Little Patuxent Pkwy, Columbia, MD 21044',
    branches: {
      'Central': '10375 Little Patuxent Pkwy, Columbia, MD 21044',
      'East Columbia': '6600 Cradlerock Way, Columbia, MD 21045',
      'Elkridge': '6540 Washington Blvd, Elkridge, MD 21075',
      'Glenwood': '2350 State Route 97, Cooksville, MD 21723',
      'Miller': '9421 Frederick Rd, Ellicott City, MD 21042',
      'Savage': '9125 Guilford Rd, Columbia, MD 21046'
    }
  },

  'Montgomery County Public Libraries': {
    mainAddress: '21 Maryland Ave, Rockville, MD 20850',
    branches: {
      'Rockville': '21 Maryland Ave, Rockville, MD 20850',
      'Rockville Memorial': '21 Maryland Ave, Rockville, MD 20850',
      'Bethesda': '7400 Arlington Rd, Bethesda, MD 20814',
      'Bethesda Library': '7400 Arlington Rd, Bethesda, MD 20814',
      'Davis': '6400 Democracy Blvd, Bethesda, MD 20817',
      'Davis Library': '6400 Democracy Blvd, Bethesda, MD 20817',
      'Chevy Chase': '8005 Connecticut Ave, Chevy Chase, MD 20815',
      'Chevy Chase Library': '8005 Connecticut Ave, Chevy Chase, MD 20815',
      'Germantown': '19840 Century Blvd, Germantown, MD 20874',
      'Germantown Library': '19840 Century Blvd, Germantown, MD 20874',
      'Gaithersburg': '18330 Montgomery Village Ave, Gaithersburg, MD 20879',
      'Gaithersburg Library': '18330 Montgomery Village Ave, Gaithersburg, MD 20879',
      'Kensington Park': '4201 Knowles Ave, Kensington, MD 20895',
      'Kensington Park Library': '4201 Knowles Ave, Kensington, MD 20895',
      'Long Branch': '8800 Garland Ave, Silver Spring, MD 20901',
      'Long Branch Library': '8800 Garland Ave, Silver Spring, MD 20901',
      'Olney': '3500 Olney-Laytonsville Rd, Olney, MD 20832',
      'Olney Library': '3500 Olney-Laytonsville Rd, Olney, MD 20832',
      'Poolesville': '19633 Fisher Ave, Poolesville, MD 20837',
      'Poolesville Library': '19633 Fisher Ave, Poolesville, MD 20837',
      'Potomac': '10101 Glenolden Dr, Potomac, MD 20854',
      'Potomac Library': '10101 Glenolden Dr, Potomac, MD 20854',
      'Quince Orchard': '15831 Quince Orchard Rd, Gaithersburg, MD 20878',
      'Quince Orchard Library': '15831 Quince Orchard Rd, Gaithersburg, MD 20878',
      'Silver Spring': '900 Wayne Ave, Silver Spring, MD 20910',
      'Silver Spring Library': '900 Wayne Ave, Silver Spring, MD 20910',
      'Twinbrook': '202 Meadow Hall Dr, Rockville, MD 20851',
      'Twinbrook Library': '202 Meadow Hall Dr, Rockville, MD 20851',
      'Wheaton': '11701 Georgia Ave, Wheaton, MD 20902',
      'Wheaton Library': '11701 Georgia Ave, Wheaton, MD 20902',
      'White Oak': '11701 New Hampshire Ave, Silver Spring, MD 20904',
      'White Oak Library': '11701 New Hampshire Ave, Silver Spring, MD 20904',
      'Aspen Hill': '4407 Aspen Hill Rd, Rockville, MD 20853',
      'Aspen Hill Library': '4407 Aspen Hill Rd, Rockville, MD 20853',
      'Damascus': '9701 Main St, Damascus, MD 20872',
      'Damascus Library': '9701 Main St, Damascus, MD 20872',
      'Little Falls': '5501 Massachusetts Ave, Bethesda, MD 20816',
      'Little Falls Library': '5501 Massachusetts Ave, Bethesda, MD 20816',
      'Marilyn Praisner': '14910 Old Columbia Pike, Burtonsville, MD 20866',
      'Marilyn Praisner Library': '14910 Old Columbia Pike, Burtonsville, MD 20866',
      'Noyes': '10237 Carroll Pl, Kensington, MD 20895',
      'Noyes Library': '10237 Carroll Pl, Kensington, MD 20895'
    }
  },

  // DC Public Library
  'DC Public Library': {
    mainAddress: '901 G St NW, Washington, DC 20001',
    branches: {
      'Martin Luther King Jr. Memorial Library': '901 G St NW, Washington, DC 20001',
      'Martin Luther King Jr. Memorial Library - Central Library': '901 G St NW, Washington, DC 20001',
      'Central Library': '901 G St NW, Washington, DC 20001',
      'Mt. Pleasant Neighborhood Library': '3160 16th St NW, Washington, DC 20010',
      'Mt. Pleasant': '3160 16th St NW, Washington, DC 20010',
      'Northwest One Neighborhood Library': '155 L St NW, Washington, DC 20001',
      'Northwest One': '155 L St NW, Washington, DC 20001',
      'Benning Neighborhood Library': '3935 Benning Rd NE, Washington, DC 20019',
      'Benning (Dorothy I. Height) Neighborhood Library': '3935 Benning Rd NE, Washington, DC 20019',
      'Dorothy I. Height': '3935 Benning Rd NE, Washington, DC 20019',
      'Parklands-Turner Neighborhood Library': '1547 Alabama Ave SE, Washington, DC 20032',
      'Parklands-Turner': '1547 Alabama Ave SE, Washington, DC 20032',
      'Anacostia Neighborhood Library': '1800 Good Hope Rd SE, Washington, DC 20020',
      'Anacostia': '1800 Good Hope Rd SE, Washington, DC 20020',
      'Capitol View Neighborhood Library': '5001 Central Ave SE, Washington, DC 20019',
      'Capitol View': '5001 Central Ave SE, Washington, DC 20019',
      'Chevy Chase Neighborhood Library': '5625 Connecticut Ave NW, Washington, DC 20015',
      'Chevy Chase': '5625 Connecticut Ave NW, Washington, DC 20015',
      'Cleveland Park Neighborhood Library': '3310 Connecticut Ave NW, Washington, DC 20008',
      'Cleveland Park': '3310 Connecticut Ave NW, Washington, DC 20008',
      'Deanwood Neighborhood Library': '1350 49th St NE, Washington, DC 20019',
      'Deanwood': '1350 49th St NE, Washington, DC 20019',
      'Francis A. Gregory Neighborhood Library': '3660 Alabama Ave SE, Washington, DC 20020',
      'Francis A. Gregory': '3660 Alabama Ave SE, Washington, DC 20020',
      'Georgetown Neighborhood Library': '3260 R St NW, Washington, DC 20007',
      'Georgetown': '3260 R St NW, Washington, DC 20007',
      'Lamond-Riggs Neighborhood Library': '5401 South Dakota Ave NE, Washington, DC 20011',
      'Lamond-Riggs': '5401 South Dakota Ave NE, Washington, DC 20011',
      'Palisades Neighborhood Library': '4901 V St NW, Washington, DC 20007',
      'Palisades': '4901 V St NW, Washington, DC 20007',
      'Petworth Neighborhood Library': '4200 Kansas Ave NW, Washington, DC 20011',
      'Petworth': '4200 Kansas Ave NW, Washington, DC 20011',
      'Rosedale Neighborhood Library': '1701 Gales St NE, Washington, DC 20002',
      'Rosedale': '1701 Gales St NE, Washington, DC 20002',
      'Shaw Neighborhood Library': '1630 7th St NW, Washington, DC 20001',
      'Shaw': '1630 7th St NW, Washington, DC 20001',
      'Southwest Neighborhood Library': '900 Wesley Pl SW, Washington, DC 20024',
      'Southwest': '900 Wesley Pl SW, Washington, DC 20024',
      'Takoma Park Neighborhood Library': '416 Cedar St NW, Washington, DC 20012',
      'Takoma Park': '416 Cedar St NW, Washington, DC 20012',
      'Tenley-Friendship Neighborhood Library': '4450 Wisconsin Ave NW, Washington, DC 20016',
      'Tenley-Friendship': '4450 Wisconsin Ave NW, Washington, DC 20016',
      'Watha T. Daniel/Shaw Library': '1630 7th St NW, Washington, DC 20001',
      'Watha T. Daniel': '1630 7th St NW, Washington, DC 20001',
      'Woodridge Neighborhood Library': '1801 Hamlin St NE, Washington, DC 20018',
      'Woodridge': '1801 Hamlin St NE, Washington, DC 20018',
      'Virtual Program': '901 G St NW, Washington, DC 20001',
      'Online': '901 G St NW, Washington, DC 20001',
      'Library Closed': '901 G St NW, Washington, DC 20001'
    }
  },

  // Virginia Libraries
  // Note: Gloucester County Library System exists in both VA and NJ
  // The NJ one is under 'Gloucester County Library System' (mainAddress in Mullica Hill, NJ)
  // This VA one has a different entry name to disambiguate
  'Gloucester County Library System VA': {
    mainAddress: '6920 Main St, Gloucester, VA 23061',
    branches: {
      'Main': '6920 Main St, Gloucester, VA 23061',
      'Gloucester': '6920 Main St, Gloucester, VA 23061',
      'Gloucester Point': '7609 Terrapin Cove Rd, Gloucester Point, VA 23062',
      'Point': '7609 Terrapin Cove Rd, Gloucester Point, VA 23062'
    }
  },

  'Portsmouth Public Library': {
    mainAddress: '601 Court St, Portsmouth, VA 23704',
    branches: {
      'Main': '601 Court St, Portsmouth, VA 23704'
    }
  },

  'Poquoson Public Library': {
    mainAddress: '500 City Hall Ave, Poquoson, VA 23662',
    branches: {
      'Main': '500 City Hall Ave, Poquoson, VA 23662'
    }
  },

  'Handley Regional Library': {
    mainAddress: '100 W Piccadilly St, Winchester, VA 22601',
    branches: {
      'Handley': '100 W Piccadilly St, Winchester, VA 22601',
      'Handley Library': '100 W Piccadilly St, Winchester, VA 22601',
      'Bowman': '871 Tasker Rd, Stephens City, VA 22655',
      'Bowman Library': '871 Tasker Rd, Stephens City, VA 22655',
      'Bowman Branch': '871 Tasker Rd, Stephens City, VA 22655'
    }
  },

  'Bedford Public Library System': {
    mainAddress: '321 N Bridge St, Bedford, VA 24523',
    branches: {
      'Main Library': '321 N Bridge St, Bedford, VA 24523',
      'Forest': '15583 Forest Rd, Forest, VA 24551'
    }
  },

  'Appomattox Regional Library': {
    mainAddress: '209 E Cawson St, Hopewell, VA 23860',
    branches: {
      'Appomattox': '209 E Cawson St, Hopewell, VA 23860',
      'Hopewell': '209 E Cawson St, Hopewell, VA 23860',
      'Hopewell Library': '209 E Cawson St, Hopewell, VA 23860',
      'Petersburg': '137 S Sycamore St, Petersburg, VA 23803',
      'Prince George': '6605 Courts Dr, Prince George, VA 23875'
    }
  },

  'Waynesboro Public Library': {
    mainAddress: '600 S Wayne Ave, Waynesboro, VA 22980',
    branches: {
      'Main': '600 S Wayne Ave, Waynesboro, VA 22980'
    }
  },

  'Williamsburg Regional Library': {
    mainAddress: '515 Scotland St, Williamsburg, VA 23185',
    branches: {
      'Williamsburg': '515 Scotland St, Williamsburg, VA 23185',
      'James City County': '7770 Croaker Rd, Williamsburg, VA 23188',
      'Stryker Center': '412 N Boundary St, Williamsburg, VA 23185'
    }
  },

  'Loudoun County Public Library': {
    mainAddress: '1000 Volunteer Way, Leesburg, VA 20175',
    branches: {
      'Sterling': '120 Enterprise St, Sterling, VA 20164',
      'Cascades': '21030 Whitfield Pl, Sterling, VA 20165',
      'Gum Spring': '24600 Millstream Dr, Aldie, VA 20105',
      'Leesburg': '1000 Volunteer Way, Leesburg, VA 20175',
      'Purcellville': '220 E Main St, Purcellville, VA 20132',
      'Rust': '380 Old Waterford Rd NW, Leesburg, VA 20176'
    }
  },

  'Orange County Public Library': {
    mainAddress: '146 Madison Rd, Orange, VA 22960',
    branches: {
      'Main': '146 Madison Rd, Orange, VA 22960'
    }
  },

  // Pennsylvania Libraries
  'Allentown Public Library': {
    mainAddress: '1210 Hamilton St, Allentown, PA 18102',
    branches: {
      'Main': '1210 Hamilton St, Allentown, PA 18102'
    }
  },

  // Delaware Libraries
  'Delaware Libraries': {
    mainAddress: '121 Martin Luther King Jr Blvd N, Dover, DE 19901',
    branches: {
      'Dover Public Library': '35 E Loockerman St, Dover, DE 19901',
      'Lewes Public Library': '111 Adams Ave, Lewes, DE 19958',
      'Rehoboth Beach Public Library': '226 Rehoboth Ave, Rehoboth Beach, DE 19971',
      'Georgetown': '123 W Pine St, Georgetown, DE 19947'
    }
  },

  'Talbot County Free Library': {
    mainAddress: '100 W Dover St, Easton, MD 21601',
    branches: {
      'Easton': '100 W Dover St, Easton, MD 21601',
      'Main Library': '100 W Dover St, Easton, MD 21601',
      'St. Michaels': '106 Fremont St, St. Michaels, MD 21663',
      'Trappe': '3750 Schoolhouse Ln, Trappe, MD 21673'
    }
  },

  'Caroline County Public Library': {
    mainAddress: '100 Market St, Denton, MD 21629',
    branches: {
      'Denton': '100 Market St, Denton, MD 21629',
      'Central Branch Denton': '100 Market St, Denton, MD 21629',
      'Federalsburg': '213 N Main St, Federalsburg, MD 21632',
      'Ridgely': '406 Central Ave, Ridgely, MD 21660'
    }
  },

  'Lynchburg Public Library': {
    mainAddress: '2315 Memorial Ave, Lynchburg, VA 24501',
    branches: {
      'Main Library': '2315 Memorial Ave, Lynchburg, VA 24501',
      'Central': '2315 Memorial Ave, Lynchburg, VA 24501'
    }
  },

  'York County Public Library': {
    mainAddress: '8500 George Washington Memorial Hwy, Yorktown, VA 23692',
    branches: {
      'Yorktown': '8500 George Washington Memorial Hwy, Yorktown, VA 23692',
      'Tabb': '321 Goodwin Neck Rd, Yorktown, VA 23693',
      'Tabb Library': '321 Goodwin Neck Rd, Yorktown, VA 23693'
    }
  },

  'Calvert Library': {
    mainAddress: '850 Costley Way, Prince Frederick, MD 20678',
    branches: {
      'Prince Frederick': '850 Costley Way, Prince Frederick, MD 20678',
      'Calvert Library': '850 Costley Way, Prince Frederick, MD 20678'
    }
  },

  'Baltimore County Public Library': {
    mainAddress: '320 York Rd, Towson, MD 21204',
    branches: {
      'Towson': '320 York Rd, Towson, MD 21204',
      'Arbutus': '855 Sulphur Spring Rd, Arbutus, MD 21227',
      'Catonsville': '1100 Frederick Rd, Catonsville, MD 21228',
      'Cockeysville': '9833 Greenside Dr, Cockeysville, MD 21030',
      'Essex': '1110 Eastern Blvd, Essex, MD 21221',
      'Loch Raven': '1046 Taylor Ave, Towson, MD 21286',
      'Parkville': '8507 Harford Rd, Parkville, MD 21234',
      'Perry Hall': '9685 Honeygo Blvd, Perry Hall, MD 21128',
      'Pikesville': '1301 Reisterstown Rd, Pikesville, MD 21208',
      'Randallstown': '8604 Liberty Rd, Randallstown, MD 21133',
      'Reisterstown': '21 Cockeys Mill Rd, Reisterstown, MD 21136',
      'Rosedale': '6105 Kenwood Ave, Rosedale, MD 21237',
      'White Marsh': '8133 Sandpiper Cir, White Marsh, MD 21162',
      'Woodlawn': '1811 Woodlawn Dr, Woodlawn, MD 21207'
    }
  },

  // Colorado Libraries
  'Pikes Peak Library District': {
    mainAddress: '20 N Cascade Ave, Colorado Springs, CO 80903',
    branches: {
      'Penrose': '20 N Cascade Ave, Colorado Springs, CO 80903',
      'East': '5550 N Union Blvd, Colorado Springs, CO 80918',
      'Library 21c': '1175 Chapel Hills Dr, Colorado Springs, CO 80920',
      'Monument': '1706 Lake Woodmoor Dr, Monument, CO 80132',
      'Calhan': '600 Bank St, Calhan, CO 80808',
      'Fountain': '230 S Main St, Fountain, CO 80817',
      'Manitou Springs': '515 Manitou Ave, Manitou Springs, CO 80829',
      'Old Colorado City': '2418 W Pikes Peak Ave, Colorado Springs, CO 80904',
      'Ruth Holley': '685 N Murray Blvd, Colorado Springs, CO 80915',
      'Sand Creek': '1821 S Academy Blvd, Colorado Springs, CO 80916',
      'Cheyenne Mountain': '1785 S 8th St, Colorado Springs, CO 80905',
      'High Prairie': '7035 Meridian Rd, Peyton, CO 80831'
    }
  },

  'Arapahoe Libraries': {
    mainAddress: '12855 E Adam Aircraft Cir, Englewood, CO 80112',
    branches: {
      'Koelbel': '5955 S Holly St, Centennial, CO 80121',
      'Castlewood': '6739 S Uinta St, Centennial, CO 80112',
      'Smoky Hill': '5430 S Biscay Cir, Centennial, CO 80015',
      'Eloise May': '1471 S Parker Rd, Denver, CO 80231',
      'Southglenn': '6972 S Vine St, Centennial, CO 80122',
      'Davies': '1750 E Quincy Ave, Englewood, CO 80110',
      'Sheridan': '4101 S Federal Blvd, Englewood, CO 80110'
    }
  },

  // Pennsylvania Libraries (York County area)
  'Paul Smith Library': {
    mainAddress: '80 Constitution Ave, Lewisberry, PA 17339',
    branches: {
      'Main': '80 Constitution Ave, Lewisberry, PA 17339'
    }
  },

  'Red Land Community Library': {
    mainAddress: '48 Robin Hood Dr, Etters, PA 17319',
    branches: {
      'Main': '48 Robin Hood Dr, Etters, PA 17319'
    }
  },

  // Texas Libraries
  'Manvel Library': {
    mainAddress: '20514 TX-6, Manvel, TX 77578',
    branches: {
      'Main': '20514 TX-6, Manvel, TX 77578'
    }
  },

  // Indiana Libraries
  'Willard Library': {
    mainAddress: '21 First Ave, Evansville, IN 47710',
    branches: {
      'Main': '21 First Ave, Evansville, IN 47710',
      'Park': '21 First Ave, Evansville, IN 47710'
    }
  },

  // Wisconsin Libraries
  'Pine River Library': {
    mainAddress: '395 Benton St, Poy Sippi, WI 54967',
    branches: {
      'Main': '395 Benton St, Poy Sippi, WI 54967'
    }
  },

  // Philadelphia Libraries
  'Fox Chase Library': {
    mainAddress: '501 Rhawn St, Philadelphia, PA 19111',
    branches: {
      'Main': '501 Rhawn St, Philadelphia, PA 19111'
    }
  },

  'Bustleton Library': {
    mainAddress: '10199 Bustleton Ave, Philadelphia, PA 19116',
    branches: {
      'Main': '10199 Bustleton Ave, Philadelphia, PA 19116'
    }
  },

  // Virginia Libraries - Additional
  'Blue Ridge Regional Library': {
    mainAddress: '310 E Church St, Martinsville, VA 24112',
    branches: {
      'Martinsville': '310 E Church St, Martinsville, VA 24112',
      'Martinsville Library': '310 E Church St, Martinsville, VA 24112',
      'Bassett': '3969 Fairystone Park Hwy, Bassett, VA 24055',
      'Bassett Library': '3969 Fairystone Park Hwy, Bassett, VA 24055',
      'Collinsville': '2615 Virginia Ave, Collinsville, VA 24078',
      'Collinsville Library': '2615 Virginia Ave, Collinsville, VA 24078',
      'Patrick County': '116 W Blue Ridge St, Stuart, VA 24171',
      'Patrick County Library': '116 W Blue Ridge St, Stuart, VA 24171',
      'Ridgeway': '900 Greensboro Rd, Ridgeway, VA 24148',
      'Ridgeway Library': '900 Greensboro Rd, Ridgeway, VA 24148'
    }
  },

  'Rockbridge Regional Library': {
    mainAddress: '138 S Main St, Lexington, VA 24450',
    branches: {
      'Lexington': '138 S Main St, Lexington, VA 24450',
      'Rockbridge Regional Library - Lexington': '138 S Main St, Lexington, VA 24450',
      'Glasgow': '1413 Blue Ridge Rd, Glasgow, VA 24555',
      'Rockbridge Regional Library - Glasgow': '1413 Blue Ridge Rd, Glasgow, VA 24555',
      'Buena Vista': '2110 Magnolia Ave, Buena Vista, VA 24416',
      'Rockbridge Regional Library - Buena Vista': '2110 Magnolia Ave, Buena Vista, VA 24416',
      'Bath County': '91 Courthouse Hill Rd, Warm Springs, VA 24484',
      'Rockbridge Regional Library - Bath County': '91 Courthouse Hill Rd, Warm Springs, VA 24484',
      'Goshen': '13 W Main St, Goshen, VA 24439',
      'Rockbridge Regional Library - Goshen': '13 W Main St, Goshen, VA 24439',
      'Bookmobile': '138 S Main St, Lexington, VA 24450',
      'Rockbridge Regional Library - Bookmobile': '138 S Main St, Lexington, VA 24450'
    }
  },

  'Jefferson-Madison Regional Library': {
    mainAddress: '201 E Market St, Charlottesville, VA 22902',
    branches: {
      'Central': '201 E Market St, Charlottesville, VA 22902',
      'Central Library': '201 E Market St, Charlottesville, VA 22902',
      'Gordon Avenue': '1500 Gordon Ave, Charlottesville, VA 22903',
      'Gordon Avenue Library': '1500 Gordon Ave, Charlottesville, VA 22903',
      'Northside': '705 Rio Rd W, Charlottesville, VA 22901',
      'Northside Library': '705 Rio Rd W, Charlottesville, VA 22901',
      'Scottsville': '330 Bird St, Scottsville, VA 24590',
      'Scottsville Library': '330 Bird St, Scottsville, VA 24590',
      'Crozet': '2020 Crozet Ave, Crozet, VA 22932',
      'Crozet Library': '2020 Crozet Ave, Crozet, VA 22932',
      'Greene County': '8505 Seminole Trail, Ruckersville, VA 22968',
      'Greene County Library': '8505 Seminole Trail, Ruckersville, VA 22968',
      'Louisa County': '110 Industrial Dr, Mineral, VA 23117',
      'Louisa County Library': '110 Industrial Dr, Mineral, VA 23117',
      'Nelson Memorial': '8521 Thomas Nelson Hwy, Lovingston, VA 22949',
      'Nelson Memorial Library': '8521 Thomas Nelson Hwy, Lovingston, VA 22949'
    }
  },

  'Massanutten Regional Library': {
    mainAddress: '174 S Main St, Harrisonburg, VA 22801',
    branches: {
      'Central': '174 S Main St, Harrisonburg, VA 22801',
      'Central Library': '174 S Main St, Harrisonburg, VA 22801',
      'Bridgewater': '123 N Main St, Bridgewater, VA 22812',
      'Broadway': '149 S Main St, Broadway, VA 22815',
      'Elkton': '140 W Spotswood Ave, Elkton, VA 22827',
      'Grottoes': '805 Dogwood Ave, Grottoes, VA 24441',
      'Page Valley': '67 Court St, Luray, VA 22835',
      'Shenandoah': '514 8th St, Shenandoah, VA 22849'
    }
  },

  'Fauquier County Public Library': {
    mainAddress: '11 Winchester St, Warrenton, VA 20186',
    branches: {
      'Warrenton': '11 Winchester St, Warrenton, VA 20186',
      'Bealeton': '10877 Marsh Rd, Bealeton, VA 22712'
    }
  },

  // South Carolina Libraries
  'Horry County Memorial Library': {
    mainAddress: '801 Main St, Conway, SC 29526',
    branches: {
      'Conway': '801 Main St, Conway, SC 29526',
      'Conway Library': '801 Main St, Conway, SC 29526',
      'Surfside Beach': '410 Surfside Dr, Surfside Beach, SC 29575',
      'Surfside Beach Library': '410 Surfside Dr, Surfside Beach, SC 29575',
      'Socastee': '141 SC-707, Myrtle Beach, SC 29588',
      'Socastee Library': '141 SC-707, Myrtle Beach, SC 29588',
      'Little River': '107 State Hwy 57 N, Little River, SC 29566',
      'Little River Library': '107 State Hwy 57 N, Little River, SC 29566',
      'North Myrtle Beach': '910 1st Ave S, North Myrtle Beach, SC 29582',
      'North Myrtle Beach Library': '910 1st Ave S, North Myrtle Beach, SC 29582',
      'Green Sea Floyds': '5331 SC-9, Green Sea, SC 29545',
      'Green Sea Floyds Library': '5331 SC-9, Green Sea, SC 29545',
      'Carolina Forest': '2250 Carolina Forest Blvd, Myrtle Beach, SC 29579',
      'Carolina Forest Library': '2250 Carolina Forest Blvd, Myrtle Beach, SC 29579',
      'Bucksport': '7657 US-701, Conway, SC 29527',
      'Bucksport Library': '7657 US-701, Conway, SC 29527'
    }
  },

  'York County Library': {
    mainAddress: '138 E Black St, Rock Hill, SC 29730',
    branches: {
      'Main Library': '138 E Black St, Rock Hill, SC 29730',
      'Main Library (Rock Hill)': '138 E Black St, Rock Hill, SC 29730',
      'Fort Mill': '175 Tom Hall St, Fort Mill, SC 29715',
      'Fort Mill Library': '175 Tom Hall St, Fort Mill, SC 29715',
      'Clover': '617 Bethel St, Clover, SC 29710',
      'Clover Library': '617 Bethel St, Clover, SC 29710',
      'Lake Wylie': '190 Latitude Ln, Lake Wylie, SC 29710',
      'Lake Wylie Library': '190 Latitude Ln, Lake Wylie, SC 29710',
      'Outreach Sprinter Van': '138 E Black St, Rock Hill, SC 29730'
    }
  },

  // Maryland Libraries - Additional
  "Queen Anne's County Library": {
    mainAddress: '121 S Commerce St, Centreville, MD 21617',
    branches: {
      'Centreville': '121 S Commerce St, Centreville, MD 21617',
      'Kent Island': '200 Library Cir, Stevensville, MD 21666',
      'Kent Island Branch': '200 Library Cir, Stevensville, MD 21666'
    }
  },

  'Washington County Free Library': {
    mainAddress: '100 S Potomac St, Hagerstown, MD 21740',
    branches: {
      'Main': '100 S Potomac St, Hagerstown, MD 21740',
      'Williamsport': '1 N Conococheague St, Williamsport, MD 21795',
      'Williamsport Memorial Library': '1 N Conococheague St, Williamsport, MD 21795',
      'Smithsburg': '66 Water St, Smithsburg, MD 21783',
      'Boonsboro': '401 Potomac St, Boonsboro, MD 21713',
      'Hancock': '300 Main St, Hancock, MD 21750',
      'Sharpsburg': '106 E Main St, Sharpsburg, MD 21782'
    }
  },

  // North Carolina Libraries
  'Forsyth County Public Library': {
    mainAddress: '660 W 5th St, Winston-Salem, NC 27101',
    branches: {
      'Central': '660 W 5th St, Winston-Salem, NC 27101',
      'Clemmons': '3554 Clemmons Rd, Clemmons, NC 27012',
      'Clemmons Branch': '3554 Clemmons Rd, Clemmons, NC 27012',
      'Kernersville': '130 E Mountain St, Kernersville, NC 27284',
      'Lewisville': '9525 Shallowford Rd, Lewisville, NC 27023',
      'Paddison Memorial': '6520 Glenmont Dr, Winston-Salem, NC 27105',
      'Paddison Memorial Branch': '6520 Glenmont Dr, Winston-Salem, NC 27105',
      'Rural Hall': '8490 Broad St, Rural Hall, NC 27045',
      'Southside': '3185 Buchanan St, Winston-Salem, NC 27127',
      'Walkertown': '2941 Main St, Walkertown, NC 27051',
      'Walkertown Branch': '2941 Main St, Walkertown, NC 27051'
    }
  },

  'Cumberland County Public Library': {
    mainAddress: '300 Maiden Ln, Fayetteville, NC 28301',
    branches: {
      'Headquarters': '300 Maiden Ln, Fayetteville, NC 28301',
      'Cliffdale Regional': '6882 Cliffdale Rd, Fayetteville, NC 28314',
      'Cliffdale Regional Library': '6882 Cliffdale Rd, Fayetteville, NC 28314',
      'East Regional': '4809 Clinton Rd, Fayetteville, NC 28312',
      'Hope Mills': '3601 Golfview Rd, Hope Mills, NC 28348',
      'North Regional': '855 McArthur Rd, Fayetteville, NC 28311',
      'Spring Lake Community': '101 Laketree Blvd, Spring Lake, NC 28390',
      'Spring Lake Community Library': '101 Laketree Blvd, Spring Lake, NC 28390',
      'West Regional': '7469 Century Cir, Fayetteville, NC 28314'
    }
  },

  // New Jersey Libraries - Additional
  'Morris County Library': {
    mainAddress: '30 E Hanover Ave, Whippany, NJ 07981',
    branches: {
      'Main': '30 E Hanover Ave, Whippany, NJ 07981',
      'Whippany': '30 E Hanover Ave, Whippany, NJ 07981'
    }
  },

  'Atlantic County Library System': {
    mainAddress: '40 Farragut Ave, Mays Landing, NJ 08330',
    branches: {
      'Main': '40 Farragut Ave, Mays Landing, NJ 08330',
      'Mays Landing': '40 Farragut Ave, Mays Landing, NJ 08330',
      'Galloway Township': '306 E Jimmie Leeds Rd, Galloway, NJ 08205',
      'Egg Harbor City': '134 Philadelphia Ave, Egg Harbor City, NJ 08215',
      'Hammonton': '451 S Egg Harbor Rd, Hammonton, NJ 08037',
      'Pleasantville': '33 Martin Luther King Jr Ave, Pleasantville, NJ 08232',
      'Somers Point': '801 Shore Rd, Somers Point, NJ 08244',
      'Brigantine': '201 15th St S, Brigantine, NJ 08203',
      'Ventnor': '6500 Atlantic Ave, Ventnor City, NJ 08406'
    }
  },

  // New York Libraries - Additional
  'Rochester Public Library': {
    mainAddress: '115 South Ave, Rochester, NY 14604',
    branches: {
      'Central': '115 South Ave, Rochester, NY 14604',
      'Arnett': '310 Arnett Blvd, Rochester, NY 14619',
      'Charlotte': '3557 Lake Ave, Rochester, NY 14612',
      'Lincoln': '851 Joseph Ave, Rochester, NY 14621',
      'Maplewood': '1111 Dewey Ave, Rochester, NY 14613',
      'Monroe': '809 Monroe Ave, Rochester, NY 14607',
      'Phillis Wheatley': '33 Dr Samuel McCree Way, Rochester, NY 14608',
      'Sully': '530 Webster Ave, Rochester, NY 14609',
      'Winton': '611 Winton Rd N, Rochester, NY 14609'
    }
  },

  // California Libraries - Additional
  'Los Angeles Public Library': {
    mainAddress: '630 W 5th St, Los Angeles, CA 90071',
    branches: {
      'Central': '630 W 5th St, Los Angeles, CA 90071',
      'Central Library': '630 W 5th St, Los Angeles, CA 90071'
    }
  },

  'San Antonio Public Library': {
    mainAddress: '600 Soledad St, San Antonio, TX 78205',
    branches: {
      'Central': '600 Soledad St, San Antonio, TX 78205',
      'Central Library': '600 Soledad St, San Antonio, TX 78205',
      'Johnston': '6307 Sun Valley Dr, San Antonio, TX 78227',
      'Johnston Library': '6307 Sun Valley Dr, San Antonio, TX 78227',
      'Igo': '13330 Kyle Seale Pkwy, San Antonio, TX 78249',
      'Igo Library': '13330 Kyle Seale Pkwy, San Antonio, TX 78249',
      'Thousand Oaks': '4618 Thousand Oaks Dr, San Antonio, TX 78233',
      'Thousand Oaks Library': '4618 Thousand Oaks Dr, San Antonio, TX 78233'
    }
  },

  // Virginia - Additional
  'Petersburg Public Library': {
    mainAddress: '201 W Washington St, Petersburg, VA 23803',
    branches: {
      'Main': '201 W Washington St, Petersburg, VA 23803'
    }
  },

  // Kansas Libraries
  'Tonganoxie Public Library': {
    mainAddress: '303 Bury St, Tonganoxie, KS 66086',
    branches: {
      'Main': '303 Bury St, Tonganoxie, KS 66086'
    }
  },

  // Pennsylvania Libraries
  'Berks County Public Libraries': {
    mainAddress: '100 S Fifth St, Reading, PA 19602',
    branches: {
      'Main Library': '100 S Fifth St, Reading, PA 19602',
      'Reading Public Library': '100 S Fifth St, Reading, PA 19602',
      'Northeast Branch': '1348 North 11th Street, Reading, PA 19604',
      'Northwest Branch': '901 Schuylkill Avenue, Reading, PA 19601',
      'Southeast Branch': '1426 Perkiomen Avenue, Reading, PA 19602',
      'Wyomissing Public Library': '9 Reading Blvd, Wyomissing, PA 19610',
      'Boyertown Community Library': '24 N Reading Ave, Boyertown, PA 19512',
      'Kutztown Community Library': '70 Bieber Alley, Kutztown, PA 19530',
      'Hamburg Public Library': '35 N Third St, Hamburg, PA 19526',
      'Fleetwood Area Public Library': '110 W Arch St, Fleetwood, PA 19522',
      'Exeter Community Library': '4569 Prestwick Dr, Reading, PA 19606',
      'Muhlenberg Community Library': '3612 Kutztown Rd, Laureldale, PA 19605',
      'Spring Township Library': '78 W Cacoosing Ave, Sinking Spring, PA 19608',
      'Sinking Spring Public Library': '3940 Penn Ave, Sinking Spring, PA 19608',
      'West Lawn-Wyomissing Hills Library': '101 Woodside Ave, West Lawn, PA 19609',
      'Mifflin Community Library': '6 Philadelphia Ave, Shillington, PA 19607',
      'Schuylkill Valley Community Library': '38 Main St, Leesport, PA 19533',
      'Robesonia Community Library': '75 S Brooke St, Robesonia, PA 19551',
      'Wernersville Public Library': '100 N Reber St, Wernersville, PA 19565',
      'Bernville Area Community Library': '6721 Bernville Rd, Bernville, PA 19506',
      'Bethel-Tulpehocken Public Library': '8601 Lancaster Ave, Bethel, PA 19507',
      'Brandywine Community Library': '60 N Main St, Topton, PA 19562',
      'Boone Area Library': '129 S Brobst St, Birdsboro, PA 19508',
      'Village Library': '210 Main St, Morgantown, PA 19543',
      'Womelsdorf Community Library': '203 W High St, Womelsdorf, PA 19567'
    }
  },

  // Connecticut Libraries
  'Bridgeport Public Library': {
    mainAddress: '925 Broad Street, Bridgeport, CT 06604',
    branches: {
      'Burroughs-Saden Main Library': '925 Broad Street, Bridgeport, CT 06604',
      'Burroughs-Saden': '925 Broad Street, Bridgeport, CT 06604',
      'Main Library': '925 Broad Street, Bridgeport, CT 06604',
      'Beardsley Branch Library': '2536 East Main Street, Bridgeport, CT 06610',
      'Beardsley Branch': '2536 East Main Street, Bridgeport, CT 06610',
      'Beardsley': '2536 East Main Street, Bridgeport, CT 06610',
      'Black Rock Branch Library': '2705 Fairfield Ave, Bridgeport, CT 06605',
      'Black Rock Branch': '2705 Fairfield Ave, Bridgeport, CT 06605',
      'Black Rock': '2705 Fairfield Ave, Bridgeport, CT 06605',
      'East Side Branch Library': '1174 East Main Street, Bridgeport, CT 06608',
      'East Side Branch': '1174 East Main Street, Bridgeport, CT 06608',
      'East Side': '1174 East Main Street, Bridgeport, CT 06608',
      'Newfield Branch Library': '755 Central Ave, Bridgeport, CT 06607',
      'Newfield Branch': '755 Central Ave, Bridgeport, CT 06607',
      'Newfield': '755 Central Ave, Bridgeport, CT 06607',
      'North Branch Library': '3455 Madison Ave, Bridgeport, CT 06606',
      'North Branch': '3455 Madison Ave, Bridgeport, CT 06606',
      'North': '3455 Madison Ave, Bridgeport, CT 06606'
    }
  },

  'New Haven Free Public Library': {
    mainAddress: '133 Elm St, New Haven, CT 06510',
    branches: {
      'Ives Main Library': '133 Elm St, New Haven, CT 06510',
      'Ives Main': '133 Elm St, New Haven, CT 06510',
      'Ives Rotunda': '133 Elm St, New Haven, CT 06510',
      'Ives Children\'s Program Room': '133 Elm St, New Haven, CT 06510',
      'Ives Performing Arts Space': '133 Elm St, New Haven, CT 06510',
      'Ives Teen Center': '133 Elm St, New Haven, CT 06510',
      'Fair Haven Branch': '182 Grand Ave, New Haven, CT 06513',
      'Fair Haven': '182 Grand Ave, New Haven, CT 06513',
      'Fair Haven Program Room': '182 Grand Ave, New Haven, CT 06513',
      'Fair Haven Main Floor': '182 Grand Ave, New Haven, CT 06513',
      'Mitchell Branch': '37 Harrison St, New Haven, CT 06515',
      'Mitchell': '37 Harrison St, New Haven, CT 06515',
      'Mitchell Program Room': '37 Harrison St, New Haven, CT 06515',
      'Wilson Branch': '303 Washington Ave, New Haven, CT 06519',
      'Wilson': '303 Washington Ave, New Haven, CT 06519',
      'Wilson Community Program Room': '303 Washington Ave, New Haven, CT 06519',
      'Stetson Branch': '197 Dixwell Ave, New Haven, CT 06511',
      'Stetson': '197 Dixwell Ave, New Haven, CT 06511'
    }
  },

  // Massachusetts Libraries
  'Newton Free Library': {
    mainAddress: '330 Homer St, Newton Centre, MA 02459',
    branches: {
      'Newton Free Library': '330 Homer St, Newton Centre, MA 02459',
      'Main Library': '330 Homer St, Newton Centre, MA 02459',
      'Children\'s Room': '330 Homer St, Newton Centre, MA 02459',
      'Children\'s Program Room': '330 Homer St, Newton Centre, MA 02459',
      'Meeting Room': '330 Homer St, Newton Centre, MA 02459',
      'Druker Auditorium': '330 Homer St, Newton Centre, MA 02459',
      'Community Room': '330 Homer St, Newton Centre, MA 02459'
    }
  },

  'Brookline Public Library': {
    mainAddress: '361 Washington St, Brookline, MA 02445',
    branches: {
      'Main Library': '361 Washington St, Brookline, MA 02445',
      'Brookline Village': '361 Washington St, Brookline, MA 02445',
      'Brookline Village Branch': '361 Washington St, Brookline, MA 02445',
      'Coolidge Corner': '31 Pleasant St, Brookline, MA 02446',
      'Coolidge Corner Branch': '31 Pleasant St, Brookline, MA 02446',
      'Meeting Room - Coolidge Corner': '31 Pleasant St, Brookline, MA 02446',
      'Putterham': '959 West Roxbury Pkwy, Chestnut Hill, MA 02467',
      'Putterham Branch': '959 West Roxbury Pkwy, Chestnut Hill, MA 02467',
      'Meeting Room - Putterham': '959 West Roxbury Pkwy, Chestnut Hill, MA 02467',
      'Hunneman Hall': '361 Washington St, Brookline, MA 02445',
      'Children\'s Room': '361 Washington St, Brookline, MA 02445',
      'Children\'s Program Room': '361 Washington St, Brookline, MA 02445'
    }
  },

  // New York Libraries
  'Buffalo & Erie County Public Library': {
    mainAddress: '1 Lafayette Square, Buffalo, NY 14203',
    branches: {
      'Central Library': '1 Lafayette Square, Buffalo, NY 14203',
      'Central': '1 Lafayette Square, Buffalo, NY 14203',
      'Alden Ewell Free Library': '13280 Broadway, Alden, NY 14004',
      'Alden Ewell': '13280 Broadway, Alden, NY 14004',
      'Alden': '13280 Broadway, Alden, NY 14004',
      'Lancaster Public Library': '5466 Broadway, Lancaster, NY 14086',
      'Lancaster': '5466 Broadway, Lancaster, NY 14086',
      'North Collins Public Library': '2095 School St, North Collins, NY 14111',
      'North Collins': '2095 School St, North Collins, NY 14111',
      'City of Tonawanda Public Library': '333 Main St, Tonawanda, NY 14150',
      'City of Tonawanda': '333 Main St, Tonawanda, NY 14150',
      'Tonawanda': '333 Main St, Tonawanda, NY 14150',
      'Meeting Room': '1 Lafayette Square, Buffalo, NY 14203',
      'Community Room': '1 Lafayette Square, Buffalo, NY 14203',
      'Audubon': '350 John James Audubon Pkwy, Amherst, NY 14228',
      'Audubon Branch': '350 John James Audubon Pkwy, Amherst, NY 14228',
      'Clarence': '3 Town Pl, Clarence, NY 14031',
      'Clarence Public Library': '3 Town Pl, Clarence, NY 14031',
      'Orchard Park': '4570 S Buffalo St, Orchard Park, NY 14127',
      'Orchard Park Public Library': '4570 S Buffalo St, Orchard Park, NY 14127',
      'Hamburg Public Library': '102 Buffalo St, Hamburg, NY 14075',
      'Hamburg': '102 Buffalo St, Hamburg, NY 14075'
    }
  },

  'Monroe County Library System': {
    mainAddress: '115 South Ave, Rochester, NY 14604',
    branches: {
      'Central Library': '115 South Ave, Rochester, NY 14604',
      'Central': '115 South Ave, Rochester, NY 14604',
      'Central - Harold Hacker Hall': '115 South Ave, Rochester, NY 14604',
      'Harold Hacker Hall': '115 South Ave, Rochester, NY 14604',
      'Rundel': '115 South Ave, Rochester, NY 14604',
      'Ogden Farmers\' Library': '269 Ogden Center Rd, Spencerport, NY 14559',
      'Ogden': '269 Ogden Center Rd, Spencerport, NY 14559',
      'Ogden - Teen Space': '269 Ogden Center Rd, Spencerport, NY 14559',
      'Brockport-Seymour Library': '161 East Ave, Brockport, NY 14420',
      'Seymour': '161 East Ave, Brockport, NY 14420',
      'Seymour - Duryea Room': '161 East Ave, Brockport, NY 14420',
      'Duryea Room': '161 East Ave, Brockport, NY 14420',
      'Chili Public Library': '3333 Chili Ave, Rochester, NY 14624',
      'Chili': '3333 Chili Ave, Rochester, NY 14624',
      'Chili - Barbara Ireland Community Room': '3333 Chili Ave, Rochester, NY 14624',
      'Barbara Ireland Community Room': '3333 Chili Ave, Rochester, NY 14624',
      'Pittsford Community Library': '24 State St, Pittsford, NY 14534',
      'Pittsford': '24 State St, Pittsford, NY 14534',
      'Pittsford - Fisher Meeting Room': '24 State St, Pittsford, NY 14534',
      'Fisher Meeting Room': '24 State St, Pittsford, NY 14534',
      'Gates Public Library': '902 Elm Grove Rd, Rochester, NY 14624',
      'Gates': '902 Elm Grove Rd, Rochester, NY 14624',
      'Greece Public Library': '2 Vince Tofany Blvd, Rochester, NY 14612',
      'Greece': '2 Vince Tofany Blvd, Rochester, NY 14612',
      'Henrietta Public Library': '455 Calkins Rd, Rochester, NY 14623',
      'Henrietta': '455 Calkins Rd, Rochester, NY 14623',
      'Irondequoit Public Library': '1290 Titus Ave, Rochester, NY 14617',
      'Irondequoit': '1290 Titus Ave, Rochester, NY 14617',
      'Penfield Public Library': '1985 Baird Rd, Penfield, NY 14526',
      'Penfield': '1985 Baird Rd, Penfield, NY 14526',
      'Webster Public Library': '980 Ridge Rd, Webster, NY 14580',
      'Webster': '980 Ridge Rd, Webster, NY 14580'
    }
  },

  // Pennsylvania Libraries
  'Montgomery County-Norristown Public Library': {
    mainAddress: '1001 Powell St, Norristown, PA 19401',
    branches: {
      'NPL': '1001 Powell St, Norristown, PA 19401',
      'NPL Community Room': '1001 Powell St, Norristown, PA 19401',
      'NPL Staff Conference Room': '1001 Powell St, Norristown, PA 19401',
      'NPL Teen Area': '1001 Powell St, Norristown, PA 19401',
      'NPL Children\'s Area': '1001 Powell St, Norristown, PA 19401',
      'Norristown Public Library': '1001 Powell St, Norristown, PA 19401',
      'CFL': '301 Fayette St, Conshohocken, PA 19428',
      'CFL Community Room': '301 Fayette St, Conshohocken, PA 19428',
      'Conshohocken Free Library': '301 Fayette St, Conshohocken, PA 19428',
      'Conshohocken': '301 Fayette St, Conshohocken, PA 19428',
      'ROY': '200 S Fourth Ave, Royersford, PA 19468',
      'ROY Community Room': '200 S Fourth Ave, Royersford, PA 19468',
      'ROY Children\'s Room': '200 S Fourth Ave, Royersford, PA 19468',
      'Royersford Free Public Library': '200 S Fourth Ave, Royersford, PA 19468',
      'Royersford': '200 S Fourth Ave, Royersford, PA 19468',
      'PVL': '290 2nd St, Schwenksville, PA 19473',
      'PVL Auditorium': '290 2nd St, Schwenksville, PA 19473',
      'PVL Auditorium - Lower Level': '290 2nd St, Schwenksville, PA 19473',
      'Perkiomen Valley Library': '290 2nd St, Schwenksville, PA 19473',
      'Schwenksville': '290 2nd St, Schwenksville, PA 19473',
      'UPVL': '350 Main St, Red Hill, PA 18076',
      'UPVL Lower Level': '350 Main St, Red Hill, PA 18076',
      'Upper Perkiomen Valley Library': '350 Main St, Red Hill, PA 18076',
      'Red Hill': '350 Main St, Red Hill, PA 18076',
      'Extension Bookmobile': '1001 Powell St, Norristown, PA 19401'
    }
  },

  'Erie County Public Library': {
    mainAddress: '160 E Front St, Erie, PA 16507',
    branches: {
      'BLA': '160 E Front St, Erie, PA 16507',
      'BLA Children\'s Story Time Room': '160 E Front St, Erie, PA 16507',
      'Blasco Memorial Library': '160 E Front St, Erie, PA 16507',
      'Blasco': '160 E Front St, Erie, PA 16507',
      'IRQ': '4212 Iroquois Ave, Erie, PA 16511',
      'IRQ Community Room': '4212 Iroquois Ave, Erie, PA 16511',
      'Iroquois Avenue Branch Library': '4212 Iroquois Ave, Erie, PA 16511',
      'Iroquois': '4212 Iroquois Ave, Erie, PA 16511',
      'MCK': '2088 Interchange Rd, Suite 280, Erie, PA 16565',
      'MCK Community Room': '2088 Interchange Rd, Suite 280, Erie, PA 16565',
      'Millcreek Branch Library': '2088 Interchange Rd, Suite 280, Erie, PA 16565',
      'Millcreek': '2088 Interchange Rd, Suite 280, Erie, PA 16565',
      'Edinboro Branch Library': '413 W Plum St, Edinboro, PA 16412',
      'Edinboro': '413 W Plum St, Edinboro, PA 16412',
      'Lincoln Community Center': '1255 Manchester Rd, Erie, PA 16505',
      'Lincoln': '1255 Manchester Rd, Erie, PA 16505',
      'Off Site - Please Check Event Listing for Location Details': '160 E Front St, Erie, PA 16507'
    }
  },

  'Bucks County Free Library': {
    mainAddress: '150 S Pine St, Doylestown, PA 18901',
    branches: {
      'Doylestown': '150 S Pine St, Doylestown, PA 18901',
      'Doylestown Branch': '150 S Pine St, Doylestown, PA 18901',
      'Story Room/Learning Center': '150 S Pine St, Doylestown, PA 18901',
      'Large Meeting Room': '150 S Pine St, Doylestown, PA 18901',
      'Large Meeting Room (Pearl Buck)': '150 S Pine St, Doylestown, PA 18901',
      'Children\'s Room': '150 S Pine St, Doylestown, PA 18901',
      'Outside': '150 S Pine St, Doylestown, PA 18901',
      'Bensalem': '3700 Hulmeville Rd, Bensalem, PA 19020',
      'Bensalem Branch': '3700 Hulmeville Rd, Bensalem, PA 19020',
      'Langhorne': '301 S Pine St, Langhorne, PA 19047',
      'Langhorne Branch': '301 S Pine St, Langhorne, PA 19047',
      'Levittown': '7311 New Falls Rd, Levittown, PA 19055',
      'Levittown Branch': '7311 New Falls Rd, Levittown, PA 19055',
      'Perkasie': '491 Arthur Ave, Perkasie, PA 18944',
      'Perkasie Branch': '491 Arthur Ave, Perkasie, PA 18944',
      'Quakertown': '401 W Mill St, Quakertown, PA 18951',
      'Quakertown Branch': '401 W Mill St, Quakertown, PA 18951',
      'Yardley-Makefield': '1080 Edgewood Rd, Yardley, PA 19067',
      'Yardley': '1080 Edgewood Rd, Yardley, PA 19067',
      'Feasterville': '1983 Bridgetown Pike, Feasterville, PA 19053',
      'New Hope-Solebury': '93 W Ferry St, New Hope, PA 18938',
      'New Hope': '93 W Ferry St, New Hope, PA 18938'
    }
  },

  // Colorado Libraries
  'Aurora Public Library': {
    mainAddress: '14949 E Alameda Pkwy, Aurora, CO 80012',
    branches: {
      'APL Central Library': '14949 E Alameda Pkwy, Aurora, CO 80012',
      'APL Central Library - Central Large Community Room': '14949 E Alameda Pkwy, Aurora, CO 80012',
      'APL Central Library - Central Small Community Room': '14949 E Alameda Pkwy, Aurora, CO 80012',
      'APL Central Library - Central Quiet Study Room': '14949 E Alameda Pkwy, Aurora, CO 80012',
      'APL Central Library - Central Activity Room': '14949 E Alameda Pkwy, Aurora, CO 80012',
      'Central Library': '14949 E Alameda Pkwy, Aurora, CO 80012',
      'APL Martin Luther King, Jr. Library': '9898 E Colfax Ave, Aurora, CO 80010',
      'APL Martin Luther King, Jr. Library - MLK Full Community Room (Akron & Boston)': '9898 E Colfax Ave, Aurora, CO 80010',
      'APL Martin Luther King, Jr. Library - MLK Boston Community Room': '9898 E Colfax Ave, Aurora, CO 80010',
      'APL Martin Luther King, Jr. Library - MLK Café': '9898 E Colfax Ave, Aurora, CO 80010',
      'MLK Library': '9898 E Colfax Ave, Aurora, CO 80010',
      "APL Tallyn's Reach Library": '23911 E Arapahoe Rd, Aurora, CO 80016',
      "APL Tallyn's Reach Library - Tallyn's Reach Full Community Room (Sides A & B)": '23911 E Arapahoe Rd, Aurora, CO 80016',
      "APL Tallyn's Reach Library - Tallyn's Reach Fireplace Open Space": '23911 E Arapahoe Rd, Aurora, CO 80016',
      "APL Tallyn's Reach Library - Tallyn's Reach Activity Room": '23911 E Arapahoe Rd, Aurora, CO 80016',
      "APL Tallyn's Reach Library - Tallyn's Reach Side A Community Room": '23911 E Arapahoe Rd, Aurora, CO 80016',
      "APL Tallyn's Reach Library - Tallyn's Reach Conference Room": '23911 E Arapahoe Rd, Aurora, CO 80016',
      "Tallyn's Reach Children's Area - Children's Area": '23911 E Arapahoe Rd, Aurora, CO 80016',
      'TRL Parking Lot': '23911 E Arapahoe Rd, Aurora, CO 80016',
      'APL Mission Viejo Library': '15324 E Hampden Cir, Aurora, CO 80013',
      'APL Mission Viejo Library - Mission Viejo Community Room': '15324 E Hampden Cir, Aurora, CO 80013',
      'Mission Viejo Library': '15324 E Hampden Cir, Aurora, CO 80013',
      'APL Hoffman Heights Library': '1298 Peoria St, Aurora, CO 80011',
      'APL Hoffman Heights Library - Hoffman Children\'s Area': '1298 Peoria St, Aurora, CO 80011',
      'APL Hoffman Heights Library - Hoffman Heights Lower-Level Community Room': '1298 Peoria St, Aurora, CO 80011',
      'APL Hoffman Heights Library - Hoffman Heights Makerspace': '1298 Peoria St, Aurora, CO 80011',
      'Hoffman Heights Library': '1298 Peoria St, Aurora, CO 80011',
      'Aurora History Museum': '15051 E Alameda Pkwy, Aurora, CO 80012'
    }
  },

  // Indiana Libraries
  'Indianapolis Public Library': {
    mainAddress: '40 E St Clair St, Indianapolis, IN 46204',
    branches: {
      'Central Library': '40 E St Clair St, Indianapolis, IN 46204',
      'Fort Ben Branch': '9330 E 56th St, Indianapolis, IN 46236',
      'Fort Ben Branch - Study Room 5': '9330 E 56th St, Indianapolis, IN 46236',
      'Michigan Road Branch': '4340 W Michigan St, Indianapolis, IN 46222',
      'East 38th Street Branch': '5420 E 38th St, Indianapolis, IN 46218',
      'Eagle Branch': '3905 Moller Rd, Indianapolis, IN 46254',
      'Beech Grove Branch': '1102 Main St, Beech Grove, IN 46107',
      'Decatur Branch': '5301 Kentucky Ave, Indianapolis, IN 46221',
      'Warren Branch': '9701 E 21st St, Indianapolis, IN 46229',
      'Warren Branch - Room 1': '9701 E 21st St, Indianapolis, IN 46229',
      'Community Location': '40 E St Clair St, Indianapolis, IN 46204',
      'Online': '40 E St Clair St, Indianapolis, IN 46204',
      'Glendale Branch': '6101 N Keystone Ave, Indianapolis, IN 46220',
      'Lawrence Branch': '7898 Hague Rd, Indianapolis, IN 46256',
      'Nora Branch': '8625 Guilford Ave, Indianapolis, IN 46240',
      'Pike Branch': '6525 Zionsville Rd, Indianapolis, IN 46268',
      'Southport Branch': '2630 E Stop 11 Rd, Indianapolis, IN 46227',
      'Wayne Branch': '198 S Girls School Rd, Indianapolis, IN 46231',
      'West Indianapolis Branch': '1216 S Kappes St, Indianapolis, IN 46221',
      'Martindale-Brightwood Branch': '2435 N Sherman Dr, Indianapolis, IN 46218',
      'Spades Park Branch': '1801 Nowland Ave, Indianapolis, IN 46201',
      'Garfield Park Branch': '2502 Shelby St, Indianapolis, IN 46203',
      'Haughville Branch': '2121 W Michigan St, Indianapolis, IN 46222',
      'InfoZone': '40 E St Clair St, Indianapolis, IN 46204'
    }
  },

  // Georgia Libraries
  'Gwinnett County Public Library': {
    mainAddress: '1001 Lawrenceville Hwy, Lawrenceville, GA 30046',
    branches: {
      'Buford-Sugar Hill Branch': '2100 Buford Hwy, Buford, GA 30518',
      'Hamilton Mill Branch': '3690 Braselton Hwy, Dacula, GA 30019',
      'Lilburn Branch': '4817 Church St, Lilburn, GA 30047',
      'Grayson Branch': '700 Grayson Pkwy, Grayson, GA 30017',
      'Peachtree Corners Branch': '5570 Spalding Dr, Peachtree Corners, GA 30092',
      'Mountain Park Branch': '1210 Pounds Rd SW, Lilburn, GA 30047',
      'Lawrenceville Hooper-Renwick Branch': '225 Benson St, Lawrenceville, GA 30046',
      'Centerville Branch': '3025 Bethany Church Rd, Snellville, GA 30039',
      'Duluth Branch': '3180 Main St, Duluth, GA 30096',
      'Duluth Branch - Duluth Meeting Room': '3180 Main St, Duluth, GA 30096',
      'Duluth Branch - Duluth Makerspace': '3180 Main St, Duluth, GA 30096',
      'Duluth Branch - Duluth Collaboration Room': '3180 Main St, Duluth, GA 30096',
      'Snellville Branch': '3025 Bethany Church Rd, Snellville, GA 30039',
      'Snellville Branch - Snellville Meeting Room': '3025 Bethany Church Rd, Snellville, GA 30039',
      'Snellville Branch - Snellville Recording Studio': '3025 Bethany Church Rd, Snellville, GA 30039',
      'Snellville Branch - Snellville Collaboration Room': '3025 Bethany Church Rd, Snellville, GA 30039',
      'Snellville Branch - Snellville Makerspace': '3025 Bethany Church Rd, Snellville, GA 30039',
      'Dacula Branch': '265 Dacula Rd, Dacula, GA 30019',
      'Suwanee Branch': '300 High Line St, Suwanee, GA 30024',
      'Suwanee Branch - Suwanee Meeting Room': '300 High Line St, Suwanee, GA 30024',
      'Suwanee Branch - Suwanee Makerspace and Recording Studio': '300 High Line St, Suwanee, GA 30024',
      'Norcross Branch': '6025 Buford Hwy, Norcross, GA 30071',
      'Norcross Branch - Norcross Meeting Room': '6025 Buford Hwy, Norcross, GA 30071',
      'Collins Hill Branch': '455 Camp Perrin Rd, Lawrenceville, GA 30043',
      'Collins Hill Branch - Collins Hill Meeting Room': '455 Camp Perrin Rd, Lawrenceville, GA 30043',
      'Five Forks Branch - Five Forks Meeting Room': '2780 Five Forks Trickum Rd, Lawrenceville, GA 30044',
      'Hamilton Mill Branch - Hamilton Mill Makerspace & Recording Studio': '3690 Braselton Hwy, Dacula, GA 30019',
      'Peachtree Corners Branch - Peachtree Corners Makerspace and Recording Studio': '5570 Spalding Dr, Peachtree Corners, GA 30092',
      'Lawrenceville Hooper-Renwick Branch - Lawrenceville Hooper-Renwick Makerspace': '225 Benson St, Lawrenceville, GA 30046',
      'Virtual': '1001 Lawrenceville Hwy, Lawrenceville, GA 30046',
      'Offsite': '1001 Lawrenceville Hwy, Lawrenceville, GA 30046'
    }
  },

  'DeKalb County Public Library': {
    mainAddress: '215 Sycamore St, Decatur, GA 30030',
    branches: {
      'Decatur Library': '215 Sycamore St, Decatur, GA 30030',
      'Redan-Trotti Library': '1569 Wellborn Rd, Lithonia, GA 30058',
      'Redan-Trotti Library - Redan-Trotti Library Meeting Room': '1569 Wellborn Rd, Lithonia, GA 30058',
      'Salem-Panola Library': '5137 Salem Rd, Stonecrest, GA 30038',
      'Hairston Crossing Library': '4911 Redan Rd, Stone Mountain, GA 30088',
      'Northlake-Barbara Loar Library': '3772 LaVista Rd, Tucker, GA 30084',
      'Tucker-Reid H. Cofer Library': '5234 LaVista Rd, Tucker, GA 30084',
      'Chamblee Library': '4115 Clairmont Rd, Chamblee, GA 30341',
      'Dunwoody Library': '5339 Chamblee Dunwoody Rd, Dunwoody, GA 30338',
      'Clarkston Library': '951 N Indian Creek Dr, Clarkston, GA 30021',
      'County Line-Ellenwood Library': '4331 River Rd, Ellenwood, GA 30294',
      'Stonecrest Library': '3123 Klondike Rd, Stonecrest, GA 30038',
      'Stonecrest Library - Stonecrest Library Technology Lab': '3123 Klondike Rd, Stonecrest, GA 30038',
      'Lithonia-Davidson Library': '6821 Church St, Lithonia, GA 30058',
      'Scottdale-Tobie Grant Homework Center': '941 N Decatur Rd, Decatur, GA 30033',
      'Stone Mountain-Sue Kellogg Library': '952 Leon St, Stone Mountain, GA 30083',
      'Wesley Chapel-William C. Brown Library': '2861 Wesley Chapel Rd, Decatur, GA 30034',
      'Embry Hills Library': '3733 Chamblee Tucker Rd, Chamblee, GA 30341',
      'Brookhaven Library': '1242 N Druid Hills Rd NE, Brookhaven, GA 30319',
      'Virtual Library': '215 Sycamore St, Decatur, GA 30030'
    }
  },

  // New Jersey Libraries
  'Ocean County Library': {
    mainAddress: '101 Washington St, Toms River, NJ 08753',
    branches: {
      'Toms River Branch': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Sensory Space': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Sparks\'s Lab (Makerspace)': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Mancini Hall': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Home Town Dairy': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Green Room': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Teen Zone': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - McConnell Gallery': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Gallery Spaces - Second Floor': '101 Washington St, Toms River, NJ 08753',
      'Toms River Branch - Discovery Room': '101 Washington St, Toms River, NJ 08753',
      'Lakewood Branch': '301 Lexington Ave, Lakewood, NJ 08701',
      'Lakewood Branch - Lakewood Meeting Room': '301 Lexington Ave, Lakewood, NJ 08701',
      'Lakewood Branch - Lakewood Large Study Room': '301 Lexington Ave, Lakewood, NJ 08701',
      'Upper Shores Branch': '112 Jersey City Ave, Lavallette, NJ 08735',
      'Upper Shores Branch - Upper Shores Meeting Room': '112 Jersey City Ave, Lavallette, NJ 08735',
      'Lacey Branch': '10 E Lacey Rd, Forked River, NJ 08731',
      'Lacey Branch - Lacey Meeting Room': '10 E Lacey Rd, Forked River, NJ 08731',
      'Jackson Branch': '2 Jackson Dr, Jackson, NJ 08527',
      'Jackson Branch - Makerspace': '2 Jackson Dr, Jackson, NJ 08527',
      'Jackson Branch - Jackson Quiet Study Room': '2 Jackson Dr, Jackson, NJ 08527',
      'Jackson Branch - Storytime Room': '2 Jackson Dr, Jackson, NJ 08527',
      'Jackson Branch - Sensory Space': '2 Jackson Dr, Jackson, NJ 08527',
      'Jackson Branch - Jackson Meeting Room': '2 Jackson Dr, Jackson, NJ 08527',
      'Long Beach Island Branch': '217 S Central Ave, Surf City, NJ 08008',
      'Long Beach Island Branch - LBI Meeting Room': '217 S Central Ave, Surf City, NJ 08008',
      'Point Pleasant Borough Branch': '834 Beaver Dam Rd, Point Pleasant, NJ 08742',
      'Point Pleasant Borough Branch - Point Pleasant Borough Meeting Room': '834 Beaver Dam Rd, Point Pleasant, NJ 08742',
      'Point Pleasant Borough Branch - YA Floor': '834 Beaver Dam Rd, Point Pleasant, NJ 08742',
      'Berkeley Branch': '30 Station Rd, Bayville, NJ 08721',
      'Berkeley Branch - Berkeley Meeting Room': '30 Station Rd, Bayville, NJ 08721',
      'Berkeley Branch - Teen Zone': '30 Station Rd, Bayville, NJ 08721',
      'Barnegat Branch': '112 Burr St, Barnegat, NJ 08005',
      'Barnegat Branch - Barnegat Meeting Room': '112 Burr St, Barnegat, NJ 08005',
      'Plumsted Branch': '119 Evergreen Rd, New Egypt, NJ 08533',
      'Plumsted Branch - Plumsted Meeting Room': '119 Evergreen Rd, New Egypt, NJ 08533',
      'Tuckerton Branch': '380 Bay Ave, Tuckerton, NJ 08087',
      'Tuckerton Branch - Tuckerton Meeting Room': '380 Bay Ave, Tuckerton, NJ 08087',
      'Brick Branch': '301 Chambers Bridge Rd, Brick, NJ 08723',
      'Brick Branch - Brick Meeting Room': '301 Chambers Bridge Rd, Brick, NJ 08723',
      'Brick Branch - Brick 2nd Floor Computer Lab': '301 Chambers Bridge Rd, Brick, NJ 08723',
      'Brick Branch - Brick 1st Floor Conference Room (located in Teen Zone)': '301 Chambers Bridge Rd, Brick, NJ 08723',
      'Waretown Branch': '112 Main St, Waretown, NJ 08758',
      'Waretown Branch - Waretown Meeting Room': '112 Main St, Waretown, NJ 08758',
      'Stafford Branch': '129 N Main St, Manahawkin, NJ 08050',
      'Stafford Branch - Stafford Meeting Room': '129 N Main St, Manahawkin, NJ 08050',
      'Island Heights Branch': '121 Summit Ave, Island Heights, NJ 08732',
      'Manchester Branch': '21 Colonial Dr, Manchester, NJ 08759',
      'Manchester Branch - Manchester Study room': '21 Colonial Dr, Manchester, NJ 08759',
      'Beachwood Branch': '126 Beachwood Blvd, Beachwood, NJ 08722',
      'Point Pleasant Beach Branch': '710 McLean Ave, Point Pleasant Beach, NJ 08742',
      'Point Pleasant Beach Branch - Point Pleasant Beach Meeting Room': '710 McLean Ave, Point Pleasant Beach, NJ 08742',
      'Little Egg Harbor Branch': '290 Mathistown Rd, Little Egg Harbor, NJ 08087',
      'Little Egg Harbor Branch - Little Egg Harbor Meeting Room': '290 Mathistown Rd, Little Egg Harbor, NJ 08087'
    }
  },

  // Ohio Libraries
  'Columbus Metropolitan Library': {
    mainAddress: '96 S Grant Ave, Columbus, OH 43215',
    branches: {
      'Main Library': '96 S Grant Ave, Columbus, OH 43215',
      'Main Library - Teen Learning Lab/2A': '96 S Grant Ave, Columbus, OH 43215',
      'Hilliard': '4500 Hickory Chase Way, Hilliard, OH 43026',
      'Hilliard - Meeting Room 2A': '4500 Hickory Chase Way, Hilliard, OH 43026',
      'Hilliard - Meeting Room 1A': '4500 Hickory Chase Way, Hilliard, OH 43026',
      'Hilliard - Learning Center': '4500 Hickory Chase Way, Hilliard, OH 43026',
      'Reynoldsburg': '1402 Brice Rd, Reynoldsburg, OH 43068',
      'Reynoldsburg - Meeting Room 3': '1402 Brice Rd, Reynoldsburg, OH 43068',
      'Reynoldsburg - Meeting Room 1': '1402 Brice Rd, Reynoldsburg, OH 43068',
      'Reynoldsburg - Meeting Room 2': '1402 Brice Rd, Reynoldsburg, OH 43068',
      'Reynoldsburg - Learning Center': '1402 Brice Rd, Reynoldsburg, OH 43068',
      'Gahanna': '310 Hamilton Rd, Gahanna, OH 43230',
      'Gahanna - Learning Center': '310 Hamilton Rd, Gahanna, OH 43230',
      'Gahanna - Meeting Rooms 1 and 2': '310 Hamilton Rd, Gahanna, OH 43230',
      'Gahanna - Meeting Room 3': '310 Hamilton Rd, Gahanna, OH 43230',
      'Karl Road': '5590 Karl Rd, Columbus, OH 43229',
      'Karl Road - Meeting Rooms 1 and 2': '5590 Karl Rd, Columbus, OH 43229',
      'Karl Road - Study Room 7': '5590 Karl Rd, Columbus, OH 43229',
      'Karl Road - Learning Lab': '5590 Karl Rd, Columbus, OH 43229',
      'Whitehall': '4445 E Broad St, Columbus, OH 43213',
      'Whitehall - Meeting Rooms 1 and 2': '4445 E Broad St, Columbus, OH 43213',
      'Whitehall - Study Room E': '4445 E Broad St, Columbus, OH 43213',
      'Whitehall - Meeting Room 5': '4445 E Broad St, Columbus, OH 43213',
      'Dublin': '75 N High St, Dublin, OH 43017',
      'Dublin - Meeting Room 2,Meeting Room 3': '75 N High St, Dublin, OH 43017',
      'Canal Winchester': '115 Franklin St, Canal Winchester, OH 43110',
      'Canal Winchester - Meeting Rooms 1 and 2': '115 Franklin St, Canal Winchester, OH 43110',
      'Canal Winchester - Learning Center': '115 Franklin St, Canal Winchester, OH 43110',
      'Canal Winchester - Meeting Rooms 2 and 3': '115 Franklin St, Canal Winchester, OH 43110',
      'Canal Winchester - Meeting Room 1': '115 Franklin St, Canal Winchester, OH 43110',
      'Marion-Franklin': '1550 S Parsons Ave, Columbus, OH 43207',
      'Marion-Franklin - Meeting Rooms 1 and 2': '1550 S Parsons Ave, Columbus, OH 43207',
      'Marion-Franklin - Learning Center': '1550 S Parsons Ave, Columbus, OH 43207',
      'Marion-Franklin - Meeting Room 1': '1550 S Parsons Ave, Columbus, OH 43207',
      'South High': '3540 S High St, Columbus, OH 43207',
      'South High - Meeting Room': '3540 S High St, Columbus, OH 43207',
      'Franklinton': '1061 W Town St, Columbus, OH 43222',
      'Franklinton - Meeting Room': '1061 W Town St, Columbus, OH 43222',
      'Hilltop': '511 S Hague Ave, Columbus, OH 43204',
      'Hilltop - Meeting Room 2': '511 S Hague Ave, Columbus, OH 43204',
      'Hilltop - Learning Center': '511 S Hague Ave, Columbus, OH 43204',
      'Hilltop - Meeting Room 5': '511 S Hague Ave, Columbus, OH 43204',
      'Hilltop - Study Room 6': '511 S Hague Ave, Columbus, OH 43204',
      'Hilltop - Meeting Rooms 3 and 4': '511 S Hague Ave, Columbus, OH 43204',
      'Southeast': '3980 S Hamilton Rd, Groveport, OH 43125',
      'Southeast - Learning Center': '3980 S Hamilton Rd, Groveport, OH 43125',
      'Southeast - Meeting Room': '3980 S Hamilton Rd, Groveport, OH 43125',
      'Northern Lights': '4093 Cleveland Ave, Columbus, OH 43224',
      'Northern Lights - Meeting Room 1': '4093 Cleveland Ave, Columbus, OH 43224',
      'Northern Lights - Learning Center,Learning Lab': '4093 Cleveland Ave, Columbus, OH 43224',
      'Northern Lights - Meeting Rooms 2 and 3': '4093 Cleveland Ave, Columbus, OH 43224',
      'Driving Park': '1422 E Livingston Ave, Columbus, OH 43205',
      'Driving Park - Meeting Room 3': '1422 E Livingston Ave, Columbus, OH 43205',
      'Driving Park - Meeting Rooms 1 and 2': '1422 E Livingston Ave, Columbus, OH 43205',
      'Northside': '1423 N High St, Columbus, OH 43201',
      'Northside - Meeting Room 1': '1423 N High St, Columbus, OH 43201',
      'Northside - Learning Center': '1423 N High St, Columbus, OH 43201',
      'Northside - Meeting Room 3': '1423 N High St, Columbus, OH 43201',
      'Parsons': '1113 Parsons Ave, Columbus, OH 43206',
      'Parsons - Meeting Rooms 1 and 2': '1113 Parsons Ave, Columbus, OH 43206',
      'Whetstone': '3909 N High St, Columbus, OH 43214',
      'Whetstone - Meeting Room': '3909 N High St, Columbus, OH 43214',
      'Barnett': '1725 Morse Rd, Columbus, OH 43229',
      'Barnett - Learning Center': '1725 Morse Rd, Columbus, OH 43229',
      'Barnett - Meeting Room 1': '1725 Morse Rd, Columbus, OH 43229',
      'Barnett - Meeting Room 3': '1725 Morse Rd, Columbus, OH 43229',
      'Barnett - Meeting Rooms 2 & 3': '1725 Morse Rd, Columbus, OH 43229',
      'Shepard': '850 N Nelson Rd, Columbus, OH 43219',
      'Shepard - Learning Center': '850 N Nelson Rd, Columbus, OH 43219',
      'Shepard - Meeting Room 2': '850 N Nelson Rd, Columbus, OH 43219',
      'Shepard - Meeting Room 1': '850 N Nelson Rd, Columbus, OH 43219'
    }
  },

  // California Libraries
  'San Jose Public Library': {
    mainAddress: '150 E San Fernando St, San Jose, CA 95112',
    branches: {
      'King Library': '150 E San Fernando St, San Jose, CA 95112',
      'Almaden': '6445 Camden Ave, San Jose, CA 95120',
      'Alviso': '5050 N 1st St, San Jose, CA 95002',
      'Bascom': '1000 S Bascom Ave, San Jose, CA 95128',
      'Berryessa': '3355 Noble Ave, San Jose, CA 95132',
      'Biblioteca Latinoamericana': '921 S 1st St, San Jose, CA 95110',
      'Calabazas': '1230 S Blaney Ave, San Jose, CA 95129',
      'Cambrian': '1780 Hillsdale Ave, San Jose, CA 95124',
      'Alum Rock': '3090 Alum Rock Ave, San Jose, CA 95127',
      'East San Jose Carnegie': '1102 E Santa Clara St, San Jose, CA 95116',
      'Edenvale': '101 Branham Ln E, San Jose, CA 95111',
      'Educational Park': '1772 Educational Park Dr, San Jose, CA 95133',
      'Evergreen': '2635 Aborn Rd, San Jose, CA 95121',
      'Hillview': '1600 Hopkins Dr, San Jose, CA 95122',
      'Joyce Ellington': '491 E Empire St, San Jose, CA 95112',
      'Mt. Pleasant': '3411 Rocky Mountain Dr, San Jose, CA 95127',
      'Pearl Avenue': '4270 Pearl Ave, San Jose, CA 95136',
      'Rose Garden': '1580 Naglee Ave, San Jose, CA 95126',
      'Santa Teresa': '290 International Cir, San Jose, CA 95119',
      'Seven Trees': '3590 Cas Dr, San Jose, CA 95111',
      'Tully Community': '880 Tully Rd, San Jose, CA 95111',
      'Village Square': '4001 Evergreen Village Sq, San Jose, CA 95135',
      'Vineland': '1450 Blossom Hill Rd, San Jose, CA 95118',
      'West Valley': '1243 San Tomas Aquino Rd, San Jose, CA 95117',
      'Willow Glen': '1157 Minnesota Ave, San Jose, CA 95125',
      // BiblioCommons duplicated venue names bug workaround
      'King LibraryKing Library': '150 E San Fernando St, San Jose, CA 95112',
      'AlmadenAlmaden': '6445 Camden Ave, San Jose, CA 95120',
      'BascomBascom': '1000 S Bascom Ave, San Jose, CA 95128',
      'BerryessaBerryessa': '3355 Noble Ave, San Jose, CA 95132',
      'Biblioteca LatinoamericanaBiblioteca Latinoamericana': '921 S 1st St, San Jose, CA 95110',
      'CalabasasCalabazas': '1230 S Blaney Ave, San Jose, CA 95129',
      'CambrianCambrian': '1780 Hillsdale Ave, San Jose, CA 95124',
      'Alum RockAlum Rock': '3090 Alum Rock Ave, San Jose, CA 95127',
      'EdenvaleEdenvale': '101 Branham Ln E, San Jose, CA 95111',
      'Joyce EllingtonJoyce Ellington': '491 E Empire St, San Jose, CA 95112',
      'Rose GardenRose Garden': '1580 Naglee Ave, San Jose, CA 95126',
      'Seven TreesSeven Trees': '3590 Cas Dr, San Jose, CA 95111',
      'AlvisoAlviso': '5050 N 1st St, San Jose, CA 95002',
      'East San Jose CarnegieEast San Jose Carnegie': '1102 E Santa Clara St, San Jose, CA 95116',
      'East SJ Carnegie': '1102 E Santa Clara St, San Jose, CA 95116',
      'East SJ CarnegieEast SJ Carnegie': '1102 E Santa Clara St, San Jose, CA 95116',
      'Educational ParkEducational Park': '1772 Educational Park Dr, San Jose, CA 95133',
      'EvergreenEvergreen': '2635 Aborn Rd, San Jose, CA 95121',
      'HillviewHillview': '1600 Hopkins Dr, San Jose, CA 95122',
      'Mt. PleasantMt. Pleasant': '3411 Rocky Mountain Dr, San Jose, CA 95127',
      'Pearl AvenuePearl Avenue': '4270 Pearl Ave, San Jose, CA 95136',
      'Santa TeresaSanta Teresa': '290 International Cir, San Jose, CA 95119',
      'Tully CommunityTully Community': '880 Tully Rd, San Jose, CA 95111',
      'Village SquareVillage Square': '4001 Evergreen Village Sq, San Jose, CA 95135',
      'VinelandVineland': '1450 Blossom Hill Rd, San Jose, CA 95118',
      'West ValleyWest Valley': '1243 San Tomas Aquino Rd, San Jose, CA 95117',
      'Willow GlenWillow Glen': '1157 Minnesota Ave, San Jose, CA 95125'
    }
  },

  'Oakland Public Library': {
    mainAddress: '125 14th St, Oakland, CA 94612',
    branches: {
      'Main Library': '125 14th St, Oakland, CA 94612',
      'Oakland History Center': '125 14th St, Oakland, CA 94612',
      'Elmhurst Branch': '1427 88th Ave, Oakland, CA 94621',
      '81st Avenue Branch': '1021 81st Ave, Oakland, CA 94621',
      'Melrose Branch': '4805 Foothill Blvd, Oakland, CA 94601',
      'Montclair Branch': '1687 Mountain Blvd, Oakland, CA 94611',
      'Temescal Branch': '5205 Telegraph Ave, Oakland, CA 94609',
      'West Oakland Branch': '1801 Adeline St, Oakland, CA 94607',
      'Lakeview Branch': '550 El Embarcadero, Oakland, CA 94610',
      'César E. Chávez Branch': '3301 E 12th St, Oakland, CA 94601',
      'Golden Gate Branch': '5606 San Pablo Ave, Oakland, CA 94608',
      'Piedmont Avenue Branch': '80 Echo Ave, Oakland, CA 94611',
      'Eastmont Branch': '7200 Bancroft Ave, Oakland, CA 94605',
      'Rockridge Branch': '5366 College Ave, Oakland, CA 94618',
      'Dimond Branch': '3565 Fruitvale Ave, Oakland, CA 94602',
      // BiblioCommons duplicated venue names bug workaround
      'Main LibraryMain Library': '125 14th St, Oakland, CA 94612',
      'Oakland History CenterOakland History Center': '125 14th St, Oakland, CA 94612',
      'Elmhurst BranchElmhurst Branch': '1427 88th Ave, Oakland, CA 94621',
      '81st Avenue Branch81st Avenue Branch': '1021 81st Ave, Oakland, CA 94621',
      'Melrose BranchMelrose Branch': '4805 Foothill Blvd, Oakland, CA 94601',
      'Montclair BranchMontclair Branch': '1687 Mountain Blvd, Oakland, CA 94611',
      'Temescal BranchTemescal Branch': '5205 Telegraph Ave, Oakland, CA 94609',
      'West Oakland BranchWest Oakland Branch': '1801 Adeline St, Oakland, CA 94607',
      'Lakeview BranchLakeview Branch': '550 El Embarcadero, Oakland, CA 94610',
      'César E. Chávez BranchCésar E. Chávez Branch': '3301 E 12th St, Oakland, CA 94601',
      'Golden Gate BranchGolden Gate Branch': '5606 San Pablo Ave, Oakland, CA 94608',
      'Piedmont Avenue BranchPiedmont Avenue Branch': '80 Echo Ave, Oakland, CA 94611',
      'Eastmont BranchEastmont Branch': '7200 Bancroft Ave, Oakland, CA 94605',
      'Rockridge BranchRockridge Branch': '5366 College Ave, Oakland, CA 94618',
      'Dimond BranchDimond Branch': '3565 Fruitvale Ave, Oakland, CA 94602'
    }
  },

  'Alameda County Library': {
    mainAddress: '2450 Stevenson Blvd, Fremont, CA 94538',
    branches: {
      'Fremont Main Library': '2450 Stevenson Blvd, Fremont, CA 94538',
      'Union City Library': '34007 Alvarado-Niles Rd, Union City, CA 94587',
      'Newark Library': '6300 Civic Terrace Ave, Newark, CA 94560',
      'Centerville Library': '3801 Nicolet Ave, Fremont, CA 94536',
      'Irvington Library': '41825 Greenpark Dr, Fremont, CA 94538',
      'Niles Library': '150 I St, Fremont, CA 94536',
      'Hayward Library': '835 C St, Hayward, CA 94541',
      'Castro Valley Library': '3600 Norbridge Ave, Castro Valley, CA 94546',
      'San Lorenzo Library': '395 Paseo Grande, San Lorenzo, CA 94580',
      'Dublin Library': '200 Civic Plaza, Dublin, CA 94568',
      'Pleasanton Library': '400 Old Bernal Ave, Pleasanton, CA 94566',
      'Albany Library': '1247 Marin Ave, Albany, CA 94706',
      // BiblioCommons short name duplicates
      'Union CityUnion City': '34007 Alvarado-Niles Rd, Union City, CA 94587',
      'NewarkNewark': '6300 Civic Terrace Ave, Newark, CA 94560',
      'FremontFremont': '2450 Stevenson Blvd, Fremont, CA 94538',
      'CentervilleCenterville': '3801 Nicolet Ave, Fremont, CA 94536',
      'IrvingtonIrvington': '41825 Greenpark Dr, Fremont, CA 94538',
      'NilesNiles': '150 I St, Fremont, CA 94536',
      'HaywardHayward': '835 C St, Hayward, CA 94541',
      'Castro ValleyCastro Valley': '3600 Norbridge Ave, Castro Valley, CA 94546',
      'San LorenzoSan Lorenzo': '395 Paseo Grande, San Lorenzo, CA 94580',
      'DublinDublin': '200 Civic Plaza, Dublin, CA 94568',
      'PleasantonPleasanton': '400 Old Bernal Ave, Pleasanton, CA 94566',
      'AlbanyAlbany': '1247 Marin Ave, Albany, CA 94706',
      'CherrylandCherryland': '21180 Center St, Hayward, CA 94541',
      'Cherryland': '21180 Center St, Hayward, CA 94541'
    }
  },

  'Santa Clara County Library District': {
    mainAddress: '1370 Dell Ave, Campbell, CA 95008',
    branches: {
      'Campbell Library': '77 Harrison Ave, Campbell, CA 95008',
      'Campbell Library - Community Room': '77 Harrison Ave, Campbell, CA 95008',
      'Campbell Library - Story Room': '77 Harrison Ave, Campbell, CA 95008',
      'Cupertino Library': '10800 Torre Ave, Cupertino, CA 95014',
      'Cupertino Library - Story Room': '10800 Torre Ave, Cupertino, CA 95014',
      'Cupertino Library - Community Room': '10800 Torre Ave, Cupertino, CA 95014',
      'Gilroy Library': '350 W 6th St, Gilroy, CA 95020',
      'Gilroy Library - Story Room': '350 W 6th St, Gilroy, CA 95020',
      'Gilroy Library - Arbor Room': '350 W 6th St, Gilroy, CA 95020',
      'Los Altos Library': '13 S San Antonio Rd, Los Altos, CA 94022',
      'Los Altos Library - Story Room': '13 S San Antonio Rd, Los Altos, CA 94022',
      'Los Altos Library - Community Room': '13 S San Antonio Rd, Los Altos, CA 94022',
      'Milpitas Library': '160 N Main St, Milpitas, CA 95035',
      'Milpitas Library - Story Room': '160 N Main St, Milpitas, CA 95035',
      'Milpitas Library - Community Room': '160 N Main St, Milpitas, CA 95035',
      'Morgan Hill Library': '660 W Main Ave, Morgan Hill, CA 95037',
      'Morgan Hill Library - Story Room': '660 W Main Ave, Morgan Hill, CA 95037',
      'Morgan Hill Library - Community Room': '660 W Main Ave, Morgan Hill, CA 95037',
      'Saratoga Library': '13650 Saratoga Ave, Saratoga, CA 95070',
      'Saratoga Library - Story Room': '13650 Saratoga Ave, Saratoga, CA 95070',
      'Saratoga Library - Community Room': '13650 Saratoga Ave, Saratoga, CA 95070',
      'Woodland Branch': '1975 Grant Rd, Los Altos, CA 94024',
      'Woodland Branch - Story Room': '1975 Grant Rd, Los Altos, CA 94024',
      'Online event': '1370 Dell Ave, Campbell, CA 95008',
      // BiblioCommons duplicated venue names bug workaround
      'Campbell LibraryCampbell Library': '77 Harrison Ave, Campbell, CA 95008',
      'Cupertino LibraryCupertino Library': '10800 Torre Ave, Cupertino, CA 95014',
      'Gilroy LibraryGilroy Library': '350 W 6th St, Gilroy, CA 95020',
      'Los Altos LibraryLos Altos Library': '13 S San Antonio Rd, Los Altos, CA 94022',
      'Milpitas LibraryMilpitas Library': '160 N Main St, Milpitas, CA 95035',
      'Morgan Hill LibraryMorgan Hill Library': '660 W Main Ave, Morgan Hill, CA 95037',
      'Saratoga LibrarySaratoga Library': '13650 Saratoga Ave, Saratoga, CA 95070',
      'Woodland BranchWoodland Branch': '1975 Grant Rd, Los Altos, CA 94024'
    }
  },

  'Contra Costa County Library': {
    mainAddress: '2 Monticello Ave, Pleasant Hill, CA 94523',
    branches: {
      'Pleasant Hill Library': '2 Monticello Ave, Pleasant Hill, CA 94523',
      'Pleasant Hill Library - Community Room': '2 Monticello Ave, Pleasant Hill, CA 94523',
      'Pleasant Hill Library - Story Room': '2 Monticello Ave, Pleasant Hill, CA 94523',
      'Walnut Creek Library': '1644 N Broadway, Walnut Creek, CA 94596',
      'Walnut Creek Library - Oak View Room': '1644 N Broadway, Walnut Creek, CA 94596',
      'Walnut Creek Library - Story Room': '1644 N Broadway, Walnut Creek, CA 94596',
      'Concord Library': '2900 Salvio St, Concord, CA 94519',
      'Concord Library - Community Room': '2900 Salvio St, Concord, CA 94519',
      'Concord Library - Story Room': '2900 Salvio St, Concord, CA 94519',
      'Antioch Library': '501 W 18th St, Antioch, CA 94509',
      'Antioch Library - Community Room': '501 W 18th St, Antioch, CA 94509',
      'Antioch Library - Story Room': '501 W 18th St, Antioch, CA 94509',
      'Brentwood Library': '104 Oak St, Brentwood, CA 94513',
      'Brentwood Library - Community Room': '104 Oak St, Brentwood, CA 94513',
      'Danville Library': '400 Front St, Danville, CA 94526',
      'Danville Library - Community Room': '400 Front St, Danville, CA 94526',
      'Danville Library - Story Room': '400 Front St, Danville, CA 94526',
      'El Cerrito Library': '6510 Stockton Ave, El Cerrito, CA 94530',
      'El Cerrito Library - Community Room': '6510 Stockton Ave, El Cerrito, CA 94530',
      'El Sobrante Library': '4191 Appian Way, El Sobrante, CA 94803',
      'Hercules Library': '109 Civic Dr, Hercules, CA 94547',
      'Hercules Library - Community Room': '109 Civic Dr, Hercules, CA 94547',
      'Kensington Library': '61 Arlington Ave, Kensington, CA 94707',
      'Lafayette Library': '3491 Mt Diablo Blvd, Lafayette, CA 94549',
      'Lafayette Library - Community Room': '3491 Mt Diablo Blvd, Lafayette, CA 94549',
      'Lafayette Library - Story Room': '3491 Mt Diablo Blvd, Lafayette, CA 94549',
      'Martinez Library': '740 Court St, Martinez, CA 94553',
      'Martinez Library - Community Room': '740 Court St, Martinez, CA 94553',
      'Moraga Library': '1500 St Marys Rd, Moraga, CA 94556',
      'Moraga Library - Community Room': '1500 St Marys Rd, Moraga, CA 94556',
      'Oakley Library': '1050 Neroly Rd, Oakley, CA 94561',
      'Orinda Library': '26 Orinda Way, Orinda, CA 94563',
      'Orinda Library - Garden Room': '26 Orinda Way, Orinda, CA 94563',
      'Pinole Library': '2935 Pinole Valley Rd, Pinole, CA 94564',
      'Pinole Library - Community Room': '2935 Pinole Valley Rd, Pinole, CA 94564',
      'Pittsburg Library': '80 Power Ave, Pittsburg, CA 94565',
      'Pittsburg Library - Community Room': '80 Power Ave, Pittsburg, CA 94565',
      'Richmond Library': '325 Civic Center Plaza, Richmond, CA 94804',
      'San Pablo Library': '2300 El Portal Dr, San Pablo, CA 94806',
      'San Ramon Library': '100 Montgomery St, San Ramon, CA 94583',
      'San Ramon Library - Community Room': '100 Montgomery St, San Ramon, CA 94583',
      'San Ramon Library - Story Room': '100 Montgomery St, San Ramon, CA 94583',
      'Ygnacio Valley Library': '2661 Oak Grove Rd, Walnut Creek, CA 94598',
      'Ygnacio Valley Library - Community Room': '2661 Oak Grove Rd, Walnut Creek, CA 94598',
      // BiblioCommons short name duplicates
      'MoragaMoraga': '1500 St Marys Rd, Moraga, CA 94556',
      'PrewettPrewett': '1501 Danville Blvd, Alamo, CA 94507',
      'ConcordConcord': '2900 Salvio St, Concord, CA 94519',
      'RodeoRodeo': '220 Pacific Ave, Rodeo, CA 94572',
      'ClaytonClayton': '6125 Clayton Rd, Clayton, CA 94517',
      'Dougherty StationDougherty Station': '17017 Bollinger Canyon Rd, San Ramon, CA 94582',
      'CrockettCrockett': '991 Loring Ave, Crockett, CA 94525',
      'LafayetteLafayette': '3491 Mt Diablo Blvd, Lafayette, CA 94549',
      'San RamonSan Ramon': '100 Montgomery St, San Ramon, CA 94583',
      'HerculesHercules': '109 Civic Dr, Hercules, CA 94547',
      'PittsburgPittsburg': '80 Power Ave, Pittsburg, CA 94565',
      'Online event': '2 Monticello Ave, Pleasant Hill, CA 94523',
      // Additional branch names
      'Prewett': '1501 Danville Blvd, Alamo, CA 94507',
      'Rodeo': '220 Pacific Ave, Rodeo, CA 94572',
      'Clayton': '6125 Clayton Rd, Clayton, CA 94517',
      'Dougherty Station': '17017 Bollinger Canyon Rd, San Ramon, CA 94582',
      'Crockett': '991 Loring Ave, Crockett, CA 94525'
    }
  },

  // Georgia Libraries - Additional
  'Chattahoochee Valley Libraries': {
    mainAddress: '3000 Macon Rd, Columbus, GA 31906',
    branches: {
      'Columbus Public Library': '3000 Macon Rd, Columbus, GA 31906',
      'Columbus Public Library - Auditorium': '3000 Macon Rd, Columbus, GA 31906',
      'Columbus Public Library - Meeting Room': '3000 Macon Rd, Columbus, GA 31906',
      'Mildred L. Terry Branch': '640 Veterans Pkwy, Columbus, GA 31901',
      'Mildred L. Terry Branch - Meeting Room': '640 Veterans Pkwy, Columbus, GA 31901',
      'North Columbus Branch': '5689 Armour Rd, Columbus, GA 31909',
      'North Columbus Branch - Meeting Room': '5689 Armour Rd, Columbus, GA 31909',
      'South Columbus Branch': '4167 Miller Rd, Columbus, GA 31907',
      'South Columbus Branch - Meeting Room': '4167 Miller Rd, Columbus, GA 31907',
      'Cusseta-Chattahoochee County Library': '265 Broad St, Cusseta, GA 31805',
      'Marion County Library': '204 E Buena Vista Ave, Buena Vista, GA 31803',
      'Talbot County Library': '31 W Tyler St, Talbotton, GA 31827',
      'Stewart County Library': '10 Broad St, Lumpkin, GA 31815'
    }
  },

  'Forsyth County Public Library': {
    mainAddress: '585 Dahlonega St, Cumming, GA 30040',
    branches: {
      'Cumming Library': '585 Dahlonega St, Cumming, GA 30040',
      'Cumming Library - Atrium': '585 Dahlonega St, Cumming, GA 30040',
      'Cumming Library - Meeting Room': '585 Dahlonega St, Cumming, GA 30040',
      'Cumming Library - Story Room': '585 Dahlonega St, Cumming, GA 30040',
      'Hampton Park Library': '5345 Settingdown Rd, Cumming, GA 30041',
      'Hampton Park Library - Story Room': '5345 Settingdown Rd, Cumming, GA 30041',
      'Hampton Park Library - Meeting Room': '5345 Settingdown Rd, Cumming, GA 30041',
      'Sharon Forks Library': '2820 Old Atlanta Rd, Cumming, GA 30041',
      'Sharon Forks Library - Story Room': '2820 Old Atlanta Rd, Cumming, GA 30041',
      'Sharon Forks Library - Meeting Room': '2820 Old Atlanta Rd, Cumming, GA 30041',
      'Coal Mountain Library': '3860 Settingdown Rd, Cumming, GA 30028',
      'Coal Mountain Library - Story Room': '3860 Settingdown Rd, Cumming, GA 30028',
      'Post Road Library': '5765 Post Rd, Cumming, GA 30040',
      'Post Road Library - Story Room': '5765 Post Rd, Cumming, GA 30040',
      'Post Road Library - Meeting Room': '5765 Post Rd, Cumming, GA 30040'
    }
  },

  'Fulton County Library System': {
    mainAddress: '1 Margaret Mitchell Square NW, Atlanta, GA 30303',
    branches: {
      'Atlanta-Fulton Public Library': '1 Margaret Mitchell Square NW, Atlanta, GA 30303',
      'Central Library': '1 Margaret Mitchell Square NW, Atlanta, GA 30303',
      'Central Library - Auditorium': '1 Margaret Mitchell Square NW, Atlanta, GA 30303',
      'Alpharetta Library': '10 Park Plaza, Alpharetta, GA 30009',
      'Alpharetta Library - Meeting Room': '10 Park Plaza, Alpharetta, GA 30009',
      'Buckhead Library': '269 Buckhead Ave NE, Atlanta, GA 30305',
      'Buckhead Library - Meeting Room': '269 Buckhead Ave NE, Atlanta, GA 30305',
      'Cleveland Avenue Library': '47 Cleveland Ave SW, Atlanta, GA 30315',
      'College Park Library': '3647 Main St, College Park, GA 30337',
      'Dogwood Library': '1838 Donald Lee Hollowell Pkwy NW, Atlanta, GA 30318',
      'East Atlanta Library': '400 Flat Shoals Ave SE, Atlanta, GA 30316',
      'East Point Library': '2757 Main St, East Point, GA 30344',
      'East Roswell Library': '2301 Holcomb Bridge Rd, Roswell, GA 30076',
      'Fairburn Library': '60 Valley View Dr, Fairburn, GA 30213',
      'Georgia Hill Library': '250 Georgia Ave SE, Atlanta, GA 30312',
      'Hapeville Library': '525 King Arnold St, Hapeville, GA 30354',
      'Joan P. Garner Library at Ponce de Leon': '980 Ponce de Leon Ave NE, Atlanta, GA 30306',
      'Kirkwood Library': '11 Kirkwood Rd NE, Atlanta, GA 30317',
      'Martin Luther King Jr Library': '409 John Wesley Dobbs Ave NE, Atlanta, GA 30312',
      'Mechanicsville Library': '400 Formwalt St SW, Atlanta, GA 30312',
      'Metropolitan Library': '1332 Metropolitan Pkwy SW, Atlanta, GA 30310',
      'Milton Library': '855 Mayfield Rd, Milton, GA 30009',
      'Milton Library - Meeting Room': '855 Mayfield Rd, Milton, GA 30009',
      'Northside Library': '3295 Northside Pkwy NW, Atlanta, GA 30327',
      'Northwest Library at Scotts Crossing': '2489 Perry Blvd NW, Atlanta, GA 30318',
      'Ocee Library': '5090 Abbotts Bridge Rd, Johns Creek, GA 30005',
      'Ocee Library - Meeting Room': '5090 Abbotts Bridge Rd, Johns Creek, GA 30005',
      'Palmetto Library': '971 Main St, Palmetto, GA 30268',
      'Peachtree Library': '1315 Peachtree St NE, Atlanta, GA 30309',
      'Roswell Library': '115 Norcross St, Roswell, GA 30075',
      'Roswell Library - Meeting Room': '115 Norcross St, Roswell, GA 30075',
      'Sandy Springs Library': '395 Mount Vernon Hwy NE, Sandy Springs, GA 30328',
      'Sandy Springs Library - Meeting Room': '395 Mount Vernon Hwy NE, Sandy Springs, GA 30328',
      'South Fulton Library': '3720 Butner Rd SW, Atlanta, GA 30349',
      'Southwest Library': '3665 Cascade Rd SW, Atlanta, GA 30331',
      'Washington Park Library': '1116 Martin Luther King Jr Dr NW, Atlanta, GA 30314',
      'West End Library': '525 Peeples St SW, Atlanta, GA 30310',
      'Wolfcreek Library': '3100 Enon Rd SW, South Fulton, GA 30349',
      'Wolfcreek Library - Meeting Room': '3100 Enon Rd SW, South Fulton, GA 30349'
    }
  },

  // New Jersey Libraries - Additional
  'Somerset County Library System': {
    mainAddress: '1 Vogt Dr, Bridgewater, NJ 08807',
    branches: {
      'Bridgewater Library': '1 Vogt Dr, Bridgewater, NJ 08807',
      'Bridgewater Library - Mary Jacobs Room': '1 Vogt Dr, Bridgewater, NJ 08807',
      'Bridgewater Library - Program Room': '1 Vogt Dr, Bridgewater, NJ 08807',
      'Bridgewater Library - Meeting Room': '1 Vogt Dr, Bridgewater, NJ 08807',
      'Hillsborough Branch': '379 S Branch Rd, Hillsborough, NJ 08844',
      'Hillsborough Branch - Meeting Room': '379 S Branch Rd, Hillsborough, NJ 08844',
      'Manville Branch': '100 S 10th Ave, Manville, NJ 08835',
      'Mary Jacobs Memorial Library': '64 Washington St, Rocky Hill, NJ 08553',
      'North Plainfield Branch': '6 Rockview Ave, North Plainfield, NJ 07060',
      'North Plainfield Branch - Meeting Room': '6 Rockview Ave, North Plainfield, NJ 07060',
      'Peapack and Gladstone Branch': '1 School St, Peapack, NJ 07977',
      'Somerville Branch': '35 West End Ave, Somerville, NJ 08876',
      'Somerville Branch - Meeting Room': '35 West End Ave, Somerville, NJ 08876',
      'Warren Township Branch': '42 Mountain Blvd, Warren, NJ 07059',
      'Warren Township Branch - Meeting Room': '42 Mountain Blvd, Warren, NJ 07059',
      'Watchung Library': '12 Stirling Rd, Watchung, NJ 07069'
    }
  },

  // Ohio Libraries - Additional
  'Akron-Summit County Public Library': {
    mainAddress: '60 S High St, Akron, OH 44326',
    branches: {
      'Main Library': '60 S High St, Akron, OH 44326',
      'Main Library - Auditorium': '60 S High St, Akron, OH 44326',
      'Main Library - Meeting Room': '60 S High St, Akron, OH 44326',
      'Main Library - Story Room': '60 S High St, Akron, OH 44326',
      'Cuyahoga Falls Library': '2015 3rd St, Cuyahoga Falls, OH 44221',
      'Cuyahoga Falls Library - Meeting Room': '2015 3rd St, Cuyahoga Falls, OH 44221',
      'Ellet Branch': '2470 E Market St, Akron, OH 44312',
      'Ellet Branch - Meeting Room': '2470 E Market St, Akron, OH 44312',
      'Fairlawn-Bath Branch': '3101 Smith Rd, Fairlawn, OH 44333',
      'Fairlawn-Bath Branch - Meeting Room': '3101 Smith Rd, Fairlawn, OH 44333',
      'Firestone Park Branch': '1486 Aster Ave, Akron, OH 44301',
      'Goodyear Branch': '60 Goodyear Blvd, Akron, OH 44305',
      'Green Branch': '4046 Massillon Rd, Green, OH 44232',
      'Green Branch - Meeting Room': '4046 Massillon Rd, Green, OH 44232',
      'Highland Square Branch': '807 W Market St, Akron, OH 44303',
      'Kenmore Branch': '969 Kenmore Blvd, Akron, OH 44314',
      'Maple Valley Branch': '1187 Copley Rd, Akron, OH 44320',
      'Mogadore Branch': '144 S Cleveland Ave, Mogadore, OH 44260',
      'Nordonia Hills Branch': '9458 Olde Eight Rd, Northfield, OH 44067',
      'Nordonia Hills Branch - Meeting Room': '9458 Olde Eight Rd, Northfield, OH 44067',
      'Northwest Akron Branch': '1720 Shatto Ave, Akron, OH 44313',
      'Northwest Akron Branch - Meeting Room': '1720 Shatto Ave, Akron, OH 44313',
      'Norton Branch': '3930 S Cleveland Massillon Rd, Norton, OH 44203',
      'Odom Boulevard Branch': '600 Vernon Odom Blvd, Akron, OH 44307',
      'Portage Lakes Branch': '4261 Manchester Rd, Akron, OH 44319',
      'Richfield Branch': '3761 S Grant St, Richfield, OH 44286',
      'Stow-Munroe Falls Library': '3512 Darrow Rd, Stow, OH 44224',
      'Stow-Munroe Falls Library - Meeting Room': '3512 Darrow Rd, Stow, OH 44224',
      'Tallmadge Branch': '90 Community Rd, Tallmadge, OH 44278',
      'Tallmadge Branch - Meeting Room': '90 Community Rd, Tallmadge, OH 44278',
      'Twinsburg Branch': '10050 Ravenna Rd, Twinsburg, OH 44087',
      'Twinsburg Branch - Meeting Room': '10050 Ravenna Rd, Twinsburg, OH 44087'
    }
  },

  'Toledo Lucas County Public Library': {
    mainAddress: '325 Michigan St, Toledo, OH 43604',
    branches: {
      'Main Library': '325 Michigan St, Toledo, OH 43604',
      'Main Library - McMaster Center': '325 Michigan St, Toledo, OH 43604',
      'Main Library - Meeting Room A': '325 Michigan St, Toledo, OH 43604',
      'Main Library - Meeting Room B': '325 Michigan St, Toledo, OH 43604',
      'Main Library - Story Room': '325 Michigan St, Toledo, OH 43604',
      'Birmingham Branch': '203 Paine Ave, Toledo, OH 43605',
      'Heatherdowns Branch': '3265 Glanzman Rd, Toledo, OH 43614',
      'Heatherdowns Branch - Meeting Room': '3265 Glanzman Rd, Toledo, OH 43614',
      'Holland Branch': '1032 S McCord Rd, Holland, OH 43528',
      'Holland Branch - Meeting Room': '1032 S McCord Rd, Holland, OH 43528',
      'Kent Branch': '3101 Collingwood Blvd, Toledo, OH 43610',
      'Kent Branch - Community Room': '3101 Collingwood Blvd, Toledo, OH 43610',
      'King Road Branch': '2022 N McCord Rd, Toledo, OH 43615',
      'King Road Branch - Meeting Room': '2022 N McCord Rd, Toledo, OH 43615',
      'Lagrange Branch': '3422 Lagrange St, Toledo, OH 43608',
      'Locke Branch': '703 Miami St, Toledo, OH 43605',
      'Maumee Branch': '501 River Rd, Maumee, OH 43537',
      'Maumee Branch - Meeting Room': '501 River Rd, Maumee, OH 43537',
      'Mott Branch': '1085 Dorr St, Toledo, OH 43607',
      'Oregon Branch': '3340 Dustin Rd, Oregon, OH 43616',
      'Oregon Branch - Meeting Room': '3340 Dustin Rd, Oregon, OH 43616',
      'Point Place Branch': '2727 117th St, Toledo, OH 43611',
      'Point Place Branch - Meeting Room': '2727 117th St, Toledo, OH 43611',
      'Reynolds Corners Branch': '4833 Dorr St, Toledo, OH 43615',
      'Reynolds Corners Branch - Meeting Room': '4833 Dorr St, Toledo, OH 43615',
      'South Branch': '1736 Broadway St, Toledo, OH 43609',
      'Sylvania Branch': '6749 Monroe St, Sylvania, OH 43560',
      'Sylvania Branch - Meeting Room': '6749 Monroe St, Sylvania, OH 43560',
      'Toledo Heights Branch': '423 Shasta Dr, Toledo, OH 43609',
      'Washington Branch': '5560 Harvest Ln, Toledo, OH 43623',
      'Washington Branch - Meeting Room': '5560 Harvest Ln, Toledo, OH 43623',
      'Waterville Branch': '800 Michigan Ave, Waterville, OH 43566',
      'Waterville Branch - Meeting Room': '800 Michigan Ave, Waterville, OH 43566',
      'West Toledo Branch': '1320 Sylvania Ave, Toledo, OH 43612',
      'West Toledo Branch - Meeting Room': '1320 Sylvania Ave, Toledo, OH 43612'
    }
  },

  // Texas Libraries - Additional
  'McAllen Public Library': {
    mainAddress: '4001 N 23rd St, McAllen, TX 78504',
    branches: {
      'Main Library': '4001 N 23rd St, McAllen, TX 78504',
      'Main Library - Meeting Room': '4001 N 23rd St, McAllen, TX 78504',
      'Main Library - Story Room': '4001 N 23rd St, McAllen, TX 78504',
      'McAllen Memorial Library': '301 N Main St, McAllen, TX 78501',
      'McAllen Memorial Library - Meeting Room': '301 N Main St, McAllen, TX 78501',
      'Lark Community Center Library': '2601 Lark Ave, McAllen, TX 78504',
      'Palm View Branch': '3401 Jordan Ave, McAllen, TX 78503',
      'Las Palmas Branch': '2701 W Hackberry Ave, McAllen, TX 78501'
    }
  },

  'Plano Public Library': {
    mainAddress: '2501 Coit Rd, Plano, TX 75075',
    branches: {
      'Haggard Library': '2501 Coit Rd, Plano, TX 75075',
      'Haggard Library - Program Room': '2501 Coit Rd, Plano, TX 75075',
      'Haggard Library - Story Room': '2501 Coit Rd, Plano, TX 75075',
      'Haggard Library - Meeting Room A': '2501 Coit Rd, Plano, TX 75075',
      'Haggard Library - Meeting Room B': '2501 Coit Rd, Plano, TX 75075',
      'Davis Library': '7501 Independence Pkwy, Plano, TX 75025',
      'Davis Library - Program Room': '7501 Independence Pkwy, Plano, TX 75025',
      'Davis Library - Story Room': '7501 Independence Pkwy, Plano, TX 75025',
      'Davis Library - Meeting Room': '7501 Independence Pkwy, Plano, TX 75025',
      'Harrington Library': '1501 18th St, Plano, TX 75074',
      'Harrington Library - Program Room': '1501 18th St, Plano, TX 75074',
      'Harrington Library - Story Room': '1501 18th St, Plano, TX 75074',
      'Parr Library': '6200 Windhaven Pkwy, Plano, TX 75093',
      'Parr Library - Program Room': '6200 Windhaven Pkwy, Plano, TX 75093',
      'Parr Library - Story Room': '6200 Windhaven Pkwy, Plano, TX 75093',
      'Parr Library - Meeting Room': '6200 Windhaven Pkwy, Plano, TX 75093',
      'Schimelpfenig Library': '5024 Custer Rd, Plano, TX 75023',
      'Schimelpfenig Library - Program Room': '5024 Custer Rd, Plano, TX 75023',
      'Schimelpfenig Library - Story Room': '5024 Custer Rd, Plano, TX 75023'
    }
  },

  'Flower Mound Public Library': {
    mainAddress: '3030 Broadmoor Ln, Flower Mound, TX 75022',
    branches: {
      'Flower Mound Public Library': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Main Library': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Main Library - Community Room': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Main Library - Story Room': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Main Library - Meeting Room A': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Main Library - Meeting Room B': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Main Library - Teen Room': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Community Room': '3030 Broadmoor Ln, Flower Mound, TX 75022',
      'Story Room': '3030 Broadmoor Ln, Flower Mound, TX 75022'
    }
  },

  // Pierce County WA
  'Pierce County Library System': {
    mainAddress: '3005 112th St E, Tacoma, WA 98446',
    branches: {
      'Administration': '3005 112th St E, Tacoma, WA 98446',
      'Bonney Lake Library': '18501 90th St E, Bonney Lake, WA 98391',
      'Bonney Lake Library - Meeting Room': '18501 90th St E, Bonney Lake, WA 98391',
      'Bonney Lake Library - Story Room': '18501 90th St E, Bonney Lake, WA 98391',
      'Buckley Library': '123 S River Ave, Buckley, WA 98321',
      'DuPont Library': '1540 Wilmington Dr, DuPont, WA 98327',
      'Eatonville Library': '205 Center St W, Eatonville, WA 98328',
      'Fife Library': '6622 20th St E, Fife, WA 98424',
      'Fife Library - Meeting Room': '6622 20th St E, Fife, WA 98424',
      'Gig Harbor Library': '4424 Point Fosdick Dr NW, Gig Harbor, WA 98335',
      'Gig Harbor Library - Meeting Room': '4424 Point Fosdick Dr NW, Gig Harbor, WA 98335',
      'Gig Harbor Library - Story Room': '4424 Point Fosdick Dr NW, Gig Harbor, WA 98335',
      'Graham Library': '9202 224th St E, Graham, WA 98338',
      'Graham Library - Meeting Room': '9202 224th St E, Graham, WA 98338',
      'Key Center Library': '8905 Key Peninsula Hwy N, Lakebay, WA 98349',
      'Lakewood Library': '6300 Wildaire Rd SW, Lakewood, WA 98499',
      'Lakewood Library - Meeting Room': '6300 Wildaire Rd SW, Lakewood, WA 98499',
      'Lakewood Library - Story Room': '6300 Wildaire Rd SW, Lakewood, WA 98499',
      'Milton/Edgewood Library': '900 Meridian E, Milton, WA 98354',
      'Orting Library': '202 Washington Ave S, Orting, WA 98360',
      'Parkland/Spanaway Library': '13718 Pacific Ave S, Tacoma, WA 98444',
      'Parkland/Spanaway Library - Meeting Room': '13718 Pacific Ave S, Tacoma, WA 98444',
      'Parkland/Spanaway Library - Story Room': '13718 Pacific Ave S, Tacoma, WA 98444',
      'Peninsula Library': '4305 Borgen Blvd, Gig Harbor, WA 98332',
      'Peninsula Library - Meeting Room': '4305 Borgen Blvd, Gig Harbor, WA 98332',
      'South Hill Library': '15420 Meridian E, South Hill, WA 98375',
      'South Hill Library - Meeting Room': '15420 Meridian E, South Hill, WA 98375',
      'South Hill Library - Story Room': '15420 Meridian E, South Hill, WA 98375',
      'Steilacoom Library': '2950 Steilacoom Blvd, Steilacoom, WA 98388',
      'Summit Library': '5107 112th St E, Tacoma, WA 98446',
      'Summit Library - Meeting Room': '5107 112th St E, Tacoma, WA 98446',
      'Summit Library - Story Room': '5107 112th St E, Tacoma, WA 98446',
      'Sumner Library': '1116 Fryar Ave, Sumner, WA 98390',
      'Sumner Library - Meeting Room': '1116 Fryar Ave, Sumner, WA 98390',
      'Tillicum Library': '14916 Washington Ave SW, Lakewood, WA 98498',
      'University Place Library': '3609 Market Place W, University Place, WA 98466',
      'University Place Library - Meeting Room': '3609 Market Place W, University Place, WA 98466',
      'University Place Library - Story Room': '3609 Market Place W, University Place, WA 98466'
    }
  },

  // Colorado Libraries - Additional
  'Mesa County Libraries': {
    mainAddress: '443 N 6th St, Grand Junction, CO 81501',
    branches: {
      'Central Library': '443 N 6th St, Grand Junction, CO 81501',
      'Central Library Children\'s Center': '443 N 6th St, Grand Junction, CO 81501',
      'Central Library Teen Center': '443 N 6th St, Grand Junction, CO 81501',
      'Central Library Community Room': '443 N 6th St, Grand Junction, CO 81501',
      'Palisade Branch': '119 W 3rd St, Palisade, CO 81526',
      'Palisade Branch - Meeting Room': '119 W 3rd St, Palisade, CO 81526',
      'Clifton Branch': '590 32 Rd, Clifton, CO 81520',
      'Clifton Branch - Meeting Room': '590 32 Rd, Clifton, CO 81520',
      'Clifton Branch Children\'s Center': '590 32 Rd, Clifton, CO 81520',
      'Fruita Branch': '324 N Coulson St, Fruita, CO 81521',
      'Fruita Branch - Meeting Room': '324 N Coulson St, Fruita, CO 81521',
      'Orchard Mesa Branch': '230 Lynwood St, Grand Junction, CO 81503',
      'De Beque Branch': '730 Minter Ave, De Beque, CO 81630',
      'Gateway Branch': '46491 Kannah Creek Rd, Mesa, CO 81643',
      'Collbran Branch': '111 Main St, Collbran, CO 81624',
      '970West Studio': '520 S 7th St, Grand Junction, CO 81501'
    }
  },

  // Iowa Libraries
  'Davenport Public Library': {
    mainAddress: '321 N Main St, Davenport, IA 52801',
    branches: {
      'Main Library': '321 N Main St, Davenport, IA 52801',
      'Main Library - Meeting Room': '321 N Main St, Davenport, IA 52801',
      'Brooke Room': '321 N Main St, Davenport, IA 52801',
      'Building as a whole': '321 N Main St, Davenport, IA 52801',
      'Makerspace': '321 N Main St, Davenport, IA 52801',
      'Meeting Room A': '321 N Main St, Davenport, IA 52801',
      'Meeting Room B': '321 N Main St, Davenport, IA 52801',
      'Story Room': '321 N Main St, Davenport, IA 52801',
      'Fairmount Branch': '3000 N Fairmount St, Davenport, IA 52804',
      'Fairmount Branch - Meeting Room': '3000 N Fairmount St, Davenport, IA 52804',
      'Eastern Avenue Branch': '6000 Eastern Ave, Davenport, IA 52807',
      'Eastern Avenue Branch - Meeting Room': '6000 Eastern Ave, Davenport, IA 52807'
    }
  },

  // Virginia Libraries - Additional
  'Fairfax County Public Library': {
    mainAddress: '12000 Government Center Pkwy, Fairfax, VA 22035',
    branches: {
      'George Mason Regional Library': '7001 Little River Tpke, Annandale, VA 22003',
      'George Mason Regional Library - Meeting Room': '7001 Little River Tpke, Annandale, VA 22003',
      'Burke Centre Library': '5935 Freds Oak Rd, Burke, VA 22015',
      'Burke Centre Library - Meeting Room': '5935 Freds Oak Rd, Burke, VA 22015',
      'Burke Centre Meeting Room 116': '5935 Freds Oak Rd, Burke, VA 22015',
      'Centreville Regional Library': '14200 St Germain Dr, Centreville, VA 20121',
      'Centreville Regional Library - Meeting Room': '14200 St Germain Dr, Centreville, VA 20121',
      'Chantilly Regional Library': '4000 Stringfellow Rd, Chantilly, VA 20151',
      'Chantilly Regional Library - Meeting Room': '4000 Stringfellow Rd, Chantilly, VA 20151',
      'Chantilly Conference Room': '4000 Stringfellow Rd, Chantilly, VA 20151',
      'City of Fairfax Regional Library': '10360 North St, Fairfax, VA 22030',
      'City of Fairfax Regional Library - Meeting Room': '10360 North St, Fairfax, VA 22030',
      'Dolley Madison Library': '1244 Oak Ridge Ave, McLean, VA 22101',
      'Dolley Madison Library - Meeting Room': '1244 Oak Ridge Ave, McLean, VA 22101',
      'Great Falls Library': '9830 Georgetown Pike, Great Falls, VA 22066',
      'Great Falls Library - Meeting Room': '9830 Georgetown Pike, Great Falls, VA 22066',
      'Great Falls Meeting Room': '9830 Georgetown Pike, Great Falls, VA 22066',
      'Herndon Fortnightly Library': '768 Center St, Herndon, VA 20170',
      'Herndon Fortnightly Library - Meeting Room': '768 Center St, Herndon, VA 20170',
      'Kings Park Library': '9000 Burke Lake Rd, Burke, VA 22015',
      'Kings Park Library - Meeting Room': '9000 Burke Lake Rd, Burke, VA 22015',
      'Kings Park Meeting Room': '9000 Burke Lake Rd, Burke, VA 22015',
      'Kingstowne Library': '6500 Landsdowne Centre, Alexandria, VA 22315',
      'Kingstowne Library - Meeting Room': '6500 Landsdowne Centre, Alexandria, VA 22315',
      'Kingstowne Meeting Room': '6500 Landsdowne Centre, Alexandria, VA 22315',
      'Lorton Library': '9520 Richmond Hwy, Lorton, VA 22079',
      'Lorton Library - Meeting Room': '9520 Richmond Hwy, Lorton, VA 22079',
      'Martha Washington Library': '6614 Fort Hunt Rd, Alexandria, VA 22307',
      'Martha Washington Library - Meeting Room': '6614 Fort Hunt Rd, Alexandria, VA 22307',
      'Martha Washington Meeting Room 104A': '6614 Fort Hunt Rd, Alexandria, VA 22307',
      'Oakton Library': '10304 Lynnhaven Pl, Oakton, VA 22124',
      'Oakton Library - Meeting Room': '10304 Lynnhaven Pl, Oakton, VA 22124',
      'Oakton Meeting Room 1': '10304 Lynnhaven Pl, Oakton, VA 22124',
      'Patrick Henry Library': '101 Maple Ave E, Vienna, VA 22180',
      'Patrick Henry Library - Meeting Room': '101 Maple Ave E, Vienna, VA 22180',
      'Pohick Regional Library': '6450 Sydenstricker Rd, Burke, VA 22015',
      'Pohick Regional Library - Meeting Room': '6450 Sydenstricker Rd, Burke, VA 22015',
      'Reston Regional Library': '11925 Bowman Towne Dr, Reston, VA 20190',
      'Reston Regional Library - Meeting Room': '11925 Bowman Towne Dr, Reston, VA 20190',
      'Reston Meeting Room 1': '11925 Bowman Towne Dr, Reston, VA 20190',
      'Richard Byrd Library': '7250 Commerce St, Springfield, VA 22150',
      'Richard Byrd Library - Meeting Room': '7250 Commerce St, Springfield, VA 22150',
      'Sherwood Regional Library': '2501 Sherwood Hall Ln, Alexandria, VA 22306',
      'Sherwood Regional Library - Meeting Room': '2501 Sherwood Hall Ln, Alexandria, VA 22306',
      'Thomas Jefferson Library': '7415 Arlington Blvd, Falls Church, VA 22042',
      'Thomas Jefferson Library - Meeting Room': '7415 Arlington Blvd, Falls Church, VA 22042',
      'Tysons-Pimmit Regional Library': '7584 Leesburg Pike, Falls Church, VA 22043',
      'Tysons-Pimmit Regional Library - Meeting Room': '7584 Leesburg Pike, Falls Church, VA 22043',
      'Woodrow Wilson Library': '6101 Knollwood Dr, Falls Church, VA 22041',
      'Woodrow Wilson Library - Meeting Room': '6101 Knollwood Dr, Falls Church, VA 22041'
    }
  },

  'Arlington County Public Library': {
    mainAddress: '1015 N Quincy St, Arlington, VA 22201',
    branches: {
      'Central Library': '1015 N Quincy St, Arlington, VA 22201',
      'Central Library - Meeting Room': '1015 N Quincy St, Arlington, VA 22201',
      'Central Library - Auditorium': '1015 N Quincy St, Arlington, VA 22201',
      'Children\'s Area': '1015 N Quincy St, Arlington, VA 22201',
      'Campbell Room': '1015 N Quincy St, Arlington, VA 22201',
      'Quincy Room': '1015 N Quincy St, Arlington, VA 22201',
      'Aurora Hills Branch': '735 S 18th St, Arlington, VA 22202',
      'Aurora Hills Branch - Meeting Room': '735 S 18th St, Arlington, VA 22202',
      'Cherrydale Branch': '2190 Military Rd, Arlington, VA 22207',
      'Cherrydale Branch - Meeting Room': '2190 Military Rd, Arlington, VA 22207',
      'Columbia Pike Branch': '816 S Walter Reed Dr, Arlington, VA 22204',
      'Columbia Pike Branch - Meeting Room': '816 S Walter Reed Dr, Arlington, VA 22204',
      'Glencarlyn Branch': '300 S Kensington St, Arlington, VA 22204',
      'Glencarlyn Branch - Meeting Room': '300 S Kensington St, Arlington, VA 22204',
      'Plaza Branch': '2100 Clarendon Blvd, Arlington, VA 22201',
      'Plaza Branch - Meeting Room': '2100 Clarendon Blvd, Arlington, VA 22201',
      'Shirlington Branch': '4200 Campbell Ave, Arlington, VA 22206',
      'Shirlington Branch - Meeting Room': '4200 Campbell Ave, Arlington, VA 22206',
      'Westover Branch': '1644 N McKinley Rd, Arlington, VA 22205',
      'Westover Branch - Meeting Room': '1644 N McKinley Rd, Arlington, VA 22205'
    }
  },

  // Massachusetts Libraries - Additional
  'Cambridge Public Library': {
    mainAddress: '449 Broadway, Cambridge, MA 02138',
    branches: {
      'Main Library': '449 Broadway, Cambridge, MA 02138',
      'Main Library - Meeting Room': '449 Broadway, Cambridge, MA 02138',
      'Main Library - Lecture Hall': '449 Broadway, Cambridge, MA 02138',
      'Program Room': '449 Broadway, Cambridge, MA 02138',
      'Community Room': '449 Broadway, Cambridge, MA 02138',
      'Rey Room': '449 Broadway, Cambridge, MA 02138',
      'Learning Lab': '449 Broadway, Cambridge, MA 02138',
      'The Hive': '449 Broadway, Cambridge, MA 02138',
      'Central Square Branch': '45 Pearl St, Cambridge, MA 02139',
      'Central Square Branch - Meeting Room': '45 Pearl St, Cambridge, MA 02139',
      'Central Square Literacy Center': '45 Pearl St, Cambridge, MA 02139',
      'Collins Branch': '64 Aberdeen Ave, Cambridge, MA 02138',
      'Collins Branch - Meeting Room': '64 Aberdeen Ave, Cambridge, MA 02138',
      'O\'Connell Branch': '48 Sixth St, Cambridge, MA 02141',
      'O\'Connell Branch - Meeting Room': '48 Sixth St, Cambridge, MA 02141',
      'O\'Neill Branch': '70 Rindge Ave, Cambridge, MA 02140',
      'O\'Neill Branch - Meeting Room': '70 Rindge Ave, Cambridge, MA 02140',
      'Valente Branch': '826 Cambridge St, Cambridge, MA 02141',
      'Valente Branch - Meeting Room': '826 Cambridge St, Cambridge, MA 02141'
    }
  },

  // Florida Libraries - Additional
  'Lakeland Public Library': {
    mainAddress: '100 Lake Morton Dr, Lakeland, FL 33801',
    branches: {
      'Main Library': '100 Lake Morton Dr, Lakeland, FL 33801',
      'Main Library Meeting Room': '100 Lake Morton Dr, Lakeland, FL 33801',
      'Main Library - Meeting Room': '100 Lake Morton Dr, Lakeland, FL 33801',
      'Larry R. Jackson Branch': '1700 N Florida Ave, Lakeland, FL 33805',
      'Larry R. Jackson Branch - Meeting Room': '1700 N Florida Ave, Lakeland, FL 33805'
    }
  },

  // New Jersey Libraries - Additional
  'Monmouth County Library': {
    mainAddress: '125 Symmes Dr, Manalapan, NJ 07726',
    branches: {
      'Headquarters': '125 Symmes Dr, Manalapan, NJ 07726',
      'Headquarters - Meeting Room': '125 Symmes Dr, Manalapan, NJ 07726',
      'Children Room Carpet': '125 Symmes Dr, Manalapan, NJ 07726',
      'Allentown Branch': '16 S Main St, Allentown, NJ 08501',
      'Allentown Branch - Meeting Room': '16 S Main St, Allentown, NJ 08501',
      'Atlantic Highlands Branch': '100 First Ave, Atlantic Highlands, NJ 07716',
      'Atlantic Highlands Branch - Meeting Room': '100 First Ave, Atlantic Highlands, NJ 07716',
      'Colts Neck Branch': '1 Winthrop Dr, Colts Neck, NJ 07722',
      'Colts Neck Branch - Meeting Room': '1 Winthrop Dr, Colts Neck, NJ 07722',
      'Eastern Branch': '1001 Rt 35, Shrewsbury, NJ 07702',
      'Eastern Branch - Meeting Room': '1001 Rt 35, Shrewsbury, NJ 07702',
      'Hazlet Township Branch': '251 Middle Rd, Hazlet, NJ 07730',
      'Hazlet Township Branch - Meeting Room': '251 Middle Rd, Hazlet, NJ 07730',
      'Holmdel Branch': '4 Crawford Corner Rd, Holmdel, NJ 07733',
      'Holmdel Branch - Meeting Room': '4 Crawford Corner Rd, Holmdel, NJ 07733',
      'Howell Branch': '318 Old Tavern Rd, Howell, NJ 07731',
      'Howell Branch - Meeting Room': '318 Old Tavern Rd, Howell, NJ 07731',
      'Marlboro Branch': '1 Library Ct, Marlboro, NJ 07746',
      'Marlboro Branch - Meeting Room': '1 Library Ct, Marlboro, NJ 07746',
      'Ocean Township Branch': '701 Deal Rd, Ocean, NJ 07712',
      'Ocean Township Branch - Meeting Room': '701 Deal Rd, Ocean, NJ 07712',
      'Wall Township Branch': '2700 Allaire Rd, Wall, NJ 07719',
      'Wall Township Branch - Meeting Room': '2700 Allaire Rd, Wall, NJ 07719',
      'West Long Branch': '95 Poplar Ave, West Long Branch, NJ 07764',
      'West Long Branch - Meeting Room': '95 Poplar Ave, West Long Branch, NJ 07764'
    }
  },

  'Mercer County Library System': {
    mainAddress: '2751 Brunswick Pike, Lawrenceville, NJ 08648',
    branches: {
      'Lawrence Headquarters': '2751 Brunswick Pike, Lawrenceville, NJ 08648',
      'Lawrence Headquarters - Meeting Room': '2751 Brunswick Pike, Lawrenceville, NJ 08648',
      'Lawrence Activity Room': '2751 Brunswick Pike, Lawrenceville, NJ 08648',
      'Ewing Branch': '61 Scotch Rd, Ewing, NJ 08628',
      'Ewing Branch - Meeting Room': '61 Scotch Rd, Ewing, NJ 08628',
      'Ewing Children\'s Activity Room': '61 Scotch Rd, Ewing, NJ 08628',
      'Hickory Corner Branch': '138 Hickory Corner Rd, East Windsor, NJ 08520',
      'Hickory Corner Branch - Meeting Room': '138 Hickory Corner Rd, East Windsor, NJ 08520',
      'Hickory Corner Children\'s Activity Room': '138 Hickory Corner Rd, East Windsor, NJ 08520',
      'Hightstown Branch': '114 Franklin St, Hightstown, NJ 08520',
      'Hightstown Branch - Meeting Room': '114 Franklin St, Hightstown, NJ 08520',
      'Hopewell Branch': '245 Pennington Titusville Rd, Pennington, NJ 08534',
      'Hopewell Branch - Meeting Room': '245 Pennington Titusville Rd, Pennington, NJ 08534',
      'Hopewell Activity Room': '245 Pennington Titusville Rd, Pennington, NJ 08534',
      'Hollowbrook Community Center Branch': '320 Hollowbrook Dr, Ewing, NJ 08638',
      'Princeton Branch': '65 Witherspoon St, Princeton, NJ 08542',
      'Princeton Branch - Meeting Room': '65 Witherspoon St, Princeton, NJ 08542',
      'Robbinsville Branch': '42 Allentown Robbinsville Rd, Robbinsville, NJ 08691',
      'Robbinsville Branch - Meeting Room': '42 Allentown Robbinsville Rd, Robbinsville, NJ 08691',
      'Twin Rivers Branch': '276 Abbington Dr, East Windsor, NJ 08520',
      'West Windsor Branch': '333 N Post Rd, West Windsor, NJ 08550',
      'West Windsor Branch - Meeting Room': '333 N Post Rd, West Windsor, NJ 08550',
      'West Windsor Activity Room': '333 N Post Rd, West Windsor, NJ 08550',
      'West Windsor Room 2/3': '333 N Post Rd, West Windsor, NJ 08550'
    }
  },

  // New York Libraries - Additional (Long Island)
  'Hicksville Public Library': {
    mainAddress: '169 Jerusalem Ave, Hicksville, NY 11801',
    branches: {
      'Main Library': '169 Jerusalem Ave, Hicksville, NY 11801',
      'Community Room': '169 Jerusalem Ave, Hicksville, NY 11801',
      'Community Room (E)': '169 Jerusalem Ave, Hicksville, NY 11801',
      'Community Room (W)': '169 Jerusalem Ave, Hicksville, NY 11801',
      'Training Room': '169 Jerusalem Ave, Hicksville, NY 11801',
      'Meeting Room': '169 Jerusalem Ave, Hicksville, NY 11801',
      'Story Room': '169 Jerusalem Ave, Hicksville, NY 11801'
    }
  },

  'Garden City Public Library': {
    mainAddress: '60 Seventh St, Garden City, NY 11530',
    branches: {
      'Main Library': '60 Seventh St, Garden City, NY 11530',
      'Community Room': '60 Seventh St, Garden City, NY 11530',
      'Children - Story Time': '60 Seventh St, Garden City, NY 11530',
      'Children\'s Room': '60 Seventh St, Garden City, NY 11530',
      'Meeting Room': '60 Seventh St, Garden City, NY 11530'
    }
  },

  'Oceanside Public Library': {
    mainAddress: '30 Davison Ave, Oceanside, NY 11572',
    branches: {
      'Main Library': '30 Davison Ave, Oceanside, NY 11572',
      'Community Room': '30 Davison Ave, Oceanside, NY 11572',
      'Community 1': '30 Davison Ave, Oceanside, NY 11572',
      'Community 1 Age Group: Children': '30 Davison Ave, Oceanside, NY 11572',
      'Community 3': '30 Davison Ave, Oceanside, NY 11572',
      'Community 3 Age Group: Special Needs Children': '30 Davison Ave, Oceanside, NY 11572',
      'Children\'s Program Room': '30 Davison Ave, Oceanside, NY 11572',
      'Children\'s Program Room Age Group: Children': '30 Davison Ave, Oceanside, NY 11572',
      'Children\'s Program Room Age Group: Teens (Grade 7-12)': '30 Davison Ave, Oceanside, NY 11572',
      'Meeting Room': '30 Davison Ave, Oceanside, NY 11572'
    }
  },

  'East Meadow Public Library': {
    mainAddress: '1886 Front St, East Meadow, NY 11554',
    branches: {
      'Main Library': '1886 Front St, East Meadow, NY 11554',
      'Lobby': '1886 Front St, East Meadow, NY 11554',
      'Makerspace Room A': '1886 Front St, East Meadow, NY 11554',
      'Makerspace Room B': '1886 Front St, East Meadow, NY 11554',
      'Children\'s Story Hour Room': '1886 Front St, East Meadow, NY 11554',
      'Conference Room': '1886 Front St, East Meadow, NY 11554',
      'Community Room': '1886 Front St, East Meadow, NY 11554'
    }
  },

  'Newark Public Library': {
    mainAddress: '5 Washington St, Newark, NJ 07102',
    branches: {
      'Main Branch': '5 Washington St, Newark, NJ 07102',
      'Main Branch - Meeting Room': '5 Washington St, Newark, NJ 07102',
      'Children\'s Room': '5 Washington St, Newark, NJ 07102',
      'Teen Room': '5 Washington St, Newark, NJ 07102',
      'Branch Brook': '235 Clifton Ave, Newark, NJ 07104',
      'Clinton Branch': '739 S Clinton Ave, Trenton, NJ 08611',
      'Madison Branch': '790 Clinton Ave, Newark, NJ 07108',
      'North End Branch': '722 Summer Ave, Newark, NJ 07104',
      'Roseville Branch': '99 5th St, Newark, NJ 07107',
      'Springfield Branch': '50 Hayes St, Newark, NJ 07103',
      'Van Buren Branch': '140 Van Buren St, Newark, NJ 07105',
      'Vailsburg Branch': '75 Alexander St, Newark, NJ 07106',
      'Weequahic Branch': '355 Osborne Ter, Newark, NJ 07112'
    }
  },

  // Orange County CA (Critical fix - was matching to Virginia)
  'Orange County Public Library': {
    mainAddress: '1501 E St Andrew Pl, Santa Ana, CA 92705',
    branches: {
      'Costa Mesa - Donald Dungan Library': '1855 Park Ave, Costa Mesa, CA 92627',
      'Costa Mesa - Mesa Verde Library': '2969 Mesa Verde Dr E, Costa Mesa, CA 92626',
      'Cypress': '5331 Orange Ave, Cypress, CA 90630',
      'Dana Point': '33841 Niguel Rd, Dana Point, CA 92629',
      'El Toro': '24672 Raymond Way, Lake Forest, CA 92630',
      'Foothill Ranch': '27002 Cabriole, Foothill Ranch, CA 92610',
      'Fountain Valley': '17635 Los Alamos St, Fountain Valley, CA 92708',
      'Garden Grove - Chapman Library': '9182 Chapman Ave, Garden Grove, CA 92841',
      'Garden Grove - Main Library': '11200 Stanford Ave, Garden Grove, CA 92840',
      'Irvine - Heritage Park Library': '14361 Yale Ave, Irvine, CA 92604',
      'Irvine - Katie Wheeler Library': '13109 Old Myford Rd, Irvine, CA 92602',
      'Irvine - University Park Library': '4512 Sandburg Way, Irvine, CA 92612',
      'La Habra': '221 E La Habra Blvd, La Habra, CA 90631',
      'La Palma': '7842 Walker St, La Palma, CA 90623',
      'Ladera Ranch': '29551 Sienna Pkwy, Ladera Ranch, CA 92694',
      'Laguna Beach': '363 Glenneyre St, Laguna Beach, CA 92651',
      'Laguna Hills': '25555 Alicia Pkwy, Laguna Hills, CA 92653',
      'Laguna Niguel': '30341 Crown Valley Pkwy, Laguna Niguel, CA 92677',
      'Lake Forest': '25581 Trabuco Rd, Lake Forest, CA 92630',
      'Los Alamitos Rossmoor': '12700 Montecito Rd, Seal Beach, CA 90740',
      'Rancho Santa Margarita': '30902 La Promesa, Rancho Santa Margarita, CA 92688',
      'San Clemente': '242 Avenida Del Mar, San Clemente, CA 92672',
      'San Juan Capistrano': '31495 El Camino Real, San Juan Capistrano, CA 92675',
      'Seal Beach': '707 Electric Ave, Seal Beach, CA 90740',
      'Stanton': '7850 Katella Ave, Stanton, CA 90680',
      'Tustin': '345 E Main St, Tustin, CA 92780',
      'Villa Park': '17865 Santiago Blvd, Villa Park, CA 92861',
      'Westminster': '8180 13th St, Westminster, CA 92683',
      'Yorba Linda': '18181 Imperial Hwy, Yorba Linda, CA 92886'
    }
  },

  // Washington Libraries - Additional
  'Spokane County Library District': {
    mainAddress: '4322 N Argonne Rd, Spokane, WA 99212',
    branches: {
      'Argonne Library': '4322 N Argonne Rd, Spokane, WA 99212',
      'Argonne Library - Meeting Room': '4322 N Argonne Rd, Spokane, WA 99212',
      'Airway Heights Library': '1213 S Lundstrom St, Airway Heights, WA 99001',
      'Cheney Library': '610 1st St, Cheney, WA 99004',
      'Deer Park Library': '208 S Forest Ave, Deer Park, WA 99006',
      'Fairfield Library': '305 E Main St, Fairfield, WA 99012',
      'LINC': '904 W Indiana Ave, Spokane, WA 99205',
      'Medical Lake Library': '321 E Lake St, Medical Lake, WA 99022',
      'Moran Prairie Library': '6004 S Regal St, Spokane, WA 99223',
      'Moran Prairie Library - Meeting Room': '6004 S Regal St, Spokane, WA 99223',
      'North Spokane Library': '44 E Hawthorne Rd, Spokane, WA 99218',
      'North Spokane Library - Meeting Room': '44 E Hawthorne Rd, Spokane, WA 99218',
      'Otis Orchards Library': '22324 E Wellesley Ave, Otis Orchards, WA 99027',
      'Spokane Valley Library': '12004 E Main Ave, Spokane Valley, WA 99206',
      'Spokane Valley Library - Meeting Room': '12004 E Main Ave, Spokane Valley, WA 99206',
      'Conference Room D': '12004 E Main Ave, Spokane Valley, WA 99206'
    }
  },

  'NCW Libraries': {
    mainAddress: '16 N Columbia St, Wenatchee, WA 98801',
    branches: {
      'Wenatchee Public Library': '310 Douglas St, Wenatchee, WA 98801',
      'Wenatchee Public Library - Meeting Room': '310 Douglas St, Wenatchee, WA 98801',
      'Sagebrush Meeting Room': '310 Douglas St, Wenatchee, WA 98801',
      'CASHMERE- Computer Lab': '300 Woodring St, Cashmere, WA 98815',
      'CASHMERE- Onsite': '300 Woodring St, Cashmere, WA 98815',
      'Cashmere Public Library': '300 Woodring St, Cashmere, WA 98815',
      'EPHRATA- Kids\' Zone': '45 Alder St NW, Ephrata, WA 98823',
      'EPHRATA- Onsite': '45 Alder St NW, Ephrata, WA 98823',
      'Ephrata Public Library': '45 Alder St NW, Ephrata, WA 98823',
      'LEAVENWORTH- Children\'s Area': '700 Hwy 2, Leavenworth, WA 98826',
      'LEAVENWORTH- Onsite': '700 Hwy 2, Leavenworth, WA 98826',
      'Leavenworth Public Library': '700 Hwy 2, Leavenworth, WA 98826',
      'MANSON- Onsite': '80 Wapato Way, Manson, WA 98831',
      'Manson Community Library': '80 Wapato Way, Manson, WA 98831',
      'MOSES LAKE- Children\'s Room': '418 E 5th Ave, Moses Lake, WA 98837',
      'MOSES LAKE- Onsite': '418 E 5th Ave, Moses Lake, WA 98837',
      'Moses Lake Public Library': '418 E 5th Ave, Moses Lake, WA 98837',
      'OKANOGAN- Onsite': '228 Pine St, Okanogan, WA 98840',
      'Okanogan Public Library': '228 Pine St, Okanogan, WA 98840',
      'ROYAL CITY- Onsite': '365 Camelia St NW, Royal City, WA 99357',
      'Royal City Public Library': '365 Camelia St NW, Royal City, WA 99357',
      'WATERVILLE- Programming Space': '105 N Chelan Ave, Waterville, WA 98858',
      'Waterville Public Library': '105 N Chelan Ave, Waterville, WA 98858'
    }
  },

  'Whatcom County Library System': {
    mainAddress: '5205 Northwest Rd, Bellingham, WA 98226',
    branches: {
      'Administrative Services': '5205 Northwest Rd, Bellingham, WA 98226',
      'Blaine Library': '610 3rd St, Blaine, WA 98230',
      'Blaine': '610 3rd St, Blaine, WA 98230',
      'Blaine Meeting Room': '610 3rd St, Blaine, WA 98230',
      'Blaine Small Meeting Pod': '610 3rd St, Blaine, WA 98230',
      'Deming Library': '5044 Mt Baker Hwy, Deming, WA 98244',
      'Deming Meeting Room': '5044 Mt Baker Hwy, Deming, WA 98244',
      'Everson Library': '104 Kirsch Dr, Everson, WA 98247',
      'Ferndale Library': '2125 Main St, Ferndale, WA 98248',
      'Ferndale Meeting Room': '2125 Main St, Ferndale, WA 98248',
      'Island Library': '2144 South Shore Rd, Anacortes, WA 98221',
      'Lynden Library': '216 4th St, Lynden, WA 98264',
      'Lynden Meeting Room': '216 4th St, Lynden, WA 98264',
      'North Fork Library': '7506 Kendall Rd, Maple Falls, WA 98266',
      'Point Roberts Library': '1418 Gulf Rd, Point Roberts, WA 98281',
      'Point Roberts Meeting Room': '1418 Gulf Rd, Point Roberts, WA 98281',
      'South Whatcom Library': '1 Crabapple Ln, Sudden Valley, WA 98229',
      'Sumas Library': '451 2nd St, Sumas, WA 98295'
    }
  },

  // South Carolina Libraries - Additional
  'Berkeley County Library System': {
    mainAddress: '1003 Hwy 52, Moncks Corner, SC 29461',
    branches: {
      'Moncks Corner Library': '1003 Hwy 52, Moncks Corner, SC 29461',
      'Moncks Corner Library - Meeting Room': '1003 Hwy 52, Moncks Corner, SC 29461',
      'Activity Room': '1003 Hwy 52, Moncks Corner, SC 29461',
      'Mobile Library': '1003 Hwy 52, Moncks Corner, SC 29461',
      'Goose Creek Library': '325 Old Moncks Corner Rd, Goose Creek, SC 29445',
      'Goose Creek Library - Meeting Room': '325 Old Moncks Corner Rd, Goose Creek, SC 29445',
      'Hanahan Library': '1216 Old Murray Dr, Hanahan, SC 29410',
      'St Stephen Library': '113 Ravenell Dr, St Stephen, SC 29479',
      'Sangaree Library': '149 Gaillard Rd, Summerville, SC 29483',
      'Cross Library': '1689 Old Hwy 6, Cross, SC 29436',
      'Daniel Island Library': '2301 Daniel Island Dr, Daniel Island, SC 29492'
    }
  },

  // North Carolina Libraries - Additional
  'Gaston County Public Library': {
    mainAddress: '1555 E Garrison Blvd, Gastonia, NC 28054',
    branches: {
      'Main Library': '1555 E Garrison Blvd, Gastonia, NC 28054',
      'Main Library - Meeting Room': '1555 E Garrison Blvd, Gastonia, NC 28054',
      'Branch Library': '1555 E Garrison Blvd, Gastonia, NC 28054',
      'Branch Library - Meeting Room': '1555 E Garrison Blvd, Gastonia, NC 28054',
      'Belmont Branch': '125 N Main St, Belmont, NC 28012',
      'Bessemer City Branch': '219 W Virginia Ave, Bessemer City, NC 28016',
      'Cherryville Branch': '530 E Main St, Cherryville, NC 28021',
      'Dallas Branch': '109 S Holland St, Dallas, NC 28034',
      'Lowell Branch': '325 W 1st St, Lowell, NC 28098',
      'Mount Holly Branch': '245 W Glendale Ave, Mount Holly, NC 28120',
      'Stanley Branch': '308 N Peterson St, Stanley, NC 28164'
    }
  },

  'Brunswick County Library': {
    mainAddress: '109 W Moore St, Southport, NC 28461',
    branches: {
      'Southport Library': '109 W Moore St, Southport, NC 28461',
      'Southport Library - Meeting Room': '109 W Moore St, Southport, NC 28461',
      'Leland Library': '487 Village Rd NE, Leland, NC 28451',
      'Leland Library - Meeting Room': '487 Village Rd NE, Leland, NC 28451',
      'Leland Meeting Room': '487 Village Rd NE, Leland, NC 28451',
      'Bolivia Library': '20 Government Center Dr NE, Bolivia, NC 28422',
      'Bolivia Library - Meeting Room': '20 Government Center Dr NE, Bolivia, NC 28422',
      'Center Pit': '20 Government Center Dr NE, Bolivia, NC 28422',
      'SWB Meeting Room #125': '20 Government Center Dr NE, Bolivia, NC 28422',
      'Rourk Library': '109 W Moore St, Southport, NC 28461',
      'Shallotte Library': '112 Village Rd SW, Shallotte, NC 28470',
      'Oak Island Library': '203 SE 75th St, Oak Island, NC 28465',
      'Calabash Library': '898 Persimmon Rd SW, Calabash, NC 28467'
    }
  },

  'Durham County Library': {
    mainAddress: '300 N Roxboro St, Durham, NC 27701',
    branches: {
      'Main Library': '300 N Roxboro St, Durham, NC 27701',
      'Main Library - Meeting Room': '300 N Roxboro St, Durham, NC 27701',
      'East Meeting Room': '300 N Roxboro St, Durham, NC 27701',
      'East Regional Library': '211 Lick Creek Ln, Durham, NC 27703',
      'East Regional Library - Meeting Room': '211 Lick Creek Ln, Durham, NC 27703',
      'East Regional - Children\'s Programming Room': '211 Lick Creek Ln, Durham, NC 27703',
      'North Regional Library': '221 Milton Rd, Durham, NC 27712',
      'North Regional Library - Meeting Room': '221 Milton Rd, Durham, NC 27712',
      'North Regional - Children\'s Programming Room': '221 Milton Rd, Durham, NC 27712',
      'Southwest Regional Library': '3605 Shannon Rd, Durham, NC 27707',
      'Southwest Regional Library - Meeting Room': '3605 Shannon Rd, Durham, NC 27707',
      'Southwest Regional - Children\'s Area': '3605 Shannon Rd, Durham, NC 27707',
      'South Regional Library': '4505 S Alston Ave, Durham, NC 27713',
      'South Regional Library - Meeting Room': '4505 S Alston Ave, Durham, NC 27713',
      'Bragtown Branch': '3200 Dearborn Dr, Durham, NC 27704',
      'Stanford L Warren Branch': '1201 Fayetteville St, Durham, NC 27707'
    }
  },

  'Union County Public Library': {
    mainAddress: '316 E Windsor St, Monroe, NC 28112',
    branches: {
      'Main Library': '316 E Windsor St, Monroe, NC 28112',
      'Main Library - Meeting Room': '316 E Windsor St, Monroe, NC 28112',
      'Children\'s Floor': '316 E Windsor St, Monroe, NC 28112',
      'Kerr Meeting Room': '316 E Windsor St, Monroe, NC 28112',
      'Union West Library': '123 Unionville Indian Trail Rd W, Indian Trail, NC 28079',
      'Union West Library - Meeting Room': '123 Unionville Indian Trail Rd W, Indian Trail, NC 28079',
      'Union West Meeting Room': '123 Unionville Indian Trail Rd W, Indian Trail, NC 28079',
      'Marshville Branch': '109 S Elm St, Marshville, NC 28103',
      'Waxhaw Branch': '509 S Providence St, Waxhaw, NC 28173',
      'Wingate Branch': '301 S Camden Rd, Wingate, NC 28174'
    }
  },

  // Rhode Island Libraries
  'Cranston Public Library': {
    mainAddress: '140 Sockanosset Cross Rd, Cranston, RI 02920',
    branches: {
      'Central Library': '140 Sockanosset Cross Rd, Cranston, RI 02920',
      'Central Library - Meeting Room': '140 Sockanosset Cross Rd, Cranston, RI 02920',
      'Conference Room': '140 Sockanosset Cross Rd, Cranston, RI 02920',
      'Program Room': '140 Sockanosset Cross Rd, Cranston, RI 02920',
      'Arlington Branch': '316 Pontiac Ave, Cranston, RI 02910',
      'Auburn Branch': '396 Pontiac Ave, Cranston, RI 02910',
      'Knightsville Branch': '1935 Cranston St, Cranston, RI 02920',
      'Oak Lawn Branch': '95 Wilbur Ave, Cranston, RI 02921',
      'William Hall Branch': '1825 Broad St, Cranston, RI 02905'
    }
  },

  'East Providence Public Library': {
    mainAddress: '41 Grove Ave, East Providence, RI 02914',
    branches: {
      'Weaver Library': '41 Grove Ave, East Providence, RI 02914',
      'Weaver Library - Meeting Room': '41 Grove Ave, East Providence, RI 02914',
      'Weaver Library - Program Room': '41 Grove Ave, East Providence, RI 02914',
      'Weaver Library - Children\'s Room': '41 Grove Ave, East Providence, RI 02914',
      'Fuller Creative Learning Center': '41 Grove Ave, East Providence, RI 02914',
      'Riverside Branch': '475 Bullocks Point Ave, East Providence, RI 02915',
      'Riverside - Program Room': '475 Bullocks Point Ave, East Providence, RI 02915',
      'Rumford Branch': '37 Newport Ave, East Providence, RI 02916'
    }
  },

  // Texas Libraries - Additional
  'Corpus Christi Public Libraries': {
    mainAddress: '805 Comanche St, Corpus Christi, TX 78401',
    branches: {
      'La Retama Central Library': '805 Comanche St, Corpus Christi, TX 78401',
      'La Retama Central Library - Meeting Room': '805 Comanche St, Corpus Christi, TX 78401',
      'Children\'s Area': '805 Comanche St, Corpus Christi, TX 78401',
      'At the Circulation Desk': '805 Comanche St, Corpus Christi, TX 78401',
      'Anita and W.T. Neyland Library': '1230 Carmel Pkwy, Corpus Christi, TX 78411',
      'Bell Library': '4914 Kostoryz Rd, Corpus Christi, TX 78415',
      'Ben F. McDonald Public Library': '4044 Greenwood Dr, Corpus Christi, TX 78416',
      'Broadmoor Branch': '1626 N Browne, Corpus Christi, TX 78406',
      'Garcia Library': '5930 Brockhampton St, Corpus Christi, TX 78414',
      'Greenwood Library': '4314 Greenwood Dr, Corpus Christi, TX 78416',
      'Janet F. Harte Library': '2629 Waldron Rd, Corpus Christi, TX 78418',
      'Owen R. Hopkins Library': 'Sunrise Mall, 5858 S Padre Island Dr, Corpus Christi, TX 78412'
    }
  },

  // California Libraries - Additional
  'Berkeley Public Library': {
    mainAddress: '2090 Kittredge St, Berkeley, CA 94704',
    branches: {
      'Central Library': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Community Meeting Room': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Mystery Room': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - The Commons': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Art & Music Study Hall': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Electronic Classroom': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Teen Room': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Berkeley History Room': '2090 Kittredge St, Berkeley, CA 94704',
      'Central Library - Children\'s Non-Fiction Room': '2090 Kittredge St, Berkeley, CA 94704',
      'Claremont Branch': '2940 Benvenue Ave, Berkeley, CA 94705',
      'Claremont Branch - Claremont Area Flex Space': '2940 Benvenue Ave, Berkeley, CA 94705',
      'Claremont Branch - Claremont Teen Room': '2940 Benvenue Ave, Berkeley, CA 94705',
      'North Branch': '1170 The Alameda, Berkeley, CA 94707',
      'North Branch - North Branch Meeting Room': '1170 The Alameda, Berkeley, CA 94707',
      'North Branch - North Teen Room': '1170 The Alameda, Berkeley, CA 94707',
      'Tarea Hall Pittman South Branch': '1901 Russell St, Berkeley, CA 94703',
      'Tarea Hall Pittman South Branch - THPS Branch Meeting Room': '1901 Russell St, Berkeley, CA 94703',
      'Tarea Hall Pittman South Branch - South Teen Room': '1901 Russell St, Berkeley, CA 94703',
      'West Branch': '1125 University Ave, Berkeley, CA 94702',
      'West Branch - West Branch Meeting Room': '1125 University Ave, Berkeley, CA 94702',
      'West Branch - West Teen Room': '1125 University Ave, Berkeley, CA 94702',
      'Virtual': '2090 Kittredge St, Berkeley, CA 94704'
    }
  },

  // California Libraries - LA County
  'LA County Library': {
    mainAddress: '7400 Imperial Hwy, Downey, CA 90242',
    branches: {
      'Headquarters': '7400 Imperial Hwy, Downey, CA 90242',
      'Virtual Program': '7400 Imperial Hwy, Downey, CA 90242',
      // Branch libraries with meeting rooms
      'A C Bilbrew Library': '150 E El Segundo Blvd, Los Angeles, CA 90061',
      'A C Bilbrew Library - Activity Room': '150 E El Segundo Blvd, Los Angeles, CA 90061',
      'A C Bilbrew Library - Meeting Room': '150 E El Segundo Blvd, Los Angeles, CA 90061',
      'Anthony Quinn Library': '3965 Cesar Chavez Ave, Los Angeles, CA 90063',
      'Anthony Quinn Library - Meeting Room': '3965 Cesar Chavez Ave, Los Angeles, CA 90063',
      'East Rancho Dominguez Library': '4420 E Rose St, East Rancho Dominguez, CA 90221',
      'East Rancho Dominguez Library - Meeting Room': '4420 E Rose St, East Rancho Dominguez, CA 90221',
      'El Camino Real Library': '4264 E Whittier Blvd, Los Angeles, CA 90023',
      'El Camino Real Library - Meeting Room': '4264 E Whittier Blvd, Los Angeles, CA 90023',
      'Live Oak Library': '4153 E Live Oak Ave, Arcadia, CA 91006',
      'Live Oak Library - Meeting Room': '4153 E Live Oak Ave, Arcadia, CA 91006',
      'Lloyd Taber-Marina del Rey Library': '4533 Admiralty Way, Marina del Rey, CA 90292',
      'Lloyd Taber-Marina del Rey Library - Meeting Room': '4533 Admiralty Way, Marina del Rey, CA 90292',
      'Rowland Heights Library': '1850 Nogales St, Rowland Heights, CA 91748',
      'Rowland Heights Library - Meeting Room': '1850 Nogales St, Rowland Heights, CA 91748',
      'San Dimas Library': '145 N Walnut Ave, San Dimas, CA 91773',
      'San Dimas Library - Meeting Room': '145 N Walnut Ave, San Dimas, CA 91773',
      'South Whittier Library': '14433 Leffingwell Rd, Whittier, CA 90604',
      'South Whittier Library - Meeting Room': '14433 Leffingwell Rd, Whittier, CA 90604',
      'Sunkist Library': '840 N Puente Ave, La Puente, CA 91746',
      'Sunkist Library - Meeting Room': '840 N Puente Ave, La Puente, CA 91746',
      'West Covina Library': '1601 W Covina Pkwy, West Covina, CA 91790',
      'West Covina Library - Meeting Room': '1601 W Covina Pkwy, West Covina, CA 91790',
      'West Covina Library - Seminar Room': '1601 W Covina Pkwy, West Covina, CA 91790',
      'West Hollywood Library': '625 N San Vicente Blvd, West Hollywood, CA 90069',
      'West Hollywood Library - Meeting Room': '625 N San Vicente Blvd, West Hollywood, CA 90069',
      'Willowbrook Library': '11838 Wilmington Ave, Los Angeles, CA 90059',
      'Willowbrook Library - Meeting Room': '11838 Wilmington Ave, Los Angeles, CA 90059',
      'West Hollywood Library - Children\'s Theater': '625 N San Vicente Blvd, West Hollywood, CA 90069',
      'Artesia Library': '18801 Elaine Ave, Artesia, CA 90701',
      'Artesia Library - Meeting Room': '18801 Elaine Ave, Artesia, CA 90701',
      'Rosemead Library': '8800 Valley Blvd, Rosemead, CA 91770',
      'Rosemead Library - Meeting Room': '8800 Valley Blvd, Rosemead, CA 91770',
      'Carson Library': '151 E Carson St, Carson, CA 90745',
      'Carson Library - Meeting Room': '151 E Carson St, Carson, CA 90745',
      'San Fernando Library': '217 N Maclay Ave, San Fernando, CA 91340',
      'San Fernando Library - Meeting Room': '217 N Maclay Ave, San Fernando, CA 91340',
      'City Terrace Library': '4025 City Terrace Dr, Los Angeles, CA 90063',
      'City Terrace Library - Meeting Room': '4025 City Terrace Dr, Los Angeles, CA 90063',
      'George Nye, Jr. Library': '6600 E Imperial Hwy, Downey, CA 90242',
      'George Nye, Jr. Library - Meeting Room': '6600 E Imperial Hwy, Downey, CA 90242',
      'Montebello Library': '1550 W Beverly Blvd, Montebello, CA 90640',
      'Montebello Library - Meeting Room': '1550 W Beverly Blvd, Montebello, CA 90640',
      'East Los Angeles Library': '4837 E 3rd St, Los Angeles, CA 90022',
      'East Los Angeles Library - Meeting Room': '4837 E 3rd St, Los Angeles, CA 90022',
      'Clifton M. Brakensiek Library': '9945 E Flower St, Bellflower, CA 90706',
      'Clifton M. Brakensiek Library - Meeting Room': '9945 E Flower St, Bellflower, CA 90706',
      'Gardena Mayme Dear Library': '1731 W Gardena Blvd, Gardena, CA 90247',
      'Gardena Mayme Dear Library - Meeting Room': '1731 W Gardena Blvd, Gardena, CA 90247',
      'View Park Bebe Moore Campbell Library': '3854 W 54th St, Los Angeles, CA 90043',
      'View Park Bebe Moore Campbell Library - Meeting Room': '3854 W 54th St, Los Angeles, CA 90043',
      'View Park Bebe Moore Campbell Library - Study Room': '3854 W 54th St, Los Angeles, CA 90043',
      'Quartz Hill Library': '5040 W Ave M-2, Quartz Hill, CA 93536',
      'Quartz Hill Library - Meeting Room': '5040 W Ave M-2, Quartz Hill, CA 93536',
      'El Monte Library': '3224 Tyler Ave, El Monte, CA 91731',
      'El Monte Library - Meeting Room': '3224 Tyler Ave, El Monte, CA 91731',
      'Alondra Library': '11949 Alondra Blvd, Norwalk, CA 90650',
      'Alondra Library - Meeting Room': '11949 Alondra Blvd, Norwalk, CA 90650',
      'Alondra Library - Conference Room': '11949 Alondra Blvd, Norwalk, CA 90650',
      'Baldwin Park Library': '4181 Baldwin Park Blvd, Baldwin Park, CA 91706',
      'Baldwin Park Library - Meeting Room': '4181 Baldwin Park Blvd, Baldwin Park, CA 91706',
      'Angelo M. Iacoboni Library': '4990 Clark Ave, Lakewood, CA 90712',
      'Angelo M. Iacoboni Library - Meeting Room': '4990 Clark Ave, Lakewood, CA 90712',
      'Pico Rivera Library': '9001 Mines Ave, Pico Rivera, CA 90660',
      'Pico Rivera Library - Meeting Room': '9001 Mines Ave, Pico Rivera, CA 90660',
      'Topanga Library': '122 N Topanga Canyon Blvd, Topanga, CA 90290',
      'Topanga Library - Meeting Room': '122 N Topanga Canyon Blvd, Topanga, CA 90290'
    }
  },

  // California Libraries - Glendale
  'Glendale Library, Arts & Culture': {
    mainAddress: '222 E Harvard St, Glendale, CA 91205',
    branches: {
      'Glendale Central Library': '222 E Harvard St, Glendale, CA 91205',
      'Glendale Central Library - Meeting Room': '222 E Harvard St, Glendale, CA 91205',
      'Glendale Central Library - MakerSpace': '222 E Harvard St, Glendale, CA 91205',
      'Glendale Central Library - ReflectSpace Annex': '222 E Harvard St, Glendale, CA 91205',
      'Glendale Central Library - Sound Space': '222 E Harvard St, Glendale, CA 91205',
      'Glendale Central Library - Re': '222 E Harvard St, Glendale, CA 91205',
      'Adams Square Mini Park Gas Station': '222 E Harvard St, Glendale, CA 91205',
      'Brand Studios': '222 E Harvard St, Glendale, CA 91205',
      'Online Event': '222 E Harvard St, Glendale, CA 91205',
      'Brand Library & Art Center': '1601 W Mountain St, Glendale, CA 91201',
      'Chevy Chase Branch': '3301 E Chevy Chase Dr, Glendale, CA 91206',
      'Grandview Branch': '1535 5th St, Glendale, CA 91201',
      'Library Connection @ Adams Square': '1120 E Chevy Chase Dr, Glendale, CA 91205',
      'Montrose Branch': '2465 Honolulu Ave, Montrose, CA 91020',
      'Pacific Park Branch': '501 S Pacific Ave, Glendale, CA 91204'
    }
  },

  // Arizona Libraries
  'Pima County Public Library': {
    mainAddress: '101 N Stone Ave, Tucson, AZ 85701',
    branches: {
      'Joel D Valdez Main Library': '101 N Stone Ave, Tucson, AZ 85701',
      'Joel D Valdez Main LibraryJoel D Valdez Main Library': '101 N Stone Ave, Tucson, AZ 85701',
      'Dusenberry-River Library': '5605 E River Rd, Tucson, AZ 85750',
      'Dusenberry-River LibraryDusenberry-River Library': '5605 E River Rd, Tucson, AZ 85750',
      'Joyner-Green Valley Library': '601 N La Cañada Dr, Green Valley, AZ 85614',
      'Joyner-Green Valley LibraryJoyner-Green Valley Library': '601 N La Cañada Dr, Green Valley, AZ 85614',
      'Oro Valley Public Library': '1305 W Naranja Dr, Oro Valley, AZ 85737',
      'Oro Valley Public LibraryOro Valley Public Library': '1305 W Naranja Dr, Oro Valley, AZ 85737',
      'Valencia Library': '202 W Valencia Rd, Tucson, AZ 85706',
      'Valencia LibraryValencia Library': '202 W Valencia Rd, Tucson, AZ 85706',
      'Quincie Douglas Library': '1585 E 36th St, Tucson, AZ 85713',
      'Quincie Douglas LibraryQuincie Douglas Library': '1585 E 36th St, Tucson, AZ 85713',
      'Flowing Wells Library': '1730 W Wetmore Rd, Tucson, AZ 85705',
      'Flowing Wells LibraryFlowing Wells Library': '1730 W Wetmore Rd, Tucson, AZ 85705',
      'Nanini Library': '7300 N Shannon Rd, Tucson, AZ 85741',
      'Nanini LibraryNanini Library': '7300 N Shannon Rd, Tucson, AZ 85741',
      'Murphy-Wilmot Library': '530 N Wilmot Rd, Tucson, AZ 85711',
      'Murphy-Wilmot LibraryMurphy-Wilmot Library': '530 N Wilmot Rd, Tucson, AZ 85711',
      'Martha Cooper Library': '1377 N Catalina Ave, Tucson, AZ 85712',
      'Martha Cooper LibraryMartha Cooper Library': '1377 N Catalina Ave, Tucson, AZ 85712',
      'Robles Junction Community Center': '16750 S Ajo Way, Tucson, AZ 85735',
      'Robles Junction Community CenterRobles Junction Community Center': '16750 S Ajo Way, Tucson, AZ 85735',
      'San Fernando School #35': '5002 S 12th Ave, Tucson, AZ 85706',
      'San Fernando School #35San Fernando School #35': '5002 S 12th Ave, Tucson, AZ 85706',
      'Eckstrom-Columbus Library': '4350 E 22nd St, Tucson, AZ 85711',
      'Eckstrom-Columbus LibraryEckstrom-Columbus Library': '4350 E 22nd St, Tucson, AZ 85711',
      'Southwest Library': '6855 S Mark Rd, Tucson, AZ 85757',
      'Southwest LibrarySouthwest Library': '6855 S Mark Rd, Tucson, AZ 85757',
      'El Pueblo Library': '101 W Irvington Rd, Tucson, AZ 85714',
      'El Rio Library': '1390 W Speedway Blvd, Tucson, AZ 85745',
      'Himmel Park Library': '1035 N Treat Ave, Tucson, AZ 85716',
      'Kirk-Bear Canyon Library': '8959 E Tanque Verde Rd, Tucson, AZ 85749',
      'Miller-Golf Links Library': '9640 E Golf Links Rd, Tucson, AZ 85730',
      'Mission Library': '3770 S Mission Rd, Tucson, AZ 85713',
      'Salazar-Ajo Library': '33 Plaza St, Ajo, AZ 85321',
      'Sam Lena-South Tucson Library': '1607 S 6th Ave, South Tucson, AZ 85713',
      'Santa Rosa Library': '1075 S 10th Ave, Tucson, AZ 85701',
      'Sahuarita Library': '725 W Via Rancho Sahuarita, Sahuarita, AZ 85629',
      'Wheeler Taft Abbett Sr Library': '7800 N Schisler Dr, Tucson, AZ 85743',
      'Woods Memorial Library': '3455 N 1st Ave, Tucson, AZ 85719'
    }
  },

  // === COMMUNICO LIBRARIES (Added 2026-01-20) ===

  'Broward County Library': {
    mainAddress: '100 S Andrews Ave, Fort Lauderdale, FL 33301',
    branches: {
      'Main Library': '100 S Andrews Ave, Fort Lauderdale, FL 33301',
      'African-American Research Library': '2650 Sistrunk Blvd, Fort Lauderdale, FL 33311',
      'Deerfield Beach Percy White': '837 E Hillsboro Blvd, Deerfield Beach, FL 33441',
      'Hollywood Branch': '2600 Hollywood Blvd, Hollywood, FL 33020',
      'Pompano Beach': '1213 E Atlantic Blvd, Pompano Beach, FL 33060',
      'Sunrise Dan Pearl': '10500 W Oakland Park Blvd, Sunrise, FL 33351',
      'Weston Branch': '4205 Bonaventure Blvd, Weston, FL 33332',
      'Coral Springs': '2855 Coral Springs Dr, Coral Springs, FL 33065',
      'Davie/Cooper City': '4600 SW 82nd Ave, Davie, FL 33328',
      'Lauderhill Towne Centre': '6299 W Oakland Park Blvd, Lauderhill, FL 33313',
      'Miramar Branch': '2050 Civic Center Pl, Miramar, FL 33025',
      'North Regional': '1100 Coconut Creek Blvd, Coconut Creek, FL 33066',
      'Northwest Regional': '3151 University Dr, Coral Springs, FL 33065',
      'Pembroke Pines': '17301 Pines Blvd, Pembroke Pines, FL 33027',
      'Plantation': '5 NW 73rd Terrace, Plantation, FL 33317',
      'South Regional': '7300 Pines Blvd, Pembroke Pines, FL 33024',
      'Southwest Regional': '16835 Sheridan St, Pembroke Pines, FL 33331',
      'Tamarac': '8701 W Commercial Blvd, Tamarac, FL 33321',
      'West Regional': '8601 W Broward Blvd, Plantation, FL 33324'
    }
  },

  'Cedar Rapids Public Library': {
    mainAddress: '450 5th Ave SE, Cedar Rapids, IA 52401',
    branches: {
      'Downtown Library': '450 5th Ave SE, Cedar Rapids, IA 52401',
      'Ladd Library': '3750 Williams Blvd SW, Cedar Rapids, IA 52404',
      'Westside Library': '1428 2nd St SW, Cedar Rapids, IA 52404'
    }
  },

  'Champaign Public Library': {
    mainAddress: '200 W Green St, Champaign, IL 61820',
    branches: {
      'Main Library': '200 W Green St, Champaign, IL 61820',
      'Douglass Branch': '504 E Grove St, Champaign, IL 61820'
    }
  },

  'Charles County Public Library': {
    mainAddress: '2 Garrett Ave, La Plata, MD 20646',
    branches: {
      'La Plata Branch': '2 Garrett Ave, La Plata, MD 20646',
      'Waldorf West': '10405 O\'Donnell Pl, Waldorf, MD 20603',
      'P.D. Brown Memorial': '50 Village St, Waldorf, MD 20602',
      'Potomac Branch': '3225 Ruth B Swann Dr, Indian Head, MD 20640'
    }
  },

  'Harford County Public Library': {
    mainAddress: '1221-A Brass Mill Rd, Belcamp, MD 21017',
    branches: {
      'Administrative Offices': '1221-A Brass Mill Rd, Belcamp, MD 21017',
      'Abingdon': '2510 Tollgate Rd, Bel Air, MD 21015',
      'Bel Air': '100 E Pennsylvania Ave, Bel Air, MD 21014',
      'Darlington': '1134 Main St, Darlington, MD 21034',
      'Edgewood': '629 Edgewood Rd, Edgewood, MD 21040',
      'Fallston': '1461 Fallston Rd, Fallston, MD 21047',
      'Havre de Grace': '120 N Union Ave, Havre de Grace, MD 21078',
      'Jarrettsville': '3722 Norrisville Rd, Jarrettsville, MD 21084',
      'Joppa': '655 Towne Center Dr, Joppa, MD 21085',
      'Aberdeen': '21 Franklin St, Aberdeen, MD 21001',
      'Whiteford': '2407 Whiteford Rd, Whiteford, MD 21160'
    }
  },

  'Hillsborough County Public Library Cooperative': {
    mainAddress: '900 N Ashley Dr, Tampa, FL 33602',
    branches: {
      'John F. Germany Public Library': '900 N Ashley Dr, Tampa, FL 33602',
      'West Tampa': '2312 W Union St, Tampa, FL 33607',
      'Bloomingdale Regional': '1906 Bloomingdale Ave, Valrico, FL 33596',
      'Brandon Regional': '619 Vonderburg Dr, Brandon, FL 33511',
      'Jimmie B. Keel Regional': '2902 W Bearss Ave, Tampa, FL 33618',
      'New Tampa Regional': '10001 Cross Creek Blvd, Tampa, FL 33647',
      'Northdale Regional': '15550 Spring Pine Dr, Tampa, FL 33624',
      'Riverview': '10509 Riverview Dr, Riverview, FL 33578',
      'Robert W. Saunders Sr. Public Library': '1505 N Nebraska Ave, Tampa, FL 33602',
      'SouthShore Regional': '15816 Beth Shields Way, Ruskin, FL 33573',
      'Seminole Heights': '4711 N Central Ave, Tampa, FL 33603',
      'Town N Country Regional': '7606 Paula Dr, Tampa, FL 33615',
      'Upper Tampa Bay Regional': '11211 Countryway Blvd, Tampa, FL 33626',
      'Lutz': '101 W Lutz-Lake Fern Rd, Lutz, FL 33548',
      'Port Tampa City': '4902 W Commerce St, Tampa, FL 33616',
      'Thonotosassa': '10715 Main St, Thonotosassa, FL 33592',
      'Ruskin': '26 Dickman Dr SE, Ruskin, FL 33570',
      'Austin Davis': '17808 Wayne Rd, Odessa, FL 33556'
    }
  },

  'Huntington Public Library': {
    mainAddress: '338 Main St, Huntington, NY 11743',
    branches: {
      'Main Library': '338 Main St, Huntington, NY 11743',
      'Huntington Station': '1335 New York Ave, Huntington Station, NY 11746'
    }
  },

  'Jacksonville Public Library': {
    mainAddress: '303 N Laura St, Jacksonville, FL 32202',
    branches: {
      'Main Library': '303 N Laura St, Jacksonville, FL 32202',
      'Argyle': '7973 Old Middleburg Rd S, Jacksonville, FL 32222',
      'Brentwood': '3725 Pearl St, Jacksonville, FL 32206',
      'Brown Eastside': '1390 Harrison St, Jacksonville, FL 32206',
      'Dallas Graham': '2304 Myrtle Ave N, Jacksonville, FL 32209',
      'Highlands': '1826 Dunn Ave, Jacksonville, FL 32218',
      'Mandarin': '3330 Kori Rd, Jacksonville, FL 32257',
      'Murray Hill': '918 Edgewood Ave S, Jacksonville, FL 32205',
      'Pablo Creek Regional': '13295 Beach Blvd, Jacksonville, FL 32246',
      'Regency Square': '9900 Regency Square Blvd, Jacksonville, FL 32225',
      'San Marco': '1513 Lasalle St, Jacksonville, FL 32207',
      'Southeast Regional': '10599 Deerwood Park Blvd, Jacksonville, FL 32256',
      'University Park': '3435 University Blvd N, Jacksonville, FL 32277',
      'Webb Wesconnett': '6887 103rd St, Jacksonville, FL 32210',
      'West': '1425 Chaffee Rd S, Jacksonville, FL 32221',
      'Willowbranch': '2875 Park St, Jacksonville, FL 32205'
    }
  },

  'Joliet Public Library': {
    mainAddress: '150 N Ottawa St, Joliet, IL 60432',
    branches: {
      'Main Library': '150 N Ottawa St, Joliet, IL 60432',
      'Black Road Branch': '3395 Black Rd, Joliet, IL 60431'
    }
  },

  'Largo Public Library': {
    mainAddress: '120 Central Park Dr, Largo, FL 33771',
    branches: {
      'Main Library': '120 Central Park Dr, Largo, FL 33771'
    }
  },

  'Las Vegas-Clark County Library District': {
    mainAddress: '1401 E Flamingo Rd, Las Vegas, NV 89119',
    branches: {
      'Main Library': '1401 E Flamingo Rd, Las Vegas, NV 89119',
      'Centennial Hills': '6711 N Buffalo Dr, Las Vegas, NV 89131',
      'Clark County': '1401 E Flamingo Rd, Las Vegas, NV 89119',
      'East Las Vegas': '2851 E Bonanza Rd, Las Vegas, NV 89101',
      'Enterprise': '8310 S Las Vegas Blvd, Las Vegas, NV 89123',
      'Gibson': '100 W Lake Mead Pkwy, Henderson, NV 89015',
      'Green Valley': '2797 N Green Valley Pkwy, Henderson, NV 89014',
      'Laughlin': '2840 S Needles Hwy, Laughlin, NV 89029',
      'Meadows': '251 W Boston Ave, Las Vegas, NV 89102',
      'North Las Vegas': '2300 Civic Center Dr, North Las Vegas, NV 89030',
      'Paseo Verde': '280 S Green Valley Pkwy, Henderson, NV 89012',
      'Rainbow': '3150 N Buffalo Dr, Las Vegas, NV 89128',
      'Sahara West': '9600 W Sahara Ave, Las Vegas, NV 89117',
      'Summerlin': '1771 Inner Circle Dr, Las Vegas, NV 89134',
      'Spring Valley': '4280 S Jones Blvd, Las Vegas, NV 89103',
      'Sunrise': '5400 Harris Ave, Las Vegas, NV 89110',
      'West Charleston': '6301 W Charleston Blvd, Las Vegas, NV 89146',
      'West Las Vegas': '951 W Lake Mead Blvd, Las Vegas, NV 89106',
      'Whitney': '5175 E Tropicana Ave, Las Vegas, NV 89122',
      'Windmill': '7060 W Windmill Ln, Las Vegas, NV 89113'
    }
  },

  'Martin County Library System': {
    mainAddress: '2351 SE Monterey Rd, Stuart, FL 34996',
    branches: {
      'Blake Library': '2351 SE Monterey Rd, Stuart, FL 34996',
      'Elisabeth Lahti Library': '15200 SW Adams Ave, Indiantown, FL 34956',
      'Hobe Sound Public Library': '10595 SE Federal Hwy, Hobe Sound, FL 33455',
      'Peter & Julie Cummings Library': '2551 SW Matheson Ave, Palm City, FL 34990',
      'Robert Morgade Library': '5851 SE Community Dr, Stuart, FL 34997'
    }
  },

  'Massapequa Public Library': {
    mainAddress: '523 Central Ave, Massapequa, NY 11758',
    branches: {
      'Main Library': '523 Central Ave, Massapequa, NY 11758'
    }
  },

  'Miami-Dade Public Library': {
    mainAddress: '101 W Flagler St, Miami, FL 33130',
    branches: {
      'Main Library': '101 W Flagler St, Miami, FL 33130',
      'Allapattah': '1799 NW 35th St, Miami, FL 33142',
      'Arcola Lakes': '8240 NW 7th Ave, Miami, FL 33150',
      'California Club': '700 Ives Dairy Rd, Miami, FL 33179',
      'Coral Gables': '3443 Segovia St, Coral Gables, FL 33134',
      'Coral Reef': '9211 SW 152nd St, Palmetto Bay, FL 33157',
      'Doral': '10785 NW 58th St, Doral, FL 33178',
      'Homestead': '700 N Homestead Blvd, Homestead, FL 33030',
      'Kendall': '9101 SW 97th Ave, Miami, FL 33176',
      'Key Biscayne': '299 Cranwood Dr, Key Biscayne, FL 33149',
      'Miami Beach Regional': '227 22nd St, Miami Beach, FL 33139',
      'Miami Lakes': '6699 Windmill Gate Rd, Miami Lakes, FL 33014',
      'North Dade Regional': '2455 NW 183rd St, Miami Gardens, FL 33056',
      'South Dade Regional': '10750 SW 211th St, Cutler Bay, FL 33189',
      'West Kendall Regional': '10201 Hammocks Blvd, Miami, FL 33196'
    }
  },

  'Milwaukee Public Library': {
    mainAddress: '814 W Wisconsin Ave, Milwaukee, WI 53233',
    branches: {
      'Central Library': '814 W Wisconsin Ave, Milwaukee, WI 53233',
      'Atkinson': '1960 W Atkinson Ave, Milwaukee, WI 53206',
      'Bay View': '2566 S Kinnickinnic Ave, Milwaukee, WI 53207',
      'Capitol': '3969 N 74th St, Milwaukee, WI 53216',
      'Center Street': '2727 W Fond du Lac Ave, Milwaukee, WI 53210',
      'East': '2320 N Cramer St, Milwaukee, WI 53211',
      'Forest Home': '1432 W Forest Home Ave, Milwaukee, WI 53204',
      'Good Hope': '7715 W Good Hope Rd, Milwaukee, WI 53223',
      'Martin Luther King': '310 W Locust St, Milwaukee, WI 53212',
      'Mill Road': '6431 N 76th St, Milwaukee, WI 53223',
      'Mitchell Street': '906 W Historic Mitchell St, Milwaukee, WI 53204',
      'Tippecanoe': '3912 S Howell Ave, Milwaukee, WI 53207',
      'Villard Square': '5190 N 35th St, Milwaukee, WI 53209',
      'Washington Park': '2121 N Sherman Blvd, Milwaukee, WI 53208',
      'Zablocki': '3501 W Oklahoma Ave, Milwaukee, WI 53215'
    }
  },

  'Mount Prospect Public Library': {
    mainAddress: '10 S Emerson St, Mount Prospect, IL 60056',
    branches: {
      'Main Library': '10 S Emerson St, Mount Prospect, IL 60056'
    }
  },

  'Multnomah County Library': {
    mainAddress: '801 SW 10th Ave, Portland, OR 97205',
    branches: {
      'Central Library': '801 SW 10th Ave, Portland, OR 97205',
      'Albina': '3605 NE 15th Ave, Portland, OR 97212',
      'Belmont': '1038 SE Cesar E Chavez Blvd, Portland, OR 97214',
      'Capitol Hill': '10723 SW Capitol Hwy, Portland, OR 97219',
      'Fairview-Columbia': '1520 NE Village St, Fairview, OR 97024',
      'Gregory Heights': '7921 NE Sandy Blvd, Portland, OR 97213',
      'Gresham': '385 NW Miller Ave, Gresham, OR 97030',
      'Hillsdale': '1525 SW Sunset Blvd, Portland, OR 97239',
      'Holgate': '7905 SE Holgate Blvd, Portland, OR 97206',
      'Hollywood': '4040 NE Tillamook St, Portland, OR 97212',
      'Kenton': '8226 N Denver Ave, Portland, OR 97217',
      'Midland': '805 SE 122nd Ave, Portland, OR 97233',
      'North Portland': '512 N Killingsworth St, Portland, OR 97217',
      'Northwest': '2300 NW Thurman St, Portland, OR 97210',
      'Rockwood': '17917 SE Stark St, Portland, OR 97233',
      'Sellwood-Moreland': '7860 SE 13th Ave, Portland, OR 97202',
      'St. Johns': '7510 N Charleston Ave, Portland, OR 97203',
      'Troutdale': '2451 SW Cherry Park Rd, Troutdale, OR 97060',
      'Woodstock': '6008 SE 49th Ave, Portland, OR 97206'
    }
  },

  'Pasco County Libraries': {
    mainAddress: '8012 Library Rd, Hudson, FL 34667',
    branches: {
      'Hudson Regional': '8012 Library Rd, Hudson, FL 34667',
      'Centennial Park': '5740 Moog Rd, Holiday, FL 34690',
      'Land O\' Lakes': '2818 Collier Pkwy, Land O\' Lakes, FL 34639',
      'New River': '34043 State Road 54, Wesley Chapel, FL 33543',
      'Regency Park': '9701 Little Rd, New Port Richey, FL 34654',
      'South Holiday': '4649 Mile Stretch Dr, Holiday, FL 34690',
      'Zephyrhills Public Library': '5347 8th St, Zephyrhills, FL 33542'
    }
  },

  'Patchogue-Medford Library': {
    mainAddress: '54-60 E Main St, Patchogue, NY 11772',
    branches: {
      'Main Library': '54-60 E Main St, Patchogue, NY 11772',
      'Carnegie': '80 E Main St, Patchogue, NY 11772'
    }
  },

  'Prince William Public Library': {
    mainAddress: '13083 Chinn Park Dr, Woodbridge, VA 22192',
    branches: {
      'Chinn Park Regional': '13083 Chinn Park Dr, Woodbridge, VA 22192',
      'Bull Run Regional': '8051 Ashton Ave, Manassas, VA 20109',
      'Central Community': '8601 Mathis Ave, Manassas, VA 20110',
      'Dale City': '4249 Dale Blvd, Dale City, VA 22193',
      'Dumfries Neighborhood': '18025 Dumfries Shopping Plaza, Dumfries, VA 22026',
      'Gainesville Neighborhood': '7351 Limestone Dr, Gainesville, VA 20155',
      'Independent Hill': '8330 Rixlew Ln, Manassas, VA 20109',
      'Lake Ridge Neighborhood': '2501 Wharton Ln, Woodbridge, VA 22191',
      'Manassas Park Neighborhood': '1 Park Center Ct, Manassas Park, VA 20111',
      'Montclair Community': '5049 Waterway Dr, Dumfries, VA 22025',
      'Nokesville Neighborhood': '12729 Fitzwater Dr, Nokesville, VA 20181',
      'Potomac Community': '2201 Opitz Blvd, Woodbridge, VA 22191'
    }
  },

  'Reading Public Library': {
    mainAddress: '100 S 5th St, Reading, PA 19602',
    branches: {
      'Main Library': '100 S 5th St, Reading, PA 19602',
      'Northeast Branch': '1348 N 11th St, Reading, PA 19604',
      'Northwest Branch': '801 N 9th St, Reading, PA 19604',
      'Southeast Branch': '1426 Perkiomen Ave, Reading, PA 19602',
      'Southwest Branch': '500 Chestnut St, Reading, PA 19602'
    }
  },

  'Sacramento Public Library': {
    mainAddress: '828 I St, Sacramento, CA 95814',
    branches: {
      'Central Library': '828 I St, Sacramento, CA 95814',
      'Arcade': '2443 Marconi Ave, Sacramento, CA 95821',
      'Arden-Dimick': '891 Watt Ave, Sacramento, CA 95864',
      'Belle Cooledge': '5600 South Land Park Dr, Sacramento, CA 95822',
      'Carmichael': '5605 Marconi Ave, Carmichael, CA 95608',
      'Colonial Heights': '4799 Stockton Blvd, Sacramento, CA 95820',
      'Del Paso Heights': '920 Grand Ave, Sacramento, CA 95838',
      'Elk Grove': '8900 Elk Grove Blvd, Elk Grove, CA 95624',
      'Fair Oaks': '11601 Fair Oaks Blvd, Fair Oaks, CA 95628',
      'Franklin': '10055 Franklin High Rd, Elk Grove, CA 95757',
      'McKinley': '601 Alhambra Blvd, Sacramento, CA 95816',
      'North Highlands-Antelope': '4235 Antelope Rd, Antelope, CA 95843',
      'North Natomas': '4660 Via Ingoglia, Sacramento, CA 95835',
      'Orangevale': '8820 Greenback Ln, Orangevale, CA 95662',
      'Rancho Cordova': '9845 Folsom Blvd, Sacramento, CA 95827',
      'Rio Linda': '6134 4th St, Rio Linda, CA 95673',
      'South Natomas': '2901 Truxel Rd, Sacramento, CA 95833',
      'Southgate': '6132 66th Ave, Sacramento, CA 95823',
      'Sylvan Oaks': '6700 Auburn Blvd, Citrus Heights, CA 95621',
      'Valley Hi-North Laguna': '7400 Imagination Pkwy, Sacramento, CA 95823'
    }
  },

  'Schaumburg Township District Library': {
    mainAddress: '130 S Roselle Rd, Schaumburg, IL 60193',
    branches: {
      'Central Library': '130 S Roselle Rd, Schaumburg, IL 60193',
      'Hanover Park Branch': '1266 Irving Park Rd, Hanover Park, IL 60133',
      'Hoffman Estates Branch': '1550 Hassell Rd, Hoffman Estates, IL 60169'
    }
  },

  'St. Mary\'s County Library': {
    mainAddress: '23250 Hollywood Rd, Leonardtown, MD 20650',
    branches: {
      'Leonardtown': '23250 Hollywood Rd, Leonardtown, MD 20650',
      'Charlotte Hall': '37600 New Market Rd, Charlotte Hall, MD 20622',
      'Lexington Park': '21677 FDR Blvd, Lexington Park, MD 20653'
    }
  },

  'Waterloo Public Library': {
    mainAddress: '415 Commercial St, Waterloo, IA 50701',
    branches: {
      'Main Library': '415 Commercial St, Waterloo, IA 50701'
    }
  },

  'Worcester Public Library': {
    mainAddress: '3 Salem Square, Worcester, MA 01608',
    branches: {
      'Main Library': '3 Salem Square, Worcester, MA 01608',
      'Frances Perkins': '470 W Boylston St, Worcester, MA 01606',
      'Great Brook Valley': '89 Tacoma St, Worcester, MA 01605',
      'Tatnuck Magnet': '1083 Pleasant St, Worcester, MA 01602'
    }
  },

  'Anne Arundel County Public Library': {
    mainAddress: '5 Harry S Truman Pkwy, Annapolis, MD 21401',
    branches: {
      'Annapolis': '1410 West St, Annapolis, MD 21401',
      'Brooklyn Park': '1 E 11th Ave, Brooklyn, MD 21225',
      'Broadneck': '1275 Green Holly Dr, Annapolis, MD 21401',
      'Crofton': '1681 Riedel Rd, Crofton, MD 21114',
      'Deale': '5940 Deale-Churchton Rd, Deale, MD 20751',
      'Discoveries': '8699 Veterans Hwy, Millersville, MD 21108',
      'Edgewater': '25 Stepneys Ln, Edgewater, MD 21037',
      'Glen Burnie': '1010 Eastway, Glen Burnie, MD 21060',
      'Linthicum': '400 Shipley Rd, Linthicum Heights, MD 21090',
      'Maryland City at Russett': '3501 Russett Common, Laurel, MD 20724',
      'Mountain Road': '4730 Mountain Rd, Pasadena, MD 21122',
      'Odenton Regional': '1325 Annapolis Rd, Odenton, MD 21113',
      'Riviera Beach': '1130 Duvall Hwy, Pasadena, MD 21122',
      'Severn': '2624 Annapolis Rd, Severn, MD 21144',
      'Severna Park': '45 W McKinsey Rd, Severna Park, MD 21146'
    }
  },

  // === BIBLIOCOMMONS LIBRARIES (Added 2026-01-20) ===

  'Austin Public Library': {
    mainAddress: '710 W Cesar Chavez St, Austin, TX 78701',
    branches: {
      'Central Library': '710 W Cesar Chavez St, Austin, TX 78701',
      'Carver': '1161 Angelina St, Austin, TX 78702',
      'Cepeda': '651 N Pleasant Valley Rd, Austin, TX 78702',
      'Faulk Central': '800 Guadalupe St, Austin, TX 78701',
      'Hampton Branch at Oak Hill': '5125 Convict Hill Rd, Austin, TX 78749',
      'Little Walnut Creek': '835 W Rundberg Ln, Austin, TX 78758',
      'Manchaca Road': '5500 Manchaca Rd, Austin, TX 78745',
      'Milwood': '12500 Amherst Dr, Austin, TX 78727',
      'North Village': '2505 Steck Ave, Austin, TX 78757',
      'Old Quarry': '7051 Village Center Dr, Austin, TX 78731',
      'Pleasant Hill': '211 E William Cannon Dr, Austin, TX 78745',
      'Ruiz': '1600 Grove Blvd, Austin, TX 78741',
      'Southeast': '5803 Nuckols Crossing Rd, Austin, TX 78744',
      'Spicewood Springs': '8637 Spicewood Springs Rd, Austin, TX 78759',
      'St. John': '7500 Blessing Ave, Austin, TX 78752',
      'Terrazas': '1105 E Cesar Chavez St, Austin, TX 78702',
      'Twin Oaks': '1800 S 5th St, Austin, TX 78704',
      'University Hills': '4721 Loyola Ln, Austin, TX 78723',
      'Willie Mae Kirk': '3101 Oak Springs Dr, Austin, TX 78702',
      'Windsor Park': '5833 Westminster Dr, Austin, TX 78723',
      'Yarborough': '2200 Hancock Dr, Austin, TX 78756'
    }
  },

  'Boston Public Library': {
    mainAddress: '700 Boylston St, Boston, MA 02116',
    branches: {
      'Central Library': '700 Boylston St, Boston, MA 02116',
      'Adams Street': '690 Adams St, Boston, MA 02122',
      'Brighton': '40 Academy Hill Rd, Boston, MA 02135',
      'Charlestown': '179 Main St, Boston, MA 02129',
      'Chinatown': '2 Boylston St, Boston, MA 02116',
      'Codman Square': '690 Washington St, Boston, MA 02124',
      'Connolly': '433 Centre St, Boston, MA 02130',
      'Dudley': '65 Warren St, Boston, MA 02119',
      'East Boston': '365 Bremen St, Boston, MA 02128',
      'Egleston Square': '2044 Columbus Ave, Boston, MA 02119',
      'Faneuil': '419 Faneuil St, Boston, MA 02135',
      'Fields Corner': '1520 Dorchester Ave, Boston, MA 02122',
      'Grove Hall': '41 Geneva Ave, Boston, MA 02121',
      'Hyde Park': '35 Harvard Ave, Boston, MA 02136',
      'Jamaica Plain': '30 South St, Boston, MA 02130',
      'Lower Mills': '27 Richmond St, Boston, MA 02124',
      'Mattapan': '1350 Blue Hill Ave, Boston, MA 02126',
      'North End': '25 Parmenter St, Boston, MA 02113',
      'Orient Heights': '18 Barnes Ave, Boston, MA 02128',
      'Parker Hill': '1497 Tremont St, Boston, MA 02120',
      'Roslindale': '4246 Washington St, Boston, MA 02131',
      'South Boston': '646 E Broadway, Boston, MA 02127',
      'South End': '685 Tremont St, Boston, MA 02118',
      'Uphams Corner': '500 Columbia Rd, Boston, MA 02125',
      'West End': '151 Cambridge St, Boston, MA 02114',
      'West Roxbury': '1961 Centre St, Boston, MA 02132'
    }
  },

  'Burlington County Library System': {
    mainAddress: '5 Pioneer Blvd, Westampton, NJ 08060',
    branches: {
      'Headquarters': '5 Pioneer Blvd, Westampton, NJ 08060',
      'Bordentown': '18 E Union St, Bordentown, NJ 08505',
      'Burlington': '23 W Union St, Burlington, NJ 08016',
      'Cinnaminson': '1619 Riverton Rd, Cinnaminson, NJ 08077',
      'Evesham': '984 Tuckerton Rd, Marlton, NJ 08053',
      'Maple Shade': '200 Stiles Ave, Maple Shade, NJ 08052',
      'Pemberton': '16 Broadway, Browns Mills, NJ 08015',
      'Pinelands': '39 Allen Ave, Medford, NJ 08055',
      'Riverton': '306 Main St, Riverton, NJ 08077'
    }
  },

  'Central Rappahannock Regional Library': {
    mainAddress: '1201 Caroline St, Fredericksburg, VA 22401',
    branches: {
      'Headquarters': '1201 Caroline St, Fredericksburg, VA 22401',
      'England Run': '806 Lyons Blvd, Fredericksburg, VA 22406',
      'Howell': '806 Lyons Blvd, Fredericksburg, VA 22406',
      'Porter': '2001 Parkway Blvd, Stafford, VA 22554',
      'Salem Church': '2607 Salem Church Rd, Fredericksburg, VA 22407',
      'Snow': '8740 Courthouse Rd, Spotsylvania, VA 22553'
    }
  },

  'Charlotte Mecklenburg Library': {
    mainAddress: '310 N Tryon St, Charlotte, NC 28202',
    branches: {
      'Main Library': '310 N Tryon St, Charlotte, NC 28202',
      'Beatties Ford Road': '2412 Beatties Ford Rd, Charlotte, NC 28216',
      'Cornelius': '21105 Catawba Ave, Cornelius, NC 28031',
      'Davidson': '119 S Main St, Davidson, NC 28036',
      'Hickory Grove': '5935 Hickory Grove Rd, Charlotte, NC 28215',
      'Independence Regional': '6000 Conference Dr, Charlotte, NC 28212',
      'Matthews': '230 Matthews Station St, Matthews, NC 28105',
      'Mint Hill': '6840 Matthews-Mint Hill Rd, Mint Hill, NC 28227',
      'Morrison Regional': '7015 Morrison Blvd, Charlotte, NC 28211',
      'Mountain Island': '4420 Hoyt Galvin Way, Charlotte, NC 28214',
      'Myers Park': '1361 Queens Rd, Charlotte, NC 28207',
      'North County Regional': '16500 Holly Crest Ln, Huntersville, NC 28078',
      'Plaza Midwood': '1623 Central Ave, Charlotte, NC 28205',
      'South County Regional': '5801 Rea Rd, Charlotte, NC 28277',
      'Steele Creek': '13620 Steele Creek Rd, Charlotte, NC 28273',
      'Sugar Creek': '4045 N Tryon St, Charlotte, NC 28206',
      'University City Regional': '301 E WT Harris Blvd, Charlotte, NC 28262',
      'West Boulevard': '2157 West Blvd, Charlotte, NC 28208'
    }
  },

  'Chicago Public Library': {
    mainAddress: '400 S State St, Chicago, IL 60605',
    branches: {
      'Harold Washington Library Center': '400 S State St, Chicago, IL 60605',
      'Albany Park': '5150 N Kimball Ave, Chicago, IL 60625',
      'Altgeld': '13281 S Corliss Ave, Chicago, IL 60827',
      'Austin': '5615 W Race Ave, Chicago, IL 60644',
      'Avalon': '8148 S Stony Island Ave, Chicago, IL 60617',
      'Back of the Yards': '2111 W 47th St, Chicago, IL 60609',
      'Beverly': '1962 W 95th St, Chicago, IL 60643',
      'Bezazian': '1226 W Ainslie St, Chicago, IL 60640',
      'Blackstone': '4904 S Lake Park Ave, Chicago, IL 60615',
      'Brainerd': '1350 W 89th St, Chicago, IL 60620',
      'Brighton Park': '4314 S Archer Ave, Chicago, IL 60632',
      'Bucktown-Wicker Park': '1701 N Milwaukee Ave, Chicago, IL 60647',
      'Budlong Woods': '5630 N Lincoln Ave, Chicago, IL 60659',
      'Canaryville': '642 W 43rd St, Chicago, IL 60609',
      'Chicago Bee': '3647 S State St, Chicago, IL 60609',
      'Chicago Lawn': '6120 S Kedzie Ave, Chicago, IL 60629',
      'Chinatown': '2100 S Wentworth Ave, Chicago, IL 60616',
      'Clearing': '6423 W 63rd Pl, Chicago, IL 60638',
      'Coleman': '731 E 63rd St, Chicago, IL 60637',
      'Daley': '733 N Kedzie Ave, Chicago, IL 60612',
      'Dunning': '7455 W Cornelia Ave, Chicago, IL 60634',
      'Edgebrook': '5331 W Devon Ave, Chicago, IL 60646',
      'Edgewater': '6000 N Broadway, Chicago, IL 60660'
    }
  },

  'Cincinnati & Hamilton County Public Library': {
    mainAddress: '800 Vine St, Cincinnati, OH 45202',
    branches: {
      'Main Library': '800 Vine St, Cincinnati, OH 45202',
      'Anderson': '7450 State Rd, Cincinnati, OH 45255',
      'Blue Ash': '4911 Cooper Rd, Blue Ash, OH 45242',
      'Bond Hill': '1740 Langdon Farm Rd, Cincinnati, OH 45237',
      'Cheviot': '3711 Robb Ave, Cincinnati, OH 45211',
      'Clifton': '3400 Brookline Ave, Cincinnati, OH 45220',
      'College Hill': '1500 W North Bend Rd, Cincinnati, OH 45224',
      'Covedale': '4980 Glenway Ave, Cincinnati, OH 45238',
      'Deer Park': '3970 E Galbraith Rd, Cincinnati, OH 45236',
      'Delhi': '5095 Foley Rd, Cincinnati, OH 45238',
      'Elmwood Place': '6120 Vine St, Elmwood Place, OH 45216',
      'Forest Park': '655 Waycross Rd, Cincinnati, OH 45240',
      'Groesbeck': '2994 W Galbraith Rd, Cincinnati, OH 45239',
      'Harrison': '10398 New Haven Rd, Harrison, OH 45030',
      'Hyde Park': '2747 Erie Ave, Cincinnati, OH 45208',
      'Madeira': '7200 Miami Ave, Madeira, OH 45243',
      'Madisonville': '4830 Whetsel Ave, Cincinnati, OH 45227',
      'Mariemont': '3810 Pocahontas Ave, Mariemont, OH 45227',
      'Monfort Heights': '3825 W Fork Rd, Cincinnati, OH 45247',
      'Mt. Healthy': '1546 McMakin Ave, Mt. Healthy, OH 45231',
      'Mt. Washington': '2049 Beechmont Ave, Cincinnati, OH 45230',
      'Norwood': '4325 Montgomery Rd, Norwood, OH 45212',
      'Oakley': '4033 Gilmore Ave, Cincinnati, OH 45209',
      'Pleasant Ridge': '6233 Montgomery Rd, Cincinnati, OH 45213',
      'Price Hill': '3215 Warsaw Ave, Cincinnati, OH 45205',
      'Reading': '8740 Reading Rd, Reading, OH 45215',
      'St. Bernard': '4767 Tower Ave, St. Bernard, OH 45217',
      'Sharonville': '10980 Thornview Dr, Sharonville, OH 45241',
      'Symmes': '11850 Enyart Rd, Loveland, OH 45140',
      'Walnut Hills': '2533 Kemper Ln, Cincinnati, OH 45206',
      'West End': '805 Ezzard Charles Dr, Cincinnati, OH 45203',
      'Westwood': '3345 Epworth Ave, Cincinnati, OH 45211',
      'Wyoming': '500 Springfield Pike, Wyoming, OH 45215'
    }
  },

  'Denton Public Library': {
    mainAddress: '502 Oakland St, Denton, TX 76201',
    branches: {
      'Emily Fowler Central': '502 Oakland St, Denton, TX 76201',
      'North': '3020 N Locust St, Denton, TX 76209',
      'South': '3228 Teasley Ln, Denton, TX 76210'
    }
  },

  'Evanston Public Library': {
    mainAddress: '1703 Orrington Ave, Evanston, IL 60201',
    branches: {
      'Main Library': '1703 Orrington Ave, Evanston, IL 60201',
      'Chicago Avenue': '900 Chicago Ave, Evanston, IL 60202',
      'North': '2026 Central St, Evanston, IL 60201'
    }
  },

  'Fort Vancouver Regional Library': {
    mainAddress: '1007 E Mill Plain Blvd, Vancouver, WA 98663',
    branches: {
      'Vancouver Community Library': '1007 E Mill Plain Blvd, Vancouver, WA 98663',
      'Battle Ground': '1207 SE 8th Way, Battle Ground, WA 98604',
      'Cascade Park': '600 NE 136th Ave, Vancouver, WA 98684',
      'Goldendale': '131 W Burgen St, Goldendale, WA 98620',
      'La Center': '1411 E 4th St, La Center, WA 98629',
      'North Bonneville': '126 Cascade Dr, North Bonneville, WA 98639',
      'Ridgefield': '210 N Main Ave, Ridgefield, WA 98642',
      'Stevenson': '120 NW Vancouver Ave, Stevenson, WA 98648',
      'Three Creeks': '800 NE Tenney Rd, Vancouver, WA 98685',
      'Washougal': '1661 C St, Washougal, WA 98671',
      'White Salmon Valley': '77 NE Wauna Ave, White Salmon, WA 98672',
      'Woodland': '770 Park St, Woodland, WA 98674',
      'Yacolt': '406 S Parcel Ave, Yacolt, WA 98675'
    }
  },

  'Frisco Public Library': {
    mainAddress: '8000 Dallas Pkwy, Frisco, TX 75034',
    branches: {
      'Main Library': '8000 Dallas Pkwy, Frisco, TX 75034'
    }
  },

  'Grand Rapids Public Library': {
    mainAddress: '111 Library St NE, Grand Rapids, MI 49503',
    branches: {
      'Main Library': '111 Library St NE, Grand Rapids, MI 49503',
      'Madison Square': '1201 Madison Ave SE, Grand Rapids, MI 49507',
      'Ottawa Hills': '1150 Giddings Ave SE, Grand Rapids, MI 49506',
      'Seymour': '2350 Eastern Ave SE, Grand Rapids, MI 49507',
      'Van Belkum': '1563 Plainfield Ave NE, Grand Rapids, MI 49505',
      'West Leonard': '1017 Leonard St NW, Grand Rapids, MI 49504',
      'West Side': '713 Bridge St NW, Grand Rapids, MI 49504',
      'Yankee Clipper': '2025 Leonard St NE, Grand Rapids, MI 49505'
    }
  },

  'Harris County Public Library': {
    mainAddress: '5749 S Loop E, Houston, TX 77033',
    branches: {
      'Barbara Bush': '6817 Cypresswood Dr, Spring, TX 77379',
      'Bear Creek': '16719 Clay Rd, Houston, TX 77084',
      'Clear Lake City-County Freeman': '16616 Diana Ln, Houston, TX 77062',
      'Cy-Fair': '9191 Barker Cypress Rd, Cypress, TX 77433',
      'Fairbanks': '7122 N Gessner Rd, Houston, TX 77040',
      'Freeman Neighborhood': '3501 Post Oak Blvd, Houston, TX 77056',
      'High Meadows': '4500 Aldine Mail Rte, Houston, TX 77039',
      'Jacinto City': '921 Akron St, Houston, TX 77029',
      'Katherine Tyra at Bear Creek': '16719 Clay Rd, Houston, TX 77084',
      'Kingwood': '4102 Rustic Woods Dr, Kingwood, TX 77345',
      'Lone Star': '11500 Airline Dr, Houston, TX 77037',
      'Maud Marks': '1815 Westgreen Blvd, Katy, TX 77450',
      'North Channel': '15741 Wallisville Rd, Houston, TX 77049',
      'Octavia Fields': '1503 S Houston Ave, Humble, TX 77338',
      'Parker Williams': '10851 Scarsdale Blvd, Houston, TX 77089',
      'South Houston': '607 Avenue A, South Houston, TX 77587',
      'Spring Branch Memorial': '930 Corbindale Rd, Houston, TX 77024',
      'Tomball': '30555 Tomball Pkwy, Tomball, TX 77375',
      'West University': '6108 Auden St, Houston, TX 77005'
    }
  },

  'Hennepin County Library': {
    mainAddress: '300 Nicollet Mall, Minneapolis, MN 55401',
    branches: {
      'Minneapolis Central': '300 Nicollet Mall, Minneapolis, MN 55401',
      'Augsburg Park': '7100 Nicollet Ave S, Richfield, MN 55423',
      'Brookdale': '6125 Shingle Creek Pkwy, Brooklyn Center, MN 55430',
      'Brooklyn Park': '8500 W Broadway Ave, Brooklyn Park, MN 55445',
      'Champlin': '12154 Ensign Ave N, Champlin, MN 55316',
      'East Lake': '2727 E Lake St, Minneapolis, MN 55406',
      'Eden Prairie': '565 Prairie Center Dr, Eden Prairie, MN 55344',
      'Edina': '5280 Grandview Sq, Edina, MN 55436',
      'Excelsior': '337 Water St, Excelsior, MN 55331',
      'Franklin': '1314 E Franklin Ave, Minneapolis, MN 55404',
      'Golden Valley': '830 Winnetka Ave N, Golden Valley, MN 55427',
      'Hopkins': '22 11th Ave N, Hopkins, MN 55343',
      'Hosmer': '347 E 36th St, Minneapolis, MN 55408',
      'Linden Hills': '2900 W 43rd St, Minneapolis, MN 55410',
      'Long Lake': '1865 Wayzata Blvd W, Long Lake, MN 55356',
      'Maple Grove': '8001 Main St N, Maple Grove, MN 55369',
      'Maple Plain': '5184 Main St E, Maple Plain, MN 55359',
      'Minnetonka': '17524 Excelsior Blvd, Minnetonka, MN 55345',
      'Nokomis': '5100 34th Ave S, Minneapolis, MN 55417',
      'North Regional': '1315 Lowry Ave N, Minneapolis, MN 55411',
      'Northeast': '2200 Central Ave NE, Minneapolis, MN 55418',
      'Osseo': '415 Central Ave, Osseo, MN 55369',
      'Oxboro': '8801 Portland Ave S, Bloomington, MN 55420',
      'Penn Lake': '8800 Penn Ave S, Bloomington, MN 55431',
      'Pierre Bottineau': '55 Broadway St NE, Minneapolis, MN 55413',
      'Plymouth': '15700 36th Ave N, Plymouth, MN 55446',
      'Ridgedale': '12601 Ridgedale Dr, Minnetonka, MN 55305',
      'Rockford Road': '6401 42nd Ave N, Crystal, MN 55427',
      'Rogers': '21300 John Milless Dr, Rogers, MN 55374',
      'Roosevelt': '4026 28th Ave S, Minneapolis, MN 55406',
      'St. Anthony': '2941 Pentagon Dr NE, St. Anthony, MN 55418',
      'St. Bonifacius': '8624 Kennedy Memorial Dr, St. Bonifacius, MN 55375',
      'St. Louis Park': '3240 Library Ln, St. Louis Park, MN 55426',
      'Southdale': '7001 York Ave S, Edina, MN 55435',
      'Southeast': '1222 SE 4th St, Minneapolis, MN 55414',
      'Sumner': '611 Van White Memorial Blvd, Minneapolis, MN 55411',
      'Wayzata': '620 Rice St E, Wayzata, MN 55391',
      'Webber Park': '4440 Humboldt Ave N, Minneapolis, MN 55412',
      'Westonka': '2079 Commerce Blvd, Mound, MN 55364'
    }
  },

  'Jefferson County Public Library': {
    mainAddress: '10200 W 20th Ave, Lakewood, CO 80215',
    branches: {
      'Belmar': '555 S Allison Pkwy, Lakewood, CO 80226',
      'Columbine': '7706 W Bowles Ave, Littleton, CO 80123',
      'Conifer': '10441 Hwy 73, Conifer, CO 80433',
      'Edgewater': '5843 W 25th Ave, Edgewater, CO 80214',
      'Evergreen': '5000 Hwy 73, Evergreen, CO 80439',
      'Golden': '1019 10th St, Golden, CO 80401',
      'Lakewood': '10200 W 20th Ave, Lakewood, CO 80215',
      'Standley Lake': '8485 Kipling St, Arvada, CO 80005',
      'Wheat Ridge': '5475 W 32nd Ave, Wheat Ridge, CO 80212'
    }
  },

  'King County Library System': {
    mainAddress: '960 Newport Way NW, Issaquah, WA 98027',
    branches: {
      'Algona-Pacific': '255 Ellingson Rd, Pacific, WA 98047',
      'Auburn': '1102 Auburn Way S, Auburn, WA 98002',
      'Bellevue': '1111 110th Ave NE, Bellevue, WA 98004',
      'Black Diamond': '24707 Roberts Dr, Black Diamond, WA 98010',
      'Bothell': '18215 98th Ave NE, Bothell, WA 98011',
      'Boulevard Park': '12015 Roseberg Ave S, Seattle, WA 98168',
      'Burien': '400 SW 152nd St, Burien, WA 98166',
      'Carnation': '4804 Tolt Ave, Carnation, WA 98014',
      'Covington': '27100 164th Ave SE, Covington, WA 98042',
      'Des Moines': '21620 11th Ave S, Des Moines, WA 98198',
      'Enumclaw': '1700 1st St, Enumclaw, WA 98022',
      'Fall City': '33415 SE 42nd Pl, Fall City, WA 98024',
      'Federal Way': '34200 1st Way S, Federal Way, WA 98003',
      'Issaquah': '10 W Sunset Way, Issaquah, WA 98027',
      'Kenmore': '18138 73rd Ave NE, Kenmore, WA 98028',
      'Kent': '212 2nd Ave N, Kent, WA 98032',
      'Kirkland': '308 Kirkland Ave, Kirkland, WA 98033',
      'Lake Forest Park': '17171 Bothell Way NE, Lake Forest Park, WA 98155',
      'Lake Hills': '15528 Lake Hills Blvd, Bellevue, WA 98007',
      'Maple Valley': '21844 SE 248th St, Maple Valley, WA 98038',
      'Mercer Island': '4400 88th Ave SE, Mercer Island, WA 98040',
      'Muckleshoot': '39917 Auburn Enumclaw Rd SE, Auburn, WA 98092',
      'Newcastle': '8580 Coal Creek Pkwy SE, Newcastle, WA 98056',
      'Newport Way': '14250 SE Newport Way, Bellevue, WA 98006',
      'North Bend': '115 E 4th St, North Bend, WA 98045',
      'Redmond': '15990 NE 85th St, Redmond, WA 98052',
      'Renton': '100 Mill Ave S, Renton, WA 98057',
      'Sammamish': '825 228th Ave SE, Sammamish, WA 98075',
      'Shoreline': '345 NE 175th St, Shoreline, WA 98155',
      'Skykomish': '100 5th St, Skykomish, WA 98288',
      'Snoqualmie': '7824 Center Blvd SE, Snoqualmie, WA 98065',
      'Tukwila': '14380 Tukwila International Blvd, Tukwila, WA 98168',
      'Vashon': '17210 Vashon Hwy SW, Vashon, WA 98070',
      'White Center': '11220 16th Ave SW, Seattle, WA 98146',
      'Woodinville': '17105 Avondale Rd NE, Woodinville, WA 98072',
      'Woodmont': '26809 Pacific Hwy S, Des Moines, WA 98198'
    }
  },

  'Seattle Public Library': {
    mainAddress: '1000 4th Ave, Seattle, WA 98104',
    branches: {
      'Central Library': '1000 4th Ave, Seattle, WA 98104',
      'Ballard': '5614 22nd Ave NW, Seattle, WA 98107',
      'Beacon Hill': '2821 Beacon Ave S, Seattle, WA 98144',
      'Broadview': '12755 Greenwood Ave N, Seattle, WA 98133',
      'Capitol Hill': '425 Harvard Ave E, Seattle, WA 98102',
      'Columbia': '4721 Rainier Ave S, Seattle, WA 98118',
      'Delridge': '5423 Delridge Way SW, Seattle, WA 98106',
      'Douglass-Truth': '2300 E Yesler Way, Seattle, WA 98122',
      'Fremont': '731 N 35th St, Seattle, WA 98103',
      'Green Lake': '7364 E Green Lake Dr N, Seattle, WA 98115',
      'Greenwood': '8016 Greenwood Ave N, Seattle, WA 98103',
      'High Point': '3411 SW Raymond St, Seattle, WA 98126',
      'International District/Chinatown': '713 8th Ave S, Seattle, WA 98104',
      'Lake City': '12501 28th Ave NE, Seattle, WA 98125',
      'Madrona-Sally Goldmark': '1134 33rd Ave, Seattle, WA 98122',
      'Magnolia': '2801 34th Ave W, Seattle, WA 98199',
      'Montlake': '2401 24th Ave E, Seattle, WA 98112',
      'NewHolly': '7058 32nd Ave S, Seattle, WA 98118',
      'Northeast': '6801 35th Ave NE, Seattle, WA 98115',
      'Northgate': '10548 5th Ave NE, Seattle, WA 98125',
      'Queen Anne': '400 W Garfield St, Seattle, WA 98119',
      'Rainier Beach': '9125 Rainier Ave S, Seattle, WA 98118',
      'South Park': '8604 8th Ave S, Seattle, WA 98108',
      'Southwest': '9010 35th Ave SW, Seattle, WA 98126',
      'University': '5009 Roosevelt Way NE, Seattle, WA 98105',
      'Wallingford': '1501 N 45th St, Seattle, WA 98103',
      'West Seattle': '2306 42nd Ave SW, Seattle, WA 98116'
    }
  },

  'Kitsap Regional Library': {
    mainAddress: '1301 Sylvan Way, Bremerton, WA 98310',
    branches: {
      'Sylvan Way': '1301 Sylvan Way, Bremerton, WA 98310',
      'Bainbridge': '1270 Madison Ave N, Bainbridge Island, WA 98110',
      'Downtown Bremerton': '612 5th St, Bremerton, WA 98337',
      'Kingston': '26159 Dulay Rd NE, Kingston, WA 98346',
      'Little Boston': '31980 Little Boston Rd NE, Kingston, WA 98346',
      'Manchester': '8067 E Main St, Manchester, WA 98353',
      'Poulsbo': '700 NE Lincoln Rd, Poulsbo, WA 98370',
      'Port Orchard': '87 Sidney Ave, Port Orchard, WA 98366',
      'Silverdale': '3450 NW Carlton St, Silverdale, WA 98383'
    }
  },

  'San Diego Public Library': {
    mainAddress: '330 Park Blvd, San Diego, CA 92101',
    branches: {
      'Central Library': '330 Park Blvd, San Diego, CA 92101',
      'Balboa': '4255 Mt Abernathy Ave, San Diego, CA 92117',
      'Benjamin': '5188 Zion Ave, San Diego, CA 92120',
      'Carmel Mountain Ranch': '12095 World Trade Dr, San Diego, CA 92128',
      'Carmel Valley': '3919 Townsgate Dr, San Diego, CA 92130',
      'City Heights/Weingart': '3795 Fairmount Ave, San Diego, CA 92105',
      'Clairemont': '2920 Burgener Blvd, San Diego, CA 92110',
      'College-Rolando': '6600 Montezuma Rd, San Diego, CA 92115',
      'Kensington-Normal Heights': '4121 Adams Ave, San Diego, CA 92116',
      'La Jolla Riford': '7555 Draper Ave, La Jolla, CA 92037',
      'Linda Vista': '2160 Ulric St, San Diego, CA 92111',
      'Logan Heights': '567 S 28th St, San Diego, CA 92113',
      'Malcolm X': '5148 Market St, San Diego, CA 92114',
      'Mira Mesa': '8405 New Salem St, San Diego, CA 92126',
      'Mission Hills': '925 W Washington St, San Diego, CA 92103',
      'Mission Valley': '2123 Fenton Pkwy, San Diego, CA 92108',
      'North Clairemont': '4616 Clairemont Dr, San Diego, CA 92117',
      'North Park': '3795 31st St, San Diego, CA 92104',
      'North University Community': '8820 Judicial Dr, San Diego, CA 92122',
      'Oak Park': '2802 54th St, San Diego, CA 92105',
      'Ocean Beach': '4801 Santa Monica Ave, San Diego, CA 92107',
      'Otay Mesa-Nestor': '3003 Coronado Ave, San Diego, CA 92154',
      'Pacific Beach/Taylor': '4275 Cass St, San Diego, CA 92109',
      'Paradise Hills': '5922 Rancho Hills Dr, San Diego, CA 92139',
      'Point Loma/Hervey': '3701 Voltaire St, San Diego, CA 92107',
      'Rancho Bernardo': '17110 Bernardo Center Dr, San Diego, CA 92128',
      'Rancho Penasquitos': '13330 Salmon River Rd, San Diego, CA 92129',
      'San Carlos': '7265 Jackson Dr, San Diego, CA 92119',
      'San Ysidro': '101 W San Ysidro Blvd, San Diego, CA 92173',
      'Scripps Miramar Ranch': '10301 Scripps Lake Dr, San Diego, CA 92131',
      'Serra Mesa-Kearny Mesa': '9005 Aero Dr, San Diego, CA 92123',
      'Skyline Hills': '7900 Paradise Valley Rd, San Diego, CA 92114',
      'Tierrasanta': '4985 La Cuenta Dr, San Diego, CA 92124',
      'University Community': '4155 Governor Dr, San Diego, CA 92122',
      'University Heights': '4193 Park Blvd, San Diego, CA 92103',
      'Valencia Park/Malcolm X': '5148 Market St, San Diego, CA 92114'
    }
  },

  'San Diego County Library': {
    mainAddress: '5560 Overland Ave, San Diego, CA 92123',
    branches: {
      'Alpine': '1752 Alpine Blvd, Alpine, CA 91901',
      'Bonita-Sunnyside': '4375 Bonita Rd, Bonita, CA 91902',
      'Borrego Springs': '2580 Country Club Rd, Borrego Springs, CA 92004',
      'Campo-Morena Village': '31356 Hwy 94, Campo, CA 91906',
      'Casa de Oro': '9805 Campo Rd, Spring Valley, CA 91977',
      'Crest': '105 Juanita Ln, El Cajon, CA 92021',
      'Del Mar': '1309 Camino Del Mar, Del Mar, CA 92014',
      'Descanso': '9545 River Dr, Descanso, CA 91916',
      'El Cajon': '201 E Douglas Ave, El Cajon, CA 92020',
      'Encinitas': '540 Cornish Dr, Encinitas, CA 92024',
      'Fallbrook': '124 S Mission Rd, Fallbrook, CA 92028',
      'Fletcher Hills': '576 Garfield Ave, El Cajon, CA 92020',
      'Imperial Beach': '810 Imperial Beach Blvd, Imperial Beach, CA 91932',
      'Julian': '1850 Hwy 78, Julian, CA 92036',
      'La Mesa': '8074 Allison Ave, La Mesa, CA 91942',
      'Lakeside': '9839 Vine St, Lakeside, CA 92040',
      'Lemon Grove': '3001 School Ln, Lemon Grove, CA 91945',
      'Lincoln Acres': '2725 Granger Ave, National City, CA 91950',
      'Poway': '13137 Poway Rd, Poway, CA 92064',
      'Ramona': '1275 Main St, Ramona, CA 92065',
      'Rancho San Diego': '11555 Via Rancho San Diego, El Cajon, CA 92019',
      'Rancho Santa Fe': '17040 Avenida de Acacias, Rancho Santa Fe, CA 92067',
      'San Marcos': '2 Civic Center Dr, San Marcos, CA 92069',
      'Santee': '9225 Carlton Hills Blvd, Santee, CA 92071',
      'Solana Beach': '157 Stevens Ave, Solana Beach, CA 92075',
      'Spring Valley': '836 Kempton St, Spring Valley, CA 91977',
      'Valley Center': '29200 Cole Grade Rd, Valley Center, CA 92082',
      'Vista': '700 Eucalyptus Ave, Vista, CA 92084'
    }
  },

  'St. Louis Public Library': {
    mainAddress: '1301 Olive St, St. Louis, MO 63103',
    branches: {
      'Central Library': '1301 Olive St, St. Louis, MO 63103',
      'Baden': '8541 Church Rd, St. Louis, MO 63147',
      'Barr': '1701 S Jefferson Ave, St. Louis, MO 63104',
      'Buder': '4401 Hampton Ave, St. Louis, MO 63109',
      'Cabanne': '1106 N Union Blvd, St. Louis, MO 63113',
      'Carondelet': '6800 Michigan Ave, St. Louis, MO 63111',
      'Carpenter': '3309 S Grand Blvd, St. Louis, MO 63118',
      'Central Express': '1415 Olive St, St. Louis, MO 63103',
      'Divoll': '4234 N Grand Blvd, St. Louis, MO 63107',
      'Julia Davis': '4415 Natural Bridge Ave, St. Louis, MO 63115',
      'Kingshighway': '2260 S Vandeventer Ave, St. Louis, MO 63110',
      'Machacek': '6424 Scanlan Ave, St. Louis, MO 63139',
      'Schlafly': '225 N Euclid Ave, St. Louis, MO 63108',
      'Walnut Park': '5760 W Florissant Ave, St. Louis, MO 63136'
    }
  },

  'St. Paul Public Library': {
    mainAddress: '90 W 4th St, St. Paul, MN 55102',
    branches: {
      'Central Library': '90 W 4th St, St. Paul, MN 55102',
      'Arlington Hills': '1105 Greenbrier St, St. Paul, MN 55106',
      'Dayton\'s Bluff': '645 E 7th St, St. Paul, MN 55106',
      'Hamline Midway': '1558 W Minnehaha Ave, St. Paul, MN 55104',
      'Hayden Heights': '1456 White Bear Ave N, St. Paul, MN 55106',
      'Highland Park': '1974 Ford Pkwy, St. Paul, MN 55116',
      'Merriam Park': '1831 Marshall Ave, St. Paul, MN 55104',
      'Rice Street': '1011 Rice St, St. Paul, MN 55117',
      'Riverview': '1 E George St, St. Paul, MN 55107',
      'Rondo': '461 N Dale St, St. Paul, MN 55103',
      'Sun Ray': '2105 Wilson Ave, St. Paul, MN 55119',
      'West 7th': '265 Oneida St, St. Paul, MN 55102'
    }
  },

  'Tacoma Public Library': {
    mainAddress: '1102 Tacoma Ave S, Tacoma, WA 98402',
    branches: {
      'Main Library': '1102 Tacoma Ave S, Tacoma, WA 98402',
      'Fern Hill': '765 S 84th St, Tacoma, WA 98444',
      'Kobetich': '212 Browns Point Blvd NE, Tacoma, WA 98422',
      'Martin Luther King': '1902 S Cedar St, Tacoma, WA 98405',
      'Moore': '215 S 56th St, Tacoma, WA 98408',
      'Mottet': '3523 E G St, Tacoma, WA 98404',
      'South Tacoma': '3411 S 56th St, Tacoma, WA 98409',
      'Swasey': '7001 6th Ave, Tacoma, WA 98406',
      'Wheelock': '3722 N 26th St, Tacoma, WA 98407'
    }
  },

  'Timberland Regional Library': {
    mainAddress: '415 Tumwater Blvd SW, Tumwater, WA 98501',
    branches: {
      'Service Center': '415 Tumwater Blvd SW, Tumwater, WA 98501',
      'Aberdeen': '121 E Market St, Aberdeen, WA 98520',
      'Amanda Park': '6 N US Hwy 101, Amanda Park, WA 98526',
      'Centralia': '110 S Silver St, Centralia, WA 98531',
      'Chehalis': '442 NE Washington Ave, Chehalis, WA 98532',
      'Elma': '125 N 4th St, Elma, WA 98541',
      'Hoquiam': '420 7th St, Hoquiam, WA 98550',
      'Ilwaco': '158 1st Ave N, Ilwaco, WA 98624',
      'Lacey': '500 College St SE, Lacey, WA 98503',
      'Montesano': '125 S Main St, Montesano, WA 98563',
      'Naselle': '4 Parpala Rd, Naselle, WA 98638',
      'North Mason': '23081 NE Hwy 3, Belfair, WA 98528',
      'Oakville': '203 Elma Oakville Rd, Oakville, WA 98568',
      'Ocean Park': '1308 256th Pl, Ocean Park, WA 98640',
      'Olympia': '313 8th Ave SE, Olympia, WA 98501',
      'Raymond': '507 Duryea St, Raymond, WA 98577',
      'Salkum': '2480 US Hwy 12, Salkum, WA 98582',
      'Shelton': '710 W Alder St, Shelton, WA 98584',
      'South Bend': '1425 Robert Bush Dr W, South Bend, WA 98586',
      'Tenino': '172 Central Ave W, Tenino, WA 98589',
      'Tumwater': '7023 New Market St SW, Tumwater, WA 98501',
      'Westport': '118 W Hancock St, Westport, WA 98595',
      'Winlock': '211 NE 1st St, Winlock, WA 98596',
      'Yelm': '210 Prairie Park St SE, Yelm, WA 98597'
    }
  },

  'Brooklyn Public Library': {
    mainAddress: '10 Grand Army Plaza, Brooklyn, NY 11238',
    branches: {
      'Central Library': '10 Grand Army Plaza, Brooklyn, NY 11238',
      'Arlington': '203 Arlington Ave, Brooklyn, NY 11207',
      'Bay Ridge': '7223 Ridge Blvd, Brooklyn, NY 11209',
      'Bedford': '496 Franklin Ave, Brooklyn, NY 11238',
      'Borough Park': '1265 43rd St, Brooklyn, NY 11219',
      'Brighton Beach': '16 Brighton First Rd, Brooklyn, NY 11235',
      'Brooklyn Heights': '280 Cadman Plaza W, Brooklyn, NY 11201',
      'Brownsville': '61 Glenmore Ave, Brooklyn, NY 11212',
      'Bushwick': '340 Bushwick Ave, Brooklyn, NY 11206',
      'Canarsie': '1580 Rockaway Pkwy, Brooklyn, NY 11236',
      'Carroll Gardens': '396 Clinton St, Brooklyn, NY 11231',
      'Clarendon': '2035 Nostrand Ave, Brooklyn, NY 11210',
      'Clinton Hill': '380 Washington Ave, Brooklyn, NY 11238',
      'Coney Island': '1901 Mermaid Ave, Brooklyn, NY 11224',
      'Cortelyou': '1305 Cortelyou Rd, Brooklyn, NY 11226',
      'Crown Heights': '560 New York Ave, Brooklyn, NY 11225',
      'Cypress Hills': '1197 Sutter Ave, Brooklyn, NY 11208',
      'DeKalb': '790 Bushwick Ave, Brooklyn, NY 11221',
      'Dyker': '8202 13th Ave, Brooklyn, NY 11228',
      'East Flatbush': '9612 Church Ave, Brooklyn, NY 11212',
      'Eastern Parkway': '1044 Eastern Pkwy, Brooklyn, NY 11213',
      'Flatbush': '22 Linden Blvd, Brooklyn, NY 11226',
      'Flatlands': '2065 Flatbush Ave, Brooklyn, NY 11234',
      'Fort Hamilton': '9424 4th Ave, Brooklyn, NY 11209',
      'Gerritsen Beach': '2808 Gerritsen Ave, Brooklyn, NY 11229',
      'Gravesend': '303 Ave X, Brooklyn, NY 11223',
      'Greenpoint': '107 Norman Ave, Brooklyn, NY 11222',
      'Highlawn': '1664 W 13th St, Brooklyn, NY 11223',
      'Homecrest': '2525 Coney Island Ave, Brooklyn, NY 11223',
      'Jamaica Bay': '9727 Seaview Ave, Brooklyn, NY 11236',
      'Kensington': '4207 18th Ave, Brooklyn, NY 11218',
      'Kings Bay': '3650 Nostrand Ave, Brooklyn, NY 11229',
      'Kings Highway': '2115 Ocean Ave, Brooklyn, NY 11229',
      'Leonard': '81 Devoe St, Brooklyn, NY 11211',
      'Macon': '361 Lewis Ave, Brooklyn, NY 11233',
      'Mapleton': '1702 60th St, Brooklyn, NY 11204',
      'Marcy': '617 DeKalb Ave, Brooklyn, NY 11216',
      'McKinley Park': '6802 Fort Hamilton Pkwy, Brooklyn, NY 11219',
      'Midwood': '975 E 16th St, Brooklyn, NY 11230',
      'Mill Basin': '2385 Ralph Ave, Brooklyn, NY 11234',
      'New Lots': '665 New Lots Ave, Brooklyn, NY 11207',
      'New Utrecht': '1743 86th St, Brooklyn, NY 11214',
      'Pacific': '25 4th Ave, Brooklyn, NY 11217',
      'Paerdegat': '850 E 59th St, Brooklyn, NY 11234',
      'Park Slope': '431 6th Ave, Brooklyn, NY 11215',
      'Red Hook': '7 Wolcott St, Brooklyn, NY 11231',
      'Rugby': '1000 Utica Ave, Brooklyn, NY 11203',
      'Ryder': '5902 23rd Ave, Brooklyn, NY 11204',
      'Saratoga': '8 Thomas S Boyland St, Brooklyn, NY 11233',
      'Sheepshead Bay': '2636 E 14th St, Brooklyn, NY 11235',
      'Spring Creek': '12143 Flatlands Ave, Brooklyn, NY 11207',
      'Stone Avenue': '581 Mother Gaston Blvd, Brooklyn, NY 11212',
      'Sunset Park': '5108 4th Ave, Brooklyn, NY 11220',
      'Ulmer Park': '2602 Bath Ave, Brooklyn, NY 11214',
      'Walt Whitman': '93 St Edwards St, Brooklyn, NY 11205',
      'Washington Irving': '360 Irving Ave, Brooklyn, NY 11237',
      'Williamsburg': '240 Division Ave, Brooklyn, NY 11211',
      'Windsor Terrace': '160 E 5th St, Brooklyn, NY 11218'
    }
  },

  // === LIBCAL LIBRARIES (Added 2026-01-20) ===

  'Riverside County Library System': {
    mainAddress: '3840 Mission Inn Ave, Riverside, CA 92501',
    branches: {
      'Main Library': '3581 Mission Inn Ave, Riverside, CA 92501',
      'Anza': '57430 Mitchell Rd, Anza, CA 92539',
      'Calimesa': '974 Calimesa Blvd, Calimesa, CA 92320',
      'Canyon Lake': '31516 Railroad Canyon Rd, Canyon Lake, CA 92587',
      'Cathedral City': '33520 Date Palm Dr, Cathedral City, CA 92234',
      'Coachella': '1538 7th St, Coachella, CA 92236',
      'Corona': '650 S Main St, Corona, CA 92882',
      'Desert Hot Springs': '14380 Palm Dr, Desert Hot Springs, CA 92240',
      'Glen Avon': '9244 Galena St, Riverside, CA 92509',
      'Highgrove': '530 W Center St, Riverside, CA 92507',
      'Home Gardens': '3785 Neece St, Riverside, CA 92501',
      'Idyllwild': '54401 Village Center Dr, Idyllwild, CA 92549',
      'Indio': '200 Civic Center Mall, Indio, CA 92201',
      'La Quinta': '78275 Calle Tampico, La Quinta, CA 92253',
      'Lake Elsinore': '600 W Graham Ave, Lake Elsinore, CA 92530',
      'Lake Tamarisk': '43880 Lake Tamarisk Dr, Desert Center, CA 92239',
      'Mead Valley': '20910 Rider St, Perris, CA 92570',
      'Mecca': '65250 Coahuilla St, Mecca, CA 92254',
      'Mission Trail': '34303 Mission Trail, Wildomar, CA 92595',
      'Norco': '3954 Old Hamner Rd, Norco, CA 92860',
      'Nuview': '29990 Lakeview Ave, Nuevo, CA 92567',
      'Palm Desert': '73300 Fred Waring Dr, Palm Desert, CA 92260',
      'Palm Springs': '300 S Sunrise Way, Palm Springs, CA 92262',
      'Perris': '163 E San Jacinto Ave, Perris, CA 92570',
      'Rubidoux': '5840 Mission Blvd, Riverside, CA 92509',
      'San Jacinto': '300 W 1st St, San Jacinto, CA 92583',
      'Sun City': '26982 Cherry Hills Blvd, Sun City, CA 92586',
      'Temecula': '30600 Pauba Rd, Temecula, CA 92592',
      'Thousand Palms': '31189 Robert Rd, Thousand Palms, CA 92276',
      'Valle Vista': '25757 Fairview Ave, Hemet, CA 92544',
      'Woodcrest': '16625 Krameria Ave, Riverside, CA 92504'
    }
  },

  'Santa Cruz Public Libraries': {
    mainAddress: '224 Church St, Santa Cruz, CA 95060',
    branches: {
      'Downtown Library': '224 Church St, Santa Cruz, CA 95060',
      'Aptos': '7695 Soquel Dr, Aptos, CA 95003',
      'Boulder Creek': '13390 W Park Ave, Boulder Creek, CA 95006',
      'Branciforte': '230 Gault St, Santa Cruz, CA 95062',
      'Capitola': '2005 Wharf Rd, Capitola, CA 95010',
      'Felton': '6299 Gushee St, Felton, CA 95018',
      'Garfield Park': '705 Woodrow Ave, Santa Cruz, CA 95060',
      'La Selva Beach': '316 Estrella Ave, La Selva Beach, CA 95076',
      'Live Oak': '2380 Portola Dr, Santa Cruz, CA 95062',
      'Scotts Valley': '251 Kings Village Rd, Scotts Valley, CA 95066'
    }
  },

  'San Leandro Public Library': {
    mainAddress: '300 Estudillo Ave, San Leandro, CA 94577',
    branches: {
      'Main Library': '300 Estudillo Ave, San Leandro, CA 94577',
      'Manor': '1241 Manor Blvd, San Leandro, CA 94579',
      'Mulford-Marina': '13699 Aurora Dr, San Leandro, CA 94577',
      'South': '14799 E 14th St, San Leandro, CA 94578'
    }
  },

  'Placer County Library': {
    mainAddress: '350 Nevada St, Auburn, CA 95603',
    branches: {
      'Auburn': '350 Nevada St, Auburn, CA 95603',
      'Applegate': '18018 Applegate Rd, Applegate, CA 95703',
      'Colfax': '360 Main St, Colfax, CA 95713',
      'Foresthill': '24580 Main St, Foresthill, CA 95631',
      'Granite Bay': '6475 Douglas Blvd, Granite Bay, CA 95746',
      'Kings Beach': '301 Secline St, Kings Beach, CA 96143',
      'Lincoln': '485 Twelve Bridges Dr, Lincoln, CA 95648',
      'Loomis': '6050 Library Dr, Loomis, CA 95650',
      'Meadow Vista': '19713 Placer Hills Rd, Meadow Vista, CA 95722',
      'Penryn': '2215 Rippey Rd, Penryn, CA 95663',
      'Rocklin': '4890 Granite Dr, Rocklin, CA 95677',
      'Roseville': '225 Taylor St, Roseville, CA 95678',
      'Tahoe City': '740 N Lake Blvd, Tahoe City, CA 96145'
    }
  },

  'Sonoma County Library': {
    mainAddress: '211 E St, Santa Rosa, CA 95404',
    branches: {
      'Central Library': '211 E St, Santa Rosa, CA 95404',
      'Cloverdale': '401 N Cloverdale Blvd, Cloverdale, CA 95425',
      'Forestville': '6533 Covey Rd, Forestville, CA 95436',
      'Guerneville': '14107 Armstrong Woods Rd, Guerneville, CA 95446',
      'Healdsburg': '139 Piper St, Healdsburg, CA 95448',
      'Northwest Santa Rosa': '150 Coddingtown Ctr, Santa Rosa, CA 95401',
      'Occidental': '160 N Main St, Occidental, CA 95465',
      'Petaluma': '100 Fairgrounds Dr, Petaluma, CA 94952',
      'Rincon Valley': '6959 Montecito Blvd, Santa Rosa, CA 95409',
      'Rohnert Park-Cotati': '6250 Lynne Conde Way, Rohnert Park, CA 94928',
      'Sebastopol': '7140 Bodega Ave, Sebastopol, CA 95472',
      'Sonoma Valley': '755 W Napa St, Sonoma, CA 95476',
      'Windsor': '9291 Old Redwood Hwy, Windsor, CA 95492'
    }
  },

  'Anaheim Public Library': {
    mainAddress: '500 W Broadway, Anaheim, CA 92805',
    branches: {
      'Central Library': '500 W Broadway, Anaheim, CA 92805',
      'Canyon Hills': '400 Scout Trail, Anaheim, CA 92807',
      'East Anaheim': '8201 E Santa Ana Canyon Rd, Anaheim, CA 92808',
      'Euclid': '1340 S Euclid St, Anaheim, CA 92802',
      'Haskett': '2650 W Broadway, Anaheim, CA 92804',
      'Ponderosa Joint-Use': '2215 W Ball Rd, Anaheim, CA 92804',
      'Sunkist': '901 S Sunkist St, Anaheim, CA 92806'
    }
  },

  'Fresno County Public Library': {
    mainAddress: '2420 Mariposa St, Fresno, CA 93721',
    branches: {
      'Central Library': '2420 Mariposa St, Fresno, CA 93721',
      'Betty Rodriguez': '3040 N Cedar Ave, Fresno, CA 93703',
      'Fig Garden': '3071 W Bullard Ave, Fresno, CA 93711',
      'Gillis': '629 W Dakota Ave, Fresno, CA 93705',
      'Mosqueda': '4670 E Butler Ave, Fresno, CA 93702',
      'Politi': '5771 N First St, Fresno, CA 93710',
      'Sunnyside': '5566 E Kings Canyon Rd, Fresno, CA 93727',
      'Tarpey Village': '5714 E Tulare Ave, Fresno, CA 93727',
      'Ted C Wills': '770 N San Pablo Ave, Fresno, CA 93728',
      'West Fresno': '188 E California Ave, Fresno, CA 93706',
      'Woodward Park': '944 E Perrin Ave, Fresno, CA 93720',
      'Bear Mountain': '30733 E Kings Canyon Rd, Squaw Valley, CA 93675',
      'Biola': '4884 N Biola Ave, Fresno, CA 93723',
      'Caruthers': '13285 S Sycamore Ave, Caruthers, CA 93609',
      'Coalinga-Huron': '305 N 4th St, Coalinga, CA 93210',
      'Del Rey': '10970 E Morro Ave, Del Rey, CA 93616',
      'Easton': '1901 E California Ave, Fresno, CA 93706',
      'Firebaugh': '1315 O St, Firebaugh, CA 93622',
      'Fowler': '306 S 7th St, Fowler, CA 93625',
      'Kerman': '15056 W Kearney Blvd, Kerman, CA 93630',
      'Kingsburg': '1399 Draper St, Kingsburg, CA 93631',
      'Laton': '6476 De Woody St, Laton, CA 93242',
      'Mendota': '1246 Belmont Ave, Mendota, CA 93640',
      'Orange Cove': '815 Park Blvd, Orange Cove, CA 93646',
      'Parlier': '1130 E Parlier Ave, Parlier, CA 93648',
      'Piedra': '24930 Trimmer Springs Rd, Piedra, CA 93649',
      'Reedley': '1027 F St, Reedley, CA 93654',
      'Riverdale': '20975 S Malsbary Ave, Riverdale, CA 93656',
      'San Joaquin': '8781 Main St, San Joaquin, CA 93660',
      'Sanger': '1812 7th St, Sanger, CA 93657',
      'Selma': '2200 Selma St, Selma, CA 93662',
      'Tranquillity': '25561 W Whitesbridge Ave, Tranquillity, CA 93668'
    }
  },

  'Denver Public Library': {
    mainAddress: '10 W 14th Ave Pkwy, Denver, CO 80204',
    branches: {
      'Central Library': '10 W 14th Ave Pkwy, Denver, CO 80204',
      'Athmar Park': '1055 S Tejon St, Denver, CO 80223',
      'Bear Valley': '5171 W Dartmouth Ave, Denver, CO 80236',
      'Blair-Caldwell African American Research': '2401 Welton St, Denver, CO 80205',
      'Byers': '675 Santa Fe Dr, Denver, CO 80204',
      'Decker': '1501 S Logan St, Denver, CO 80210',
      'Eugene Field': '810 S University Blvd, Denver, CO 80209',
      'Ford-Warren': '2825 High St, Denver, CO 80205',
      'Green Valley Ranch': '4856 N Himalaya St, Denver, CO 80249',
      'Hadley': '1890 S Grove St, Denver, CO 80219',
      'Hampden': '9755 E Girard Ave, Denver, CO 80231',
      'Montbello': '12955 Albrook Dr, Denver, CO 80239',
      'Park Hill': '4705 Montview Blvd, Denver, CO 80207',
      'Pauline Robinson': '5575 E 33rd Ave, Denver, CO 80207',
      'Rodolfo "Corky" Gonzales': '1498 N Irving St, Denver, CO 80204',
      'Ross-Barnum': '3570 W 1st Ave, Denver, CO 80219',
      'Ross-Broadway': '33 E Bayaud Ave, Denver, CO 80209',
      'Ross-Cherry Creek': '305 Milwaukee St, Denver, CO 80206',
      'Ross-University Hills': '4310 E Amherst Ave, Denver, CO 80222',
      'Sam Gary': '2961 Roslyn St, Denver, CO 80238',
      'Schlessman Family': '100 Poplar St, Denver, CO 80220',
      'Smiley': '4501 W 46th Ave, Denver, CO 80212',
      'Valdez-Perry': '4690 Vine St, Denver, CO 80216',
      'Virginia Village': '1500 S Dahlia St, Denver, CO 80222',
      'Westwood': '1000 S Lowell Blvd, Denver, CO 80219',
      'Woodbury': '3265 Federal Blvd, Denver, CO 80211'
    }
  },

  'Douglas County Libraries': {
    mainAddress: '100 S Wilcox St, Castle Rock, CO 80104',
    branches: {
      'Philip S. Miller': '100 S Wilcox St, Castle Rock, CO 80104',
      'Castle Pines': '360 Village Square Ln, Castle Pines, CO 80108',
      'Highlands Ranch': '9292 Ridgeline Blvd, Highlands Ranch, CO 80129',
      'Lone Tree': '10055 Library Way, Lone Tree, CO 80124',
      'Parker': '20105 E Mainstreet, Parker, CO 80138',
      'Roxborough': '8357 N Rampart Range Rd, Littleton, CO 80125'
    }
  },

  'Boulder Public Library District': {
    mainAddress: '1001 Arapahoe Ave, Boulder, CO 80302',
    branches: {
      'Main Library': '1001 Arapahoe Ave, Boulder, CO 80302',
      'George Reynolds': '3595 Table Mesa Dr, Boulder, CO 80305',
      'Meadows': '4800 Baseline Rd, Boulder, CO 80303',
      'NoBo Corner': '4600 Broadway, Boulder, CO 80304'
    }
  },

  'Lafayette Public Library': {
    mainAddress: '775 W Baseline Rd, Lafayette, CO 80026',
    branches: {
      'Main Library': '775 W Baseline Rd, Lafayette, CO 80026'
    }
  },

  'Onondaga County Public Libraries': {
    mainAddress: '447 S Salina St, Syracuse, NY 13202',
    branches: {
      'Central Library': '447 S Salina St, Syracuse, NY 13202',
      'Betts': '4862 S Salina St, Syracuse, NY 13205',
      'Beauchamp': '2111 S Salina St, Syracuse, NY 13205',
      'Hazard': '1620 W Genesee St, Syracuse, NY 13204',
      'Mundy': '1204 S Geddes St, Syracuse, NY 13204',
      'Paine': '113 Nichols Ave, Syracuse, NY 13206',
      'Petit': '105 Victoria Pl, Syracuse, NY 13210',
      'Soule': '101 Springfield Rd, Syracuse, NY 13214',
      'White': '763 Butternut St, Syracuse, NY 13208'
    }
  },

  'Northern Onondaga Public Libraries': {
    mainAddress: '100 Trolley Barn Ln, North Syracuse, NY 13212',
    branches: {
      'North Syracuse': '100 Trolley Barn Ln, North Syracuse, NY 13212',
      'Brewerton': '5437 Library St, Brewerton, NY 13029',
      'Cicero': '8686 Knowledge Ln, Cicero, NY 13039',
      'Liverpool': '310 Tulip St, Liverpool, NY 13088'
    }
  },

  'Westchester Library System': {
    mainAddress: '540 White Plains Rd, Tarrytown, NY 10591',
    branches: {
      'Service Center': '540 White Plains Rd, Tarrytown, NY 10591'
    }
  },

  'Suffolk Cooperative Library System': {
    mainAddress: '627 N Sunrise Service Rd, Bellport, NY 11713',
    branches: {
      'Service Center': '627 N Sunrise Service Rd, Bellport, NY 11713'
    }
  },

  'Nassau Library System': {
    mainAddress: '900 Jerusalem Ave, Uniondale, NY 11553',
    branches: {
      'Service Center': '900 Jerusalem Ave, Uniondale, NY 11553'
    }
  },

  'Cleveland Public Library': {
    mainAddress: '325 Superior Ave E, Cleveland, OH 44114',
    branches: {
      'Main Library': '325 Superior Ave E, Cleveland, OH 44114',
      'Addison': '6901 Superior Ave, Cleveland, OH 44103',
      'Broadway': '5765 Broadway Ave, Cleveland, OH 44127',
      'Brooklyn': '3706 Pearl Rd, Cleveland, OH 44109',
      'Carnegie West': '1900 Fulton Rd, Cleveland, OH 44113',
      'Collinwood': '856 E 152nd St, Cleveland, OH 44110',
      'East 131st Street': '3830 E 131st St, Cleveland, OH 44120',
      'Eastman': '11602 Lorain Ave, Cleveland, OH 44111',
      'Fleet': '7224 Broadway Ave, Cleveland, OH 44105',
      'Fulton': '3545 Fulton Rd, Cleveland, OH 44109',
      'Garden Valley': '7201 Kinsman Rd, Cleveland, OH 44104',
      'Glenville': '11900 St Clair Ave, Cleveland, OH 44108',
      'Harvard-Lee': '16918 Harvard Ave, Cleveland, OH 44128',
      'Hough': '1566 Crawford Rd, Cleveland, OH 44106',
      'Jefferson': '850 Jefferson Ave, Cleveland, OH 44113',
      'Langston Hughes': '10200 Superior Ave, Cleveland, OH 44106',
      'Lorain': '8216 Lorain Ave, Cleveland, OH 44102',
      'Martin Luther King Jr.': '1962 Stokes Blvd, Cleveland, OH 44106',
      'Memorial-Nottingham': '17109 Lake Shore Blvd, Cleveland, OH 44110',
      'Mt. Pleasant': '14000 Kinsman Rd, Cleveland, OH 44120',
      'Rice': '11535 Shaker Blvd, Cleveland, OH 44104',
      'Rockport': '4421 W 140th St, Cleveland, OH 44135',
      'South': '1755 Broadway Ave, Cleveland, OH 44146',
      'South Brooklyn': '4303 Pearl Rd, Cleveland, OH 44109',
      'Sterling': '2200 E 30th St, Cleveland, OH 44115',
      'Union': '3463 E 93rd St, Cleveland, OH 44104',
      'Walz': '7910 Detroit Ave, Cleveland, OH 44102',
      'West Park': '3805 W 157th St, Cleveland, OH 44111',
      'Woodland': '5806 Woodland Ave, Cleveland, OH 44104'
    }
  },

  'Carnegie Library of Pittsburgh': {
    mainAddress: '4400 Forbes Ave, Pittsburgh, PA 15213',
    branches: {
      'Main Library': '4400 Forbes Ave, Pittsburgh, PA 15213',
      'Allegheny': '1230 Federal St, Pittsburgh, PA 15212',
      'Beechview': '1910 Broadway Ave, Pittsburgh, PA 15216',
      'Brookline': '708 Brookline Blvd, Pittsburgh, PA 15226',
      'Carrick': '1811 Brownsville Rd, Pittsburgh, PA 15210',
      'Downtown & Business': '612 Smithfield St, Pittsburgh, PA 15222',
      'East Liberty': '130 S Whitfield St, Pittsburgh, PA 15206',
      'Hazelwood': '5006 Second Ave, Pittsburgh, PA 15207',
      'Hill District': '2177 Centre Ave, Pittsburgh, PA 15219',
      'Homewood': '7101 Hamilton Ave, Pittsburgh, PA 15208',
      'Knoxville': '400 Brownsville Rd, Pittsburgh, PA 15210',
      'Lawrenceville': '279 Fisk St, Pittsburgh, PA 15201',
      'Mt. Washington': '315 Grandview Ave, Pittsburgh, PA 15211',
      'Sheraden': '720 Sherwood Ave, Pittsburgh, PA 15204',
      'South Side': '2205 E Carson St, Pittsburgh, PA 15203',
      'Squirrel Hill': '5801 Forbes Ave, Pittsburgh, PA 15217',
      'West End': '47 Wabash Ave, Pittsburgh, PA 15220',
      'Woods Run': '1201 Woods Run Ave, Pittsburgh, PA 15212'
    }
  },

  'Charleston County Public Library': {
    mainAddress: '68 Calhoun St, Charleston, SC 29401',
    branches: {
      'Main Library': '68 Calhoun St, Charleston, SC 29401',
      'Baxter-Patrick James Island': '1858 Camp Rd, Charleston, SC 29412',
      'Bees Ferry West Ashley': '3035 Sanders Rd, Charleston, SC 29414',
      'Dorchester Road': '6325 Dorchester Rd, North Charleston, SC 29418',
      'Edgar Allan Poe/Sullivan\'s Island': '1921 Ion Ave, Sullivan\'s Island, SC 29482',
      'Edisto Island': '2026 Hwy 174, Edisto Island, SC 29438',
      'Folly Beach': '55 Center St, Folly Beach, SC 29439',
      'Hurd/St. Andrews': '1735 N Woodmere Dr, Charleston, SC 29407',
      'John L. Dart': '1067 King St, Charleston, SC 29403',
      'John\'s Island': '3531 Maybank Hwy, Johns Island, SC 29455',
      'Keith Summey North Charleston': '5501 C Ashley Phosphate Rd, North Charleston, SC 29418',
      'McClellanville': '222 Baker St, McClellanville, SC 29458',
      'Mt. Pleasant': '1133 Mathis Ferry Rd, Mt Pleasant, SC 29464',
      'Otranto Road': '2261 Otranto Rd, North Charleston, SC 29406',
      'St. Paul\'s/Hollywood': '5906 Hwy 162, Hollywood, SC 29449',
      'Village': '430 Whilden St, Mt Pleasant, SC 29464',
      'Wando Mt. Pleasant': '1477 Long Grove Dr, Mt Pleasant, SC 29464',
      'West Ashley': '45 Windermere Blvd, Charleston, SC 29407'
    }
  },

  'Clarksville-Montgomery County Public Library': {
    mainAddress: '350 Pageant Ln, Clarksville, TN 37040',
    branches: {
      'Main Library': '350 Pageant Ln, Clarksville, TN 37040'
    }
  },

  'Corpus Christi Public Library': {
    mainAddress: '805 Comanche St, Corpus Christi, TX 78401',
    branches: {
      'La Retama Central Library': '805 Comanche St, Corpus Christi, TX 78401',
      'Ben F. McDonald': '4044 Greenwood Dr, Corpus Christi, TX 78416',
      'Dr. Clotilde P. Garcia': '5930 Brockhampton St, Corpus Christi, TX 78414',
      'Janet F. Harte': '2629 Waldron Rd, Corpus Christi, TX 78418',
      'Keach Family': '1000 Terry Shamsie Blvd, Robstown, TX 78380',
      'Neyland': '1230 Carmel Pkwy, Corpus Christi, TX 78411',
      'Owen R. Hopkins': '3202 McKinzie Rd, Corpus Christi, TX 78410'
    }
  },

  'Long Beach Public Library': {
    mainAddress: '200 W Broadway, Long Beach, CA 90802',
    branches: {
      'Main Library': '200 W Broadway, Long Beach, CA 90802',
      'Alamitos': '1836 E 3rd St, Long Beach, CA 90802',
      'Artesia': '18801 Elaine Ave, Artesia, CA 90701',
      'Bay Shore': '195 Bay Shore Ave, Long Beach, CA 90803',
      'Billie Jean King Main': '200 W Broadway, Long Beach, CA 90802',
      'Bret Harte': '1595 W Willow St, Long Beach, CA 90810',
      'Brewitt': '4036 E Anaheim St, Long Beach, CA 90804',
      'Burnett': '560 E Hill St, Long Beach, CA 90806',
      'Dana': '3680 Atlantic Ave, Long Beach, CA 90807',
      'El Dorado': '2900 Studebaker Rd, Long Beach, CA 90815',
      'Los Altos': '5614 E Britton Dr, Long Beach, CA 90815',
      'Mark Twain': '1401 E Anaheim St, Long Beach, CA 90813',
      'Michelle Obama': '5870 Atlantic Ave, Long Beach, CA 90805',
      'North': '5571 Orange Ave, Long Beach, CA 90805'
    }
  },

  'McKinney Public Library': {
    mainAddress: '101 E Hunt St, McKinney, TX 75069',
    branches: {
      'John & Judy Gay Library': '101 E Hunt St, McKinney, TX 75069',
      'Roy and Helen Hall Memorial': '2850 Craig Dr, McKinney, TX 75070'
    }
  },

  'Fort Worth Public Library': {
    mainAddress: '500 W 3rd St, Fort Worth, TX 76102',
    branches: {
      'Central Library': '500 W 3rd St, Fort Worth, TX 76102',
      'Diamond Hill/Jarvis': '1300 NE 35th St, Fort Worth, TX 76106',
      'East Berry': '4300 E Berry St, Fort Worth, TX 76105',
      'East Regional': '6301 Bridge St, Fort Worth, TX 76112',
      'Ella Mae Shamblee': '1062 E Rosedale St, Fort Worth, TX 76104',
      'Golden Triangle': '4264 Golden Triangle Blvd, Fort Worth, TX 76244',
      'Haltom City': '4809 Haltom Rd, Haltom City, TX 76117',
      'Huguley': '500 Huguley Blvd, Burleson, TX 76028',
      'Lake Worth': '3801 Adam Grubb St, Lake Worth, TX 76135',
      'Meadowbrook': '5959 E Lancaster Ave, Fort Worth, TX 76112',
      'Northside': '601 Park St, Fort Worth, TX 76164',
      'Northwest': '3317 Denton Hwy, Haltom City, TX 76117',
      'Riverside': '2913 Yucca Ave, Fort Worth, TX 76111',
      'Seminary South': '501 E Bolt St, Fort Worth, TX 76115',
      'Shamblee': '1062 E Rosedale St, Fort Worth, TX 76104',
      'Southwest Regional': '4001 Library Ln, Fort Worth, TX 76109',
      'Summerglen': '4205 Basswood Blvd, Fort Worth, TX 76137',
      'Wedgwood': '3816 Kimberly Ln, Fort Worth, TX 76133'
    }
  },

  'Sioux City Public Library': {
    mainAddress: '529 Pierce St, Sioux City, IA 51101',
    branches: {
      'Main Library': '529 Pierce St, Sioux City, IA 51101',
      'Morningside': '4005 Morningside Ave, Sioux City, IA 51106',
      'Perry Creek': '2912 Hamilton Blvd, Sioux City, IA 51104'
    }
  },

  'Stratford Library': {
    mainAddress: '2203 Main St, Stratford, CT 06615',
    branches: {
      'Main Library': '2203 Main St, Stratford, CT 06615'
    }
  },

  // ============================================================================
  // NORTH CAROLINA LIBRARIES
  // ============================================================================

  'Cabarrus County Public Library': {
    mainAddress: '27 Union St N, Concord, NC 28025',
    branches: {
      'Main Library': '27 Union St N, Concord, NC 28025',
      'Concord': '27 Union St N, Concord, NC 28025',
      'Kannapolis': '850 Mountain St, Kannapolis, NC 28081',
      'Harrisburg': '4510 Highway 49 S, Harrisburg, NC 28075',
      'Mt Pleasant': '8439 Cook St, Mt Pleasant, NC 28124',
      'Midland': '7427 Midland Rd, Midland, NC 28107'
    }
  },

  'Alamance County Library': {
    mainAddress: '342 S Spring St, Burlington, NC 27215',
    branches: {
      'May Memorial Library': '342 S Spring St, Burlington, NC 27215',
      'North Park': '849 Sharpe Rd, Burlington, NC 27217',
      'Graham': '211 S Main St, Graham, NC 27253',
      'Mebane': '101 S First St, Mebane, NC 27302'
    }
  },

  'Brunswick County Public Library': {
    mainAddress: '109 W Moore St, Southport, NC 28461',
    branches: {
      'Southport': '109 W Moore St, Southport, NC 28461',
      'Leland': '487 Village Rd NE, Leland, NC 28451',
      'Shallotte': '5072 Main St, Shallotte, NC 28470',
      'Ocean Isle Beach': '12 E Second St, Ocean Isle Beach, NC 28469',
      'Rourk': '4768 Main St, Shallotte, NC 28470'
    }
  },

  'Greensboro Public Library': {
    mainAddress: '219 N Church St, Greensboro, NC 27401',
    branches: {
      'Central Library': '219 N Church St, Greensboro, NC 27401',
      'Chavis': '505 S Benbow Rd, Greensboro, NC 27406',
      'Glenwood': '1901 W Florida St, Greensboro, NC 27403',
      'Hemphill': '2301 W Vandalia Rd, Greensboro, NC 27407',
      'Kathleen Clay Edwards': '1420 Price Park Dr, Greensboro, NC 27410',
      'McGirt-Horton': '2501 Phillips Ave, Greensboro, NC 27405',
      'Northeast': '904 Sixteenth St, Greensboro, NC 27405',
      'Southeast': '3601 S Elm-Eugene St, Greensboro, NC 27406',
      'Vance Chavis': '600 S Benbow Rd, Greensboro, NC 27406'
    }
  },

  'Rowan County Public Library': {
    mainAddress: '201 W Fisher St, Salisbury, NC 28144',
    branches: {
      'Main Library': '201 W Fisher St, Salisbury, NC 28144',
      'Salisbury': '201 W Fisher St, Salisbury, NC 28144',
      'East': '110 N Salisbury Ave, Spencer, NC 28159',
      'South': '920 Kimball Rd, China Grove, NC 28023'
    }
  },

  'Wake County Public Libraries': {
    mainAddress: '4020 Carya Dr, Raleigh, NC 27610',
    branches: {
      'Cameron Village Regional': '1930 Clark Ave, Raleigh, NC 27605',
      'Cary': '310 S Academy St, Cary, NC 27511',
      'East Regional': '946 Steeple Square Ct, Knightdale, NC 27545',
      'Eva H. Perry Regional': '2100 Shepherd Vineyard Dr, Apex, NC 27502',
      'Green Road': '4016 Green Rd, Raleigh, NC 27604',
      'North Regional': '7009 Harps Mill Rd, Raleigh, NC 27615',
      'Olivia Raney': '4016 Carya Dr, Raleigh, NC 27610',
      'Southeast Regional': '908 7th Ave, Garner, NC 27529',
      'West Regional': '4000 Louis Stephens Dr, Cary, NC 27519',
      'Zebulon Regional': '1000 Dogwood Dr, Zebulon, NC 27597',
      'Athens Drive': '1420 Athens Dr, Raleigh, NC 27606',
      'Duraleigh Road': '5408 Duraleigh Rd, Raleigh, NC 27612',
      'Fuquay-Varina': '133 S Fuquay Ave, Fuquay-Varina, NC 27526',
      'Holly Springs': '300 W Ballentine St, Holly Springs, NC 27540',
      'Leesville': '5105 Country Trail, Raleigh, NC 27613',
      'Middle Creek': '201 Fontana Dr, Apex, NC 27502',
      'North Hills': '4209 Lassiter Mill Rd, Raleigh, NC 27609',
      'Richard B. Harrison': '1313 New Bern Ave, Raleigh, NC 27610',
      'Southgate': '6519 Fayetteville Rd, Raleigh, NC 27603',
      'Wake Forest': '400 E Holding Ave, Wake Forest, NC 27587',
      'Wendell': '207 S Hollybrook Rd, Wendell, NC 27591'
    }
  },

  'New Hanover County Public Library': {
    mainAddress: '201 Chestnut St, Wilmington, NC 28401',
    branches: {
      'Main Library': '201 Chestnut St, Wilmington, NC 28401',
      'Northeast': '1241 Military Cutoff Rd, Wilmington, NC 28405',
      'Pine Valley': '3802 S College Rd, Wilmington, NC 28412',
      'Carolina Beach': '300 Cape Fear Blvd, Carolina Beach, NC 28428',
      'Pleasure Island': '1800 Surfside Dr, Kure Beach, NC 28449'
    }
  },

  'Onslow County Public Library': {
    mainAddress: '58 Doris Ave E, Jacksonville, NC 28540',
    branches: {
      'Main Library': '58 Doris Ave E, Jacksonville, NC 28540',
      'Jacksonville': '58 Doris Ave E, Jacksonville, NC 28540',
      'Richlands': '106 W Foy St, Richlands, NC 28574',
      'Sneads Ferry': '1003 NC Hwy 210, Sneads Ferry, NC 28460',
      'Swansboro': '1460 W Corbett Ave, Swansboro, NC 28584'
    }
  },

  // ============================================================================
  // CALIFORNIA LIBRARIES
  // ============================================================================

  'San Mateo County Libraries': {
    mainAddress: '125 Lessingia Ct, San Mateo, CA 94402',
    branches: {
      'Administrative Office': '125 Lessingia Ct, San Mateo, CA 94402',
      'Atherton': '2 Dinkelspiel Station Ln, Atherton, CA 94027',
      'Belmont': '1110 Alameda de las Pulgas, Belmont, CA 94002',
      'Brisbane': '250 Visitacion Ave, Brisbane, CA 94005',
      'East Palo Alto': '2415 University Ave, East Palo Alto, CA 94303',
      'Fair Oaks': '2510 Middlefield Rd, Redwood City, CA 94063',
      'Foster City': '1000 E Hillsdale Blvd, Foster City, CA 94404',
      'Half Moon Bay': '620 Correas St, Half Moon Bay, CA 94019',
      'Millbrae': '1 Library Ave, Millbrae, CA 94030',
      'North Fair Oaks': '2500 Middlefield Rd, Redwood City, CA 94063',
      'Pacifica': '104 Hilton Way, Pacifica, CA 94044',
      'Pacifica Sharp Park': '1 Hilton Way, Pacifica, CA 94044',
      'Portola Valley': '765 Portola Rd, Portola Valley, CA 94028',
      'San Carlos': '610 Elm St, San Carlos, CA 94070',
      'Woodside': '3140 Woodside Rd, Woodside, CA 94062'
    }
  },

  // ============================================================================
  // WASHINGTON LIBRARIES
  // ============================================================================

  'Sno-Isle Libraries': {
    mainAddress: '7312 35th Ave NE, Marysville, WA 98271',
    branches: {
      'Administrative Services': '7312 35th Ave NE, Marysville, WA 98271',
      'Arlington': '135 N Washington Ave, Arlington, WA 98223',
      'Brier': '23303 Brier Rd, Brier, WA 98036',
      'Camano Island': '848 N Sunrise Blvd, Camano Island, WA 98282',
      'Clinton': '9402 270th Ave NW, Stanwood, WA 98292',
      'Coupeville': '788 NW Alexander St, Coupeville, WA 98239',
      'Darrington': '1005 Cascade St, Darrington, WA 98241',
      'Edmonds': '650 Main St, Edmonds, WA 98020',
      'Freeland': '5495 S Harbor Ave, Freeland, WA 98249',
      'Granite Falls': '7742 S Alder Ave, Granite Falls, WA 98252',
      'Lake Stevens': '1824 Main St, Lake Stevens, WA 98258',
      'Langley': '104 Second St, Langley, WA 98260',
      'Lynnwood': '19200 44th Ave W, Lynnwood, WA 98036',
      'Marysville': '6120 Grove St, Marysville, WA 98270',
      'Mill Creek': '15429 Bothell-Everett Hwy, Mill Creek, WA 98012',
      'Monroe': '1070 Village Way, Monroe, WA 98272',
      'Mountlake Terrace': '23300 58th Ave W, Mountlake Terrace, WA 98043',
      'Mukilteo': '4675 Harbour Pointe Blvd, Mukilteo, WA 98275',
      'Oak Harbor': '1000 SE Regatta Dr, Oak Harbor, WA 98277',
      'Snohomish': '311 Maple Ave, Snohomish, WA 98290',
      'Stanwood': '9701 271st St NW, Stanwood, WA 98292',
      'Sultan': '319 Main St, Sultan, WA 98294'
    }
  },

  'North Central Regional Library (NCW Libraries)': {
    mainAddress: '16 N Columbia St, Wenatchee, WA 98801',
    branches: {
      'Administrative Office': '16 N Columbia St, Wenatchee, WA 98801',
      'Wenatchee': '310 Douglas St, Wenatchee, WA 98801',
      'East Wenatchee': '271 9th St NE, East Wenatchee, WA 98802',
      'Cashmere': '300 Woodring St, Cashmere, WA 98815',
      'Chelan': '216 N Emerson St, Chelan, WA 98816',
      'Coulee City': '405 W Main St, Coulee City, WA 99115',
      'Coulee Dam': '614 Birch St, Coulee Dam, WA 99116',
      'Ellensburg': '209 N Ruby St, Ellensburg, WA 98926',
      'Entiat': '14138 Kinzel St, Entiat, WA 98822',
      'Ephrata': '45 Alder St NW, Ephrata, WA 98823',
      'Grand Coulee': '225 Federal Ave, Grand Coulee, WA 99133',
      'Leavenworth': '700 Highway 2, Leavenworth, WA 98826',
      'Moses Lake': '418 E 5th Ave, Moses Lake, WA 98837',
      'Omak': '30 S Ash St, Omak, WA 98841',
      'Oroville': '1276 Main St, Oroville, WA 98844',
      'Othello': '101 E Main St, Othello, WA 99344',
      'Pateros': '173 Pateros Mall, Pateros, WA 98846',
      'Quincy': '208 Central Ave S, Quincy, WA 98848',
      'Royal City': '365 Camelia St NW, Royal City, WA 99357',
      'Soap Lake': '22 E Main Ave, Soap Lake, WA 98851',
      'Tonasket': '209 S Whitcomb Ave, Tonasket, WA 98855',
      'Warden': '305 S Main St, Warden, WA 98857',
      'Winthrop': '49 Highway 20, Winthrop, WA 98862'
    }
  },

  // ============================================================================
  // SOUTH CAROLINA LIBRARIES
  // ============================================================================

  'Beaufort County Library': {
    mainAddress: '311 Scott St, Beaufort, SC 29902',
    branches: {
      'Main Library': '311 Scott St, Beaufort, SC 29902',
      'Beaufort': '311 Scott St, Beaufort, SC 29902',
      'Hilton Head Island': '11 Beach City Rd, Hilton Head Island, SC 29926',
      'Bluffton': '120 Palmetto Way, Bluffton, SC 29910',
      'St Helena': '6355 Jonathan Francis Senior Rd, St Helena Island, SC 29920',
      'Lobeco': '2128 Trask Pkwy, Lobeco, SC 29931'
    }
  },

  'Richland Library': {
    mainAddress: '1431 Assembly St, Columbia, SC 29201',
    branches: {
      'Main Library': '1431 Assembly St, Columbia, SC 29201',
      'Ballentine': '1200 Dutch Fork Rd, Irmo, SC 29063',
      'Blythewood': '460 McNulty Rd, Blythewood, SC 29016',
      'Cooper': '5317 N Trenholm Rd, Columbia, SC 29206',
      'Eastover': '436 Main St, Eastover, SC 29044',
      'Edgewood': '3000 Middleton St, Columbia, SC 29204',
      'Hopkins': '400 Clarkson Rd, Hopkins, SC 29061',
      'Lower Richland': '9407 Garners Ferry Rd, Hopkins, SC 29061',
      'North Main': '7490 Parklane Rd, Columbia, SC 29223',
      'Northeast': '7490 Parklane Rd, Columbia, SC 29223',
      'Sandhills': '763 Fashion Dr, Columbia, SC 29229',
      'Southeast': '7945 Garners Ferry Rd, Columbia, SC 29209',
      'St Andrews': '3400 Fernandina Rd, Columbia, SC 29210',
      'Wheatley': '931 N Assembly St, Columbia, SC 29201'
    }
  },

  'Greenville County Library System': {
    mainAddress: '25 Heritage Green Pl, Greenville, SC 29601',
    branches: {
      'Hughes Main Library': '25 Heritage Green Pl, Greenville, SC 29601',
      'Main Library': '25 Heritage Green Pl, Greenville, SC 29601',
      'Augusta Road': '1580 Augusta St, Greenville, SC 29605',
      'Berea': '215 N Church St, Greenville, SC 29617',
      'Carolina Point': '501 N Hamilton St, Williamston, SC 29697',
      'Five Forks': '2845 Woodruff Rd, Simpsonville, SC 29681',
      'Fountain Inn': '220 S Main St, Fountain Inn, SC 29644',
      'Greer': '202 S Line St, Greer, SC 29650',
      'Mauldin': '215 E Butler Rd, Mauldin, SC 29662',
      'Simpsonville': '115 NE Main St, Simpsonville, SC 29681',
      'Taylors': '2730 Wade Hampton Blvd, Taylors, SC 29687',
      'Travelers Rest': '20 S Main St, Travelers Rest, SC 29690',
      'Westside': '1 James P Whitlock Jr Pkwy, Greenville, SC 29605'
    }
  },

  'Anderson County Library System': {
    mainAddress: '300 N McDuffie St, Anderson, SC 29621',
    branches: {
      'Main Library': '300 N McDuffie St, Anderson, SC 29621',
      'Anderson': '300 N McDuffie St, Anderson, SC 29621',
      'Belton': '512 E Main St, Belton, SC 29627',
      'Honea Path': '203 N Main St, Honea Path, SC 29654',
      'Iva': '420 E Front St, Iva, SC 29655',
      'Pendleton': '626 S Mechanic St, Pendleton, SC 29670',
      'Piedmont': '114 E Main St, Piedmont, SC 29673',
      'Powdersville': '4 Couch Rd, Piedmont, SC 29673',
      'Westside': '1114 N Fant St, Anderson, SC 29621'
    }
  },

  'Florence County Library System': {
    mainAddress: '509 S Dargan St, Florence, SC 29506',
    branches: {
      'Main Library': '509 S Dargan St, Florence, SC 29506',
      'Florence': '509 S Dargan St, Florence, SC 29506',
      'Johnsonville': '202 E Broadway St, Johnsonville, SC 29555',
      'Lake City': '124 N Acline St, Lake City, SC 29560',
      'Olanta': '204 W Presbyterian St, Olanta, SC 29114',
      'Pamplico': '200 S Pamplico Hwy, Pamplico, SC 29583',
      'Scranton': '3000 S Irby St, Florence, SC 29505',
      'Timmonsville': '108 N Main St, Timmonsville, SC 29161'
    }
  },

  'Lexington County Public Library': {
    mainAddress: '5440 Augusta Rd, Lexington, SC 29072',
    branches: {
      'Main Library': '5440 Augusta Rd, Lexington, SC 29072',
      'Lexington': '5440 Augusta Rd, Lexington, SC 29072',
      'Batesburg-Leesville': '506 E Church St, Batesburg, SC 29006',
      'Cayce-West Columbia': '1500 Augusta Rd, West Columbia, SC 29169',
      'Chapin': '207 Lexington Ave, Chapin, SC 29036',
      'Gilbert-Summit': '160 Library St, Gilbert, SC 29054',
      'Irmo': '6251 St Andrews Rd, Irmo, SC 29063',
      'Pelion': '6430 Edmund Hwy, Pelion, SC 29123',
      'South Congaree-Pine Ridge': '2625 Augusta Hwy, West Columbia, SC 29172',
      'Swansea': '107 Fairpark Ln, Swansea, SC 29160'
    }
  },

  'South Carolina State Library': {
    mainAddress: '1500 Senate St, Columbia, SC 29201',
    branches: {
      'Main Library': '1500 Senate St, Columbia, SC 29201'
    }
  },

  'Spartanburg County Public Libraries': {
    mainAddress: '151 S Church St, Spartanburg, SC 29306',
    branches: {
      'Headquarters Library': '151 S Church St, Spartanburg, SC 29306',
      'Main Library': '151 S Church St, Spartanburg, SC 29306',
      'Boiling Springs': '153 Business Center Dr, Boiling Springs, SC 29316',
      'Chesnee': '195 S Alabama Ave, Chesnee, SC 29323',
      'Cowpens': '101 E Church St, Cowpens, SC 29330',
      'Duncan': '101 S Danzler Rd, Duncan, SC 29334',
      'Inman': '11 N Main St, Inman, SC 29349',
      'Landrum': '111 Asbury Dr, Landrum, SC 29356',
      'Pacolet': '265 S Main St, Pacolet, SC 29372',
      'Westside': '525 Oak Grove Rd, Spartanburg, SC 29301',
      'Woodruff': '455 S Main St, Woodruff, SC 29388'
    }
  },

  'ABBE Regional Library System': {
    mainAddress: '314 Chesterfield St SW, Aiken, SC 29801',
    branches: {
      'Aiken County Library': '314 Chesterfield St SW, Aiken, SC 29801',
      'Main Library': '314 Chesterfield St SW, Aiken, SC 29801',
      'Aiken': '314 Chesterfield St SW, Aiken, SC 29801',
      'Barnwell County Library': '40 Burr St, Barnwell, SC 29812',
      'Barnwell': '40 Burr St, Barnwell, SC 29812',
      'Blackville': '19688 Solomon Blatt Ave, Blackville, SC 29817',
      'Williston': '11475 Main St, Williston, SC 29853',
      'Bamberg County Library': '90 Main Hwy, Bamberg, SC 29003',
      'Bamberg': '90 Main Hwy, Bamberg, SC 29003',
      'Denmark': '114 S Logan St, Denmark, SC 29042',
      'Edgefield County Library': '104 Court House Square, Edgefield, SC 29824',
      'Edgefield': '104 Court House Square, Edgefield, SC 29824',
      'Johnston': '714 Lee St, Johnston, SC 29832',
      'Langley-Bath-Clearwater': '2 Wellness Way, Langley, SC 29834',
      'North Augusta': '1010 Georgia Ave, North Augusta, SC 29841',
      'Graniteville-Vaucluse-Warrenville': '8 W Jackson St, Warrenville, SC 29851',
      'Jackson': '1407 Parker Rd, Jackson, SC 29831'
    }
  },

  // ============================================================================
  // MARYLAND LIBRARIES
  // ============================================================================

  'Cecil County Public Library': {
    mainAddress: '301 Newark Ave, Elkton, MD 21921',
    branches: {
      'Elkton Central': '301 Newark Ave, Elkton, MD 21921',
      'Main Library': '301 Newark Ave, Elkton, MD 21921',
      'Elkton': '301 Newark Ave, Elkton, MD 21921',
      'North East': '106 W Cecil Ave, North East, MD 21901',
      'Perryville': '500 Coudon Blvd, Perryville, MD 21903',
      'Rising Sun': '111 Colonial Way, Rising Sun, MD 21911',
      'Chesapeake City': '2527 Augustine Herman Hwy, Chesapeake City, MD 21915',
      'Port Deposit': '30 S Main St, Port Deposit, MD 21904'
    }
  },

  'Montgomery County Public Library': {
    mainAddress: '99 Maryland Ave, Rockville, MD 20850',
    branches: {
      'Rockville Memorial': '21 Maryland Ave, Rockville, MD 20850',
      'Main Library': '99 Maryland Ave, Rockville, MD 20850',
      'Bethesda': '7400 Arlington Rd, Bethesda, MD 20814',
      'Chevy Chase': '8005 Connecticut Ave, Chevy Chase, MD 20815',
      'Damascus': '9701 Main St, Damascus, MD 20872',
      'Davis': '6400 Democracy Blvd, Bethesda, MD 20817',
      'Gaithersburg': '18330 Montgomery Village Ave, Gaithersburg, MD 20879',
      'Germantown': '19840 Century Blvd, Germantown, MD 20874',
      'Kensington Park': '4201 Knowles Ave, Kensington, MD 20895',
      'Little Falls': '5501 Massachusetts Ave, Bethesda, MD 20816',
      'Long Branch': '8800 Garland Ave, Silver Spring, MD 20901',
      'Olney': '3500 Olney-Laytonsville Rd, Olney, MD 20832',
      'Poolesville': '19633 Fisher Ave, Poolesville, MD 20837',
      'Potomac': '10101 Glenolden Dr, Potomac, MD 20854',
      'Quince Orchard': '15831 Quince Orchard Rd, Gaithersburg, MD 20878',
      'Silver Spring': '900 Wayne Ave, Silver Spring, MD 20910',
      'Twinbrook': '202 Meadow Hall Dr, Rockville, MD 20851',
      'Wheaton': '11701 Georgia Ave, Wheaton, MD 20902',
      'White Oak': '11701 New Hampshire Ave, Silver Spring, MD 20904'
    }
  },

  'St. Mary': {
    mainAddress: '23250 Hollywood Rd, Leonardtown, MD 20650',
    branches: {
      'Leonardtown': '23250 Hollywood Rd, Leonardtown, MD 20650',
      'Main Library': '23250 Hollywood Rd, Leonardtown, MD 20650',
      'Charlotte Hall': '37600 New Market Rd, Charlotte Hall, MD 20622',
      'Lexington Park': '21677 FDR Blvd, Lexington Park, MD 20653'
    }
  },

  'Wicomico Public Libraries': {
    mainAddress: '122 S Division St, Salisbury, MD 21801',
    branches: {
      'Main Library': '122 S Division St, Salisbury, MD 21801',
      'Salisbury': '122 S Division St, Salisbury, MD 21801',
      'Pittsville': '7895 Main St, Pittsville, MD 21850',
      'Mardela': '315 S Main St, Mardela Springs, MD 21837'
    }
  },

  'Dorchester County Public Library': {
    mainAddress: '303 Gay St, Cambridge, MD 21613',
    branches: {
      'Main Library': '303 Gay St, Cambridge, MD 21613',
      'Cambridge': '303 Gay St, Cambridge, MD 21613',
      'Hurlock': '200 S Main St, Hurlock, MD 21643',
      'Vienna': '4304 Ocean Gateway, Vienna, MD 21869'
    }
  },

  'Prince George': {
    mainAddress: '6530 Adelphi Rd, Hyattsville, MD 20782',
    branches: {
      'Main Library': '6530 Adelphi Rd, Hyattsville, MD 20782',
      'Hyattsville': '6530 Adelphi Rd, Hyattsville, MD 20782',
      'Accokeek': '15773 Livingston Rd, Accokeek, MD 20607',
      'Baden': '13603 Baden-Westwood Rd, Brandywine, MD 20613',
      'Bladensburg': '4820 Annapolis Rd, Bladensburg, MD 20710',
      'Bowie': '15210 Annapolis Rd, Bowie, MD 20715',
      'Fairmount Heights': '5904 Kolb St, Fairmount Heights, MD 20743',
      'Glenarden': '8724 Glenarden Pkwy, Glenarden, MD 20706',
      'Greenbelt': '11 Crescent Rd, Greenbelt, MD 20770',
      'Hillcrest Heights': '2398 Iverson St, Temple Hills, MD 20748',
      'Largo-Kettering': '9601 Capital Ln, Largo, MD 20774',
      'Laurel': '507 7th St, Laurel, MD 20707',
      'Mount Rainier': '3409 Rhode Island Ave, Mount Rainier, MD 20712',
      'New Carrollton': '7414 Riverdale Rd, New Carrollton, MD 20784',
      'Oxon Hill': '6200 Oxon Hill Rd, Oxon Hill, MD 20745',
      'South Bowie': '15301 Hall Rd, Bowie, MD 20721',
      'Spauldings': '5811 Old Silver Hill Rd, District Heights, MD 20747',
      'Surratts-Clinton': '9400 Piscataway Rd, Clinton, MD 20735',
      'Upper Marlboro': '14730 Main St, Upper Marlboro, MD 20772'
    }
  },

  'Queen Anne': {
    mainAddress: '121 S Commerce St, Centreville, MD 21617',
    branches: {
      'Main Library': '121 S Commerce St, Centreville, MD 21617',
      'Centreville': '121 S Commerce St, Centreville, MD 21617',
      'Kent Island': '200 Library Cir, Stevensville, MD 21666'
    }
  },

  // ============================================================================
  // VIRGINIA LIBRARIES
  // ============================================================================

  'Newport News Public Library System': {
    mainAddress: '2400 Washington Ave, Newport News, VA 23607',
    branches: {
      'Main Street Library': '110 Main St, Newport News, VA 23601',
      'Main Library': '2400 Washington Ave, Newport News, VA 23607',
      'Grissom': '366 DeShazor Dr, Newport News, VA 23602',
      'Pearl Bailey': '2510 Wickham Ave, Newport News, VA 23607',
      'Virgil I. Grissom': '366 DeShazor Dr, Newport News, VA 23602',
      'West Avenue': '2400 Washington Ave, Newport News, VA 23607'
    }
  },

  'Danville Public Library': {
    mainAddress: '511 Patton St, Danville, VA 24541',
    branches: {
      'Main Library': '511 Patton St, Danville, VA 24541',
      'Danville': '511 Patton St, Danville, VA 24541'
    }
  },

  'Colonial Heights Public Library': {
    mainAddress: '1000 Yacht Basin Dr, Colonial Heights, VA 23834',
    branches: {
      'Main Library': '1000 Yacht Basin Dr, Colonial Heights, VA 23834',
      'Colonial Heights': '1000 Yacht Basin Dr, Colonial Heights, VA 23834'
    }
  },

  'Culpeper County Library': {
    mainAddress: '271 Southgate Shopping Ctr, Culpeper, VA 22701',
    branches: {
      'Main Library': '271 Southgate Shopping Ctr, Culpeper, VA 22701',
      'Culpeper': '271 Southgate Shopping Ctr, Culpeper, VA 22701'
    }
  },

  'Hampton Public Library': {
    mainAddress: '4207 Victoria Blvd, Hampton, VA 23669',
    branches: {
      'Main Library': '4207 Victoria Blvd, Hampton, VA 23669',
      'Hampton': '4207 Victoria Blvd, Hampton, VA 23669',
      'Coliseum Central': '4470 Hampton Roads Pkwy, Hampton, VA 23666',
      'Northampton': '1908 Todds Ln, Hampton, VA 23666',
      'Phoebus': '4 E Mellen St, Hampton, VA 23663',
      'Willow Oaks': '2 James River Dr, Hampton, VA 23666'
    }
  },

  'Mary Riley Styles Public Library': {
    mainAddress: '120 N Virginia Ave, Falls Church, VA 22046',
    branches: {
      'Main Library': '120 N Virginia Ave, Falls Church, VA 22046',
      'Falls Church': '120 N Virginia Ave, Falls Church, VA 22046'
    }
  },

  'Radford Public Library': {
    mainAddress: '30 W Main St, Radford, VA 24141',
    branches: {
      'Main Library': '30 W Main St, Radford, VA 24141',
      'Radford': '30 W Main St, Radford, VA 24141'
    }
  },

  'Amherst County Public Library': {
    mainAddress: '382 S Main St, Amherst, VA 24521',
    branches: {
      'Main Library': '382 S Main St, Amherst, VA 24521',
      'Amherst': '382 S Main St, Amherst, VA 24521',
      'Madison Heights': '329 Amelon Rd, Madison Heights, VA 24572'
    }
  },

  'Essex Public Library': {
    mainAddress: '117 N Church Ln, Tappahannock, VA 22560',
    branches: {
      'Main Library': '117 N Church Ln, Tappahannock, VA 22560',
      'Tappahannock': '117 N Church Ln, Tappahannock, VA 22560'
    }
  },

  'Powhatan County Public Library': {
    mainAddress: '2270 Mann Rd, Powhatan, VA 23139',
    branches: {
      'Main Library': '2270 Mann Rd, Powhatan, VA 23139',
      'Powhatan': '2270 Mann Rd, Powhatan, VA 23139'
    }
  },

  'Washington County Public Library': {
    mainAddress: '205 Oak Hill St, Abingdon, VA 24210',
    branches: {
      'Main Library': '205 Oak Hill St, Abingdon, VA 24210',
      'Abingdon': '205 Oak Hill St, Abingdon, VA 24210',
      'Damascus': '310 S Shady Ave, Damascus, VA 24236',
      'Glade Spring': '33417 Lee Hwy, Glade Spring, VA 24340',
      'Hayters Gap': '28289 Hayters Gap Rd, Abingdon, VA 24211',
      'Mendota': '11650 Mendota Rd, Mendota, VA 24270'
    }
  },

  'Wythe-Grayson Regional Library': {
    mainAddress: '300 E Monroe St, Wytheville, VA 24382',
    branches: {
      'Wythe County Public Library': '300 E Monroe St, Wytheville, VA 24382',
      'Main Library': '300 E Monroe St, Wytheville, VA 24382',
      'Wytheville': '300 E Monroe St, Wytheville, VA 24382',
      'Fort Chiswell': '728 E Lee Hwy, Max Meadows, VA 24360',
      'Grayson County Public Library': '175 E Main St, Independence, VA 24348',
      'Independence': '175 E Main St, Independence, VA 24348'
    }
  },

  'Alleghany Highlands Regional Library': {
    mainAddress: '406 W Riverside St, Covington, VA 24426',
    branches: {
      'Clifton Forge Public Library': '535 Church St, Clifton Forge, VA 24422',
      'Clifton Forge': '535 Church St, Clifton Forge, VA 24422',
      'Covington': '406 W Riverside St, Covington, VA 24426',
      'Main Library': '406 W Riverside St, Covington, VA 24426'
    }
  },

  'Galax-Carroll Regional Library': {
    mainAddress: '610 W Stuart Dr, Galax, VA 24333',
    branches: {
      'Galax Public Library': '610 W Stuart Dr, Galax, VA 24333',
      'Main Library': '610 W Stuart Dr, Galax, VA 24333',
      'Galax': '610 W Stuart Dr, Galax, VA 24333',
      'Carroll County Public Library': '215 N Main St, Hillsville, VA 24343',
      'Hillsville': '215 N Main St, Hillsville, VA 24343'
    }
  },

  'Charlotte County Library': {
    mainAddress: '115 LeGrande Ave, Charlotte Court House, VA 23923',
    branches: {
      'Main Library': '115 LeGrande Ave, Charlotte Court House, VA 23923',
      'Charlotte Court House': '115 LeGrande Ave, Charlotte Court House, VA 23923'
    }
  },

  'Halifax County-South Boston Library': {
    mainAddress: '509 S Main St, South Boston, VA 24592',
    branches: {
      'South Boston Library': '509 S Main St, South Boston, VA 24592',
      'Main Library': '509 S Main St, South Boston, VA 24592',
      'South Boston': '509 S Main St, South Boston, VA 24592',
      'Halifax': '2 S Main St, Halifax, VA 24558',
      'Virgilina': '2199 Blue Wing Rd, Virgilina, VA 24598'
    }
  },

  'Blackwater Regional Library': {
    mainAddress: '22511 Main St, Courtland, VA 23837',
    branches: {
      'Main Library': '22511 Main St, Courtland, VA 23837',
      'Courtland': '22511 Main St, Courtland, VA 23837',
      'Franklin': '308 N Main St, Franklin, VA 23851',
      'Ivor': '13475 Courthouse Hwy, Ivor, VA 23866',
      'Newsoms': '22441 Main St, Newsoms, VA 23874'
    }
  },

  'Rappahannock County Library': {
    mainAddress: '4 Library Rd, Washington, VA 22747',
    branches: {
      'Main Library': '4 Library Rd, Washington, VA 22747',
      'Washington': '4 Library Rd, Washington, VA 22747'
    }
  },

  'Heritage Public Library': {
    mainAddress: '7791 Courthouse Rd, New Kent, VA 23124',
    branches: {
      'Main Library': '7791 Courthouse Rd, New Kent, VA 23124',
      'New Kent': '7791 Courthouse Rd, New Kent, VA 23124',
      'Charles City': '12703 Courthouse Rd, Charles City, VA 23030',
      'King William': '180 Horse Landing Rd, King William, VA 23086'
    }
  },

  'Shenandoah County Library': {
    mainAddress: '514 Stoney Creek Blvd, Edinburg, VA 22824',
    branches: {
      'Main Library': '514 Stoney Creek Blvd, Edinburg, VA 22824',
      'Edinburg': '514 Stoney Creek Blvd, Edinburg, VA 22824',
      'Basye': '8558 Supinlick Ridge Rd, Basye, VA 22810',
      'Mount Jackson': '6005 Main St, Mount Jackson, VA 22842',
      'Strasburg': '160 E Queen St, Strasburg, VA 22657',
      'Toms Brook': '3397 S Main St, Toms Brook, VA 22660',
      'Woodstock': '123 S Muhlenberg St, Woodstock, VA 22664'
    }
  },

  'Bristol Public Library': {
    mainAddress: '701 Goode St, Bristol, VA 24201',
    branches: {
      'Main Library': '701 Goode St, Bristol, VA 24201',
      'Bristol': '701 Goode St, Bristol, VA 24201'
    }
  },

  'Pittsylvania County Public Library': {
    mainAddress: '24 Military Dr, Chatham, VA 24531',
    branches: {
      'Main Library': '24 Military Dr, Chatham, VA 24531',
      'Chatham': '24 Military Dr, Chatham, VA 24531',
      'Gretna': '109 Washington St, Gretna, VA 24557',
      'Hurt': '7009 Franklin Turnpike, Hurt, VA 24563',
      'Mount Hermon': '7920 Franklin Turnpike, Gretna, VA 24557'
    }
  },

  'Virginia Beach Public Library': {
    mainAddress: '4100 Virginia Beach Blvd, Virginia Beach, VA 23452',
    branches: {
      'Central Library': '4100 Virginia Beach Blvd, Virginia Beach, VA 23452',
      'Main Library': '4100 Virginia Beach Blvd, Virginia Beach, VA 23452',
      'Bayside': '936 Independence Blvd, Virginia Beach, VA 23455',
      'Great Neck': '1251 Bayne Dr, Virginia Beach, VA 23454',
      'Kempsville': '832 Kempsville Rd, Virginia Beach, VA 23464',
      'Meyera E. Oberndorf Central': '4100 Virginia Beach Blvd, Virginia Beach, VA 23452',
      'Oceanfront': '700 Virginia Beach Blvd, Virginia Beach, VA 23451',
      'Pungo-Blackwater': '916 Princess Anne Rd, Virginia Beach, VA 23457',
      'Princess Anne': '1444 Princess Anne Rd, Virginia Beach, VA 23456',
      'Windsor Woods': '3612 S Plaza Trail, Virginia Beach, VA 23452'
    }
  },

  'Lonesome Pine Regional Library': {
    mainAddress: '124 Library Rd E, Big Stone Gap, VA 24219',
    branches: {
      'Main Library': '124 Library Rd E, Big Stone Gap, VA 24219',
      'Big Stone Gap': '124 Library Rd E, Big Stone Gap, VA 24219',
      'Coeburn': '430 Front St W, Coeburn, VA 24230',
      'Dungannon': '220 Spur Rd, Dungannon, VA 24245',
      'Gate City': '425 E Jackson St, Gate City, VA 24251',
      'Jonesville': '201 Riley Ln, Jonesville, VA 24263',
      'Norton': '1061 Park Ave NW, Norton, VA 24273',
      'Pennington Gap': '340 Woodland Dr SW, Pennington Gap, VA 24277',
      'St Paul': '16413 Riverside Dr, St Paul, VA 24283',
      'Weber City': '1505 W Main St, Weber City, VA 24290',
      'Wise': '206 E Main St, Wise, VA 24293'
    }
  },

  // ============================================================================
  // NEW JERSEY LIBRARIES
  // ============================================================================

  'Middlesex County Library': {
    mainAddress: '75 Bayard St, New Brunswick, NJ 08901',
    branches: {
      'New Brunswick': '60 Livingston Ave, New Brunswick, NJ 08901',
      'Main Library': '75 Bayard St, New Brunswick, NJ 08901',
      'Bookmobile': '75 Bayard St, New Brunswick, NJ 08901',
      'Carteret': '100 Cooke Ave, Carteret, NJ 07008',
      'East Brunswick': '2 Jean Walling Civic Ctr, East Brunswick, NJ 08816',
      'Edison': '340 Plainfield Ave, Edison, NJ 08817',
      'JFK Library': '340 Plainfield Ave, Edison, NJ 08817',
      'Metuchen': '480 Middlesex Ave, Metuchen, NJ 08840',
      'Monroe Township': '4 Municipal Plaza, Monroe Township, NJ 08831',
      'North Brunswick': '880 Hermann Rd, North Brunswick, NJ 08902',
      'Old Bridge': '1 Old Bridge Plaza, Old Bridge, NJ 08857',
      'Perth Amboy': '196 Jefferson St, Perth Amboy, NJ 08861',
      'Piscataway': '500 Hoes Ln, Piscataway, NJ 08854',
      'Plainsboro': '9 Van Doren St, Plainsboro, NJ 08536',
      'Sayreville': '1050 Washington Rd, Parlin, NJ 08859',
      'South Amboy': '100 Harold G. Hoffman Plaza, South Amboy, NJ 08879',
      'South Plainfield': '2484 Plainfield Ave, South Plainfield, NJ 07080',
      'South River': '55 Appleby Ave, South River, NJ 08882',
      'Spotswood': '548 Main St, Spotswood, NJ 08884',
      'Woodbridge': '1 George Frederick Plaza, Woodbridge, NJ 07095'
    }
  },

  'Camden County Library System': {
    mainAddress: '203 Laurel Rd, Voorhees, NJ 08043',
    branches: {
      'Vogelson Regional': '203 Laurel Rd, Voorhees, NJ 08043',
      'Main Library': '203 Laurel Rd, Voorhees, NJ 08043',
      'Bellmawr': '35 E Browning Rd, Bellmawr, NJ 08031',
      'Gloucester Township': '15 S Black Horse Pike, Blackwood, NJ 08012',
      'Haddon Township': '15 MacArthur Blvd, Westmont, NJ 08108',
      'Hi-Nella': '303 White Horse Pike, Hi-Nella, NJ 08083',
      'Lindenwold': '310 E Linden Ave, Lindenwold, NJ 08021',
      'Merchantville': '130 S Centre St, Merchantville, NJ 08109',
      'Mt. Ephraim': '200 S Black Horse Pike, Mt. Ephraim, NJ 08059',
      'Riletta L. Cream Ferry Ave': '852 Ferry Ave, Camden, NJ 08104',
      'South County Regional': '35 Coopers Folly Rd, Atco, NJ 08004',
      'Winslow Township': '20 Arbor Dr, Hammonton, NJ 08037'
    }
  },

  'BCCLS - Bergen County Cooperative Library System': {
    mainAddress: '810 Main St, Hackensack, NJ 07601',
    branches: {
      'Administrative Office': '810 Main St, Hackensack, NJ 07601'
    }
  },

  'Jersey City Free Public Library': {
    mainAddress: '472 Jersey Ave, Jersey City, NJ 07302',
    branches: {
      'Main Library': '472 Jersey Ave, Jersey City, NJ 07302',
      'Jersey City': '472 Jersey Ave, Jersey City, NJ 07302',
      'Five Corners': '678 Newark Ave, Jersey City, NJ 07306',
      'Greenville': '1841 Kennedy Blvd, Jersey City, NJ 07305',
      'Heights': '26 Heights Blvd, Jersey City, NJ 07307',
      'Marion': '503 Pavonia Ave, Jersey City, NJ 07306',
      'Miller': '489 Bergen Ave, Jersey City, NJ 07304',
      'West Bergen': '1485 John F Kennedy Blvd, Jersey City, NJ 07305'
    }
  },

  'Monmouth County Library System': {
    mainAddress: '125 Symmes Dr, Manalapan, NJ 07726',
    branches: {
      'Headquarters': '125 Symmes Dr, Manalapan, NJ 07726',
      'Main Library': '125 Symmes Dr, Manalapan, NJ 07726',
      'Allentown': '16 S Main St, Allentown, NJ 08501',
      'Atlantic Highlands': '100 First Ave, Atlantic Highlands, NJ 07716',
      'Colts Neck': '1 Wiltshire Rd, Colts Neck, NJ 07722',
      'Eastern': '1001 Route 35, Shrewsbury, NJ 07702',
      'Hazlet': '251 Middle Rd, Hazlet, NJ 07730',
      'Holmdel': '4 Crawford Corner Rd, Holmdel, NJ 07733',
      'Howell': '318 Old Tavern Rd, Howell, NJ 07731',
      'Marlboro': '1 Library Ct, Marlboro, NJ 07746',
      'Ocean Township': '701 Deal Rd, Ocean, NJ 07712',
      'Oceanport': '1 Flynn Pl, Oceanport, NJ 07757',
      'Roosevelt': '16 School Ln, Roosevelt, NJ 08555',
      'Union Beach': '1000 Florence Ave, Union Beach, NJ 07735',
      'Wall Township': '2700 Allaire Rd, Wall Township, NJ 07719'
    }
  },

  // ============================================================================
  // NEW YORK LIBRARIES
  // ============================================================================

  'Albany Public Library': {
    mainAddress: '161 Washington Ave, Albany, NY 12210',
    branches: {
      'Main Library': '161 Washington Ave, Albany, NY 12210',
      'Albany': '161 Washington Ave, Albany, NY 12210',
      'Arbor Hill': '18 N First St, Albany, NY 12210',
      'Delaware': '331 Delaware Ave, Albany, NY 12209',
      'Howe': '105 Schuyler St, Albany, NY 12202',
      'Pine Hills': '517 Western Ave, Albany, NY 12203',
      'Washington Avenue': '161 Washington Ave, Albany, NY 12210'
    }
  },

  'Great Neck Library': {
    mainAddress: '159 Bayview Ave, Great Neck, NY 11023',
    branches: {
      'Main Library': '159 Bayview Ave, Great Neck, NY 11023',
      'Great Neck': '159 Bayview Ave, Great Neck, NY 11023',
      'Lakeville': '475 Great Neck Rd, Great Neck, NY 11021',
      'Parkville': '10 Campbell St, Great Neck, NY 11023',
      'Station': '26 Great Neck Rd, Great Neck, NY 11021'
    }
  },

  'Freeport Memorial Library': {
    mainAddress: '144 W Merrick Rd, Freeport, NY 11520',
    branches: {
      'Main Library': '144 W Merrick Rd, Freeport, NY 11520',
      'Freeport': '144 W Merrick Rd, Freeport, NY 11520'
    }
  },

  'Rockville Centre Public Library': {
    mainAddress: '221 N Village Ave, Rockville Centre, NY 11570',
    branches: {
      'Main Library': '221 N Village Ave, Rockville Centre, NY 11570',
      'Rockville Centre': '221 N Village Ave, Rockville Centre, NY 11570'
    }
  },

  'North Merrick Public Library': {
    mainAddress: '1691 Meadowbrook Rd, North Merrick, NY 11566',
    branches: {
      'Main Library': '1691 Meadowbrook Rd, North Merrick, NY 11566',
      'North Merrick': '1691 Meadowbrook Rd, North Merrick, NY 11566'
    }
  },

  'Wantagh Public Library': {
    mainAddress: '3285 Park Ave, Wantagh, NY 11793',
    branches: {
      'Main Library': '3285 Park Ave, Wantagh, NY 11793',
      'Wantagh': '3285 Park Ave, Wantagh, NY 11793'
    }
  },

  'Baldwin Public Library': {
    mainAddress: '2385 Grand Ave, Baldwin, NY 11510',
    branches: {
      'Main Library': '2385 Grand Ave, Baldwin, NY 11510',
      'Baldwin': '2385 Grand Ave, Baldwin, NY 11510'
    }
  },

  'North Bellmore Public Library': {
    mainAddress: '1551 Newbridge Rd, North Bellmore, NY 11710',
    branches: {
      'Main Library': '1551 Newbridge Rd, North Bellmore, NY 11710',
      'North Bellmore': '1551 Newbridge Rd, North Bellmore, NY 11710'
    }
  },

  'Levittown Public Library': {
    mainAddress: '1 Bluegrass Ln, Levittown, NY 11756',
    branches: {
      'Main Library': '1 Bluegrass Ln, Levittown, NY 11756',
      'Levittown': '1 Bluegrass Ln, Levittown, NY 11756'
    }
  },

  'Plainview-Old Bethpage Public Library': {
    mainAddress: '999 Old Country Rd, Plainview, NY 11803',
    branches: {
      'Main Library': '999 Old Country Rd, Plainview, NY 11803',
      'Plainview': '999 Old Country Rd, Plainview, NY 11803',
      'Old Bethpage': '999 Old Country Rd, Plainview, NY 11803'
    }
  },

  // ============================================================================
  // PENNSYLVANIA LIBRARIES
  // ============================================================================

  'Library System of Lancaster County': {
    mainAddress: '151 N Queen St, Lancaster, PA 17603',
    branches: {
      'Main Library': '151 N Queen St, Lancaster, PA 17603',
      'Lancaster': '151 N Queen St, Lancaster, PA 17603',
      'Columbia': '24 S 6th St, Columbia, PA 17512',
      'Elizabethtown': '10 S Market St, Elizabethtown, PA 17022',
      'Ephrata': '550 S Reading Rd, Ephrata, PA 17522',
      'Lititz': '651 Kissel Hill Rd, Lititz, PA 17543',
      'Manheim': '15 E High St, Manheim, PA 17545',
      'Millersville': '1 S George St, Millersville, PA 17551',
      'Moores Memorial': '319 E Main Ave, Myerstown, PA 17067',
      'Mountville': '120 College Ave, Mountville, PA 17554',
      'Quarryville': '357 Buck Rd, Quarryville, PA 17566',
      'Strasburg': '203 W Main St, Strasburg, PA 17579'
    }
  },

  'York County Libraries': {
    mainAddress: '159 E Market St, York, PA 17401',
    branches: {
      'Martin Library': '159 E Market St, York, PA 17401',
      'Main Library': '159 E Market St, York, PA 17401',
      'Collinsville Community': '2632 Delta Rd, Brogue, PA 17309',
      'Dillsburg Area': '17 S Baltimore St, Dillsburg, PA 17019',
      'Dover Area': '3700-26 Davidsburg Rd, Dover, PA 17315',
      'Guthrie Memorial': '101 Penn St, Hanover, PA 17331',
      'Kaltreider-Benfer': '147 S Charles St, Red Lion, PA 17356',
      'Kreutz Creek': '66 Walnut Springs Rd, Hellam, PA 17406',
      'Mason-Dixon': '250 Bailey Dr, Stewartstown, PA 17363',
      'Paul Smith': '80 Constitution Ave, Shrewsbury, PA 17361',
      'Yorkana': '31 Main St, Yorkana, PA 17402',
      'Village': '19 E Main St, Dallastown, PA 17313'
    }
  },

  'Free Library of Philadelphia': {
    mainAddress: '1901 Vine St, Philadelphia, PA 19103',
    branches: {
      'Parkway Central Library': '1901 Vine St, Philadelphia, PA 19103',
      'Main Library': '1901 Vine St, Philadelphia, PA 19103',
      'Andorra': '705 E Cathedral Rd, Philadelphia, PA 19128',
      'Blanche A. Nixon': '5800 Cobbs Creek Pkwy, Philadelphia, PA 19143',
      'Bushrod': '6304 Castor Ave, Philadelphia, PA 19149',
      'Cecil B. Moore': '2320 W Cecil B. Moore Ave, Philadelphia, PA 19121',
      'Charles Santore': '932 S 7th St, Philadelphia, PA 19147',
      'Chestnut Hill': '8711 Germantown Ave, Philadelphia, PA 19118',
      'Eastwick': '2851 Island Ave, Philadelphia, PA 19153',
      'Falls of Schuylkill': '3501 Midvale Ave, Philadelphia, PA 19129',
      'Fishtown Community': '1217 E Montgomery Ave, Philadelphia, PA 19125',
      'Fox Chase': '501 Rhawn St, Philadelphia, PA 19111',
      'Frankford': '4634 Frankford Ave, Philadelphia, PA 19124',
      'Greater Olney': '5501 N 5th St, Philadelphia, PA 19120',
      'Haverford Avenue': '5543 Haverford Ave, Philadelphia, PA 19139',
      'Independence': '18 S 7th St, Philadelphia, PA 19106',
      'Joseph E. Coleman Regional': '68 W Chelten Ave, Philadelphia, PA 19144',
      'Kensington': '104 W Dauphin St, Philadelphia, PA 19133',
      'Lillian Marrero': '601 W Lehigh Ave, Philadelphia, PA 19133',
      'Logan': '1333 Wagner Ave, Philadelphia, PA 19141',
      'Lovett Memorial': '6945 Germantown Ave, Philadelphia, PA 19119',
      'McPherson Square': '601 E Indiana Ave, Philadelphia, PA 19134',
      'Nicetown-Tioga': '3720 N Broad St, Philadelphia, PA 19140',
      'Northeast Regional': '2228 Cottman Ave, Philadelphia, PA 19149',
      'Oak Lane': '6614 N 12th St, Philadelphia, PA 19126',
      'Overbrook Park': '7422 Haverford Ave, Philadelphia, PA 19151',
      'Paschalville': '6942 Woodland Ave, Philadelphia, PA 19142',
      'Queen Memorial': '1201 S 23rd St, Philadelphia, PA 19146',
      'Ramonita G. de Rodriguez': '600 W Girard Ave, Philadelphia, PA 19123',
      'Richmond': '2987 Almond St, Philadelphia, PA 19134',
      'Roxborough': '6245 Ridge Ave, Philadelphia, PA 19128',
      'South Philadelphia': '1700 S Broad St, Philadelphia, PA 19145',
      'Tacony': '6742 Torresdale Ave, Philadelphia, PA 19135',
      'Thomas F. Donatucci Sr.': '1935 Shunk St, Philadelphia, PA 19145',
      'Torresdale': '3039 Holme Ave, Philadelphia, PA 19136',
      'Wadsworth Avenue': '1500 Wadsworth Ave, Philadelphia, PA 19150',
      'West Oak Lane': '2000 Washington Ln, Philadelphia, PA 19138',
      'Widener': '2808 W Lehigh Ave, Philadelphia, PA 19132',
      'Wynnefield': '5325 Overbrook Ave, Philadelphia, PA 19131',
      'Wyoming': '231 E Wyoming Ave, Philadelphia, PA 19120'
    }
  },

  'Chester County Library System': {
    mainAddress: '450 Exton Square Pkwy, Exton, PA 19341',
    branches: {
      'Chester County Library': '450 Exton Square Pkwy, Exton, PA 19341',
      'Main Library': '450 Exton Square Pkwy, Exton, PA 19341',
      'Exton': '450 Exton Square Pkwy, Exton, PA 19341',
      'Atglen': '413 Valley Ave, Atglen, PA 19310',
      'Avon Grove': '117 Rosehill Ave, West Grove, PA 19390',
      'Coatesville': '501 E Lincoln Hwy, Coatesville, PA 19320',
      'Downingtown': '122 Wallace Ave, Downingtown, PA 19335',
      'Easttown': '720 First Ave, Berwyn, PA 19312',
      'Henrietta Hankin': '215 Windgate Dr, Chester Springs, PA 19425',
      'Honey Brook': '687 Compass Rd, Honey Brook, PA 19344',
      'Kennett': '216 E State St, Kennett Square, PA 19348',
      'Malvern': '1 E First Ave, Malvern, PA 19355',
      'Oxford': '48 S 2nd St, Oxford, PA 19363',
      'Paoli': '18 Darby Rd, Paoli, PA 19301',
      'Parkesburg': '105 W First Ave, Parkesburg, PA 19365',
      'Phoenixville': '183 Second Ave, Phoenixville, PA 19460',
      'Spring City': '245 Broad St, Spring City, PA 19475',
      'Tredyffrin': '582 Upper Gulph Rd, Strafford, PA 19087',
      'West Chester': '415 N Church St, West Chester, PA 19380'
    }
  },

  'Delaware County Library System': {
    mainAddress: '340 N Middletown Rd, Media, PA 19063',
    branches: {
      'Administrative Office': '340 N Middletown Rd, Media, PA 19063',
      'Main Library': '340 N Middletown Rd, Media, PA 19063',
      'Aston': '3850 Concord Rd, Aston, PA 19014',
      'Brookhaven': '1 Cambridge Rd, Brookhaven, PA 19015',
      'Collingdale': '823 MacDade Blvd, Collingdale, PA 19023',
      'Darby': '1001 Main St, Darby, PA 19023',
      'Folcroft': '1520 Delmar Dr, Folcroft, PA 19032',
      'Glenolden': '409 W Glenn Rd, Glenolden, PA 19036',
      'Helen Kate Furness': '100 Barren Rd, Media, PA 19063',
      'Lansdowne': '55 S Lansdowne Ave, Lansdowne, PA 19050',
      'Marple': '2599 Sproul Rd, Broomall, PA 19008',
      'Media-Upper Providence': '1 E Front St, Media, PA 19063',
      'Newtown': '201 Bishop Hollow Rd, Newtown Square, PA 19073',
      'Prospect Park': '720 Maryland Ave, Prospect Park, PA 19076',
      'Radnor Memorial': '114 W Wayne Ave, Wayne, PA 19087',
      'Ridley Park': '107 E Ward St, Ridley Park, PA 19078',
      'Ridley Township': '100 E MacDade Blvd, Folsom, PA 19033',
      'Sharon Hill': '246 W Chester Pike, Sharon Hill, PA 19079',
      'Springfield': '70 Powell Rd, Springfield, PA 19064',
      'Swarthmore': '121 Park Ave, Swarthmore, PA 19081',
      'Tinicum': '629 N 2nd St, Essington, PA 19029',
      'Upper Darby Municipal': '501 Bywood Ave, Upper Darby, PA 19082',
      'Yeadon': '809 Longacre Blvd, Yeadon, PA 19050'
    }
  },

  'Osterhout Free Library': {
    mainAddress: '71 S Franklin St, Wilkes-Barre, PA 18701',
    branches: {
      'Main Library': '71 S Franklin St, Wilkes-Barre, PA 18701',
      'Wilkes-Barre': '71 S Franklin St, Wilkes-Barre, PA 18701',
      'Pittston Memorial': '47 Broad St, Pittston, PA 18640',
      'West Pittston': '200 Exeter Ave, West Pittston, PA 18643'
    }
  },

  'Westmoreland Library Network': {
    mainAddress: '144 S Main St, Greensburg, PA 15601',
    branches: {
      'Greensburg Hempfield Area': '144 S Main St, Greensburg, PA 15601',
      'Main Library': '144 S Main St, Greensburg, PA 15601',
      'Adams Memorial': '1112 Ligonier St, Latrobe, PA 15650',
      'Derry Area': '327 E Owens View Ave, Derry, PA 15627',
      'Irwin': '308 Main St, Irwin, PA 15642',
      'Jeannette': '500 Magee Ave, Jeannette, PA 15644',
      'Ligonier Valley': '120 W Main St, Ligonier, PA 15658',
      'Mount Pleasant': '120 S Church St, Mount Pleasant, PA 15666',
      'Murrysville Community': '4130 Sardis Rd, Murrysville, PA 15668',
      'New Kensington': '1001 7th St, New Kensington, PA 15068',
      'North Huntingdon Township': '731 Old Clairton Rd, Irwin, PA 15642',
      'People Library': '890 Barnes St, New Kensington, PA 15068',
      'Rostraver': '700 Plaza Dr, Belle Vernon, PA 15012',
      'Belle Vernon': '700 Plaza Dr, Belle Vernon, PA 15012',
      'Delmont': '75 School Rd, Delmont, PA 15626',
      'Delmont Public Library': '75 School Rd, Delmont, PA 15626',
      'Sewickley Township': '200 Miller Ave, Herminie, PA 15637',
      'Trafford Community': '416 Brinton Ave, Trafford, PA 15085',
      'Unity Township': '2713 Pleasant Unity Rd, Greensburg, PA 15601',
      'West Newton': '124 N Water St, West Newton, PA 15089',
      'White Oak': '1731 Lincoln Way, White Oak, PA 15131'
    }
  },

  // ============================================================================
  // GEORGIA LIBRARIES
  // ============================================================================

  'Cobb County Public Library System': {
    mainAddress: '266 Roswell St SE, Marietta, GA 30060',
    branches: {
      'Central Library': '266 Roswell St SE, Marietta, GA 30060',
      'Main Library': '266 Roswell St SE, Marietta, GA 30060',
      'Acworth': '4569 Dallas St, Acworth, GA 30101',
      'East Cobb': '4880 Lower Roswell Rd, Marietta, GA 30068',
      'East Marietta': '2051 Lower Roswell Rd, Marietta, GA 30068',
      'Gritters': '880 Shaw Park Rd, Marietta, GA 30066',
      'Kennesaw': '2250 Lewis St NW, Kennesaw, GA 30144',
      'Lewis A. Ray': '4500 Oakdale Rd, Smyrna, GA 30080',
      'Merchant Walk': '1905 Towne Center Blvd NE, Kennesaw, GA 30144',
      'Mountain View Regional': '3320 Sandy Plains Rd, Marietta, GA 30066',
      'Powder Springs': '4181 Atlanta St, Powder Springs, GA 30127',
      'South Cobb Regional': '805 Clay Rd, Mableton, GA 30126',
      'Sibley': '1539 S Cobb Dr SE, Marietta, GA 30060',
      'Stratton': '1100 Powder Springs St, Marietta, GA 30064',
      'Sweetwater Valley': '5000 Austell-Powder Springs Rd, Austell, GA 30106',
      'West Cobb Regional': '1750 Dennis Kemp Ln NE, Kennesaw, GA 30152'
    }
  },

  'Live Oak Public Libraries': {
    mainAddress: '2002 Bull St, Savannah, GA 31401',
    branches: {
      'Bull Street Library': '2002 Bull St, Savannah, GA 31401',
      'Main Library': '2002 Bull St, Savannah, GA 31401',
      'Carnegie': '537 E Henry St, Savannah, GA 31401',
      'Chatham County': '2002 Bull St, Savannah, GA 31401',
      'Forest City': '7116 Hodgson Memorial Dr, Savannah, GA 31406',
      'Garden City': '115 Gov Thomas P Hinman Dr, Garden City, GA 31408',
      'Georgetown': '400 Kelly Hill Rd, Savannah, GA 31419',
      'Islands': '50 Johnny Mercer Blvd, Savannah, GA 31410',
      'Oglethorpe Mall': '7804 Abercorn St, Savannah, GA 31406',
      'Pooler': '216 S Rogers St, Pooler, GA 31322',
      'Port City': '125 E Broad St, Savannah, GA 31401',
      'Southwest Chatham': '14097 Abercorn St, Savannah, GA 31419',
      'Thunderbolt': '2708 Mechanics Ave, Thunderbolt, GA 31404',
      'Tybee Island': '403 Butler Ave, Tybee Island, GA 31328',
      'West Broad Street': '1110 May St, Savannah, GA 31415'
    }
  },

  // ============================================================================
  // WEST VIRGINIA LIBRARIES
  // ============================================================================

  'Kanawha County Public Library': {
    mainAddress: '123 Capitol St, Charleston, WV 25301',
    branches: {
      'Main Library': '123 Capitol St, Charleston, WV 25301',
      'Charleston': '123 Capitol St, Charleston, WV 25301',
      'Cross Lanes': '5765 Big Tyler Rd, Cross Lanes, WV 25313',
      'Cross Lanes Branch': '5765 Big Tyler Rd, Cross Lanes, WV 25313',
      'Cross Lanes Branch Library': '5765 Big Tyler Rd, Cross Lanes, WV 25313',
      'Dunbar': '1000 McJunkin Rd, Dunbar, WV 25064',
      'Dunbar Branch': '1000 McJunkin Rd, Dunbar, WV 25064',
      'Dunbar Branch Library': '1000 McJunkin Rd, Dunbar, WV 25064',
      'Elk Valley': '1 Elk Valley Rd, Charleston, WV 25311',
      'Elk Valley Branch': '1 Elk Valley Rd, Charleston, WV 25311',
      'Elk Valley Branch Library': '1 Elk Valley Rd, Charleston, WV 25311',
      'Glasgow': '8 Madison St, Glasgow, WV 25086',
      'Marmet': '4300 1st Ave, Marmet, WV 25315',
      'Riverside': '5614 MacCorkle Ave SE, Charleston, WV 25304',
      'St Albans': '602 4th St, St Albans, WV 25177',
      'St Albans Branch': '602 4th St, St Albans, WV 25177',
      'St Albans Branch Library': '602 4th St, St Albans, WV 25177',
      'Clendenin': '101 Maywood Ave E, Clendenin, WV 25045',
      'Clendenin Branch': '101 Maywood Ave E, Clendenin, WV 25045',
      'Clendenin Branch Library': '101 Maywood Ave E, Clendenin, WV 25045',
      'Sissonville': '5501 Sissonville Dr, Charleston, WV 25312'
    }
  },

  'West Virginia Library Commission': {
    mainAddress: '1900 Kanawha Blvd E, Charleston, WV 25305',
    branches: {
      'Main Library': '1900 Kanawha Blvd E, Charleston, WV 25305',
      'Charleston': '1900 Kanawha Blvd E, Charleston, WV 25305'
    }
  },

  // ============================================================================
  // FLORIDA LIBRARIES
  // ============================================================================

  'Lee County Library System': {
    mainAddress: '2450 First St, Fort Myers, FL 33901',
    branches: {
      'Fort Myers Regional Library': '2450 First St, Fort Myers, FL 33901',
      'Main Library': '2450 First St, Fort Myers, FL 33901',
      'Bonita Springs': '26876 Pine Ave, Bonita Springs, FL 34135',
      'Cape Coral-Lee County': '921 SW 39th Terrace, Cape Coral, FL 33914',
      'Captiva': '11560 Chapin Ln, Captiva, FL 33924',
      'Dunbar Jupiter Hammon': '3095 Blount St, Fort Myers, FL 33916',
      'East County Regional': '881 Gunnery Rd, Lehigh Acres, FL 33971',
      'Fort Myers Beach': '2755 Estero Blvd, Fort Myers Beach, FL 33931',
      'Fort Myers Regional': '2450 First St, Fort Myers, FL 33901',
      'Lakes Regional': '15290 Bass Rd, Fort Myers, FL 33919',
      'North Fort Myers': '2001 N Tamiami Trail, North Fort Myers, FL 33903',
      'Northwest Regional': '519 Chiquita Blvd N, Cape Coral, FL 33993',
      'Pine Island': '10701 Russell Rd, Bokeelia, FL 33922',
      'Riverdale': '2421 Buckingham Rd, Fort Myers, FL 33905',
      'Sanibel': '770 Dunlop Rd, Sanibel, FL 33957',
      'South County Regional': '21100 Three Oaks Pkwy, Estero, FL 33928',
      'Springs at Gulf Coast': '22401 Fountain Lakes Blvd, Estero, FL 33928'
    }
  },

  'Sarasota County Libraries': {
    mainAddress: '1331 First St, Sarasota, FL 34236',
    branches: {
      'Selby Public Library': '1331 First St, Sarasota, FL 34236',
      'Main Library': '1331 First St, Sarasota, FL 34236',
      'Elsie Quirk': '100 W Dearborn St, Englewood, FL 34223',
      'Fruitville': '100 Coburn Rd, Sarasota, FL 34240',
      'Gulf Gate': '7112 Curtiss Ave, Sarasota, FL 34231',
      'Jacaranda': '4143 Woodmere Park Blvd, Venice, FL 34293',
      'North Port': '13800 Tamiami Trail, North Port, FL 34287',
      'Osprey': '337 N Tamiami Trail, Osprey, FL 34229',
      'William H. Jervey Jr. Venice': '300 S Nokomis Ave, Venice, FL 34285'
    }
  },

  // ============================================================================
  // TEXAS LIBRARIES
  // ============================================================================

  'Dallas Public Library': {
    mainAddress: '1515 Young St, Dallas, TX 75201',
    branches: {
      'J. Erik Jonsson Central Library': '1515 Young St, Dallas, TX 75201',
      'Main Library': '1515 Young St, Dallas, TX 75201',
      'Arcadia Park': '1302 N Justin Ave, Dallas, TX 75211',
      'Audelia Road': '10045 Audelia Rd, Dallas, TX 75238',
      'Bachman Lake': '9480 Webb Chapel Rd, Dallas, TX 75220',
      'Casa View': '10355 Ferguson Rd, Dallas, TX 75228',
      'Dallas West': '2332 Singleton Blvd, Dallas, TX 75212',
      'Forest Green': '9015 Forest Ln, Dallas, TX 75243',
      'Fretz Park': '6990 Belt Line Rd, Dallas, TX 75254',
      'Grauwyler Park': '2146 Gilford St, Dallas, TX 75235',
      'Hampton-Illinois': '2210 W Illinois Ave, Dallas, TX 75224',
      'Highland Hills': '3624 Simpson Stuart Rd, Dallas, TX 75241',
      'Kleberg-Rylie': '1515 Houston School Rd, Dallas, TX 75217',
      'Lake Highlands North': '9940 Whitehurst Dr, Dallas, TX 75243',
      'Lakewood': '6121 Worth St, Dallas, TX 75214',
      'Lancaster-Kiest': '3039 S Lancaster Rd, Dallas, TX 75216',
      'Lochwood': '11221 Lochwood Blvd, Dallas, TX 75218',
      'Martin Luther King Jr.': '2922 Martin Luther King Jr Blvd, Dallas, TX 75215',
      'Mountain Creek': '6102 Mountain Creek Pkwy, Dallas, TX 75249',
      'North Oak Cliff': '302 W 10th St, Dallas, TX 75208',
      'Oak Lawn': '4100 Cedar Springs Rd, Dallas, TX 75219',
      'Park Forest': '3700 Cedar Crest Blvd, Dallas, TX 75203',
      'Parkway Central': '8585 Manderville Ln, Dallas, TX 75231',
      'Pleasant Grove': '1125 S Buckner Blvd, Dallas, TX 75217',
      'Prairie Creek': '9693 Audelia Rd, Dallas, TX 75238',
      'Preston Royal': '5626 Royal Ln, Dallas, TX 75229',
      'Renner Frankford': '6400 Frankford Rd, Dallas, TX 75252',
      'Skyline': '6006 Everglade Rd, Dallas, TX 75227',
      'Timberglen': '18505 Midway Rd, Dallas, TX 75287',
      'Urban Central': '1515 Young St, Dallas, TX 75201',
      'White Rock Hills': '9125 Garland Rd, Dallas, TX 75218'
    }
  },

  'Arlington Public Library': {
    mainAddress: '100 S Center St, Arlington, TX 76010',
    branches: {
      'Downtown Library': '100 S Center St, Arlington, TX 76010',
      'Main Library': '100 S Center St, Arlington, TX 76010',
      'East': '1624 New York Ave, Arlington, TX 76010',
      'Lake Arlington': '4000 W Green Oaks Blvd, Arlington, TX 76016',
      'Southeast': '900 SE Green Oaks Blvd, Arlington, TX 76018',
      'Woodland West': '2837 W Park Row Dr, Arlington, TX 76013'
    }
  },

  // ============================================================================
  // IOWA LIBRARIES
  // ============================================================================

  'Des Moines Public Library': {
    mainAddress: '1000 Grand Ave, Des Moines, IA 50309',
    branches: {
      'Central Library': '1000 Grand Ave, Des Moines, IA 50309',
      'Main Library': '1000 Grand Ave, Des Moines, IA 50309',
      'East Side': '2559 Hubbell Ave, Des Moines, IA 50317',
      'Forest Avenue': '1326 Forest Ave, Des Moines, IA 50314',
      'Franklin Avenue': '5000 Franklin Ave, Des Moines, IA 50310',
      'North Side': '3516 5th Ave, Des Moines, IA 50313',
      'South Side': '1111 Porter Ave, Des Moines, IA 50315'
    }
  },

  // ============================================================================
  // RHODE ISLAND LIBRARIES
  // ============================================================================

  'Warwick Public Library': {
    mainAddress: '600 Sandy Ln, Warwick, RI 02889',
    branches: {
      'Central Library': '600 Sandy Ln, Warwick, RI 02889',
      'Main Library': '600 Sandy Ln, Warwick, RI 02889',
      'Apponaug': '3071 Post Rd, Warwick, RI 02886',
      'Conimicut': '5 Raleigh Ave, Warwick, RI 02889',
      'Greenwood': '4099 Post Rd, Warwick, RI 02818',
      'Hoxsie': '22 Sandy Bottom Rd, Warwick, RI 02889',
      'Lakewood': '600 Sandy Ln, Warwick, RI 02889',
      'Norwood': '2020 Warwick Ave, Warwick, RI 02889',
      'Oakland Beach': '10 Wyman St, Warwick, RI 02889',
      'Warwick Neck': '579 Warwick Neck Ave, Warwick, RI 02889'
    }
  },

  'West Warwick Public Library': {
    mainAddress: '1043 Main St, West Warwick, RI 02893',
    branches: {
      'Main Library': '1043 Main St, West Warwick, RI 02893',
      'West Warwick': '1043 Main St, West Warwick, RI 02893'
    }
  }
};

/**
 * Get library address by library name and optionally source name
 * @param {string} libraryName - Full or partial library name (venue)
 * @param {string} sourceName - Optional source/library system name
 * @returns {string|null} - Address or null if not found
 */
function getLibraryAddress(libraryName, sourceName = null, eventState = null) {
  if (!libraryName && !sourceName) return null;

  // Helper: check if a matched address is in the correct state
  // Prevents cross-state false positives (e.g., "Downtown" in VA matching Cedar Rapids, IA)
  const isAddressInState = (address) => {
    if (!eventState || !address) return true; // No state to check — allow match
    // Extract state abbreviation from address like "450 5th Ave SE, Cedar Rapids, IA 52401"
    const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
    if (!stateMatch) return true; // Can't determine state — allow match
    return stateMatch[1] === eventState.toUpperCase();
  };

  // Strip room/location designations from venue names
  // e.g., "APL Martin Luther King, Jr. Library - MLK Full Community Room (Akron & Boston)"
  //    -> "APL Martin Luther King, Jr. Library"
  const stripRoomName = (name) => {
    if (!name) return '';
    let cleaned = name;
    // Remove anything after " - " that looks like a room name
    // Common patterns: "Room", "Community Room", "Meeting Room", "Conference Room", "Study Room",
    // "Program Room", "Children's", "Teen", "Makerspace", "Lab", "Studio", "Space", "Area", "Floor"
    const roomPattern = / - [\w\s']*(room|community|meeting|conference|study|program|children|teen|makerspace|lab|studio|space|area|floor|auditorium|gallery|café|cafe|parking|outdoor)/i;
    if (roomPattern.test(cleaned)) {
      cleaned = cleaned.split(' - ')[0];
    }
    // Remove parenthetical content like "(Akron & Boston)" or "(Capacity : 20)"
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/, '');
    return cleaned.trim();
  };

  const originalName = (libraryName || '').trim();
  const strippedName = stripRoomName(originalName);
  const lowerName = originalName.toLowerCase();
  const lowerStripped = strippedName.toLowerCase();
  const lowerSource = (sourceName || '').toLowerCase().trim();

  // First, try to match the source name to a library system
  let matchedSystem = null;
  let matchedSystemName = null;

  for (const [systemName, system] of Object.entries(LIBRARY_ADDRESSES)) {
    const sysLower = systemName.toLowerCase();
    // Check if source matches library system name
    if (lowerSource && (lowerSource.includes(sysLower) || sysLower.includes(lowerSource))) {
      matchedSystem = system;
      matchedSystemName = systemName;
      break;
    }
  }

  // If we found a matching system, look for the branch
  if (matchedSystem) {
    // If venue name is the same as or very similar to the system name,
    // we don't know which branch - only return address if there's a specific branch match
    const matchedSysLower = matchedSystemName.toLowerCase();
    const isGenericVenue = lowerName === matchedSysLower ||
                           lowerStripped === matchedSysLower ||
                           lowerName === lowerSource ||
                           lowerName.replace(/\s+(public\s+)?library$/i, '') === matchedSysLower.replace(/\s+(public\s+)?library$/i, '');

    // Try to find specific branch by venue name (try both original and stripped)
    for (const [branchName, branchAddress] of Object.entries(matchedSystem.branches)) {
      const branchLower = branchName.toLowerCase();
      // Check for specific branch match (not just "Library" in the name)
      if (branchLower !== 'main' && branchLower.length > 3) {
        // Try original name
        if (lowerName.includes(branchLower) || branchLower.includes(lowerName)) {
          if (isAddressInState(branchAddress)) return branchAddress;
        }
        // Try stripped name (without room designation)
        if (lowerStripped !== lowerName && (lowerStripped.includes(branchLower) || branchLower.includes(lowerStripped))) {
          if (isAddressInState(branchAddress)) return branchAddress;
        }
      }
    }

    // Only return main address if venue is NOT generic (i.e., specifies something different)
    if (!isGenericVenue) {
      if (isAddressInState(matchedSystem.mainAddress)) return matchedSystem.mainAddress;
    }

    // For generic venue names that match the system, don't return address
    // (we don't know which branch)
    return null;
  }

  // Try direct venue name match against all systems
  // Try both original name and stripped name (without room designation)
  const namesToTry = lowerStripped !== lowerName ? [lowerName, lowerStripped] : [lowerName];

  for (const nameToMatch of namesToTry) {
    for (const [systemName, system] of Object.entries(LIBRARY_ADDRESSES)) {
      const sysLower = systemName.toLowerCase();

      // Skip if venue name exactly matches system name (we don't know which branch)
      if (nameToMatch === sysLower) {
        continue;
      }

      // Check if venue name contains system name but also has branch info
      if (nameToMatch.includes(sysLower) || sysLower.includes(nameToMatch)) {
        // Try to find specific branch
        for (const [branchName, branchAddress] of Object.entries(system.branches)) {
          if (nameToMatch.includes(branchName.toLowerCase()) && branchName.toLowerCase() !== 'main') {
            if (isAddressInState(branchAddress)) return branchAddress;
          }
        }
      }

      // Check branches directly
      for (const [branchName, branchAddress] of Object.entries(system.branches)) {
        const branchLower = branchName.toLowerCase();
        if (branchLower !== 'main' && branchLower.length > 3) {
          if (nameToMatch === branchLower ||
              nameToMatch.includes(branchLower + ' library') ||
              (branchLower + ' library') === nameToMatch ||
              branchLower.includes(nameToMatch) ||
              nameToMatch.includes(branchLower)) {
            if (isAddressInState(branchAddress)) return branchAddress;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Get branch address from a library system
 * More flexible matching that handles abbreviations and partial names
 *
 * @param {string} systemName - Library system name (e.g., "Rockbridge Regional Library")
 * @param {string} branchName - Branch name (e.g., "Lexington", "LEX", "Buena Vista Branch")
 * @param {string} state - Optional state code for disambiguation
 * @returns {object|null} - { address, city, zipCode, state } or null
 */
function getBranchAddress(systemName, branchName, state = null) {
  if (!systemName) return null;

  const lowerSystem = systemName.toLowerCase().trim();
  const lowerBranch = (branchName || '').toLowerCase().trim();
  const lowerState = (state || '').toUpperCase().trim();

  // Find the matching library system
  let matchedSystem = null;
  let matchedSystemName = null;
  let candidates = [];

  for (const [name, system] of Object.entries(LIBRARY_ADDRESSES)) {
    const nameLower = name.toLowerCase();
    // Exact match or contains match
    if (nameLower === lowerSystem ||
        lowerSystem.includes(nameLower.replace(/\s*(va|nj|md|pa|nc|sc)$/i, '').trim()) ||
        nameLower.includes(lowerSystem.replace(/\s*(public\s+)?library\s*(system)?$/i, ''))) {
      candidates.push({ name, system });
    }
  }

  // If multiple candidates, try to disambiguate by state
  if (candidates.length > 1 && lowerState) {
    // First, try exact state match in library name (e.g., "Gloucester County Library System VA")
    const stateMatched = candidates.find(c =>
      c.name.toUpperCase().endsWith(lowerState) ||
      c.name.toUpperCase().includes(`(${lowerState})`)
    );
    if (stateMatched) {
      matchedSystem = stateMatched.system;
      matchedSystemName = stateMatched.name;
    } else {
      // Otherwise try to match by address state
      const addressMatched = candidates.find(c => {
        const addr = c.system.mainAddress || '';
        return addr.includes(`, ${lowerState} `);
      });
      if (addressMatched) {
        matchedSystem = addressMatched.system;
        matchedSystemName = addressMatched.name;
      }
    }
  }

  // If no disambiguation needed or failed, use first match
  if (!matchedSystem && candidates.length > 0) {
    matchedSystem = candidates[0].system;
    matchedSystemName = candidates[0].name;
  }

  if (!matchedSystem) return null;

  // Parse address into components
  const parseAddress = (fullAddress) => {
    if (!fullAddress) return null;
    // Expected format: "123 Main St, City, ST 12345"
    const match = fullAddress.match(/^(.+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})$/);
    if (match) {
      return {
        address: match[1].trim(),
        city: match[2].trim(),
        state: match[3],
        zipCode: match[4]
      };
    }
    // Fallback - return the whole thing as address
    return { address: fullAddress, city: '', state: state || '', zipCode: '' };
  };

  // If no branch specified, return main address
  if (!lowerBranch || lowerBranch === 'main') {
    return parseAddress(matchedSystem.mainAddress);
  }

  // Common abbreviation mappings for library branches
  const branchAbbreviations = {
    'lex': 'lexington',
    'bat': 'bath county',
    'bv': 'buena vista',
    'gos': 'goshen',
    'gla': 'glasgow',
    'bkm': 'bookmobile',
    'cen': 'central',
    'main': 'main library',
    'hq': 'headquarters'
  };

  // Expand abbreviation if present
  const expandedBranch = branchAbbreviations[lowerBranch] || lowerBranch;

  // Helper to strip common suffixes for normalized comparison
  const stripSuffixes = (name) => {
    return name
      .replace(/\s*(branch\s+library|public\s+library|branch|library)$/i, '')
      .trim();
  };

  // Normalized versions without suffixes
  const normalizedInput = stripSuffixes(expandedBranch);

  // Try to find matching branch
  for (const [branchKey, branchAddr] of Object.entries(matchedSystem.branches)) {
    const branchKeyLower = branchKey.toLowerCase();
    const normalizedKey = stripSuffixes(branchKeyLower);

    // Direct match or normalized match
    if (branchKeyLower === expandedBranch ||
        branchKeyLower === lowerBranch ||
        normalizedKey === normalizedInput ||
        branchKeyLower.includes(expandedBranch) ||
        expandedBranch.includes(normalizedKey)) {
      return parseAddress(branchAddr);
    }

    // Check if branch name contains our search term
    if (lowerBranch.length >= 3 &&
        (branchKeyLower.includes(lowerBranch) ||
         lowerBranch.includes(branchKeyLower.split(' ')[0]) ||
         normalizedKey.includes(normalizedInput) ||
         normalizedInput.includes(normalizedKey))) {
      return parseAddress(branchAddr);
    }
  }

  // No branch match found - return main address as fallback
  return parseAddress(matchedSystem.mainAddress);
}

/**
 * Get all branches for a library system
 * @param {string} systemName - Library system name
 * @returns {object|null} - { mainAddress, branches: { name: address, ... } } or null
 */
function getLibrarySystemBranches(systemName) {
  if (!systemName) return null;

  const lowerSystem = systemName.toLowerCase().trim();

  for (const [name, system] of Object.entries(LIBRARY_ADDRESSES)) {
    const nameLower = name.toLowerCase();
    if (nameLower === lowerSystem ||
        lowerSystem.includes(nameLower) ||
        nameLower.includes(lowerSystem.replace(/\s*(public\s+)?library\s*(system)?$/i, ''))) {
      return {
        name: name,
        mainAddress: system.mainAddress,
        branches: system.branches
      };
    }
  }

  return null;
}

module.exports = {
  LIBRARY_ADDRESSES,
  getLibraryAddress,
  getBranchAddress,
  getLibrarySystemBranches
};
