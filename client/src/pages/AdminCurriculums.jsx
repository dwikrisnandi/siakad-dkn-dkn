import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { BookOpen, Plus, Edit2, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';

export default function AdminCurriculums() {
  const [curriculums, setCurriculums] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ id: null, program_id: '', tahun_berlaku: '', status_aktif: true });

  const fetchData = async () => {
    try {
      const [resC, resP] = await Promise.all([
        api.get('/curriculums'),
        api.get('/programs')
      ]);
      setCurriculums(resC.data);
      setPrograms(resP.data);
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
    try {
      if (formData.id) {
        await api.put(`/curriculums/${formData.id}`, formData);
      } else {
        await api.post('/curriculums', formData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kurikulum ini?')) return;
    try {
      await api.delete(`/curriculums/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus');
    }
  };

  const openModal = (curr = null) => {
    if (curr) {
      setFormData(curr);
    } else {
      setFormData({ id: null, program_id: programs.length > 0 ? programs[0].id : '', tahun_berlaku: new Date().getFullYear().toString(), status_aktif: true });
    }
    setShowModal(true);
  };

  const filtered = curriculums.filter(c => 
    (c.nama_prodi || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.tahun_berlaku || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-0 text-dark"><BookOpen size={28} className="me-2 text-primary" /> Master Kurikulum</h3>
          <p className="text-muted small mb-0">Kelola tahun berlaku kurikulum untuk tiap program studi</p>
        </div>
        <button className="btn btn-primary fw-bold rounded-pill px-4 shadow-sm" onClick={() => openModal()}>
          <Plus size={18} className="me-1" /> Tambah Kurikulum
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
        <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
          <h6 className="fw-bold mb-0">Daftar Kurikulum</h6>
          <div className="input-group" style={{ width: '250px' }}>
            <span className="input-group-text bg-light border-end-0"><Search size={16} /></span>
            <input type="text" className="form-control bg-light border-start-0" placeholder="Cari prodi/tahun..." 
                   value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4">Program Studi</th>
                <th>Tahun Berlaku</th>
                <th>Status</th>
                <th className="text-end px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-4">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-4 text-muted">Tidak ada data kurikulum.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 fw-semibold">{c.nama_prodi || 'Tidak Diketahui'}</td>
                    <td>{c.tahun_berlaku}</td>
                    <td>
                      {c.status_aktif ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle"><CheckCircle size={12} className="me-1" /> Aktif</span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle"><XCircle size={12} className="me-1" /> Nonaktif</span>
                      )}
                    </td>
                    <td className="text-end px-4">
                      <button className="btn btn-sm btn-outline-primary me-2 rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => openModal(c)}><Edit2 size={14} /></button>
                      <button className="btn btn-sm btn-outline-danger rounded-circle" style={{ width: '32px', height: '32px', padding: 0 }} onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <form className="modal-content border-0 shadow-lg rounded-4" onSubmit={handleSubmit}>
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">{formData.id ? 'Edit Kurikulum' : 'Tambah Kurikulum Baru'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Program Studi</label>
                    <select className="form-select" value={formData.program_id} onChange={e => setFormData({...formData, program_id: e.target.value})} required>
                      <option value="">-- Pilih Program Studi --</option>
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.nama_prodi}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Tahun Berlaku</label>
                    <input type="text" className="form-control" placeholder="Contoh: 2026/2027" 
                           value={formData.tahun_berlaku} onChange={e => setFormData({...formData, tahun_berlaku: e.target.value})} required />
                  </div>
                  <div className="mb-3 form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch" id="statusSwitch" 
                           checked={formData.status_aktif} onChange={e => setFormData({...formData, status_aktif: e.target.checked})} />
                    <label className="form-check-label fw-semibold small" htmlFor="statusSwitch">Kurikulum Aktif</label>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary px-4 fw-bold">{formData.id ? 'Simpan Perubahan' : 'Tambahkan'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
