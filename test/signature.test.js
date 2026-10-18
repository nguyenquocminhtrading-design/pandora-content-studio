import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifySignature } from '../src/middleware/signature.js';

test('accepts a valid HMAC signature', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"hello":"world"}');
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  let called = false;
  const old = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  verifySignature({ secret, headerName: 'x-signature' })({ headers: { 'x-signature': signature }, rawBody: body }, { status() { return this; }, json() {} }, () => { called = true; });
  process.env.NODE_ENV = old;
  assert.equal(called, true);
});

test('rejects an invalid HMAC signature', () => {
  let statusCode;
  const old = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  verifySignature({ secret: 'test-secret', headerName: 'x-signature' })({ headers: { 'x-signature': 'bad' }, rawBody: Buffer.from('body') }, { status(code) { statusCode = code; return this; }, json() {} }, () => {});
  process.env.NODE_ENV = old;
  assert.equal(statusCode, 401);
});
