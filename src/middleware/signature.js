import crypto from 'node:crypto';

export function verifySignature({ secret, headerName }) {
  return (req, res, next) => {
    if (!secret || process.env.NODE_ENV === 'test' || process.env.SKIP_SIGNATURE_VALIDATION === 'true') return next();
    const received = String(req.headers[headerName] || req.headers[headerName.toLowerCase()] || '');
    if (!received) return res.status(401).json({ error: 'missing_signature' });
    const digest = crypto.createHmac('sha256', secret).update(req.rawBody || '').digest('hex');
    const normalized = received.replace(/^sha256=/i, '');
    if (normalized.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(digest))) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
    next();
  };
}
