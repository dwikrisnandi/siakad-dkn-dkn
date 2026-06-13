import { Database, Edit2, Plus, Search, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminPrograms() {
	const [programs, setPrograms] = useState([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [formData, setFormData] = useState({
		id: null,
		nama_prodi: "",
		fakultas: "",
		kode_prodi: "",
	});

	const fetchPrograms = async () => {
		try {
			const res = await api.get("/programs");
			setPrograms(res.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPrograms();
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			if (formData.id) {
				await api.put(`/programs/${formData.id}`, formData);
			} else {
				await api.post("/programs", formData);
			}
			setShowModal(false);
			fetchPrograms();
		} catch (err) {
			alert(err.response?.data?.error || "Terjadi kesalahan");
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Yakin ingin menghapus program studi ini?")) return;
		try {
			await api.delete(`/programs/${id}`);
			fetchPrograms();
		} catch (err) {
			alert(err.response?.data?.error || "Gagal menghapus");
		}
	};

	const openModal = (program = null) => {
		if (program) {
			setFormData(program);
		} else {
			setFormData({ id: null, nama_prodi: "", fakultas: "", kode_prodi: "" });
		}
		setShowModal(true);
	};

	const filtered = programs.filter(
		(p) =>
			p.nama_prodi.toLowerCase().includes(search.toLowerCase()) ||
			p.kode_prodi.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="animate-fade-in">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<div>
					<h3 className="fw-bold mb-0 text-dark">
						<Database size={28} className="me-2 text-primary" /> Master Program
						Studi
					</h3>
					<p className="text-muted small mb-0">
						Kelola daftar jurusan dan fakultas di institusi Anda
					</p>
				</div>
				<button
					className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm"
					onClick={() => openModal()}
				>
					<Plus size={18} className="me-1" /> Tambah Prodi
				</button>
			</div>

			<div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
				<div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
					<h6 className="fw-bold mb-0">Daftar Program Studi</h6>
					<div className="input-group" style={{ width: "250px" }}>
						<span className="input-group-text bg-light border-end-0">
							<Search size={16} />
						</span>
						<input
							type="text"
							className="form-control bg-light border-start-0"
							placeholder="Cari prodi..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>
				<div className="table-responsive">
					<table className="table table-hover align-middle mb-0">
						<thead className="table-light">
							<tr>
								<th className="px-4">Kode</th>
								<th>Nama Program Studi</th>
								<th>Fakultas</th>
								<th className="text-end px-4">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan="4" className="text-center py-4">
										Memuat data...
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan="4" className="text-center py-4 text-muted">
										Tidak ada data program studi.
									</td>
								</tr>
							) : (
								filtered.map((p) => (
									<tr key={p.id}>
										<td className="px-4">
											<span className="badge bg-secondary">{p.kode_prodi}</span>
										</td>
										<td className="fw-semibold">{p.nama_prodi}</td>
										<td>{p.fakultas}</td>
										<td className="text-end px-4">
											<button
												className="btn btn-sm btn-outline-primary me-2 rounded-circle"
												style={{ width: "32px", height: "32px", padding: 0 }}
												onClick={() => openModal(p)}
											>
												<Edit2 size={14} />
											</button>
											<button
												className="btn btn-sm btn-outline-danger rounded-circle"
												style={{ width: "32px", height: "32px", padding: 0 }}
												onClick={() => handleDelete(p.id)}
											>
												<Trash2 size={14} />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{showModal && (
				<>
					<div
						className="modal-backdrop fade show"
						style={{ zIndex: 1040 }}
					></div>
					<div
						className="modal fade show d-block"
						tabIndex="-1"
						style={{ zIndex: 1050 }}
					>
						<div className="modal-dialog modal-dialog-centered">
							<form
								className="modal-content border-0 shadow-lg rounded-4"
								onSubmit={handleSubmit}
							>
								<div className="modal-header border-bottom-0 pb-0">
									<h5 className="modal-title fw-bold">
										{formData.id
											? "Edit Program Studi"
											: "Tambah Program Studi Baru"}
									</h5>
									<button
										type="button"
										className="btn-close"
										onClick={() => setShowModal(false)}
									></button>
								</div>
								<div className="modal-body">
									<div className="mb-3">
										<label className="form-label fw-semibold small">
											Kode Prodi
										</label>
										<input
											type="text"
											className="form-control"
											placeholder="Contoh: IF"
											value={formData.kode_prodi}
											onChange={(e) =>
												setFormData({ ...formData, kode_prodi: e.target.value })
											}
											required
										/>
									</div>
									<div className="mb-3">
										<label className="form-label fw-semibold small">
											Nama Program Studi
										</label>
										<input
											type="text"
											className="form-control"
											placeholder="Contoh: Teknik Informatika"
											value={formData.nama_prodi}
											onChange={(e) =>
												setFormData({ ...formData, nama_prodi: e.target.value })
											}
											required
										/>
									</div>
									<div className="mb-3">
										<label className="form-label fw-semibold small">
											Fakultas
										</label>
										<input
											type="text"
											className="form-control"
											placeholder="Contoh: Fakultas Ilmu Komputer"
											value={formData.fakultas}
											onChange={(e) =>
												setFormData({ ...formData, fakultas: e.target.value })
											}
											required
										/>
									</div>
								</div>
								<div className="modal-footer border-top-0 pt-0">
									<button
										type="button"
										className="btn btn-light"
										onClick={() => setShowModal(false)}
									>
										Batal
									</button>
									<button
										type="submit"
										className="btn btn-primary px-4 fw-bold"
									>
										{formData.id ? "Simpan Perubahan" : "Tambahkan"}
									</button>
								</div>
							</form>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
