import 'dotenv/config';

const required = ['ZALO_ACCESS_TOKEN', 'LLM_API_KEY'];

export function getConfig({ validateSecrets = false } = {}) {
  const config = {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    zalo: {
      appId: process.env.ZALO_APP_ID || '',
      appSecret: process.env.ZALO_APP_SECRET || '',
      accessToken: process.env.ZALO_ACCESS_TOKEN || '',
      apiBaseUrl: process.env.ZALO_API_BASE_URL || 'https://openapi.zalo.me/v3.0/oa',
      signatureHeader: (process.env.ZALO_SIGNATURE_HEADER || 'x-zevent-signature').toLowerCase()
    },
    llm: {
      provider: (process.env.LLM_PROVIDER || 'gemini').toLowerCase(),
      apiKey: process.env.LLM_API_KEY || '',
      model: process.env.LLM_MODEL || 'gemini-2.0-flash',
      apiUrl: process.env.LLM_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 15000),
      localUrl: process.env.LOCAL_LLM_URL || 'http://localhost:3001/v1',
      localApiKey: process.env.LOCAL_LLM_API_KEY || '',
      localModel: process.env.LOCAL_LLM_MODEL || 'auto',
      fallbackProvider: (process.env.LLM_FALLBACK_PROVIDER || '').toLowerCase(),
      fallbackApiKey: process.env.LLM_FALLBACK_API_KEY || '',
      fallbackModel: process.env.LLM_FALLBACK_MODEL || '',
      fallbackApiUrl: process.env.LLM_FALLBACK_API_URL || '',
      // 3 Open Cloud Providers
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai'
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY || '',
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
        baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
      },
      nvidia: {
        apiKey: process.env.NVIDIA_NIM_API_KEY || '',
        model: process.env.NVIDIA_NIM_MODEL || 'meta/llama-3.3-70b-instruct',
        baseUrl: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
      }
    },
    bot: {
      name: process.env.BOT_NAME || 'Trợ lý tư vấn',
      brand: process.env.BOT_BRAND || 'Doanh nghiệp của bạn',
      productInfo: process.env.BOT_PRODUCT_INFO || '',
      priceInfo: process.env.BOT_PRICE_INFO || '',
      address: process.env.BOT_ADDRESS || '',
      businessHours: process.env.BOT_BUSINESS_HOURS || '',
      humanContact: process.env.BOT_HUMAN_CONTACT || ''
    },
    dataFile: process.env.DATA_FILE || './data/conversations.json',
    databaseUrl: process.env.DATABASE_URL || '',
    adminApiKey: process.env.ADMIN_API_KEY || '',
    queueMode: process.env.QUEUE_MODE || 'inline',
    ragTopK: Number(process.env.RAG_TOP_K || 5),
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL || '',
    maxContextMessages: Number(process.env.MAX_CONTEXT_MESSAGES || 8)
  };
  if (validateSecrets) {
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}
