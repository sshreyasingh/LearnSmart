const { chromium } = require('playwright');

// Detect if Playwright Chromium is installed by checking if executable path exists
let CHROMIUM_AVAILABLE = false;
try {
  const execPath = chromium.executablePath();
  CHROMIUM_AVAILABLE = require('fs').existsSync(execPath);
} catch {
  CHROMIUM_AVAILABLE = false;
}

if (!CHROMIUM_AVAILABLE) {
  console.warn('Playwright Chromium not found — web scraping will be skipped. Run: npx playwright install chromium');
}

const PAGE_TIMEOUT = 8000;
const MAX_CONCURRENCY = 5;

let browser = null;
let browserRefCount = 0;

const getBrowser = async () => {
  if (browser && browser.isConnected()) {
    browserRefCount++;
    return browser;
  }
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });
  browserRefCount = 1;
  return browser;
};

const closeBrowser = async () => {
  browserRefCount--;
  if (browserRefCount <= 0 && browser) {
    try { await browser.close(); } catch { /* ignore */ }
    browser = null;
    browserRefCount = 0;
  }
};

const searchYouTube = async (page, query) => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' tutorial')}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT }).catch(() => {});
  // Give YouTube a moment to render the initial results
  await page.waitForTimeout(1500);

  return page.evaluate(() => {
    const items = document.querySelectorAll('ytd-video-renderer');
    const out = [];
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const el = items[i];
      const titleEl = el.querySelector('a#video-title');
      const linkEl = el.querySelector('a#thumbnail');
      const channelEl = el.querySelector('ytd-channel-name a');
      if (titleEl && linkEl) {
        out.push({
          title: titleEl.textContent.trim(),
          url: 'https://www.youtube.com' + (linkEl.getAttribute('href') || ''),
          channel: channelEl ? channelEl.textContent.trim() : '',
        });
      }
    }
    return out;
  });
};

const scrapeTech = async (page, techName) => {
  const result = { technology: techName, youtube: [], error: null };
  try {
    result.youtube = await searchYouTube(page, techName);
  } catch {
    result.youtube = [];
  }
  return result;
};

/**
 * Scrape YouTube tutorials for multiple technologies in parallel.
 * Processes in batches of MAX_CONCURRENCY to avoid overwhelming the browser.
 * @param {string[]} techNames
 * @returns {Promise<object[]>}
 */
const scrapeTechsInParallel = async (techNames) => {
  if (!techNames || techNames.length === 0) return [];
  if (!CHROMIUM_AVAILABLE) return [];

  const unique = [...new Set(techNames.filter(Boolean).map((t) => t.trim()))];
  if (unique.length === 0) return [];

  const br = await getBrowser();
  const context = await br.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
  });

  // Stealth: override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const results = [];

  try {
    for (let i = 0; i < unique.length; i += MAX_CONCURRENCY) {
      const batch = unique.slice(i, i + MAX_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (tech) => {
          const page = await context.newPage();
          try {
            return await scrapeTech(page, tech);
          } finally {
            await page.close().catch(() => {});
          }
        })
      );
      results.push(...batchResults);
    }
  } finally {
    await context.close().catch(() => {});
    await closeBrowser();
  }

  return results;
};

module.exports = { scrapeTechsInParallel };
