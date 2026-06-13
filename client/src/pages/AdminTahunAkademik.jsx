import { Calendar, CheckCircle, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminTahunAkademik() {
	const [years, setYears] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [newYearName, setNewYearName] = useState("");

	const fetchYears = async () => {
		setLoading(true);
		try {
			const res = await api.get("/academic-years");
			setYears(res.data);
		} catch (err) {
			console.error("Failed fetching academic years", err);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchYears();
	}, []);

	const handleCreate = async (e) => {
		e.preventDefault();
		try {
			await api.post("/academic-years", { name: newYearName });
			setNewYearName("");
			setShowModal(false);
			fetchYears();
		} catch (err) {
			alert("Gagal membuat Tahun Akademik");
		}
	};

	const handleActivate = async (id) => {
		if (
			!window.confirm(
				"Aktifkan Tahun Akademik ini? Jadwal semester lain akan disembunyikan.",
			)
		)
			return;
		try {
			await api.put(`/academic-years/${id}/activate`);
			fetchYears();
		} catch (err) {
			alert("Gagal mengaktifkan Tahun Akademik");
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Hapus Tahun Akademik ini?")) return;
		try {
			await api.delete(`/academic-years/${id}`);
			fetchYears();
		} catch (err) {
			alert(err.response?.data?.error || "Gagal menghapus Tahun Akademik");
		}
	};

	return (
		<div className="animate-fade-in">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h3 className="fw-bold mb-0">
					<Calendar size={24} className="me-2" />
					Tahun Akademik
				</h3>
				<button
					className="btn btn-primary btn-sm d-flex align-items-center gap-2"
					onClick={() => setShowModal(true)}
				>
					<Plus size={16} /> Tambah Tahun
				</button>
			</div>

			<div className="card shadow-sm border-0 rounded-4">
				<div className="card-body p-0">
					{loading ? (
						<div className="text-center py-5">
							<div className="spinner-border text-primary" role="status"></div>
						</div>
					) : (
						<table className="table table-hover mb-0">
							<thead className="table-light">
								<tr>
									<th className="ps-4">Tahun Akademik</th>
									<th>Status</th>
									<th className="pe-4 text-end">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{years.map((y) => (
									<tr key={y.id} className={y.is_active ? "table-primary" : ""}>
										<td className="ps-4 fw-medium">{y.name}</td>
										<td>
											{y.is_active ? (
												<span className="badge bg-success">
													<CheckCircle size={12} className="me-1 mb-1" /> Aktif
												</span>
											) : (
												<span className="badge bg-secondary">Tidak Aktif</span>
											)}
										</td>
										<td className="pe-4 text-end">
											{!y.is_active && (
												<button
													className="btn btn-sm btn-outline-success me-2"
													onClick={() => handleActivate(y.id)}
												>
													Aktifkan
												</button>
											)}
											{!y.is_active && (
												<button
													className="btn btn-sm btn-outline-danger"
													onClick={() => handleDelete(y.id)}
												>
													<Trash2 size={16} />
												</button>
											)}
										</td>
									</tr>
								))}
								{years.length === 0 && (
									<tr>
										<td colSpan="3" className="text-center py-4 text-muted">
											Belum ada data Tahun Akademik
										</td>
									</tr>
								)}
							</tbody>
						</table>
					)}
				</div>
			</div>

			{showModal && (
				<>
					<div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
					<div
						className="modal fade show d-block"
						tabIndex="-1"
						style={{ zIndex: 1050 }}
					>
						<div className="modal-dialog modal-dialog-centered">
							<div className="modal-content border-0 shadow">
								<div className="modal-header border-0 pb-0">
									<h5 className="modal-title fw-bold">Tambah Tahun Akademik</h5>
									<button
										type="button"
										className="btn-close"
										onClick={() => setShowModal(false)}
									></button>
								</div>
								<div className="modal-body">
									<form id="yearForm" onSubmit={handleCreate}>
										<div className="mb-3">
											<label className="form-label small fw-bold">
												Nama Tahun Akademik (Contoh: 2025/2026 Genap)
											</label>
											<input
												type="text"
												className="form-control"
												value={newYearName}
												onChange={(e) => setNewYearName(e.target.value)}
												required
											/>
										</div>
									</form>
								</div>
								<div className="modal-footer border-0 pt-0">
									<button
										type="button"
										className="btn btn-light"
										onClick={() => setShowModal(false)}
									>
										Batal
									</button>
									<button
										type="submit"
										form="yearForm"
										className="btn btn-primary fw-bold"
									>
										Simpan
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
