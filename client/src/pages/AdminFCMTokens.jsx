import { RefreshCw, Smartphone, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function AdminFCMTokens() {
	const [tokens, setTokens] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchTokens = async () => {
		setLoading(true);
		try {
			const res = await api.get("/fcm-tokens");
			setTokens(res.data);
		} catch (err) {
			console.error("Failed fetching FCM tokens", err);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchTokens();
	}, []);

	const handleDelete = async (id) => {
		if (!window.confirm("Hapus token ini?")) return;
		try {
			await api.delete(`/fcm-tokens/${id}`);
			setTokens(tokens.filter((t) => t.id !== id));
		} catch (err) {
			alert("Gagal menghapus token");
		}
	};

	// Group tokens by user
	const grouped = tokens.reduce((acc, t) => {
		const key = t.user_id;
		if (!acc[key]) {
			acc[key] = {
				name: t.name,
				nidn_nim: t.nidn_nim,
				role: t.role,
				tokens: [],
			};
		}
		acc[key].tokens.push(t);
		return acc;
	}, {});

	const roleBadge = (role) => {
		const colors = { admin: "danger", dosen: "primary", mahasiswa: "success" };
		return (
			<span
				className={`badge bg-${colors[role] || "secondary"} text-capitalize`}
			>
				{role}
			</span>
		);
	};

	return (
		<div className="animate-fade-in">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h3 className="fw-bold mb-0">
					<Smartphone size={24} className="me-2" />
					Perangkat Terdaftar (FCM Tokens)
				</h3>
				<button
					className="btn btn-outline-primary btn-sm"
					onClick={fetchTokens}
					disabled={loading}
				>
					<RefreshCw size={16} className={`me-1 ${loading ? "spin" : ""}`} />{" "}
					Refresh
				</button>
			</div>

			<div className="row mb-3">
				<div className="col-md-4">
					<div className="card border-0 shadow-sm rounded-4">
						<div className="card-body text-center">
							<h4 className="fw-bold text-primary">
								{Object.keys(grouped).length}
							</h4>
							<small className="text-muted">User Terdaftar</small>
						</div>
					</div>
				</div>
				<div className="col-md-4">
					<div className="card border-0 shadow-sm rounded-4">
						<div className="card-body text-center">
							<h4 className="fw-bold text-success">{tokens.length}</h4>
							<small className="text-muted">Total Perangkat</small>
						</div>
					</div>
				</div>
				<div className="col-md-4">
					<div className="card border-0 shadow-sm rounded-4">
						<div className="card-body text-center">
							<h4 className="fw-bold text-warning">
								{tokens.length > 0
									? (tokens.length / Object.keys(grouped).length).toFixed(1)
									: 0}
							</h4>
							<small className="text-muted">Rata-rata Perangkat/User</small>
						</div>
					</div>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-5">
					<div className="spinner-border text-primary" role="status"></div>
					<p className="mt-2 text-muted">Memuat data perangkat...</p>
				</div>
			) : Object.keys(grouped).length === 0 ? (
				<div className="alert alert-info">
					Belum ada perangkat yang terdaftar.
				</div>
			) : (
				Object.entries(grouped).map(([userId, user]) => (
					<div className="card border-0 shadow-sm rounded-4 mb-3" key={userId}>
						<div className="card-header bg-white border-0 d-flex justify-content-between align-items-center py-3 px-4">
							<div>
								<strong>{user.name}</strong>
								<span className="text-muted ms-2">({user.nidn_nim})</span>
								<span className="ms-2">{roleBadge(user.role)}</span>
							</div>
							<span className="badge bg-secondary">
								{user.tokens.length} perangkat
							</span>
						</div>
						<div className="card-body p-0">
							<table className="table table-hover mb-0">
								<thead className="table-light">
									<tr>
										<th style={{ width: "50px" }}>#</th>
										<th>Token</th>
										<th style={{ width: "180px" }}>Terakhir Digunakan</th>
										<th style={{ width: "80px" }}>Aksi</th>
									</tr>
								</thead>
								<tbody>
									{user.tokens.map((t, idx) => (
										<tr key={t.id}>
											<td>{idx + 1}</td>
											<td>
												<code
													style={{ fontSize: "11px", wordBreak: "break-all" }}
												>
													{t.token.substring(0, 40)}...
													{t.token.substring(t.token.length - 10)}
												</code>
											</td>
											<td>
												<small className="text-muted">
													{t.last_used_at
														? new Date(t.last_used_at).toLocaleString("id-ID")
														: "-"}
												</small>
											</td>
											<td>
												<button
													className="btn btn-outline-danger btn-sm"
													onClick={() => handleDelete(t.id)}
													title="Hapus Token"
												>
													<Trash2 size={14} />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				))
			)}
		</div>
	);
}
