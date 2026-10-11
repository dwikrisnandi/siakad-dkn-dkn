import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  GraduationCap, UserCheck, Calendar, CreditCard, FileText, CheckCircle2, 
  AlertCircle, Upload, LogIn, UserPlus, LogOut, Phone, Mail, Award, ArrowRight
} from 'lucide-react';
import './index.css';

// Konfigurasi Base API (otomatis menyesuaikan bila dijalankan standalone)
const API_BASE = window.location.port === '5174' ? 'http://localhost:7542/api/pmb' : '/api/pmb';

export default function App() {
  const [view, setView] = useState('home'); // 'home', 'register', 'login', 'dashboard'
  const [info, setInfo] = useState({ tenant: {}, jalur: [], prodi: [] });
  const [token, setToken] = useState(localStorage.getItem('pmb_token') || '');
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Form states
  const [regForm, setRegForm] = useState({
    nama_lengkap: '', nik: '', email: '', no_hp: '', password: '',
    jalur_id: '', prodi_pilihan_1: '', prodi_pilihan_2: '',
    tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: 'Laki-laki', asal_sekolah: ''
  });

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [uploadFile, setUploadFile] = useState(null);
  const [jenisBerkas, setJenisBerkas] = useState('ijazah');

  // Load Info Publik Kampus & Jalur
  useEffect(() => {
    fetchInfo();
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchInfo = async () => {
    try {
      const res = await axios.get(`${API_BASE}/info`);
      setInfo(res.data);
      if (res.data.jalur.length > 0 && !regForm.jalur_id) {
        setRegForm(prev => ({ ...prev, jalur_id: res.data.jalur[0].id }));
      }
      if (res.data.prodi.length > 0 && !regForm.prodi_pilihan_1) {
        setRegForm(prev => ({ 
          ...prev, 
          prodi_pilihan_1: res.data.prodi[0].id,
          prodi_pilihan_2: res.data.prodi.length > 1 ? res.data.prodi[1].id : res.data.prodi[0].id
        }));
      }
    } catch (e) {
      console.error('Fetch info error:', e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data.pendaftar);
      setProfileData(res.data);
      setView('dashboard');
    } catch {
      handleLogout();
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/register`, regForm);
      localStorage.setItem('pmb_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.pendaftar);
      alert('Pendaftaran akun berhasil! Selamat datang.');
      fetchProfile();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await axios.post(`${API_BASE}/login`, loginForm);
      localStorage.setItem('pmb_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.pendaftar);
      fetchProfile();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pmb_token');
    setToken('');
    setUser(null);
    setProfileData(null);
    setView('home');
  };

  const handleUploadBerkas = async (e) => {
    e.preventDefault();
    if (!uploadFile) return alert('Pilih file berkas terlebih dahulu');
    const formData = new FormData();
    formData.append('berkas', uploadFile);
    formData.append('jenis_berkas', jenisBerkas);

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/upload-berkas`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Berkas berhasil diunggah!');
      setUploadFile(null);
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal mengunggah berkas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 px-4 shadow-sm border-bottom border-secondary border-opacity-25">
        <div className="container-fluid max-w-7xl">
          <div className="d-flex align-items-center gap-2" role="button" onClick={() => setView('home')}>
            <GraduationCap className="text-primary" size={32} />
            <div>
              <span className="fs-5 fw-bold text-white d-block lh-1">PMB ONLINE</span>
              <small className="text-secondary" style={{ fontSize: '11px' }}>
                {info.tenant?.name || 'Sistem Penerimaan Mahasiswa Baru'}
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {token && user ? (
              <>
                <button 
                  className={`btn btn-sm ${view === 'dashboard' ? 'btn-primary' : 'btn-outline-light'}`}
                  onClick={() => setView('dashboard')}
                >
                  Dashboard ({user.nama_lengkap?.split(' ')[0]})
                </button>
                <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" onClick={handleLogout}>
                  <LogOut size={16} /> Keluar
                </button>
              </>
            ) : (
              <>
                <button 
                  className={`btn btn-sm ${view === 'home' ? 'btn-light' : 'btn-outline-light'}`}
                  onClick={() => setView('home')}
                >
                  Beranda
                </button>
                <button 
                  className={`btn btn-sm ${view === 'login' ? 'btn-light' : 'btn-outline-light'} d-flex align-items-center gap-1`}
                  onClick={() => { setView('login'); setMessage(''); }}
                >
                  <LogIn size={16} /> Masuk
                </button>
                <button 
                  className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                  onClick={() => { setView('register'); setMessage(''); }}
                >
                  <UserPlus size={16} /> Daftar Sekarang
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* CONTENT AREA */}
      <div className="flex-grow-1">
        {/* VIEW: HOME (LANDING PAGE) */}
        {view === 'home' && (
          <div>
            {/* HERO SECTION */}
            <header className="gradient-header py-5 px-3 text-center">
              <div className="container py-4" style={{ maxWidth: '800px' }}>
                <span className="badge badge-soft-primary px-3 py-2 rounded-pill fw-bold mb-3">
                  Tahun Akademik 2026/2027
                </span>
                <h1 className="display-5 fw-extrabold mb-3">
                  Penerimaan Mahasiswa Baru <br />
                  <span className="text-info">{info.tenant?.name || 'Kampus Digital Modern'}</span>
                </h1>
                <p className="lead text-light text-opacity-75 mb-4">
                  Daftarkan diri Anda secara online dari mana saja. Nikmati proses seleksi cepat, transparan, dan terintegrasi langsung dengan sistem akademik resmi.
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <button className="btn btn-accent btn-lg px-4 py-2 rounded-pill" onClick={() => setView('register')}>
                    Daftar Sekarang <ArrowRight size={18} className="ms-1" />
                  </button>
                  <button className="btn btn-outline-light btn-lg px-4 py-2 rounded-pill" onClick={() => setView('login')}>
                    Portal Pendaftar
                  </button>
                </div>
              </div>
            </header>

            {/* JALUR PENDAFTARAN & PROGRAM STUDI */}
            <div className="container py-5" style={{ maxWidth: '1100px' }}>
              <div className="row g-4">
                {/* Jalur Pendaftaran */}
                <div className="col-lg-6">
                  <div className="card-glass p-4 h-100">
                    <h4 className="fw-bold d-flex align-items-center gap-2 mb-3">
                      <Calendar className="text-primary" /> Jalur Pendaftaran Aktif
                    </h4>
                    {info.jalur.length === 0 ? (
                      <p className="text-muted">Belum ada jalur pendaftaran dibuka.</p>
                    ) : (
                      info.jalur.map(j => (
                        <div key={j.id} className="p-3 mb-3 bg-light rounded border border-secondary border-opacity-10">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h5 className="fw-bold mb-1">{j.nama_jalur}</h5>
                              <span className="badge bg-success mb-2">Gelombang {j.gelombang}</span>
                            </div>
                            <div className="text-end">
                              <span className="text-muted small d-block">Biaya Formulir</span>
                              <strong className="text-primary fs-5">
                                Rp {parseInt(j.biaya_pendaftaran, 10).toLocaleString('id-ID')}
                              </strong>
                            </div>
                          </div>
                          <div className="text-muted small mt-2">
                            Periode: {new Date(j.tgl_buka).toLocaleDateString('id-ID')} s.d. {new Date(j.tgl_tutup).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Program Studi Pilihan */}
                <div className="col-lg-6">
                  <div className="card-glass p-4 h-100">
                    <h4 className="fw-bold d-flex align-items-center gap-2 mb-3">
                      <Award className="text-primary" /> Program Studi Pilihan
                    </h4>
                    {info.prodi.length === 0 ? (
                      <p className="text-muted">Daftar program studi belum dimuat.</p>
                    ) : (
                      info.prodi.map(p => (
                        <div key={p.id} className="p-3 mb-2 bg-light rounded d-flex justify-content-between align-items-center border border-secondary border-opacity-10">
                          <div>
                            <strong className="d-block">{p.nama_prodi}</strong>
                            <small className="text-muted">Fakultas: {p.fakultas || 'Umum'} (Kode: {p.kode_prodi})</small>
                          </div>
                          <span className="badge bg-primary">S1 Reguler</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: REGISTER */}
        {view === 'register' && (
          <div className="container py-5" style={{ maxWidth: '650px' }}>
            <div className="card-glass p-4 p-md-5">
              <h3 className="fw-bold text-center mb-1">Pendaftaran Akun Baru</h3>
              <p className="text-muted text-center small mb-4">Isi data calon mahasiswa untuk mendapatkan Nomor Registrasi PMB.</p>

              {message && <div className="alert alert-danger py-2">{message}</div>}

              <form onSubmit={handleRegister}>
                <div className="mb-3">
                  <label className="form-label fw-bold small">Nama Lengkap Sesuai KTP/Ijazah</label>
                  <input 
                    type="text" className="form-control" required
                    value={regForm.nama_lengkap} 
                    onChange={e => setRegForm({...regForm, nama_lengkap: e.target.value})} 
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">NIK (Nomor Induk Kependudukan)</label>
                    <input 
                      type="text" className="form-control" required
                      value={regForm.nik} 
                      onChange={e => setRegForm({...regForm, nik: e.target.value})} 
                      placeholder="16 digit NIK"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Nomor WhatsApp / HP</label>
                    <input 
                      type="tel" className="form-control" required
                      value={regForm.no_hp} 
                      onChange={e => setRegForm({...regForm, no_hp: e.target.value})} 
                      placeholder="0812xxxxxxxx"
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Email Aktif</label>
                    <input 
                      type="email" className="form-control" required
                      value={regForm.email} 
                      onChange={e => setRegForm({...regForm, email: e.target.value})} 
                      placeholder="email@anda.com"
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Kata Sandi (Password)</label>
                    <input 
                      type="password" className="form-control" required
                      value={regForm.password} 
                      onChange={e => setRegForm({...regForm, password: e.target.value})} 
                      placeholder="Minimal 6 karakter"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold small">Jalur Pendaftaran</label>
                  <select 
                    className="form-select" required
                    value={regForm.jalur_id}
                    onChange={e => setRegForm({...regForm, jalur_id: e.target.value})}
                  >
                    {info.jalur.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.nama_jalur} (Rp {parseInt(j.biaya_pendaftaran, 10).toLocaleString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row g-2 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Pilihan Program Studi 1</label>
                    <select 
                      className="form-select" required
                      value={regForm.prodi_pilihan_1}
                      onChange={e => setRegForm({...regForm, prodi_pilihan_1: e.target.value})}
                    >
                      {info.prodi.map(p => (
                        <option key={p.id} value={p.id}>{p.nama_prodi}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold small">Pilihan Program Studi 2</label>
                    <select 
                      className="form-select"
                      value={regForm.prodi_pilihan_2}
                      onChange={e => setRegForm({...regForm, prodi_pilihan_2: e.target.value})}
                    >
                      {info.prodi.map(p => (
                        <option key={p.id} value={p.id}>{p.nama_prodi}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn btn-accent w-100 py-2 rounded-pill" disabled={loading}>
                  {loading ? 'Memproses...' : 'Daftar Sekarang'}
                </button>

                <p className="text-center small text-muted mt-3 mb-0">
                  Sudah memiliki akun? <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); }}>Masuk di sini</a>
                </p>
              </form>
            </div>
          </div>
        )}

        {/* VIEW: LOGIN */}
        {view === 'login' && (
          <div className="container py-5" style={{ maxWidth: '450px' }}>
            <div className="card-glass p-4 p-md-5">
              <h3 className="fw-bold text-center mb-1">Masuk Portal PMB</h3>
              <p className="text-muted text-center small mb-4">Silakan masuk menggunakan Email atau Nomor Pendaftaran Anda.</p>

              {message && <div className="alert alert-danger py-2">{message}</div>}

              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label className="form-label fw-bold small">Email / No Pendaftaran</label>
                  <input 
                    type="text" className="form-control" required
                    value={loginForm.identifier}
                    onChange={e => setLoginForm({...loginForm, identifier: e.target.value})}
                    placeholder="email@domain.com atau PMB-2026-..."
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label fw-bold small">Kata Sandi</label>
                  <input 
                    type="password" className="form-control" required
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    placeholder="••••••••"
                  />
                </div>

                <button type="submit" className="btn btn-accent w-100 py-2 rounded-pill" disabled={loading}>
                  {loading ? 'Memverifikasi...' : 'Masuk'}
                </button>

                <p className="text-center small text-muted mt-3 mb-0">
                  Belum punya akun pendaftar? <a href="#" onClick={(e) => { e.preventDefault(); setView('register'); }}>Daftar sekarang</a>
                </p>
              </form>
            </div>
          </div>
        )}

        {/* VIEW: DASHBOARD PENDAFTAR */}
        {view === 'dashboard' && profileData && (
          <div className="container py-4" style={{ maxWidth: '1000px' }}>
            {/* Header Profil Pendaftar */}
            <div className="card-glass p-4 mb-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <span className="badge badge-soft-primary px-3 py-1 rounded-pill fw-bold mb-2">
                    {profileData.pendaftar.no_pendaftaran}
                  </span>
                  <h3 className="fw-bold mb-1">{profileData.pendaftar.nama_lengkap}</h3>
                  <div className="text-muted small d-flex flex-wrap gap-3">
                    <span><Mail size={14} className="me-1" /> {profileData.pendaftar.email}</span>
                    <span><Phone size={14} className="me-1" /> {profileData.pendaftar.no_hp}</span>
                    <span>Jalur: <strong>{profileData.pendaftar.nama_jalur || '-'}</strong></span>
                  </div>
                </div>
                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                  <div className="p-2 rounded bg-light border d-inline-block text-start">
                    <small className="text-muted d-block" style={{ fontSize: '11px' }}>Status Kelulusan</small>
                    {profileData.pendaftar.status_kelulusan === 'passed' && (
                      <span className="badge badge-soft-success fw-bold fs-6">LULUS / DITERIMA</span>
                    )}
                    {profileData.pendaftar.status_kelulusan === 'failed' && (
                      <span className="badge badge-soft-danger fw-bold fs-6">TIDAK LULUS</span>
                    )}
                    {profileData.pendaftar.status_kelulusan === 'pending' && (
                      <span className="badge badge-soft-warning fw-bold fs-6">DALAM PROSES SELEKSI</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Status Alur Pendaftaran */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card-glass p-3 h-100">
                  <div className="d-flex align-items-center gap-3">
                    <div className="step-indicator bg-primary text-white">1</div>
                    <div>
                      <small className="text-muted d-block">Pendaftaran Akun</small>
                      <strong className="text-success d-flex align-items-center gap-1">
                        <CheckCircle2 size={16} /> Lengkap
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card-glass p-3 h-100">
                  <div className="d-flex align-items-center gap-3">
                    <div className="step-indicator bg-secondary text-white">2</div>
                    <div>
                      <small className="text-muted d-block">Pembayaran Formulir</small>
                      <strong className={profileData.pendaftar.status_pembayaran === 'paid' ? 'text-success' : 'text-warning'}>
                        {profileData.pendaftar.status_pembayaran === 'paid' ? 'Lunas' : 'Menunggu / Belum Lunas'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card-glass p-3 h-100">
                  <div className="d-flex align-items-center gap-3">
                    <div className="step-indicator bg-secondary text-white">3</div>
                    <div>
                      <small className="text-muted d-block">Verifikasi Berkas</small>
                      <strong className="text-info">
                        {profileData.berkas.length} Berkas Diunggah
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Berkas Section */}
            <div className="card-glass p-4 mb-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <Upload size={20} className="text-primary" /> Unggah Dokumen Persyaratan
              </h5>

              <form onSubmit={handleUploadBerkas} className="row g-2 align-items-center mb-4">
                <div className="col-md-4">
                  <select 
                    className="form-select form-select-sm"
                    value={jenisBerkas}
                    onChange={e => setJenisBerkas(e.target.value)}
                  >
                    <option value="ijazah">Ijazah / SKL (PDF/JPG)</option>
                    <option value="ktp">KTP / Kartu Pelajar</option>
                    <option value="kk">Kartu Keluarga (KK)</option>
                    <option value="pas_foto">Pas Foto Formal</option>
                    <option value="rapor">Rapor Semester Terakhir</option>
                    <option value="sertifikat">Sertifikat Prestasi (Opsional)</option>
                  </select>
                </div>
                <div className="col-md-5">
                  <input 
                    type="file" className="form-control form-control-sm" required
                    onChange={e => setUploadFile(e.target.files[0])}
                  />
                </div>
                <div className="col-md-3">
                  <button type="submit" className="btn btn-sm btn-primary w-100" disabled={loading}>
                    {loading ? 'Mengunggah...' : 'Upload Dokumen'}
                  </button>
                </div>
              </form>

              {/* Tabel Berkas yang sudah diupload */}
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr className="table-light">
                      <th>Jenis Dokumen</th>
                      <th>Waktu Upload</th>
                      <th>Status Verifikasi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.berkas.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-3">
                          Belum ada dokumen yang diunggah. Silakan unggah dokumen persyaratan di atas.
                        </td>
                      </tr>
                    ) : (
                      profileData.berkas.map(b => (
                        <tr key={b.id}>
                          <td className="fw-semibold text-uppercase">{b.jenis_berkas.replace('_', ' ')}</td>
                          <td className="text-muted small">{new Date(b.uploaded_at).toLocaleString('id-ID')}</td>
                          <td>
                            <span className={`badge ${b.status_verifikasi === 'valid' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {b.status_verifikasi}
                            </span>
                          </td>
                          <td>
                            <a 
                              href={b.file_url.startsWith('http') ? b.file_url : `http://localhost:7542${b.file_url}`} 
                              target="_blank" rel="noreferrer" 
                              className="btn btn-xs btn-outline-primary"
                              style={{ fontSize: '12px' }}
                            >
                              Lihat File
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Program Studi Pilihan Card */}
            <div className="card-glass p-4">
              <h5 className="fw-bold mb-3">Pilihan Program Studi Terdaftar</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 bg-light rounded border">
                    <small className="text-muted d-block">Pilihan 1 (Utama)</small>
                    <strong className="fs-6 text-primary">{profileData.pendaftar.nama_prodi_1 || 'Belum dipilih'}</strong>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 bg-light rounded border">
                    <small className="text-muted d-block">Pilihan 2 (Alternatif)</small>
                    <strong className="fs-6 text-secondary">{profileData.pendaftar.nama_prodi_2 || 'Belum dipilih'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-dark text-secondary py-3 text-center border-top border-secondary border-opacity-25 mt-auto">
        <div className="container">
          <small>
            &copy; 2026 {info.tenant?.name || 'Sistem PMB'}. Terintegrasi dengan SIAKAD Cloud.
          </small>
        </div>
      </footer>
    </div>
  );
}
