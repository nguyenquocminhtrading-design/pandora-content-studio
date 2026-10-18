import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRule } from '../src/bot/rules.js';

const bot = { priceInfo: 'PRICE', address: 'ADDRESS', businessHours: 'HOURS', productInfo: 'PRODUCT', humanContact: 'HUMAN' };
test('matches Vietnamese rule intents without accents', () => {
  assert.equal(matchRule('Cho mình hỏi giá?', bot), 'PRICE');
  assert.equal(matchRule('Địa chỉ ở đâu?', bot), 'ADDRESS');
  assert.equal(matchRule('Mở cửa mấy giờ?', bot), 'HOURS');
  assert.equal(matchRule('Cho gặp nhân viên', bot), 'HUMAN');
});
test('returns null for unknown intent', () => assert.equal(matchRule('Một câu hỏi bất kỳ', bot), null));
