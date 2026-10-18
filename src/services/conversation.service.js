import fs from 'node:fs/promises';
import path from 'node:path';

export function createConversationService(filePath) {
  let entries = [];
  let loaded = false;
  let writeChain = Promise.resolve();
  async function load() {
    if (loaded) return;
    try { entries = JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { entries = []; }
    loaded = true;
  }
  async function persist() {
    writeChain = writeChain.then(async () => { await fs.mkdir(path.dirname(filePath), { recursive: true }); await fs.writeFile(filePath, JSON.stringify(entries.slice(-2000), null, 2)); });
    return writeChain;
  }
  return {
    async hasMessage(messageId) { await load(); return Boolean(messageId && entries.some((entry) => entry.messageId === messageId)); },
    async record(entry) { await load(); entries.push({ ...entry, createdAt: new Date().toISOString() }); await persist(); },
    async getContext(userId, limit = 8) { await load(); return entries.filter((entry) => entry.userId === userId).slice(-limit).map(({ direction, messageText }) => ({ direction, text: messageText })); },
    async clearUser(userId) { await load(); entries = entries.filter((entry) => entry.userId !== userId); await persist(); }
  };
}
