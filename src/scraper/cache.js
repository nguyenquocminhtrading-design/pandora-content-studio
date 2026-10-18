import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

const DEFAULT_CACHE_DIR = './cache/products';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createProductCache(options = {}) {
  const cacheDir = options.cacheDir || DEFAULT_CACHE_DIR;
  const ttlMs = options.ttl ?? DEFAULT_TTL_MS;

  function cacheFilePath(productId) {
    const hash = createHash('md5').update(String(productId)).digest('hex');
    return join(cacheDir, `${hash}.json`);
  }

  return {
    /**
     * Get a product from cache if it exists and hasn't expired.
     */
    async get(productId) {
      const filePath = cacheFilePath(productId);
      try {
        const raw = await readFile(filePath, 'utf-8');
        const entry = JSON.parse(raw);

        const age = Date.now() - new Date(entry.cachedAt).getTime();
        if (age > ttlMs) {
          return null; // Expired
        }
        return entry.data;
      } catch {
        return null;
      }
    },

    /**
     * Save product data into cache.
     */
    async set(productId, data) {
      await mkdir(cacheDir, { recursive: true });
      const filePath = cacheFilePath(productId);
      const entry = {
        cachedAt: new Date().toISOString(),
        id: String(productId),
        data
      };
      await writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    },

    /**
     * Check multiple product IDs against cache.
     * Returns { cached: Product[], missingIds: string[] }
     */
    async partition(productIds) {
      const cached = [];
      const missingIds = [];

      await Promise.all(
        productIds.map(async (id) => {
          const item = await this.get(id);
          if (item) {
            cached.push(item);
          } else {
            missingIds.push(String(id));
          }
        })
      );

      return { cached, missingIds };
    },

    /**
     * Invalidate/remove specific product from cache
     */
    async invalidate(productId) {
      const filePath = cacheFilePath(productId);
      try {
        await unlink(filePath);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Remove all expired cache items
     */
    async purgeExpired() {
      try {
        const files = await readdir(cacheDir);
        let count = 0;
        await Promise.all(
          files.map(async (file) => {
            const fp = join(cacheDir, file);
            try {
              const raw = await readFile(fp, 'utf-8');
              const entry = JSON.parse(raw);
              const age = Date.now() - new Date(entry.cachedAt).getTime();
              if (age > ttlMs) {
                await unlink(fp);
                count++;
              }
            } catch {
              // Ignore corrupt/invalid file
            }
          })
        );
        return count;
      } catch {
        return 0;
      }
    },

    /**
     * Get all currently cached products directly from disk.
     */
    async getAll() {
      try {
        const files = await readdir(cacheDir);
        const products = [];
        await Promise.all(
          files.map(async (file) => {
            if (!file.endsWith('.json')) return;
            const fp = join(cacheDir, file);
            try {
              const raw = await readFile(fp, 'utf-8');
              const entry = JSON.parse(raw);
              if (entry && entry.data) {
                products.push(entry.data);
              }
            } catch {
              // Ignore corrupt file
            }
          })
        );
        return products;
      } catch {
        return [];
      }
    }
  };
}
