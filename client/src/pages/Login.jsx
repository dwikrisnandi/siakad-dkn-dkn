import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function Login() {
	const [nidn_nim, setNidnNim] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const { login } = useAuth();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [campusName, setCampusName] = useState("");

	React.useEffect(() => {
		const fetchTenant = async () => {
			try {
				const slug = localStorage.getItem("tenant_slug") || "artha";
				const res = await api.get(`/public/tenant/info/${slug}`);
				setCampusName(res.data.name);
			} catch (err) {
				setCampusName(t("auth.subtitle"));
			}
		};
		fetchTenant();
	}, [t]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const u = await login(nidn_nim, password);
			// Route based on role
			if (u.role === "admin") navigate("/admin");
			else if (u.role === "dosen") navigate("/dosen");
			else if (u.role === "mahasiswa") navigate("/mahasiswa");
		} catch (err) {
			setError(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div 
			className="d-flex align-items-center justify-content-center vh-100"
			style={{
				background: "linear-gradient(135deg, var(--bg-body) 0%, #e0e7ff 100%)",
				position: "relative",
				overflow: "hidden"
			}}
		>
			{/* Decorative background elements */}
			<div style={{
				position: "absolute", top: "-10%", left: "-5%", width: "40vw", height: "40vw", 
				background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, rgba(255,255,255,0) 70%)", 
				borderRadius: "50%", zIndex: 0
			}}></div>
			<div style={{
				position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", 
				background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%)", 
				borderRadius: "50%", zIndex: 0
			}}></div>

			<div
				className="premium-card p-5 position-relative animate-fade-up"
				style={{ 
					width: "100%", maxWidth: "450px", 
					background: "rgba(255, 255, 255, 0.95)", 
					backdropFilter: "blur(10px)",
					zIndex: 1
				}}
			>
				<div className="text-center mb-5">
					<div 
						className="d-inline-flex align-items-center justify-content-center bg-primary rounded-circle mb-3 shadow-sm"
						style={{ width: "70px", height: "70px", background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)" }}
					>
						<img src="/favicon.svg" alt="Logo" style={{ width: "40px", filter: "brightness(0) invert(1)" }} />
					</div>
					<h2 className="fw-bold mb-1" style={{ color: "var(--text-main)", letterSpacing: "-0.5px" }}>SIAKAD DKN</h2>
					<p className="text-muted mb-0">{campusName || t("auth.subtitle")}</p>
				</div>

				{error && <div className="alert alert-danger py-2 border-0 shadow-sm" style={{ borderRadius: "var(--radius-md)" }}>{error}</div>}

				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label className="form-label fw-semibold text-muted small">{t("auth.nidn_nim")}</label>
						<input
							type="text"
							className="form-control form-control-premium"
							placeholder={t("auth.nidn_nim_ph")}
							value={nidn_nim}
							onChange={(e) => setNidnNim(e.target.value)}
							required
						/>
					</div>
					<div className="mb-5">
						<label className="form-label fw-semibold text-muted small">{t("auth.password")}</label>
						<input
							type="password"
							className="form-control form-control-premium"
							placeholder={t("auth.password_ph")}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<button
						type="submit"
						className="btn-premium w-100 py-3"
						disabled={loading}
					>
						{loading ? t("auth.checking") : t("auth.login_btn")}
					</button>
				</form>
				
				<div className="text-center mt-4 pt-3 border-top">
					<p className="text-muted small mb-0">Platform Cerdas Pendidikan &copy; 2026</p>
				</div>
			</div>
		</div>
	);
}
