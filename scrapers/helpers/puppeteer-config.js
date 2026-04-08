/**
 * Puppeteer Configuration Helper
 *
 * Configures Puppeteer to work in both local and Cloud Functions environments
 * Uses puppeteer-extra with stealth plugin to avoid bot detection
 */

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteerCore = require('puppeteer-core');

// Add stealth plugin to avoid bot detection
puppeteerExtra.use(StealthPlugin());

// Random user agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

/**
 * Get a random user agent
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Get Puppeteer launch configuration based on environment
 * Uses stealth plugin to avoid bot detection
 *
 * @param {Object} options - Launch options
 * @param {boolean} options.stealth - Use stealth mode (default: true)
 * @returns {Promise<Object>} Puppeteer browser instance
 */
async function launchBrowser(options = {}) {
  const { stealth = true } = options;
  const isCloudFunction = process.env.FUNCTION_NAME || process.env.K_SERVICE;

  // Enhanced args to avoid detection
  const stealthArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1920,1080',
    '--start-maximized'
  ];

  if (isCloudFunction) {
    // Cloud Functions environment - use @sparticuz/chromium
    const chromium = require('@sparticuz/chromium');

    // Use puppeteer-extra in cloud if stealth is needed
    if (stealth) {
      return await puppeteerExtra.launch({
        args: [...chromium.args, ...stealthArgs],
        defaultViewport: { width: 1920, height: 1080 },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true
      });
    } else {
      return await puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }
  } else {
    // Local environment - use system Chrome with stealth
    if (stealth) {
      return await puppeteerExtra.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        args: stealthArgs,
        ignoreHTTPSErrors: true
      });
    } else {
      return await puppeteerCore.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
  }
}

/**
 * Create a new page with anti-detection measures
 *
 * @param {Object} browser - Puppeteer browser instance
 * @returns {Promise<Object>} Page with anti-detection measures
 */
async function createStealthPage(browser) {
  const page = await browser.newPage();

  // Set random user agent
  await page.setUserAgent(getRandomUserAgent());

  // Set extra headers to look more human
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  });

  // Override navigator properties to avoid detection
  await page.evaluateOnNewDocument(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });

    // Add chrome object
    window.chrome = { runtime: {} };
  });

  return page;
}

module.exports = { launchBrowser, createStealthPage, getRandomUserAgent };
