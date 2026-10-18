import * as cheerio from 'cheerio';

const BASE_URL = 'https://pandora.norbreeze.vn';
const LIMIT = 50; // Haravan server strictly caps at 50 products per request

/**
 * Normalizes raw Haravan product object to clean schema
 */
export function normalizeProduct(raw) {
  // Strip HTML tags from body_html
  const $ = cheerio.load(raw.body_html || '');
  const description = $.text().replace(/\s+/g, ' ').trim();

  // Price calculations across variants
  const prices = (raw.variants || [])
    .map(v => parseInt(v.price || '0', 10))
    .filter(p => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;

  const comparePrices = (raw.variants || [])
    .map(v => parseInt(v.compare_at_price || '0', 10))
    .filter(p => p > 0);
  const compareAtPrice = comparePrices.length ? Math.min(...comparePrices) : 0;

  const discountPct = compareAtPrice > minPrice
    ? Math.round((1 - minPrice / compareAtPrice) * 100)
    : 0;

  return {
    id: String(raw.id),
    title: raw.title || '',
    handle: raw.handle || '',
    description,
    bodyHtml: raw.body_html || '',
    vendor: raw.vendor || '',
    productType: raw.product_type || '',
    available: Boolean(raw.available),
    tags: Array.isArray(raw.tags)
      ? raw.tags
      : (raw.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    price: minPrice,
    compareAtPrice,
    discountPct,
    priceFormatted: formatVND(minPrice),
    images: (raw.images || []).map(img => img.src).filter(Boolean),
    mainImage: raw.image?.src || raw.images?.[0]?.src || null,
    url: `${BASE_URL}/products/${raw.handle}`,
    variants: (raw.variants || []).map(v => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price: parseInt(v.price || '0', 10),
      compareAtPrice: parseInt(v.compare_at_price || '0', 10),
      available: Boolean(v.available),
      options: [v.option1, v.option2, v.option3].filter(Boolean)
    })),
    scrapedAt: new Date().toISOString()
  };
}

export function formatVND(amount) {
  if (!amount) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Scrapes all products from Haravan collection via JSON endpoint
 */
export async function scrapeCollectionViaApi(collectionHandle, fetchImpl = fetch) {
  const products = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/collections/${collectionHandle}/products.json?limit=${LIMIT}&page=${page}`;
    const res = await fetchImpl(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`Haravan API HTTP error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      break;
    }

    const normalized = data.products.map(normalizeProduct);
    products.push(...normalized);

    if (data.products.length < LIMIT) {
      // Reached the last page
      break;
    }
    page++;
  }

  return products;
}
