import { Briefcase, FolderOpen, Loader, Trash2, UserPlus } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminBKD() {
	const [dosenList, setDosenList] = useState([]);
	const [roles, setRoles] = useState([]);
	const [tugasTambahan, setTugasTambahan] = useState([]);
	const [documents, setDocuments] = useState([]);
	const [loading, setLoading] = useState(true);

	// Form Tugas Tambahan
	const [showTugasForm, setShowTugasForm] = useState(false);
	const [formTugas, setFormTugas] = useState({
		dosen_id: "",
		structural_role_id: "",
		nomor_sk: "",
		tgl_mulai: "",
		tgl_selesai: "",
	});

	const fetchData = async () => {
		try {
			const [resDosen, resRoles, resTugas, resDocs] = await Promise.all([
				api.get("/users?role=dosen"),
				api.get("/bkd/roles"),
				api.get("/bkd/tugas-tambahan"),
				api.get("/bkd/documents"),
			]);
			setDosenList(resDosen.data);
			setRoles(resRoles.data);
			setTugasTambahan(resTugas.data);
			setDocuments(resDocs.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleAssignRole = async (e) => {
		e.preventDefault();
		if (!formTugas.dosen_id || !formTugas.structural_role_id)
			return alert("Dosen dan Jabatan wajib dipilih!");
		try {
			await api.post("/bkd/tugas-tambahan", formTugas);
			alert("Tugas tambahan berhasil ditambahkan");
			setShowTugasForm(false);
			setFormTugas({
				dosen_id: "",
				structural_role_id: "",
				nomor_sk: "",
				tgl_mulai: "",
				tgl_selesai: "",
			});
			fetchData();
		} catch (err) {
			alert("Gagal menambahkan tugas tambahan");
		}
	};

	const handleDeleteTugas = async (id) => {
		if (!window.confirm("Hapus tugas tambahan ini?")) return;
		try {
			await api.delete(`/bkd/tugas-tambahan/${id}`);
			fetchData();
		} catch (err) {
			alert("Gagal menghapus");
		}
	};

	if (loading)
		return (
			<div className="text-center py-5">
				<Loader className="spin" size={32} /> Memuat data BKD...
			</div>
		);

	return (
		<div className="animate-fade-in">
			<h3 className="fw-bold mb-4 text-dark">
				<Briefcase size={28} className="me-2 text-primary" /> Manajemen BKD &
				Jabatan Struktural
			</h3>

			{/* SECTION TUGAS TAMBAHAN */}
			<div className="card shadow-sm border-0 rounded-4 mb-5">
				<div className="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
					<div>
						<h6 className="fw-bold mb-0">
							Jabatan Struktural & Tugas Tambahan
						</h6>
						<small className="text-muted">
							Plotting dosen yang memegang jabatan manajerial untuk pengurangan
							SKS Mengajar.
						</small>
					</div>
					<button
						className="btn btn-primary btn-sm rounded-pill px-3"
						onClick={() => setShowTugasForm(!showTugasForm)}
					>
						<UserPlus size={16} className="me-2" /> Plotting Dosen
					</button>
				</div>
				<div className="card-body p-0">
					{showTugasForm && (
						<div className="p-4 bg-light border-bottom">
							<form onSubmit={handleAssignRole}>
								<div className="row g-3">
									<div className="col-md-4">
										<label className="form-label small fw-bold">
											Pilih Dosen
										</label>
										<select
											className="form-select form-select-sm"
											value={formTugas.dosen_id}
											onChange={(e) =>
												setFormTugas({ ...formTugas, dosen_id: e.target.value })
											}
											required
										>
											<option value="">-- Pilih --</option>
											{dosenList.map((d) => (
												<option key={d.id} value={d.id}>
													{d.name}
												</option>
											))}
										</select>
									</div>
									<div className="col-md-4">
										<label className="form-label small fw-bold">
											Jabatan Struktural
										</label>
										<select
											className="form-select form-select-sm"
											value={formTugas.structural_role_id}
											onChange={(e) =>
												setFormTugas({
													...formTugas,
													structural_role_id: e.target.value,
												})
											}
											required
										>
											<option value="">-- Pilih --</option>
											{roles.map((r) => (
												<option key={r.id} value={r.id}>
													{r.nama_jabatan} (Ekuivalen: {r.sks_ekuivalen} SKS)
												</option>
											))}
										</select>
									</div>
									<div className="col-md-4">
										<label className="form-label small fw-bold">Nomor SK</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={formTugas.nomor_sk}
											onChange={(e) =>
												setFormTugas({ ...formTugas, nomor_sk: e.target.value })
											}
										/>
									</div>
									<div className="col-md-4">
										<label className="form-label small fw-bold">
											Tanggal Mulai
										</label>
										<input
											type="date"
											className="form-control form-control-sm"
											value={formTugas.tgl_mulai}
											onChange={(e) =>
												setFormTugas({
													...formTugas,
													tgl_mulai: e.target.value,
												})
											}
										/>
									</div>
									<div className="col-md-4">
										<label className="form-label small fw-bold">
											Tanggal Selesai (Opsional)
										</label>
										<input
											type="date"
											className="form-control form-control-sm"
											value={formTugas.tgl_selesai}
											onChange={(e) =>
												setFormTugas({
													...formTugas,
													tgl_selesai: e.target.value,
												})
											}
										/>
									</div>
									<div className="col-md-4 d-flex align-items-end">
										<button
											type="submit"
											className="btn btn-success btn-sm w-100 rounded-pill"
										>
											Simpan Plotting
										</button>
									</div>
								</div>
							</form>
						</div>
					)}

					<div className="table-responsive">
						<table className="table table-hover align-middle mb-0">
							<thead className="table-light">
								<tr>
									<th className="px-4">Dosen</th>
									<th>Jabatan Struktural</th>
									<th>Nomor SK / Masa Berlaku</th>
									<th>SKS Ekuivalen</th>
									<th className="pe-4 text-end">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{tugasTambahan.map((t) => (
									<tr key={t.id}>
										<td className="px-4 fw-bold">{t.dosen_name}</td>
										<td>
											<span className="badge bg-primary">{t.nama_jabatan}</span>
										</td>
										<td>
											<small className="d-block">
												{t.nomor_sk || "SK Belum Diinput"}
											</small>
											<small className="text-muted">
												{t.tgl_mulai || "?"} s/d {t.tgl_selesai || "Sekarang"}
											</small>
										</td>
										<td className="fw-bold text-success">
											+{t.sks_ekuivalen} SKS
										</td>
										<td className="pe-4 text-end">
											<button
												className="btn btn-sm btn-light text-danger rounded-pill"
												onClick={() => handleDeleteTugas(t.id)}
											>
												<Trash2 size={16} />
											</button>
										</td>
									</tr>
								))}
								{tugasTambahan.length === 0 && (
									<tr>
										<td colSpan="5" className="text-center py-4 text-muted">
											Belum ada dosen yang menjabat struktural.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* SECTION MONITORING REPOSITORY BKD */}
			<div className="card shadow-sm border-0 rounded-4">
				<div className="card-header bg-white border-bottom p-4">
					<h6 className="fw-bold mb-0">Monitoring Dokumen BKD (Semua Dosen)</h6>
					<small className="text-muted">
						Pantau bukti fisik yang telah diunggah oleh para dosen untuk
						keperluan laporan SISTER.
					</small>
				</div>
				<div className="card-body p-0">
					<div className="table-responsive">
						<table className="table table-hover align-middle mb-0">
							<thead className="table-light">
								<tr>
									<th className="px-4">Dosen</th>
									<th>Kategori</th>
									<th>Judul Dokumen</th>
									<th>Tanggal Upload</th>
									<th className="pe-4 text-end">File</th>
								</tr>
							</thead>
							<tbody>
								{documents.map((d) => (
									<tr key={d.id}>
										<td className="px-4">
											<span className="fw-bold d-block">{d.dosen_name}</span>
											<small className="text-muted">{d.nidn_nim}</small>
										</td>
										<td>
											<span
												className={`badge ${d.category === "Pendidikan" ? "bg-primary" : d.category === "Penelitian" ? "bg-success" : d.category === "Pengabdian" ? "bg-warning text-dark" : "bg-secondary"}`}
											>
												{d.category}
											</span>
										</td>
										<td className="fw-semibold">{d.title}</td>
										<td>
											{new Date(d.uploaded_at).toLocaleDateString("id-ID")}
										</td>
										<td className="pe-4 text-end">
											<a
												href={d.file_url}
												target="_blank"
												rel="noreferrer"
												className="btn btn-sm btn-outline-primary rounded-pill"
											>
												<FolderOpen size={16} className="me-1" /> Buka
											</a>
										</td>
									</tr>
								))}
								{documents.length === 0 && (
									<tr>
										<td colSpan="5" className="text-center py-5 text-muted">
											Belum ada dokumen BKD yang diunggah dosen.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
