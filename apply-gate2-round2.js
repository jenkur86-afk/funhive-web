const fs = require('fs');

function edit(file, oldStr, newStr, label) {
  const s = fs.readFileSync(file, 'utf8');
  const n = s.split(oldStr).length - 1;
  if (n !== 1) { console.error(`!! ${label}: anchor matched ${n} times in ${file}`); process.exit(1); }
  fs.writeFileSync(file, s.replace(oldStr, newStr));
  console.log('ok  ' + label);
}

// ---- 1. Brewster NY -> LibCal (add), after Monroe County Library System NY
const LIBCAL = 'scrapers/scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js';
{
  const s = fs.readFileSync(LIBCAL, 'utf8');
  const a = `    name: 'Monroe County Library System',
    url: 'https://calendar.libraryweb.org/calendar',`;
  if ((s.split(a).length - 1) !== 1) { console.error('!! Monroe anchor'); process.exit(1); }
  const start = s.indexOf(a);
  const end = s.indexOf('\n  },', start) + '\n  },'.length;
  const add = `
  // Added 2026-08-27. brewsterlibrary.libcal.com was claimed by BOTH Brewster NY and
  // Brewster Ladies Library MA. It belongs to NEW YORK: brewsterlibrary.org is Brewster
  // Public Library, 79 Main St, Brewster NY, while Brewster Ladies Library on Cape Cod
  // publishes on brewsterladieslibrary.assabetinteractive.com (now in Assabet-NH-MA).
  // The NY entry lived in WordPress-NY pointing at a LibCal URL - a platform mismatch on
  // top of the collision - so it is relocated here rather than merely disambiguated.
  {
    name: 'Brewster Public Library',
    url: 'https://brewsterlibrary.libcal.com/calendar',
    county: 'Putnam',
    state: 'NY',
    website: 'https://brewsterlibrary.org',
    city: 'Brewster',
    zipCode: '10509'
  },`;
  fs.writeFileSync(LIBCAL, s.slice(0, end) + add + s.slice(end));
  console.log('ok  LibCal +1 (Brewster Public Library NY)');
}

// ---- 2. Brewster Ladies MA -> Assabet
const ASSABET = 'scrapers/scraper-assabet-libraries-nh-ma.js';
{
  const s = fs.readFileSync(ASSABET, 'utf8');
  const a = `  { name: 'Ventress Memorial Library', slug: 'ventresslibrary', eventsUrl: 'https://ventresslibrary.assabetinteractive.com/calendar/', city: 'Marshfield', state: 'MA', zipCode: '02050' },`;
  if ((s.split(a).length - 1) !== 1) { console.error('!! ventress anchor'); process.exit(1); }
  const add = a + `
  // Added 2026-08-27. Was in WordPress-MA pointing at brewsterlibrary.libcal.com, a URL that
  // belongs to Brewster NEW YORK - a collision AND a platform mismatch at once. Brewster
  // Ladies Library is on Cape Cod and runs Assabet; confirmed live before wiring:
  // brewsterladieslibrary.assabetinteractive.com/calendar/ titles itself
  // "August 2026 Events | Brewster Ladies' Library".
  { name: 'Brewster Ladies Library', slug: 'brewsterladieslibrary', eventsUrl: 'https://brewsterladieslibrary.assabetinteractive.com/calendar/', city: 'Brewster', state: 'MA', zipCode: '02631' },`;
  fs.writeFileSync(ASSABET, s.replace(a, add));
  console.log('ok  Assabet +1 (Brewster Ladies Library MA)');
}

// ---- 3. Guards
const G = [
  ['scrapers/scraper-wordpress-libraries-ny.js', `  { name: 'Brewster Public Library', url: 'https://brewsterlibrary.libcal.com/', eventsUrl: 'https://brewsterlibrary.libcal.com/', city: 'Brewster', state: 'NY', zipCode: '10509', county: 'Putnam'},`,
   'platform mismatch - runs LibCal; relocated to the LibCal family 2026-08-27 (host was also claimed by Brewster MA)',
   'PLATFORM MISMATCH plus a collision. This entry pointed at a LibCal URL from the WordPress family, and the same URL was claimed by Brewster Ladies Library MA. The host is NEW YORK: brewsterlibrary.org is Brewster Public Library, 79 Main St, Brewster NY. Relocated to the LibCal config.', 'Brewster NY'],

  ['scrapers/scraper-wordpress-libraries-ma.js', `  { name: 'Brewster Ladies Library Assoc.', url: 'https://brewsterlibrary.libcal.com/', eventsUrl: 'https://brewsterlibrary.libcal.com/', city: 'Brewster', state: 'MA', zipCode: '02631', county: 'Barnstable'},`,
   'wrong-state URL - brewsterlibrary.libcal.com is Brewster NY; this library runs Assabet, relocated to Assabet-NH-MA 2026-08-27',
   'WRONG-STATE URL. brewsterlibrary.libcal.com belongs to Brewster Public Library in NEW YORK. Brewster Ladies Library is on Cape Cod and publishes on brewsterladieslibrary.assabetinteractive.com, whose page titles itself August 2026 Events for that library. Relocated to Assabet-NH-MA.', 'Brewster MA'],
];
for (const [file, oldLine, reason, why, label] of G) {
  const s = fs.readFileSync(file, 'utf8');
  if ((s.split(oldLine).length - 1) !== 1) { console.error(`!! guard anchor not unique: ${label}`); process.exit(1); }
  const note = `  // 2026-08-27: ${why}\n  // Guarded rather than deleted so the library keeps an explained row in LIBRARY-SITE-AUDIT.md.\n`;
  fs.writeFileSync(file, s.replace(oldLine, note + oldLine.replace(/\},$/, `, urlCollision: '${reason}' },`)));
  console.log('ok  guarded ' + label);
}

// ---- 4. Huntington WV guard (Communico config)
edit('scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js',
`  {
    name: 'Huntington Public Library',
    url: 'https://myhpl.libnet.info/events',
    county: 'Cabell',
    state: 'WV',
    website: 'https://myhpl.org',
    city: 'Huntington',
    zipCode: '25701'
  },`,
`  // GUARDED 2026-08-27 — WRONG-STATE URL. myhpl.libnet.info is Huntington Public Library in
  // NEW YORK, proven by myhpl.org printing phone 631-427-5165 (631 is Suffolk County NY) and
  // linking to this exact calendar. Huntington WEST VIRGINIA is served by CABELL COUNTY
  // PUBLIC LIBRARY, 455 9th St, Huntington WV 25701, ph 304-528-5700, at cabellcountylib.org
  // — a different institution with a different name, which is why a name match would have
  // "confirmed" this wrong entry. REAL, UNCOVERED GAP: no scraper currently reads
  // cabellcountylib.org. Kept guarded rather than deleted so it stays visible in the audit.
  // {
  //   name: 'Huntington Public Library',
  //   url: 'https://myhpl.libnet.info/events',
  //   county: 'Cabell',
  //   state: 'WV',
  //   website: 'https://myhpl.org',
  //   city: 'Huntington',
  //   zipCode: '25701'
  // },`, 'Huntington WV guarded (Communico)');

// ---- 5. Rochester guards
edit('scrapers/scraper-librarymarket-libraries-CA-CO-FL-MD-TX-VA.js',
`  {
    name: 'Rochester Public Library',
    url: 'https://rochesterpubliclibrary.librarymarket.com/events/upcoming',
    county: 'Monroe',
    state: 'NY',
    website: 'https://www.rpl.org',
    city: 'Rochester',
    zipCode: '14614'
  },`,
`  // GUARDED 2026-08-27 — WRONG-STATE URL. rochesterpubliclibrary.librarymarket.com is
  // Rochester, MINNESOTA: the page prints phone 507-328-2300 (507 is southern Minnesota) and
  // the library is at 101 2nd St SE, Rochester MN 55904, rplmn.org. It was claimed here by
  // NY and separately by NH, and neither is correct — a third-state collision.
  // ROCHESTER NY IS ALREADY COVERED, with database evidence rather than an assumption:
  // Rochester Public Library is the central library of the Monroe County Library System,
  // which runs at calendar.libraryweb.org in the LibCal config and has live rows across
  // Gates, Pittsford, Irondequoit, Chili and East Rochester.
  // {
  //   name: 'Rochester Public Library',
  //   url: 'https://rochesterpubliclibrary.librarymarket.com/events/upcoming',
  //   county: 'Monroe',
  //   state: 'NY',
  //   website: 'https://www.rpl.org',
  //   city: 'Rochester',
  //   zipCode: '14614'
  // },`, 'Rochester NY guarded (librarymarket CA-CO-FL-MD-TX-VA)');

edit('scrapers/scraper-librarymarket-libraries-me-nh-ma.js',
`  {
    name: 'Rochester Public Library',
    eventsUrl: 'https://rochesterpubliclibrary.librarymarket.com/events/upcoming',
    city: 'Rochester',
    state: 'NH',
    zipCode: '03867'
  },`,
`  // GUARDED 2026-08-27 — WRONG-STATE URL. rochesterpubliclibrary.librarymarket.com is
  // Rochester, MINNESOTA (507-328-2300, 101 2nd St SE, Rochester MN 55904, rplmn.org), not
  // Rochester NH. Unlike the NY claim on the same host, this one is a REAL UNCOVERED GAP:
  // Rochester NH has its own library and no scraper currently reads it.
  // {
  //   name: 'Rochester Public Library',
  //   eventsUrl: 'https://rochesterpubliclibrary.librarymarket.com/events/upcoming',
  //   city: 'Rochester',
  //   state: 'NH',
  //   zipCode: '03867'
  // },`, 'Rochester NH guarded (librarymarket me-nh-ma)');
