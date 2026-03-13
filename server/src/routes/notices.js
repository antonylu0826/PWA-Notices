const express = require('express');
const db = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const { sendToMany } = require('../services/fcm');

const router = express.Router();

// Get notices for a device (public)
router.get('/', (req, res) => {
  const { device_id, limit = 30 } = req.query;

  const notices = db
    .prepare(
      `
    SELECT n.id, n.title, n.message, n.severity, n.flow_key,
      strftime('%Y-%m-%dT%H:%M:%SZ', n.created_at) as created_at,
      CASE WHEN na.id IS NOT NULL THEN 1 ELSE 0 END as acked
    FROM notices n
    LEFT JOIN notice_acks na ON na.notice_id = n.id AND na.device_id = ?
    ORDER BY n.created_at DESC
    LIMIT ?
  `
    )
    .all(device_id || 0, Number(limit));

  res.json(notices);
});

// ACK a notice (public)
router.post('/ack/:noticeId', (req, res) => {
  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error: req.t('api.error.required_field', { field: 'device_id' }) });

  db.prepare(`
    INSERT OR IGNORE INTO notice_acks (notice_id, device_id) VALUES (?, ?)
  `).run(req.params.noticeId, device_id);

  res.json({ success: true });
});

// Send notice manually (admin)
router.post('/send', requireAdmin, async (req, res) => {
  const { title, message, severity = 'info', target_username, target_usernames } = req.body;
  if (!title || !message) return res.status(400).json({ error: req.t('api.error.required_field', { field: 'title, message' }) });

  // Support both single username (legacy) and array of usernames
  const usernames = target_usernames?.length
    ? target_usernames
    : target_username
    ? [target_username]
    : null;

  let devices;
  if (usernames) {
    const placeholders = usernames.map(() => '?').join(',');
    devices = db
      .prepare(`SELECT fcm_token FROM devices WHERE username IN (${placeholders}) AND is_active = 1`)
      .all(...usernames);
  } else {
    devices = db.prepare('SELECT fcm_token FROM devices WHERE is_active = 1').all();
  }

  const tokens = devices.map((d) => d.fcm_token);
  let successCount = 0;
  const invalidTokens = [];

  if (tokens.length > 0) {
    const results = await sendToMany(tokens, title, message, { severity });
    results.forEach((r, i) => {
      if (r.success) successCount++;
      else if (r.invalidToken) invalidTokens.push(tokens[i]);
    });
    if (invalidTokens.length > 0) {
      const placeholders = invalidTokens.map(() => '?').join(',');
      db.prepare(
        `UPDATE devices SET is_active = 0 WHERE fcm_token IN (${placeholders})`
      ).run(...invalidTokens);
    }
  }

  const result = db
    .prepare('INSERT INTO notices (title, message, severity) VALUES (?, ?, ?)')
    .run(title, message, severity);

  res.json({
    success: true,
    notice_id: result.lastInsertRowid,
    sent: successCount,
    total: tokens.length,
  });
});

// All notices (admin)
router.get('/all', requireAdmin, (req, res) => {
  const notices = db
    .prepare("SELECT id, title, message, severity, flow_key, strftime('%Y-%m-%dT%H:%M:%SZ', created_at) as created_at FROM notices ORDER BY created_at DESC LIMIT 100")
    .all();
  res.json(notices);
});

// Stats (admin)
router.get('/stats', requireAdmin, (req, res) => {
  const stats = {
    total: db.prepare('SELECT COUNT(*) as c FROM notices').get().c,
    devices: db.prepare('SELECT COUNT(*) as c FROM devices WHERE is_active = 1').get().c,
    pending_acks: db
      .prepare(
        'SELECT COUNT(*) as c FROM notices n WHERE NOT EXISTS (SELECT 1 FROM notice_acks na WHERE na.notice_id = n.id)'
      )
      .get().c,
  };
  res.json(stats);
});

// Clear all notices (admin)
router.delete('/clear', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM notice_acks').run();
  db.prepare('DELETE FROM notices').run();
  res.json({ success: true });
});

module.exports = router;
