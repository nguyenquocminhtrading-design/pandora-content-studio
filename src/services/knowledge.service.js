export function createKnowledgeService(database) {
  return {
    async search(query, limit = 5) {
      if (!database) return [];
      const result = await database.query(`SELECT id, title, content, source_type FROM knowledge_documents WHERE is_published = TRUE AND (content ILIKE $1 OR title ILIKE $1) ORDER BY updated_at DESC LIMIT $2`, [`%${query.slice(0, 80)}%`, limit]);
      return result.rows;
    },
    async upsert({ sourceType, sourceId, title, content, published = true }) {
      const db = database;
      if (!db) throw new Error('DATABASE_URL is not configured');
      const result = await db.query(`INSERT INTO knowledge_documents(source_type, source_id, title, content, is_published) VALUES($1,$2,$3,$4,$5) RETURNING *`, [sourceType, sourceId || null, title, content, published]);
      return result.rows[0];
    }
  };
}
