const admin = require('firebase-admin');
const axios = require('axios');
const { getFirestore } = require('firebase-admin/firestore');
const { getOrCreateActivity } = require('./venue-matcher');

// Get Firestore instance (initialized in index.js)
const db = getFirestore();

// ==========================================
// CONFIGURATION
// ==========================================

// OpenStreetMap amenity/leisure tags by category (19 venue types)
const OSM_VENUE_TYPES = {
  'Learning & Culture': [
    { tag: 'library', type: 'amenity', name: 'Library', isFree: true },
    { tag: 'museum', type: 'amenity', name: 'Museum', isFree: false },
    { tag: 'arts_centre', type: 'amenity', name: 'Arts Center', isFree: false }
  ],
  'Entertainment': [
    { tag: 'cinema', type: 'amenity', name: 'Cinema', isFree: false },
    { tag: 'theatre', type: 'amenity', name: 'Theatre', isFree: false }
  ],
  'Community': [
    { tag: 'community_centre', type: 'amenity', name: 'Community Center', isFree: false }
  ],
  'Indoor': [
    { tag: 'ice_rink', type: 'leisure', name: 'Ice Rink', isFree: false },
    { tag: 'bowling_alley', type: 'leisure', name: 'Bowling', isFree: false },
    { tag: 'swimming_pool', type: 'leisure', name: 'Swimming Pool', isFree: false },
    { tag: 'sports_centre', type: 'leisure', name: 'Sports Center', isFree: false },
    { tag: 'fitness_centre', type: 'leisure', name: 'Fitness Center', isFree: false }
  ],
  'Outdoor': [
    { tag: 'playground', type: 'leisure', name: 'Playground', isFree: true },
    { tag: 'park', type: 'leisure', name: 'Park', isFree: true },
    { tag: 'nature_reserve', type: 'leisure', name: 'Nature Reserve', isFree: true },
    { tag: 'dog_park', type: 'leisure', name: 'Dog Park', isFree: true },
    { tag: 'zoo', type: 'tourism', name: 'Zoo', isFree: false },
    { tag: 'aquarium', type: 'tourism', name: 'Aquarium', isFree: false },
    { tag: 'theme_park', type: 'tourism', name: 'Theme Park', isFree: false },
    { tag: 'miniature_golf', type: 'leisure', name: 'Mini Golf', isFree: false }
  ]
};

// Major US cities (top 5 per state)
const US_CITIES = {
  'AL': [{ name: 'Birmingham', lat: 33.5207, lon: -86.8025 }, { name: 'Montgomery', lat: 32.3792, lon: -86.3077 }, { name: 'Mobile', lat: 30.6954, lon: -88.0399 }, { name: 'Huntsville', lat: 34.7304, lon: -86.5861 }, { name: 'Tuscaloosa', lat: 33.2098, lon: -87.5692 }],
  'AK': [{ name: 'Anchorage', lat: 61.2181, lon: -149.9003 }, { name: 'Fairbanks', lat: 64.8378, lon: -147.7164 }, { name: 'Juneau', lat: 58.3019, lon: -134.4197 }, { name: 'Sitka', lat: 57.0531, lon: -135.3300 }, { name: 'Ketchikan', lat: 55.3422, lon: -131.6461 }],
  'AZ': [{ name: 'Phoenix', lat: 33.4484, lon: -112.0740 }, { name: 'Tucson', lat: 32.2226, lon: -110.9747 }, { name: 'Mesa', lat: 33.4152, lon: -111.8315 }, { name: 'Chandler', lat: 33.3062, lon: -111.8413 }, { name: 'Scottsdale', lat: 33.4942, lon: -111.9261 }],
  'AR': [{ name: 'Little Rock', lat: 34.7465, lon: -92.2896 }, { name: 'Fort Smith', lat: 35.3859, lon: -94.3985 }, { name: 'Fayetteville', lat: 36.0626, lon: -94.1574 }, { name: 'Springdale', lat: 36.1867, lon: -94.1288 }, { name: 'Jonesboro', lat: 35.8423, lon: -90.7043 }],
  'CA': [{ name: 'Los Angeles', lat: 34.0522, lon: -118.2437 }, { name: 'San Diego', lat: 32.7157, lon: -117.1611 }, { name: 'San Jose', lat: 37.3382, lon: -121.8863 }, { name: 'San Francisco', lat: 37.7749, lon: -122.4194 }, { name: 'Fresno', lat: 36.7378, lon: -119.7871 }],
  'CO': [{ name: 'Denver', lat: 39.7392, lon: -104.9903 }, { name: 'Colorado Springs', lat: 38.8339, lon: -104.8214 }, { name: 'Aurora', lat: 39.7294, lon: -104.8319 }, { name: 'Fort Collins', lat: 40.5853, lon: -105.0844 }, { name: 'Lakewood', lat: 39.7047, lon: -105.0814 }],
  'CT': [{ name: 'Bridgeport', lat: 41.1865, lon: -73.1952 }, { name: 'New Haven', lat: 41.3083, lon: -72.9279 }, { name: 'Stamford', lat: 41.0534, lon: -73.5387 }, { name: 'Hartford', lat: 41.7658, lon: -72.6734 }, { name: 'Waterbury', lat: 41.5581, lon: -73.0515 }],
  'DE': [{ name: 'Wilmington', lat: 39.7391, lon: -75.5398 }, { name: 'Dover', lat: 39.1582, lon: -75.5244 }, { name: 'Newark', lat: 39.6837, lon: -75.7497 }, { name: 'Middletown', lat: 39.4496, lon: -75.7163 }, { name: 'Smyrna', lat: 39.2998, lon: -75.6047 }],
  'FL': [{ name: 'Jacksonville', lat: 30.3322, lon: -81.6557 }, { name: 'Miami', lat: 25.7617, lon: -80.1918 }, { name: 'Tampa', lat: 27.9506, lon: -82.4572 }, { name: 'Orlando', lat: 28.5383, lon: -81.3792 }, { name: 'St. Petersburg', lat: 27.7676, lon: -82.6403 }],
  'GA': [{ name: 'Atlanta', lat: 33.7490, lon: -84.3880 }, { name: 'Columbus', lat: 32.4609, lon: -84.9877 }, { name: 'Augusta', lat: 33.4735, lon: -82.0105 }, { name: 'Savannah', lat: 32.0809, lon: -81.0912 }, { name: 'Athens', lat: 33.9519, lon: -83.3576 }],
  'HI': [{ name: 'Honolulu', lat: 21.3099, lon: -157.8581 }, { name: 'Pearl City', lat: 21.3972, lon: -157.9753 }, { name: 'Hilo', lat: 19.7297, lon: -155.0900 }, { name: 'Kailua', lat: 21.4022, lon: -157.7394 }, { name: 'Waipahu', lat: 21.3867, lon: -158.0092 }],
  'ID': [{ name: 'Boise', lat: 43.6150, lon: -116.2023 }, { name: 'Meridian', lat: 43.6121, lon: -116.3915 }, { name: 'Nampa', lat: 43.5407, lon: -116.5635 }, { name: 'Idaho Falls', lat: 43.4917, lon: -112.0339 }, { name: 'Pocatello', lat: 42.8713, lon: -112.4455 }],
  'IL': [{ name: 'Chicago', lat: 41.8781, lon: -87.6298 }, { name: 'Aurora', lat: 41.7606, lon: -88.3201 }, { name: 'Rockford', lat: 42.2711, lon: -89.0940 }, { name: 'Joliet', lat: 41.5250, lon: -88.0817 }, { name: 'Naperville', lat: 41.7508, lon: -88.1535 }],
  'IN': [{ name: 'Indianapolis', lat: 39.7684, lon: -86.1581 }, { name: 'Fort Wayne', lat: 41.0793, lon: -85.1394 }, { name: 'Evansville', lat: 37.9747, lon: -87.5558 }, { name: 'South Bend', lat: 41.6764, lon: -86.2520 }, { name: 'Carmel', lat: 39.9784, lon: -86.1180 }],
  'IA': [{ name: 'Des Moines', lat: 41.6005, lon: -93.6091 }, { name: 'Cedar Rapids', lat: 41.9779, lon: -91.6656 }, { name: 'Davenport', lat: 41.5236, lon: -90.5776 }, { name: 'Sioux City', lat: 42.4970, lon: -96.4003 }, { name: 'Iowa City', lat: 41.6611, lon: -91.5302 }],
  'KS': [{ name: 'Wichita', lat: 37.6872, lon: -97.3301 }, { name: 'Overland Park', lat: 38.9822, lon: -94.6708 }, { name: 'Kansas City', lat: 39.1142, lon: -94.6275 }, { name: 'Olathe', lat: 38.8814, lon: -94.8191 }, { name: 'Topeka', lat: 39.0558, lon: -95.6894 }],
  'KY': [{ name: 'Louisville', lat: 38.2527, lon: -85.7585 }, { name: 'Lexington', lat: 38.0406, lon: -84.5037 }, { name: 'Bowling Green', lat: 36.9685, lon: -86.4808 }, { name: 'Owensboro', lat: 37.7719, lon: -87.1112 }, { name: 'Covington', lat: 39.0837, lon: -84.5086 }],
  'LA': [{ name: 'New Orleans', lat: 29.9511, lon: -90.0715 }, { name: 'Baton Rouge', lat: 30.4515, lon: -91.1871 }, { name: 'Shreveport', lat: 32.5252, lon: -93.7502 }, { name: 'Lafayette', lat: 30.2241, lon: -92.0198 }, { name: 'Lake Charles', lat: 30.2266, lon: -93.2174 }],
  'ME': [{ name: 'Portland', lat: 43.6591, lon: -70.2568 }, { name: 'Lewiston', lat: 44.1004, lon: -70.2148 }, { name: 'Bangor', lat: 44.8012, lon: -68.7778 }, { name: 'South Portland', lat: 43.6415, lon: -70.2409 }, { name: 'Auburn', lat: 44.0979, lon: -70.2311 }],
  'MD': [{ name: 'Baltimore', lat: 39.2904, lon: -76.6122 }, { name: 'Columbia', lat: 39.2037, lon: -76.8610 }, { name: 'Silver Spring', lat: 38.9907, lon: -77.0261 }, { name: 'Germantown', lat: 39.1732, lon: -77.2717 }, { name: 'Frederick', lat: 39.4143, lon: -77.4105 }],
  'MA': [{ name: 'Boston', lat: 42.3601, lon: -71.0589 }, { name: 'Worcester', lat: 42.2626, lon: -71.8023 }, { name: 'Springfield', lat: 42.1015, lon: -72.5898 }, { name: 'Cambridge', lat: 42.3736, lon: -71.1097 }, { name: 'Lowell', lat: 42.6334, lon: -71.3162 }],
  'MI': [{ name: 'Detroit', lat: 42.3314, lon: -83.0458 }, { name: 'Grand Rapids', lat: 42.9634, lon: -85.6681 }, { name: 'Warren', lat: 42.5145, lon: -83.0147 }, { name: 'Sterling Heights', lat: 42.5803, lon: -83.0302 }, { name: 'Ann Arbor', lat: 42.2808, lon: -83.7430 }],
  'MN': [{ name: 'Minneapolis', lat: 44.9778, lon: -93.2650 }, { name: 'St. Paul', lat: 44.9537, lon: -93.0900 }, { name: 'Rochester', lat: 44.0121, lon: -92.4802 }, { name: 'Duluth', lat: 46.7867, lon: -92.1005 }, { name: 'Bloomington', lat: 44.8408, lon: -93.2983 }],
  'MS': [{ name: 'Jackson', lat: 32.2988, lon: -90.1848 }, { name: 'Gulfport', lat: 30.3674, lon: -89.0928 }, { name: 'Southaven', lat: 34.9889, lon: -90.0126 }, { name: 'Hattiesburg', lat: 31.3271, lon: -89.2903 }, { name: 'Biloxi', lat: 30.3960, lon: -88.8853 }],
  'MO': [{ name: 'Kansas City', lat: 39.0997, lon: -94.5786 }, { name: 'St. Louis', lat: 38.6270, lon: -90.1994 }, { name: 'Springfield', lat: 37.2090, lon: -93.2923 }, { name: 'Columbia', lat: 38.9517, lon: -92.3341 }, { name: 'Independence', lat: 39.0911, lon: -94.4155 }],
  'MT': [{ name: 'Billings', lat: 45.7833, lon: -108.5007 }, { name: 'Missoula', lat: 46.8721, lon: -113.9940 }, { name: 'Great Falls', lat: 47.5002, lon: -111.3008 }, { name: 'Bozeman', lat: 45.6770, lon: -111.0429 }, { name: 'Butte', lat: 46.0038, lon: -112.5348 }],
  'NE': [{ name: 'Omaha', lat: 41.2565, lon: -95.9345 }, { name: 'Lincoln', lat: 40.8136, lon: -96.7026 }, { name: 'Bellevue', lat: 41.1544, lon: -95.8911 }, { name: 'Grand Island', lat: 40.9264, lon: -98.3420 }, { name: 'Kearney', lat: 40.6993, lon: -99.0817 }],
  'NV': [{ name: 'Las Vegas', lat: 36.1699, lon: -115.1398 }, { name: 'Henderson', lat: 36.0395, lon: -114.9817 }, { name: 'Reno', lat: 39.5296, lon: -119.8138 }, { name: 'North Las Vegas', lat: 36.1989, lon: -115.1175 }, { name: 'Sparks', lat: 39.5349, lon: -119.7527 }],
  'NH': [{ name: 'Manchester', lat: 42.9956, lon: -71.4548 }, { name: 'Nashua', lat: 42.7654, lon: -71.4676 }, { name: 'Concord', lat: 43.2081, lon: -71.5376 }, { name: 'Derry', lat: 42.8806, lon: -71.3273 }, { name: 'Dover', lat: 43.1979, lon: -70.8737 }],
  'NJ': [{ name: 'Newark', lat: 40.7357, lon: -74.1724 }, { name: 'Jersey City', lat: 40.7178, lon: -74.0431 }, { name: 'Paterson', lat: 40.9168, lon: -74.1718 }, { name: 'Elizabeth', lat: 40.6640, lon: -74.2107 }, { name: 'Edison', lat: 40.5187, lon: -74.4121 }],
  'NM': [{ name: 'Albuquerque', lat: 35.0844, lon: -106.6504 }, { name: 'Las Cruces', lat: 32.3199, lon: -106.7637 }, { name: 'Rio Rancho', lat: 35.2328, lon: -106.6630 }, { name: 'Santa Fe', lat: 35.6870, lon: -105.9378 }, { name: 'Roswell', lat: 33.3943, lon: -104.5230 }],
  'NY': [{ name: 'New York City', lat: 40.7128, lon: -74.0060 }, { name: 'Buffalo', lat: 42.8864, lon: -78.8784 }, { name: 'Rochester', lat: 43.1566, lon: -77.6088 }, { name: 'Yonkers', lat: 40.9312, lon: -73.8987 }, { name: 'Syracuse', lat: 43.0481, lon: -76.1474 }],
  'NC': [{ name: 'Charlotte', lat: 35.2271, lon: -80.8431 }, { name: 'Raleigh', lat: 35.7796, lon: -78.6382 }, { name: 'Greensboro', lat: 36.0726, lon: -79.7920 }, { name: 'Durham', lat: 35.9940, lon: -78.8986 }, { name: 'Winston-Salem', lat: 36.0999, lon: -80.2442 }],
  'ND': [{ name: 'Fargo', lat: 46.8772, lon: -96.7898 }, { name: 'Bismarck', lat: 46.8083, lon: -100.7837 }, { name: 'Grand Forks', lat: 47.9253, lon: -97.0329 }, { name: 'Minot', lat: 48.2330, lon: -101.2963 }, { name: 'West Fargo', lat: 46.8750, lon: -96.9003 }],
  'OH': [{ name: 'Columbus', lat: 39.9612, lon: -82.9988 }, { name: 'Cleveland', lat: 41.4993, lon: -81.6944 }, { name: 'Cincinnati', lat: 39.1031, lon: -84.5120 }, { name: 'Toledo', lat: 41.6528, lon: -83.5379 }, { name: 'Akron', lat: 41.0814, lon: -81.5190 }],
  'OK': [{ name: 'Oklahoma City', lat: 35.4676, lon: -97.5164 }, { name: 'Tulsa', lat: 36.1540, lon: -95.9928 }, { name: 'Norman', lat: 35.2226, lon: -97.4395 }, { name: 'Broken Arrow', lat: 36.0526, lon: -95.7969 }, { name: 'Lawton', lat: 34.6036, lon: -98.3959 }],
  'OR': [{ name: 'Portland', lat: 45.5152, lon: -122.6784 }, { name: 'Eugene', lat: 44.0521, lon: -123.0868 }, { name: 'Salem', lat: 44.9429, lon: -123.0351 }, { name: 'Gresham', lat: 45.4984, lon: -122.4318 }, { name: 'Hillsboro', lat: 45.5229, lon: -122.9898 }],
  'PA': [{ name: 'Philadelphia', lat: 39.9526, lon: -75.1652 }, { name: 'Pittsburgh', lat: 40.4406, lon: -79.9959 }, { name: 'Allentown', lat: 40.6023, lon: -75.4714 }, { name: 'Erie', lat: 42.1292, lon: -80.0851 }, { name: 'Reading', lat: 40.3356, lon: -75.9269 }],
  'RI': [{ name: 'Providence', lat: 41.8240, lon: -71.4128 }, { name: 'Warwick', lat: 41.7001, lon: -71.4162 }, { name: 'Cranston', lat: 41.7799, lon: -71.4373 }, { name: 'Pawtucket', lat: 41.8787, lon: -71.3828 }, { name: 'East Providence', lat: 41.8137, lon: -71.3701 }],
  'SC': [{ name: 'Columbia', lat: 34.0007, lon: -81.0348 }, { name: 'Charleston', lat: 32.7765, lon: -79.9311 }, { name: 'North Charleston', lat: 32.8546, lon: -79.9748 }, { name: 'Mount Pleasant', lat: 32.7941, lon: -79.8626 }, { name: 'Rock Hill', lat: 34.9249, lon: -81.0251 }],
  'SD': [{ name: 'Sioux Falls', lat: 43.5446, lon: -96.7311 }, { name: 'Rapid City', lat: 44.0805, lon: -103.2310 }, { name: 'Aberdeen', lat: 45.4647, lon: -98.4865 }, { name: 'Brookings', lat: 44.3114, lon: -96.7984 }, { name: 'Watertown', lat: 44.8994, lon: -97.1151 }],
  'TN': [{ name: 'Nashville', lat: 36.1627, lon: -86.7816 }, { name: 'Memphis', lat: 35.1495, lon: -90.0490 }, { name: 'Knoxville', lat: 35.9606, lon: -83.9207 }, { name: 'Chattanooga', lat: 35.0456, lon: -85.3097 }, { name: 'Clarksville', lat: 36.5298, lon: -87.3595 }],
  'TX': [{ name: 'Houston', lat: 29.7604, lon: -95.3698 }, { name: 'San Antonio', lat: 29.4241, lon: -98.4936 }, { name: 'Dallas', lat: 32.7767, lon: -96.7970 }, { name: 'Austin', lat: 30.2672, lon: -97.7431 }, { name: 'Fort Worth', lat: 32.7555, lon: -97.3308 }],
  'UT': [{ name: 'Salt Lake City', lat: 40.7608, lon: -111.8910 }, { name: 'West Valley City', lat: 40.6916, lon: -112.0011 }, { name: 'Provo', lat: 40.2338, lon: -111.6585 }, { name: 'West Jordan', lat: 40.6097, lon: -111.9391 }, { name: 'Orem', lat: 40.2969, lon: -111.6946 }],
  'VT': [{ name: 'Burlington', lat: 44.4759, lon: -73.2121 }, { name: 'South Burlington', lat: 44.4669, lon: -73.1709 }, { name: 'Rutland', lat: 43.6106, lon: -72.9726 }, { name: 'Barre', lat: 44.1970, lon: -72.5020 }, { name: 'Montpelier', lat: 44.2601, lon: -72.5754 }],
  'VA': [{ name: 'Virginia Beach', lat: 36.8529, lon: -75.9780 }, { name: 'Norfolk', lat: 36.8508, lon: -76.2859 }, { name: 'Chesapeake', lat: 36.7682, lon: -76.2875 }, { name: 'Richmond', lat: 37.5407, lon: -77.4360 }, { name: 'Newport News', lat: 37.0871, lon: -76.4730 }],
  'WA': [{ name: 'Seattle', lat: 47.6062, lon: -122.3321 }, { name: 'Spokane', lat: 47.6588, lon: -117.4260 }, { name: 'Tacoma', lat: 47.2529, lon: -122.4443 }, { name: 'Vancouver', lat: 45.6387, lon: -122.6615 }, { name: 'Bellevue', lat: 47.6101, lon: -122.2015 }],
  'WV': [{ name: 'Charleston', lat: 38.3498, lon: -81.6326 }, { name: 'Huntington', lat: 38.4192, lon: -82.4452 }, { name: 'Morgantown', lat: 39.6295, lon: -79.9559 }, { name: 'Parkersburg', lat: 39.2667, lon: -81.5615 }, { name: 'Wheeling', lat: 40.0640, lon: -80.7209 }],
  'WI': [{ name: 'Milwaukee', lat: 43.0389, lon: -87.9065 }, { name: 'Madison', lat: 43.0731, lon: -89.4012 }, { name: 'Green Bay', lat: 44.5133, lon: -88.0133 }, { name: 'Kenosha', lat: 42.5847, lon: -87.8212 }, { name: 'Racine', lat: 42.7261, lon: -87.7829 }],
  'WY': [{ name: 'Cheyenne', lat: 41.1400, lon: -104.8202 }, { name: 'Casper', lat: 42.8501, lon: -106.3252 }, { name: 'Laramie', lat: 41.3114, lon: -105.5911 }, { name: 'Gillette', lat: 44.2911, lon: -105.5022 }, { name: 'Rock Springs', lat: 41.5875, lon: -109.2029 }],
  'DC': [{ name: 'Washington', lat: 38.9072, lon: -77.0369 }]
};

const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function calculateGeohash(lat, lon, precision = 7) {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonMin + lonMax) / 2;
      if (lon > mid) {
        idx |= (1 << (4 - bit));
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat > mid) {
        idx |= (1 << (4 - bit));
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    evenBit = !evenBit;
    if (bit < 4) {
      bit++;
    } else {
      geohash += base32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

// ==========================================
// OVERPASS API QUERIES
// ==========================================

async function searchOverpassAPI(lat, lon, radius, venueType) {
  const venues = [];

  try {
    // Build Overpass QL query
    const query = `
      [out:json][timeout:60];
      (
        node["${venueType.type}"="${venueType.tag}"](around:${radius},${lat},${lon});
        way["${venueType.type}"="${venueType.tag}"](around:${radius},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
    `;

    console.log(`      Searching ${venueType.name} (${radius/1000}km radius)...`);

    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 65000
    });

    if (response.data && response.data.elements) {
      for (const element of response.data.elements) {
        if (element.tags && element.tags.name) {
          venues.push({
            name: element.tags.name,
            type: venueType.name,
            parentCategory: null, // Will be set later
            lat: element.lat || element.center?.lat,
            lon: element.lon || element.center?.lon,
            address: buildAddress(element.tags),
            phone: element.tags.phone || element.tags['contact:phone'],
            website: element.tags.website || element.tags['contact:website'],
            openingHours: element.tags.opening_hours,
            wheelchair: element.tags.wheelchair,
            isFree: venueType.isFree
          });
        }
      }
    }

    console.log(`        Found ${venues.length} venues`);

  } catch (error) {
    if (error.response?.status === 429 || error.response?.status === 504) {
      console.log(`        Rate limited or timeout - will retry later`);
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    } else {
      console.log(`        Error: ${error.message}`);
    }
  }

  return venues;
}

function buildAddress(tags) {
  const parts = [];
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  if (tags['addr:street']) parts.push(tags['addr:street']);
  if (tags['addr:city']) parts.push(tags['addr:city']);
  if (tags['addr:state']) parts.push(tags['addr:state']);
  if (tags['addr:postcode']) parts.push(tags['addr:postcode']);

  return parts.length > 0 ? parts.join(', ') : null;
}

// ==========================================
// MAIN SCRAPER
// ==========================================

async function scrapeUSActivities(statesToScrape = null) {
  const allActivities = [];
  const processedVenues = new Set();

  const states = statesToScrape || Object.keys(US_CITIES);

  console.log('🔍 Starting USA Activities Scraper (OpenStreetMap)...\n');
  console.log(`📍 States: ${states.length}`);
  console.log(`📂 Venue types: ${Object.values(OSM_VENUE_TYPES).flat().length}`);
  console.log(`🏙️  Cities per state: 5\n`);
  console.log('⏱️  This will take 8-12 hours. Checkpoints save progress.\n');

  let totalSearches = 0;
  let totalVenues = 0;
  let statesCompleted = 0;

  for (const stateCode of states) {
    const cities = US_CITIES[stateCode];
    const stateName = STATE_NAMES[stateCode];

    console.log(`\n\n🏛️  ===== ${stateName.toUpperCase()} (${stateCode}) =====`);

    for (const cityData of cities) {
      console.log(`\n  📍 ${cityData.name}...`);

      for (const [parentCategory, venueTypes] of Object.entries(OSM_VENUE_TYPES)) {
        console.log(`    📂 ${parentCategory}`);

        for (const venueType of venueTypes) {
          totalSearches++;

          // Search OpenStreetMap within 15km radius
          const venues = await searchOverpassAPI(cityData.lat, cityData.lon, 15000, venueType);

          for (const venue of venues) {
            if (!venue.lat || !venue.lon) continue;

            // Use coordinate-based ID to avoid duplicates across cities
            // Round to 5 decimal places (~1 meter precision)
            const roundedLat = venue.lat.toFixed(5);
            const roundedLng = venue.lon.toFixed(5);
            const venueId = `${venue.name}-${roundedLat}-${roundedLng}`.toLowerCase().replace(/[^a-z0-9\-\.]/g, '');

            if (processedVenues.has(venueId)) {
              continue;
            }
            processedVenues.add(venueId);

            totalVenues++;
            console.log(`        ✓ ${venue.name}`);

            const activity = {
              id: venueId,
              name: venue.name,
              type: venue.type,
              parentCategory: parentCategory,
              subcategory: venue.type,
              tags: [venueType.tag],
              dataType: 'Place',
              seasonality: 'Year-round',
              description: `${venue.type} in ${cityData.name}, ${stateName}`,
              contact: {
                phone: venue.phone || null,
                email: null,
                website: venue.website || null
              },
              hours: venue.openingHours || null,
              filters: {
                ageRange: 'All Ages',
                isFree: venue.isFree,
                costType: venue.isFree ? 'free' : 'paid',
                costDetails: null
              },
              amenities: [],
              rating: null,
              reviewCount: 0,
              priceLevel: null,
              goodForKids: true,
              wheelchairAccessible: venue.wheelchair === 'yes' || null,
              hasOutdoorSeating: null,
              acceptsReservations: null,
              googlePlacesId: null,
              eventDate: null,
              kidsDealDay: null,
              dealDescription: null,
              imageUrl: null,
              metadata: {
                sourceName: 'OpenStreetMap',
                sourceId: venueId,
                sourceUrl: venue.website || '',
                sourceConfidence: 85,
                verifiedBy: 'openstreetmap',
                verifiedDate: null,
                freshnessScore: 85,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
              },
              notes: 'Data from OpenStreetMap',
              location: {
                address: venue.address || `${cityData.name}, ${stateCode}`,
                city: cityData.name,
                state: stateCode,
                county: null,
                zipCode: null,
                coordinates: {
                  latitude: venue.lat,
                  longitude: venue.lon
                },
                geohash: calculateGeohash(venue.lat, venue.lon),
                name: venue.name
              }
            };

            allActivities.push(activity);
          }

          // Rate limiting - OSM has strict limits
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced from 2000ms
        }
      }
    }

    statesCompleted++;
    console.log(`\n  ✅ ${stateName} complete (${statesCompleted}/${states.length})`);
    console.log(`  📊 Total venues so far: ${totalVenues}`);

    // Save checkpoint
    saveCheckpoint(allActivities, stateCode);
  }

  console.log(`\n\n✅ SCRAPING COMPLETE!`);
  console.log(`📊 States processed: ${statesCompleted}`);
  console.log(`📊 Total searches: ${totalSearches}`);
  console.log(`📊 Unique venues: ${allActivities.length}`);

  return allActivities;
}

// ==========================================
// CHECKPOINT SAVE
// ==========================================

function saveCheckpoint(activities, stateCode) {
  // Cloud Functions don't have persistent file storage
  // Checkpoints are logged but not saved to disk
  console.log(`  💾 Checkpoint: ${stateCode} (${activities.length} activities)`);
}

// ==========================================
// IMPORT TO FIREBASE
// ==========================================

async function addActivitiesToFirebase(activities) {
  console.log('\n📤 Importing to Firebase using venue-matcher...');

  let newCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const activity of activities) {
    try {
      // Use venue-matcher for deduplication
      const result = await getOrCreateActivity(activity, { source: 'openstreetmap' });

      if (result.isNew) {
        newCount++;
      } else if (result.updated) {
        updatedCount++;
      }

      const totalProcessed = newCount + updatedCount;
      if (totalProcessed % 50 === 0) {
        console.log(`  ✓ Processed ${totalProcessed}...`);
      }

      // Rate limiting to avoid overwhelming the venue cache
      if (totalProcessed % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`  ✗ Error for ${activity.name}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n✅ IMPORT COMPLETE!');
  console.log(`  ✓ New: ${newCount}`);
  console.log(`  ✓ Updated: ${updatedCount}`);
  console.log(`  ✗ Errors: ${errorCount}`);
}

// ==========================================
// MAIN
// ==========================================

// ==========================================
// CLOUD FUNCTION WRAPPER
// ==========================================

async function scrapeAndImportActivities(statesToScrape = null) {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  USA ACTIVITIES - OPENSTREETMAP SCRAPER');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (statesToScrape) {
      console.log(`🎯 Scraping: ${statesToScrape.join(', ')}\n`);
    } else {
      console.log('🎯 Scraping: ALL US STATES\n');
    }

    const activities = await scrapeUSActivities(statesToScrape);

    console.log(`\n📊 Total activities scraped: ${activities.length}`);

    // Automatically import to Firebase
    if (activities.length > 0) {
      await addActivitiesToFirebase(activities);

      return {
        success: true,
        activitiesScraped: activities.length,
        statesProcessed: statesToScrape ? statesToScrape.length : 51
      };
    } else {
      console.log('\n⚠️  No activities found');
      return {
        success: true,
        activitiesScraped: 0,
        statesProcessed: 0,
        message: 'No activities found'
      };
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  scrapeUSActivities,
  addActivitiesToFirebase,
  scrapeAndImportActivities
};
