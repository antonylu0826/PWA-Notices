const express = require('express');
const db = require('../config/database');
const { requireAdmin, requireApiKey } = require('../middleware/auth');
const { executeFlow } = require('../services/flowEngine');

const router = express.Router();

// --- Trigger endpoints (API Key auth) ---

router.post('/trigger/:flowKey', requireApiKey, async (req, res) => {
  const flow = db
    .prepare('SELECT * FROM flows WHERE flow_key = ? AND enabled = 1')
    .get(req.params.flowKey);
  if (!flow) return res.status(404).json({ error: req.t('api.error.not_found') });

  const result = await executeFlow(flow, req.body || {});
  if (result.skipped) return res.json({ status: 'skipped', reason: result.reason });
  res.json({ status: 'success', ...result });
});

router.post('/webhook', requireApiKey, async (req, res) => {
  const { flow_key, ...payload } = req.body;
  if (!flow_key) return res.status(400).json({ error: req.t('api.error.required_field', { field: 'flow_key' }) });

  const flow = db
    .prepare('SELECT * FROM flows WHERE flow_key = ? AND enabled = 1')
    .get(flow_key);
  if (!flow) return res.status(404).json({ error: req.t('api.error.not_found') });

  const result = await executeFlow(flow, payload);
  if (result.skipped) return res.json({ status: 'skipped', reason: result.reason });
  res.json({ status: 'success', ...result });
});

// --- Admin CRUD ---

router.get('/', requireAdmin, (req, res) => {
  const flows = db
    .prepare(
      'SELECT id, flow_key, name, description, enabled, trigger_count, last_triggered, created_at FROM flows ORDER BY created_at DESC'
    )
    .all();
  res.json(flows);
});

router.post('/', requireAdmin, (req, res) => {
  const {
    flow_key,
    name,
    description,
    conditions,
    recipients,
    template_title,
    template_message,
    template_severity,
    rate_limit_sec,
  } = req.body;

  if (!flow_key || !name || !template_title || !template_message) {
    return res
      .status(400)
      .json({ error: req.t('api.error.required_field', { field: 'flow_key, name, template_title, template_message' }) });
  }

  // Check unique key
  const existing = db.prepare('SELECT id FROM flows WHERE flow_key = ?').get(flow_key);
  if (existing) return res.status(409).json({ error: req.t('api.error.already_exists', { field: 'flow_key' }) });

  const result = db
    .prepare(
      `
    INSERT INTO flows (flow_key, name, description, conditions, recipients, template_title, template_message, template_severity, rate_limit_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(
      flow_key,
      name,
      description || '',
      JSON.stringify(conditions || []),
      JSON.stringify(recipients || { type: 'all' }),
      template_title,
      template_message,
      template_severity || 'info',
      rate_limit_sec || 0
    );

  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

router.get('/:id', requireAdmin, (req, res) => {
  const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
  if (!flow) return res.status(404).json({ error: req.t('api.error.not_found') });
  res.json(flow);
});

router.put('/:id', requireAdmin, (req, res) => {
  const {
    name,
    description,
    conditions,
    recipients,
    template_title,
    template_message,
    template_severity,
    rate_limit_sec,
    enabled,
  } = req.body;

  const flow = db.prepare('SELECT id FROM flows WHERE id = ?').get(req.params.id);
  if (!flow) return res.status(404).json({ error: req.t('api.error.not_found') });

  db.prepare(
    `
    UPDATE flows SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      conditions = COALESCE(?, conditions),
      recipients = COALESCE(?, recipients),
      template_title = COALESCE(?, template_title),
      template_message = COALESCE(?, template_message),
      template_severity = COALESCE(?, template_severity),
      rate_limit_sec = COALESCE(?, rate_limit_sec),
      enabled = COALESCE(?, enabled),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(
    name,
    description,
    conditions ? JSON.stringify(conditions) : null,
    recipients ? JSON.stringify(recipients) : null,
    template_title,
    template_message,
    template_severity,
    rate_limit_sec,
    enabled !== undefined ? (enabled ? 1 : 0) : null,
    req.params.id
  );

  res.json({ success: true });
});

router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM flows WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/:id/toggle', requireAdmin, (req, res) => {
  const flow = db.prepare('SELECT id, enabled FROM flows WHERE id = ?').get(req.params.id);
  if (!flow) return res.status(404).json({ error: req.t('api.error.not_found') });
  db.prepare(
    'UPDATE flows SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(flow.enabled ? 0 : 1, flow.id);
  res.json({ success: true, enabled: !flow.enabled });
});

router.get('/:id/logs', requireAdmin, (req, res) => {
  const logs = db
    .prepare(
      'SELECT * FROM flow_logs WHERE flow_id = ? ORDER BY created_at DESC LIMIT 50'
    )
    .all(req.params.id);
  res.json(logs);
});

// Test a flow (admin, no API key needed)
router.post('/:id/test', requireAdmin, async (req, res) => {
  const flow = db.prepare('SELECT * FROM flows WHERE id = ?').get(req.params.id);
  if (!flow) return res.status(404).json({ error: req.t('api.error.not_found') });

  // Bypass rate limit and enabled check for test
  const testFlow = { ...flow, enabled: 1, rate_limit_sec: 0 };
  const result = await executeFlow(testFlow, req.body || {});
  res.json({ status: 'test_sent', ...result });
});

module.exports = router;
