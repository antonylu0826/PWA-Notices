importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCZf6pc9WqZGFSuroE8xdwbnXH2bW3QcdA",
  authDomain: "maxech-notice.firebaseapp.com",
  projectId: "maxech-notice",
  storageBucket: "maxech-notice.firebasestorage.app",
  messagingSenderId: "802679119595",
  appId: "1:802679119595:web:9b72cbbaea6d1425e9a8ae",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const severity = payload.data?.severity || 'info';

  const severityEmoji =
    severity === 'critical' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';

  self.registration.showNotification(`${severityEmoji} ${title}`, {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.data?.flowKey || 'notice',
    data: payload.data,
    requireInteraction: severity === 'critical',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
