import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestFCMToken } from '../services/firebase';
import api from '../services/api';

export default function RegisterPage() {
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
        setError('請允許通知權限才能使用此服務。');
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
      setError('註冊失敗，請稍後再試。');
      setStep('error');
    }
  };

  return (
    <div className="page-center">
      <div className="card">
        <div className="logo-icon">🔔</div>
        <h1>Notices</h1>
        <p className="subtitle">即時推播通知系統</p>

        {step === 'input' || step === 'error' ? (
          <form onSubmit={handleSubmit} className="form-stack">
            <p className="hint">輸入您的姓名以綁定此裝置</p>
            <input
              className="input"
              type="text"
              placeholder="請輸入姓名..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit">
              開始使用
            </button>
          </form>
        ) : step === 'requesting' ? (
          <div className="status-msg">
            <div className="spinner"></div>
            <p>正在申請通知權限...</p>
          </div>
        ) : (
          <div className="status-msg success">
            <div className="check-icon">✓</div>
            <p>註冊成功！</p>
          </div>
        )}
      </div>
    </div>
  );
}
