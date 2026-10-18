export function createLlmService(config, fetchImpl = fetch) {
  async function callProvider(provider, apiKey, model, apiUrl, prompt, controller) {
    if (!apiKey) throw new Error(`${provider} API key is not configured`);
    if (provider === 'groq') {
      const response = await fetchImpl(apiUrl, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 300, temperature: 0.2 }), signal: controller.signal });
      if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
      const data = await response.json(); return data?.choices?.[0]?.message?.content || '';
    }
    if (provider !== 'gemini') throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
    const response = await fetchImpl(`${apiUrl}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), signal: controller.signal });
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
    const data = await response.json(); return data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  }
  return { async reply({ text, context, bot }) {
    const prompt = `Bạn là ${bot.name} của ${bot.brand}. Trả lời bằng tiếng Việt, ngắn gọn và thân thiện. Chỉ sử dụng thông tin được cung cấp; nếu không đủ dữ liệu, nói rõ cần nhân viên hỗ trợ, không tự bịa giá/chính sách.\nThông tin: sản phẩm=${bot.productInfo}; giá=${bot.priceInfo}; địa chỉ=${bot.address}; giờ=${bot.businessHours}.\nLịch sử gần đây: ${JSON.stringify(context)}\nCâu hỏi khách hàng: ${text}`;
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);
    try {
      try { return await callProvider(config.llm.provider, config.llm.apiKey, config.llm.model, config.llm.apiUrl, prompt, controller); }
      catch (primaryError) {
        if (!config.llm.fallbackProvider || !config.llm.fallbackApiKey) throw primaryError;
        return await callProvider(config.llm.fallbackProvider, config.llm.fallbackApiKey, config.llm.fallbackModel, config.llm.fallbackApiUrl, prompt, controller);
      }
    } finally { clearTimeout(timer); }
  } };
}
