import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import LanguageSwitcher from '../components/LanguageSwitcher';

// --- Sub-components ---
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  
  // SQLite's CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS.SSS"
  // We MUST convert this to a format the browser recognizes as UTC (ISO 8601).
  let isoStr = dateStr;
  if (typeof isoStr === 'string' && !isoStr.includes('Z') && !isoStr.includes('+')) {
    // 1. Replace space with 'T'
    // 2. Ensure it ends with 'Z' to indicate UTC
    isoStr = isoStr.trim().replace(' ', 'T') + 'Z';
  }

  try {
    const date = new Date(isoStr);
    // Check if valid date
    if (isNaN(date.getTime())) return dateStr;

    // Use a fixed format that we know works across browsers
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch (e) {
    console.error('[TimeFix] Parse error:', e, dateStr);
    return dateStr;
  }
};

function StatsPanel({ stats }) {
  const { t } = useTranslation();
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-value">{stats.devices}</span>
        <span className="stat-label">{t('admin.stats.registered_devices')}</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">{t('admin.stats.total_notices')}</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.pending_acks}</span>
        <span className="stat-label">{t('admin.stats.pending_acks')}</span>
      </div>
    </div>
  );
}

function QRCodeCard() {
  const { t } = useTranslation();
  const url = window.location.origin;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    alert(t('admin.qrcode.copy_success'));
  };

  return (
    <div className="panel qrcode-panel" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
      <h2>{t('admin.qrcode.title')}</h2>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '20px', marginTop: '10px' }}>
        <QRCodeSVG value={url} size={240} />
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
        {t('admin.qrcode.hint')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <code style={{ background: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '6px', fontSize: '1rem', width: '100%', wordBreak: 'break-all' }}>{url}</code>
        <button className="btn-primary" style={{ width: 'auto', minWidth: '160px' }} onClick={handleCopy}>{t('admin.qrcode.btn_copy')}</button>
      </div>
    </div>
  );
}

function SendPanel() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ title: '', message: '', severity: 'info' });
  const [targetType, setTargetType] = useState('all');
  const [targetUsers, setTargetUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/devices').then((res) => {
      const unique = [...new Set(res.data.map((d) => d.username))].sort();
      setUsers(unique);
    });
  }, []);

  const toggleUser = (u) => {
    setTargetUsers((prev) =>
      prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]
    );
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (targetType === 'users' && targetUsers.length === 0) {
      alert(t('admin.send.select_user_error'));
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        ...form,
        target_usernames: targetType === 'users' ? targetUsers : [],
      };
      const res = await api.post('/notices/send', payload);
      setStatus({ ok: true, msg: t('admin.send.success_msg', { count: res.data.sent }) });
      setForm({ title: '', message: '', severity: 'info' });
      setTargetType('all');
      setTargetUsers([]);
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || t('admin.send.failed_msg') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>📣 {t('admin.send.title')}</h2>
      <form onSubmit={handleSend} className="form-stack">
        <div className="form-group">
          <label>{t('admin.send.label_title')}</label>
          <input
            className="input"
            required
            placeholder={t('admin.send.placeholder_title')}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>{t('admin.send.label_message')}</label>
          <textarea
            className="input textarea"
            required
            placeholder={t('admin.send.placeholder_message')}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>{t('admin.send.label_severity')}</label>
          <div className="radio-group">
            {['info', 'warning', 'critical'].map((s) => (
              <label
                key={s}
                className={`radio-label ${s} ${form.severity === s ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={s}
                  checked={form.severity === s}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                />
                {s === 'info' ? t('admin.send.severity_info') : s === 'warning' ? t('admin.send.severity_warning') : t('admin.send.severity_critical')}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>{t('admin.send.label_target')}</label>
          <div className="radio-group" style={{ marginBottom: '8px' }}>
            {['all', 'users'].map((type) => (
              <label
                key={type}
                className={`radio-label ${targetType === type ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value={type}
                  checked={targetType === type}
                  onChange={() => { setTargetType(type); setTargetUsers([]); }}
                />
                {type === 'all' ? t('admin.send.target_all') : t('admin.send.target_users')}
              </label>
            ))}
          </div>
          {targetType === 'users' && (
            <div className="checkbox-list">
              {users.length === 0 ? (
                <span className="hint-text">{t('admin.send.no_users')}</span>
              ) : (
                users.map((u) => (
                  <label key={u} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={targetUsers.includes(u)}
                      onChange={() => toggleUser(u)}
                    />
                    {u}
                  </label>
                ))
              )}
            </div>
          )}
        </div>
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t('admin.send.sending') : t('admin.send.submit')}
        </button>
        {status && <p className={status.ok ? 'success-text' : 'error-text'}>{status.msg}</p>}
      </form>
    </div>
  );
}

const EMPTY_FORM = {
  flow_key: '',
  name: '',
  description: '',
  template_title: '',
  template_message: '',
  template_severity: 'info',
  conditions: '[]',
  recipientType: 'all',
  recipientUsers: [],
  rate_limit_sec: 0,
};

function FlowsPanel() {
  const { t } = useTranslation();
  const [flows, setFlows] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchFlows = async () => {
    const res = await api.get('/flows');
    setFlows(res.data);
  };

  useEffect(() => {
    fetchFlows();
    api.get('/devices').then((res) => {
      const unique = [...new Set(res.data.map((d) => d.username))].sort();
      setUsers(unique);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const recipients =
        form.recipientType === 'all'
          ? { type: 'all' }
          : { type: 'users', usernames: form.recipientUsers };
      const payload = {
        ...form,
        conditions: JSON.parse(form.conditions),
        recipients,
        rate_limit_sec: Number(form.rate_limit_sec),
      };
      if (editingFlow) {
        await api.put(`/flows/${editingFlow.id}`, payload);
      } else {
        await api.post('/flows', payload);
      }
      setShowForm(false);
      setEditingFlow(null);
      setForm(EMPTY_FORM);
      fetchFlows();
    } catch (err) {
      alert(err.response?.data?.error || t('admin.flows.save_failed'));
    }
  };

  const handleEdit = async (flow) => {
    // Fetch full flow data (list API omits template/conditions/recipients fields)
    const { data } = await api.get(`/flows/${flow.id}`);
    setEditingFlow(data);
    const rec =
      typeof data.recipients === 'string' ? JSON.parse(data.recipients) : (data.recipients ?? {});
    const cond =
      typeof data.conditions === 'string' ? data.conditions : JSON.stringify(data.conditions ?? []);
    setForm({
      flow_key: data.flow_key,
      name: data.name,
      description: data.description || '',
      template_title: data.template_title,
      template_message: data.template_message,
      template_severity: data.template_severity || 'info',
      conditions: cond,
      recipientType: rec?.type || 'all',
      recipientUsers: rec?.usernames || [],
      rate_limit_sec: data.rate_limit_sec || 0,
    });
    setShowForm(true);
  };

  const handleToggle = async (flow) => {
    await api.post(`/flows/${flow.id}/toggle`);
    fetchFlows();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.flows.confirm_delete'))) return;
    await api.delete(`/flows/${id}`);
    fetchFlows();
  };

  const handleTest = async (flow) => {
    try {
      const res = await api.post(`/flows/${flow.id}/test`, {});
      alert(t('admin.flows.test_success', { count: res.data.sent ?? 0 }));
    } catch (err) {
      alert(err.response?.data?.error || t('admin.flows.test_failed'));
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('admin.flows.title')}</h2>
        <button
          className="btn-small"
          onClick={() => {
            setShowForm(true);
            setEditingFlow(null);
            setForm(EMPTY_FORM);
          }}
        >
          {t('admin.flows.add')}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>{editingFlow ? t('admin.flows.edit') : t('admin.flows.add')}</h3>
          <form onSubmit={handleSave} className="form-stack">
            <div className="form-row">
              <div className="form-group">
                <label>{t('admin.flows.label_key')}</label>
                <input
                  className="input"
                  required
                  placeholder={t('admin.flows.placeholder_key')}
                  value={form.flow_key}
                  onChange={(e) => setForm({ ...form, flow_key: e.target.value })}
                  disabled={!!editingFlow}
                />
              </div>
              <div className="form-group">
                <label>{t('admin.flows.label_name')}</label>
                <input
                  className="input"
                  required
                  placeholder={t('admin.flows.placeholder_name')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>{t('admin.flows.label_desc')}</label>
              <input
                className="input"
                placeholder={t('admin.flows.placeholder_desc')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>
                {t('admin.flows.label_title_tmpl')}{' '}
                <span className="hint-text">{t('admin.flows.hint_vars')}</span>
              </label>
              <input
                className="input"
                required
                placeholder={t('admin.flows.placeholder_title_tmpl')}
                value={form.template_title}
                onChange={(e) => setForm({ ...form, template_title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('admin.flows.label_msg_tmpl')}</label>
              <textarea
                className="input textarea"
                required
                placeholder={t('admin.flows.placeholder_msg_tmpl')}
                value={form.template_message}
                onChange={(e) => setForm({ ...form, template_message: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('admin.flows.label_severity')}</label>
              <select
                className="input"
                value={form.template_severity}
                onChange={(e) => setForm({ ...form, template_severity: e.target.value })}
              >
                <option value="info">{t('admin.send.severity_info')} (info)</option>
                <option value="warning">{t('admin.send.severity_warning')} (warning)</option>
                <option value="critical">{t('admin.send.severity_critical')} (critical)</option>
              </select>
            </div>
            <div className="form-group">
              <label>{t('admin.flows.label_conditions')}</label>
              <textarea
                className="input textarea small"
                placeholder='[{"field":"severity","operator":"in","value":["high","urgent"]}]'
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t('admin.flows.label_recipients')}</label>
              <div className="radio-group" style={{ marginBottom: '8px' }}>
                {['all', 'users'].map((type) => (
                  <label
                    key={type}
                    className={`radio-label ${form.recipientType === type ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="recipientType"
                      value={type}
                      checked={form.recipientType === type}
                      onChange={() => setForm({ ...form, recipientType: type, recipientUsers: [] })}
                    />
                    {type === 'all' ? t('admin.send.target_all') : t('admin.send.target_users')}
                  </label>
                ))}
              </div>
              {form.recipientType === 'users' && (
                <div className="checkbox-list">
                  {users.length === 0 ? (
                    <span className="hint-text">{t('admin.send.no_users')}</span>
                  ) : (
                    users.map((u) => (
                      <label key={u} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.recipientUsers.includes(u)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.recipientUsers, u]
                              : form.recipientUsers.filter((x) => x !== u);
                            setForm({ ...form, recipientUsers: next });
                          }}
                        />
                        {u}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>{t('admin.flows.label_rate_limit')}</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.rate_limit_sec}
                onChange={(e) => setForm({ ...form, rate_limit_sec: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button className="btn-primary" type="submit">
                {t('common.save')}
              </button>
              <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flow-list">
        {flows.length === 0 ? (
          <p className="empty-text">{t('admin.flows.empty')}</p>
        ) : (
          flows.map((flow) => (
            <div key={flow.id} className={`flow-card ${flow.enabled ? '' : 'disabled'}`}>
              <div className="flow-card-header">
                <div>
                  <span className="flow-key-badge">{flow.flow_key}</span>
                  <span className="flow-name">{flow.name}</span>
                </div>
                <div className="flow-actions">
                  <button
                    className={`toggle-btn ${flow.enabled ? 'on' : 'off'}`}
                    onClick={() => handleToggle(flow)}
                  >
                    {flow.enabled ? t('admin.flows.status_on') : t('admin.flows.status_off')}
                  </button>
                  <button className="btn-small" onClick={() => handleTest(flow)}>
                    {t('admin.flows.btn_test')}
                  </button>
                  <button className="btn-small" onClick={() => handleEdit(flow)}>
                    {t('admin.flows.btn_edit')}
                  </button>
                  <button
                    className="btn-small danger"
                    onClick={() => handleDelete(flow.id)}
                  >
                    {t('admin.flows.btn_delete')}
                  </button>
                </div>
              </div>
              <div className="flow-meta">
                {t('admin.flows.stats_triggered', { count: flow.trigger_count })}
                {flow.last_triggered &&
                  ` · ${t('admin.flows.stats_last', { time: formatDateTime(flow.last_triggered) })}`}
              </div>
              <div className="flow-trigger-example">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{t('admin.flows.trigger_example')}:</div>
                <code style={{ display: 'block', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                  curl.exe -X POST "{window.location.origin}/api/flows/trigger/{flow.flow_key}" ^<br/>
                  &nbsp;&nbsp;-H "Authorization: sk_YOUR_API_KEY" ^<br/>
                  &nbsp;&nbsp;-H "Content-Type: application/json" ^<br/>
                  &nbsp;&nbsp;-d "{'"{}"'}"
                </code>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DevicesPanel() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState([]);

  const fetchDevices = async () => {
    const res = await api.get('/devices');
    setDevices(res.data);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm(t('admin.devices.confirm_delete'))) return;
    await api.delete(`/devices/${id}`);
    fetchDevices();
  };

  return (
    <div className="panel">
      <h2>{t('admin.devices.title')}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('admin.devices.table.user')}</th>
            <th>{t('admin.devices.table.platform')}</th>
            <th>{t('admin.devices.table.last_active')}</th>
            <th>{t('admin.devices.table.status')}</th>
            <th>{t('admin.devices.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id}>
              <td>
                <strong>{d.username}</strong>
              </td>
              <td>
                <span className="badge">{d.platform}</span>
              </td>
              <td>{formatDateTime(d.last_active)}</td>
              <td>
                <span className={`status-dot ${d.is_active ? 'active' : 'inactive'}`}>
                  {d.is_active ? t('admin.devices.status_active') : t('admin.devices.status_inactive')}
                </span>
              </td>
              <td>
                <button className="btn-small danger" onClick={() => handleDelete(d.id)}>
                  {t('admin.common.delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApiKeysPanel() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState([]);
  const [newKey, setNewKey] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchKeys = async () => {
    const res = await api.get('/api-keys');
    setKeys(res.data);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await api.post('/api-keys', form);
    setNewKey(res.data.key);
    setForm({ name: '' });
    setShowForm(false);
    fetchKeys();
  };

  const handleRevoke = async (id) => {
    await api.post(`/api-keys/${id}/revoke`);
    fetchKeys();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.apikeys.confirm_delete'))) return;
    await api.delete(`/api-keys/${id}`);
    fetchKeys();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('admin.apikeys.title')}</h2>
        <button className="btn-small" onClick={() => setShowForm(!showForm)}>
          {t('admin.apikeys.add')}
        </button>
      </div>

      {newKey && (
        <div className="alert-box success">
          <p>
            <strong>{t('admin.apikeys.copy_hint')}</strong>
          </p>
          <code className="key-display">{newKey}</code>
          <button
            className="btn-small"
            onClick={() => {
              navigator.clipboard.writeText(newKey);
            }}
          >
            {t('admin.apikeys.btn_copy')}
          </button>
          <button className="btn-ghost" onClick={() => setNewKey(null)}>
            {t('admin.apikeys.btn_close')}
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="inline-form">
          <input
            className="input"
            required
            placeholder={t('admin.apikeys.placeholder_name')}
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
          />
          <button className="btn-primary" type="submit">
            {t('admin.apikeys.btn_create')}
          </button>
          <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>
            {t('common.cancel')}
          </button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t('admin.apikeys.table.name')}</th>
            <th>{t('admin.apikeys.table.prefix')}</th>
            <th>{t('admin.apikeys.table.usage')}</th>
            <th>{t('admin.apikeys.table.last_used')}</th>
            <th>{t('admin.apikeys.table.status')}</th>
            <th>{t('admin.apikeys.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id}>
              <td>{k.name}</td>
              <td>
                <code>{k.key_prefix}...</code>
              </td>
              <td>{k.usage_count}</td>
              <td>{formatDateTime(k.last_used_at)}</td>
              <td>
                <span className={`status-dot ${k.is_active ? 'active' : 'inactive'}`}>
                  {k.is_active ? t('admin.apikeys.status_active') : t('admin.apikeys.status_revoked')}
                </span>
              </td>
              <td>
                {k.is_active && (
                  <button className="btn-small" onClick={() => handleRevoke(k.id)}>
                    {t('admin.apikeys.btn_revoke')}
                  </button>
                )}
                <button className="btn-small danger" onClick={() => handleDelete(k.id)}>
                  {t('admin.common.delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPanel() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setStatus({ ok: false, msg: t('admin.settings.error_mismatch') });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setStatus({ ok: true, msg: t('admin.settings.success') });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || t('admin.settings.error_failed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>{t('admin.settings.title')}</h2>
      <div className="form-card">
        <h3>{t('admin.settings.change_password')}</h3>
        <form onSubmit={handleChange} className="form-stack">
          <div className="form-group">
            <label>{t('admin.settings.label_current')}</label>
            <input
              className="input"
              type="password"
              required
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.settings.label_new')}</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('admin.settings.label_confirm')}</label>
            <input
              className="input"
              type="password"
              required
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            />
          </div>
          {status && <p className={status.ok ? 'success-text' : 'error-text'}>{status.msg}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? t('admin.settings.updating') : t('admin.settings.btn_submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Main AdminPage ---
function AdminPage() {
  const { t } = useTranslation();
  const TABS = [
    t('admin.overview.title'),
    t('admin.send.title'),
    t('admin.flows.title'),
    t('admin.devices.title'),
    t('admin.apikeys.title'),
    t('admin.nav.qrcode'),
    t('admin.settings.title')
  ];
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState({ devices: 0, total: 0, pending_acks: 0 });
  const [recentNotices, setRecentNotices] = useState([]);
  const navigate = useNavigate();
  const adminUsername = localStorage.getItem('admin_username') || 'Admin';

  const fetchOverview = async () => {
    const [statsRes, noticesRes] = await Promise.all([
      api.get('/notices/stats'),
      api.get('/notices/all'),
    ]);
    setStats(statsRes.data);
    setRecentNotices(noticesRes.data.slice(0, 10));
  };

  useEffect(() => {
    if (tab !== 0) return;
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, [tab]);

  const handleClearNotices = async () => {
    if (!confirm(t('admin.overview.clear_confirm'))) return;
    await api.delete('/notices/clear');
    fetchOverview();
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_username');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="header-left">
          <span className="header-title">{t('admin.header_title')}</span>
        </div>
        <div className="header-right">
          <LanguageSwitcher />
          <span className="username-chip">{adminUsername}</span>
          <button className="btn-ghost small" onClick={handleLogout}>
            {t('admin.nav.logout')}
          </button>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map((t, i) => (
          <button
            key={i}
            className={`tab-btn ${tab === i ? 'active' : ''}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="admin-main">
        {tab === 0 && (
          <div className="panel">
            <div className="panel-header">
              <h2>{t('admin.overview.title')}</h2>
              <button className="btn-small danger" onClick={handleClearNotices}>
                {t('admin.overview.clear_btn')}
              </button>
            </div>
            
            <StatsPanel stats={stats} />
            
            <h3 style={{ marginTop: '24px' }}>{t('admin.overview.recent_title')}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('admin.overview.table.title')}</th>
                  <th>{t('admin.overview.table.content')}</th>
                  <th>{t('admin.overview.table.level')}</th>
                  <th>{t('admin.overview.table.source')}</th>
                  <th>{t('admin.overview.table.time')}</th>
                </tr>
              </thead>
              <tbody>
                {recentNotices.map((n) => (
                  <tr key={n.id}>
                    <td>{n.title}</td>
                    <td className="truncate">{n.message}</td>
                    <td>
                      <span className={`severity-chip ${n.severity}`}>{n.severity}</span>
                    </td>
                    <td>{n.flow_key ? <code>{n.flow_key}</code> : t('admin.overview.source_manual')}</td>
                    <td>{formatDateTime(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === 1 && <SendPanel />}
        {tab === 2 && <FlowsPanel />}
        {tab === 3 && <DevicesPanel />}
        {tab === 4 && <ApiKeysPanel />}
        {tab === 5 && <QRCodeCard />}
        {tab === 6 && <SettingsPanel />}
      </main>
      <footer style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'var(--text-secondary)', 
        fontSize: '0.8rem',
        opacity: 0.6
      }}>
        {t('admin.header_title')} v1.1.0-timezone-fix · Built with ❤️ for Taiwan
      </footer>
    </div>
  );
}

export default AdminPage;
