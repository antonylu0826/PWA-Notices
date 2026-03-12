const admin = require('firebase-admin');

function getApp() {
  if (admin.apps.length) return admin.app();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || projectId === 'your-firebase-project-id') {
    return null; // Firebase not configured yet
  }
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

async function sendToToken(token, title, body, data = {}) {
  const app = getApp();
  if (!app) {
    console.warn('[FCM] Firebase not configured, skipping push notification');
    return { success: false, error: 'Firebase not configured', invalidToken: false };
  }
  try {
    const result = await admin.messaging().send({
      token,
      notification: { title, body },
      webpush: {
        notification: { title, body, icon: '/icon-192.png', badge: '/icon-192.png' },
        fcm_options: { link: '/' },
      },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
    return { success: true, messageId: result };
  } catch (error) {
    const isInvalid =
      error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token';
    return { success: false, error: error.message, invalidToken: isInvalid };
  }
}

async function sendToMany(tokens, title, body, data = {}) {
  const results = await Promise.all(tokens.map((t) => sendToToken(t, title, body, data)));
  return results;
}

module.exports = { sendToToken, sendToMany };
