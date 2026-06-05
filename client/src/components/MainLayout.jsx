import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatBot from './ChatBot';
import MobileMenuGrid from './MobileMenuGrid';
import BottomNav from './BottomNav';

export default function MainLayout({ allowedRoles }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // AdminLTE expects body to have specific classes for layout.
    // The classes are already in index.html, but we trigger layout
    // recalculation if needed or initialize plugins.
    if (window.$ && window.$.AdminLTE) {
      window.$('[data-widget="treeview"]').Treeview('init');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="wrapper" style={{ paddingBottom: '70px' }}>
      <Topbar />
      <div className="d-none d-md-block">
        <Sidebar />
      </div>
      <div className="content-wrapper bg-light">
        <section className="content p-4">
          <div className="container-fluid">
            <MobileMenuGrid role={user.role} />
            <Outlet />
          </div>
        </section>
      </div>
      <footer className="main-footer d-none d-md-block">
        <div className="float-right d-none d-sm-inline">
          Versi 5 Juni 2026
        </div>
        <strong>Copyright &copy; 2026 <a href="#">SIAKAD DKN</a>.</strong> Hak cipta milik Dwi Krisnandi.
      </footer>
      <BottomNav />
      {/* Tampilkan ChatBot hanya untuk mahasiswa */}
      {user?.role === 'mahasiswa' && <ChatBot />}
    </div>
  );
}
