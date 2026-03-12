import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { onForegroundMessage } from '../services/firebase';
import api from '../services/api';

const SEVERITY_CONFIG = {
  critical: { icon: '🔴', label: '緊急', class: 'critical' },
  warning: { icon: '🟡', label: '警告', class: 'warning' },
  info: { icon: '🔵', label: '一般', class: 'info' },
};

function NoticeCard({ notice, onAck }) {
  const cfg = SEVERITY_CONFIG[notice.severity] || SEVERITY_CONFIG.info;
  const dt = new Date(notice.created_at).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`notice-card ${cfg.class}`}>
      <div className="notice-card-header">
        <span className="severity-tag">
          {cfg.icon} {cfg.label}
        </span>
        <span className="notice-time">{dt}</span>
      </div>
      <h3 className="notice-title">{notice.title}</h3>
      <p className="notice-message">{notice.message}</p>
      {notice.flow_key && <div className="notice-source">來源：{notice.flow_key}</div>}
      <button className="btn-ack" onClick={() => onAck(notice.id)}>
        標示已讀
      </button>
    </div>
  );
}

export default function NoticePage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const username = localStorage.getItem('username') || '用戶';
  const deviceId = localStorage.getItem('device_id');

  const fetchNotices = useCallback(async () => {
    try {
      const res = await api.get(`/notices?device_id=${deviceId}`);
      // Only show unacked notices
      setNotices(res.data.filter((n) => !n.acked));
    } catch (err) {
      console.error('Failed to fetch notices', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchNotices();
    const interval = setInterval(fetchNotices, 10000);
    return () => clearInterval(interval);
  }, [fetchNotices]);

  // Handle foreground FCM messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage(() => {
      fetchNotices();
    });
    return unsubscribe;
  }, [fetchNotices]);

  const handleAck = async (noticeId) => {
    try {
      await api.post(`/notices/ack/${noticeId}`, { device_id: Number(deviceId) });
      setNotices((prev) => prev.filter((n) => n.id !== noticeId));
    } catch (err) {
      console.error('Ack failed', err);
    }
  };

  const handleAckAll = async () => {
    try {
      await Promise.all(
        notices.map((n) => api.post(`/notices/ack/${n.id}`, { device_id: Number(deviceId) }))
      );
      setNotices([]);
    } catch (err) {
      console.error('Ack all failed', err);
    }
  };

  const handleReset = () => {
    localStorage.clear();
    navigate('/register');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <div className="pulse-dot"></div>
          <span className="header-title">通知中心</span>
        </div>
        <div className="header-right">
          <span className="username-chip">{username}</span>
        </div>
      </header>

      <main className="app-main">
        <div className="summary-bar">
          <div className="summary-item">
            <span className="summary-value">{notices.length}</span>
            <span className="summary-label">未讀通知</span>
          </div>
          {notices.length > 0 && (
            <>
              <div className="summary-divider"></div>
              <button className="btn-ack-all" onClick={handleAckAll}>
                全部標示已讀
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="center-msg">
            <div className="spinner"></div>
          </div>
        ) : notices.length === 0 ? (
          <div className="center-msg empty-msg">目前沒有未讀通知</div>
        ) : (
          <div className="notice-list">
            {notices.map((n) => (
              <NoticeCard key={n.id} notice={n} onAck={handleAck} />
            ))}
          </div>
        )}
      </main>

      <footer className="bottom-nav">
        <div className="nav-item active">近期通知</div>
        <div className="nav-item" onClick={handleReset}>
          重設身分
        </div>
      </footer>
    </div>
  );
}
