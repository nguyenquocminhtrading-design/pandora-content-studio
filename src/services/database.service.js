import pg from 'pg';

export function createDatabaseService(config, logger) {
  if (!config.databaseUrl) return null;
  const pool = new pg.Pool({ connectionString: config.databaseUrl, ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined, max: 5 });
  return {
    pool,
    async query(text, values) { return pool.query(text, values); },
    async close() { await pool.end(); },
    async ping() { await pool.query('SELECT 1'); return true; }
  };
}

export function requireDatabase(database) {
  if (!database) throw Object.assign(new Error('DATABASE_URL is not configured'), { statusCode: 503 });
  return database;
}
