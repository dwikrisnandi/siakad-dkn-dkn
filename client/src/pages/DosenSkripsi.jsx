import { BookOpen, CheckCircle, Loader, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function DosenSkripsi() {
	const [bimbinganList, setBimbinganList] = useState([]);
	const [loading, setLoading] = useState(true);

	const [selectedSkripsi, setSelectedSkripsi] = useState(null);
	const [logbooks, setLogbooks] = useState([]);

	const fetchBimbingan = async () => {
		try {
			const res = await api.get("/skripsi/bimbingan");
			setBimbinganList(res.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchBimbingan();
	}, []);

	const openLogbooks = async (s) => {
		setSelectedSkripsi(s);
		try {
			const lbRes = await api.get(`/skripsi/${s.id}/logbooks`);
			setLogbooks(lbRes.data);
		} catch (err) {
			console.error(err);
		}
	};

	const validateLogbook = async (lbId, status) => {
		try {
			await api.put(`/skripsi/logbooks/${lbId}`, { status_validation: status });
			// reload
			const lbRes = await api.get(`/skripsi/${selectedSkripsi.id}/logbooks`);
			setLogbooks(lbRes.data);
		} catch (err) {
			alert("Gagal validasi logbook");
		}
	};

	if (loading)
		return (
			<div className="text-center py-5">
				<Loader className="spin" size={32} /> Memuat data bimbingan...
			</div>
		);

	if (selectedSkripsi) {
		return (
			<div className="animate-fade-in">
				<button
					className="btn btn-outline-secondary mb-4"
					onClick={() => setSelectedSkripsi(null)}
				>
					← Kembali
				</button>

				<div className="card shadow-sm border-0 rounded-4">
					<div className="card-header bg-white border-bottom p-4">
						<h5 className="fw-bold mb-1">Catatan Bimbingan Mahasiswa</h5>
						<p className="text-muted small mb-0">
							{selectedSkripsi.mahasiswa_name} • {selectedSkripsi.nidn_nim}
						</p>
					</div>
					<div className="card-body p-0">
						<div className="p-4 bg-light border-bottom">
							<h6 className="fw-bold mb-1">Judul Skripsi:</h6>
							<p className="mb-0 fw-semibold">
								{selectedSkripsi.approved_title}
							</p>
						</div>

						<div className="list-group list-group-flush">
							{logbooks.length === 0 ? (
								<div className="p-5 text-center text-muted">
									Mahasiswa belum mengisi catatan bimbingan (logbook).
								</div>
							) : (
								logbooks.map((lb) => (
									<div className="list-group-item p-4" key={lb.id}>
										<div className="row">
											<div className="col-md-9">
												<span className="badge bg-secondary mb-2">
													{lb.date}
												</span>
												<h6 className="fw-bold">{lb.activity}</h6>
												<p className="text-muted small mb-0">
													{lb.note || "-"}
												</p>
											</div>
											<div className="col-md-3 text-end">
												{lb.status_validation === "Pending" ? (
													<div className="btn-group btn-group-sm">
														<button
															className="btn btn-success"
															onClick={() => validateLogbook(lb.id, "Approved")}
														>
															Setujui
														</button>
														<button
															className="btn btn-danger"
															onClick={() => validateLogbook(lb.id, "Rejected")}
														>
															Tolak
														</button>
													</div>
												) : (
													<span
														className={`badge ${lb.status_validation === "Approved" ? "bg-success" : "bg-danger"}`}
													>
														{lb.status_validation}
													</span>
												)}
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="animate-fade-in">
			<h3 className="fw-bold mb-4 text-dark">
				<Users size={28} className="me-2 text-primary" /> Mahasiswa Bimbingan
				Skripsi
			</h3>

			<div className="row g-4">
				{bimbinganList.map((s) => (
					<div className="col-md-6 col-lg-4" key={s.id}>
						<div
							className="card shadow-sm border-0 rounded-4 h-100"
							style={{ cursor: "pointer" }}
							onClick={() => openLogbooks(s)}
						>
							<div className="card-body p-4">
								<div className="d-flex justify-content-between mb-2">
									<span className="badge bg-primary">{s.status}</span>
								</div>
								<h6 className="fw-bold mb-1">{s.mahasiswa_name}</h6>
								<p className="text-muted small mb-3">{s.nidn_nim}</p>
								<p
									className="small text-truncate mb-0"
									style={{ maxHeight: "40px" }}
									title={s.approved_title}
								>
									{s.approved_title}
								</p>
							</div>
							<div className="card-footer bg-light border-0 text-center rounded-bottom-4 py-2">
								<small className="fw-bold text-primary">Lihat Logbook →</small>
							</div>
						</div>
					</div>
				))}
				{bimbinganList.length === 0 && (
					<div className="col-12 text-center py-5 text-muted">
						Belum ada mahasiswa bimbingan yang ditugaskan kepada Anda.
					</div>
				)}
			</div>
		</div>
	);
}
