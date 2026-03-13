import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function AdminLoginPage() {
  const { t } = useTranslation();
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
      setError(err.response?.data?.error || t('admin.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="logo-icon admin">⚙️</div>
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <LanguageSwitcher />
        </div>
        <h1>{t('admin.login.title')}</h1>
        <p className="subtitle">{t('admin.login.subtitle')}</p>
        <form onSubmit={handleSubmit} className="form-stack">
          <input
            className="input"
            type="text"
            placeholder={t('admin.login.username_placeholder')}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            className="input"
            type="password"
            placeholder={t('admin.login.password_placeholder')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? t('admin.login.submitting') : t('admin.login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
