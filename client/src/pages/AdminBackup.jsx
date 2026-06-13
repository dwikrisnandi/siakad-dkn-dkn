import { CheckCircle, Database, Download, XCircle } from "lucide-react";
import React, { useState } from "react";
import api from "../utils/api";

export default function AdminBackup() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [success, setSuccess] = useState(false);

	const handleBackup = async () => {
		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const response = await api.get("/backup", {
				responseType: "blob", // Important for file download
			});

			// Create a blob link to download
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement("a");
			link.href = url;

			const now = new Date();
			const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
			const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
			link.setAttribute("download", `siakad_backup_${dateStr}_${timeStr}.sql`);

			document.body.appendChild(link);
			link.click();
			link.parentNode.removeChild(link);

			setSuccess(true);
		} catch (err) {
			console.error("Backup error:", err);
			setError(
				"Gagal membuat file backup. Pastikan server memiliki akses ke pg_dump.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="animate-fade-in">
			<h3 className="fw-bold mb-4">Backup Data Sistem</h3>

			<div className="card border-0 shadow-sm rounded-4 col-md-8 col-lg-6">
				<div className="card-body p-4">
					<div className="d-flex align-items-center mb-4">
						<div className="bg-primary-subtle p-3 rounded-4 me-3">
							<Database size={28} className="text-primary" />
						</div>
						<div>
							<h5 className="fw-bold mb-1">Backup Database (SQL)</h5>
							<p className="text-muted small mb-0">
								Download seluruh data seperti Pengguna, Kelas, Jadwal, Nilai,
								dll.
							</p>
						</div>
					</div>

					{error && (
						<div className="alert alert-danger d-flex align-items-center mb-4 small py-2">
							<XCircle size={18} className="me-2 flex-shrink-0" />
							<div>{error}</div>
						</div>
					)}

					{success && (
						<div className="alert alert-success d-flex align-items-center mb-4 small py-2">
							<CheckCircle size={18} className="me-2 flex-shrink-0" />
							<div>
								Database berhasil di-backup. Periksa folder Download Anda.
							</div>
						</div>
					)}

					<div className="bg-light p-3 rounded-3 mb-4 small text-muted border">
						<b>Catatan:</b>
						<br />
						Proses ini akan mengekspor skema dan data tabel (PostgreSQL) ke
						dalam sebuah file <code>.sql</code>. Gambar tugas yang tersimpan di
						dalam folder server tidak termasuk di dalam file ini.
					</div>

					<button
						onClick={handleBackup}
						disabled={loading}
						className="btn btn-primary w-100 fw-bold py-2 d-flex align-items-center justify-content-center"
					>
						{loading ? (
							<>
								<span
									className="spinner-border spinner-border-sm me-2"
									role="status"
									aria-hidden="true"
								></span>{" "}
								Memproses Backup...
							</>
						) : (
							<>
								<Download size={18} className="me-2" /> Mulai Download Backup
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
