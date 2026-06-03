/**
 * Firebase Messaging Service Worker
 * =================================
 * File ini diletakkan di folder public agar bisa diakses oleh browser as service worker.
 */

importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

// Menggunakan konfigurasi yang sama dengan firebase.js
firebase.initializeApp({
  apiKey: "AIzaSyCFxu2et4q__X9HYmUvFn82Ya-i3y6FbI0",
  authDomain: "siakad-dkn.firebaseapp.com",
  projectId: "siakad-dkn",
  storageBucket: "siakad-dkn.firebasestorage.app",
  messagingSenderId: "307512380445",
  appId: "1:307512380445:web:751d80352a6106b7f30af4"
});

const messaging = firebase.messaging();

// Menangani notifikasi saat aplikasi di background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.body || payload.notification.body,
    icon: '/favicon.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── PWA HANDLERS ─────────────────────────────────────────────────────────────
const CACHE_NAME = 'siakad-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

