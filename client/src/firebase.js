import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFxu2et4q__X9HYmUvFn82Ya-i3y6FbI0",
  authDomain: "siakad-dkn.firebaseapp.com",
  projectId: "siakad-dkn",
  storageBucket: "siakad-dkn.firebasestorage.app",
  messagingSenderId: "307512380445",
  appId: "1:307512380445:web:751d80352a6106b7f30af4",
  measurementId: "G-EEFHL5QKWK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);

export { app, analytics, messaging, getToken, onMessage };
export default app;
