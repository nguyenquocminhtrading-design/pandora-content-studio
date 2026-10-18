import express from 'express';
import { requireDatabase } from '../services/database.service.js';
import { createCachedScraper } from '../scraper/cached-scraper.js';

function auth(config) {
  return (req, res, next) => {
    if (!config.adminApiKey || req.headers.authorization !== `Bearer ${config.adminApiKey}`) return res.status(401).json({ error: 'unauthorized' });
    next();
  };
}

export function createAdminRouter({ config, database, knowledge }) {
  const router = express.Router();
  router.use(auth(config));
  router.get('/products', async (_req, res, next) => { try { const db = requireDatabase(database); const result = await db.query('SELECT * FROM products ORDER BY updated_at DESC'); res.json(result.rows); } catch (e) { next(e); } });
  router.post('/products', async (req, res, next) => { try { const db = requireDatabase(database); const { name, description = '', price = '', stockStatus = 'unknown' } = req.body; if (!name) return res.status(400).json({ error: 'name_required' }); const result = await db.query('INSERT INTO products(name, description, price, stock_status) VALUES($1,$2,$3,$4) RETURNING *', [name, description, price, stockStatus]); res.status(201).json(result.rows[0]); } catch (e) { next(e); } });
  router.get('/faqs', async (_req, res, next) => { try { const db = requireDatabase(database); const result = await db.query('SELECT * FROM faqs ORDER BY updated_at DESC'); res.json(result.rows); } catch (e) { next(e); } });
  router.post('/faqs', async (req, res, next) => { try { const db = requireDatabase(database); const { question, answer, category = 'general' } = req.body; if (!question || !answer) return res.status(400).json({ error: 'question_and_answer_required' }); const result = await db.query('INSERT INTO faqs(question, answer, category) VALUES($1,$2,$3) RETURNING *', [question, answer, category]); if (knowledge) await knowledge.upsert({ sourceType: 'faq', sourceId: result.rows[0].id, title: question, content: answer }); res.status(201).json(result.rows[0]); } catch (e) { next(e); } });
  router.get('/leads', async (_req, res, next) => { try { const db = requireDatabase(database); const result = await db.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200'); res.json(result.rows); } catch (e) { next(e); } });
  router.get('/analytics', async (_req, res, next) => { try { const db = requireDatabase(database); const [messages, leads, handoffs] = await Promise.all([db.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE direction='inbound')::int AS inbound, COUNT(*) FILTER (WHERE sender_type='bot')::int AS bot_messages FROM messages"), db.query("SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('new','qualified'))::int AS open FROM leads"), db.query("SELECT COUNT(*)::int AS total FROM conversations WHERE status IN ('waiting_human','assigned')")]); res.json({ messages: messages.rows[0], leads: leads.rows[0], handoffs: handoffs.rows[0] }); } catch (e) { next(e); } });
  router.post('/conversations/:id/handoff', async (req, res, next) => { try { const db = requireDatabase(database); const result = await db.query("UPDATE conversations SET status='waiting_human', assigned_agent=$1 WHERE id=$2 RETURNING *", [req.body.agent || null, req.params.id]); res.json(result.rows[0] || null); } catch (e) { next(e); } });
  router.post('/leads', async (req, res, next) => { try { const db = requireDatabase(database); const { userId = null, conversationId = null, name = null, phone = null, email = null, score = 0 } = req.body; const result = await db.query('INSERT INTO leads(user_id,conversation_id,name,phone,email,score) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [userId, conversationId, name, phone, email, score]); res.status(201).json(result.rows[0]); } catch (e) { next(e); } });
  router.get('/conversations', async (_req, res, next) => { try { const db = requireDatabase(database); const result = await db.query('SELECT c.*, u.zalo_user_id, u.display_name FROM conversations c JOIN users u ON u.id = c.user_id ORDER BY c.last_message_at DESC LIMIT 200'); res.json(result.rows); } catch (e) { next(e); } });

  // Scraper & Cache Endpoints
  const cachedScraper = createCachedScraper();

  router.get('/scraper/products', async (req, res, next) => {
    try {
      const target = req.query.url || req.query.collection || 'fday';
      const forceRefresh = req.query.refresh === 'true';
      const result = await cachedScraper.scrapeAll(target, { forceRefresh });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/scraper/product/:id', async (req, res, next) => {
    try {
      const collection = req.query.collection || 'fday';
      const result = await cachedScraper.getProduct(req.params.id, collection);
      if (!result.product) return res.status(404).json({ error: 'product_not_found' });
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post('/scraper/cache/purge', async (_req, res, next) => {
    try {
      const purged = await cachedScraper.cache.purgeExpired();
      res.json({ ok: true, purgedCount: purged });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
