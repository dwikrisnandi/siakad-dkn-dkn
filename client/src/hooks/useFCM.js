import { useEffect } from 'react';
import { messaging, getToken, onMessage } from '../firebase';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

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
      // You can show a custom toast or notification here
    });

    return () => unsubscribe();
  }, [user]);
};
