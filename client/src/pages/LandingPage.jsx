import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, MonitorPlay, ShieldCheck, ArrowRight, LayoutDashboard, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Jika sudah login, langsung arahkan ke dashboard sesuai role
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
      color: '#f8fafc',
      overflowX: 'hidden',
      position: 'relative'
    }}>
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
      <nav className="d-flex justify-content-between align-items-center p-4 position-relative" style={{ zIndex: 10 }}>
        <div className="d-flex align-items-center gap-3">
          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center shadow-lg" style={{ width: '45px', height: '45px' }}>
            <span className="fw-bolder fs-4 text-white">S</span>
          </div>
          <span className="fs-3 fw-bold tracking-tight">SIAKAD <span className="text-primary">DKN</span></span>
        </div>
        <div>
          <Link to="/login" className="btn btn-glow rounded-pill px-4 py-2 fw-semibold d-flex align-items-center gap-2">
            Masuk <ArrowRight size={18} />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container-fluid px-4 px-lg-5 position-relative" style={{ zIndex: 10, marginTop: '8vh', paddingBottom: '10vh' }}>
        <div className="row align-items-center">
          <div className="col-lg-6 mb-5 mb-lg-0 pe-lg-5">
            <div className="badge glass-card px-3 py-2 mb-4 text-white d-inline-flex align-items-center gap-2 border-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ShieldCheck size={16} className="text-success" />
              <span className="fw-normal">Platform Cerdas Pendidikan 2026</span>
            </div>
            <h1 className="display-3 fw-bolder mb-4 lh-1" style={{ letterSpacing: '-1px' }}>
              Era Baru <br />
              <span className="gradient-text">Ekosistem Digital</span> <br />
              Akademik
            </h1>
            <p className="fs-5 mb-5" style={{ color: '#94a3b8', maxWidth: '540px', lineHeight: '1.6' }}>
              Sistem Informasi Akademik modern yang dilengkapi CBT offline-first, LMS interaktif, Tutor AI 24/7, dan penilaian otomatis berbasis AI.
            </p>
            <div className="d-flex gap-3">
              <Link to="/login" className="btn btn-glow rounded-pill px-5 py-3 fs-5 fw-bold d-flex align-items-center gap-2 shadow-lg">
                Mulai Sekarang <ArrowRight size={20} />
              </Link>
            </div>
          </div>
          
          <div className="col-lg-6 position-relative ps-lg-5">
            <div className="row g-4 position-relative">
              <div className="col-6 mt-5 animate-float">
                <div className="glass-card p-4 mb-4">
                  <div className="bg-primary bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '60px', height: '60px' }}>
                    <MonitorPlay size={30} className="text-primary" />
                  </div>
                  <h4 className="fw-bold mb-2">CBT & Ujian</h4>
                  <p className="mb-0" style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Ujian online real-time dengan proteksi AI dan fitur akses kontrol dinamis.</p>
                </div>
                <div className="glass-card p-4">
                  <div className="bg-success bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '60px', height: '60px' }}>
                    <BookOpen size={30} className="text-success" />
                  </div>
                  <h4 className="fw-bold mb-2">LMS Interaktif</h4>
                  <p className="mb-0" style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Manajemen RPS, pengumpulan materi, dan distribusi tugas satu pintu.</p>
                </div>
              </div>
              <div className="col-6 animate-float-delayed">
                <div className="glass-card p-4 mb-4">
                  <div className="bg-warning bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '60px', height: '60px' }}>
                    <LayoutDashboard size={30} className="text-warning" />
                  </div>
                  <h4 className="fw-bold mb-2">Penilaian Cerdas</h4>
                  <p className="mb-0" style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Kalkulasi KHS otomatis dan asisten AI untuk koreksi essai seketika.</p>
                </div>
                <div className="glass-card p-4">
                  <div className="bg-info bg-opacity-25 p-3 rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '60px', height: '60px' }}>
                    <Sparkles size={30} className="text-info" />
                  </div>
                  <h4 className="fw-bold mb-2">Tutor AI 24/7</h4>
                  <p className="mb-0" style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Asisten cerdas pendamping mahasiswa untuk berdiskusi dan memahami materi kapan saja.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 mt-auto position-relative" style={{ zIndex: 10, borderTop: '1px solid rgba(255,255,255,0.05)', color: '#475569' }}>
        <p className="mb-0 fw-medium">&copy; 2026 SIAKAD DKN &middot; Sistem Informasi Akademik Terpadu</p>
      </footer>
    </div>
  );
}
