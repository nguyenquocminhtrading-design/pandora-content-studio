export function createWebhookRouter({ botRouter, zalo, logger }) {
  return async (req, res) => {
    const event = req.body || {};
    const userId = event.user_id || event.sender?.id || event.message?.from?.id;
    const text = event.message?.text || event.text || event.message?.text_content;
    const messageId = event.message_id || event.event_id || `${userId}:${event.timestamp || Date.now()}`;
    if (!userId || typeof text !== 'string' || !text.trim()) return res.status(200).json({ ok: true, ignored: true });
    res.status(200).json({ ok: true });
    try {
      const result = await botRouter({ userId, messageId: String(messageId), text: text.trim() });
      if (!result.duplicate && result.response) await zalo.sendText(userId, result.response);
      logger.info('Webhook processed', { userId, mode: result.mode, messageId: String(messageId) });
    } catch (error) { logger.error('Webhook processing failed', { error: error.message, userId }); }
  };
}
