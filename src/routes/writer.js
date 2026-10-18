import express from 'express';
import { createCachedScraper } from '../scraper/cached-scraper.js';
import { createAiWriterService } from '../services/ai-writer.service.js';

export function createWriterRouter({ config }) {
  const router = express.Router();
  const cachedScraper = createCachedScraper();
  const aiWriter = createAiWriterService({ config });

  // 1. Get products list with search and collection support
  router.get('/products', async (req, res, next) => {
    try {
      const target = req.query.url || req.query.collection || 'all';
      const forceRefresh = req.query.refresh === 'true';
      const search = (req.query.search || '').trim().toLowerCase();

      let products;
      let stats;

      if (!forceRefresh) {
        const cachedProducts = await cachedScraper.cache.getAll();
        if (cachedProducts.length > 0) {
          products = cachedProducts;
          stats = { total: cachedProducts.length, cachedHits: cachedProducts.length, freshlyScraped: 0 };
        }
      }

      if (!products) {
        const result = await cachedScraper.scrapeAll(target, { forceRefresh });
        products = result.products;
        stats = result.stats;
      }

      if (search) {
        products = products.filter(p =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          (p.productType && p.productType.toLowerCase().includes(search)) ||
          p.tags.some(t => t.toLowerCase().includes(search))
        );
      }

      res.json({
        handle: target,
        stats,
        total: products.length,
        products // return full list so client can filter instantly
      });
    } catch (e) {
      next(e);
    }
  });

  // 2. Get specific product
  router.get('/product/:id', async (req, res, next) => {
    try {
      const collection = req.query.collection || 'fday';
      const { product, fromCache } = await cachedScraper.getProduct(req.params.id, collection);
      if (!product) return res.status(404).json({ error: 'product_not_found' });
      res.json({ product, fromCache });
    } catch (e) {
      next(e);
    }
  });

  // 3. Generate 3 copy formats using Local LLM Proxy
  router.post('/generate', async (req, res, next) => {
    try {
      const { productId, product: rawProduct, collection = 'fday', customNotes, customerName, apiKey, model } = req.body;

      let product = rawProduct;
      if (!product && productId) {
        const item = await cachedScraper.getProduct(productId, collection);
        product = item.product;
      }

      if (!product) {
        return res.status(400).json({ error: 'product_required', message: 'Vui lòng cung cấp productId hoặc thông tin sản phẩm' });
      }

      const copies = await aiWriter.generateCopies(product, {
        customNotes,
        customerName,
        apiKey,
        model
      });

      res.json({
        ok: true,
        productId: product.id,
        productTitle: product.title,
        copies
      });
    } catch (e) {
      next(e);
    }
  });

  // 4. Test connection to local LLM proxy (http://localhost:3001/v1)
  router.post('/test-connection', async (req, res) => {
    const proxyUrl = req.body.url || config.llm?.localUrl || 'http://localhost:3001/v1';
    const apiKey = req.body.apiKey || config.llm?.localApiKey || '';

    try {
      const headers = { 'content-type': 'application/json' };
      if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;

      const response = await fetch(`${proxyUrl}/models`, { headers });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(response.status).json({
          ok: false,
          status: response.status,
          message: data?.error?.message || response.statusText,
          data
        });
      }

      const models = data?.data?.map(m => m.id) || [];
      res.json({
        ok: true,
        status: 200,
        message: 'Kết nối thành công tới Local LLM Proxy!',
        modelsCount: models.length,
        models
      });
    } catch (err) {
      res.status(502).json({
        ok: false,
        message: `Không thể kết nối tới ${proxyUrl}: ${err.message}`
      });
    }
  });

  return router;
}
