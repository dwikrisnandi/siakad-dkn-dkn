import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
	ArrowLeft,
	CheckCircle,
	ChevronRight,
	Clock,
	FileText,
	PenTool,
	Trash2,
	UploadCloud,
	XCircle,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

// Custom image handler: compress gambar -> upload ke server -> sisipkan URL-nya ke editor
async function imageHandler(quillRef) {
	const input = document.createElement("input");
	input.setAttribute("type", "file");
	input.setAttribute(
		"accept",
		"image/png,image/jpeg,image/jpg,image/gif,image/webp",
	);
	input.click();
	input.onchange = async () => {
		const file = input.files[0];
		if (!file) return;

		// Fungsi kompresi gambar menggunakan HTML5 Canvas
		const compressImage = (fileSource) => {
			return new Promise((resolve) => {
				const reader = new FileReader();
				reader.readAsDataURL(fileSource);
				reader.onload = (event) => {
					const img = new Image();
					img.src = event.target.result;
					img.onload = () => {
						const canvas = document.createElement("canvas");
						const MAX_WIDTH = 1200;
						const MAX_HEIGHT = 1200;
						let width = img.width;
						let height = img.height;

						if (width > height) {
							if (width > MAX_WIDTH) {
								height *= MAX_WIDTH / width;
								width = MAX_WIDTH;
							}
						} else {
							if (height > MAX_HEIGHT) {
								width *= MAX_HEIGHT / height;
								height = MAX_HEIGHT;
							}
						}

						canvas.width = width;
						canvas.height = height;
						const ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0, width, height);

						// Compress ke JPEG dengan kualitas 70%
						canvas.toBlob(
							(blob) => {
								// Convert blob kembali menjadi File object
								const compressedFile = new File(
									[blob],
									fileSource.name.replace(/\.[^/.]+$/, "") + ".jpg",
									{
										type: "image/jpeg",
										lastModified: Date.now(),
									},
								);
								resolve(compressedFile);
							},
							"image/jpeg",
							0.7,
						);
					};
				};
			});
		};

		try {
			// Tunggu hasil kompresi selesai
			const compressedFile = await compressImage(file);

			const token = localStorage.getItem("token");
			const formData = new FormData();
			formData.append("image", compressedFile);

			const res = await fetch("/api/upload-image", {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			if (!res.ok) throw new Error("Upload gagal");
			const data = await res.json();

			const quill = quillRef.current?.getEditor();
			if (quill) {
				const range = quill.getSelection(true);
				quill.insertEmbed(range.index, "image", data.url);
				quill.setSelection(range.index + 1);
			}
		} catch (err) {
			alert(
				"Gagal mengupload gambar. Pastikan format didukung dan tidak melebihi batas sistem.",
			);
			console.error(err);
		}
	};
}

export default function MahasiswaTugas() {
	const { user } = useAuth();
	const location = useLocation();
	const quillRef = useRef(null);
	const [schedules, setSchedules] = useState([]);
	const [selectedSchedule, setSelectedSchedule] = useState(null);
	const [assignments, setAssignments] = useState([]);
	const [mySubmissions, setMySubmissions] = useState({});
	const [loading, setLoading] = useState(false);

	const [submittingFor, setSubmittingFor] = useState(null);
	const [answerText, setAnswerText] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [submitResult, setSubmitResult] = useState(null);
	const [viewDescription, setViewDescription] = useState(null);

	// Build Quill modules with custom image handler
	const quillModules = useCallback(
		() => ({
			toolbar: {
				container: [
					[{ header: [1, 2, false] }],
					["bold", "italic", "underline"],
					[{ list: "ordered" }, { list: "bullet" }],
					["code-block"],
					["image"], // inline image button
					["clean"],
				],
				handlers: {
					image: () => imageHandler(quillRef),
				},
			},
		}),
		[],
	);

	useEffect(() => {
		const fetchSchedules = async () => {
			try {
				const res = await api.get("/schedules");
				setSchedules(res.data);
			} catch (err) {
				console.error(err);
			}
		};
		fetchSchedules();
	}, []);

	useEffect(() => {
		if (schedules.length > 0 && location.state?.schedule_id) {
			const target = schedules.find((s) => s.id === location.state.schedule_id);
			if (target && target.id !== selectedSchedule?.id) {
				setSelectedSchedule(target);
			}
		}
	}, [schedules, location.state?.schedule_id]);

	const loadAssignmentsAndSubmissions = async () => {
		if (!selectedSchedule) return;
		setLoading(true);
		try {
			const res = await api.get(`/assignments/${selectedSchedule.id}`);
			const assignData = res.data;
			setAssignments(assignData);
			const submissionsMap = {};
			for (const a of assignData) {
				try {
					const subRes = await api.get(`/submissions/${a.id}`);
					const mySub = subRes.data.find(
						(s) => Number(s.mahasiswa_id) === Number(user.id),
					);
					if (mySub) submissionsMap[a.id] = mySub;
				} catch (e) {
					console.error(e);
				}
			}
			setMySubmissions(submissionsMap);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadAssignmentsAndSubmissions();
	}, [selectedSchedule, user.id]);

	const handleSubmitTugas = async (e) => {
		e.preventDefault();
		if (!submittingFor) return;
		const isEmpty =
			!answerText || answerText === "<p><br></p>" || answerText.trim() === "";
		if (isEmpty) {
			alert("Jawaban tidak boleh kosong.");
			return;
		}

		setSubmitting(true);
		try {
			await api.post("/submissions", {
				assignment_id: submittingFor.id,
				file_url: "Jawaban Teks",
				file_data: answerText, // Store full HTML including embedded images
			});
			setSubmitResult({
				success: true,
				message: "Jawaban berhasil dikumpulkan!",
			});
			setAnswerText("");
			loadAssignmentsAndSubmissions();
		} catch (err) {
			setSubmitResult({
				success: false,
				message: "Gagal mengumpulkan tugas. Coba lagi.",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteTugas = async (assignmentId) => {
		if (
			!window.confirm(
				"Apakah Anda yakin ingin menghapus tugas yang sudah dikumpulkan?",
			)
		)
			return;
		try {
			await api.delete(`/submissions/${assignmentId}`);
			loadAssignmentsAndSubmissions();
		} catch (err) {
			alert("Gagal menghapus tugas.");
		}
	};

	const handleViewSubmission = (submission) => {
		const data = submission.file_data;
		if (!data) {
			alert("Belum ada jawaban.");
			return;
		}

		if (data.startsWith("<") || data.includes("</")) {
			// HTML rich text — open in new window
			const win = window.open("", "_blank");
			win.document.write(
				`<!DOCTYPE html><html><head><title>Jawaban Tugas</title><style>body{font-family:sans-serif;padding:32px;max-width:860px;margin:auto;line-height:1.6} img{max-width:100%;border-radius:8px;margin:8px 0} code{background:#f4f4f4;padding:2px 6px;border-radius:4px} pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto}</style></head><body>${data}</body></html>`,
			);
			return;
		}
		if (data.startsWith("data:")) {
			try {
				const arr = data.split(",");
				const mime = arr[0].match(/:(.*?);/)[1];
				const bstr = atob(arr[1]);
				let n = bstr.length;
				const u8arr = new Uint8Array(n);
				while (n--) u8arr[n] = bstr.charCodeAt(n);
				window.open(
					URL.createObjectURL(new Blob([u8arr], { type: mime })),
					"_blank",
				);
			} catch (e) {
				alert("Gagal membuka file.");
			}
			return;
		}
		alert("Format jawaban tidak dikenali.");
	};

	const openSubmit = (assignment) => {
		setSubmittingFor(assignment);
		// Pre-fill with existing answer if editing
		const existing = mySubmissions[assignment.id];
		setAnswerText(
			existing?.file_data &&
				(existing.file_data.startsWith("<") ||
					existing.file_data.includes("</"))
				? existing.file_data
				: "",
		);
		setSubmitResult(null);
	};

	const getDeadlineStatus = (deadline) => {
		const now = new Date();
		const dl = new Date(deadline);
		const diffHours = (dl - now) / (1000 * 60 * 60);
		if (diffHours < 0)
			return { label: "Ditutup", color: "danger", active: false };
		if (diffHours < 24)
			return { label: "Segera Berakhir", color: "warning", active: true };
		return { label: "Berlangsung", color: "success", active: true };
	};

	return (
		<div className="animate-fade-in">
			<div className="d-flex align-items-center gap-3 mb-4">
				{selectedSchedule && (
					<button
						className="btn btn-sm btn-outline-secondary"
						onClick={() => {
							setSelectedSchedule(null);
							setAssignments([]);
							setMySubmissions({});
						}}
					>
						<ArrowLeft size={16} />
					</button>
				)}
				<div>
					<h3 className="fw-bold mb-0">Tugas Mahasiswa</h3>
					{selectedSchedule && (
						<small className="text-muted">
							{selectedSchedule.course_name} — {selectedSchedule.class_name}
						</small>
					)}
				</div>
			</div>

			{!selectedSchedule ? (
				<>
					<p className="text-muted mb-4">
						Pilih matakuliah untuk melihat daftar tugas:
					</p>
					{schedules.length === 0 ? (
						<div className="text-center text-muted py-5">
							<PenTool size={48} className="mb-3 opacity-50" />
							<h5>Belum ada jadwal</h5>
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
										onClick={() => setSelectedSchedule(s)}
									>
										<div className="card-body p-4">
											<div className="d-flex align-items-center mb-3">
												<div className="bg-warning-subtle p-3 rounded-3 me-3">
													<PenTool size={22} className="text-warning" />
												</div>
												<span className="badge bg-warning-subtle text-warning border border-warning-subtle">
													{s.course_code}
												</span>
											</div>
											<h5 className="fw-bold mb-1">{s.course_name}</h5>
											<p className="text-muted small mb-2">{s.class_name}</p>
											<div
												className="d-flex gap-2 text-muted"
												style={{ fontSize: "12px" }}
											>
												<span>🎓 {s.dosen_name}</span>
												<span>•</span>
												<span>📅 {s.day}</span>
											</div>
										</div>
										<div className="card-footer bg-warning-subtle border-0 text-center rounded-bottom-4 py-2">
											<small className="fw-bold text-warning">
												Klik untuk melihat tugas →
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
						assignments.map((a) => {
							const status = getDeadlineStatus(a.deadline);
							const submission = mySubmissions[a.id];
							const isSubmitted = !!submission;

							return (
								<div className="col-md-6 col-lg-4" key={a.id}>
									<div
										className={`card shadow-sm border-0 h-100 rounded-4 border-top border-3 border-${isSubmitted ? "primary" : status.color}`}
									>
										<div className="card-body p-4 pb-2 d-flex flex-column">
											<div className="d-flex justify-content-between align-items-start mb-2">
												<h5 className="fw-bold mb-1">{a.title}</h5>
												{isSubmitted ? (
													<span className="badge bg-primary-subtle text-primary border border-primary-subtle">
														<CheckCircle size={12} className="me-1 mb-1" />{" "}
														Dikumpulkan
													</span>
												) : (
													<span
														className={`badge bg-${status.color}-subtle text-${status.color} border border-${status.color}-subtle`}
													>
														{status.label}
													</span>
												)}
											</div>
											<p className="text-muted small mb-1 d-flex align-items-center gap-1">
												<Clock size={13} /> Batas:{" "}
												{new Date(a.deadline).toLocaleString("id-ID")}
											</p>

											{/* Render Quill HTML description with See More */}
											<div className="text-muted small mt-3 border-bottom pb-3 mb-3 flex-grow-1">
												<div
													className="ql-snow position-relative"
													style={{ maxHeight: "60px", overflow: "hidden" }}
												>
													<div
														className="ql-editor p-0"
														style={{ minHeight: "unset" }}
														dangerouslySetInnerHTML={{ __html: a.description }}
													/>
													<div
														style={{
															position: "absolute",
															bottom: 0,
															left: 0,
															right: 0,
															height: "30px",
															background: "linear-gradient(transparent, white)",
														}}
													/>
												</div>
												<button
													className="btn btn-link p-0 text-primary small fw-bold mt-1 text-decoration-none"
													onClick={() => setViewDescription(a)}
												>
													Lihat Detail <ChevronRight size={14} />
												</button>
											</div>

											{isSubmitted && (
												<div className="bg-light p-3 rounded-3 mb-2 border mt-auto">
													<p className="fw-bold small mb-1">
														Jawaban Terkirim:
													</p>
													<div
														className="d-flex align-items-center gap-2 text-primary small"
														style={{ cursor: "pointer" }}
														onClick={() => handleViewSubmission(submission)}
													>
														<FileText size={16} />
														<span className="text-truncate text-decoration-underline fw-bold">
															{submission.file_url}
														</span>
													</div>
													<p
														className="text-muted mb-0 mt-2"
														style={{ fontSize: "11px" }}
													>
														Waktu kumpul:{" "}
														{new Date(submission.submitted_at).toLocaleString(
															"id-ID",
														)}
													</p>
													{submission.nilai !== null &&
													submission.nilai !== undefined &&
													submission.nilai !== "" ? (
														<div className="mt-3 p-2 rounded-3 bg-success-subtle border border-success-subtle text-success-emphasis d-flex align-items-center justify-content-between">
															<span className="fw-bold small">
																Nilai Tugas:
															</span>
															<span className="fw-bold fs-5">
																{submission.nilai}
															</span>
														</div>
													) : (
														<div className="mt-3 p-2 rounded-3 bg-warning-subtle border border-warning-subtle text-warning-emphasis d-flex align-items-center justify-content-between">
															<span className="fw-bold small">
																Status Penilaian:
															</span>
															<span className="fw-bold small fst-italic">
																Belum Dinilai
															</span>
														</div>
													)}
												</div>
											)}
										</div>
										<div className="card-footer bg-white border-0 p-3 pt-0 rounded-bottom-4">
											{isSubmitted ? (
												<div className="d-flex gap-2">
													{status.active && (
														<>
															<button
																onClick={() => openSubmit(a)}
																className="btn btn-outline-primary flex-grow-1 btn-sm fw-bold"
															>
																<UploadCloud size={14} className="me-1" />
																Edit
															</button>
															<button
																onClick={() => handleDeleteTugas(a.id)}
																className="btn btn-outline-danger flex-grow-1 btn-sm fw-bold"
															>
																<Trash2 size={14} className="me-1" />
																Hapus
															</button>
														</>
													)}
													{!status.active && (
														<button
															className="btn btn-secondary w-100 btn-sm fw-bold"
															disabled
														>
															Selesai (Ditutup)
														</button>
													)}
												</div>
											) : status.active ? (
												<button
													onClick={() => openSubmit(a)}
													className="btn btn-primary w-100 btn-sm fw-bold d-flex justify-content-center align-items-center gap-2"
												>
													<UploadCloud size={16} /> Kumpulkan Tugas
												</button>
											) : (
												<button
													className="btn btn-secondary w-100 btn-sm fw-bold"
													disabled
												>
													Lewat Tenggat Waktu
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			)}

			{/* SUBMISSION MODAL */}
			{submittingFor && (
				<>
					<div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
					<div
						className="modal fade show d-block"
						tabIndex="-1"
						style={{ zIndex: 1050 }}
					>
						<div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
							<div className="modal-content border-0 shadow">
								<div className="modal-header border-0 pb-0">
									<div>
										<h5 className="modal-title fw-bold mb-0">
											{mySubmissions[submittingFor.id]
												? "Edit Jawaban"
												: "Kumpulkan Tugas"}
										</h5>
										<small className="text-muted">{submittingFor.title}</small>
									</div>
									<button
										type="button"
										className="btn-close"
										onClick={() => setSubmittingFor(null)}
									/>
								</div>
								<div className="modal-body">
									{submitResult ? (
										<div className="text-center py-4">
											{submitResult.success ? (
												<CheckCircle size={56} className="text-success mb-3" />
											) : (
												<XCircle size={56} className="text-danger mb-3" />
											)}
											<h5>{submitResult.success ? "Berhasil!" : "Gagal!"}</h5>
											<p className="text-muted">{submitResult.message}</p>
											<button
												className="btn btn-primary mt-2"
												onClick={() => setSubmittingFor(null)}
											>
												Tutup
											</button>
										</div>
									) : (
										<form onSubmit={handleSubmitTugas}>
											{/* Menampilkan Soal di dalam Modal agar mudah dibaca */}
											<div className="bg-light p-3 rounded-3 mb-3 border">
												<p className="fw-bold mb-2">Soal / Deskripsi Tugas:</p>
												<div className="text-dark small ql-snow">
													<div
														className="ql-editor p-0"
														style={{ minHeight: "unset" }}
														dangerouslySetInnerHTML={{
															__html: submittingFor.description,
														}}
													/>
												</div>
											</div>

											<div className="alert alert-warning py-2 small mb-3">
												⏰ <b>Batas Kumpul:</b>{" "}
												{new Date(submittingFor.deadline).toLocaleString(
													"id-ID",
												)}
											</div>
											<div className="alert alert-info py-2 small mb-3">
												💡 <b>Tips:</b> Kamu bisa mengetik jawaban langsung di
												editor ini. Gunakan ikon <b>🖼️ gambar</b> di toolbar
												untuk menyisipkan <b>screenshot kode</b> secara inline.
											</div>

											<label className="form-label text-muted small fw-bold">
												Jawaban / Penjelasan
											</label>
											<div
												className="border rounded-3 overflow-hidden mb-3"
												style={{ minHeight: "250px" }}
											>
												<ReactQuill
													ref={quillRef}
													theme="snow"
													modules={quillModules()}
													value={answerText}
													onChange={setAnswerText}
													style={{ minHeight: "230px" }}
													placeholder="Tulis jawaban di sini... Gunakan tombol gambar (🖼️) di toolbar untuk menyisipkan screenshot kode."
												/>
											</div>

											<div className="d-flex gap-2 justify-content-end mt-2">
												<button
													type="button"
													className="btn btn-light"
													onClick={() => setSubmittingFor(null)}
												>
													Batal
												</button>
												<button
													type="submit"
													className="btn btn-primary px-4"
													disabled={submitting}
												>
													{submitting
														? "Menyimpan..."
														: mySubmissions[submittingFor.id]
															? "Perbarui Jawaban"
															: "📤 Kumpulkan"}
												</button>
											</div>
										</form>
									)}
								</div>
							</div>
						</div>
					</div>
				</>
			)}
			{/* DESCRIPTION MODAL */}
			{viewDescription && (
				<>
					<div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
					<div
						className="modal fade show d-block"
						tabIndex="-1"
						style={{ zIndex: 1050 }}
					>
						<div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
							<div className="modal-content border-0 shadow">
								<div className="modal-header border-0 pb-0">
									<h5 className="modal-title fw-bold mb-0">
										{viewDescription.title}
									</h5>
									<button
										type="button"
										className="btn-close"
										onClick={() => setViewDescription(null)}
									/>
								</div>
								<div className="modal-body ql-snow pt-3">
									<div
										className="ql-editor p-0"
										dangerouslySetInnerHTML={{
											__html: viewDescription.description,
										}}
									/>
								</div>
								<div className="modal-footer border-0">
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => setViewDescription(null)}
									>
										Tutup
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
