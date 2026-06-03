import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Award, UserCircle, Search, ArrowLeft } from 'lucide-react';

export default function AdminKHS() {
  const [mahasiswas, setMahasiswas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMhs, setSelectedMhs] = useState(null);
  
  const [khsData, setKhsData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMhs = async () => {
      try {
        const res = await api.get('/users?role=mahasiswa');
        setMahasiswas(res.data);
      } catch (err) {
        console.error('Fetch mhs error:', err);
      }
    };
    fetchMhs();
  }, []);

  useEffect(() => {
    if (!selectedMhs) {
      setKhsData([]);
      return;
    }
    const fetchKHS = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/khs/${selectedMhs.id}`);
        setKhsData(res.data);
      } catch (err) {
        console.error('Fetch khs error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchKHS();
  }, [selectedMhs]);

  const filteredMhs = mahasiswas.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.nidn_nim.includes(searchQuery)
  );

  const getLetterGrade = (score) => {
    if (score >= 85) return { letter: 'A', mutu: 4.0, color: 'success' };
    if (score >= 75) return { letter: 'B', mutu: 3.0, color: 'primary' };
    if (score >= 65) return { letter: 'C', mutu: 2.0, color: 'warning' };
    if (score >= 55) return { letter: 'D', mutu: 1.0, color: 'danger' };
    return { letter: 'E', mutu: 0.0, color: 'dark' };
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        {selectedMhs && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedMhs(null)}>
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h3 className="fw-bold mb-0">Kartu Hasil Studi (KHS) Mahasiswa</h3>
          {selectedMhs && <small className="text-muted">{selectedMhs.name} ({selectedMhs.nidn_nim})</small>}
        </div>
      </div>

      {!selectedMhs ? (
        <>
          <div className="card border-0 shadow-sm rounded-4 mb-4">
            <div className="card-body p-3">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 border-light-subtle">
                  <Search size={18} className="text-muted" />
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 border-light-subtle" 
                  placeholder="Cari nama atau NIM mahasiswa..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="row g-3">
            {filteredMhs.map(m => (
              <div className="col-md-6 col-lg-4" key={m.id}>
                <div 
                  className="card shadow-sm border-0 rounded-4 h-100" 
                  style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => setSelectedMhs(m)}
                >
                  <div className="card-body p-4 d-flex align-items-center gap-3">
                    <div className="bg-primary-subtle rounded-circle p-3 text-primary d-flex align-items-center justify-content-center">
                      <UserCircle size={28} />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1 text-truncate" style={{maxWidth: '180px'}} title={m.name}>{m.name}</h6>
                      <small className="text-muted d-block">{m.nidn_nim}</small>
                      {m.class_name && <span className="badge bg-light text-dark mt-1 border">{m.class_name}</span>}
                    </div>
                  </div>
                  <div className="card-footer bg-transparent border-top pb-3 pt-2 text-center border-0">
                    <small className="text-primary fw-bold">Lihat KHS →</small>
                  </div>
                </div>
              </div>
            ))}
            {filteredMhs.length === 0 && (
              <div className="col-12 text-center text-muted py-5">
                Pencarian tidak menemukan mahasiswa.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <div>Memuat data KHS {selectedMhs.name}...</div>
            </div>
          ) : khsData.length === 0 ? (
            <div className="text-center text-muted py-5 card border-0 shadow-sm rounded-4">
              <Award size={48} className="mb-3 opacity-25 mx-auto" />
              <h5>Belum Ada Data Nilai</h5>
              <p className="mb-0">Mahasiswa ini belum terdaftar di kelas manapun atau belum ada nilai yang dapat dihitung.</p>
            </div>
          ) : (
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
                <h5 className="fw-bold mb-0">Rincian Nilai per Matakuliah</h5>
                <button className="btn btn-sm btn-outline-primary" onClick={() => window.print()}>
                  🖨️ Cetak KHS
                </button>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Matakuliah</th>
                        <th>SKS</th>
                        <th>Dosen</th>
                        <th>Kehadiran (10%)</th>
                        <th>Tugas (20%)</th>
                        <th>UTS (30%)</th>
                        <th>UAS (40%)</th>
                        <th className="text-center">Nilai Akhir</th>
                        <th className="text-center pe-4">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {khsData.map((item, idx) => {
                        const grade = getLetterGrade(item.final_score);
                        return (
                          <tr key={idx}>
                            <td className="ps-4 py-3">
                              <span className="fw-bold text-dark d-block">{item.course_name}</span>
                              <small className="text-muted">{item.course_code} - Sem {item.semester}</small>
                            </td>
                            <td>{item.sks}</td>
                            <td><small>{item.dosen_name}</small></td>
                            <td>{item.kehadiran}</td>
                            <td>{item.tugas}</td>
                            <td>{item.uts}</td>
                            <td>{item.uas}</td>
                            <td className="text-center fw-bold fs-6">{item.final_score}</td>
                            <td className="text-center pe-4">
                              <span className={`badge bg-${grade.color} fs-6 px-3`}>{grade.letter}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan={7} className="text-end py-3">Indeks Prestasi Semester (IPS) Sementara :</td>
                        <td colSpan={2} className="text-center py-3 fs-5 text-primary">
                          {(khsData.reduce((acc, curr) => acc + (getLetterGrade(curr.final_score).mutu * curr.sks), 0) / Math.max(khsData.reduce((acc, curr) => acc + curr.sks, 0), 1)).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
