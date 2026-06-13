import {
	Award,
	BookOpen,
	Briefcase,
	Calendar,
	CheckSquare,
	ClipboardList,
	Database,
	FileText,
	Home,
	LayoutGrid,
	PenTool,
	Smartphone,
	UserSquare2,
	Users,
} from "lucide-react";
import React from "react";

	export const getRoleLinks = (role, size = 24) => {
	switch (role) {
		case "superadmin":
			return [
				{
					name: "SaaS Dashboard",
					path: "/superadmin",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "Data Kampus (Tenants)",
					path: "/superadmin/tenants",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "Status Sewa & Tagihan",
					path: "/superadmin/subscriptions",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "Monitoring Performa",
					path: "/superadmin/monitoring",
					icon: <LayoutGrid size={size} className="nav-icon" />,
				},
				{
					name: "Manajemen Paket & Harga",
					path: "/superadmin/plans",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
			];
		case "admin":
			return [
				{
					name: "Dashboard Admin",
					path: "/admin",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "Program Studi",
					path: "/admin/programs",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "Kurikulum",
					path: "/admin/curriculums",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "Thn Akademik",
					path: "/admin/academic-years",
					icon: <Calendar size={size} className="nav-icon" />,
				},
				{
					name: "Matakuliah",
					path: "/admin/courses",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "Data Kelas",
					path: "/admin/classes",
					icon: <LayoutGrid size={size} className="nav-icon" />,
				},
				{
					name: "Data Dosen",
					path: "/admin/dosen",
					icon: <UserSquare2 size={size} className="nav-icon" />,
				},
				{
					name: "Mahasiswa",
					path: "/admin/mahasiswa",
					icon: <Users size={size} className="nav-icon" />,
				},
				{
					name: "Penjadwalan",
					path: "/admin/schedules",
					icon: <Calendar size={size} className="nav-icon" />,
				},
				{
					name: "KHS Mahasiswa",
					path: "/admin/khs",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "Transkrip Nilai",
					path: "/admin/transkrip",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "Skripsi / TA",
					path: "/admin/skripsi",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "BKD & Jabatan",
					path: "/admin/bkd",
					icon: <Briefcase size={size} className="nav-icon" />,
				},
				{
					name: "Export Feeder",
					path: "/admin/feeder",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "Keuangan (SPP)",
					path: "/admin/invoices",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "Berlangganan & Kuota",
					path: "/admin/subscription",
					icon: <Briefcase size={size} className="nav-icon" />,
				},
				{
					name: "Backup Data",
					path: "/admin/backup",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "Notifikasi",
					path: "/admin/fcm-tokens",
					icon: <Smartphone size={size} className="nav-icon" />,
				},
			];
		case "dosen":
			return [
				{
					name: "Dashboard",
					path: "/dosen",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "Bimbingan Akademik",
					path: "/dosen/krs",
					icon: <Users size={size} className="nav-icon" />,
				},
				{
					name: "Hasil Evaluasi (EDOM)",
					path: "/dosen/edom",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "RPS",
					path: "/dosen/rps",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "Kehadiran",
					path: "/dosen/attendance",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "Materi",
					path: "/dosen/materials",
					icon: <FileText size={size} className="nav-icon" />,
				},
				{
					name: "Tugas",
					path: "/dosen/assignments",
					icon: <PenTool size={size} className="nav-icon" />,
				},
				{
					name: "Bank Soal",
					path: "/dosen/bank-soal",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "Ujian",
					path: "/dosen/exams",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "Input Nilai",
					path: "/dosen/grades",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "Bimbingan Skripsi",
					path: "/dosen/skripsi",
					icon: <Users size={size} className="nav-icon" />,
				},
				{
					name: "Repository BKD",
					path: "/dosen/bkd",
					icon: <Briefcase size={size} className="nav-icon" />,
				},
			];
		case "mahasiswa":
			return [
				{
					name: "Dashboard",
					path: "/mahasiswa",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "Pengisian KRS",
					path: "/mahasiswa/krs",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "Evaluasi Dosen",
					path: "/mahasiswa/edom",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "RPS",
					path: "/mahasiswa/rps",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "Materi",
					path: "/mahasiswa/materials",
					icon: <FileText size={size} className="nav-icon" />,
				},
				{
					name: "Tugas",
					path: "/mahasiswa/assignments",
					icon: <PenTool size={size} className="nav-icon" />,
				},
				{
					name: "Ujian CBT",
					path: "/mahasiswa/exams",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "Kehadiran",
					path: "/mahasiswa/attendance",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "Nilai KHS",
					path: "/mahasiswa/grades",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "Transkrip Akademik",
					path: "/mahasiswa/transkrip",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "Tugas Akhir",
					path: "/mahasiswa/skripsi",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
			];
		default:
			return [];
	}
};
