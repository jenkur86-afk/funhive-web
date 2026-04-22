#!/usr/bin/env node
/**
 * TEST: Yodel single-site scraper test
 *
 * Tests the Yodel detection and extraction pipeline on Cleveland East OH
 * without writing to the database. Prints extracted events to console.
 *
 * Usage:
 *   node scrapers/test-yodel-single-site.js
 *   node scrapers/test-yodel-single-site.js --site=clevelandwest
 *   node scrapers/test-yodel-single-site.js --site=appleton
 */

const { launchBrowser } = require('./puppeteer-config');
const { detectYodel, scrapeYodelEventUrls, extractYodelEventDetails } = require('./helpers/yodel-helper');

const YODEL_TEST_SITES = {
  clevelandeast: { url: 'https://clevelandeast.macaronikid.com', name: 'Cleveland East', county: 'Cuyahoga', state: 'OH' },
  clevelandwest: { url: 'https://clevelandwest.macaronikid.com', name: 'Cleveland West', county: 'Cuyahoga', state: 'OH' },
  appleton:      { url: 'https://appleton.macaronikid.com',      name: 'Appleton',       county: 'Outagamie', state: 'WI' }
};

async function testYodelSite(siteKey) {
  const site = YODEL_TEST_SITES[siteKey];
  if (!site) {
    console.error(`Unknown site: ${siteKey}. Available: ${Object.keys(YODEL_TEST_SITES).join(', ')}`);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(`🧪 YODEL TEST: ${site.name} (${site.state})`);
  console.log(`   URL: ${site.url}/events/calendar`);
  console.log('='.repeat(60));

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');

    // Step 1: Navigate to calendar page
    console.log('\n📌 Step 1: Navigate to calendar page');
    await page.goto(`${site.url}/events/calendar`, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.waitForSelector('a[href*="/events/"]', { timeout: 10000 }).catch(() => {});

    // Check for old-format links
    const oldLinks = await page.evaluate(() => {
      const urls = new Set();
      document.querySelectorAll('a[href*="/events/"]').forEach(link => {
        const href = link.href;
        if (href && href.match(/\/events\/[a-f0-9]{24}/)) urls.add(href);
      });
      return urls.size;
    });
    console.log(`   Old-format event links: ${oldLinks}`);

    // Step 2: Detect Yodel
    console.log('\n📌 Step 2: Detect Yodel');
    const yid = await detectYodel(page);
    if (!yid) {
      console.log('   ❌ Yodel NOT detected on this page.');
      console.log('   This site still uses the old MK event format.');
      await browser.close();
      return;
    }
    console.log(`   ✅ Yodel detected! yid: ${yid}`);
    console.log(`   Widget URL: https://events.yodel.today/y/widget/${yid}`);

    // Step 3: Scrape event URLs from widget
    console.log('\n📌 Step 3: Scrape event URLs from Yodel widget');
    const startScrape = Date.now();
    const eventUrls = await scrapeYodelEventUrls(page, yid);
    const scrapeTime = ((Date.now() - startScrape) / 1000).toFixed(1);
    console.log(`   ✅ Found ${eventUrls.length} event URLs (${scrapeTime}s)`);

    if (eventUrls.length === 0) {
      console.log('   ⚠️ No events found in widget. Check if the widget page loads correctly.');
      await browser.close();
      return;
    }

    // Show first 5 URLs
    console.log('   Sample URLs:');
    eventUrls.slice(0, 5).forEach((url, i) => console.log(`     ${i + 1}. ${url}`));
    if (eventUrls.length > 5) console.log(`     ... and ${eventUrls.length - 5} more`);

    // Step 4: Extract details from first 5 events
    console.log('\n📌 Step 4: Extract event details (testing first 5)');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let success = 0, failed = 0, pastEvents = 0;

    const testUrls = eventUrls.slice(0, 5);
    for (const url of testUrls) {
      const details = await extractYodelEventDetails(page, url);
      if (!details) {
        console.log(`   ❌ FAILED: ${url}`);
        failed++;
        continue;
      }

      success++;
      console.log(`\n   ── Event ${success} ──`);
      console.log(`   Name:     ${details.name}`);
      console.log(`   Date:     ${details.eventDate} (${details.dayOfWeek})`);
      console.log(`   Time:     ${details.time || '(none)'}`);
      console.log(`   Venue:    ${details.venue || '(none)'}`);
      console.log(`   Address:  ${details.address || '(none)'}`);
      console.log(`   City:     ${details.city || '(none)'}`);
      console.log(`   Zip:      ${details.zipCode || '(none)'}`);
      console.log(`   Age:      ${details.ageRange}`);
      console.log(`   Cost:     ${details.cost}`);
      console.log(`   Desc:     ${(details.description || '').substring(0, 120)}${details.description && details.description.length > 120 ? '...' : ''}`);

      // Validate date
      if (details.eventDate) {
        const evDate = new Date(details.eventDate);
        if (evDate < today) {
          console.log(`   ⚠️ PAST EVENT (${details.eventDate})`);
          pastEvents++;
        }
      }

      // Validate completeness
      const issues = [];
      if (!details.name) issues.push('missing name');
      if (!details.eventDate) issues.push('missing date');
      if (!details.venue) issues.push('missing venue');
      if (!details.address) issues.push('missing address');
      if (!details.city) issues.push('missing city');
      if (!details.description) issues.push('missing description');
      if (issues.length > 0) {
        console.log(`   ⚠️ Data issues: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ All fields populated`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log(`   Total event URLs:    ${eventUrls.length}`);
    console.log(`   Tested:              ${testUrls.length}`);
    console.log(`   Extracted OK:        ${success}`);
    console.log(`   Failed:              ${failed}`);
    console.log(`   Past events:         ${pastEvents}`);
    console.log(`   Yodel yid:           ${yid}`);
    console.log('='.repeat(60));

    if (success > 0 && failed === 0) {
      console.log('\n✅ YODEL FIX VERIFIED — extraction pipeline works!\n');
    } else if (success > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS — some events failed to extract\n');
    } else {
      console.log('\n❌ FAILED — no events could be extracted\n');
    }

  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }
}

// Parse --site argument
const siteArg = process.argv.find(a => a.startsWith('--site='));
const siteKey = siteArg ? siteArg.split('=')[1] : 'clevelandeast';

testYodelSite(siteKey)
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
