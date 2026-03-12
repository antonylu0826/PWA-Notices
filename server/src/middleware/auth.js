const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'Missing X-API-Key header' });

  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1').get(hash);
  if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });

  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, usage_count = usage_count + 1 WHERE id = ?').run(apiKey.id);
  req.apiKey = apiKey;
  next();
}

module.exports = { requireAdmin, requireApiKey };
