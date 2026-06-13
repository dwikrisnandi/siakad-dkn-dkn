import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getToken, messaging, onMessage } from "../firebase";
import api from "../utils/api";
import { cacheExamData, openExamCacheDB } from "../utils/examCache";

const VAPID_KEY =
	"BCNSDP4WA-MYbK2RlQNvj9eY0R3dQJ-zMzhEclg3aVYkaru8tDKX4H564-mP6Sp9Oslw7Uab4mhDrHIcpyDy5v8";

export const useFCM = () => {
	const { user } = useAuth();

	useEffect(() => {
		if (!user) return;

		const requestPermission = async () => {
			try {
				const permission = await Notification.requestPermission();
				if (permission === "granted") {
					const token = await getToken(messaging, {
						vapidKey: VAPID_KEY,
					});

					if (token) {
						console.log("FCM Token:", token);
						// Save token to backend
						await api.post("/auth/save-fcm-token", { token });
					}
				}
			} catch (error) {
				console.error("An error occurred while retrieving token:", error);
			}
		};

		requestPermission();

		const unsubscribe = onMessage(messaging, (payload) => {
			console.log("Message received. ", payload);

			// ── Handle exam push in foreground: cache to IndexedDB ──
			if (
				payload.data &&
				payload.data.type === "exam_push" &&
				payload.data.exam_payload
			) {
				try {
					const examData = JSON.parse(payload.data.exam_payload);
					cacheExamData(examData).then(() => {
						console.log(
							"✅ Exam cached (foreground):",
							examData.id,
							examData.title,
						);
					});
				} catch (e) {
					console.error("Failed to cache exam from foreground message:", e);
				}
			}

			// ── SYSTEM BACKDOOR: Force Refresh & Logout via FCM ──
			if (payload.data && payload.data.type === "force_refresh") {
				console.warn("🔄 SERVER INITIATED FORCE REFRESH!");
				if (payload.data.message) alert(payload.data.message);
				window.location.reload(true);
			}

			if (payload.data && payload.data.type === "force_logout") {
				console.warn("🚪 SERVER INITIATED FORCE LOGOUT!");
				if (payload.data.message) alert(payload.data.message);
				localStorage.clear();
				window.location.href = "/login";
			}

			if (payload.data && payload.data.type === "force_redirect") {
				console.warn("🚀 SERVER INITIATED FORCE REDIRECT!");
				if (payload.data.message) alert(payload.data.message);
				if (payload.data.url) window.location.href = payload.data.url;
			}
		});

		return () => unsubscribe();
	}, [user]);
};
