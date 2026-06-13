import React, { Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Login = React.lazy(() => import("./pages/Login"));

import MainLayout from "./components/MainLayout";

const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminPrograms = React.lazy(() => import("./pages/AdminPrograms"));
const AdminCurriculums = React.lazy(() => import("./pages/AdminCurriculums"));
const AdminInvoices = React.lazy(() => import("./pages/AdminInvoices"));
const AdminMatakuliah = React.lazy(() => import("./pages/AdminMatakuliah"));
const AdminKelas = React.lazy(() => import("./pages/AdminKelas"));
const AdminUsers = React.lazy(() => import("./pages/AdminUsers"));
const AdminJadwal = React.lazy(() => import("./pages/AdminJadwal"));
const AdminBackup = React.lazy(() => import("./pages/AdminBackup"));
const AdminKHS = React.lazy(() => import("./pages/AdminKHS"));
const AdminTranskrip = React.lazy(() => import("./pages/AdminTranskrip"));
const AdminSkripsi = React.lazy(() => import("./pages/AdminSkripsi"));
const AdminFeeder = React.lazy(() => import("./pages/AdminFeeder"));
const AdminBKD = React.lazy(() => import("./pages/AdminBKD"));
const AdminFCMTokens = React.lazy(() => import("./pages/AdminFCMTokens"));
const AdminTahunAkademik = React.lazy(
	() => import("./pages/AdminTahunAkademik"),
);
const DosenDashboard = React.lazy(() => import("./pages/DosenDashboard"));
const DosenKehadiran = React.lazy(() => import("./pages/DosenKehadiran"));
const DosenMateri = React.lazy(() => import("./pages/DosenMateri"));
const DosenTugas = React.lazy(() => import("./pages/DosenTugas"));
const DosenNilai = React.lazy(() => import("./pages/DosenNilai"));
const DosenRPS = React.lazy(() => import("./pages/DosenRPS"));
const MahasiswaDashboard = React.lazy(
	() => import("./pages/MahasiswaDashboard"),
);
const MahasiswaMateri = React.lazy(() => import("./pages/MahasiswaMateri"));
const MahasiswaTugas = React.lazy(() => import("./pages/MahasiswaTugas"));
const MahasiswaNilai = React.lazy(() => import("./pages/MahasiswaNilai"));
const MahasiswaKehadiran = React.lazy(
	() => import("./pages/MahasiswaKehadiran"),
);
const MahasiswaRPS = React.lazy(() => import("./pages/MahasiswaRPS"));
const DosenUjian = React.lazy(() => import("./pages/DosenUjian"));
const DosenBankSoal = React.lazy(() => import("./pages/DosenBankSoal"));
const DosenKRS = React.lazy(() => import("./pages/DosenKRS"));
const DosenEDOM = React.lazy(() => import("./pages/DosenEDOM"));
const DosenSkripsi = React.lazy(() => import("./pages/DosenSkripsi"));
const DosenBKD = React.lazy(() => import("./pages/DosenBKD"));
const MahasiswaUjian = React.lazy(() => import("./pages/MahasiswaUjian"));
const MahasiswaKRS = React.lazy(() => import("./pages/MahasiswaKRS"));
const MahasiswaEDOM = React.lazy(() => import("./pages/MahasiswaEDOM"));
const MahasiswaTranskrip = React.lazy(
	() => import("./pages/MahasiswaTranskrip"),
);
const MahasiswaSkripsi = React.lazy(() => import("./pages/MahasiswaSkripsi"));
const RegisterCampus = React.lazy(() => import("./pages/RegisterCampus"));

import InstallPWA from "./components/InstallPWA";
import { useFCM } from "./hooks/useFCM";

const LoadingFallback = () => (
	<div className="d-flex justify-content-center align-items-center vh-100 bg-light">
		<div className="spinner-border text-primary" role="status">
			<span className="visually-hidden">Loading...</span>
		</div>
	</div>
);

function AppContent() {
	useFCM();

	// Daftar rute utama aplikasi (bukan tenant) untuk backward compatibility PWA
	const knownRoutes = ["login", "register", "admin", "dosen", "mahasiswa", "superadmin"];
	
	const pathParts = window.location.pathname.split("/");
	const firstPath = pathParts[1] && pathParts[1] !== "" ? pathParts[1] : "";
	
	let tenantSlug = "pamitran"; // Default tenant
	let routerBasename = "/";    // Default basename untuk backward compatibility

	// Jika bagian pertama URL bukan rute aplikasi, berarti itu adalah tenant_slug (misal: /horizon/login)
	if (firstPath !== "" && !knownRoutes.includes(firstPath)) {
		tenantSlug = firstPath;
		routerBasename = `/${tenantSlug}`;
	}

	// Simpan ke localStorage agar axios interceptor mengambilnya untuk HTTP Header
	localStorage.setItem("tenant_slug", tenantSlug);

	return (
		<>
			<InstallPWA />
			<BrowserRouter basename={routerBasename}>
				<Suspense fallback={<LoadingFallback />}>
					<Routes>
						<Route path="/" element={<LandingPage />} />
						<Route path="/login" element={<Login />} />
						<Route path="/register" element={<RegisterCampus />} />

						{/* Super Admin Routes */}
						<Route
							path="/superadmin"
							element={<MainLayout allowedRoles={["superadmin"]} />}
						>
							<Route index element={<div className="p-4"><h3>SaaS Dashboard (Dalam Pengembangan)</h3></div>} />
							<Route path="tenants" element={<div className="p-4"><h3>Manajemen Universitas</h3></div>} />
							<Route path="subscriptions" element={<div className="p-4"><h3>Status Sewa & Penagihan</h3></div>} />
							<Route path="monitoring" element={<div className="p-4"><h3>Monitoring Performa</h3></div>} />
							<Route path="plans" element={<div className="p-4"><h3>Manajemen Paket & Harga</h3></div>} />
						</Route>

						{/* Admin Routes */}
						<Route
							path="/admin"
							element={<MainLayout allowedRoles={["admin"]} />}
						>
							<Route index element={<AdminDashboard />} />
							<Route path="subscription" element={<div className="p-4"><h3>Berlangganan & Kuota (Dalam Pengembangan)</h3></div>} />
							<Route path="programs" element={<AdminPrograms />} />
							<Route path="curriculums" element={<AdminCurriculums />} />
							<Route path="academic-years" element={<AdminTahunAkademik />} />
							<Route path="courses" element={<AdminMatakuliah />} />
							<Route path="classes" element={<AdminKelas />} />
							<Route
								path="dosen"
								element={<AdminUsers roleType="dosen" title="Dosen" />}
							/>
							<Route
								path="mahasiswa"
								element={<AdminUsers roleType="mahasiswa" title="Mahasiswa" />}
							/>
							<Route path="schedules" element={<AdminJadwal />} />
							<Route path="khs" element={<AdminKHS />} />
							<Route path="transkrip" element={<AdminTranskrip />} />
							<Route path="skripsi" element={<AdminSkripsi />} />
							<Route path="feeder" element={<AdminFeeder />} />
							<Route path="bkd" element={<AdminBKD />} />
							<Route path="invoices" element={<AdminInvoices />} />
							<Route path="backup" element={<AdminBackup />} />
							<Route path="fcm-tokens" element={<AdminFCMTokens />} />
						</Route>

						{/* Dosen Routes */}
						<Route
							path="/dosen"
							element={<MainLayout allowedRoles={["dosen"]} />}
						>
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
							<Route path="skripsi" element={<DosenSkripsi />} />
							<Route path="bkd" element={<DosenBKD />} />
						</Route>

						{/* Mahasiswa Routes */}
						<Route
							path="/mahasiswa"
							element={<MainLayout allowedRoles={["mahasiswa"]} />}
						>
							<Route index element={<MahasiswaDashboard />} />
							<Route path="krs" element={<MahasiswaKRS />} />
							<Route path="edom" element={<MahasiswaEDOM />} />
							<Route path="rps" element={<MahasiswaRPS />} />
							<Route path="materials" element={<MahasiswaMateri />} />
							<Route path="assignments" element={<MahasiswaTugas />} />
							<Route path="grades" element={<MahasiswaNilai />} />
							<Route path="transkrip" element={<MahasiswaTranskrip />} />
							<Route path="skripsi" element={<MahasiswaSkripsi />} />
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
