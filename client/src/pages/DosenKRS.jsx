import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users, BookOpen, CheckCircle, XCircle, Search, Loader, Clock } from 'lucide-react';

export default function DosenKRS() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [krsData, setKrsData] = useState({ krs: null, items: [] });
  const [loadingKrs, setLoadingKrs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/dpa/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openStudentKRS = async (student) => {
    setSelectedStudent(student);
    setLoadingKrs(true);
    try {
      const res = await api.get(`/dpa/krs/${student.id}`);
      setKrsData(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal memuat KRS Mahasiswa');
    } finally {
      setLoadingKrs(false);
    }
  };

  const closeStudentKRS = () => {
    setSelectedStudent(null);
    setKrsData({ krs: null, items: [] });
  };

  const handleAction = async (action) => {
    if (!window.confirm(`Yakin ingin ${action === 'Approved' ? 'MENYETUJUI' : 'MENOLAK'} KRS ini?`)) return;
    
    setActionLoading(true);
    try {
      await api.post(`/dpa/krs/${krsData.krs.id}/approve`, { action });
      alert(`KRS berhasil ${action === 'Approved' ? 'disetujui' : 'ditolak'}!`);
      // Update local state and list
      setKrsData(prev => ({ ...prev, krs: { ...prev.krs, status_approval: action } }));
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, krs_status: action } : s));
    } catch (err) {
      alert(err.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = students.filter(s => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.nidn_nim || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h3 className="fw-bold mb-0 text-dark"><Users size={28} className="me-2 text-primary" /> Bimbingan Akademik (DPA)</h3>
        <p className="text-muted small mb-0">Kelola persetujuan KRS untuk anak wali Anda</p>
      </div>

      {selectedStudent ? (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-5 animate-fade-in">
          <div className="card-header bg-white border-bottom p-4 d-flex justify-content-between align-items-center">
            <div>
              <button className="btn btn-sm btn-light text-primary fw-bold mb-2 rounded-pill px-3" onClick={closeStudentKRS}>
                &larr; Kembali ke Daftar
              </button>
              <h5 className="fw-bold mb-0">{selectedStudent.name}</h5>
              <div className="text-muted small">NIM: {selectedStudent.nidn_nim} | Prodi: {selectedStudent.nama_prodi}</div>
            </div>
            
            {krsData.krs ? (
              <div>
                {krsData.krs.status_approval === 'Pending' && <span className="badge bg-warning text-dark border"><Clock size={14} className="me-1"/> Menunggu Review</span>}
                {krsData.krs.status_approval === 'Approved' && <span className="badge bg-success border"><CheckCircle size={14} className="me-1"/> Disetujui</span>}
                {krsData.krs.status_approval === 'Rejected' && <span className="badge bg-danger border"><XCircle size={14} className="me-1"/> Ditolak</span>}
              </div>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary border">Belum Mengajukan</span>
            )}
          </div>
          
          <div className="card-body p-0">
            {loadingKrs ? (
              <div className="text-center py-5"><Loader className="spin text-primary" size={32} /></div>
            ) : !krsData.krs ? (
              <div className="text-center py-5 text-muted">Mahasiswa ini belum mengajukan KRS.</div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Kode</th>
                        <th>Matakuliah</th>
                        <th>SKS</th>
                        <th>Smt</th>
                        <th>Dosen</th>
                        <th className="pe-4">Jadwal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {krsData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="ps-4 fw-semibold text-muted">{item.code}</td>
                          <td className="fw-bold">{item.name}</td>
                          <td>{item.sks}</td>
                          <td>{item.semester}</td>
                          <td>{item.dosen_name}</td>
                          <td className="pe-4">
                            {item.day ? <><span className="badge bg-light text-dark border">{item.day}</span> {item.time_start}-{item.time_end}</> : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td colSpan="2" className="text-end px-4">Total SKS:</td>
                        <td colSpan="4">{krsData.items.reduce((s, i) => s + i.sks, 0)} SKS</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {krsData.krs.status_approval === 'Pending' && (
                  <div className="p-4 bg-light border-top d-flex justify-content-end gap-3">
                    <button 
                      className="btn btn-outline-danger fw-bold rounded-pill px-4"
                      onClick={() => handleAction('Rejected')}
                      disabled={actionLoading}
                    >
                      <XCircle size={18} className="me-2" /> Tolak KRS
                    </button>
                    <button 
                      className="btn btn-success fw-bold rounded-pill px-4"
                      onClick={() => handleAction('Approved')}
                      disabled={actionLoading}
                    >
                      <CheckCircle size={18} className="me-2" /> Setujui KRS
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 animate-fade-in">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">Daftar Mahasiswa Anak Wali</h6>
            <div className="input-group" style={{ width: '250px' }}>
              <span className="input-group-text bg-light border-end-0"><Search size={16} /></span>
              <input type="text" className="form-control bg-light border-start-0" placeholder="Cari nama/nim..." 
                     value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">NIM</th>
                  <th>Nama Mahasiswa</th>
                  <th>Program Studi</th>
                  <th>Status KRS</th>
                  <th className="text-end px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-4">Memuat data anak wali...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">Belum ada mahasiswa anak wali.</td></tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 fw-semibold text-muted">{s.nidn_nim}</td>
                      <td className="fw-bold">{s.name}</td>
                      <td>{s.nama_prodi || '-'}</td>
                      <td>
                        {s.krs_status === 'Approved' && <span className="badge bg-success-subtle text-success border border-success-subtle"><CheckCircle size={12} className="me-1"/> Disetujui</span>}
                        {s.krs_status === 'Pending' && <span className="badge bg-warning-subtle text-warning border border-warning-subtle"><Clock size={12} className="me-1"/> Perlu Review</span>}
                        {s.krs_status === 'Rejected' && <span className="badge bg-danger-subtle text-danger border border-danger-subtle"><XCircle size={12} className="me-1"/> Ditolak</span>}
                        {!s.krs_status && <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Belum Mengisi</span>}
                      </td>
                      <td className="text-end px-4">
                        <button className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold" onClick={() => openStudentKRS(s)}>
                          Lihat KRS
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
