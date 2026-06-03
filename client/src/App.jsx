import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import MainLayout from './components/MainLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminMatakuliah from './pages/AdminMatakuliah';
import AdminKelas from './pages/AdminKelas';
import AdminUsers from './pages/AdminUsers';
import AdminJadwal from './pages/AdminJadwal';
import AdminBackup from './pages/AdminBackup';
import AdminKHS from './pages/AdminKHS';
import AdminFCMTokens from './pages/AdminFCMTokens';
import AdminTahunAkademik from './pages/AdminTahunAkademik';
import DosenDashboard from './pages/DosenDashboard';
import DosenKehadiran from './pages/DosenKehadiran';
import DosenMateri from './pages/DosenMateri';
import DosenTugas from './pages/DosenTugas';
import DosenNilai from './pages/DosenNilai';
import DosenRPS from './pages/DosenRPS';
import MahasiswaDashboard from './pages/MahasiswaDashboard';
import MahasiswaMateri from './pages/MahasiswaMateri';
import MahasiswaTugas from './pages/MahasiswaTugas';
import MahasiswaNilai from './pages/MahasiswaNilai';
import MahasiswaKehadiran from './pages/MahasiswaKehadiran';
import MahasiswaRPS from './pages/MahasiswaRPS';
import DosenUjian from './pages/DosenUjian';
import DosenBankSoal from './pages/DosenBankSoal';
import MahasiswaUjian from './pages/MahasiswaUjian';

import { useFCM } from './hooks/useFCM';
import InstallPWA from './components/InstallPWA';

function AppContent() {
  useFCM();
  return (
    <>
      <InstallPWA />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<MainLayout allowedRoles={['admin']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="academic-years" element={<AdminTahunAkademik />} />
            <Route path="courses" element={<AdminMatakuliah />} />
            <Route path="classes" element={<AdminKelas />} />
            <Route path="dosen" element={<AdminUsers roleType="dosen" title="Dosen" />} />
            <Route path="mahasiswa" element={<AdminUsers roleType="mahasiswa" title="Mahasiswa" />} />
            <Route path="schedules" element={<AdminJadwal />} />
            <Route path="khs" element={<AdminKHS />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="fcm-tokens" element={<AdminFCMTokens />} />
          </Route>

          {/* Dosen Routes */}
          <Route path="/dosen" element={<MainLayout allowedRoles={['dosen']} />}>
            <Route index element={<DosenDashboard />} />
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
            <Route path="rps" element={<MahasiswaRPS />} />
            <Route path="materials" element={<MahasiswaMateri />} />
            <Route path="assignments" element={<MahasiswaTugas />} />
            <Route path="grades" element={<MahasiswaNilai />} />
            <Route path="attendance" element={<MahasiswaKehadiran />} />
            <Route path="exams" element={<MahasiswaUjian />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
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
