import { scrapeCollectionViaApi } from './haravan.scraper.js';
import { scrapeCollectionViaPlaywright } from './playwright.scraper.js';

/**
 * Extracts collection handle from a raw input which could be a handle name or a full URL.
 * Example: "https://pandora.norbreeze.vn/collections/fday?utm_source=Google..." -> "fday"
 */
export function extractCollectionHandle(input) {
  if (!input) return 'fday';
  if (!input.includes('/') && !input.includes('.')) {
    return input.trim();
  }

  try {
    const url = new URL(input.startsWith('http') ? input : `https://${input}`);
    const match = url.pathname.match(/\/collections\/([^/?#]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Fallback regex if URL constructor fails
    const match = input.match(/\/collections\/([^/?#]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return input.trim();
}

/**
 * Scrapes collection with automatic fallback to Playwright on network failure or block.
 */
export async function scrapeCollection(input, options = {}) {
  const collectionHandle = extractCollectionHandle(input);
  const { fetchImpl = fetch, usePlaywright = false, logger = console } = options;

  if (usePlaywright) {
    logger.info(`[scraper] Scraping collection "${collectionHandle}" using Playwright directly...`);
    return scrapeCollectionViaPlaywright(collectionHandle, options);
  }

  try {
    logger.info(`[scraper] Attempting API scrape for collection "${collectionHandle}"...`);
    const products = await scrapeCollectionViaApi(collectionHandle, fetchImpl);
    logger.info(`[scraper] Successfully scraped ${products.length} products via API.`);
    return products;
  } catch (error) {
    logger.warn(`[scraper] API scraping failed (${error.message}). Falling back to Playwright...`);
    try {
      const fallbackProducts = await scrapeCollectionViaPlaywright(collectionHandle, options);
      logger.info(`[scraper] Playwright fallback succeeded: ${fallbackProducts.length} products retrieved.`);
      return fallbackProducts;
    } catch (fallbackError) {
      logger.error(`[scraper] Playwright fallback also failed: ${fallbackError.message}`);
      throw new Error(`Scraper failed on both API and Playwright fallback. API error: ${error.message}; Playwright error: ${fallbackError.message}`);
    }
  }
}
