const express = require('express');
const db = require('../config/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Register or refresh a device (public - called by PWA on startup)
router.post('/', (req, res) => {
  const { username, fcm_token, platform } = req.body;
  if (!username || !fcm_token)
    return res.status(400).json({ error: req.t('api.error.required_field', { field: 'username, fcm_token' }) });

  // Upsert by token
  db.prepare(`
    INSERT INTO devices (username, fcm_token, platform, is_active, last_active)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(fcm_token) DO UPDATE SET
      username = excluded.username,
      platform = excluded.platform,
      is_active = 1,
      last_active = CURRENT_TIMESTAMP
  `).run(username, fcm_token, platform || 'web');

  const device = db.prepare('SELECT * FROM devices WHERE fcm_token = ?').get(fcm_token);
  res.json({ success: true, device_id: device.id });
});

// List all devices (admin)
router.get('/', requireAdmin, (req, res) => {
  const devices = db
    .prepare(
      'SELECT id, username, platform, is_active, last_active, created_at FROM devices ORDER BY last_active DESC'
    )
    .all();
  res.json(devices);
});

// Delete device (admin)
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
