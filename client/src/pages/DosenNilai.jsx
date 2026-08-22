import { Award, Save, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

export default function DosenNilai() {
	const { user } = useAuth();
	const [schedules, setSchedules] = useState([]);
	const [selectedSchedule, setSelectedSchedule] = useState("");

	const [mahasiswa, setMahasiswa] = useState([]);
	const [loading, setLoading] = useState(false);
	const [gradesData, setGradesData] = useState({});
	const [saveStatus, setSaveStatus] = useState("");

	// Fetch Schedules
	useEffect(() => {
		const fetchSchedules = async () => {
			try {
				const res = await api.get("/schedules");
				const mySchedules = res.data.filter((s) => s.dosen_id === user.id);
				setSchedules(mySchedules);
			} catch (err) {
				console.error(err);
			}
		};
		fetchSchedules();
	}, [user.id]);

	// Fetch Enrolled Students for selected Schedule
	useEffect(() => {
		if (!selectedSchedule) return;

		const fetchStudentsAndGrades = async () => {
			setLoading(true);
			try {
				const res = await api.get(`/grades/${selectedSchedule}`);
				setMahasiswa(res.data);

				const initial = {};
				res.data.forEach((m) => {
					initial[m.mahasiswa_id] = {
						uts: m.uts !== null && m.uts !== undefined ? m.uts : "",
						uas: m.uas !== null && m.uas !== undefined ? m.uas : "",
						kehadiran: m.kehadiran !== null && m.kehadiran !== undefined ? m.kehadiran : "",
						tugas: m.tugas !== null && m.tugas !== undefined ? m.tugas : "",
						tugas_auto: m.tugas_auto !== null && m.tugas_auto !== undefined ? m.tugas_auto : 0,
					};
				});
				setGradesData(initial);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		fetchStudentsAndGrades();
	}, [selectedSchedule]);

	const handleGradeChange = (mhsId, field, value) => {
		setGradesData((prev) => ({
			...prev,
			[mhsId]: {
				...prev[mhsId],
				[field]: value === "" ? "" : parseInt(value) || 0,
			},
		}));
	};

	const calculateFinal = (grades) => {
		let hasUts = false;
		let hasUas = false;
		Object.values(gradesData).forEach((g) => {
			if (g.uts > 0) hasUts = true;
			if (g.uas > 0) hasUas = true;
		});

		let totalWeight = 0.3; // Kehadiran 0.1 + Tugas 0.2
		if (hasUts) totalWeight += 0.3;
		if (hasUas) totalWeight += 0.4;

		const baseScore =
			grades.kehadiran * 0.1 +
			grades.tugas * 0.2 +
			(hasUts ? grades.uts * 0.3 : 0) +
			(hasUas ? grades.uas * 0.4 : 0);
		return Math.round(baseScore / totalWeight);
	};

	const getLetter = (grades) => {
		const isBL = grades.kehadiran === "" || grades.kehadiran === null || grades.kehadiran === undefined ||
					 grades.tugas === "" || grades.tugas === null || grades.tugas === undefined ||
					 grades.uts === "" || grades.uts === null || grades.uts === undefined ||
					 grades.uas === "" || grades.uas === null || grades.uas === undefined;

		if (isBL) return "BL";

		const score = calculateFinal(grades);
		if (score >= 80) return "A";
		if (score >= 70) return "B";
		if (score >= 60) return "C";
		if (score >= 50) return "D";
		return "E";
	};

	const handleSave = async () => {
		if (!selectedSchedule) return;
		setSaveStatus("Menyimpan nilai...");

		const payload = {};
		for (const [mhsId, data] of Object.entries(gradesData)) {
			payload[mhsId] = {
				...data,
				tugas_override: data.tugas !== data.tugas_auto ? data.tugas : null,
			};
		}

		try {
			await api.put(`/grades/${selectedSchedule}`, {
				grades: payload,
			});
			setSaveStatus("Berhasil disimpan!");
			setTimeout(() => setSaveStatus(""), 4000);
		} catch (err) {
			console.error(err);
			setSaveStatus("Gagal menyimpan nilai.");
			setTimeout(() => setSaveStatus(""), 4000);
		}
	};

	const handleExportExcel = () => {
		if (!selectedSchedule || mahasiswa.length === 0) return;

		const scheduleInfo = schedules.find((s) => s.id === parseInt(selectedSchedule));
		const sheetData = mahasiswa.map((m) => {
			const studentGrades = gradesData[m.mahasiswa_id] || {
				kehadiran: 0,
				tugas: 0,
				uts: 0,
				uas: 0,
			};
			const finalScore = calculateFinal(studentGrades);
			const letterGrade = getLetter(studentGrades);

			return {
				"NIM": m.mahasiswa_nim,
				"Nama Mahasiswa": m.mahasiswa_name,
				"Kehadiran (10%)": studentGrades.kehadiran,
				"Tugas (20%)": studentGrades.tugas,
				"UTS (30%)": studentGrades.uts,
				"UAS (40%)": studentGrades.uas,
				"Nilai Akhir": letterGrade === "BL" ? "BL" : finalScore,
				"Huruf Mutu": letterGrade,
			};
		});

		const ws = XLSX.utils.json_to_sheet(sheetData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Nilai");

		const fileName = scheduleInfo 
			? `Nilai_${scheduleInfo.course_code}_${scheduleInfo.course_name}.xlsx` 
			: "Nilai_Mahasiswa.xlsx";
			
		XLSX.writeFile(wb, fileName);
	};

	const handleImportExcel = (e) => {
		if (mahasiswa.length === 0) return;
		const file = e.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const bstr = evt.target.result;
				const wb = XLSX.read(bstr, { type: "binary" });
				const ws = wb.Sheets[wb.SheetNames[0]];
				const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

				let importedCount = 0;
				const newGrades = { ...gradesData };

				for (let i = 0; i < data.length; i++) {
					const row = data[i];
					if (!row || !row[0]) continue;
					
					const nim = String(row[0]).trim();
					// Skip if NIM is not numeric
					if (!/^\d+$/.test(nim)) continue;

					// According to user's template: UTS is at index 6, UAS is at index 7
					const utsVal = row[6];
					const uasVal = row[7];

					const student = mahasiswa.find(m => String(m.mahasiswa_nim) === nim);
					if (student) {
						const mhsId = student.mahasiswa_id;
						newGrades[mhsId] = {
							...newGrades[mhsId],
							uts: (utsVal !== undefined && utsVal !== null && !isNaN(utsVal) && String(utsVal).trim() !== "") ? Number(utsVal) : newGrades[mhsId].uts,
							uas: (uasVal !== undefined && uasVal !== null && !isNaN(uasVal) && String(uasVal).trim() !== "") ? Number(uasVal) : newGrades[mhsId].uas,
						};
						importedCount++;
					}
				}

				setGradesData(newGrades);
				setSaveStatus(`Berhasil mengimpor nilai untuk ${importedCount} mahasiswa.`);
				setTimeout(() => setSaveStatus(""), 4000);
			} catch (err) {
				console.error(err);
				setSaveStatus("Gagal membaca file Excel.");
				setTimeout(() => setSaveStatus(""), 4000);
			}
		};
		reader.readAsBinaryString(file);
		e.target.value = "";
	};

	return (
		<div className="animate-fade-in">
			<div className="d-flex justify-content-between align-items-center mb-4">
				<h3 className="fw-bold mb-0">Input Nilai Mahasiswa</h3>
			</div>

			<div className="card shadow-sm border-0 rounded-4 mb-4">
				<div className="card-body p-4">
					<label className="form-label text-muted small fw-bold">
						Pilih Matakuliah / Kelas
					</label>
					<select
						className="form-select w-50"
						value={selectedSchedule}
						onChange={(e) => setSelectedSchedule(e.target.value)}
					>
						<option value="">-- Pilih Kelas --</option>
						{schedules.map((s) => (
							<option key={s.id} value={s.id}>
								{s.course_code} - {s.course_name} ({s.day})
							</option>
						))}
					</select>
				</div>
			</div>

			{selectedSchedule ? (
				<div className="card shadow-sm border-0 rounded-4">
					<div className="card-body p-0">
						<div className="table-responsive">
							<table className="table table-hover mb-0 align-middle">
								<thead className="table-light">
									<tr>
										<th className="ps-4 py-3">NIM</th>
										<th className="py-3">Nama Mahasiswa</th>
										<th className="py-3 text-center" style={{ width: "110px" }}>
											Kehadiran (10%)
										</th>
										<th className="py-3 text-center" style={{ width: "110px" }}>
											Tugas (20%)
										</th>
										<th className="py-3 text-center" style={{ width: "120px" }}>
											UTS (30%)
										</th>
										<th className="py-3 text-center" style={{ width: "120px" }}>
											UAS (40%)
										</th>
										<th className="py-3 text-center">Nilai Akhir</th>
										<th className="pe-4 py-3 text-center">Huruf</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										<tr>
											<td colSpan="8" className="text-center py-4">
												Memuat data mahasiswa...
											</td>
										</tr>
									) : (
										mahasiswa.map((m) => {
											const studentGrades = gradesData[m.mahasiswa_id] || {
												kehadiran: 0,
												tugas: 0,
												uts: 0,
												uas: 0,
											};
											const finalScore = calculateFinal(studentGrades);
											const letterGrade = getLetter(studentGrades);

											return (
												<tr key={m.mahasiswa_id}>
													<td className="ps-4 fw-semibold text-muted">
														{m.mahasiswa_nim}
													</td>
													<td className="fw-bold">{m.mahasiswa_name}</td>
													<td className="text-center text-muted bg-light border-end">
														{studentGrades.kehadiran}
													</td>
													<td className={`text-center border-end ${studentGrades.tugas_auto < 60 ? "" : "text-muted bg-light"}`}>
														{studentGrades.tugas_auto < 60 ? (
															<input
																type="number"
																className="form-control form-control-sm text-center fw-bold border-warning"
																min="0"
																max="100"
																value={studentGrades.tugas}
																onChange={(e) =>
																	handleGradeChange(
																		m.mahasiswa_id,
																		"tugas",
																		e.target.value,
																	)
																}
																title="Nilai sistem < 60, bisa diubah manual"
															/>
														) : (
															studentGrades.tugas
														)}
													</td>
													<td>
														<input
															type="number"
															className="form-control form-control-sm text-center fw-bold"
															min="0"
															max="100"
															value={studentGrades.uts}
															onChange={(e) =>
																handleGradeChange(
																	m.mahasiswa_id,
																	"uts",
																	e.target.value,
																)
															}
														/>
													</td>
													<td>
														<input
															type="number"
															className="form-control form-control-sm text-center fw-bold"
															min="0"
															max="100"
															value={studentGrades.uas}
															onChange={(e) =>
																handleGradeChange(
																	m.mahasiswa_id,
																	"uas",
																	e.target.value,
																)
															}
														/>
													</td>
													<td className="text-center fw-bold text-primary fs-5">
														{letterGrade === "BL" ? "-" : finalScore}
													</td>
													<td className="pe-4 text-center">
														<span
															className={`badge ${letterGrade.includes("A") || letterGrade.includes("B") ? "bg-success" : (letterGrade === "BL" ? "bg-secondary" : "bg-danger")} fs-6`}
														>
															{letterGrade}
														</span>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						<div className="p-4 border-top d-flex justify-content-between align-items-center bg-light rounded-bottom-4">
							<div>
								{saveStatus && (
									<span className={`small fw-bold ${saveStatus.includes("Gagal") ? "text-danger" : "text-success"}`}>
										{saveStatus}
									</span>
								)}
							</div>
							<div className="d-flex gap-2">
								<input 
									type="file" 
									accept=".xlsx, .xls" 
									id="import-excel" 
									style={{ display: "none" }}
									onChange={handleImportExcel} 
								/>
								<label
									htmlFor="import-excel"
									className={`btn btn-outline-primary px-4 fw-bold ${mahasiswa.length === 0 ? "disabled" : ""}`}
								>
									<Upload size={18} className="me-2 mb-1" />
									Import Excel
								</label>
								<button
									className="btn btn-success px-4 fw-bold"
									onClick={handleExportExcel}
									disabled={mahasiswa.length === 0}
								>
									<Download size={18} className="me-2 mb-1" />
									Export Excel
								</button>
								<button
									className="btn btn-primary px-4 fw-bold"
									onClick={handleSave}
									disabled={mahasiswa.length === 0}
								>
									<Save size={18} className="me-2 mb-1" />
									Simpan Nilai Akhir
								</button>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="text-center text-muted py-5">
					<Award size={48} className="mb-3 opacity-50" />
					<h5>Pilih Kelas</h5>
					<p>
						Silakan pilih kelas terlebih dahulu untuk menginput nilai mahasiswa.
					</p>
				</div>
			)}
		</div>
	);
}
