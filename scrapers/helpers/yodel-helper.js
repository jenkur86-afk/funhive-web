/**
 * YODEL EVENTS HELPER
 *
 * Handles scraping MacaroniKid sites that have migrated to the Yodel events platform.
 * Yodel replaces the old MK event format (hex-ID links at /events/calendar) with a
 * cross-origin iframe widget from events.yodel.today.
 *
 * Detection: <body data-yenabled="1" data-yid="{widget_id}">
 * Widget URL: https://events.yodel.today/y/widget/{yid}
 * Event URLs: /y/event/{Venue-Name}/{Event-Title}/{hex_id}
 * Event pages contain JSON-LD (schema.org/Event) with full structured data.
 *
 * Usage in MK scrapers:
 *   const { detectYodel, scrapeYodelEventUrls, extractYodelEventDetails } = require('./helpers/yodel-helper');
 *
 *   // In scrapeSite(), after extractEventUrls returns 0:
 *   const yid = await detectYodel(page);
 *   if (yid) {
 *     const urls = await scrapeYodelEventUrls(page, yid);
 *     for (const url of urls) {
 *       const details = await extractYodelEventDetails(page, url);
 *       // details has same shape as extractEventDetails output
 *     }
 *   }
 */

/**
 * Detect if the current page uses the Yodel events platform.
 * Checks <body> for data-yenabled="1" and data-yid attributes.
 * @param {import('puppeteer').Page} page - Puppeteer page on a MK calendar page
 * @returns {Promise<string|null>} The yid (widget ID) if Yodel is active, null otherwise
 */
async function detectYodel(page) {
  return await page.evaluate(() => {
    const body = document.body;
    if (!body) return null;
    const yEnabled = body.getAttribute('data-yenabled');
    const yid = body.getAttribute('data-yid');
    if (yEnabled === '1' && yid && yid.length > 10) return yid;
    // Also check for Yodel iframe as fallback detection
    const yodelIframe = document.querySelector('iframe[src*="yodel.today"]');
    if (yodelIframe) {
      const src = yodelIframe.src || '';
      const match = src.match(/\/y\/widget\/([a-f0-9]+)/);
      if (match) return match[1];
    }
    return null;
  });
}

/**
 * Scrape event URLs from a Yodel widget page, handling "Load More Events" pagination.
 * Navigates the given page to the widget URL and collects all event links.
 * @param {import('puppeteer').Page} page - Puppeteer page to use
 * @param {string} yid - Yodel widget ID
 * @param {number} maxLoadMore - Maximum number of "Load More" clicks (default 20)
 * @returns {Promise<string[]>} Array of full Yodel event URLs
 */
async function scrapeYodelEventUrls(page, yid, maxLoadMore = 20) {
  const widgetUrl = `https://events.yodel.today/y/widget/${yid}`;

  await page.goto(widgetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  // Wait for event links to render
  await page.waitForSelector('a[href*="/y/event/"]', { timeout: 15000 }).catch(() => {});

  // Click "Load More Events" button repeatedly to load all events
  for (let i = 0; i < maxLoadMore; i++) {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loadMore = buttons.find(b => /load\s*more/i.test(b.textContent));
      if (loadMore && loadMore.offsetParent !== null) {
        loadMore.click();
        return true;
      }
      return false;
    });

    if (!clicked) break;
    // Wait for new events to load
    await new Promise(resolve => setTimeout(resolve, 2500));
  }

  // Collect all unique event URLs
  const eventUrls = await page.evaluate(() => {
    const hrefs = new Set();
    document.querySelectorAll('a[href*="/y/event/"]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.match(/\/y\/event\/[^/]+\/[^/]+\/[a-f0-9]{24}$/)) {
        hrefs.add('https://events.yodel.today' + href);
      }
    });
    return Array.from(hrefs);
  });

  return eventUrls;
}

/**
 * Extract event details from a Yodel event page using JSON-LD structured data.
 * Returns an object with the same shape as the MK scraper's extractEventDetails().
 * @param {import('puppeteer').Page} page - Puppeteer page to use
 * @param {string} url - Full Yodel event URL
 * @returns {Promise<object|null>} Event details or null on failure
 */
async function extractYodelEventDetails(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 500));

    return await page.evaluate((eventUrl) => {
      const result = {
        name: '',
        eventDate: '',
        dayOfWeek: '',
        time: '',
        venue: '',
        address: '',
        city: '',
        zipCode: '',
        phone: '',
        cost: 'Contact for pricing',
        ageRange: 'All Ages',
        description: '',
        moreInfo: '',
        _yodelUrl: eventUrl  // Preserve original Yodel URL for reference
      };

      // Try JSON-LD first (most reliable)
      const ldScript = document.querySelector('script[type="application/ld+json"]');
      if (ldScript) {
        try {
          const ld = JSON.parse(ldScript.textContent);

          result.name = ld.name || '';
          result.description = ld.description || '';

          // Parse dates from ISO format
          if (ld.startDate) {
            const start = new Date(ld.startDate);
            const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

            result.eventDate = `${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()}`;
            result.dayOfWeek = days[start.getDay()];

            // Determine time — prefer page text, detect all-day events
            const pageText = document.body.innerText || '';

            // Check if page explicitly says "All Day" or shows multi-day span
            const isAllDayText = /\bAll\s*Day\b/i.test(pageText);
            const isMultiDay = ld.endDate && (new Date(ld.endDate) - start) > 24 * 60 * 60 * 1000;

            // Check for early-morning UTC times that indicate midnight local time (all-day)
            const hours = start.getUTCHours();
            const isLikelyMidnightUTC = hours >= 3 && hours <= 5 && start.getUTCMinutes() <= 5;

            if (isAllDayText || (isMultiDay && isLikelyMidnightUTC)) {
              result.time = 'All Day';
            } else {
              // Extract time from page text (more reliable than UTC conversion)
              const timeMatch = pageText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)(?:\s*(?:[-–]\s*\d{1,2}:\d{2}\s*(?:AM|PM)))?)/i);
              if (timeMatch) {
                result.time = timeMatch[1].trim();
              } else if (isAllDayText || isLikelyMidnightUTC) {
                result.time = 'All Day';
              }
            }
          }

          // Parse location
          const loc = ld.location || {};
          const addr = loc.address || {};

          // addressLocality, postalCode, addressRegion are separate fields
          result.city = addr.addressLocality || '';
          result.zipCode = addr.postalCode || '';
          // Store state from JSON-LD (may differ from scraper's site.state for cross-border events)
          if (addr.addressRegion) result._state = addr.addressRegion;

          // streetAddress often contains the full address: "123 Main St, City, ST 12345, USA"
          // Extract just the street portion, stripping country suffix
          const fullStreet = (addr.streetAddress || '').replace(/,\s*USA\s*$/i, '');
          if (fullStreet) {
            const parts = fullStreet.split(',').map(p => p.trim());
            result.address = parts[0]; // First part is the street address

            // If addressLocality wasn't set, get city from the second part
            if (!result.city && parts.length >= 2) {
              // Second part is city, but verify it's not the state+zip
              const maybeCityPart = parts[1];
              if (maybeCityPart && !/^[A-Z]{2}\s+\d{5}/.test(maybeCityPart)) {
                result.city = maybeCityPart;
              }
            }

            // If zipCode wasn't set, try to extract from parts
            if (!result.zipCode) {
              for (const part of parts) {
                const zipMatch = part.match(/\b(\d{5})(?:-\d{4})?\b/);
                if (zipMatch) {
                  result.zipCode = zipMatch[1];
                  break;
                }
              }
            }
          }

          // Venue: prefer location.name (physical venue), fall back to organizer.name
          // The URL path also encodes the venue: /y/event/{Venue-Name}/{Title}/{id}
          result.venue = loc.name || '';
          if (!result.venue && ld.organizer && ld.organizer.name) {
            result.venue = ld.organizer.name;
          }
          // Extract venue from URL path as additional fallback
          if (!result.venue) {
            const pathMatch = eventUrl.match(/\/y\/event\/([^/]+)\//);
            if (pathMatch) {
              result.venue = decodeURIComponent(pathMatch[1]).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            }
          }
          // Also check "Promoted By:" text on page for venue
          if (!result.venue) {
            const pageText = document.body.innerText || '';
            const promotedMatch = pageText.match(/Promoted\s+By:\s*(.+?)(?:\n|$)/i);
            if (promotedMatch) result.venue = promotedMatch[1].trim();
          }
        } catch (parseErr) {
          // JSON-LD parse failed, fall through to text-based extraction
        }
      }

      // If JSON-LD didn't provide data, fall back to page text parsing
      if (!result.name) {
        const h1 = document.querySelector('h1');
        if (h1) result.name = h1.textContent.trim();
      }

      // Extract age/who information from page text and Event Tags
      const fullPageText = document.body.innerText || '';

      // 1. Check Event Tags for age info (Yodel-specific: "ages 0-3", "birth to 12 months", etc.)
      const tagsMatch = fullPageText.match(/Event Tags:\s*(.+?)(?:Event Categories|Event ID|Report)/s);
      if (tagsMatch) {
        const tags = tagsMatch[1].trim();
        // Look for age patterns in tags
        const tagAgeMatch = tags.match(/\bages?\s+(\d+\s*[-–]\s*\d+)/i)
          || tags.match(/\b(\d+\s*[-–]\s*\d+)\s*(?:years?|yrs?|months?|mos?)?\b/i)
          || tags.match(/\b(birth\s+to\s+\d+\s*(?:months?|years?|yrs?)?)/i)
          || tags.match(/\b(all\s+ages)\b/i);
        if (tagAgeMatch) {
          result.ageRange = tagAgeMatch[1].trim();
        }
      }

      // 2. Check Event Categories (Yodel-specific)
      const catsMatch = fullPageText.match(/Event Categories:\s*(.+?)(?:Event ID|Event Tags|Report)/s);
      if (catsMatch) {
        result._yodelCategory = catsMatch[1].trim();
      }

      // 3. Look for age in event name and description
      if (result.ageRange === 'All Ages') {
        const combinedText = `${result.name} ${result.description}`;
        const agePatterns = [
          /\bfor\s+ages?\s+(\d+\s*[-–]\s*\d+)/i,
          /\bages?\s+(\d+\s*[-–]\s*\d+)/i,
          /\(ages?\s+(\d+\s*[-–]\s*\d+)\)/i,
          /\((\d+\s*[-–]\s*\d+)\s*(?:years?|yrs?)?\)/i,
          /\bbirth\s+to\s+(\d+\s*(?:months?|years?|yrs?)?)/i
        ];
        for (const pat of agePatterns) {
          const match = combinedText.match(pat);
          if (match) {
            result.ageRange = match[1].trim();
            break;
          }
        }
      }

      // 4. Check for "Who" section (old MK format — rare on Yodel but possible)
      const whoMatch = fullPageText.match(/(?:^|\n)\s*Who\s*[:\n]\s*(.+?)(?:\n|Cost|More Info|Add to|$)/i);
      if (whoMatch && result.ageRange === 'All Ages') {
        result.ageRange = whoMatch[1].trim();
      }

      // Extract cost — check for "Buy Tickets" link, "Free" mention, or "Cost" section
      if (/\bBuy\s*Tickets\b/i.test(fullPageText)) {
        result.cost = 'See website for tickets';
      } else if (/\bfree\b/i.test(result.description || '')) {
        result.cost = 'Free';
      }
      const costMatch = fullPageText.match(/(?:^|\n)\s*Cost\s*[:\n]\s*(.+?)(?:\n|How|More Info|Add to|ADVERTISEMENTS|$)/i);
      if (costMatch) {
        let costText = costMatch[1].trim();
        if (costText.length > 150) {
          costText = costText.substring(0, costText.lastIndexOf(' ', 150)) + '...';
        }
        result.cost = costText;
      }

      return result;
    }, url);
  } catch (error) {
    console.log(`  ⚠️ Failed to extract Yodel event: ${url} — ${error.message}`);
    return null;
  }
}

module.exports = { detectYodel, scrapeYodelEventUrls, extractYodelEventDetails };
