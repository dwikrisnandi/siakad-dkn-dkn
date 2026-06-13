/**
 * Firebase Messaging Service Worker
 * =================================
 * File ini diletakkan di folder public agar bisa diakses oleh browser as service worker.
 * Includes IndexedDB caching for offline exam data pushed via FCM.
 */

importScripts(
	"https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js",
);
importScripts(
	"https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js",
);

// Menggunakan konfigurasi yang sama dengan firebase.js
firebase.initializeApp({
	apiKey: "AIzaSyCFxu2et4q__X9HYmUvFn82Ya-i3y6FbI0",
	authDomain: "siakad-dkn.firebaseapp.com",
	projectId: "siakad-dkn",
	storageBucket: "siakad-dkn.firebasestorage.app",
	messagingSenderId: "307512380445",
	appId: "1:307512380445:web:751d80352a6106b7f30af4",
});

const messaging = firebase.messaging();

// ── INDEXEDDB HELPERS FOR EXAM CACHING ──────────────────────────────────────
const DB_NAME = "siakad_exam_cache";
const DB_VERSION = 1;
const STORE_NAME = "exams";

function openExamDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "id" });
			}
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function cacheExamData(examPayload) {
	try {
		const db = await openExamDB();
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		// Add timestamp for cache management
		examPayload._cachedAt = Date.now();
		store.put(examPayload);
		return new Promise((resolve, reject) => {
			tx.oncomplete = () => {
				db.close();
				resolve();
			};
			tx.onerror = () => {
				db.close();
				reject(tx.error);
			};
		});
	} catch (e) {
		console.error("[SW] Failed to cache exam data:", e);
	}
}

// Menangani notifikasi saat aplikasi di background
messaging.onBackgroundMessage((payload) => {
	console.log(
		"[firebase-messaging-sw.js] Received background message ",
		payload,
	);

	// ── Handle exam push: cache data to IndexedDB ──
	if (
		payload.data &&
		payload.data.type === "exam_push" &&
		payload.data.exam_payload
	) {
		try {
			const examData = JSON.parse(payload.data.exam_payload);
			cacheExamData(examData).then(() => {
				console.log(
					"[SW] ✅ Exam cached to IndexedDB:",
					examData.id,
					examData.title,
				);
			});
		} catch (e) {
			console.error("[SW] Failed to parse/cache exam payload:", e);
		}
	}

	const notificationTitle =
		payload.notification?.title || "SIAKAD Notification";
	const notificationOptions = {
		body: payload.notification?.body || payload.data?.body || "",
		icon: "/favicon.svg",
		badge: "/favicon.svg",
		data: payload.data || {},
		// For exam push, add a tag to avoid duplicate notifications
		...(payload.data?.type === "exam_push"
			? {
					tag: `exam-${payload.data.exam_payload ? JSON.parse(payload.data.exam_payload).id : "unknown"}`,
				}
			: {}),
	};

	self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── PWA HANDLERS ─────────────────────────────────────────────────────────────
const CACHE_NAME = "siakad-pwa-v1";
const ASSETS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/favicon.svg"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(ASSETS_TO_CACHE);
		}),
	);
});

self.addEventListener("fetch", (event) => {
	// Hanya tangani GET requests
	if (event.request.method !== "GET") return;

	event.respondWith(
		caches.match(event.request).then((response) => {
			return response || fetch(event.request);
		}),
	);
});

// ── HANDLE NOTIFICATION CLICKS ─────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	// Open the app when notification is clicked
	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientList) => {
				if (clientList.length > 0) {
					return clientList[0].focus();
				}
				return clients.openWindow("/");
			}),
	);
});
