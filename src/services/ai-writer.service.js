/**
 * Service for generating multi-format sales copy using OpenAI-compatible local/remote LLM proxies.
 */

const SYSTEM_PROMPT = `
Bạn là chuyên gia Copywriter và Chuyên viên tư vấn bán hàng trang sức / thời trang cao cấp.
Nhiệm vụ của bạn: Từ thông tin sản phẩm được cung cấp, hãy viết 3 định dạng nội dung bán hàng bằng Tiếng Việt hấp dẫn, đúng tâm lý khách hàng, đúng chính tả và định dạng đẹp mắt:

1. zalo: Tin nhắn Zalo tư vấn 1-1 cá nhân hóa, xưng hô thân thiện (Em chào Anh/Chị), nêu ngắn gọn điểm nổi bật, giá ưu đãi, tạo cảm giác được chăm sóc riêng, có câu hỏi mở/kêu gọi hành động tự nhiên.
2. social: Bài đăng / Caption Facebook hoặc Zalo Story. Có tiêu đề giật hook tạo tò mò, emoji sinh động, gạch đầu dòng các điểm đắt giá (chất liệu, ý nghĩa, quà tặng), thông tin giá & ưu đãi, lời kêu gọi mua hàng và hashtag thích hợp.
3. short: Tin nhắn chào hàng siêu ngắn gọn (tối đa 2-3 câu), đi thẳng vào giá và ưu đãi, phù hợp gửi kèm hình ảnh hoặc nhắn tin nhanh.

Hãy trả về kết quả DƯỚI DẠNG JSON HỢP LỆ với cấu trúc chính xác như sau:
{
  "zalo": "nội dung tin nhắn zalo...",
  "social": "nội dung bài đăng mạng xã hội...",
  "short": "nội dung chào hàng ngắn..."
}
CHỈ TRẢ VỀ JSON THUẦN TÚY, không kèm lời giải thích hay markdown code blocks ngoài JSON.
`.trim();

export function createAiWriterService({ config = {}, fetchImpl = fetch }) {
  const localUrl = config.llm?.localUrl || 'http://localhost:3001/v1';
  const defaultApiKey = config.llm?.localApiKey || '';
  const defaultModel = config.llm?.localModel || 'default';

  /**
   * Builds ordered list of candidate providers based on available keys or options
   */
  function getCandidateProviders(options = {}) {
    // If specific options passed by caller (e.g., custom URL/key in request)
    if (options.apiUrl) {
      return [{
        name: 'Custom/Localhost',
        baseUrl: options.apiUrl,
        apiKey: options.apiKey || defaultApiKey,
        model: options.model || defaultModel
      }];
    }

    const providers = [];

    // 1. Google Gemini
    const geminiKey = options.geminiApiKey || config.llm?.gemini?.apiKey || config.llm?.apiKey;
    if (geminiKey) {
      providers.push({
        name: 'Google Gemini',
        baseUrl: config.llm?.gemini?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: geminiKey,
        model: options.model && options.provider === 'gemini' ? options.model : (config.llm?.gemini?.model || 'gemini-3.8-flash')
      });
    }

    // 2. NVIDIA NIM
    const nvidiaKey = options.nvidiaApiKey || config.llm?.nvidia?.apiKey;
    if (nvidiaKey) {
      providers.push({
        name: 'NVIDIA NIM',
        baseUrl: config.llm?.nvidia?.baseUrl || 'https://integrate.api.nvidia.com/v1',
        apiKey: nvidiaKey,
        model: options.model && options.provider === 'nvidia' ? options.model : (config.llm?.nvidia?.model || 'meta/llama-3.2-11b-vision-instruct')
      });
    }

    // 3. Fallback to Localhost / default configured endpoint
    providers.push({
      name: 'Local/Default Proxy',
      baseUrl: localUrl,
      apiKey: options.apiKey || defaultApiKey,
      model: options.model || defaultModel
    });

    return providers;
  }

  return {
    /**
     * Generates 3 versions of copy for a given product with automated cascading fallback
     * @param {object} product - Normalized product object
     * @param {object} options - Options (customNotes, tone, model, apiKey)
     */
    async generateCopies(product, options = {}) {
      const promptDetails = `
THÔNG TIN SẢN PHẨM:
- Tên sản phẩm: ${product.title || product.name || 'Sản phẩm'}
- Giá bán ưu đãi: ${product.priceFormatted || (product.price ? product.price + ' ₫' : 'Liên hệ')}
${product.compareAtPrice && product.compareAtPrice > product.price ? `- Giá gốc: ${product.compareAtPrice} ₫ (Tiết kiệm ${product.discountPct || ''}%)` : ''}
- Thương hiệu / Bộ sưu tập: ${product.vendor || ''}
- Phân loại: ${product.productType || ''}
- Mô tả chi tiết: ${product.description || ''}
- Thẻ tag & đặc điểm: ${(product.tags || []).join(', ')}
- Đường dẫn sản phẩm: ${product.url || ''}
${options.customNotes ? `- Lưu ý thêm từ nhân viên bán hàng: ${options.customNotes}` : ''}
${options.customerName ? `- Tên khách hàng: ${options.customerName}` : ''}
`.trim();

      const candidateProviders = getCandidateProviders(options);
      const errors = [];

      for (const provider of candidateProviders) {
        try {
          const targetUrl = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
          const headers = {
            'content-type': 'application/json'
          };
          if (provider.apiKey) {
            headers['authorization'] = `Bearer ${provider.apiKey}`;
          }

          const body = {
            model: provider.model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: promptDetails }
            ],
            temperature: 0.7
          };

          const timeoutMs = config.llm?.timeoutMs || 15000;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);

          let res;
          try {
            res = await fetchImpl(targetUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
              signal: controller.signal
            });
          } finally {
            clearTimeout(timer);
          }

          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(`[${provider.name}] HTTP ${res.status}: ${errText || res.statusText}`);
          }

          const responseData = await res.json();
          const rawText = responseData?.choices?.[0]?.message?.content || '';

          if (!rawText) {
            throw new Error(`[${provider.name}] Empty response content`);
          }

          const copies = parseCopies(rawText, product);
          copies.provider = provider.name;
          copies.model = provider.model;
          return copies;
        } catch (err) {
          errors.push(err.message);
          // If only 1 provider candidate, throw immediately
          if (candidateProviders.length === 1) {
            throw err;
          }
        }
      }

      // If all candidates failed, throw descriptive error
      throw new Error(`Tất cả nhà cung cấp AI đều gặp lỗi:\n- ${errors.join('\n- ')}`);
    }
  };
}

/**
 * Parses raw LLM text into { zalo, social, short } with resilient fallback
 */
function parseCopies(rawText, product) {
  let cleaned = rawText.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.zalo && parsed.social && parsed.short) {
      return {
        zalo: parsed.zalo.trim(),
        social: parsed.social.trim(),
        short: parsed.short.trim()
      };
    }
  } catch {
    // If not valid JSON, extract sections or provide clean fallback
  }

  // Fallback if model responded with plain text
  return {
    zalo: `Chào bạn! Mình gửi bạn thông tin về ${product.title}:\n${product.description ? product.description.slice(0, 180) + '...' : ''}\n💰 Giá ưu đãi: ${product.priceFormatted || 'Liên hệ'}\n👉 Xem chi tiết tại: ${product.url || ''}`,
    social: `✨ ${product.title} ✨\n\n${product.description ? product.description.slice(0, 250) : ''}\n\n🔥 Giá: ${product.priceFormatted || 'Liên hệ'}\nInbox ngay để nhận ưu đãi hôm nay!\n#pandora #trangsuc`,
    short: `${product.title} - Giá chỉ ${product.priceFormatted || 'Liên hệ'}. Xem ngay: ${product.url || ''}`
  };
}
