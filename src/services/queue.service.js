export function createQueueService({ mode = 'inline', logger }) {
  const jobs = [];
  return {
    async add(name, payload, handler) {
      if (mode === 'inline') return handler(payload);
      jobs.push({ name, payload, createdAt: new Date().toISOString() });
      logger.info('Job queued', { name, queueSize: jobs.length });
      return { queued: true };
    },
    size() { return jobs.length; }
  };
}
