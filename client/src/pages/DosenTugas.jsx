import React, { useEffect, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
	ArrowLeft,
	BrainCircuit,
	CheckCircle,
	Eye,
	FileText,
	PenTool,
	Plus,
	Users,
	XCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const QUILL_MODULES = {
	toolbar: [
		[{ header: [1, 2, 3, false] }],
		["bold", "italic", "underline", "strike"],
		[{ list: "ordered" }, { list: "bullet" }],
		["blockquote", "code-block"],
		["clean"],
	],
};

export default function DosenTugas() {
	const { user } = useAuth();
	const location = useLocation();
	const [schedules, setSchedules] = useState([]);
	const [selectedSchedule, setSelectedSchedule] = useState("");
	const [assignments, setAssignments] = useState([]);
	const [loading, setLoading] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		deadline: "",
	});

	// Submissions
	const [viewingAssignment, setViewingAssignment] = useState(null);
	const [submissions, setSubmissions] = useState([]);
	const [loadingSubmissions, setLoadingSubmissions] = useState(false);
	const [gradingValues, setGradingValues] = useState({});

	// AI Grading
	const [aiGrading, setAiGrading] = useState({}); // subId -> { loading, skor, feedback }

	useEffect(() => {
		const fetchSchedules = async () => {
			try {
				const res = await api.get("/schedules");
				setSchedules(res.data.filter((s) => s.dosen_id === user.id));
			} catch (err) {
				console.error(err);
			}
		};
		fetchSchedules();
	}, [user.id]);

	useEffect(() => {
		if (schedules.length > 0 && location.state?.schedule_id) {
			if (selectedSchedule !== location.state.schedule_id.toString()) {
				setSelectedSchedule(location.state.schedule_id.toString());
			}
		}
	}, [schedules, location.state?.schedule_id]);

	useEffect(() => {
		if (!selectedSchedule) return;
		const fetchAssignments = async () => {
			setLoading(true);
			try {
				const res = await api.get(`/assignments/${selectedSchedule}`);
				setAssignments(res.data);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		fetchAssignments();
	}, [selectedSchedule]);

	const openModal = () => {
		setEditMode(false);
		setEditingId(null);
		setFormData({ title: "", description: "", deadline: "" });
		setShowModal(true);
	};

	const openEditModal = (a) => {
		setEditMode(true);
		setEditingId(a.id);
		let isoStr = "";
		try {
			const d = new Date(a.deadline);
			isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
				.toISOString()
				.slice(0, 16);
		} catch (e) {}
		setFormData({
			title: a.title,
			description: a.description,
			deadline: isoStr,
		});
		setShowModal(true);
	};

	const handleDelete = async (id) => {
		if (!window.confirm("Apakah Anda yakin ingin menghapus tugas ini?")) return;
		try {
			await api.delete(`/assignments/${id}`);
			const res = await api.get(`/assignments/${selectedSchedule}`);
			setAssignments(res.data);
		} catch (err) {
			alert("Gagal menghapus tugas");
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!selectedSchedule) return;
		try {
			if (editMode && editingId) {
				await api.put(`/assignments/${editingId}`, formData);
			} else {
				await api.post("/assignments", {
					schedule_id: parseInt(selectedSchedule),
					...formData,
				});
			}
			setShowModal(false);
			setFormData({ title: "", description: "", deadline: "" });
			const res = await api.get(`/assignments/${selectedSchedule}`);
			setAssignments(res.data);
		} catch (err) {
			alert("Gagal menyimpan tugas");
		}
	};

	const handleViewSubmissions = async (assignment) => {
		setViewingAssignment(assignment);
		setLoadingSubmissions(true);
		setAiGrading({});
		try {
			const res = await api.get(`/submissions/${assignment.id}`);
			setSubmissions(res.data);
			const initialGrades = {};
			res.data.forEach((s) => {
				initialGrades[s.id] = s.nilai || "";
			});
			setGradingValues(initialGrades);
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingSubmissions(false);
		}
	};

	useEffect(() => {
		if (assignments.length > 0 && location.state?.assignment_id) {
			const targetA = assignments.find(
				(a) => a.id === location.state.assignment_id,
			);
			if (targetA && viewingAssignment?.id !== targetA.id) {
				handleViewSubmissions(targetA);
			}
		}
	}, [assignments, location.state?.assignment_id]);

	const handleSaveGrade = async (subId) => {
		try {
			await api.put(`/submissions/${subId}/nilai`, {
				nilai: gradingValues[subId],
			});
			alert("Nilai berhasil disimpan!");
			setSubmissions(
				submissions.map((s) =>
					s.id === subId ? { ...s, nilai: gradingValues[subId] } : s,
				),
			);
		} catch (err) {
			alert("Gagal menyimpan nilai.");
		}
	};

	const handleViewFile = (submission) => {
		const data = submission.file_data;
		if (!data) {
			alert("Belum ada file/jawaban.");
			return;
		}

		if (data.startsWith("<") || data.includes("</")) {
			const win = window.open("", "_blank");
			win.document.write(
				`<!DOCTYPE html><html><head><title>Jawaban Tugas - ${submission.mahasiswa_name}</title><style>body{font-family:sans-serif;padding:32px;max-width:860px;margin:auto;line-height:1.6} img{max-width:100%;border-radius:8px;margin:8px 0} code{background:#f4f4f4;padding:2px 6px;border-radius:4px} pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto}</style></head><body>${data}</body></html>`,
			);
			return;
		}

		if (!data.startsWith("data:")) {
			alert("Format jawaban tidak dikenali.");
			return;
		}

		try {
			const arr = data.split(",");
			const mime = arr[0].match(/:(.*?);/)[1];
			const bstr = atob(arr[1]);
			let n = bstr.length;
			const u8arr = new Uint8Array(n);
			while (n--) {
				u8arr[n] = bstr.charCodeAt(n);
			}
			const blob = new Blob([u8arr], { type: mime });
			window.open(URL.createObjectURL(blob), "_blank");
		} catch (e) {
			alert("Gagal membuka file.");
		}
	};

	const handleAiGrade = async (sub) => {
		setAiGrading((prev) => ({ ...prev, [sub.id]: { loading: true } }));
		try {
			const isImage = sub.file_data && sub.file_data.startsWith("data:image");
			// HTML rich text (from Quill editor) or plain text
			const isHtml =
				sub.file_data &&
				(sub.file_data.startsWith("<") || sub.file_data.includes("</"));

			const payload = {
				assignment_title: viewingAssignment.title,
				assignment_description: viewingAssignment.description,
				student_name: sub.mahasiswa_name,
				submission_id: sub.id,
				submission_text: isHtml
					? sub.file_data
					: !isImage
						? sub.file_data
						: null,
				file_data: isImage ? sub.file_data : null,
			};

			const res = await api.post("/ai-grade", payload);
			setAiGrading((prev) => ({
				...prev,
				[sub.id]: {
					loading: false,
					skor: res.data.skor,
					feedback: res.data.feedback,
					ai_terindikasi: res.data.ai_terindikasi,
					ai_keterangan: res.data.ai_keterangan,
				},
			}));
		} catch (err) {
			const msg = err.response?.data?.error || "Gagal menghubungi layanan AI.";
			setAiGrading((prev) => ({
				...prev,
				[sub.id]: { loading: false, error: msg },
			}));
		}
	};

	return (
		<div className="animate-fade-in">
			<div className="d-flex align-items-center gap-3 mb-4">
				{selectedSchedule && (
					<button
						className="btn btn-sm btn-outline-secondary"
						onClick={() => {
							setSelectedSchedule("");
							setAssignments([]);
						}}
					>
						<ArrowLeft size={16} />
					</button>
				)}
				<div className="d-flex justify-content-between align-items-center w-100">
					<div>
						<h3 className="fw-bold mb-0">Kelola Tugas Mahasiswa</h3>
						{selectedSchedule && (
							<small className="text-muted">Kelas yang dipilih</small>
						)}
					</div>
					{selectedSchedule && (
						<button
							className="btn btn-primary d-flex align-items-center gap-2"
							onClick={openModal}
						>
							<Plus size={18} /> Buat Tugas Baru
						</button>
					)}
				</div>
			</div>

			{!selectedSchedule ? (
				<>
					<p className="text-muted mb-4">
						Pilih matakuliah untuk mengelola tugas:
					</p>
					{schedules.length === 0 ? (
						<div className="text-center text-muted py-5">
							<PenTool size={48} className="mb-3 opacity-50" />
							<h5>Belum ada jadwal</h5>
							<p>Anda belum diassign sebagai dosen untuk kelas manapun.</p>
						</div>
					) : (
						<div className="row g-3">
							{schedules.map((s) => (
								<div className="col-md-6 col-lg-4" key={s.id}>
									<div
										className="card shadow-sm border-0 rounded-4 h-100"
										style={{ cursor: "pointer", transition: "transform 0.15s" }}
										onMouseEnter={(e) =>
											(e.currentTarget.style.transform = "translateY(-4px)")
										}
										onMouseLeave={(e) =>
											(e.currentTarget.style.transform = "translateY(0)")
										}
										onClick={() => setSelectedSchedule(s.id)}
									>
										<div className="card-body p-4">
											<div className="d-flex align-items-center mb-3">
												<div className="bg-primary-subtle p-3 rounded-3 me-3">
													<Users size={22} className="text-primary" />
												</div>
												<span className="badge bg-primary-subtle text-primary border border-primary-subtle">
													{s.course_code}
												</span>
											</div>
											<h5 className="fw-bold mb-1">{s.course_name}</h5>
											<p className="text-muted small mb-2">
												{s.class_name || "Kelas Umum"}
											</p>
											<div
												className="d-flex gap-2 text-muted"
												style={{ fontSize: "12px" }}
											>
												<span>📅 {s.day}</span>
											</div>
										</div>
										<div className="card-footer bg-primary-subtle border-0 text-center rounded-bottom-4 py-2">
											<small className="fw-bold text-primary">
												Kelola Kelas Ini →
											</small>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			) : (
				<div className="row g-4">
					{loading ? (
						<div className="col-12 text-center text-muted">Memuat tugas...</div>
					) : assignments.length === 0 ? (
						<div className="col-12 text-center text-muted py-5">
							<PenTool size={48} className="mb-3 opacity-50" />
							<h5>Belum ada tugas</h5>
						</div>
					) : (
						assignments.map((a) => (
							<div className="col-md-6 col-lg-4" key={a.id}>
								<div className="card shadow-sm border-0 h-100 rounded-4">
									<div className="card-body p-4 pb-0">
										<div className="d-flex justify-content-between align-items-start mb-2">
											<h5 className="fw-bold mb-1">{a.title}</h5>
											{new Date(a.deadline) < new Date() ? (
												<span className="badge bg-danger">Ditutup</span>
											) : (
												<span className="badge bg-success">Aktif</span>
											)}
										</div>
										<p className="text-muted small fw-bold mb-3 text-danger">
											Tenggat: {new Date(a.deadline).toLocaleString("id-ID")}
										</p>
										{/* Render HTML description properly */}
										<div className="text-muted small mb-4 ql-snow">
											<div
												className="ql-editor p-0"
												style={{ minHeight: "unset" }}
												dangerouslySetInnerHTML={{ __html: a.description }}
											/>
										</div>
									</div>
									<div className="card-footer bg-light border-top-0 border-0 p-3 mt-auto rounded-bottom-4">
										<button
											className="btn btn-outline-primary w-100 btn-sm fw-bold mb-2"
											onClick={() => handleViewSubmissions(a)}
										>
											<Users size={16} className="me-2" /> Lihat Pengumpulan
										</button>
										<div className="d-flex gap-2">
											<button
												className="btn btn-sm btn-outline-secondary w-50 fw-bold"
												onClick={() => openEditModal(a)}
											>
												Edit
											</button>
											<button
												className="btn btn-sm btn-outline-danger w-50 fw-bold"
												onClick={() => handleDelete(a.id)}
											>
												Hapus
											</button>
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			)}

			{/* CREATE/EDIT MODAL */}
			{showModal && (
				<>
					<div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
					<div
						className="modal fade show d-block"
						tabIndex="-1"
						style={{ zIndex: 1050 }}
					>
						<div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
							<div className="modal-content border-0 shadow">
								<div className="modal-header border-bottom-0 pb-0">
									<h5 className="modal-title fw-bold">
										{editMode ? "Edit Tugas" : "Buat Tugas Baru"}
									</h5>
									<button
										type="button"
										className="btn-close"
										onClick={() => setShowModal(false)}
									/>
								</div>
								<div className="modal-body">
									<form onSubmit={handleSubmit}>
										<div className="mb-3">
											<label className="form-label text-muted small fw-bold">
												Judul Tugas
											</label>
											<input
												type="text"
												className="form-control"
												required
												value={formData.title}
												onChange={(e) =>
													setFormData({ ...formData, title: e.target.value })
												}
											/>
										</div>
										<div className="mb-3">
											<label className="form-label text-muted small fw-bold">
												Instruksi / Penjelasan Tugas
											</label>
											<div
												className="border rounded-3 overflow-hidden"
												style={{ minHeight: "200px" }}
											>
												<ReactQuill
													theme="snow"
													modules={QUILL_MODULES}
													value={formData.description}
													onChange={(val) =>
														setFormData({ ...formData, description: val })
													}
													style={{ minHeight: "180px" }}
													placeholder="Tulis instruksi tugas di sini... (bold, list, dll tersedia)"
												/>
											</div>
										</div>
										<div className="mb-3">
											<label className="form-label text-muted small fw-bold">
												Batas Waktu (Deadline)
											</label>
											<input
												type="datetime-local"
												className="form-control"
												required
												value={formData.deadline}
												onChange={(e) =>
													setFormData({ ...formData, deadline: e.target.value })
												}
											/>
										</div>
										<div className="d-flex justify-content-end gap-2 mt-4">
											<button
												type="button"
												className="btn btn-light"
												onClick={() => setShowModal(false)}
											>
												Batal
											</button>
											<button type="submit" className="btn btn-primary px-4">
												{editMode ? "Simpan Perubahan" : "Terbitkan Tugas"}
											</button>
										</div>
									</form>
								</div>
							</div>
						</div>
					</div>
				</>
			)}

			{/* SUBMISSIONS MODAL */}
			{viewingAssignment && (
				<>
					<div className="modal-backdrop fade show" />
					<div className="modal fade show d-block" tabIndex="-1">
						<div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
							<div className="modal-content border-0 shadow">
								<div className="modal-header border-bottom-0 pb-0">
									<div>
										<h5 className="modal-title fw-bold mb-0">
											Pengumpulan Tugas
										</h5>
										<small className="text-muted">
											{viewingAssignment.title}
										</small>
									</div>
									<button
										type="button"
										className="btn-close"
										onClick={() => setViewingAssignment(null)}
									/>
								</div>
								<div className="modal-body">
									{loadingSubmissions ? (
										<div className="text-center text-muted py-5">
											Memuat data pengumpulan...
										</div>
									) : submissions.length === 0 ? (
										<div className="text-center text-muted py-4">
											<FileText size={48} className="mb-3 opacity-50" />
											<h5>Belum Ada yang Mengumpulkan</h5>
										</div>
									) : (
										<div className="table-responsive">
											<table className="table table-hover align-middle">
												<thead className="table-light">
													<tr>
														<th>NIM</th>
														<th>Nama</th>
														<th>Waktu Kumpul</th>
														<th>File/Jawaban</th>
														<th>Nilai</th>
														<th>Koreksi AI</th>
													</tr>
												</thead>
												<tbody>
													{submissions.map((s) => {
														const ai = aiGrading[s.id];
														return (
															<React.Fragment key={s.id}>
																<tr>
																	<td className="fw-bold">{s.mahasiswa_nim}</td>
																	<td>{s.mahasiswa_name}</td>
																	<td>
																		<small
																			className={
																				new Date(s.submitted_at) >
																				new Date(viewingAssignment.deadline)
																					? "text-danger fw-bold"
																					: "text-success"
																			}
																		>
																			{new Date(s.submitted_at).toLocaleString(
																				"id-ID",
																			)}
																		</small>
																	</td>
																	<td>
																		{s.file_data ? (
																			<button
																				className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
																				onClick={() => handleViewFile(s)}
																			>
																				<Eye size={14} /> Lihat
																			</button>
																		) : (
																			<span className="text-muted small">
																				-
																			</span>
																		)}
																	</td>
																	<td>
																		<div className="d-flex align-items-center gap-2">
																			<input
																				type="number"
																				className="form-control form-control-sm text-center"
																				style={{ width: "70px" }}
																				min="0"
																				max="100"
																				placeholder="0-100"
																				value={
																					gradingValues[s.id] !== undefined
																						? gradingValues[s.id]
																						: ""
																				}
																				onChange={(e) =>
																					setGradingValues((prev) => ({
																						...prev,
																						[s.id]: e.target.value,
																					}))
																				}
																			/>
																			<button
																				className="btn btn-sm btn-success fw-bold"
																				onClick={() => handleSaveGrade(s.id)}
																				title="Simpan Nilai"
																			>
																				<CheckCircle size={14} /> Simpan
																			</button>
																		</div>
																	</td>
																	<td>
																		<button
																			className="btn btn-sm btn-outline-purple fw-bold d-flex align-items-center gap-1"
																			style={{
																				borderColor: "#7c3aed",
																				color: "#7c3aed",
																				whiteSpace: "nowrap",
																			}}
																			onClick={() => handleAiGrade(s)}
																			disabled={ai?.loading}
																		>
																			<BrainCircuit size={14} />
																			{ai?.loading
																				? "Menganalisis..."
																				: "🤖 Koreksi AI"}
																		</button>
																	</td>
																</tr>
																{/* AI Result row */}
																{ai && !ai.loading && (
																	<tr
																		style={{
																			background: ai.error
																				? "#fff5f5"
																				: ai.ai_terindikasi
																					? "#fffbeb"
																					: "#f0fdf4",
																		}}
																	>
																		<td colSpan={6}>
																			{ai.error ? (
																				<div className="text-danger small">
																					<XCircle size={14} className="me-1" />
																					{ai.error}
																				</div>
																			) : (
																				<div className="p-2">
																					<div className="d-flex align-items-start gap-3 mb-2">
																						<div className="text-center">
																							<div
																								className="fw-bold"
																								style={{
																									fontSize: "28px",
																									color: ai.ai_terindikasi
																										? "#d97706"
																										: "#16a34a",
																								}}
																							>
																								{ai.skor}
																							</div>
																							<small className="text-muted">
																								Skor AI
																							</small>
																						</div>
																						<div className="flex-grow-1">
																							<p className="mb-1 small fw-bold text-success">
																								💡 Feedback:
																							</p>
																							<p className="mb-2 small">
																								{ai.feedback}
																							</p>
																						</div>
																						<button
																							className="btn btn-sm btn-success"
																							onClick={async () => {
																								setGradingValues((prev) => ({
																									...prev,
																									[s.id]: ai.skor,
																								}));
																								try {
																									// Save AI Feedback to JSON immediately as requested
																									await api.post(
																										`/submissions/${s.id}/ai-feedback`,
																										{
																											feedback: ai.feedback,
																											skor: ai.skor,
																										},
																									);
																									alert(
																										"Feedback AI telah diteruskan ke mahasiswa.",
																									);
																								} catch (e) {
																									console.error(
																										"Failed to save AI feedback:",
																										e,
																									);
																								}
																							}}
																						>
																							Gunakan Nilai Ini
																						</button>
																					</div>
																					{/* AI Detection Badge */}
																					<div
																						className={`rounded-3 px-3 py-2 small ${ai.ai_terindikasi ? "bg-warning-subtle border border-warning-subtle text-warning-emphasis" : "bg-success-subtle border border-success-subtle text-success-emphasis"}`}
																					>
																						<span className="fw-bold me-2">
																							{ai.ai_terindikasi
																								? "🤖 Terindikasi Jawaban AI"
																								: "✅ Jawaban Asli Mahasiswa"}
																						</span>
																						<span>{ai.ai_keterangan}</span>
																					</div>
																				</div>
																			)}
																		</td>
																	</tr>
																)}
															</React.Fragment>
														);
													})}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
