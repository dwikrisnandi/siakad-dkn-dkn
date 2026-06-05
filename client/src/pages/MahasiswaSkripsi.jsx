import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BookOpen, Send, Loader, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';

export default function MahasiswaSkripsi() {
  const [data, setData] = useState(null);
  const [logbooks, setLogbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form pengajuan
  const [title1, setTitle1] = useState('');
  const [title2, setTitle2] = useState('');
  const [title3, setTitle3] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form logbook
  const [showLogbookForm, setShowLogbookForm] = useState(false);
  const [lbDate, setLbDate] = useState('');
  const [lbActivity, setLbActivity] = useState('');
  const [lbNote, setLbNote] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/skripsi/me');
      setData(res.data);
      if (res.data) {
        const lbRes = await api.get(`/skripsi/${res.data.id}/logbooks`);
        setLogbooks(lbRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title1) return alert('Judul 1 wajib diisi!');
    setSubmitting(true);
    try {
      await api.post('/skripsi/submit', { title_1: title1, title_2: title2, title_3: title3 });
      alert('Pengajuan judul skripsi berhasil dikirim!');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengajukan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLogbook = async (e) => {
    e.preventDefault();
    if (!lbDate || !lbActivity) return alert('Tanggal dan Aktivitas wajib diisi!');
    setSubmitting(true);
    try {
      await api.post(`/skripsi/${data.id}/logbooks`, { date: lbDate, activity: lbActivity, note: lbNote });
      alert('Logbook berhasil ditambahkan');
      setLbDate(''); setLbActivity(''); setLbNote(''); setShowLogbookForm(false);
      fetchData();
    } catch (err) {
      alert('Gagal menambah logbook');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-5"><Loader className="spin" size={32} /> Memuat data Skripsi...</div>;

  if (!data) {
    return (
      <div className="animate-fade-in">
        <h3 className="fw-bold mb-4 text-dark"><BookOpen size={28} className="me-2 text-primary" /> Pengajuan Judul Skripsi</h3>
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-4">
            <div className="alert alert-info">Silakan ajukan usulan judul Skripsi/Tugas Akhir Anda. Anda dapat mengajukan maksimal 3 opsi judul.</div>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-bold">Usulan Judul 1 (Wajib)</label>
                <textarea className="form-control" rows="2" value={title1} onChange={e => setTitle1(e.target.value)} required></textarea>
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold">Usulan Judul 2 (Opsional)</label>
                <textarea className="form-control" rows="2" value={title2} onChange={e => setTitle2(e.target.value)}></textarea>
              </div>
              <div className="mb-4">
                <label className="form-label fw-bold">Usulan Judul 3 (Opsional)</label>
                <textarea className="form-control" rows="2" value={title3} onChange={e => setTitle3(e.target.value)}></textarea>
              </div>
              <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold" disabled={submitting}>
                {submitting ? 'Mengirim...' : <><Send size={18} className="me-2" /> Ajukan Judul</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const isApproved = data.status === 'Approved' || data.status === 'Bimbingan';
  const isPending = data.status === 'Pending';

  return (
    <div className="animate-fade-in">
      <h3 className="fw-bold mb-4 text-dark"><BookOpen size={28} className="me-2 text-primary" /> Ruang Skripsi / Tugas Akhir</h3>

      {isPending && (
        <div className="alert alert-warning d-flex align-items-center mb-4 rounded-4 p-4 shadow-sm">
          <Clock size={32} className="me-3 text-warning" />
          <div>
            <h5 className="fw-bold mb-1">Pengajuan Sedang Direview</h5>
            <p className="mb-0">Usulan judul Anda sedang ditinjau oleh Ketua Program Studi.</p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="alert alert-success d-flex align-items-center mb-4 rounded-4 p-4 shadow-sm">
          <CheckCircle size={32} className="me-3 text-success" />
          <div>
            <h5 className="fw-bold mb-1">Judul Disetujui!</h5>
            <p className="mb-0 fw-bold">"{data.approved_title}"</p>
          </div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm border-0 rounded-4 mb-4">
            <div className="card-header bg-white border-bottom p-3"><h6 className="fw-bold mb-0">Informasi Pembimbing</h6></div>
            <div className="card-body p-3">
              {data.pembimbing_1_name ? (
                <>
                  <p className="small text-muted mb-1">Pembimbing 1</p>
                  <p className="fw-bold mb-3">{data.pembimbing_1_name}</p>
                  <p className="small text-muted mb-1">Pembimbing 2</p>
                  <p className="fw-bold mb-0">{data.pembimbing_2_name || '-'}</p>
                </>
              ) : (
                <p className="text-muted small fst-italic mb-0">Belum ada pembimbing yang ditunjuk.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Buku Catatan Bimbingan (Logbook)</h6>
              {isApproved && (
                <button className="btn btn-primary btn-sm rounded-pill" onClick={() => setShowLogbookForm(!showLogbookForm)}>
                  {showLogbookForm ? 'Batal' : <><Plus size={16}/> Tambah</>}
                </button>
              )}
            </div>
            <div className="card-body p-0">
              {showLogbookForm && (
                <div className="p-3 border-bottom bg-light">
                  <form onSubmit={handleAddLogbook}>
                    <div className="row g-2 mb-2">
                      <div className="col-md-4">
                        <input type="date" className="form-control form-control-sm" value={lbDate} onChange={e=>setLbDate(e.target.value)} required />
                      </div>
                      <div className="col-md-8">
                        <input type="text" className="form-control form-control-sm" placeholder="Aktivitas bimbingan..." value={lbActivity} onChange={e=>setLbActivity(e.target.value)} required />
                      </div>
                    </div>
                    <div className="mb-2">
                      <textarea className="form-control form-control-sm" rows="2" placeholder="Catatan/Revisi dari dosen (opsional)..." value={lbNote} onChange={e=>setLbNote(e.target.value)}></textarea>
                    </div>
                    <button type="submit" className="btn btn-success btn-sm w-100" disabled={submitting}>Simpan Logbook</button>
                  </form>
                </div>
              )}
              
              <div className="list-group list-group-flush">
                {logbooks.length === 0 ? (
                  <div className="p-4 text-center text-muted">Belum ada catatan bimbingan.</div>
                ) : (
                  logbooks.map(lb => (
                    <div className="list-group-item p-3" key={lb.id}>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="badge bg-secondary">{lb.date}</span>
                        <span className={`badge ${lb.status_validation === 'Approved' ? 'bg-success' : lb.status_validation === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                          {lb.status_validation}
                        </span>
                      </div>
                      <h6 className="fw-bold mb-1">{lb.activity}</h6>
                      <p className="text-muted small mb-0">{lb.note || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
