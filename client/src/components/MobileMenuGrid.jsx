import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getRoleLinks } from '../utils/menuLinks';

export default function MobileMenuGrid({ role }) {
  const location = useLocation();
  const roleHome = `/${role}`;
  
  // Hanya tampil di beranda
  if (location.pathname !== roleHome && location.pathname !== `${roleHome}/`) {
    return null;
  }

  const links = getRoleLinks(role);

  return (
    <div className="d-block d-md-none mb-4 animate-fade-in mt-2">
      <h6 className="fw-bolder mb-3 text-dark">Menu Layanan</h6>
      <div className="row g-3">
        {links.map((link, idx) => {
          // Jangan tampilkan link ke beranda di dalam grid
          if (link.path === roleHome) return null;
          return (
            <div className="col-4 text-center px-2 mb-2" key={idx}>
              <Link to={link.path} className="text-decoration-none d-block">
                <div className="bg-white shadow-sm rounded-4 d-flex align-items-center justify-content-center mx-auto mb-2" 
                     style={{ width: '65px', height: '65px', border: '1px solid #f1f5f9' }}>
                  <div className="text-primary">
                    {React.cloneElement(link.icon, { size: 28 })}
                  </div>
                </div>
                <small className="text-dark d-block lh-1" style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                  {link.name}
                </small>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
