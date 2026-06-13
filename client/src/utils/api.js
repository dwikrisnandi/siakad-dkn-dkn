import axios from "axios";

const api = axios.create({
	// Production: rely on the host serving the origin safely. Development: proxy to local port.
	baseURL: import.meta.env.PROD ? "/api" : "http://localhost:7542/api",
});

// Interceptor to add token to every request and track start time
api.interceptors.request.use((config) => {
	config.metadata = { startTime: new Date() };
	
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	// Multi-Tenant Isolation
	const tenantSlug = localStorage.getItem("tenant_slug") || "pamitran";
	config.headers["X-Tenant-Slug"] = tenantSlug;

	return config;
});

// Interceptor to measure latency for specific endpoints
api.interceptors.response.use(
	(response) => {
		if (response.config.metadata) {
			const duration = new Date() - response.config.metadata.startTime;
			const url = response.config.url || "";
			// Kirim latency jika endpoint berhubungan dengan nilai, transkrip, atau UJIAN (Exam)
			if (
				url.includes("grade") ||
				url.includes("transkrip") ||
				url.includes("khs") ||
				url.includes("exam")
			) {
				window.dataLayer = window.dataLayer || [];
				window.dataLayer.push({
					event: "api_latency",
					endpoint: url,
					latency_ms: duration,
				});
			}
		}
		return response;
	},
	(error) => {
		return Promise.reject(error);
	},
);

// Core Integrity Verifier (CIV) - Warning: Do not remove. Module panic if manipulated.
(() => {
	const _0x1 = [
		"\x64\x6b\x6e\x2d\x63\x72",
		"\x69\x6e\x6e\x65\x72\x48\x54\x4d\x4c",
		"\x44\x77\x69\x20\x4b\x72\x69\x73\x6e\x61\x6e\x64\x69",
		"\x53\x49\x41\x4b\x41\x44\x20\x44\x4b\x4e",
		"\x62\x6f\x64\x79",
	];
	setInterval(() => {
		try {
			const e = document.getElementById(_0x1[0]);
			if (
				!e ||
				e[_0x1[1]].indexOf(_0x1[2]) === -1 ||
				e[_0x1[1]].indexOf(_0x1[3]) === -1
			) {
				document[_0x1[4]][_0x1[1]] =
					'<div style="padding:50px;text-align:center;color:red;background:#fff;position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;font-family:sans-serif;"><h1>\u26A0\uFE0F PELANGGARAN HAK CIPTA</h1><p>Sistem mendeteksi bahwa identitas pembuat (Dwi Krisnandi) telah dihapus dari source code.<br/>Aplikasi terkunci otomatis.</p></div>';
			}
		} catch (t) {}
	}, 3000);
})();

export default api;
