const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let fcmEnabled = false;

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    fcmEnabled = true;
    console.log('✅ FCM initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize FCM:', error.message);
  }
} else {
  console.warn('⚠️ FCM: serviceAccountKey.json not found. Push notifications will be skipped.');
}

const sendPushNotification = async (token, title, body, data = {}) => {
  if (!fcmEnabled || !token) return;

  const message = {
    notification: { title, body },
    data: data,
    token: token
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

const sendMulticastNotification = async (tokens, title, body, data = {}) => {
  if (!fcmEnabled || !tokens || tokens.length === 0) return;

  const message = {
    notification: { title, body },
    data: data,
    tokens: tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('Successfully sent multicast message:', response.successCount, 'successes,', response.failureCount, 'failures');
    return response;
  } catch (error) {
    console.error('Error sending multicast message:', error);
  }
};

module.exports = { sendPushNotification, sendMulticastNotification };
