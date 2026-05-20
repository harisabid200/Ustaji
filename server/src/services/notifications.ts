import { isFirebaseAvailable, getMessaging } from './firebase-admin';

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!isFirebaseAvailable()) {
    console.log(`[FCM Simulated] → "${title}": ${body}`);
    return;
  }
  try {
    await getMessaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: { priority: 'high' },
    });
    console.log(`📱 FCM sent: ${title}`);
  } catch (e: any) {
    console.error('❌ FCM send failed:', e.message);
  }
}

export async function sendTopicNotification(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!isFirebaseAvailable()) {
    console.log(`[FCM Topic Simulated] topic=${topic} → "${title}"`);
    return;
  }
  try {
    await getMessaging().send({ topic, notification: { title, body }, data });
    console.log(`📢 FCM topic sent: ${topic} → ${title}`);
  } catch (e: any) {
    console.error('❌ FCM topic send failed:', e.message);
  }
}
