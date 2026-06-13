import { Award, BookOpen, Database, Download, Users } from "lucide-react";
import React from "react";

export default function AdminFeeder() {
	const handleDownload = (type) => {
		// API endpoint will force download
		const token = localStorage.getItem("token");
		window.open(`/api/feeder/${type}?token=${token}`, "_blank");
	};

	return (
		<div className="animate-fade-in">
			<h3 className="fw-bold mb-4 text-dark">
				<Database size={28} className="me-2 text-primary" /> Export PDDikti
				(Feeder)
			</h3>

			<div className="alert alert-info rounded-4 p-4 shadow-sm mb-4">
				<h5 className="fw-bold mb-2">Integrasi Kementerian</h5>
				<p className="mb-0">
					Modul ini menghasilkan file `.csv` yang susunan kolomnya sudah
					disesuaikan dengan format aplikasi **Feeder PDDikti
					Kemenristekdikti**. Operator kampus hanya perlu mengunduh file ini dan
					langsung mengimpornya ke aplikasi Feeder Nasional tanpa perlu
					modifikasi manual.
				</p>
			</div>

			<div className="row g-4">
				{/* Data Mahasiswa */}
				<div className="col-md-6">
					<div className="card shadow-sm border-0 rounded-4 h-100">
						<div className="card-body p-4 d-flex align-items-center">
							<div className="bg-primary-subtle p-3 rounded-circle me-4">
								<Users size={32} className="text-primary" />
							</div>
							<div className="flex-grow-1">
								<h6 className="fw-bold mb-1">Data Induk Mahasiswa</h6>
								<p className="text-muted small mb-0">
									Format CSV untuk import Profil Mahasiswa Baru.
								</p>
							</div>
							<button
								className="btn btn-outline-primary rounded-circle p-2"
								onClick={() => handleDownload("mahasiswa")}
								title="Download CSV"
							>
								<Download size={20} />
							</button>
						</div>
					</div>
				</div>

				{/* Data KRS */}
				<div className="col-md-6">
					<div className="card shadow-sm border-0 rounded-4 h-100">
						<div className="card-body p-4 d-flex align-items-center">
							<div className="bg-warning-subtle p-3 rounded-circle me-4">
								<BookOpen size={32} className="text-warning" />
							</div>
							<div className="flex-grow-1">
								<h6 className="fw-bold mb-1">Data KRS (Aktivitas Kuliah)</h6>
								<p className="text-muted small mb-0">
									Format CSV untuk import KRS / Kelas Mahasiswa.
								</p>
							</div>
							<button
								className="btn btn-outline-warning rounded-circle p-2"
								onClick={() => handleDownload("krs")}
								title="Download CSV"
							>
								<Download size={20} />
							</button>
						</div>
					</div>
				</div>

				{/* Data Nilai */}
				<div className="col-md-6">
					<div className="card shadow-sm border-0 rounded-4 h-100">
						<div className="card-body p-4 d-flex align-items-center">
							<div className="bg-success-subtle p-3 rounded-circle me-4">
								<Award size={32} className="text-success" />
							</div>
							<div className="flex-grow-1">
								<h6 className="fw-bold mb-1">Data Nilai Akhir</h6>
								<p className="text-muted small mb-0">
									Format CSV untuk import Nilai KHS semester berjalan.
								</p>
							</div>
							<button
								className="btn btn-outline-success rounded-circle p-2"
								onClick={() => handleDownload("nilai")}
								title="Download CSV"
							>
								<Download size={20} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
