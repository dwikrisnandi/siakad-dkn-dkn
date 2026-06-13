import {
	CheckCircle,
	CheckSquare,
	DollarSign,
	Edit2,
	Plus,
	Search,
	Trash2,
	XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminInvoices() {
	const [invoices, setInvoices] = useState([]);
	const [mahasiswa, setMahasiswa] = useState([]);
	const [academicYears, setAcademicYears] = useState([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [formData, setFormData] = useState({
		id: null,
		mahasiswa_id: "",
		academic_year_id: "",
		nominal: "",
		status_lunas: false,
		tanggal_bayar: "",
	});

	const fetchData = async () => {
		try {
			const [resI, resM, resA] = await Promise.all([
				api.get("/invoices"),
				api.get("/users?role=mahasiswa"),
				api.get("/academic-years"),
			]);
			setInvoices(resI.data);
			setMahasiswa(resM.data);
			setAcademicYears(resA.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const payload = { ...formData };
			if (payload.status_lunas && !payload.tanggal_bayar) {
				payload.tanggal_bayar = new Date().toISOString();
			}
			if (!payload.status_lunas) {
				payload.tanggal_bayar = null;
			}

			if (formData.id) {
				await api.put(`/invoices/${formData.id}`, payload);
			} else {
				await api.post("/invoices", payload);
			}
			setShowModal(false);
			fetchData();
		} catch (err) {
			alert(err.response?.data?.error || "Terjadi kesalahan");
		}
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Yakin ingin menghapus tagihan ini?")) return;
		try {
			await api.delete(`/invoices/${id}`);
			fetchData();
		} catch (err) {
			alert(err.response?.data?.error || "Gagal menghapus");
		}
	};

	const openModal = (inv = null) => {
		if (inv) {
			// format date for input type=date
			let tb = "";
			if (inv.tanggal_bayar) {
				tb = new Date(inv.tanggal_bayar).toISOString().split("T")[0];
			}
			setFormData({ ...inv, tanggal_bayar: tb });
		} else {
			setFormData({
				id: null,
				mahasiswa_id: mahasiswa.length > 0 ? mahasiswa[0].id : "",
				academic_year_id: academicYears.length > 0 ? academicYears[0].id : "",
				nominal: "",
				status_lunas: false,
				tanggal_bayar: "",
			});
		}
		setShowModal(true);
	};

	const formatRupiah = (number) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(number);
	};

	const filtered = invoices.filter(
		(i) =>
			(i.mahasiswa_name || "").toLowerCase().includes(search.toLowerCase()) ||
			(i.nim || "").toLowerCase().includes(search.toLowerCase()) ||
			(i.academic_year_name || "").toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<div className="animate-fade-in">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<div>
					<h3 className="fw-bold mb-0 text-dark">
						<CheckSquare size={28} className="me-2 text-primary" /> Master
						Keuangan (SPP)
					</h3>
					<p className="text-muted small mb-0">
						Kelola tagihan dan status lunas mahasiswa sebagai syarat akademik
					</p>
				</div>
				<button
					className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm"
					onClick={() => openModal()}
				>
					<Plus size={18} className="me-1" /> Buat Tagihan
				</button>
			</div>

			<div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
				<div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
					<h6 className="fw-bold mb-0">Daftar Tagihan Mahasiswa</h6>
					<div className="input-group" style={{ width: "250px" }}>
						<span className="input-group-text bg-light border-end-0">
							<Search size={16} />
						</span>
						<input
							type="text"
							className="form-control bg-light border-start-0"
							placeholder="Cari nama/nim..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>
				<div className="table-responsive">
					<table className="table table-hover align-middle mb-0">
						<thead className="table-light">
							<tr>
								<th className="px-4">Mahasiswa</th>
								<th>Tahun Akademik</th>
								<th>Nominal (Rp)</th>
								<th>Status Pembayaran</th>
								<th className="text-end px-4">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan="5" className="text-center py-4">
										Memuat data...
									</td>
								</tr>
							) : filtered.length === 0 ? (
								<tr>
									<td colSpan="5" className="text-center py-4 text-muted">
										Tidak ada data tagihan.
									</td>
								</tr>
							) : (
								filtered.map((i) => (
									<tr key={i.id}>
										<td className="px-4">
											<div className="fw-bold">{i.mahasiswa_name}</div>
											<div className="text-muted small">{i.nim}</div>
										</td>
										<td>{i.academic_year_name}</td>
										<td className="fw-semibold font-monospace">
											{formatRupiah(i.nominal)}
										</td>
										<td>
											{i.status_lunas ? (
												<div>
													<span className="badge bg-success-subtle text-success border border-success-subtle mb-1">
														<CheckCircle size={12} className="me-1" /> Lunas
													</span>
													<div
														className="text-muted"
														style={{ fontSize: "10px" }}
													>
														{new Date(i.tanggal_bayar).toLocaleDateString(
															"id-ID",
														)}
													</div>
												</div>
											) : (
												<span className="badge bg-danger-subtle text-danger border border-danger-subtle">
													<XCircle size={12} className="me-1" /> Belum Lunas
												</span>
											)}
										</td>
										<td className="text-end px-4">
											<button
												className="btn btn-sm btn-outline-primary me-2 rounded-circle"
												style={{ width: "32px", height: "32px", padding: 0 }}
												onClick={() => openModal(i)}
											>
												<Edit2 size={14} />
											</button>
											<button
												className="btn btn-sm btn-outline-danger rounded-circle"
												style={{ width: "32px", height: "32px", padding: 0 }}
												onClick={() => handleDelete(i.id)}
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
										{formData.id ? "Edit Tagihan" : "Buat Tagihan Baru"}
									</h5>
									<button
										type="button"
										className="btn-close"
										onClick={() => setShowModal(false)}
									></button>
								</div>
								<div className="modal-body">
									{!formData.id && (
										<div className="mb-3">
											<label className="form-label fw-semibold small">
												Mahasiswa
											</label>
											<select
												className="form-select"
												value={formData.mahasiswa_id}
												onChange={(e) =>
													setFormData({
														...formData,
														mahasiswa_id: e.target.value,
													})
												}
												required
											>
												<option value="">-- Pilih Mahasiswa --</option>
												{mahasiswa.map((m) => (
													<option key={m.id} value={m.id}>
														{m.name} ({m.nidn_nim})
													</option>
												))}
											</select>
										</div>
									)}
									<div className="mb-3">
										<label className="form-label fw-semibold small">
											Tahun Akademik
										</label>
										<select
											className="form-select"
											value={formData.academic_year_id}
											onChange={(e) =>
												setFormData({
													...formData,
													academic_year_id: e.target.value,
												})
											}
											required
										>
											<option value="">-- Pilih Tahun Akademik --</option>
											{academicYears.map((a) => (
												<option key={a.id} value={a.id}>
													{a.name}
												</option>
											))}
										</select>
									</div>
									<div className="mb-3">
										<label className="form-label fw-semibold small">
											Nominal Tagihan (Rp)
										</label>
										<div className="input-group">
											<span className="input-group-text">
												<DollarSign size={16} />
											</span>
											<input
												type="number"
												className="form-control"
												placeholder="Contoh: 3500000"
												value={formData.nominal}
												onChange={(e) =>
													setFormData({ ...formData, nominal: e.target.value })
												}
												required
											/>
										</div>
									</div>
									<div className="mb-3 p-3 bg-light rounded-3 border">
										<div className="form-check form-switch mb-2">
											<input
												className="form-check-input"
												type="checkbox"
												role="switch"
												id="statusLunasSwitch"
												checked={formData.status_lunas}
												onChange={(e) =>
													setFormData({
														...formData,
														status_lunas: e.target.checked,
													})
												}
											/>
											<label
												className="form-check-label fw-bold"
												htmlFor="statusLunasSwitch"
											>
												{formData.status_lunas ? (
													<span className="text-success">Sudah Lunas</span>
												) : (
													<span className="text-danger">Belum Lunas</span>
												)}
											</label>
										</div>
										{formData.status_lunas && (
											<div className="mt-2">
												<label className="form-label small text-muted">
													Tanggal Pembayaran
												</label>
												<input
													type="date"
													className="form-control form-control-sm"
													value={formData.tanggal_bayar}
													onChange={(e) =>
														setFormData({
															...formData,
															tanggal_bayar: e.target.value,
														})
													}
												/>
											</div>
										)}
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
										{formData.id ? "Simpan Perubahan" : "Buat Tagihan"}
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
