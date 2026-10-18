import express from 'express';
import { verifySignature } from './middleware/signature.js';
import { createWebhookRouter } from './routes/webhook.js';
import { createAdminRouter } from './routes/admin.js';
import { createWriterRouter } from './routes/writer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function createApp({ config, botRouter, zalo, logger, database, knowledge }) {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(root, '..', 'public');
  app.use(express.json({ verify: (req, _res, buffer) => { req.rawBody = buffer; } }));

  // Phuc vu truc tiep giao dien Pandora Studio khi vao trang chu /
  app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'writer.html')));
  app.get('/writer', (_req, res) => res.sendFile(path.join(publicDir, 'writer.html')));
  app.get('/writer.html', (_req, res) => res.sendFile(path.join(publicDir, 'writer.html')));
  app.get('/api/status', (_req, res) => res.json({ name: config.bot.name, status: 'running' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  app.get('/ready', async (_req, res) => { try { if (database) await database.ping(); res.json({ status: 'ready' }); } catch (error) { res.status(503).json({ status: 'not_ready', error: error.message }); } });

  app.use(express.static(publicDir));
  app.use('/admin', express.static(publicDir));
  app.use('/public', express.static(publicDir));
  app.post('/webhook', verifySignature({ secret: config.zalo.appSecret, headerName: config.zalo.signatureHeader }), createWebhookRouter({ botRouter, zalo, logger }));
  app.use('/api/admin', createAdminRouter({ config, database, knowledge }));
  app.use('/api/writer', createWriterRouter({ config }));
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ error: error.message || 'internal_error' }));
  return app;
}
