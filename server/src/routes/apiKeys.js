const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAdmin, (req, res) => {
  const keys = db
    .prepare(
      'SELECT id, name, key_prefix, permissions, is_active, last_used_at, usage_count, created_at FROM api_keys ORDER BY created_at DESC'
    )
    .all();
  res.json(keys);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const rawKey = `sk_${uuidv4().replace(/-/g, '')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 10);

  db.prepare(`
    INSERT INTO api_keys (name, key_prefix, key_hash, permissions)
    VALUES (?, ?, ?, ?)
  `).run(
    name,
    keyPrefix,
    keyHash,
    JSON.stringify(permissions || ['trigger_flow', 'send_notice'])
  );

  // Return raw key ONCE - client must save it
  res.status(201).json({ success: true, key: rawKey, key_prefix: keyPrefix, name });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/revoke', requireAdmin, (req, res) => {
  db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
