import React from 'react';
import { 
  Home, BookOpen, Users, UserSquare2, Calendar, 
  FileText, CheckSquare, PenTool, LayoutGrid, Award, Database, Smartphone, ClipboardList
} from 'lucide-react';

export const getRoleLinks = (role, size = 24) => {
  switch (role) {
    case 'admin':
      return [
        { name: 'Dashboard Admin', path: '/admin', icon: <Home size={size} className="nav-icon" /> },
        { name: 'Program Studi', path: '/admin/programs', icon: <Database size={size} className="nav-icon" /> },
        { name: 'Kurikulum', path: '/admin/curriculums', icon: <BookOpen size={size} className="nav-icon" /> },
        { name: 'Thn Akademik', path: '/admin/academic-years', icon: <Calendar size={size} className="nav-icon" /> },
        { name: 'Matakuliah', path: '/admin/courses', icon: <BookOpen size={size} className="nav-icon" /> },
        { name: 'Data Kelas', path: '/admin/classes', icon: <LayoutGrid size={size} className="nav-icon" /> },
        { name: 'Data Dosen', path: '/admin/dosen', icon: <UserSquare2 size={size} className="nav-icon" /> },
        { name: 'Mahasiswa', path: '/admin/mahasiswa', icon: <Users size={size} className="nav-icon" /> },
        { name: 'Penjadwalan', path: '/admin/schedules', icon: <Calendar size={size} className="nav-icon" /> },
        { name: 'KHS Mahasiswa', path: '/admin/khs', icon: <Award size={size} className="nav-icon" /> },
        { name: 'Keuangan (SPP)', path: '/admin/invoices', icon: <CheckSquare size={size} className="nav-icon" /> },
        { name: 'Backup Data', path: '/admin/backup', icon: <Database size={size} className="nav-icon" /> },
        { name: 'Notifikasi', path: '/admin/fcm-tokens', icon: <Smartphone size={size} className="nav-icon" /> },
      ];
    case 'dosen':
      return [
        { name: 'Dashboard', path: '/dosen', icon: <Home size={size} className="nav-icon" /> },
        { name: 'RPS', path: '/dosen/rps', icon: <BookOpen size={size} className="nav-icon" /> },
        { name: 'Kehadiran', path: '/dosen/attendance', icon: <CheckSquare size={size} className="nav-icon" /> },
        { name: 'Materi', path: '/dosen/materials', icon: <FileText size={size} className="nav-icon" /> },
        { name: 'Tugas', path: '/dosen/assignments', icon: <PenTool size={size} className="nav-icon" /> },
        { name: 'Bank Soal', path: '/dosen/bank-soal', icon: <Database size={size} className="nav-icon" /> },
        { name: 'Ujian', path: '/dosen/exams', icon: <ClipboardList size={size} className="nav-icon" /> },
        { name: 'Input Nilai', path: '/dosen/grades', icon: <Award size={size} className="nav-icon" /> },
      ];
    case 'mahasiswa':
      return [
        { name: 'Dashboard', path: '/mahasiswa', icon: <Home size={size} className="nav-icon" /> },
        { name: 'RPS', path: '/mahasiswa/rps', icon: <BookOpen size={size} className="nav-icon" /> },
        { name: 'Materi', path: '/mahasiswa/materials', icon: <FileText size={size} className="nav-icon" /> },
        { name: 'Tugas', path: '/mahasiswa/assignments', icon: <PenTool size={size} className="nav-icon" /> },
        { name: 'Ujian CBT', path: '/mahasiswa/exams', icon: <ClipboardList size={size} className="nav-icon" /> },
        { name: 'Kehadiran', path: '/mahasiswa/attendance', icon: <CheckSquare size={size} className="nav-icon" /> },
        { name: 'Nilai KHS', path: '/mahasiswa/grades', icon: <Award size={size} className="nav-icon" /> },
      ];
    default:
      return [];
  }
};
