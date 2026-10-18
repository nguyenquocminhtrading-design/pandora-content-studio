import { normalizeProduct } from './haravan.scraper.js';

const BASE_URL = 'https://pandora.norbreeze.vn';

/**
 * Fallback scraper using Playwright to handle cases where standard HTTP requests are blocked or dynamic challenges occur.
 */
export async function scrapeCollectionViaPlaywright(collectionHandle, options = {}) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    throw new Error(`Playwright is not installed or available: ${err.message}. Run 'npm i playwright' to enable browser fallback.`);
  }

  const { chromium } = playwright;
  const timeout = options.timeout || 30000;
  const headless = options.headless !== undefined ? options.headless : true;

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const products = [];
  let pageNum = 1;

  try {
    while (true) {
      const page = await context.newPage();
      let capturedProducts = null;

      // Intercept Haravan products.json calls
      page.on('response', async (response) => {
        try {
          const url = response.url();
          if (url.includes('/products.json')) {
            const json = await response.json().catch(() => null);
            if (json && Array.isArray(json.products)) {
              capturedProducts = json.products;
            }
          }
        } catch {
          // ignore stream already read errors
        }
      });

      const targetUrl = `${BASE_URL}/collections/${collectionHandle}/products.json?limit=50&page=${pageNum}`;
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout }).catch(() => null);

      if (response && response.ok()) {
        try {
          const text = await response.text();
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.products)) {
            capturedProducts = parsed.products;
          }
        } catch {
          // Response body was not raw JSON or intercepted above
        }
      }

      // If direct JSON request via browser didn't yield products, try visiting collection page
      if (!capturedProducts) {
        await page.goto(`${BASE_URL}/collections/${collectionHandle}?page=${pageNum}`, { waitUntil: 'networkidle', timeout }).catch(() => null);
        // Wait briefly for any background fetch
        await page.waitForTimeout(2000);
      }

      if (!capturedProducts || capturedProducts.length === 0) {
        await page.close();
        break;
      }

      const normalized = capturedProducts.map(normalizeProduct);
      products.push(...normalized);

      await page.close();

      if (capturedProducts.length < 50) {
        break; // Reached last page
      }
      pageNum++;
    }
  } finally {
    await browser.close();
  }

  return products;
}
