import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AdminLoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      // Token is now set via httpOnly cookie
      localStorage.setItem('admin_username', res.data.username);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="logo-icon admin">⚙️</div>
        <h1>管理後台</h1>
        <p className="subtitle">通知中心管理</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <input
            className="input"
            type="text"
            placeholder="帳號"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="密碼"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}
