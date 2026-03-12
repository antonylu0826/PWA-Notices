import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// --- Sub-components ---

function StatsPanel({ stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-value">{stats.devices}</span>
        <span className="stat-label">已註冊裝置</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.total}</span>
        <span className="stat-label">通知總計</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.pending_acks}</span>
        <span className="stat-label">未簽收通知</span>
      </div>
    </div>
  );
}

function SendPanel() {
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
      alert('請至少選擇一位用戶');
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
      setStatus({ ok: true, msg: `已發送給 ${res.data.sent} 個裝置` });
      setForm({ title: '', message: '', severity: 'info' });
      setTargetType('all');
      setTargetUsers([]);
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || '發送失敗' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>📣 發送即時推播</h2>
      <form onSubmit={handleSend} className="form-stack">
        <div className="form-group">
          <label>通知標題</label>
          <input
            className="input"
            required
            placeholder="標題"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>內容</label>
          <textarea
            className="input textarea"
            required
            placeholder="訊息內容..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>緊急程度</label>
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
                {s === 'info' ? '一般' : s === 'warning' ? '警告' : '緊急'}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>發送對象</label>
          <div className="radio-group" style={{ marginBottom: '8px' }}>
            {['all', 'users'].map((t) => (
              <label
                key={t}
                className={`radio-label ${targetType === t ? 'active' : ''}`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value={t}
                  checked={targetType === t}
                  onChange={() => { setTargetType(t); setTargetUsers([]); }}
                />
                {t === 'all' ? '所有人' : '指定用戶'}
              </label>
            ))}
          </div>
          {targetType === 'users' && (
            <div className="checkbox-list">
              {users.length === 0 ? (
                <span className="hint-text">尚無已註冊用戶</span>
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
          {loading ? '發送中...' : '立即發送'}
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
      alert(err.response?.data?.error || '儲存失敗');
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
    if (!confirm('確定刪除此流程？')) return;
    await api.delete(`/flows/${id}`);
    fetchFlows();
  };

  const handleTest = async (flow) => {
    try {
      const res = await api.post(`/flows/${flow.id}/test`, {});
      alert(`測試發送成功，推播至 ${res.data.sent ?? 0} 個裝置`);
    } catch (err) {
      alert(err.response?.data?.error || '測試失敗');
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>⚡ 通知流程</h2>
        <button
          className="btn-small"
          onClick={() => {
            setShowForm(true);
            setEditingFlow(null);
            setForm(EMPTY_FORM);
          }}
        >
          + 新增流程
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>{editingFlow ? '編輯流程' : '新增流程'}</h3>
          <form onSubmit={handleSave} className="form-stack">
            <div className="form-row">
              <div className="form-group">
                <label>Flow Key (唯一識別碼)</label>
                <input
                  className="input"
                  required
                  placeholder="e.g. welding_alarm"
                  value={form.flow_key}
                  onChange={(e) => setForm({ ...form, flow_key: e.target.value })}
                  disabled={!!editingFlow}
                />
              </div>
              <div className="form-group">
                <label>名稱</label>
                <input
                  className="input"
                  required
                  placeholder="流程名稱"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>說明（可選）</label>
              <input
                className="input"
                placeholder="流程說明"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>
                通知標題模板{' '}
                <span className="hint-text">（可用 {'{{變數}}'} 語法）</span>
              </label>
              <input
                className="input"
                required
                placeholder="例：機台 {{machine_id}} 警報"
                value={form.template_title}
                onChange={(e) => setForm({ ...form, template_title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>通知內容模板</label>
              <textarea
                className="input textarea"
                required
                placeholder="例：錯誤代碼 {{error_code}}：{{message}}"
                value={form.template_message}
                onChange={(e) => setForm({ ...form, template_message: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>緊急程度</label>
              <select
                className="input"
                value={form.template_severity}
                onChange={(e) => setForm({ ...form, template_severity: e.target.value })}
              >
                <option value="info">一般 (info)</option>
                <option value="warning">警告 (warning)</option>
                <option value="critical">緊急 (critical)</option>
              </select>
            </div>
            <div className="form-group">
              <label>觸發條件 (JSON Array)</label>
              <textarea
                className="input textarea small"
                placeholder='[{"field":"severity","operator":"in","value":["high","urgent"]}]'
                value={form.conditions}
                onChange={(e) => setForm({ ...form, conditions: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>接收者</label>
              <div className="radio-group" style={{ marginBottom: '8px' }}>
                {['all', 'users'].map((t) => (
                  <label
                    key={t}
                    className={`radio-label ${form.recipientType === t ? 'active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="recipientType"
                      value={t}
                      checked={form.recipientType === t}
                      onChange={() => setForm({ ...form, recipientType: t, recipientUsers: [] })}
                    />
                    {t === 'all' ? '所有人' : '指定用戶'}
                  </label>
                ))}
              </div>
              {form.recipientType === 'users' && (
                <div className="checkbox-list">
                  {users.length === 0 ? (
                    <span className="hint-text">尚無已註冊用戶</span>
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
              <label>頻率限制（秒，0=不限）</label>
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
                儲存
              </button>
              <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flow-list">
        {flows.length === 0 ? (
          <p className="empty-text">尚未建立任何流程</p>
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
                    {flow.enabled ? '啟用' : '停用'}
                  </button>
                  <button className="btn-small" onClick={() => handleTest(flow)}>
                    測試
                  </button>
                  <button className="btn-small" onClick={() => handleEdit(flow)}>
                    編輯
                  </button>
                  <button
                    className="btn-small danger"
                    onClick={() => handleDelete(flow.id)}
                  >
                    刪除
                  </button>
                </div>
              </div>
              <div className="flow-meta">
                觸發 {flow.trigger_count} 次
                {flow.last_triggered &&
                  ` · 最後：${new Date(flow.last_triggered).toLocaleString('zh-TW')}`}
              </div>
              <div className="flow-trigger-example">
                <code>
                  curl -X POST /api/flows/trigger/{flow.flow_key} -H "X-API-Key: sk_..." -d
                  '{'{}'}'
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
  const [devices, setDevices] = useState([]);

  const fetchDevices = async () => {
    const res = await api.get('/devices');
    setDevices(res.data);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('確定刪除此裝置？')) return;
    await api.delete(`/devices/${id}`);
    fetchDevices();
  };

  return (
    <div className="panel">
      <h2>📱 已註冊裝置</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>用戶</th>
            <th>平台</th>
            <th>最後上線</th>
            <th>狀態</th>
            <th>操作</th>
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
              <td>{new Date(d.last_active).toLocaleString('zh-TW')}</td>
              <td>
                <span className={`status-dot ${d.is_active ? 'active' : 'inactive'}`}>
                  {d.is_active ? '正常' : '停用'}
                </span>
              </td>
              <td>
                <button className="btn-small danger" onClick={() => handleDelete(d.id)}>
                  刪除
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
    if (!confirm('確定刪除此 API Key？')) return;
    await api.delete(`/api-keys/${id}`);
    fetchKeys();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>🔑 API Keys</h2>
        <button className="btn-small" onClick={() => setShowForm(!showForm)}>
          + 新增
        </button>
      </div>

      {newKey && (
        <div className="alert-box success">
          <p>
            <strong>請複製此 API Key，離開後將無法再查看：</strong>
          </p>
          <code className="key-display">{newKey}</code>
          <button
            className="btn-small"
            onClick={() => {
              navigator.clipboard.writeText(newKey);
            }}
          >
            複製
          </button>
          <button className="btn-ghost" onClick={() => setNewKey(null)}>
            關閉
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="inline-form">
          <input
            className="input"
            required
            placeholder="Key 名稱（例：工廠系統）"
            value={form.name}
            onChange={(e) => setForm({ name: e.target.value })}
          />
          <button className="btn-primary" type="submit">
            建立
          </button>
          <button className="btn-ghost" type="button" onClick={() => setShowForm(false)}>
            取消
          </button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>名稱</th>
            <th>前綴</th>
            <th>使用次數</th>
            <th>最後使用</th>
            <th>狀態</th>
            <th>操作</th>
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
              <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString('zh-TW') : '—'}</td>
              <td>
                <span className={`status-dot ${k.is_active ? 'active' : 'inactive'}`}>
                  {k.is_active ? '有效' : '已撤銷'}
                </span>
              </td>
              <td>
                {k.is_active && (
                  <button className="btn-small" onClick={() => handleRevoke(k.id)}>
                    撤銷
                  </button>
                )}
                <button className="btn-small danger" onClick={() => handleDelete(k.id)}>
                  刪除
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
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setStatus({ ok: false, msg: '新密碼與確認密碼不一致' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setStatus({ ok: true, msg: '密碼已成功更新' });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || '更新失敗' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>⚙️ 帳號設定</h2>
      <div className="form-card">
        <h3>變更密碼</h3>
        <form onSubmit={handleChange} className="form-stack">
          <div className="form-group">
            <label>目前密碼</label>
            <input
              className="input"
              type="password"
              required
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>新密碼（至少 6 個字元）</label>
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
            <label>確認新密碼</label>
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
            {loading ? '更新中...' : '確認變更'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Main AdminPage ---
const TABS = ['概覽', '發送通知', '通知流程', '裝置管理', 'API Keys', '設定'];

export default function AdminPage() {
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
    if (!confirm('確定要清除所有通知記錄？此操作無法還原。')) return;
    await api.delete('/notices/clear');
    fetchOverview();
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="header-left">
          <span className="header-title">⚙️ 通知中心管理</span>
        </div>
        <div className="header-right">
          <span className="username-chip">{adminUsername}</span>
          <button className="btn-ghost small" onClick={handleLogout}>
            登出
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
              <h2>📊 系統概覽</h2>
              <button className="btn-small danger" onClick={handleClearNotices}>
                清除通知記錄
              </button>
            </div>
            <StatsPanel stats={stats} />
            <h3 style={{ marginTop: '24px' }}>最近通知</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>標題</th>
                  <th>內容</th>
                  <th>等級</th>
                  <th>來源</th>
                  <th>時間</th>
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
                    <td>{n.flow_key ? <code>{n.flow_key}</code> : '手動'}</td>
                    <td>{new Date(n.created_at).toLocaleString('zh-TW')}</td>
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
        {tab === 5 && <SettingsPanel />}
      </main>
    </div>
  );
}
