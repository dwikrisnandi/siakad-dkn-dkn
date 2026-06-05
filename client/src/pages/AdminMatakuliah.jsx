import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function AdminMatakuliah() {
  const [courses, setCourses] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ code: '', name: '', sks: '', semester: '', curriculum_id: '' });
  const [editFormData, setEditFormData] = useState({ id: '', code: '', name: '', sks: '', semester: '', curriculum_id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCourses = async () => {
    try {
      const [resCourses, resCurr] = await Promise.all([
        api.get('/courses'),
        api.get('/curriculums')
      ]);
      setCourses(resCourses.data);
      setCurriculums(resCurr.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      await api.post('/courses', formData);
      setShowModal(false);
      setFormData({ code: '', name: '', sks: '', semester: '', curriculum_id: '' });
      setSuccess('Matakuliah berhasil ditambahkan');
      fetchCourses();
    } catch (err) {
      setError('Gagal menyimpan matakuliah');
    }
  };

  const openEditModal = (course) => {
    setEditFormData({
      id: course.id,
      code: course.code,
      name: course.name,
      sks: course.sks,
      semester: course.semester,
      curriculum_id: course.curriculum_id || ''
    });
    setShowEditModal(true);
    setError(''); setSuccess('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    try {
      await api.put(`/courses/${editFormData.id}`, editFormData);
      setShowEditModal(false);
      setSuccess('Matakuliah berhasil diupdate');
      fetchCourses();
    } catch (err) {
      setError('Gagal mengupdate matakuliah');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus matakuliah ini? Semua jadwal dan absen terkait dapat terhapus.')) {
      setError(''); setSuccess('');
      try {
        await api.delete(`/courses/${id}`);
        setSuccess('Matakuliah berhasil dihapus');
        fetchCourses();
      } catch (err) {
        setError('Gagal menghapus matakuliah');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Manajemen Matakuliah</h3>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Tambah Matakuliah
        </button>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm border-0 rounded-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="ps-4 py-3">Kode MK</th>
                  <th className="py-3">Nama Matakuliah</th>
                  <th className="py-3 text-center">SKS</th>
                  <th className="py-3 text-center">Semester</th>
                  <th className="py-3">Kurikulum</th>
                  <th className="pe-4 py-3 text-end">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-4">Memuat data...</td></tr>
                ) : courses.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">Belum ada data matakuliah</td></tr>
                ) : (
                  courses.map((course, idx) => (
                    <tr key={idx}>
                      <td className="ps-4 fw-semibold">{course.code}</td>
                      <td>{course.name}</td>
                      <td className="text-center">{course.sks}</td>
                      <td className="text-center">{course.semester}</td>
                      <td>
                        {course.curriculum_name ? (
                          <div>
                            <div className="fw-semibold small">{course.nama_prodi}</div>
                            <div className="text-muted" style={{fontSize: '0.75rem'}}>{course.curriculum_name}</div>
                          </div>
                        ) : <span className="text-muted small">Belum diplot</span>}
                      </td>
                      <td className="pe-4 text-end">
                        <button className="btn btn-sm btn-light text-primary me-2" onClick={() => openEditModal(course)} title="Edit Matakuliah">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-sm btn-light text-danger" onClick={() => handleDelete(course.id)} title="Hapus Matakuliah">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Basic Bootstrap Modal implementation using state map */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Tambah Matakuliah</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Kode Matakuliah</label>
                      <input type="text" className="form-control" required 
                             value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Nama Matakuliah</label>
                      <input type="text" className="form-control" required
                             value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Kurikulum & Prodi</label>
                      <select className="form-select" required value={formData.curriculum_id} onChange={e => setFormData({...formData, curriculum_id: e.target.value})}>
                        <option value="">-- Pilih Kurikulum --</option>
                        {curriculums.map(c => (
                          <option key={c.id} value={c.id}>{c.nama_prodi} - Tahun {c.tahun_berlaku} {c.status_aktif ? '(Aktif)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">SKS</label>
                        <input type="number" className="form-control" min="1" max="6" required 
                               value={formData.sks} onChange={e => setFormData({...formData, sks: parseInt(e.target.value)})} />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">Semester</label>
                        <input type="number" className="form-control" min="1" max="8" required
                               value={formData.semester} onChange={e => setFormData({...formData, semester: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-bottom-0 pb-0">
                  <h5 className="modal-title fw-bold">Edit Matakuliah</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <form onSubmit={handleEditSubmit}>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Kode Matakuliah</label>
                      <input type="text" className="form-control" required 
                             value={editFormData.code} onChange={e => setEditFormData({...editFormData, code: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Nama Matakuliah</label>
                      <input type="text" className="form-control" required
                             value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-bold">Kurikulum & Prodi</label>
                      <select className="form-select" required value={editFormData.curriculum_id} onChange={e => setEditFormData({...editFormData, curriculum_id: e.target.value})}>
                        <option value="">-- Pilih Kurikulum --</option>
                        {curriculums.map(c => (
                          <option key={c.id} value={c.id}>{c.nama_prodi} - Tahun {c.tahun_berlaku} {c.status_aktif ? '(Aktif)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">SKS</label>
                        <input type="number" className="form-control" min="1" max="6" required 
                               value={editFormData.sks} onChange={e => setEditFormData({...editFormData, sks: parseInt(e.target.value)})} />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted small fw-bold">Semester</label>
                        <input type="number" className="form-control" min="1" max="8" required
                               value={editFormData.semester} onChange={e => setEditFormData({...editFormData, semester: parseInt(e.target.value)})} />
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2 mt-4">
                      <button type="button" className="btn btn-light" onClick={() => setShowEditModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">Simpan Perubahan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
