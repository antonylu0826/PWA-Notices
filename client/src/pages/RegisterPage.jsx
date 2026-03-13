import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestFCMToken } from '../services/firebase';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [step, setStep] = useState('input'); // input | requesting | done | error
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setStep('requesting');
    setError('');

    try {
      const token = await requestFCMToken();
      if (!token) {
        setError(t('register.permission_error'));
        setStep('error');
        return;
      }

      const res = await api.post('/devices', {
        username: name.trim(),
        fcm_token: token,
        platform: 'web',
      });

      localStorage.setItem('username', name.trim());
      localStorage.setItem('device_id', String(res.data.device_id));
      localStorage.setItem('fcm_token', token);
      setStep('done');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setError(t('register.register_failed'));
      setStep('error');
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="logo-icon">🔔</div>
        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <LanguageSwitcher />
        </div>
        <h1>{t('register.title')}</h1>
        <p className="subtitle">{t('register.subtitle')}</p>

        {step === 'input' || step === 'error' ? (
          <form onSubmit={handleSubmit} className="form-stack">
            <p className="hint">{t('register.hint')}</p>
            <input
              className="input"
              type="text"
              placeholder={t('register.placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit">
              {t('register.btn_submit')}
            </button>
          </form>
        ) : step === 'requesting' ? (
          <div className="status-msg">
            <div className="spinner"></div>
            <p>{t('register.requesting_permission')}</p>
          </div>
        ) : (
          <div className="status-msg success">
            <div className="check-icon">✓</div>
            <p>{t('register.success')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
