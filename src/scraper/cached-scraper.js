import { scrapeCollection, extractCollectionHandle } from './index.js';
import { createProductCache } from './cache.js';

export function createCachedScraper(options = {}) {
  const cache = createProductCache(options.cache || {});
  const logger = options.logger || console;

  return {
    cache,

    /**
     * Scrape an entire collection, checking each product against cache.
     * Only fresh/missing products update the cache.
     * @param {string} input - Collection handle or full URL
     * @param {object} scrapeOptions
     * @returns {Promise<{ products: Array, stats: { total: number, cachedHits: number, freshlyScraped: number } }>}
     */
    async scrapeAll(input, scrapeOptions = {}) {
      const handle = extractCollectionHandle(input);
      const forceRefresh = Boolean(scrapeOptions.forceRefresh);

      if (forceRefresh) {
        logger.info(`[cached-scraper] Force refresh requested for "${handle}".`);
      }

      // Step 1: Scrape collection products from source
      const freshProducts = await scrapeCollection(handle, { ...scrapeOptions, logger });

      if (forceRefresh) {
        // Cache all freshly retrieved products
        await Promise.all(freshProducts.map(p => cache.set(p.id, p)));
        return {
          handle,
          products: freshProducts,
          stats: {
            total: freshProducts.length,
            cachedHits: 0,
            freshlyScraped: freshProducts.length
          }
        };
      }

      // Step 2: Check cache for already existing products
      const productIds = freshProducts.map(p => p.id);
      const { cached, missingIds } = await cache.partition(productIds);

      const cachedMap = new Map(cached.map(p => [p.id, p]));
      const missingIdSet = new Set(missingIds);

      // Step 3: Save newly seen products to cache
      const freshlyAdded = freshProducts.filter(p => missingIdSet.has(p.id));
      await Promise.all(freshlyAdded.map(p => cache.set(p.id, p)));

      // Step 4: Merge results (preserve fresh variants/status or cached details)
      const merged = freshProducts.map(fresh => {
        if (cachedMap.has(fresh.id)) {
          return {
            ...cachedMap.get(fresh.id),
            // Still update real-time stock availability from latest fetch
            available: fresh.available,
            price: fresh.price,
            priceFormatted: fresh.priceFormatted,
            lastCheckedAt: new Date().toISOString()
          };
        }
        return fresh;
      });

      const stats = {
        total: merged.length,
        cachedHits: cached.length,
        freshlyScraped: freshlyAdded.length
      };

      logger.info(`[cached-scraper] Collection "${handle}" result: ${stats.total} total (${stats.cachedHits} from cache, ${stats.freshlyScraped} new).`);

      return {
        handle,
        products: merged,
        stats
      };
    },

    /**
     * Get a single product by ID from cache or scrape collection if not found.
     */
    async getProduct(productId, collectionHandle = 'fday', scrapeOptions = {}) {
      const cached = await cache.get(productId);
      if (cached) {
        return { product: cached, fromCache: true };
      }

      const { products } = await this.scrapeAll(collectionHandle, scrapeOptions);
      const found = products.find(p => p.id === String(productId));

      return {
        product: found || null,
        fromCache: false
      };
    }
  };
}
