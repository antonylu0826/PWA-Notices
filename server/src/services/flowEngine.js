const db = require('../config/database');
const { sendToMany } = require('./fcm');

// Simple template render: replace {{key}} with data[key]
function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (data[key] !== undefined ? data[key] : `{{${key}}}`));
}

// Evaluate conditions array against payload
// Each condition: { field, operator, value }
// operators: eq, neq, in, contains, gt, lt
function evaluateConditions(conditions, payload) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(({ field, operator, value }) => {
    const actual = payload[field];
    switch (operator) {
      case 'eq':
        return String(actual) === String(value);
      case 'neq':
        return String(actual) !== String(value);
      case 'in':
        return Array.isArray(value)
          ? value.includes(actual)
          : String(value)
              .split(',')
              .map((s) => s.trim())
              .includes(actual);
      case 'contains':
        return String(actual).includes(String(value));
      case 'gt':
        return Number(actual) > Number(value);
      case 'lt':
        return Number(actual) < Number(value);
      default:
        return true;
    }
  });
}

// Get recipient device tokens based on recipients config
function getRecipientTokens(recipientsConfig) {
  let devices = [];
  const cfg =
    typeof recipientsConfig === 'string' ? JSON.parse(recipientsConfig) : recipientsConfig;

  if (cfg.type === 'all') {
    devices = db.prepare('SELECT id, fcm_token FROM devices WHERE is_active = 1').all();
  } else if (cfg.type === 'users' && Array.isArray(cfg.usernames)) {
    const placeholders = cfg.usernames.map(() => '?').join(',');
    devices = db
      .prepare(
        `SELECT id, fcm_token FROM devices WHERE is_active = 1 AND username IN (${placeholders})`
      )
      .all(...cfg.usernames);
  }
  return devices;
}

async function executeFlow(flow, triggerData = {}) {
  const conditions =
    typeof flow.conditions === 'string' ? JSON.parse(flow.conditions) : flow.conditions;

  // Check conditions
  if (!evaluateConditions(conditions, triggerData)) {
    return { skipped: true, reason: 'conditions not met' };
  }

  // Rate limit check
  if (flow.rate_limit_sec > 0 && flow.last_triggered) {
    const lastMs = new Date(flow.last_triggered).getTime();
    const nowMs = Date.now();
    if (nowMs - lastMs < flow.rate_limit_sec * 1000) {
      return { skipped: true, reason: 'rate limited' };
    }
  }

  const title = renderTemplate(flow.template_title, triggerData);
  const message = renderTemplate(flow.template_message, triggerData);
  const severity = flow.template_severity || 'info';

  const devices = getRecipientTokens(flow.recipients);
  const tokens = devices.map((d) => d.fcm_token);

  let successCount = 0;
  const invalidTokens = [];

  if (tokens.length > 0) {
    const results = await sendToMany(tokens, title, message, { severity, flowKey: flow.flow_key });
    results.forEach((r, i) => {
      if (r.success) successCount++;
      else if (r.invalidToken) invalidTokens.push(devices[i].fcm_token);
    });

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      const placeholders = invalidTokens.map(() => '?').join(',');
      db.prepare(
        `UPDATE devices SET is_active = 0 WHERE fcm_token IN (${placeholders})`
      ).run(...invalidTokens);
    }
  }

  // Save notice record
  const noticeResult = db
    .prepare(
      'INSERT INTO notices (title, message, severity, flow_id, flow_key, trigger_data) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(title, message, severity, flow.id, flow.flow_key, JSON.stringify(triggerData));

  // Update flow stats
  db.prepare(
    'UPDATE flows SET trigger_count = trigger_count + 1, last_triggered = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(flow.id);

  // Log
  db.prepare(
    'INSERT INTO flow_logs (flow_id, flow_key, trigger_data, rendered_title, rendered_message, recipients_count, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    flow.id,
    flow.flow_key,
    JSON.stringify(triggerData),
    title,
    message,
    successCount,
    'success'
  );

  return {
    success: true,
    notice_id: noticeResult.lastInsertRowid,
    recipients: tokens.length,
    sent: successCount,
    flow_key: flow.flow_key,
    flow_name: flow.name,
  };
}

module.exports = { executeFlow };
