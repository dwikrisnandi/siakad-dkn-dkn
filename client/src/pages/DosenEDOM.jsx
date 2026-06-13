import { ArrowLeft, BarChart2, MessageSquare, Star, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function DosenEDOM() {
	const [schedules, setSchedules] = useState([]);
	const [selectedSchedule, setSelectedSchedule] = useState(null);
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(false);

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

	const loadSummary = async (s) => {
		setSelectedSchedule(s);
		setLoading(true);
		try {
			const res = await api.get(`/edom/summary/${s.id}`);
			setSummary(res.data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	if (selectedSchedule && summary) {
		const overallScore =
			summary.summary.length > 0
				? summary.summary.reduce((acc, q) => acc + (q.average_score || 0), 0) /
					summary.summary.length
				: 0;

		return (
			<div className="animate-fade-in">
				<button
					className="btn btn-outline-secondary mb-3"
					onClick={() => setSelectedSchedule(null)}
				>
					<ArrowLeft size={16} className="me-2" /> Kembali
				</button>
				<div className="card shadow-sm border-0 rounded-4">
					<div className="card-header bg-white border-bottom p-4">
						<h5 className="fw-bold mb-1">
							Hasil Evaluasi: {selectedSchedule.course_name}
						</h5>
						<p className="text-muted small mb-0">
							Kelas {selectedSchedule.class_name} • {summary.total_students}{" "}
							Responden
						</p>
					</div>
					<div className="card-body p-4">
						<div className="row mb-4">
							<div className="col-md-4">
								<div className="card bg-primary-subtle border-0 rounded-4 text-center p-4 h-100">
									<h6 className="text-muted fw-bold">Skor Rata-Rata</h6>
									<div className="display-4 fw-bold text-primary mb-2">
										{overallScore.toFixed(2)}
									</div>
									<div>
										{[1, 2, 3, 4, 5].map((i) => (
											<Star
												key={i}
												size={20}
												fill={
													i <= Math.round(overallScore) ? "#0d6efd" : "none"
												}
												color={
													i <= Math.round(overallScore) ? "#0d6efd" : "#ccc"
												}
											/>
										))}
									</div>
								</div>
							</div>
							<div className="col-md-8">
								<h6 className="fw-bold mb-3">Rincian per Pertanyaan</h6>
								{summary.summary.map((q) => (
									<div key={q.question_id} className="mb-3">
										<div className="d-flex justify-content-between mb-1">
											<small
												className="fw-semibold text-truncate"
												style={{ maxWidth: "80%" }}
												title={q.question_text}
											>
												{q.question_text}
											</small>
											<small className="fw-bold text-primary">
												{(q.average_score || 0).toFixed(2)}
											</small>
										</div>
										<div
											className="progress rounded-pill"
											style={{ height: "6px" }}
										>
											<div
												className="progress-bar bg-primary"
												style={{
													width: `${((q.average_score || 0) / 5) * 100}%`,
												}}
											></div>
										</div>
									</div>
								))}
							</div>
						</div>

						<h6 className="fw-bold border-top pt-4 mb-3">
							<MessageSquare size={18} className="me-2" />
							Komentar & Masukan Mahasiswa
						</h6>
						{summary.comments.length === 0 ? (
							<p className="text-muted fst-italic">Belum ada komentar.</p>
						) : (
							<div className="list-group list-group-flush border rounded-4 overflow-hidden">
								{summary.comments.map((c, i) => (
									<div className="list-group-item p-3" key={i}>
										<p className="mb-0 text-muted">"{c}"</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="animate-fade-in">
			<div className="mb-4">
				<h3 className="fw-bold mb-0 text-dark">
					<BarChart2 size={28} className="me-2 text-primary" /> Hasil Evaluasi
					(EDOM)
				</h3>
				<p className="text-muted small mb-0">
					Lihat rekapitulasi penilaian mahasiswa untuk setiap kelas
				</p>
			</div>

			<div className="row g-4">
				{schedules.map((s) => (
					<div className="col-md-6 col-lg-4" key={s.id}>
						<div
							className="card shadow-sm border-0 rounded-4 h-100"
							style={{ cursor: "pointer" }}
							onClick={() => loadSummary(s)}
						>
							<div className="card-body p-4">
								<h6 className="fw-bold mb-1">{s.course_name}</h6>
								<p className="text-muted small mb-3">{s.class_name}</p>
								<div className="d-flex justify-content-between align-items-center">
									<span className="badge bg-light text-dark border">
										<Users size={14} className="me-1" /> Lihat Hasil
									</span>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
