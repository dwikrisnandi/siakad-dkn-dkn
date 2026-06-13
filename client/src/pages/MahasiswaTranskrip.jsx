import { CheckCircle, GraduationCap, Loader, Printer } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import api from "../utils/api";

export default function MahasiswaTranskrip() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchTranskrip = async () => {
			try {
				const res = await api.get("/transkrip/me");
				setData(res.data);
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		};
		fetchTranskrip();
	}, []);

	const handlePrint = () => {
		window.print();
	};

	if (loading)
		return (
			<div className="text-center py-5">
				<Loader className="spin" size={32} /> Memuat data Transkrip...
			</div>
		);
	if (!data)
		return <div className="alert alert-danger">Gagal memuat transkrip.</div>;

	return (
		<div className="animate-fade-in">
			<div className="d-flex justify-content-between align-items-center mb-4 d-print-none">
				<div>
					<h3 className="fw-bold mb-0 text-dark">
						<GraduationCap size={28} className="me-2 text-primary" /> Transkrip
						Akademik
					</h3>
					<p className="text-muted small mb-0">
						Rangkuman nilai kumulatif mahasiswa
					</p>
				</div>
				<button
					className="btn btn-primary rounded-pill px-4 fw-bold"
					onClick={handlePrint}
				>
					<Printer size={18} className="me-2" /> Cetak Transkrip
				</button>
			</div>

			<div
				className="card shadow-sm border-0 rounded-4"
				style={{ backgroundColor: "#fff" }}
			>
				<div className="card-body p-5 print-area">
					{/* Header Kop Surat (Only visible in Print ideally, or styled nicely here) */}
					<div className="text-center border-bottom border-dark pb-3 mb-4">
						<h4 className="fw-bold text-uppercase mb-1">
							UNIVERSITAS SIAKAD DKN
						</h4>
						<p className="mb-0">
							Jl. Teknologi No. 1, Cyber City, Metaverse 10110
						</p>
						<p className="small mb-0">
							Website: siakad.arthavirddhisampada.online | Email:
							info@siakaddkn.ac.id
						</p>
					</div>

					<h4 className="fw-bold text-center text-decoration-underline mb-4">
						TRANSKRIP NILAI AKADEMIK
					</h4>

					<div className="row mb-4 fw-bold">
						<div className="col-8">
							<table className="table table-sm table-borderless mb-0">
								<tbody>
									<tr>
										<td width="150">Nama Lengkap</td>
										<td width="20">:</td>
										<td>{data.student.name}</td>
									</tr>
									<tr>
										<td>NIM</td>
										<td>:</td>
										<td>{data.student.nidn_nim}</td>
									</tr>
									<tr>
										<td>Program Studi</td>
										<td>:</td>
										<td>{data.student.prodi}</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<table
						className="table table-bordered border-dark align-middle table-sm"
						style={{ fontSize: "0.9rem" }}
					>
						<thead className="table-light text-center">
							<tr>
								<th width="50">No</th>
								<th width="120">Kode MK</th>
								<th>Mata Kuliah</th>
								<th width="80">SKS (K)</th>
								<th width="80">Nilai (N)</th>
								<th width="100">Mutu (K x N)</th>
							</tr>
						</thead>
						<tbody>
							{data.items.length === 0 ? (
								<tr>
									<td colSpan="6" className="text-center py-4 text-muted">
										Belum ada data nilai kumulatif.
									</td>
								</tr>
							) : (
								data.items.map((item, idx) => (
									<tr key={idx}>
										<td className="text-center">{idx + 1}</td>
										<td className="text-center">{item.course_code}</td>
										<td>{item.course_name}</td>
										<td className="text-center">{item.sks}</td>
										<td className="text-center">{item.letter}</td>
										<td className="text-center">{item.total_mutu}</td>
									</tr>
								))
							)}
						</tbody>
						<tfoot className="fw-bold bg-light">
							<tr>
								<td colSpan="3" className="text-end pe-3">
									Jumlah
								</td>
								<td className="text-center">{data.totalSks}</td>
								<td></td>
								<td className="text-center">
									{data.items
										.reduce((acc, curr) => acc + parseFloat(curr.total_mutu), 0)
										.toFixed(2)}
								</td>
							</tr>
						</tfoot>
					</table>

					<div className="row mt-4">
						<div className="col-6">
							<div
								className="border border-dark p-3 rounded"
								style={{ width: "250px" }}
							>
								<h6 className="fw-bold mb-2">
									Indeks Prestasi Kumulatif (IPK)
								</h6>
								<div className="display-6 fw-bold text-center">{data.ipk}</div>
							</div>
						</div>
						<div className="col-6 text-center">
							<p className="mb-5">Dekan Fakultas</p>
							<br />
							<p className="fw-bold text-decoration-underline mb-0">
								Prof. Dr. Admin Utama, M.Kom
							</p>
							<p className="small">NIDN. 123456789</p>
						</div>
					</div>
				</div>
			</div>

			{/* CSS Khusus Print */}
			<style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .d-print-none { display: none !important; }
        }
      `}</style>
		</div>
	);
}
