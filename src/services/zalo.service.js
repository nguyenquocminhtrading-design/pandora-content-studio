export function createZaloService(config, fetchImpl = fetch) {
  return { async sendText(userId, text) {
    const response = await fetchImpl(`${config.zalo.apiBaseUrl}/message/cs`, { method: 'POST', headers: { 'content-type': 'application/json', access_token: config.zalo.accessToken }, body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }) });
    if (!response.ok) throw new Error(`Zalo HTTP ${response.status}`);
    const data = await response.json();
    if (data.error && data.error !== 0) throw new Error(`Zalo API ${data.error}: ${data.message || 'unknown error'}`);
    return data;
  } };
}
