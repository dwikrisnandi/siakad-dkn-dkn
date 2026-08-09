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
					name: "menu.saas_dashboard",
					path: "/superadmin",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "menu.data_kampus_tenants",
					path: "/superadmin/tenants",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "menu.status_sewa_and_tagihan",
					path: "/superadmin/subscriptions",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "menu.monitoring_performa",
					path: "/superadmin/monitoring",
					icon: <LayoutGrid size={size} className="nav-icon" />,
				},
				{
					name: "menu.manajemen_paket_and_harga",
					path: "/superadmin/plans",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
			];
		case "admin":
			return [
				{
					name: "menu.dashboard_admin",
					path: "/admin",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "menu.program_studi",
					path: "/admin/programs",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "menu.kurikulum",
					path: "/admin/curriculums",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "menu.thn_akademik",
					path: "/admin/academic-years",
					icon: <Calendar size={size} className="nav-icon" />,
				},
				{
					name: "menu.matakuliah",
					path: "/admin/courses",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "menu.data_kelas",
					path: "/admin/classes",
					icon: <LayoutGrid size={size} className="nav-icon" />,
				},
				{
					name: "menu.data_dosen",
					path: "/admin/dosen",
					icon: <UserSquare2 size={size} className="nav-icon" />,
				},
				{
					name: "menu.mahasiswa",
					path: "/admin/mahasiswa",
					icon: <Users size={size} className="nav-icon" />,
				},
				{
					name: "menu.penjadwalan",
					path: "/admin/schedules",
					icon: <Calendar size={size} className="nav-icon" />,
				},
				{
					name: "menu.khs_mahasiswa",
					path: "/admin/khs",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "menu.transkrip_nilai",
					path: "/admin/transkrip",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "menu.skripsi_ta",
					path: "/admin/skripsi",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "menu.bkd_and_jabatan",
					path: "/admin/bkd",
					icon: <Briefcase size={size} className="nav-icon" />,
				},
				{
					name: "menu.export_feeder",
					path: "/admin/feeder",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "menu.keuangan_spp",
					path: "/admin/invoices",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "menu.berlangganan_and_kuota",
					path: "/admin/subscription",
					icon: <Briefcase size={size} className="nav-icon" />,
				},
				{
					name: "menu.backup_data",
					path: "/admin/backup",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "menu.notifikasi",
					path: "/admin/fcm-tokens",
					icon: <Smartphone size={size} className="nav-icon" />,
				},
			];
		case "dosen":
			return [
				{
					name: "menu.dashboard",
					path: "/dosen",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "menu.bimbingan_akademik",
					path: "/dosen/krs",
					icon: <Users size={size} className="nav-icon" />,
				},
				{
					name: "menu.hasil_evaluasi_edom",
					path: "/dosen/edom",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "menu.rps",
					path: "/dosen/rps",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "menu.kehadiran",
					path: "/dosen/attendance",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "menu.materi",
					path: "/dosen/materials",
					icon: <FileText size={size} className="nav-icon" />,
				},
				{
					name: "menu.tugas",
					path: "/dosen/assignments",
					icon: <PenTool size={size} className="nav-icon" />,
				},
				{
					name: "menu.bank_soal",
					path: "/dosen/bank-soal",
					icon: <Database size={size} className="nav-icon" />,
				},
				{
					name: "menu.ujian",
					path: "/dosen/exams",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "menu.input_nilai",
					path: "/dosen/grades",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "menu.bimbingan_skripsi",
					path: "/dosen/skripsi",
					icon: <Users size={size} className="nav-icon" />,
				},
				{
					name: "menu.repository_bkd",
					path: "/dosen/bkd",
					icon: <Briefcase size={size} className="nav-icon" />,
				},
			];
		case "mahasiswa":
			return [
				{
					name: "menu.dashboard",
					path: "/mahasiswa",
					icon: <Home size={size} className="nav-icon" />,
				},
				{
					name: "menu.pengisian_krs",
					path: "/mahasiswa/krs",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "menu.evaluasi_dosen",
					path: "/mahasiswa/edom",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "menu.rps",
					path: "/mahasiswa/rps",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
				{
					name: "menu.materi",
					path: "/mahasiswa/materials",
					icon: <FileText size={size} className="nav-icon" />,
				},
				{
					name: "menu.tugas",
					path: "/mahasiswa/assignments",
					icon: <PenTool size={size} className="nav-icon" />,
				},
				{
					name: "menu.ujian_cbt",
					path: "/mahasiswa/exams",
					icon: <ClipboardList size={size} className="nav-icon" />,
				},
				{
					name: "menu.kehadiran",
					path: "/mahasiswa/attendance",
					icon: <CheckSquare size={size} className="nav-icon" />,
				},
				{
					name: "menu.nilai_khs",
					path: "/mahasiswa/grades",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "menu.transkrip_akademik",
					path: "/mahasiswa/transkrip",
					icon: <Award size={size} className="nav-icon" />,
				},
				{
					name: "menu.tugas_akhir",
					path: "/mahasiswa/skripsi",
					icon: <BookOpen size={size} className="nav-icon" />,
				},
			];
		default:
			return [];
	}
};
