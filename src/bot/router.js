import { FALLBACK_MESSAGE } from './fallback.js';
import { matchRule } from './rules.js';

export function createBotRouter({ llm, conversations, logger, config }) {
  return async function routeMessage({ userId, messageId, text }) {
    const existing = await conversations.hasMessage(messageId);
    if (existing) return { duplicate: true, response: null, mode: 'duplicate' };
    await conversations.record({ userId, messageId, direction: 'inbound', messageText: text, botMode: 'received', status: 'received' });
    const ruleResponse = matchRule(text, config.bot);
    if (ruleResponse) {
      await conversations.record({ userId, messageId: `${messageId}:reply`, direction: 'outbound', messageText: ruleResponse, botMode: 'rule', status: 'ready' });
      return { duplicate: false, response: ruleResponse, mode: 'rule' };
    }
    try {
      const context = await conversations.getContext(userId, config.maxContextMessages);
      const response = await llm.reply({ text, context, bot: config.bot });
      const safeResponse = response?.trim() || FALLBACK_MESSAGE;
      await conversations.record({ userId, messageId: `${messageId}:reply`, direction: 'outbound', messageText: safeResponse, botMode: 'llm', status: 'ready' });
      return { duplicate: false, response: safeResponse, mode: 'llm' };
    } catch (error) {
      logger.warn('LLM unavailable; using fallback', { error: error.message, userId });
      await conversations.record({ userId, messageId: `${messageId}:reply`, direction: 'outbound', messageText: FALLBACK_MESSAGE, botMode: 'fallback', status: 'ready' });
      return { duplicate: false, response: FALLBACK_MESSAGE, mode: 'fallback' };
    }
  };
}
