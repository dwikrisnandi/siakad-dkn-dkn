import {
	ArrowRight,
	BookOpen,
	LayoutDashboard,
	MonitorPlay,
	ShieldCheck,
	Sparkles,
	Globe,
	Building,
	Moon,
	Sun
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

export default function LandingPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();

	// State for Dark Mode
	const [isDark, setIsDark] = useState(() => {
		return localStorage.getItem("theme") === "dark";
	});
	const [langDropdownOpen, setLangDropdownOpen] = useState(false);

	useEffect(() => {
		localStorage.setItem("theme", isDark ? "dark" : "light");
	}, [isDark]);

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
			className={isDark ? "theme-dark" : "theme-light"}
			style={{
				minHeight: "100vh",
				fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
				backgroundColor: "var(--bg-primary)",
				color: "var(--text-primary)",
				overflowX: "clip",
				position: "relative",
				transition: "background-color 0.3s ease, color 0.3s ease",
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
        
        .theme-light {
          --bg-primary: #f8fafc;
          --bg-hero: #f8fafc;
          --nav-bg: rgba(255, 255, 255, 0.85);
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --accent: #2563eb;
          --accent-hover: #1d4ed8;
          --card-bg: rgba(255, 255, 255, 0.9);
          --card-border: rgba(255,255,255,0.7);
          --grid-color: #cbd5e1;
          --btn-outline-border: #e2e8f0;
          --btn-outline-bg: rgba(255, 255, 255, 0.5);
          --btn-outline-hover: #f1f5f9;
        }

        .theme-dark {
          --bg-primary: #020617;
          --bg-hero: #020617;
          --nav-bg: rgba(15, 23, 42, 0.85);
          --text-primary: #f8fafc;
          --text-secondary: #94a3b8;
          --accent: #3b82f6;
          --accent-hover: #60a5fa;
          --card-bg: rgba(30, 41, 59, 0.7);
          --card-border: rgba(255,255,255,0.1);
          --grid-color: #1e293b;
          --btn-outline-border: rgba(255,255,255,0.1);
          --btn-outline-bg: transparent;
          --btn-outline-hover: rgba(255,255,255,0.05);
        }
        
        .hero-section {
          background: var(--bg-hero);
          position: relative;
          overflow: hidden;
        }

        /* Glowing Blobs for Premium Feel */
        .glow-blob-1 {
          position: absolute;
          top: -10%; left: -5%; width: 40vw; height: 40vw;
          background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%; z-index: 0;
          animation: floatBlob 10s ease-in-out infinite alternate;
        }
        .glow-blob-2 {
          position: absolute;
          bottom: -20%; right: -10%; width: 50vw; height: 50vw;
          background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%);
          border-radius: 50%; z-index: 0;
          animation: floatBlob 12s ease-in-out infinite alternate-reverse;
        }

        @keyframes floatBlob {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, 30px) scale(1.05); }
        }
        
        /* Subtle Grid Background Pattern */
        .grid-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(var(--grid-color) 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.3;
          z-index: 0;
        }

        .academic-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          position: relative;
          overflow: hidden;
        }
        
        .academic-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .academic-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 30px -5px rgba(37, 99, 235, 0.15), 0 10px 15px -5px rgba(37, 99, 235, 0.05);
          border-color: rgba(59, 130, 246, 0.4);
        }
        .academic-card:hover::before { opacity: 1; }

        .text-accent { 
          background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-primary-custom { color: var(--text-primary); }
        .text-secondary-custom { color: var(--text-secondary); }

        .btn-academic {
          background: linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%);
          color: white !important;
          border: none;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }
        
        .btn-academic:hover {
          background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent) 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
        }
        
        .btn-outline-academic {
          border: 1px solid var(--btn-outline-border);
          color: var(--text-primary);
          background: var(--btn-outline-bg);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }
        
        .btn-outline-academic:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--btn-outline-hover);
        }

        .navbar-custom {
          background: var(--nav-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--card-border);
        }

        /* Mega Footer Styles */
        .mega-footer {
          background-color: var(--card-bg);
          border-top: 1px solid var(--card-border);
          position: relative;
          z-index: 10;
        }
        
        .footer-link {
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s ease;
          display: inline-block;
          margin-bottom: 0.75rem;
        }
        
        .footer-link:hover {
          color: var(--accent);
          transform: translateX(4px);
        }

        .store-btn {
          background: var(--text-primary);
          color: var(--bg-primary);
          border-radius: 8px;
          padding: 8px 16px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          transition: transform 0.2s;
        }
        
        .store-btn:hover {
          transform: translateY(-2px);
          color: var(--bg-primary);
        }
      `}</style>

			{/* Navbar */}
			<nav
				className="d-flex flex-column flex-md-row justify-content-between align-items-center p-3 p-md-4 position-relative navbar-custom shadow-sm"
				style={{ zIndex: 10 }}
			>
				<div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
					<img
						src="/favicon.svg"
						alt="SIAKAD Logo"
						className="rounded-circle shadow-sm bg-white"
						style={{ width: "45px", height: "45px", padding: "4px", border: "1px solid var(--btn-outline-border)" }}
					/>
					<span className="fs-3 fw-bold tracking-tight text-primary-custom">
						SIAKAD <span className="text-accent">DKN</span>
					</span>
				</div>
				<div className="d-flex align-items-center gap-2 gap-md-3 flex-wrap justify-content-center">
					{/* Dark Mode Toggle */}
					<button 
						onClick={() => setIsDark(!isDark)}
						className="btn btn-outline-academic rounded-circle p-2 d-flex align-items-center justify-content-center"
						style={{ width: '38px', height: '38px' }}
						title={isDark ? "Ubah ke Mode Terang" : "Ubah ke Mode Gelap"}
					>
						{isDark ? <Sun size={18} /> : <Moon size={18} />}
					</button>

					<div className="dropdown">
						<button 
							className="btn btn-outline-academic rounded-pill dropdown-toggle d-flex align-items-center gap-2 btn-sm px-3 py-2 px-md-4" 
							type="button" 
							onClick={() => setLangDropdownOpen(!langDropdownOpen)}
						>
							<Globe size={18} /> <span className="d-none d-sm-inline">{i18n.language.toUpperCase()}</span>
						</button>
						<ul className={`dropdown-menu dropdown-menu-end shadow-sm mt-2 ${langDropdownOpen ? 'show' : ''}`} style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)"}}>
							<li><button className="dropdown-item py-2 text-primary-custom" style={{backgroundColor: "transparent"}} onClick={() => { changeLanguage('en'); setLangDropdownOpen(false); }}>🇬🇧 English (EN)</button></li>
							<li><button className="dropdown-item py-2 text-primary-custom" style={{backgroundColor: "transparent"}} onClick={() => { changeLanguage('id'); setLangDropdownOpen(false); }}>🇮🇩 Indonesia (ID)</button></li>
							<li><button className="dropdown-item py-2 text-primary-custom" style={{backgroundColor: "transparent"}} onClick={() => { changeLanguage('ko'); setLangDropdownOpen(false); }}>🇰🇷 한국어 (KO)</button></li>
							<li><button className="dropdown-item py-2 text-primary-custom" style={{backgroundColor: "transparent"}} onClick={() => { changeLanguage('ja'); setLangDropdownOpen(false); }}>🇯🇵 日本語 (JA)</button></li>
							<li><button className="dropdown-item py-2 text-primary-custom" style={{backgroundColor: "transparent"}} onClick={() => { changeLanguage('zh'); setLangDropdownOpen(false); }}>🇨🇳 中文 (ZH)</button></li>
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

			<main
				className="container-fluid px-4 px-lg-5 position-relative hero-section pb-5"
				style={{ zIndex: 5, paddingTop: "8vh", minHeight: "85vh" }}
			>
				<div className="grid-pattern"></div>
				<div className="glow-blob-1"></div>
				<div className="glow-blob-2"></div>
				<div className="row align-items-center position-relative" style={{ zIndex: 1 }}>
					<div className="col-lg-6 mb-5 mb-lg-0 pe-lg-5">
						<div
							className="badge shadow-sm px-3 py-2 mb-4 d-inline-flex align-items-center gap-2 text-primary-custom"
							style={{ borderRadius: "8px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
						>
							<ShieldCheck size={16} className="text-success" />
							<span className="fw-medium">{t('landing.badge')}</span>
						</div>
						<h1
							className="display-4 fw-bolder mb-4 lh-sm text-primary-custom"
							style={{ letterSpacing: "-1px" }}
						>
							{t('landing.title1')} <br />
							<span className="text-accent">{t('landing.title2')}</span> <br />
							{t('landing.title3')}
						</h1>
						<p
							className="fs-5 mb-5 text-secondary-custom"
							style={{ maxWidth: "540px", lineHeight: "1.7" }}
						>
							{t('landing.subtitle')}
						</p>
						<div className="d-flex flex-wrap gap-3">
							<Link
								to="/register"
								className="btn btn-academic rounded-pill px-5 py-3 fs-6 fw-bold d-flex align-items-center gap-2"
							>
								{t('landing.start')} <ArrowRight size={20} />
							</Link>
							<a
								href="mailto:arthavirddhisampada@gmail.com"
								className="btn btn-outline-academic rounded-pill px-4 py-3 fs-6 fw-bold d-flex align-items-center gap-2"
							>
								{t('landing.contact_us')}
							</a>
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
									<h5 className="fw-bold mb-2 text-primary-custom">{t('landing.feature1_title')}</h5>
									<p
										className="mb-0 text-secondary-custom"
										style={{ fontSize: "0.9rem", lineHeight: "1.5" }}
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
									<h5 className="fw-bold mb-2 text-primary-custom">{t('landing.feature2_title')}</h5>
									<p
										className="mb-0 text-secondary-custom"
										style={{ fontSize: "0.9rem", lineHeight: "1.5" }}
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
									<h5 className="fw-bold mb-2 text-primary-custom">{t('landing.feature3_title')}</h5>
									<p
										className="mb-0 text-secondary-custom"
										style={{ fontSize: "0.9rem", lineHeight: "1.5" }}
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
									<h5 className="fw-bold mb-2 text-primary-custom">{t('landing.feature4_title')}</h5>
									<p
										className="mb-0 text-secondary-custom"
										style={{ fontSize: "0.9rem", lineHeight: "1.5" }}
									>
										{t('landing.feature4_desc')}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Mega Footer */}
			<footer className="mega-footer pt-5 pb-4">
				<div className="container-fluid px-4 px-lg-5">
					<div className="row mb-5 g-4">
						{/* Col 1: Brand */}
						<div className="col-12 col-lg-3">
							<div className="d-flex align-items-center gap-2 mb-3">
								<img
									src="/favicon.svg"
									alt="SIAKAD Logo"
									className="rounded-circle shadow-sm bg-white"
									style={{ width: "35px", height: "35px", padding: "3px" }}
								/>
								<span className="fs-4 fw-bold tracking-tight text-primary-custom">
									SIAKAD <span className="text-accent">DKN</span>
								</span>
							</div>
							<p className="text-secondary-custom mb-4" style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
								Sistem manajemen sekolah dan pembelajaran terintegrasi yang dirancang untuk mendukung seluruh aktivitas di lingkungan pendidikan (End-to-End). Optimalkan seluruh kegiatan dalam satu platform modern.
							</p>
						</div>

						{/* Col 2: Pintasan */}
						<div className="col-6 col-lg-2 offset-lg-1">
							<h6 className="fw-bold mb-4 text-primary-custom">Pintasan</h6>
							<div className="d-flex flex-column">
								<a href="#" className="footer-link">Tentang Kami</a>
								<a href="#" className="footer-link">Manajemen Sekolah</a>
								<a href="#" className="footer-link">Manajemen Pembelajaran</a>
								<a href="mailto:arthavirddhisampada@gmail.com" className="footer-link">Konsultasi Tim Kami</a>
							</div>
						</div>

						{/* Col 3: Keunggulan */}
						<div className="col-6 col-lg-2">
							<h6 className="fw-bold mb-4 text-primary-custom">Keunggulan Kami</h6>
							<div className="d-flex flex-column">
								<a href="#" className="footer-link">Smart Campus</a>
								<a href="#" className="footer-link">Keterpaduan End-to-End</a>
								<a href="#" className="footer-link">Terintegrasi Feeder</a>
								<a href="#" className="footer-link">Akses Super Cepat</a>
								<a href="#" className="footer-link">Monitoring & Laporan</a>
							</div>
						</div>

						{/* Col 4: Kontak & Download */}
						<div className="col-12 col-lg-4">
							<h6 className="fw-bold mb-4 text-primary-custom">Hubungi Kami (Konsultasi & Kerjasama)</h6>
							<div className="d-flex flex-column gap-3 mb-4 text-secondary-custom" style={{ fontSize: "0.9rem" }}>
								<div className="d-flex align-items-start gap-3">
									<Building size={18} className="mt-1 flex-shrink-0" />
									<div>
										<span className="fw-bold d-block text-primary-custom">SIAKAD DKN Solusi Global</span>
										Tirtajaya, Karawang,<br/>Jawa Barat
									</div>
								</div>
								<div className="d-flex align-items-center gap-3">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
									<span>+62 812 1080 2357</span>
								</div>
								<div className="d-flex align-items-center gap-3">
									<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
									<span>arthavirddhisampada@gmail.com</span>
								</div>
							</div>
							
							<h6 className="fw-bold mb-3 text-primary-custom">Download Sekarang</h6>
							<div className="d-flex gap-2 flex-wrap">
								<a href="#" className="store-btn shadow-sm">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2m-5.15 5.56c.59-.34 1.1-.75 1.51-1.22l2.84 1.64a13.3 13.3 0 0 1-4.35 1.91m-4.51-1.91 2.83-1.64c.42.47.93.88 1.52 1.22v3.28a13.3 13.3 0 0 1-4.35-1.9m-2.18-5.65h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.52a11.1 11.1 0 0 1 0-4m5.15-5.56c-.59.34-1.1.75-1.51 1.22L5.32 3.97a13.3 13.3 0 0 1 4.35-1.91m4.51 1.91-2.83 1.64c-.42-.47-.93-.88-1.52-1.22V2.67a13.3 13.3 0 0 1 4.35 1.9M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8"/></svg>
									<div className="d-flex flex-column" style={{ lineHeight: "1" }}>
										<span style={{ fontSize: "0.6rem" }}>Download on the</span>
										<span className="fw-bold" style={{ fontSize: "1rem" }}>App Store</span>
									</div>
								</a>
								<a href="#" className="store-btn shadow-sm">
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12 3.84 21.85C3.34 21.61 3 21.09 3 20.5M4.97 22.18 15.11 13.4 18.06 12 4.97 1.82c-.39-.17-.83-.17-1.22 0l11.22 10.18L4.97 22.18m13.79-11.45L21.5 12l-2.74 1.27-3.65-3.65 3.65-3.65Z"/></svg>
									<div className="d-flex flex-column" style={{ lineHeight: "1" }}>
										<span style={{ fontSize: "0.6rem" }}>GET IT ON</span>
										<span className="fw-bold" style={{ fontSize: "1rem" }}>Google Play</span>
									</div>
								</a>
							</div>
						</div>
					</div>
					
					{/* Bottom Bar */}
					<div className="row border-top border-secondary pt-3 mt-4" style={{ borderColor: "var(--card-border) !important" }}>
						<div className="col-md-6 text-center text-md-start mb-2 mb-md-0">
							<p className="mb-0 fw-medium small text-secondary-custom">
								&copy; 2026 PT. SIAKAD DKN Solusi Global. All Rights Reserved.
							</p>
						</div>
						<div className="col-md-6 text-center text-md-end">
							<div className="d-flex gap-3 justify-content-center justify-content-md-end small">
								<a href="#" className="text-secondary-custom text-decoration-none fw-medium hover-text-primary">Syarat & Ketentuan</a>
								<a href="#" className="text-secondary-custom text-decoration-none fw-medium hover-text-primary">Kebijakan Privacy</a>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
