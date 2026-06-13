import {
	ArrowRight,
	BookOpen,
	LayoutDashboard,
	MonitorPlay,
	ShieldCheck,
	Sparkles,
	Globe,
	Building
} from "lucide-react";
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

export default function LandingPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();

	// Jika sudah login, langsung arahkan ke dashboard sesuai role
	useEffect(() => {
		if (user) {
			navigate(`/${user.role}`);
		}
	}, [user, navigate]);

	const changeLanguage = (lng) => {
		i18n.changeLanguage(lng);
		// Update parameter URL tanpa reload untuk memancing Googlebot SEO
		window.history.pushState(null, "", `?lang=${lng}`);
	};

	return (
		<div
			style={{
				minHeight: "100vh",
				fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
				background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
				color: "#f8fafc",
				overflowX: "clip",
				position: "relative",
			}}
		>
			<Helmet>
				{/* SEO i18n & Hreflang Injection */}
				<html lang={i18n.language} />
				<title>{t('landing.title1')} {t('landing.title3')} - SIAKAD</title>
				<meta name="description" content={t('landing.subtitle')} />
				<link rel="alternate" hrefLang="x-default" href="https://siakad.arthavirddhisampada.online/" />
				<link rel="alternate" hrefLang="en" href="https://siakad.arthavirddhisampada.online/?lang=en" />
				<link rel="alternate" hrefLang="id" href="https://siakad.arthavirddhisampada.online/?lang=id" />
			</Helmet>

			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease;
        }
        .glass-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.06);
        }
        .gradient-text {
          background: linear-gradient(135deg, #c084fc 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 6s ease-in-out 3s infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .hero-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          z-index: 0;
        }
        .blob-1 {
          width: 500px; height: 500px;
          background: rgba(168, 85, 247, 0.3);
          top: -150px; left: -150px;
        }
        .blob-2 {
          width: 600px; height: 600px;
          background: rgba(59, 130, 246, 0.2);
          bottom: -200px; right: -200px;
        }
        .blob-3 {
          width: 400px; height: 400px;
          background: rgba(236, 72, 153, 0.2);
          top: 30%; left: 40%;
        }
        .btn-glow {
          background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
          color: white;
          border: none;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
          transition: all 0.3s ease;
        }
        .btn-glow:hover {
          color: white;
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
          transform: translateY(-2px);
        }
      `}</style>

			{/* Background Blobs */}
			<div className="hero-blob blob-1"></div>
			<div className="hero-blob blob-2 animate-float-delayed"></div>
			<div className="hero-blob blob-3 animate-float"></div>

			{/* Navbar */}
			<nav
				className="d-flex justify-content-between align-items-center p-4 position-relative flex-wrap"
				style={{ zIndex: 10 }}
			>
				<div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
					<img
						src="/favicon.svg"
						alt="SIAKAD Logo"
						className="rounded-circle shadow-lg bg-light"
						style={{ width: "45px", height: "45px", padding: "4px" }}
					/>
					<span className="fs-3 fw-bold tracking-tight">
						SIAKAD <span className="text-primary">DKN</span>
					</span>
				</div>
				<div className="d-flex align-items-center gap-3">
					<div className="dropdown">
						<button className="btn btn-outline-light rounded-pill dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" style={{ borderColor: 'rgba(255,255,255,0.2)'}}>
							<Globe size={18} /> {i18n.language.toUpperCase()}
						</button>
						<ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow-lg" style={{ background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)'}}>
							<li><button className="dropdown-item" onClick={() => changeLanguage('en')}>🇬🇧 English (EN)</button></li>
							<li><button className="dropdown-item" onClick={() => changeLanguage('id')}>🇮🇩 Indonesia (ID)</button></li>
						</ul>
					</div>
					<Link
						to="/register"
						className="btn btn-outline-light rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
						style={{ borderColor: 'rgba(255,255,255,0.2)'}}
					>
						<Building size={18} /> {t('landing.register')}
					</Link>
					<Link
						to="/login"
						className="btn btn-glow rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2"
					>
						{t('landing.login')} <ArrowRight size={18} />
					</Link>
				</div>
			</nav>

			{/* Hero Section */}
			<main
				className="container-fluid px-4 px-lg-5 position-relative"
				style={{ zIndex: 10, marginTop: "8vh", paddingBottom: "10vh" }}
			>
				<div className="row align-items-center">
					<div className="col-lg-6 mb-5 mb-lg-0 pe-lg-5">
						<div
							className="badge glass-card px-3 py-2 mb-4 text-white d-inline-flex align-items-center gap-2 border-0"
							style={{ background: "rgba(255,255,255,0.1)" }}
						>
							<ShieldCheck size={16} className="text-success" />
							<span className="fw-normal">{t('landing.badge')}</span>
						</div>
						<h1
							className="display-3 fw-bolder mb-4 lh-1"
							style={{ letterSpacing: "-1px" }}
						>
							{t('landing.title1')} <br />
							<span className="gradient-text">{t('landing.title2')}</span> <br />
							{t('landing.title3')}
						</h1>
						<p
							className="fs-5 mb-5"
							style={{ color: "#94a3b8", maxWidth: "540px", lineHeight: "1.6" }}
						>
							{t('landing.subtitle')}
						</p>
						<div className="d-flex gap-3">
							<Link
								to="/register"
								className="btn btn-glow rounded-pill px-5 py-3 fs-5 fw-bold d-flex align-items-center gap-2 shadow-lg"
							>
								{t('landing.start')} <ArrowRight size={20} />
							</Link>
						</div>
					</div>

					<div className="col-lg-6 position-relative ps-lg-5">
						<div className="row g-4 position-relative">
							<div className="col-6 mt-5 animate-float">
								<div className="glass-card p-4 mb-4">
									<div
										className="bg-primary bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "60px", height: "60px" }}
									>
										<MonitorPlay size={30} className="text-primary" />
									</div>
									<h4 className="fw-bold mb-2">{t('landing.feature1_title')}</h4>
									<p
										className="mb-0"
										style={{ color: "#94a3b8", fontSize: "0.95rem" }}
									>
										{t('landing.feature1_desc')}
									</p>
								</div>
								<div className="glass-card p-4">
									<div
										className="bg-success bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "60px", height: "60px" }}
									>
										<BookOpen size={30} className="text-success" />
									</div>
									<h4 className="fw-bold mb-2">{t('landing.feature2_title')}</h4>
									<p
										className="mb-0"
										style={{ color: "#94a3b8", fontSize: "0.95rem" }}
									>
										{t('landing.feature2_desc')}
									</p>
								</div>
							</div>
							<div className="col-6 animate-float-delayed">
								<div className="glass-card p-4 mb-4">
									<div
										className="bg-warning bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "60px", height: "60px" }}
									>
										<LayoutDashboard size={30} className="text-warning" />
									</div>
									<h4 className="fw-bold mb-2">{t('landing.feature3_title')}</h4>
									<p
										className="mb-0"
										style={{ color: "#94a3b8", fontSize: "0.95rem" }}
									>
										{t('landing.feature3_desc')}
									</p>
								</div>
								<div className="glass-card p-4">
									<div
										className="bg-info bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "60px", height: "60px" }}
									>
										<Sparkles size={30} className="text-info" />
									</div>
									<h4 className="fw-bold mb-2">{t('landing.feature4_title')}</h4>
									<p
										className="mb-0"
										style={{ color: "#94a3b8", fontSize: "0.95rem" }}
									>
										{t('landing.feature4_desc')}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer
				className="text-center py-4 mt-auto position-relative"
				style={{
					zIndex: 10,
					borderTop: "1px solid rgba(255,255,255,0.05)",
					color: "#475569",
				}}
			>
				<p className="mb-0 fw-medium">
					&copy; 2026 {t('landing.footer')}
				</p>
			</footer>
		</div>
	);
}
