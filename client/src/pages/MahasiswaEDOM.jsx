import {
	AlertTriangle,
	CheckCircle,
	ClipboardList,
	Loader,
	Send,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function MahasiswaEDOM() {
	const [schedules, setSchedules] = useState([]);
	const [questions, setQuestions] = useState([]);
	const [selectedSchedule, setSelectedSchedule] = useState(null);
	const [answers, setAnswers] = useState({});
	const [comment, setComment] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	const fetchData = async () => {
		setLoading(true);
		try {
			const [resSched, resQuest] = await Promise.all([
				api.get("/edom/schedules"),
				api.get("/edom/questions"),
			]);
			setSchedules(resSched.data);
			setQuestions(resQuest.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleSelect = (s) => {
		if (s.is_filled > 0) return; // already filled
		setSelectedSchedule(s);
		setAnswers({});
		setComment("");
	};

	const handleAnswer = (qId, score) => {
		setAnswers((prev) => ({ ...prev, [qId]: score }));
	};

	const handleSubmit = async () => {
		if (Object.keys(answers).length < questions.length) {
			alert("Mohon isi semua pertanyaan kuisioner.");
			return;
		}

		setSubmitting(true);
		try {
			const payload = {
				schedule_id: selectedSchedule.schedule_id,
				comment,
				answers: Object.keys(answers).map((qId) => ({
					question_id: parseInt(qId),
					score: answers[qId],
				})),
			};
			await api.post("/edom/submit", payload);
			alert("Evaluasi berhasil dikirim!");
			setSelectedSchedule(null);
			fetchData();
		} catch (err) {
			alert(err.response?.data?.error || "Gagal mengirim evaluasi");
		} finally {
			setSubmitting(false);
		}
	};

	if (loading)
		return (
			<div className="text-center py-5">
				<Loader className="spin" size={32} /> Memuat data EDOM...
			</div>
		);

	if (selectedSchedule) {
		return (
			<div className="animate-fade-in">
				<button
					className="btn btn-outline-secondary mb-3"
					onClick={() => setSelectedSchedule(null)}
				>
					← Kembali
				</button>
				<div className="card shadow-sm border-0 rounded-4">
					<div className="card-header bg-white border-bottom p-4">
						<h5 className="fw-bold mb-1">
							Evaluasi Dosen: {selectedSchedule.dosen_name}
						</h5>
						<p className="text-muted small mb-0">
							{selectedSchedule.course_name} ({selectedSchedule.class_name})
						</p>
					</div>
					<div className="card-body p-4">
						<div className="alert alert-info">
							Penilaian ini bersifat <strong>anonim</strong> dan sangat penting
							untuk evaluasi kinerja dosen dan institusi. Beri nilai 1 (Sangat
							Kurang) hingga 5 (Sangat Baik).
						</div>

						{questions.map((q, idx) => (
							<div key={q.id} className="mb-4 border-bottom pb-3">
								<p className="fw-semibold mb-2">
									{idx + 1}. {q.question_text}
								</p>
								<div className="d-flex gap-2 flex-wrap">
									{[1, 2, 3, 4, 5].map((score) => (
										<button
											key={score}
											onClick={() => handleAnswer(q.id, score)}
											className={`btn ${answers[q.id] === score ? "btn-primary" : "btn-outline-secondary"} px-4 py-2 fw-bold`}
											style={{ borderRadius: "10px" }}
										>
											{score}
										</button>
									))}
								</div>
							</div>
						))}

						<div className="mb-4">
							<label className="fw-semibold form-label">
								Kritik & Saran (Opsional)
							</label>
							<textarea
								className="form-control"
								rows="3"
								placeholder="Tuliskan masukan untuk dosen..."
								value={comment}
								onChange={(e) => setComment(e.target.value)}
							></textarea>
						</div>

						<button
							className="btn btn-primary rounded-pill px-5 fw-bold w-100 py-3"
							onClick={handleSubmit}
							disabled={
								submitting || Object.keys(answers).length < questions.length
							}
						>
							{submitting ? (
								<Loader className="spin" size={20} />
							) : (
								<Send size={20} className="me-2" />
							)}
							Kirim Evaluasi
						</button>
					</div>
				</div>
			</div>
		);
	}

	const allCompleted =
		schedules.length > 0 && schedules.every((s) => s.is_filled > 0);

	return (
		<div className="animate-fade-in">
			<div className="mb-4">
				<h3 className="fw-bold mb-0 text-dark">
					<ClipboardList size={28} className="me-2 text-primary" /> Evaluasi
					Dosen (EDOM)
				</h3>
				<p className="text-muted small mb-0">Evaluasi Dosen Oleh Mahasiswa</p>
			</div>

			{allCompleted ? (
				<div className="alert alert-success d-flex align-items-center rounded-4 p-4 shadow-sm">
					<CheckCircle size={32} className="me-3 text-success" />
					<div>
						<h5 className="fw-bold mb-1">Terima Kasih!</h5>
						<p className="mb-0">
							Anda telah menyelesaikan seluruh Evaluasi Dosen untuk semester
							ini. Akses KHS Anda telah terbuka.
						</p>
					</div>
				</div>
			) : (
				<div className="alert alert-warning d-flex align-items-center rounded-4 p-4 shadow-sm mb-4">
					<AlertTriangle size={32} className="me-3 text-warning" />
					<div>
						<h5 className="fw-bold mb-1">Wajib Diisi!</h5>
						<p className="mb-0">
							Anda harus mengisi EDOM untuk semua kelas aktif Anda agar dapat
							melihat Kartu Hasil Studi (KHS).
						</p>
					</div>
				</div>
			)}

			<div className="row g-4">
				{schedules.map((s) => (
					<div className="col-md-6" key={s.schedule_id}>
						<div className="card shadow-sm border-0 rounded-4 h-100">
							<div className="card-body p-4 d-flex justify-content-between align-items-center">
								<div>
									<h6 className="fw-bold mb-1">{s.course_name}</h6>
									<p className="text-muted small mb-1">{s.dosen_name}</p>
									<span className="badge bg-light text-dark border">
										{s.class_name}
									</span>
								</div>
								<div>
									{s.is_filled > 0 ? (
										<span className="text-success fw-bold d-flex align-items-center gap-1">
											<CheckCircle size={18} /> Selesai
										</span>
									) : (
										<button
											className="btn btn-primary btn-sm rounded-pill px-3"
											onClick={() => handleSelect(s)}
										>
											Isi Evaluasi
										</button>
									)}
								</div>
							</div>
						</div>
					</div>
				))}
				{schedules.length === 0 && (
					<div className="col-12 text-center py-5 text-muted">
						Belum ada jadwal kelas di semester aktif ini.
					</div>
				)}
			</div>
		</div>
	);
}
