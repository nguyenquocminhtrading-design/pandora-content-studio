import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'fs/promises';
import { createProductCache } from '../src/scraper/cache.js';

const TEST_CACHE_DIR = './cache/test_products';

test('createProductCache set, get, partition, and invalidate', async () => {
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  const cache = createProductCache({ cacheDir: TEST_CACHE_DIR, ttl: 5000 });

  // 1. Initial get should return null
  const empty = await cache.get('prod_1');
  assert.equal(empty, null);

  // 2. Set product
  const mockProduct = { id: 'prod_1', title: 'Ring' };
  await cache.set('prod_1', mockProduct);

  const fetched = await cache.get('prod_1');
  assert.deepEqual(fetched, mockProduct);

  // 3. Partition check
  const { cached, missingIds } = await cache.partition(['prod_1', 'prod_2']);
  assert.equal(cached.length, 1);
  assert.equal(cached[0].id, 'prod_1');
  assert.deepEqual(missingIds, ['prod_2']);

  // 4. Invalidate
  await cache.invalidate('prod_1');
  const afterInvalidate = await cache.get('prod_1');
  assert.equal(afterInvalidate, null);

  // Clean up
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});

test('createProductCache respects TTL expiration', async () => {
  const cache = createProductCache({ cacheDir: TEST_CACHE_DIR, ttl: 50 }); // 50ms TTL
  await cache.set('quick_expire', { id: 'quick_expire', title: 'Quick' });

  // Immediately available
  const hit = await cache.get('quick_expire');
  assert.ok(hit);

  // Wait for TTL to pass
  await new Promise(r => setTimeout(r, 60));

  const expired = await cache.get('quick_expire');
  assert.equal(expired, null);

  // Clean up
  await rm(TEST_CACHE_DIR, { recursive: true, force: true });
});
