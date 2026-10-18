import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractCollectionHandle } from '../src/scraper/index.js';
import { normalizeProduct } from '../src/scraper/haravan.scraper.js';

test('extractCollectionHandle parses various URL formats and plain handles', () => {
  const urlWithQuery = 'https://pandora.norbreeze.vn/collections/fday?utm_source=Google&utm_medium=CPC';
  assert.equal(extractCollectionHandle(urlWithQuery), 'fday');

  const urlTrailingSlash = 'https://pandora.norbreeze.vn/collections/charms/';
  assert.equal(extractCollectionHandle(urlTrailingSlash), 'charms');

  const plainHandle = 'best-seller-1';
  assert.equal(extractCollectionHandle(plainHandle), 'best-seller-1');

  const empty = '';
  assert.equal(extractCollectionHandle(empty), 'fday');
});

test('normalizeProduct extracts clean fields, formats prices, and strips HTML', () => {
  const rawProduct = {
    id: 1051007336,
    title: 'Vòng Tay Bạc Pandora Moments',
    handle: 'vong-bac-pandora-moments',
    body_html: '<p>Tình yêu <strong>bắt đầu</strong> từ chính bạn.</p><div>Mã sản phẩm: 590719</div>',
    vendor: 'Pandora Moments',
    product_type: 'Vòng Mềm',
    available: true,
    tags: 'Vongtay, metal:Bạc, label:HOT',
    images: [
      { src: 'https://cdn.hstatic.net/img1.png', position: 1 },
      { src: 'https://cdn.hstatic.net/img2.png', position: 2 }
    ],
    variants: [
      { id: 11, sku: 'SKU-16', price: '2399000', compare_at_price: '2999000', available: true, option1: 'Bạc', option2: '16' },
      { id: 12, sku: 'SKU-17', price: '2399000', compare_at_price: '2999000', available: false, option1: 'Bạc', option2: '17' }
    ]
  };

  const normalized = normalizeProduct(rawProduct);

  assert.equal(normalized.id, '1051007336');
  assert.equal(normalized.title, 'Vòng Tay Bạc Pandora Moments');
  assert.equal(normalized.handle, 'vong-bac-pandora-moments');
  assert.match(normalized.description, /Tình yêu bắt đầu từ chính bạn/);
  assert.equal(normalized.description.includes('<p>'), false);
  assert.equal(normalized.price, 2399000);
  assert.equal(normalized.compareAtPrice, 2999000);
  assert.equal(normalized.discountPct, 20);
  assert.equal(normalized.available, true);
  assert.deepEqual(normalized.tags, ['Vongtay', 'metal:Bạc', 'label:HOT']);
  assert.equal(normalized.mainImage, 'https://cdn.hstatic.net/img1.png');
  assert.equal(normalized.images.length, 2);
  assert.equal(normalized.variants.length, 2);
  assert.equal(normalized.variants[0].sku, 'SKU-16');
});
