import { BookOpen, CheckCircle, Loader, Search, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminSkripsi() {
	const [skripsiList, setSkripsiList] = useState([]);
	const [dosenList, setDosenList] = useState([]);
	const [loading, setLoading] = useState(true);

	const [selected, setSelected] = useState(null);
	const [status, setStatus] = useState("Approved");
	const [approvedTitle, setApprovedTitle] = useState("");
	const [pembimbing1, setPembimbing1] = useState("");
	const [pembimbing2, setPembimbing2] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [resSkripsi, resDosen] = await Promise.all([
				api.get("/skripsi"),
				api.get("/users?role=dosen"),
			]);
			setSkripsiList(resSkripsi.data);
			setDosenList(resDosen.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const openReviewModal = (s) => {
		setSelected(s);
		setStatus(s.status === "Pending" ? "Approved" : s.status);
		setApprovedTitle(s.approved_title || s.title_1);
		setPembimbing1(s.pembimbing_1_id || "");
		setPembimbing2(s.pembimbing_2_id || "");
	};

	const handleReview = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			await api.put(`/skripsi/${selected.id}/review`, {
				status,
				approved_title: approvedTitle,
				pembimbing_1_id: pembimbing1 || null,
				pembimbing_2_id: pembimbing2 || null,
			});
			alert("Review berhasil disimpan");
			setSelected(null);
			fetchData();
		} catch (err) {
			alert("Gagal menyimpan review");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading)
		return (
			<div className="text-center py-5">
				<Loader className="spin" size={32} /> Memuat data pengajuan...
			</div>
		);

	return (
		<div className="animate-fade-in">
			<h3 className="fw-bold mb-4 text-dark">
				<BookOpen size={28} className="me-2 text-primary" /> Manajemen Skripsi /
				Tugas Akhir
			</h3>

			<div className="card shadow-sm border-0 rounded-4">
				<div className="card-header bg-white border-bottom p-4">
					<h6 className="fw-bold mb-0">Daftar Pengajuan Skripsi Mahasiswa</h6>
				</div>
				<div className="table-responsive">
					<table className="table table-hover align-middle mb-0">
						<thead className="table-light">
							<tr>
								<th className="px-4">Mahasiswa</th>
								<th>Status</th>
								<th>Judul Disetujui</th>
								<th>Pembimbing</th>
								<th className="pe-4 text-end">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{skripsiList.map((s) => (
								<tr key={s.id}>
									<td className="px-4">
										<span className="fw-bold d-block">{s.mahasiswa_name}</span>
										<small className="text-muted">{s.nidn_nim}</small>
									</td>
									<td>
										<span
											className={`badge ${s.status === "Pending" ? "bg-warning text-dark" : s.status === "Lulus" ? "bg-success" : "bg-primary"}`}
										>
											{s.status}
										</span>
									</td>
									<td>
										{s.approved_title ? (
											<span
												className="text-truncate d-inline-block"
												style={{ maxWidth: "250px" }}
												title={s.approved_title}
											>
												{s.approved_title}
											</span>
										) : (
											<span className="text-muted fst-italic">Belum ada</span>
										)}
									</td>
									<td>
										{s.pembimbing_1_name ? (
											<div>
												<small className="d-block">
													1. {s.pembimbing_1_name}
												</small>
												{s.pembimbing_2_name && (
													<small className="d-block">
														2. {s.pembimbing_2_name}
													</small>
												)}
											</div>
										) : (
											<span className="text-muted fst-italic">-</span>
										)}
									</td>
									<td className="pe-4 text-end">
										<button
											className="btn btn-sm btn-outline-primary rounded-pill"
											onClick={() => openReviewModal(s)}
										>
											Review / Plotting
										</button>
									</td>
								</tr>
							))}
							{skripsiList.length === 0 && (
								<tr>
									<td colSpan="5" className="text-center py-4 text-muted">
										Belum ada data pengajuan skripsi.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* MODAL REVIEW */}
			{selected && (
				<>
					<div className="modal-backdrop fade show"></div>
					<div className="modal fade show d-block" tabIndex="-1">
						<div className="modal-dialog modal-dialog-centered modal-lg">
							<div className="modal-content rounded-4 border-0 shadow-lg">
								<div className="modal-header border-0 pb-0">
									<h5 className="fw-bold">
										Review Pengajuan: {selected.mahasiswa_name}
									</h5>
									<button
										type="button"
										className="btn-close"
										onClick={() => setSelected(null)}
									></button>
								</div>
								<div className="modal-body p-4">
									<div className="mb-4 bg-light p-3 rounded">
										<h6 className="fw-bold mb-2">Usulan Judul:</h6>
										<ol className="mb-0 small">
											<li>{selected.title_1}</li>
											{selected.title_2 && <li>{selected.title_2}</li>}
											{selected.title_3 && <li>{selected.title_3}</li>}
										</ol>
									</div>

									<form onSubmit={handleReview}>
										<div className="row g-3">
											<div className="col-md-4">
												<label className="form-label fw-semibold">
													Status Pengajuan
												</label>
												<select
													className="form-select"
													value={status}
													onChange={(e) => setStatus(e.target.value)}
												>
													<option value="Pending">Pending</option>
													<option value="Approved">
														Approved (Setuju Judul)
													</option>
													<option value="Bimbingan">Dalam Bimbingan</option>
													<option value="Sidang">Sidang</option>
													<option value="Lulus">Lulus</option>
												</select>
											</div>
											<div className="col-md-8">
												<label className="form-label fw-semibold">
													Judul yang Disetujui / Final
												</label>
												<input
													type="text"
													className="form-control"
													value={approvedTitle}
													onChange={(e) => setApprovedTitle(e.target.value)}
													required={status !== "Pending"}
												/>
											</div>
											<div className="col-md-6">
												<label className="form-label fw-semibold">
													Dosen Pembimbing 1
												</label>
												<select
													className="form-select"
													value={pembimbing1}
													onChange={(e) => setPembimbing1(e.target.value)}
												>
													<option value="">-- Pilih Pembimbing 1 --</option>
													{dosenList.map((d) => (
														<option key={d.id} value={d.id}>
															{d.name}
														</option>
													))}
												</select>
											</div>
											<div className="col-md-6">
												<label className="form-label fw-semibold">
													Dosen Pembimbing 2 (Opsional)
												</label>
												<select
													className="form-select"
													value={pembimbing2}
													onChange={(e) => setPembimbing2(e.target.value)}
												>
													<option value="">-- Tidak Ada --</option>
													{dosenList.map((d) => (
														<option key={d.id} value={d.id}>
															{d.name}
														</option>
													))}
												</select>
											</div>
										</div>
										<div className="text-end mt-4">
											<button
												type="button"
												className="btn btn-light me-2 rounded-pill"
												onClick={() => setSelected(null)}
											>
												Batal
											</button>
											<button
												type="submit"
												className="btn btn-primary rounded-pill px-4"
												disabled={submitting}
											>
												Simpan Perubahan
											</button>
										</div>
									</form>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
