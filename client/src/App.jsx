import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const Login = React.lazy(() => import('./pages/Login'));
import MainLayout from './components/MainLayout';
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminPrograms = React.lazy(() => import('./pages/AdminPrograms'));
const AdminCurriculums = React.lazy(() => import('./pages/AdminCurriculums'));
const AdminInvoices = React.lazy(() => import('./pages/AdminInvoices'));
const AdminMatakuliah = React.lazy(() => import('./pages/AdminMatakuliah'));
const AdminKelas = React.lazy(() => import('./pages/AdminKelas'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminJadwal = React.lazy(() => import('./pages/AdminJadwal'));
const AdminBackup = React.lazy(() => import('./pages/AdminBackup'));
const AdminKHS = React.lazy(() => import('./pages/AdminKHS'));
const AdminTranskrip = React.lazy(() => import('./pages/AdminTranskrip'));
const AdminFCMTokens = React.lazy(() => import('./pages/AdminFCMTokens'));
const AdminTahunAkademik = React.lazy(() => import('./pages/AdminTahunAkademik'));
const DosenDashboard = React.lazy(() => import('./pages/DosenDashboard'));
const DosenKehadiran = React.lazy(() => import('./pages/DosenKehadiran'));
const DosenMateri = React.lazy(() => import('./pages/DosenMateri'));
const DosenTugas = React.lazy(() => import('./pages/DosenTugas'));
const DosenNilai = React.lazy(() => import('./pages/DosenNilai'));
const DosenRPS = React.lazy(() => import('./pages/DosenRPS'));
const MahasiswaDashboard = React.lazy(() => import('./pages/MahasiswaDashboard'));
const MahasiswaMateri = React.lazy(() => import('./pages/MahasiswaMateri'));
const MahasiswaTugas = React.lazy(() => import('./pages/MahasiswaTugas'));
const MahasiswaNilai = React.lazy(() => import('./pages/MahasiswaNilai'));
const MahasiswaKehadiran = React.lazy(() => import('./pages/MahasiswaKehadiran'));
const MahasiswaRPS = React.lazy(() => import('./pages/MahasiswaRPS'));
const DosenUjian = React.lazy(() => import('./pages/DosenUjian'));
const DosenBankSoal = React.lazy(() => import('./pages/DosenBankSoal'));
const DosenKRS = React.lazy(() => import('./pages/DosenKRS'));
const DosenEDOM = React.lazy(() => import('./pages/DosenEDOM'));
const MahasiswaUjian = React.lazy(() => import('./pages/MahasiswaUjian'));
const MahasiswaKRS = React.lazy(() => import('./pages/MahasiswaKRS'));
const MahasiswaEDOM = React.lazy(() => import('./pages/MahasiswaEDOM'));
const MahasiswaTranskrip = React.lazy(() => import('./pages/MahasiswaTranskrip'));

import { useFCM } from './hooks/useFCM';
import InstallPWA from './components/InstallPWA';

const LoadingFallback = () => (
  <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function AppContent() {
  useFCM();
  return (
    <>
      <InstallPWA />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<MainLayout allowedRoles={['admin']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="programs" element={<AdminPrograms />} />
            <Route path="curriculums" element={<AdminCurriculums />} />
            <Route path="academic-years" element={<AdminTahunAkademik />} />
            <Route path="courses" element={<AdminMatakuliah />} />
            <Route path="classes" element={<AdminKelas />} />
            <Route path="dosen" element={<AdminUsers roleType="dosen" title="Dosen" />} />
            <Route path="mahasiswa" element={<AdminUsers roleType="mahasiswa" title="Mahasiswa" />} />
            <Route path="schedules" element={<AdminJadwal />} />
            <Route path="khs" element={<AdminKHS />} />
            <Route path="transkrip" element={<AdminTranskrip />} />
            <Route path="invoices" element={<AdminInvoices />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="fcm-tokens" element={<AdminFCMTokens />} />
          </Route>

          {/* Dosen Routes */}
          <Route path="/dosen" element={<MainLayout allowedRoles={['dosen']} />}>
            <Route index element={<DosenDashboard />} />
            <Route path="krs" element={<DosenKRS />} />
            <Route path="edom" element={<DosenEDOM />} />
            <Route path="rps" element={<DosenRPS />} />
            <Route path="attendance" element={<DosenKehadiran />} />
            <Route path="materials" element={<DosenMateri />} />
            <Route path="assignments" element={<DosenTugas />} />
            <Route path="grades" element={<DosenNilai />} />
            <Route path="exams" element={<DosenUjian />} />
            <Route path="bank-soal" element={<DosenBankSoal />} />
          </Route>

          {/* Mahasiswa Routes */}
          <Route path="/mahasiswa" element={<MainLayout allowedRoles={['mahasiswa']} />}>
            <Route index element={<MahasiswaDashboard />} />
            <Route path="krs" element={<MahasiswaKRS />} />
            <Route path="edom" element={<MahasiswaEDOM />} />
            <Route path="rps" element={<MahasiswaRPS />} />
            <Route path="materials" element={<MahasiswaMateri />} />
            <Route path="assignments" element={<MahasiswaTugas />} />
            <Route path="grades" element={<MahasiswaNilai />} />
            <Route path="transkrip" element={<MahasiswaTranskrip />} />
            <Route path="attendance" element={<MahasiswaKehadiran />} />
            <Route path="exams" element={<MahasiswaUjian />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


export default App;
