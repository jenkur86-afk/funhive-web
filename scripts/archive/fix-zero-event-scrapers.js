#!/usr/bin/env node
/**
 * FIX ZERO-EVENT SCRAPERS
 *
 * Root causes identified:
 * 1. Communico: waitUntil 'domcontentloaded' exits before AJAX loads events
 * 2. LibCal (Kent, Worcester): calendar month view has no list cards — need ?cid=-1&t=d
 * 3. Wicomico: hardcoded month names (Nov/Dec/Jan) in DOM traversal — fails for other months
 * 4. LibraryMarket (Allegany, Ruth Enlow, etc): calendar URL floods generic selectors — need /events/upcoming
 * 5. LibraryMarket-MD multi-library: same URL issue + date extraction needs lc-date-icon support
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
let changes = 0;

function patch(filePath, label, oldStr, newStr) {
  if (!fs.existsSync(filePath)) { console.log(`  ⚠️  [${label}] file not found`); return false; }
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(newStr.substring(0, 60))) { console.log(`  ⏭️  [${label}] already patched`); return false; }
  if (!content.includes(oldStr)) { console.log(`  ⚠️  [${label}] pattern not found`); return false; }
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content);
  console.log(`  ✅ [${label}] patched`);
  changes++;
  return true;
}

console.log('FunHive — Fix Zero-Event Scrapers\n');

// =============================================================================
// FIX 1: COMMUNICO — change domcontentloaded to networkidle2 + wait for events
// =============================================================================
console.log('━━━ FIX 1: Communico multi-state (domcontentloaded → networkidle2) ━━━');
const commFile = path.join(ROOT, 'scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js');

patch(commFile, 'Communico-waitUntil',
  `    // OPTIMIZED: Faster page load strategy
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Wait for Communico to load events - need more time for thismonth view
    await page.waitForSelector('body', { timeout: 3000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to load lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));`,

  `    // Wait for full page + AJAX to load (Communico loads events via AJAX)
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for Communico event elements to appear
    await page.waitForSelector('.eelistevent, .em-event-list-item, article', { timeout: 10000 }).catch(() => null);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to load lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await new Promise(resolve => setTimeout(resolve, 2000));`
);

// Also add eelisttitle to the title selector since that's what DC Library actually uses
patch(commFile, 'Communico-titleSelector',
  `let titleEl = el.querySelector('h1, h2, h3, h4, .event-title, .program-title, .eelistevent-name, a');`,
  `let titleEl = el.querySelector('h1, h2, h3, h4, .event-title, .program-title, .eelistevent-name, .eelisttitle a, a');`
);

// Add eelisttime to the time selectors
patch(commFile, 'Communico-timeSelector',
  `const timeEl = el.querySelector('.event-time, .time, [class*="time"]');`,
  `const timeEl = el.querySelector('.event-time, .time, .eelisttime, [class*="time"]');`
);

// Add eelistdesc to description selectors
patch(commFile, 'Communico-descSelector',
  `const descEl = el.querySelector('.description, p, [class*="description"]');`,
  `const descEl = el.querySelector('.description, .eelistdesc, p, [class*="description"]');`
);

// =============================================================================
// FIX 2: LIBCAL standalone scrapers — force list view with ?cid=-1&t=d
// =============================================================================
console.log('\n━━━ FIX 2: LibCal scrapers (force list view URL) ━━━');

// Kent County
const kentFile = path.join(ROOT, 'scrapers/scraper-kent-county-library-MD.js');
patch(kentFile, 'Kent-URL',
  `const EVENTS_URL = 'https://kent-md.libcal.com/calendar';`,
  `const EVENTS_URL = 'https://kent-md.libcal.com/calendar?cid=-1&t=d';`
);

// Worcester County
const worcFile = path.join(ROOT, 'scrapers/scraper-worcester-county-library-MD.js');
if (fs.existsSync(worcFile)) {
  let worc = fs.readFileSync(worcFile, 'utf8');
  // Find the URL constant
  const worcUrlMatch = worc.match(/const EVENTS_URL = '(https:\/\/worcesterlibrary\.libcal\.com\/calendar[^']*)';/);
  if (worcUrlMatch && !worcUrlMatch[1].includes('t=d')) {
    const oldUrl = worcUrlMatch[0];
    let newUrl = worcUrlMatch[1];
    if (newUrl.includes('?')) {
      newUrl += '&t=d';
    } else {
      newUrl += '?cid=-1&t=d';
    }
    patch(worcFile, 'Worcester-URL', oldUrl, `const EVENTS_URL = '${newUrl}';`);
  } else {
    console.log('  ⏭️  [Worcester-URL] already has list view or pattern not found');
  }
}

// Multi-state LibCal — check if it has MD/WV libraries that use calendar view
const libcalMulti = path.join(ROOT, 'scrapers/scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js');
if (fs.existsSync(libcalMulti)) {
  let lcm = fs.readFileSync(libcalMulti, 'utf8');
  // Look for kent-md and worcester URLs and add ?t=d
  let lcmChanged = false;

  // Fix any libcal.com/calendar URLs that don't have t=d
  const calUrlPattern = /('https:\/\/[^']*\.libcal\.com\/calendar(?:\/[^']*)?')(?=[,\s\n])/g;
  let match;
  while ((match = calUrlPattern.exec(lcm)) !== null) {
    const url = match[1];
    if (!url.includes('t=d') && !url.includes('t=m')) {
      const inner = url.slice(1, -1); // remove quotes
      const sep = inner.includes('?') ? '&' : '?';
      const newUrl = `'${inner}${sep}cid=-1&t=d'`;
      lcm = lcm.replace(url, newUrl);
      lcmChanged = true;
      console.log(`  ✅ [LibCal-multi] fixed URL: ${inner.substring(0, 50)}...`);
    }
  }
  if (lcmChanged) {
    fs.writeFileSync(libcalMulti, lcm);
    changes++;
  } else {
    console.log('  ⏭️  [LibCal-multi] no calendar URLs need fixing');
  }
}

// =============================================================================
// FIX 3: WICOMICO — replace hardcoded month traversal with proper selectors
// =============================================================================
console.log('\n━━━ FIX 3: Wicomico (hardcoded months → proper selectors) ━━━');
const wicFile = path.join(ROOT, 'scrapers/scraper-wicomico-libraries-MD.js');
if (fs.existsSync(wicFile)) {
  let wic = fs.readFileSync(wicFile, 'utf8');

  // Fix the URL — it redirects to /events/upcoming which is better
  patch(wicFile, 'Wicomico-URL',
    `url: 'https://www.wicomicolibrary.org/events'`,
    `url: 'https://www.wicomicolibrary.org/events/upcoming'`
  );

  // Re-read after potential URL change
  wic = fs.readFileSync(wicFile, 'utf8');

  // Replace the broken h3 + month-traversal extraction with proper selectors
  const wicOldExtract = `    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Wicomico uses h3 tags for event titles
      const eventContainers = document.querySelectorAll('h3');

      eventContainers.forEach(h3 => {
        try {
          // Get the parent container that has all event info
          let eventContainer = h3.parentElement;
          while (eventContainer && !eventContainer.textContent.includes('Nov') && !eventContainer.textContent.includes('Dec') && !eventContainer.textContent.includes('Jan')) {
            eventContainer = eventContainer.parentElement;
            if (!eventContainer || eventContainer.tagName === 'BODY') break;
          }

          if (!eventContainer || eventContainer.tagName === 'BODY') return;

          // Extract title from h3
          const titleLink = h3.querySelector('a');
          if (!titleLink) return;

          const title = titleLink.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const url = titleLink.href || '';

          // Get all text content
          const fullText = eventContainer.textContent;

          // Extract date and time - Wicomico format: "Nov 10 2025 Mon 10:30am–11:15am"
          let eventDate = '';
          let time = '';

          const dateTimeMatch = fullText.match(/(\\w{3}\\s+\\d{1,2}\\s+\\d{4}\\s+\\w{3})\\s+(\\d{1,2}:\\d{2}(?:am|pm)(?:–|-)\\d{1,2}:\\d{2}(?:am|pm))/i);
          if (dateTimeMatch) {
            eventDate = dateTimeMatch[1];
            time = dateTimeMatch[2];
          } else {
            // Try to extract just the date
            const dateMatch = fullText.match(/\\w{3}\\s+\\d{1,2}\\s+\\d{4}\\s+\\w{3}/i);
            if (dateMatch) eventDate = dateMatch[0];

            // Try to extract time separately
            const timeMatch = fullText.match(/\\d{1,2}:\\d{2}(?:am|pm)(?:–|-)\\d{1,2}:\\d{2}(?:am|pm)/i) ||
                             fullText.match(/\\d{1,2}:\\d{2}(?:am|pm)/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location/branch
          let location = '';
          const locationMatch = fullText.match(/(?:Location|Branch|Library):\\s*([^\\n]+)/i);
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Extract age group
          let ageGroup = '';
          const ageMatch = fullText.match(/(?:Age Group|Ages?):\\s*([^\\n]+)/i);
          if (ageMatch) {
            ageGroup = ageMatch[1].trim();
          }

          // Extract program type
          let programType = '';
          const programMatch = fullText.match(/(?:Program Type):\\s*([^\\n]+)/i);
          if (programMatch) {
            programType = programMatch[1].trim();
          }

          // Extract description (look for paragraph tags in the container)
          let description = '';
          const paragraphs = eventContainer.querySelectorAll('p');
          if (paragraphs.length > 0) {
            let longest = '';
            paragraphs.forEach(p => {
              const text = p.textContent.trim();
              if (text.length > longest.length && !text.includes('Age Group') && !text.includes('Program Type')) {
                longest = text;
              }
            });
            description = longest;
          }`;

  const wicNewExtract = `    // Extract events from the page
    const events = await page.evaluate(() => {
      const results = [];

      // Wicomico uses lc-event / event-card classes (LibraryCalendar platform)
      const eventCards = document.querySelectorAll('article.event-card, .lc-event--upcoming > article');

      eventCards.forEach(card => {
        try {
          // Extract title
          const titleEl = card.querySelector('.lc-event__title a, .lc-event__link, h3 a, h2 a');
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          if (!title || title.length < 3) return;

          // Extract URL
          const url = titleEl.href || '';

          // Extract date from lc-date-icon elements (month/day/year spans)
          let eventDate = '';
          const monthEl = card.querySelector('.lc-date-icon__item--month');
          const dayEl = card.querySelector('.lc-date-icon__item--day');
          const yearEl = card.closest('.lc-event--upcoming') ?
            card.closest('.lc-event--upcoming').querySelector('.lc-event__month-summary') : null;

          if (monthEl && dayEl) {
            const month = monthEl.textContent.trim();
            const day = dayEl.textContent.trim();
            // Extract year from month-summary or use current year
            let year = new Date().getFullYear();
            if (yearEl) {
              const yearMatch = yearEl.textContent.match(/\\d{4}/);
              if (yearMatch) year = yearMatch[0];
            }
            eventDate = month + ' ' + day + ', ' + year;
          }

          // Fallback: try regex on full text
          if (!eventDate) {
            const fullText = card.textContent;
            const dateMatch = fullText.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+\\w+\\s+\\d{1,2},?\\s+\\d{4}/i) ||
                             fullText.match(/\\w{3,9}\\s+\\d{1,2},?\\s+\\d{4}/i);
            if (dateMatch) eventDate = dateMatch[0];
          }

          // Extract time
          let time = '';
          const timeEl = card.querySelector('.lc-event-info-item--time, [class*="time"]');
          if (timeEl) {
            time = timeEl.textContent.trim();
          } else {
            const fullText = card.textContent;
            const timeMatch = fullText.match(/\\d{1,2}:\\d{2}(?:am|pm)(?:[–-]\\d{1,2}:\\d{2}(?:am|pm))?/i);
            if (timeMatch) time = timeMatch[0];
          }

          // Extract location/branch
          let location = '';
          const branchEl = card.querySelector('.lc-event__branch, [class*="branch"]');
          if (branchEl) {
            location = branchEl.textContent.replace(/Library Branch:\\s*/i, '').trim();
          }

          // Extract age group
          let ageGroup = '';
          const ageEl = card.querySelector('.lc-event__age-groups, [class*="age"]');
          if (ageEl) {
            ageGroup = ageEl.textContent.trim();
          }

          // Extract program type / categories
          let programType = '';
          const catEl = card.querySelector('[class*="categories"], [class*="category"]');
          if (catEl) {
            programType = catEl.textContent.trim();
          }

          // Extract description
          let description = '';
          const descEl = card.querySelector('.lc-event__body, .lc-event-subtitle, p');
          if (descEl) {
            description = descEl.textContent.trim();
          }`;

  if (wic.includes("while (eventContainer && !eventContainer.textContent.includes('Nov')")) {
    wic = wic.replace(wicOldExtract, wicNewExtract);
    fs.writeFileSync(wicFile, wic);
    console.log('  ✅ [Wicomico-extraction] replaced h3+month traversal with event-card selectors');
    changes++;
  } else if (wic.includes('article.event-card')) {
    console.log('  ⏭️  [Wicomico-extraction] already patched');
  } else {
    console.log('  ⚠️  [Wicomico-extraction] pattern not found — check manually');
  }
}

// =============================================================================
// FIX 4: LIBRARYMARKET-MD — use /events/upcoming URLs + better date extraction
// =============================================================================
console.log('\n━━━ FIX 4: LibraryMarket-MD (calendar → upcoming view + date fix) ━━━');
const lmFile = path.join(ROOT, 'scrapers/scraper-librarymarket-libraries-md.js');
if (fs.existsSync(lmFile)) {
  let lm = fs.readFileSync(lmFile, 'utf8');

  // Fix Allegany URL: allegany.librarymarket.com → allegany.librarymarket.com/events/upcoming
  if (lm.includes(`"eventsUrl": "https://allegany.librarymarket.com"`) && !lm.includes('allegany.librarymarket.com/events/upcoming')) {
    lm = lm.replace(
      `"eventsUrl": "https://allegany.librarymarket.com"`,
      `"eventsUrl": "https://allegany.librarymarket.com/events/upcoming"`
    );
    console.log('  ✅ [LM-Allegany] → /events/upcoming');
    changes++;
  }

  // Fix Ruth Enlow URL: /events/month → /events/upcoming
  if (lm.includes('relib.librarymarket.com/events/month')) {
    lm = lm.replace(
      'relib.librarymarket.com/events/month',
      'relib.librarymarket.com/events/upcoming'
    );
    console.log('  ✅ [LM-RuthEnlow] → /events/upcoming');
    changes++;
  }

  // Fix CCPL URL if it doesn't have /upcoming
  if (lm.includes('ccpl.librarymarket.com/events/upcoming')) {
    console.log('  ⏭️  [LM-CCPL] already /events/upcoming');
  } else if (lm.includes('ccpl.librarymarket.com')) {
    lm = lm.replace(
      /ccpl\.librarymarket\.com[^'""]*/,
      'ccpl.librarymarket.com/events/upcoming'
    );
    console.log('  ✅ [LM-CCPL] → /events/upcoming');
    changes++;
  }

  // Add lc-date-icon extraction to the generic scraper evaluate
  // Replace the date extraction logic to handle lc-date-icon elements
  const lmOldDates = `              const possibleDates = [
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
                ...Array.from(card.querySelectorAll('*')).filter(el =>
                  el.textContent.match(/\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}|\\w+ \\d{1,2},? \\d{4}|^\\d{1,2}:\\d{2}/i)
                )
              ].filter(el => el);`;

  const lmNewDates = `              // Extract date from lc-date-icon (LibraryMarket) or fallback
              let lcDateStr = '';
              const lcMonth = card.querySelector('.lc-date-icon__item--month');
              const lcDay = card.querySelector('.lc-date-icon__item--day');
              if (lcMonth && lcDay) {
                const yr = (card.closest('.lc-event--upcoming') || card).textContent.match(/\\d{4}/);
                lcDateStr = lcMonth.textContent.trim() + ' ' + lcDay.textContent.trim() + ', ' + (yr ? yr[0] : new Date().getFullYear());
              }
              const possibleDates = [
                lcDateStr ? { textContent: lcDateStr, trim() { return lcDateStr; } } : null,
                card.querySelector('[class*="date"]'),
                card.querySelector('[class*="time"]'),
                card.querySelector('time'),
              ].filter(el => el && (el.textContent || '').trim().length > 0);`;

  if (lm.includes("...Array.from(card.querySelectorAll('*')).filter(el =>")) {
    lm = lm.replace(lmOldDates, lmNewDates);
    console.log('  ✅ [LM-dateExtraction] added lc-date-icon support');
    changes++;
  } else if (lm.includes('lc-date-icon__item--month')) {
    console.log('  ⏭️  [LM-dateExtraction] already patched');
  } else {
    console.log('  ⚠️  [LM-dateExtraction] pattern not found');
  }

  fs.writeFileSync(lmFile, lm);
}

// =============================================================================
// FIX 5: ALLEGANY standalone — same URL fix + extraction update
// =============================================================================
console.log('\n━━━ FIX 5: Allegany County standalone (URL + extraction) ━━━');
const allegFile = path.join(ROOT, 'scrapers/scraper-allegany-county-library-MD.js');
if (fs.existsSync(allegFile)) {
  let alleg = fs.readFileSync(allegFile, 'utf8');

  // Fix URL
  const allegUrlMatch = alleg.match(/const EVENTS_URL = '(https:\/\/allegany\.librarymarket\.com[^']*)';/);
  if (allegUrlMatch && !allegUrlMatch[1].includes('/events/upcoming')) {
    alleg = alleg.replace(allegUrlMatch[0], `const EVENTS_URL = 'https://allegany.librarymarket.com/events/upcoming';`);
    fs.writeFileSync(allegFile, alleg);
    console.log('  ✅ [Allegany-URL] → /events/upcoming');
    changes++;
  } else {
    console.log('  ⏭️  [Allegany-URL] already fixed or not found');
  }

  // Add lc-date-icon date extraction
  alleg = fs.readFileSync(allegFile, 'utf8');
  if (!alleg.includes('lc-date-icon__item--month')) {
    // Add date extraction before the regex fallback
    const allegOldDate = `          // Get date/time - LibraryMarket format: "Thursday, December 4, 2025 at 10:00am - 6:00pm"
          const fullText = card.textContent;
          let eventDate = '';
          let eventTime = '';`;
    const allegNewDate = `          // Get date from lc-date-icon elements (LibraryMarket platform)
          const fullText = card.textContent;
          let eventDate = '';
          let eventTime = '';

          const lcMonthEl = card.querySelector('.lc-date-icon__item--month');
          const lcDayEl = card.querySelector('.lc-date-icon__item--day');
          if (lcMonthEl && lcDayEl) {
            const yr = fullText.match(/\\d{4}/);
            eventDate = lcMonthEl.textContent.trim() + ' ' + lcDayEl.textContent.trim() + ', ' + (yr ? yr[0] : new Date().getFullYear());
            const timeEl = card.querySelector('.lc-event-info-item--time, [class*="time"]');
            if (timeEl) eventTime = timeEl.textContent.trim();
          }

          // Fallback: LibraryMarket format: "Thursday, December 4, 2025 at 10:00am - 6:00pm"
          if (!eventDate) {`;
    if (alleg.includes(allegOldDate)) {
      alleg = alleg.replace(allegOldDate, allegNewDate);
      // Close the if block after the existing regex extraction
      alleg = alleg.replace(
        `            if (dateMatch) eventDate = dateMatch[0];
          }`,
        `            if (dateMatch) eventDate = dateMatch[0];
          }
          } // end fallback`
      );
      fs.writeFileSync(allegFile, alleg);
      console.log('  ✅ [Allegany-dateExtraction] added lc-date-icon support');
      changes++;
    } else {
      console.log('  ⚠️  [Allegany-dateExtraction] pattern not found');
    }
  } else {
    console.log('  ⏭️  [Allegany-dateExtraction] already patched');
  }
}

// =============================================================================
// FIX 6: RUTH ENLOW standalone — same URL fix
// =============================================================================
console.log('\n━━━ FIX 6: Ruth Enlow standalone (URL) ━━━');
const reFile = path.join(ROOT, 'scrapers/scraper-ruth-enlow-library-MD.js');
if (fs.existsSync(reFile)) {
  let re = fs.readFileSync(reFile, 'utf8');
  const reUrlMatch = re.match(/const EVENTS_URL = '(https:\/\/relib\.librarymarket\.com[^']*)';/);
  if (reUrlMatch && !reUrlMatch[1].includes('/events/upcoming')) {
    re = re.replace(reUrlMatch[0], `const EVENTS_URL = 'https://relib.librarymarket.com/events/upcoming';`);
    fs.writeFileSync(reFile, re);
    console.log('  ✅ [RuthEnlow-URL] → /events/upcoming');
    changes++;
  } else {
    console.log('  ⏭️  [RuthEnlow-URL] already fixed or not found');
  }
}

// =============================================================================
// FIX 7: LIBCAL-MD in multi-state (if it references MD LibCal URLs)
// =============================================================================
console.log('\n━━━ FIX 7: LibCal multi-state MD/WV entries ━━━');
// Already handled in Fix 2 above (calUrlPattern matching all libcal.com/calendar URLs)

// =============================================================================
// FIX 8: DRUPAL-PA — check page load timing
// =============================================================================
console.log('\n━━━ FIX 8: Drupal-Pennsylvania (timing) ━━━');
const drupalPAFile = path.join(ROOT, 'scrapers/scraper-drupal-libraries-PA.js');
if (fs.existsSync(drupalPAFile)) {
  let dp = fs.readFileSync(drupalPAFile, 'utf8');

  // Check if it uses domcontentloaded
  if (dp.includes("waitUntil: 'domcontentloaded'")) {
    dp = dp.replace(
      "waitUntil: 'domcontentloaded'",
      "waitUntil: 'networkidle2'"
    );
    fs.writeFileSync(drupalPAFile, dp);
    console.log('  ✅ [Drupal-PA] domcontentloaded → networkidle2');
    changes++;
  } else if (dp.includes("waitUntil: 'networkidle2'")) {
    console.log('  ⏭️  [Drupal-PA] already uses networkidle2');
  }

  // Check if timeout is too low
  if (dp.includes('timeout: 15000') && !dp.includes('timeout: 30000')) {
    dp = fs.readFileSync(drupalPAFile, 'utf8');
    dp = dp.replace(/timeout: 15000/g, 'timeout: 30000');
    fs.writeFileSync(drupalPAFile, dp);
    console.log('  ✅ [Drupal-PA] increased timeout to 30s');
    changes++;
  }
} else {
  console.log('  ⚠️  Drupal-PA file not found');
}

// =============================================================================
// SUMMARY
// =============================================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`Done! ${changes} fix(es) applied.`);
console.log(`${'='.repeat(60)}`);

console.log('\n📋 Root causes fixed:');
console.log('  1. Communico: domcontentloaded → networkidle2 + wait for .eelistevent');
console.log('  2. LibCal: calendar URL → list view (?cid=-1&t=d)');
console.log('  3. Wicomico: hardcoded Nov/Dec/Jan → proper event-card selectors');
console.log('  4. LibraryMarket: calendar URL → /events/upcoming + lc-date-icon');
console.log('  5. Drupal-PA: timing/timeout improvements');

console.log('\nFiles modified:');
console.log('  scrapers/scraper-communico-libraries-CA-CO-DC-FL-GA-IL-MA-MD-TX-VA.js');
console.log('  scrapers/scraper-kent-county-library-MD.js');
console.log('  scrapers/scraper-worcester-county-library-MD.js');
console.log('  scrapers/scraper-wicomico-libraries-MD.js');
console.log('  scrapers/scraper-librarymarket-libraries-md.js');
console.log('  scrapers/scraper-allegany-county-library-MD.js');
console.log('  scrapers/scraper-ruth-enlow-library-MD.js');
console.log('  scrapers/scraper-libcal-libraries-CA-CO-DE-FL-LA-MA-NY-SC-TN-TX-VA-WA.js');
console.log('  scrapers/scraper-drupal-libraries-PA.js');

if (changes > 0) {
  console.log('\nTo commit:');
  console.log('  git add scrapers/');
  console.log('  git commit -m "Fix zero-event scrapers: timing, URLs, selectors"');
  console.log('  git push origin main');
}
