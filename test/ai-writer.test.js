import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiWriterService } from '../src/services/ai-writer.service.js';

test('createAiWriterService sends proper OpenAI format and parses JSON copy response', async () => {
  const mockProduct = {
    id: '1041518697',
    title: 'Dây Chuyền Pandora Timeless',
    price: 7999000,
    priceFormatted: '7.999.000 ₫',
    compareAtPrice: 8999000,
    discountPct: 11,
    vendor: 'Pandora Timeless',
    description: 'Vẻ đẹp kinh điển mạ vàng hồng 14K',
    tags: ['metal:Mạ vàng 14k', 'sale'],
    url: 'https://pandora.norbreeze.vn/products/aug22-386240cz'
  };

  const mockFetch = async (url, options) => {
    assert.equal(url, 'http://localhost:3001/v1/chat/completions');
    assert.equal(options.headers['authorization'], 'Bearer test-key');
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'test-model');
    assert.equal(body.messages.length, 2);

    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                zalo: 'Chào bạn, Dây chuyền Pandora Timeless đang có giá 7.999.000 ₫ rất đẹp...',
                social: '🔥 Siêu phẩm Pandora Timeless giảm giá hôm nay! ✨ #pandora',
                short: 'Dây chuyền Pandora Timeless chỉ 7.999.000 ₫. Đặt ngay!'
              })
            }
          }
        ]
      })
    };
  };

  const writer = createAiWriterService({
    config: {
      llm: {
        localUrl: 'http://localhost:3001/v1',
        localApiKey: 'test-key',
        localModel: 'test-model'
      }
    },
    fetchImpl: mockFetch
  });

  const copies = await writer.generateCopies(mockProduct);

  assert.match(copies.zalo, /Pandora Timeless/);
  assert.match(copies.social, /Siêu phẩm/);
  assert.match(copies.short, /7\.999\.000/);
});

test('createAiWriterService handles non-JSON fallback text gracefully', async () => {
  const mockProduct = {
    id: '2',
    title: 'Nhẫn Bạc',
    price: 1500000,
    priceFormatted: '1.500.000 ₫',
    url: 'https://pandora.norbreeze.vn/products/ring'
  };

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Plain unformatted text without json' } }]
    })
  });

  const writer = createAiWriterService({
    config: { llm: {} },
    fetchImpl: mockFetch
  });

  const copies = await writer.generateCopies(mockProduct);
  assert.ok(copies.zalo);
  assert.ok(copies.social);
  assert.ok(copies.short);
});

test('createAiWriterService automatically falls back from failing provider to next provider', async () => {
  const mockProduct = {
    id: '3',
    title: 'Vòng Pandora Moments',
    price: 2500000,
    priceFormatted: '2.500.000 ₫'
  };

  const calls = [];
  const mockFetch = async (url) => {
    calls.push(url);
    if (url.includes('googleapis.com')) {
      // First provider (Gemini) fails (e.g. rate limited or invalid key)
      return {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      };
    }
    // Second provider (NVIDIA) succeeds
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              zalo: 'Chào bạn từ NVIDIA!',
              social: 'Post từ NVIDIA!',
              short: 'Short từ NVIDIA!'
            })
          }
        }]
      })
    };
  };

  const writer = createAiWriterService({
    config: {
      llm: {
        gemini: { apiKey: 'mock-gemini-key', model: 'gemini-3.8-flash' },
        nvidia: { apiKey: 'mock-nvidia-key', model: 'meta/llama-3.2-11b-vision-instruct' }
      }
    },
    fetchImpl: mockFetch
  });

  const copies = await writer.generateCopies(mockProduct);
  assert.equal(calls.length, 2);
  assert.match(calls[0], /googleapis\.com/);
  assert.match(calls[1], /nvidia\.com/);
  assert.equal(copies.provider, 'NVIDIA NIM');
  assert.equal(copies.zalo, 'Chào bạn từ NVIDIA!');
});

