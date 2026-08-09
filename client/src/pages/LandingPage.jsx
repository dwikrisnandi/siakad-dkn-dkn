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
				backgroundColor: "#f4f7f6",
				color: "#2c3e50",
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        .hero-section {
          background: linear-gradient(135deg, #ffffff 0%, #eef2f3 100%);
          position: relative;
        }
        
        /* Subtle Grid Background Pattern */
        .grid-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#d1d5db 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.5;
          z-index: 0;
        }

        .academic-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        
        .academic-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border-color: rgba(37, 99, 235, 0.2);
        }

        .text-accent {
          color: #2563eb; /* Academic Blue */
        }
        
        .bg-accent {
          background-color: #2563eb;
        }

        .btn-academic {
          background-color: #2563eb;
          color: white;
          border: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
        }
        
        .btn-academic:hover {
          background-color: #1d4ed8;
          color: white;
          transform: translateY(-1px);
          box-shadow: 0 6px 12px rgba(37, 99, 235, 0.3);
        }
        
        .btn-outline-academic {
          border: 2px solid #e5e7eb;
          color: #4b5563;
          background: white;
          transition: all 0.2s ease;
        }
        
        .btn-outline-academic:hover {
          border-color: #d1d5db;
          color: #1f2937;
          background: #f9fafb;
        }
      `}</style>

			{/* Navbar */}
			<nav
				className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 p-md-4 position-relative bg-white border-bottom shadow-sm"
				style={{ zIndex: 10 }}
			>
				<div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
					<img
						src="/favicon.svg"
						alt="SIAKAD Logo"
						className="rounded-circle shadow-sm"
						style={{ width: "45px", height: "45px", padding: "4px", border: "1px solid #e5e7eb" }}
					/>
					<span className="fs-3 fw-bold tracking-tight text-dark">
						SIAKAD <span className="text-accent">DKN</span>
					</span>
				</div>
				<div className="d-flex align-items-center gap-2 gap-md-3 flex-wrap justify-content-center">
					<div className="dropdown">
						<button className="btn btn-outline-academic rounded-pill dropdown-toggle d-flex align-items-center gap-2 btn-sm px-3 py-2 px-md-4" type="button" data-bs-toggle="dropdown" aria-expanded="false">
							<Globe size={18} /> <span className="d-none d-sm-inline">{i18n.language.toUpperCase()}</span>
						</button>
						<ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2">
							<li><button className="dropdown-item py-2" onClick={() => changeLanguage('en')}>🇬🇧 English (EN)</button></li>
							<li><button className="dropdown-item py-2" onClick={() => changeLanguage('id')}>🇮🇩 Indonesia (ID)</button></li>
						</ul>
					</div>
					<Link
						to="/register"
						className="btn btn-outline-academic rounded-pill px-3 py-2 px-md-4 fw-semibold d-flex align-items-center gap-2 btn-sm"
					>
						<Building size={18} /> <span className="d-none d-sm-inline">{t('landing.register')}</span>
					</Link>
					<Link
						to="/login"
						className="btn btn-academic rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2 btn-sm"
					>
						{t('landing.login')} <ArrowRight size={18} />
					</Link>
				</div>
			</nav>

			{/* Hero Section */}
			<main
				className="container-fluid px-4 px-lg-5 position-relative hero-section pb-5"
				style={{ zIndex: 5, paddingTop: "8vh", minHeight: "85vh" }}
			>
				<div className="grid-pattern"></div>
				<div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
					<div className="col-lg-6 mb-5 mb-lg-0 pe-lg-5">
						<div
							className="badge bg-white text-dark shadow-sm px-3 py-2 mb-4 d-inline-flex align-items-center gap-2 border"
							style={{ borderRadius: "8px" }}
						>
							<ShieldCheck size={16} className="text-success" />
							<span className="fw-medium">{t('landing.badge')}</span>
						</div>
						<h1
							className="display-4 fw-bolder mb-4 lh-sm text-dark"
							style={{ letterSpacing: "-1px" }}
						>
							{t('landing.title1')} <br />
							<span className="text-accent">{t('landing.title2')}</span> <br />
							{t('landing.title3')}
						</h1>
						<p
							className="fs-5 mb-5"
							style={{ color: "#475569", maxWidth: "540px", lineHeight: "1.7" }}
						>
							{t('landing.subtitle')}
						</p>
						<div className="d-flex gap-3">
							<Link
								to="/register"
								className="btn btn-academic rounded-pill px-5 py-3 fs-6 fw-bold d-flex align-items-center gap-2"
							>
								{t('landing.start')} <ArrowRight size={20} />
							</Link>
						</div>
					</div>

					<div className="col-lg-6 position-relative ps-lg-5">
						<div className="row g-4">
							<div className="col-6 mt-lg-5">
								<div className="academic-card p-4 mb-4">
									<div
										className="bg-primary bg-opacity-10 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "55px", height: "55px" }}
									>
										<MonitorPlay size={26} className="text-primary" />
									</div>
									<h5 className="fw-bold mb-2 text-dark">{t('landing.feature1_title')}</h5>
									<p
										className="mb-0"
										style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: "1.5" }}
									>
										{t('landing.feature1_desc')}
									</p>
								</div>
								<div className="academic-card p-4">
									<div
										className="bg-success bg-opacity-10 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "55px", height: "55px" }}
									>
										<BookOpen size={26} className="text-success" />
									</div>
									<h5 className="fw-bold mb-2 text-dark">{t('landing.feature2_title')}</h5>
									<p
										className="mb-0"
										style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: "1.5" }}
									>
										{t('landing.feature2_desc')}
									</p>
								</div>
							</div>
							<div className="col-6">
								<div className="academic-card p-4 mb-4">
									<div
										className="bg-warning bg-opacity-10 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "55px", height: "55px" }}
									>
										<LayoutDashboard size={26} className="text-warning" />
									</div>
									<h5 className="fw-bold mb-2 text-dark">{t('landing.feature3_title')}</h5>
									<p
										className="mb-0"
										style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: "1.5" }}
									>
										{t('landing.feature3_desc')}
									</p>
								</div>
								<div className="academic-card p-4">
									<div
										className="bg-info bg-opacity-10 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
										style={{ width: "55px", height: "55px" }}
									>
										<Sparkles size={26} className="text-info" />
									</div>
									<h5 className="fw-bold mb-2 text-dark">{t('landing.feature4_title')}</h5>
									<p
										className="mb-0"
										style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: "1.5" }}
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
				className="text-center py-4 bg-white border-top position-relative"
				style={{
					zIndex: 10,
					color: "#64748b",
				}}
			>
				<p className="mb-0 fw-medium small">
					&copy; 2026 {t('landing.footer')}
				</p>
			</footer>
		</div>
	);
}
