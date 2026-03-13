const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies?.admin_token) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    console.log('[AuthAdmin] Missing Token. Headers:', JSON.stringify(req.headers));
    return res.status(401).json({ error: 'Missing admin authorization token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireApiKey(req, res, next) {
  let key = req.headers['x-api-key'];

  // Also support Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // If it's sk_ format or we don't have an x-api-key, use it
    if (authHeader.startsWith('sk_') || !key) {
      key = authHeader.replace('Bearer ', '');
    }
  }

  if (!key) {
    console.log('[Auth] Missing API Key. Headers:', JSON.stringify(req.headers));
    return res.status(401).json({ error: 'Missing API Key' });
  }

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1').get(hash);
  
  if (!apiKey) {
    console.log('[Auth] Invalid API Key attempt. Key start:', key.substring(0, 6));
    return res.status(401).json({ error: 'Invalid API key' });
  }

  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, usage_count = usage_count + 1 WHERE id = ?').run(apiKey.id);
  req.apiKey = apiKey;
  next();
}

module.exports = { requireAdmin, requireApiKey };
