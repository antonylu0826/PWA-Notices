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
  const appName = process.env.VITE_APP_NAME || '通知中心';
  
  if (!app) {
    console.warn('[FCM] Firebase not configured, skipping push notification');
    return { success: false, error: 'Firebase not configured', invalidToken: false };
  }
  try {
    const payload = {
      token,
      // On iOS:
      // notification.title: Main title
      // apns.payload.aps.alert.subtitle: Secondary title (We use appName here)
      notification: { 
        title: title || appName, 
        body: body 
      },
      // Minimal data to prevent SDK/SW from attempting to show a second notification
      data: {
        type: 'ping',
        noticeId: String(data.noticeId || '')
      },
      apns: {
        payload: {
          aps: {
            'content-available': 1,
            'mutable-content': 1,
            alert: {
              subtitle: title ? appName : '' 
            }
          }
        },
        headers: {
          'apns-priority': '10'
        }
      },
      android: {
        priority: 'high'
      }
    };

    const result = await admin.messaging().send(payload);
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
