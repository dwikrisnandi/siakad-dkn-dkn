import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Calendar, Users, Plus, CheckCircle, XCircle, 
  Clock, ArrowRight, UserCheck, RefreshCw, FileText, ExternalLink
} from 'lucide-react';
import api from '../utils/api';

export default function AdminPMB() {
  const [tab, setTab] = useState('pendaftar'); // 'pendaftar', 'jalur'
  const [pendaftarList, setPendaftarList] = useState([]);
  const [jalurList, setJalurList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal Jalur State
  const [showJalurModal, setShowJalurModal] = useState(false);
  const [jalurForm, setJalurForm] = useState({
    id: '', nama_jalur: '', gelombang: 1,
    tgl_buka: '', tgl_tutup: '', biaya_pendaftaran: 250000, is_active: true
  });

  // Modal Promote State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedPendaftar, setSelectedPendaftar] = useState(null);
  const [promoteNim, setPromoteNim] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'pendaftar') {
        const res = await api.get('/pmb/admin/pendaftar');
        setPendaftarList(res.data);
      } else {
        const res = await api.get('/pmb/admin/jalur');
        setJalurList(res.data);
      }
    } catch (err) {
      console.error('Fetch PMB data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJalur = async (e) => {
    e.preventDefault();
    try {
      if (jalurForm.id) {
        await api.put(`/pmb/admin/jalur/${jalurForm.id}`, jalurForm);
        alert('Jalur pendaftaran berhasil diperbarui');
      } else {
        await api.post('/pmb/admin/jalur', jalurForm);
        alert('Jalur pendaftaran baru berhasil ditambahkan');
      }
      setShowJalurModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal menyimpan jalur: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteJalur = async (id) => {
    if (!window.confirm('Yakin ingin menghapus jalur pendaftaran ini?')) return;
    try {
      await api.delete(`/pmb/admin/jalur/${id}`);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateStatus = async (id, field, value) => {
    try {
      await api.put(`/pmb/admin/pendaftar/${id}/status`, { [field]: value });
      fetchData();
    } catch (err) {
      alert('Gagal memperbarui status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenPromote = (p) => {
    setSelectedPendaftar(p);
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    setPromoteNim(`${year}${rand}`);
    setShowPromoteModal(true);
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    setIsPromoting(true);
    try {
      const res = await api.post(`/pmb/admin/pendaftar/${selectedPendaftar.id}/promote`, {
        nim: promoteNim,
        prodi_id: selectedPendaftar.prodi_pilihan_1
      });
      alert(res.data.message + `\nNIM: ${res.data.nim}\nPassword Default: ${res.data.password_default}`);
      setShowPromoteModal(false);
      fetchData();
    } catch (err) {
      alert('Gagal mempromosikan mahasiswa: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPromoting(false);
    }
  };

  const filteredPendaftar = pendaftarList.filter(p => 
    p.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
    p.no_pendaftaran?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-fluid py-3">
      {/* HEADER SECTION */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <GraduationCap className="text-primary" size={28} /> Manajemen SPMB Online
          </h3>
          <p className="text-muted small mb-0">Kelola jalur pendaftaran, verifikasi berkas, dan konversi calon mahasiswa baru ke SIAKAD.</p>
        </div>

        <div className="d-flex gap-2 mt-2 mt-md-0">
          <a 
            href="https://spmb.arthavirddhisampada.online/" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 rounded-pill px-3"
          >
            <ExternalLink size={14} /> Kunjungi Web SPMB
          </a>
          <button className="btn btn-light btn-sm border rounded-pill d-flex align-items-center gap-1" onClick={fetchData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button 
            className={`nav-link rounded-pill px-4 ${tab === 'pendaftar' ? 'active' : 'bg-white text-dark border'}`}
            onClick={() => setTab('pendaftar')}
          >
            <Users size={16} className="me-2" /> Data Calon Mahasiswa ({pendaftarList.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link rounded-pill px-4 ${tab === 'jalur' ? 'active' : 'bg-white text-dark border'}`}
            onClick={() => setTab('jalur')}
          >
            <Calendar size={16} className="me-2" /> Gelombang & Jalur Pendaftaran ({jalurList.length})
          </button>
        </li>
      </ul>

      {/* TAB 1: DATA PENDAFTAR */}
      {tab === 'pendaftar' && (
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <input 
                type="text" 
                className="form-control form-control-sm rounded-pill px-3" 
                placeholder="Cari nama, nomor pendaftaran, atau email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: '350px' }}
              />
              <span className="text-muted small">Total: <strong>{filteredPendaftar.length}</strong> pendaftar</span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>No. Pendaftaran</th>
                    <th>Nama & Kontak</th>
                    <th>Pilihan Prodi</th>
                    <th>Biaya Formulir</th>
                    <th>Status Berkas</th>
                    <th>Status Seleksi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="7" className="text-center py-4">Memuat data calon mahasiswa...</td></tr>
                  ) : filteredPendaftar.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-4 text-muted">Belum ada calon mahasiswa mendaftar.</td></tr>
                  ) : (
                    filteredPendaftar.map(p => (
                      <tr key={p.id}>
                        <td>
                          <span className="badge bg-primary bg-opacity-10 text-primary fw-bold">
                            {p.no_pendaftaran}
                          </span>
                          <small className="d-block text-muted">{new Date(p.created_at).toLocaleDateString('id-ID')}</small>
                        </td>
                        <td>
                          <strong className="d-block">{p.nama_lengkap}</strong>
                          <small className="text-muted">{p.email} | {p.no_hp}</small>
                        </td>
                        <td>
                          <span className="d-block text-primary fw-semibold">{p.nama_prodi_1 || '-'}</span>
                          <small className="text-muted">Alt: {p.nama_prodi_2 || '-'}</small>
                        </td>
                        <td>
                          <select 
                            className={`form-select form-select-sm fw-bold ${p.status_pembayaran === 'paid' ? 'text-success' : 'text-warning'}`}
                            value={p.status_pembayaran}
                            onChange={e => handleUpdateStatus(p.id, 'status_pembayaran', e.target.value)}
                            style={{ width: '110px' }}
                          >
                            <option value="unpaid">Belum Bayar</option>
                            <option value="pending">Menunggu</option>
                            <option value="paid">Lunas</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            className={`form-select form-select-sm ${p.status_berkas === 'verified' ? 'text-success fw-bold' : 'text-secondary'}`}
                            value={p.status_berkas}
                            onChange={e => handleUpdateStatus(p.id, 'status_berkas', e.target.value)}
                            style={{ width: '110px' }}
                          >
                            <option value="draft">Draft</option>
                            <option value="submitted">Diunggah</option>
                            <option value="verified">Valid</option>
                            <option value="rejected">Ditolak</option>
                          </select>
                          <small className="text-muted d-block">{p.total_berkas} Berkas</small>
                        </td>
                        <td>
                          <select 
                            className={`form-select form-select-sm fw-bold ${
                              p.status_kelulusan === 'passed' ? 'text-success' : 
                              p.status_kelulusan === 'failed' ? 'text-danger' : 'text-warning'
                            }`}
                            value={p.status_kelulusan}
                            onChange={e => handleUpdateStatus(p.id, 'status_kelulusan', e.target.value)}
                            style={{ width: '120px' }}
                          >
                            <option value="pending">Seleksi</option>
                            <option value="passed">Lulus</option>
                            <option value="failed">Tidak Lulus</option>
                          </select>
                        </td>
                        <td>
                          {p.nim_generated ? (
                            <span className="badge bg-success-subtle text-success border border-success px-2 py-1">
                              NIM: {p.nim_generated}
                            </span>
                          ) : (
                            <button 
                              className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 rounded-pill px-2 py-1"
                              style={{ fontSize: '11px' }}
                              onClick={() => handleOpenPromote(p)}
                              disabled={p.status_kelulusan !== 'passed'}
                              title={p.status_kelulusan !== 'passed' ? 'Pendaftar harus berstatus Lulus dahulu' : 'Masukkan ke SIAKAD'}
                            >
                              <UserCheck size={14} /> Promote Mahasiswa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA GELOMBANG / JALUR */}
      {tab === 'jalur' && (
        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Daftar Jalur & Gelombang</h5>
              <button 
                className="btn btn-primary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
                onClick={() => {
                  setJalurForm({ id: '', nama_jalur: '', gelombang: 1, tgl_buka: '', tgl_tutup: '', biaya_pendaftaran: 250000, is_active: true });
                  setShowJalurModal(true);
                }}
              >
                <Plus size={16} /> Tambah Jalur Pendaftaran
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Nama Jalur</th>
                    <th>Gelombang</th>
                    <th>Periode Pendaftaran</th>
                    <th>Biaya Pendaftaran</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" className="text-center py-4">Memuat jalur...</td></tr>
                  ) : jalurList.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-4 text-muted">Belum ada jalur pendaftaran.</td></tr>
                  ) : (
                    jalurList.map(j => (
                      <tr key={j.id}>
                        <td className="fw-bold text-primary">{j.nama_jalur}</td>
                        <td>Gelombang {j.gelombang}</td>
                        <td className="small text-muted">
                          {j.tgl_buka ? new Date(j.tgl_buka).toLocaleDateString('id-ID') : '-'} s.d. {j.tgl_tutup ? new Date(j.tgl_tutup).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="fw-semibold">
                          Rp {parseInt(j.biaya_pendaftaran, 10).toLocaleString('id-ID')}
                        </td>
                        <td>
                          <span className={`badge ${j.is_active ? 'bg-success' : 'bg-secondary'}`}>
                            {j.is_active ? 'Aktif' : 'Tutup'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button 
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setJalurForm({
                                  id: j.id,
                                  nama_jalur: j.nama_jalur,
                                  gelombang: j.gelombang,
                                  tgl_buka: j.tgl_buka ? j.tgl_buka.slice(0, 10) : '',
                                  tgl_tutup: j.tgl_tutup ? j.tgl_tutup.slice(0, 10) : '',
                                  biaya_pendaftaran: j.biaya_pendaftaran,
                                  is_active: j.is_active
                                });
                                setShowJalurModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDeleteJalur(j.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH/EDIT JALUR */}
      {showJalurModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0">
              <form onSubmit={handleSaveJalur}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">{jalurForm.id ? 'Edit Jalur SPMB' : 'Tambah Jalur SPMB Baru'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowJalurModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Nama Jalur Pendaftaran</label>
                    <input 
                      type="text" className="form-control" required
                      placeholder="Contoh: Jalur Reguler Gelombang 1"
                      value={jalurForm.nama_jalur}
                      onChange={e => setJalurForm({...jalurForm, nama_jalur: e.target.value})}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">Gelombang</label>
                      <input 
                        type="number" className="form-control" min="1" required
                        value={jalurForm.gelombang}
                        onChange={e => setJalurForm({...jalurForm, gelombang: parseInt(e.target.value) || 1})}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">Biaya Formulir (Rp)</label>
                      <input 
                        type="number" className="form-control" required
                        value={jalurForm.biaya_pendaftaran}
                        onChange={e => setJalurForm({...jalurForm, biaya_pendaftaran: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold">Tanggal Dibuka</label>
                      <input 
                        type="date" className="form-control" required
                        value={jalurForm.tgl_buka}
                        onChange={e => setJalurForm({...jalurForm, tgl_buka: e.target.value})}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold">Tanggal Ditutup</label>
                      <input 
                        type="date" className="form-control" required
                        value={jalurForm.tgl_tutup}
                        onChange={e => setJalurForm({...jalurForm, tgl_tutup: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-check form-switch mt-2">
                    <input 
                      className="form-check-input" type="checkbox" id="jalurActiveSwitch"
                      checked={jalurForm.is_active}
                      onChange={e => setJalurForm({...jalurForm, is_active: e.target.checked})}
                    />
                    <label className="form-check-label small" htmlFor="jalurActiveSwitch">Aktifkan Jalur Ini Sekarang</label>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary rounded-pill" onClick={() => setShowJalurModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary rounded-pill px-4">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROMOTE MAHASISWA */}
      {showPromoteModal && selectedPendaftar && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0">
              <form onSubmit={handlePromote}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-success d-flex align-items-center gap-2">
                    <UserCheck /> Konversi Menjadi Mahasiswa SIAKAD
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowPromoteModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    Calon mahasiswa <strong>{selectedPendaftar.nama_lengkap}</strong> akan didaftarkan sebagai Mahasiswa Aktif di SIAKAD.
                  </p>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Nomor Induk Mahasiswa (NIM)</label>
                    <input 
                      type="text" className="form-control" required
                      value={promoteNim}
                      onChange={e => setPromoteNim(e.target.value)}
                    />
                    <small className="text-muted" style={{ fontSize: '11px' }}>NIM akan menjadi username login portal mahasiswa.</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Program Studi Terdaftar</label>
                    <input 
                      type="text" className="form-control bg-light" disabled
                      value={selectedPendaftar.nama_prodi_1 || 'Umum'}
                    />
                  </div>
                  <div className="alert alert-info py-2 small mb-0">
                    Kata sandi default login mahasiswa akan disetel ke 6 digit terakhir NIK pendaftar.
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-secondary rounded-pill" onClick={() => setShowPromoteModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-success rounded-pill px-4" disabled={isPromoting}>
                    {isPromoting ? 'Memproses...' : 'Promote ke Mahasiswa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
