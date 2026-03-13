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

// Solution E: No background message listener. 
// We rely entirely on the system-level 'notification' payload.
// This prevents duplicated notifications on iOS.

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
