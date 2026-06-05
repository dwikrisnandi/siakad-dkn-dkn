import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BookOpen, CheckCircle, AlertTriangle, Send, Loader, Clock, XCircle } from 'lucide-react';

export default function MahasiswaKRS() {
  const [status, setStatus] = useState(null);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const resStatus = await api.get('/krs/status');
      setStatus(resStatus.data);

      if (resStatus.data.is_lunas && (!resStatus.data.krs || resStatus.data.krs.status_approval !== 'Approved')) {
        const resSched = await api.get('/krs/available-schedules');
        setAvailableSchedules(resSched.data);
        
        if (resStatus.data.krs_items) {
          setSelectedIds(resStatus.data.krs_items.map(item => item.schedule_id));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data KRS.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = (schedId) => {
    if (status?.krs?.status_approval === 'Pending') return; // Cannot edit if pending
    setSelectedIds(prev => 
      prev.includes(schedId) ? prev.filter(id => id !== schedId) : [...prev, schedId]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih minimal satu matakuliah!');
      return;
    }
    if (!window.confirm('Ajukan KRS ini ke Dosen Pembimbing Akademik?')) return;

    setSubmitting(true);
    try {
      await api.post('/krs/submit', { schedule_ids: selectedIds });
      alert('KRS berhasil diajukan!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Terjadi kesalahan saat mengajukan KRS');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-5"><Loader className="spin" size={32} /> Memuat data KRS...</div>;
  if (!status) return <div className="alert alert-danger">Gagal memuat status sistem.</div>;

  if (!status.academic_year) {
    return <div className="alert alert-warning">Tahun akademik saat ini belum aktif. Silakan hubungi admin.</div>;
  }

  if (!status.is_lunas) {
    return (
      <div className="card border-danger shadow-sm rounded-4 overflow-hidden animate-fade-in">
        <div className="card-body p-5 text-center">
          <AlertTriangle size={64} className="text-danger mb-3" />
          <h4 className="fw-bold text-danger">Akses KRS Terkunci</h4>
          <p className="text-muted">
            Status keuangan Anda untuk tahun akademik <strong>{status.academic_year.name}</strong> belum lunas. <br/>
            Selesaikan tagihan administrasi Anda untuk dapat mengisi Kartu Rencana Studi (KRS).
          </p>
        </div>
      </div>
    );
  }

  if (!status.program_id) {
    return <div className="alert alert-warning">Anda belum diplot ke Program Studi manapun. Silakan hubungi akademik.</div>;
  }
  if (!status.dpa_id) {
    return <div className="alert alert-warning">Anda belum memiliki Dosen Pembimbing Akademik (DPA). Silakan hubungi akademik.</div>;
  }

  const krsState = status.krs?.status_approval;
  const isApproved = krsState === 'Approved';
  const isPending = krsState === 'Pending';
  const isRejected = krsState === 'Rejected';

  // Hitung total SKS
  const totalSks = selectedIds.reduce((sum, id) => {
    const s = availableSchedules.find(x => x.id === id);
    return sum + (s ? s.sks : 0);
  }, 0);

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h3 className="fw-bold mb-0 text-dark"><BookOpen size={28} className="me-2 text-primary" /> Pengisian KRS</h3>
        <p className="text-muted small mb-0">Tahun Akademik {status.academic_year.name}</p>
      </div>

      {krsState && (
        <div className={`alert alert-${isApproved ? 'success' : isPending ? 'warning' : 'danger'} d-flex align-items-center mb-4`}>
          {isApproved ? <CheckCircle size={24} className="me-3" /> : isPending ? <Clock size={24} className="me-3" /> : <XCircle size={24} className="me-3" />}
          <div>
            <h6 className="fw-bold mb-1">
              Status KRS: {isApproved ? 'Disetujui Dosen PA' : isPending ? 'Menunggu Persetujuan Dosen PA' : 'Ditolak Dosen PA'}
            </h6>
            <p className="mb-0 small">
              {isApproved 
                ? 'KRS Anda telah disetujui. Anda sudah resmi terdaftar di kelas-kelas yang Anda pilih.'
                : isPending
                ? 'KRS Anda sedang direview oleh Dosen Pembimbing Akademik. Anda tidak dapat mengubah pilihan saat ini.'
                : 'KRS Anda ditolak. Silakan perbaiki pilihan matakuliah Anda dan ajukan ulang.'}
            </p>
          </div>
        </div>
      )}

      {isApproved ? (
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-header bg-white border-bottom p-3">
            <h6 className="fw-bold mb-0">KRS yang Disetujui</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">Kode</th>
                  <th>Matakuliah</th>
                  <th>SKS</th>
                  <th>Smt</th>
                  <th>Dosen</th>
                  <th className="pe-4">Jadwal</th>
                </tr>
              </thead>
              <tbody>
                {status.krs_items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 fw-semibold text-muted">{item.code}</td>
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
                  <td colSpan="4">{status.krs_items.reduce((s, i) => s + i.sks, 0)} SKS</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0 rounded-4 mb-5">
          <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
            <h6 className="fw-bold mb-0">Pilih Matakuliah yang Ditawarkan</h6>
            <span className="badge bg-primary rounded-pill px-3 py-2">Total Dipilih: {totalSks} SKS</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-4">Pilih</th>
                  <th>Kode</th>
                  <th>Matakuliah</th>
                  <th>SKS</th>
                  <th>Smt</th>
                  <th>Dosen Pengampu</th>
                  <th className="pe-4">Jadwal</th>
                </tr>
              </thead>
              <tbody>
                {availableSchedules.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-4 text-muted">Belum ada jadwal yang dibuka untuk program studi Anda.</td></tr>
                ) : (
                  availableSchedules.map((s) => {
                    const isChecked = selectedIds.includes(s.id);
                    return (
                      <tr key={s.id} className={isChecked ? 'table-primary-subtle' : ''}>
                        <td className="ps-4">
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            style={{transform: 'scale(1.2)'}}
                            checked={isChecked}
                            onChange={() => handleToggle(s.id)}
                            disabled={isPending}
                          />
                        </td>
                        <td className="fw-semibold text-muted">{s.course_code}</td>
                        <td className="fw-bold text-dark">{s.course_name}</td>
                        <td>{s.sks}</td>
                        <td>{s.semester}</td>
                        <td>{s.dosen_name}</td>
                        <td className="pe-4">
                          {s.day ? <><span className="badge bg-light text-dark border">{s.day}</span> {s.time_start}-{s.time_end}</> : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!isPending && availableSchedules.length > 0 && (
            <div className="card-footer bg-white border-top p-4 d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Pastikan Anda telah berkonsultasi dengan Dosen PA sebelum mengajukan.
              </div>
              <button 
                className="btn btn-primary rounded-pill px-4 fw-bold d-flex align-items-center gap-2"
                onClick={handleSubmit}
                disabled={submitting || selectedIds.length === 0}
              >
                {submitting ? <Loader className="spin" size={18} /> : <Send size={18} />}
                {isRejected ? 'Ajukan Ulang KRS' : 'Ajukan KRS Sekarang'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
