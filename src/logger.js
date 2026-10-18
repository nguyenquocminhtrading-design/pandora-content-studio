function safeMeta(meta = {}) {
  return Object.fromEntries(Object.entries(meta).map(([key, value]) => {
    if (/token|secret|api.?key|authorization/i.test(key)) return [key, '[REDACTED]'];
    if (key === 'userId' && typeof value === 'string') return [key, `${value.slice(0, 4)}***`];
    return [key, value];
  }));
}

export function createLogger() {
  return {
    info(message, meta) { console.log(JSON.stringify({ level: 'info', message, ...safeMeta(meta) })); },
    warn(message, meta) { console.warn(JSON.stringify({ level: 'warn', message, ...safeMeta(meta) })); },
    error(message, meta) { console.error(JSON.stringify({ level: 'error', message, ...safeMeta(meta) })); }
  };
}
