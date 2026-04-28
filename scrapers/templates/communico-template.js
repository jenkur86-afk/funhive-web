const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

/**
 * AUTO-GENERATED COMMUNICO SCRAPER
 * State: {{state}}
 * Libraries: {{libraries}}
 */

const LIBRARIES = {{libraries}};

const SCRAPER_NAME = 'communico-{{state}}';

async function scrapeCommunicoEvents() {
  const browser = await puppeteer.launch({ headless: true });
  const events = [];

  for (const library of LIBRARIES) {
    try {
      console.log(`\n📚 Scraping ${library.name}...`);

      const page = await browser.newPage();
      await page.goto(library.eventsUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for Communico events
      await page.waitForSelector('.eventCardContainer, .eventCard, .event-item', { timeout: 10000 }).catch(() => null);

      const libraryEvents = await page.evaluate((libName) => {
        const events = [];

        // Communico event cards
        document.querySelectorAll('.eventCardContainer, .eventCard, .event-item').forEach(card => {
          try {
            const titleEl = card.querySelector('.eventCardTitle, .event-title, h3, h4');
            const dateEl = card.querySelector('.eventCardDate, .event-date, .date');
            const timeEl = card.querySelector('.eventCardTime, .event-time, .time');
            const descEl = card.querySelector('.eventCardDescription, .event-description, .description');
            const linkEl = card.querySelector('a[href]');
            const imageEl = card.querySelector('img');
            const locationEl = card.querySelector('.eventCardLocation, .event-location, .location');
            const ageEl = card.querySelector('.eventCardAudience, .audience, .age-range');

            if (titleEl && (dateEl || timeEl)) {
              const event = {
                title: titleEl.textContent.trim(),
                date: dateEl ? dateEl.textContent.trim() : '',
                time: timeEl ? timeEl.textContent.trim() : '',
                description: descEl ? descEl.textContent.trim() : '',
                url: linkEl ? (linkEl.href.startsWith('http') ? linkEl.href : new URL(linkEl.href, window.location.origin).href) : window.location.href,
                imageUrl: imageEl ? imageEl.src : '',
                location: locationEl ? locationEl.textContent.trim() : libName,
                ageRange: ageEl ? ageEl.textContent.trim() : '',
                venueName: libName
              };

              events.push(event);
            }
          } catch (e) {
            console.error('Error parsing event:', e);
          }
        });

        return events;
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
            platform: 'communico',
            state: '{{state}}'
          }
        });
      });

      await page.close();

      // Delay between libraries
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Error scraping ${library.name}:`, error.message);
    }
  }

  await browser.close();

  console.log(`\n📊 Total events found: ${events.length}`);

  return events;
}

async function saveToDatabase(events) {
  if (!admin.apps.length) {
    const serviceAccount = require('../../firebase-service-account.json');
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();
  const batch = db.batch();
  let count = 0;

  for (const event of events) {
    const eventId = `${SCRAPER_NAME}-${Date.now()}-${count}`;
    const docRef = db.collection('events').doc(eventId);
    batch.set(docRef, event);
    count++;

    if (count % 500 === 0) {
      await batch.commit();
      console.log(`   💾 Saved ${count} events...`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  console.log(`✅ Saved ${count} events to Firebase`);
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Communico Scraper - {{state}} (${LIBRARIES.length} libraries)  ║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);

  const events = await scrapeCommunicoEvents();

  if (events.length > 0) {
    await saveToDatabase(events);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { scrapeCommunicoEvents, saveToDatabase };
