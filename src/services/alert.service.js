export function createAlertService(config, fetchImpl = fetch) {
  return { async send(message, meta = {}) {
    if (!config.alertWebhookUrl) return false;
    try { const response = await fetchImpl(config.alertWebhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: message, ...meta }) }); return response.ok; } catch { return false; }
  } };
}
