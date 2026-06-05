import { useEffect } from 'react';
import { messaging, getToken, onMessage } from '../firebase';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { openExamCacheDB, cacheExamData } from '../utils/examCache';

const VAPID_KEY = "BCNSDP4WA-MYbK2RlQNvj9eY0R3dQJ-zMzhEclg3aVYkaru8tDKX4H564-mP6Sp9Oslw7Uab4mhDrHIcpyDy5v8";

export const useFCM = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { 
            vapidKey: VAPID_KEY
          });
          
          if (token) {
            console.log('FCM Token:', token);
            // Save token to backend
            await api.post('/auth/save-fcm-token', { token });
          }
        }
      } catch (error) {
        console.error('An error occurred while retrieving token:', error);
      }
    };

    requestPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);

      // ── Handle exam push in foreground: cache to IndexedDB ──
      if (payload.data && payload.data.type === 'exam_push' && payload.data.exam_payload) {
        try {
          const examData = JSON.parse(payload.data.exam_payload);
          cacheExamData(examData).then(() => {
            console.log('✅ Exam cached (foreground):', examData.id, examData.title);
          });
        } catch (e) {
          console.error('Failed to cache exam from foreground message:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);
};
