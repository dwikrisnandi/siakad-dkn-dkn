import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FileText, Upload, Trash2, Link as LinkIcon, Loader, Copy, CheckCircle } from 'lucide-react';

export default function DosenBKD() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form Upload
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Pendidikan');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState(null);

  const fetchDocs = async () => {
    try {
      const res = await api.get('/bkd/documents/me');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return alert('Judul dan file wajib diisi');
    
    const formData = new FormData();
    formData.append('category', category);
    formData.append('title', title);
    formData.append('file', file);

    setUploading(true);
    try {
      await api.post('/bkd/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Dokumen berhasil diunggah');
      setShowForm(false);
      setTitle('');
      setFile(null);
      fetchDocs();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal upload dokumen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus dokumen ini?')) return;
    try {
      await api.delete(`/bkd/documents/${id}`);
      fetchDocs();
    } catch (err) {
      alert('Gagal hapus dokumen');
    }
  };

  const handleCopyLink = (url, id) => {
    // Generate full URL
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return <div className="text-center py-5"><Loader className="spin" size={32} /> Memuat data BKD...</div>;

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold text-dark mb-0"><FileText size={28} className="me-2 text-primary" /> Repository BKD & SISTER</h3>
        <button className="btn btn-primary rounded-pill fw-bold shadow-sm" onClick={() => setShowForm(!showForm)}>
          <Upload size={18} className="me-2" /> Upload Dokumen
        </button>
      </div>

      <div className="alert alert-info rounded-4 border-0 shadow-sm p-4 mb-4">
        <h5 className="fw-bold mb-2">Penyimpanan Terpusat Tri Dharma</h5>
        <p className="mb-0">
          Simpan seluruh bukti kinerja Pendidikan, Penelitian, dan Pengabdian Anda di sini. 
          Gunakan tombol <strong>Salin Link</strong> untuk mendapatkan URL publik (tanpa password) yang dapat langsung di-<em>paste</em> ke dalam isian web <strong>SISTER Kemdikbud</strong>.
        </p>
      </div>

      {showForm && (
        <div className="card shadow-sm border-0 rounded-4 mb-4 animate-fade-in">
          <div className="card-header bg-white border-bottom p-4"><h6 className="fw-bold mb-0">Upload Dokumen Baru</h6></div>
          <div className="card-body p-4">
            <form onSubmit={handleUpload}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label fw-bold">Kategori</label>
                  <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="Pendidikan">Pendidikan / Pengajaran</option>
                    <option value="Penelitian">Penelitian / Publikasi</option>
                    <option value="Pengabdian">Pengabdian Masyarakat</option>
                    <option value="Penunjang">Penunjang / SK Tugas</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-bold">Judul / Nama Dokumen</label>
                  <input type="text" className="form-control" placeholder="Misal: SK Mengajar Sem Ganjil 2026" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">File (PDF/Image)</label>
                  <input type="file" className="form-control" onChange={e => setFile(e.target.files[0])} accept=".pdf,image/*" required />
                </div>
              </div>
              <div className="text-end mt-4">
                <button type="button" className="btn btn-light rounded-pill me-2 px-4" onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={uploading}>
                  {uploading ? 'Mengunggah...' : 'Simpan Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0 rounded-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4">Kategori</th>
                <th>Judul Dokumen</th>
                <th>Tanggal Upload</th>
                <th className="pe-4 text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(d => (
                <tr key={d.id}>
                  <td className="px-4">
                    <span className={`badge ${d.category==='Pendidikan'?'bg-primary':d.category==='Penelitian'?'bg-success':d.category==='Pengabdian'?'bg-warning text-dark':'bg-secondary'}`}>
                      {d.category}
                    </span>
                  </td>
                  <td className="fw-semibold">{d.title}</td>
                  <td>{new Date(d.uploaded_at).toLocaleDateString('id-ID')}</td>
                  <td className="pe-4 text-end">
                    <button 
                      className="btn btn-sm btn-outline-primary rounded-pill me-2" 
                      onClick={() => handleCopyLink(d.file_url, d.id)}
                      title="Salin URL Publik untuk SISTER"
                    >
                      {copiedId === d.id ? <CheckCircle size={16} className="text-success" /> : <LinkIcon size={16} />} 
                      <span className="ms-1">{copiedId === d.id ? 'Tersalin!' : 'Copy Link'}</span>
                    </button>
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-light text-primary rounded-pill me-2">Lihat</a>
                    <button className="btn btn-sm btn-light text-danger rounded-pill" onClick={() => handleDelete(d.id)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr><td colSpan="4" className="text-center py-5 text-muted">Belum ada dokumen yang diunggah.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
