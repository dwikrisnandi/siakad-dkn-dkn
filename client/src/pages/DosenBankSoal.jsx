import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Plus, Trash2, Edit3, Sparkles, ArrowLeft, Database, Folder } from 'lucide-react';

const EMPTY_Q = { question_type: 'pg', question_text: '', options: ['', '', '', ''], correct_answer: '', points: 10 };
const typeLabel = { 'pg': 'Pilihan Ganda', 'true_false': 'Benar/Salah', 'essay': 'Essay' };
const typeBadge = { 'pg': 'primary', 'true_false': 'warning text-dark', 'essay': 'danger' };

export default function DosenBankSoal() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  
  const [view, setView] = useState('pakets'); // pakets | manage
  const [pakets, setPakets] = useState([]);
  const [activePaket, setActivePaket] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showPaketModal, setShowPaketModal] = useState(false);
  const [newPaketName, setNewPaketName] = useState('');
  
  const [showQModal, setShowQModal] = useState(false);
  const [qForm, setQForm] = useState(EMPTY_Q);
  const [editQId, setEditQId] = useState(null);
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ pgCount: 5, tfCount: 3, essayCount: 2 });
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    api.get('/schedules').then(r => setSchedules(r.data.filter(s => s.dosen_id === user.id))).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    if (!selectedSchedule) {
      setPakets([]);
      return;
    }
    fetchPakets();
    setView('pakets');
  }, [selectedSchedule]);

  const fetchPakets = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/question-bank/schedule/${selectedSchedule}/pakets`);
      setPakets(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchQuestions = async (paketName) => {
    setLoading(true);
    try {
      const r = await api.get(`/question-bank/schedule/${selectedSchedule}?paket=${paketName}`);
      setQuestions(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openManagePaket = (paketName) => {
    setActivePaket(paketName);
    fetchQuestions(paketName);
    setView('manage');
  };

  const handleCreatePaket = (e) => {
    e.preventDefault();
    if (!newPaketName.trim()) return;
    openManagePaket(newPaketName);
    setShowPaketModal(false);
    setNewPaketName('');
  };

  const handleSaveQ = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...qForm,
        schedule_id: parseInt(selectedSchedule),
        paket_name: activePaket,
        options: qForm.question_type === 'pg' ? qForm.options : null,
        correct_answer: qForm.question_type === 'essay' ? null : qForm.correct_answer,
      };
      if (editQId) {
        await api.put(`/question-bank/${editQId}`, payload);
      } else {
        await api.post('/question-bank', payload);
      }
      setShowQModal(false); setQForm(EMPTY_Q); setEditQId(null);
      fetchQuestions(activePaket);
    } catch { alert('Gagal menyimpan soal ke bank'); }
  };

  const openEditQ = (q) => {
    setEditQId(q.id);
    setQForm({
      question_type: q.question_type,
      question_text: q.question_text,
      options: q.options || ['', '', '', ''],
      correct_answer: q.correct_answer || '',
      points: q.points || 10
    });
    setShowQModal(true);
  };

  const handleDeleteQ = async (id) => {
    if (!window.confirm('Hapus soal ini dari Bank Soal?')) return;
    await api.delete(`/question-bank/${id}`);
    fetchQuestions(activePaket);
  };

  const handleDeletePaket = async (paketName) => {
    if (!window.confirm(`Hapus paket "${paketName}" beserta SEMUA soal di dalamnya secara permanen?`)) return;
    try {
      await api.delete(`/question-bank/schedule/${selectedSchedule}/paket/${paketName}`);
      fetchPakets();
    } catch { alert('Gagal menghapus paket soal'); }
  };

  const handleGenerateAi = async (e) => {
    e.preventDefault();
    setGeneratingAi(true);
    try {
      const res = await api.post('/ai-generate-exam', {
        schedule_id: parseInt(selectedSchedule),
        ...aiForm
      });
      const generatedQuestions = res.data;
      
      let count = 0;
      for (const q of generatedQuestions) {
        await api.post('/question-bank', {
          schedule_id: parseInt(selectedSchedule),
          paket_name: activePaket,
          question_type: q.question_type,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.question_type === 'essay' ? 20 : 10
        });
        count++;
      }
      setShowAiModal(false);
      fetchQuestions(activePaket);
      alert(`Berhasil generate & menyimpan ${count} soal ke Paket ${activePaket}!`);
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal generate soal AI');
    } finally {
      setGeneratingAi(false);
    }
  };

  if (view === 'manage') {
    return (
      <div className="animate-fade-in">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setView('pakets'); fetchPakets(); }}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex-grow-1">
            <h3 className="fw-bold mb-0">Kelola Soal</h3>
            <small className="text-muted">Paket: {activePaket}</small>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={() => setShowAiModal(true)}>
              <Sparkles size={16} /> Generate Soal AI
            </button>
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => { setEditQId(null); setQForm(EMPTY_Q); setShowQModal(true); }}>
              <Plus size={16} /> Tambah Soal Manual
            </button>
          </div>
        </div>

        {loading ? <div className="text-center text-muted py-4">Memuat soal...</div>
        : questions.length === 0 ? (
          <div className="text-center text-muted py-5"><ClipboardList size={48} className="mb-3 opacity-50" /><h5>Paket ini belum memiliki soal</h5></div>
        ) : (
          <div className="row g-3">
            {questions.map((q, i) => (
              <div key={q.id} className="col-12">
                <div className="card shadow-sm border-0 rounded-4">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div className="flex-grow-1">
                        <div className="d-flex gap-2 align-items-center mb-2">
                          <span className="badge bg-secondary">#{questions.length - i}</span>
                          <span className={`badge bg-${typeBadge[q.question_type]}`}>{typeLabel[q.question_type]}</span>
                          <span className="badge bg-light text-dark border">{q.points} poin</span>
                        </div>
                        <p className="fw-semibold mb-2">{q.question_text}</p>
                        {q.question_type === 'pg' && q.options && (
                          <div className="row g-1">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="col-6">
                                <div className={`p-2 border rounded-3 small ${q.correct_answer === ['A','B','C','D'][oi] ? 'bg-success text-white border-success' : 'bg-light'}`}>
                                  <strong className="me-2">{'ABCD'[oi]}.</strong> {opt}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.question_type === 'true_false' && (
                          <div className="d-flex gap-2 mt-2">
                            <span className={`badge ${q.correct_answer === 'true' ? 'bg-success' : 'bg-light text-dark border'}`}>Benar</span>
                            <span className={`badge ${q.correct_answer === 'false' ? 'bg-success' : 'bg-light text-dark border'}`}>Salah</span>
                          </div>
                        )}
                      </div>
                      <div className="d-flex flex-column gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditQ(q)} title="Edit Soal"><Edit3 size={16} /></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteQ(q.id)} title="Hapus Soal"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODALS for Manage View */}
        {showQModal && (
          <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
              <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <div className="modal-header border-0 pb-0"><h5 className="modal-title fw-bold">{editQId ? 'Edit Soal' : `Tambah Soal ke ${activePaket}`}</h5><button type="button" className="btn-close" onClick={() => setShowQModal(false)}></button></div>
                  <div className="modal-body">
                    <form id="qForm" onSubmit={handleSaveQ}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-bold">Tipe Soal</label>
                          <select className="form-select" value={qForm.question_type} onChange={e => setQForm({ ...qForm, question_type: e.target.value })}>
                            <option value="pg">Pilihan Ganda</option>
                            <option value="true_false">Benar/Salah</option>
                            <option value="essay">Essay</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-bold">Poin Soal</label>
                          <input type="number" className="form-control" value={qForm.points} onChange={e => setQForm({ ...qForm, points: parseInt(e.target.value) })} required />
                        </div>
                        <div className="col-12">
                          <label className="form-label small fw-bold">Pertanyaan</label>
                          <textarea className="form-control" rows="3" value={qForm.question_text} onChange={e => setQForm({ ...qForm, question_text: e.target.value })} required />
                        </div>
                        {qForm.question_type === 'pg' && (
                          <>
                            <div className="col-12"><label className="form-label small fw-bold">Pilihan Jawaban</label>
                              <div className="row g-2">
                                {qForm.options.map((opt, i) => (
                                  <div key={i} className="col-md-6 d-flex align-items-center gap-2">
                                    <span className="fw-bold text-muted">{'ABCD'[i]}</span>
                                    <input type="text" className="form-control form-control-sm" value={opt} onChange={e => { const no = [...qForm.options]; no[i] = e.target.value; setQForm({ ...qForm, options: no }); }} required />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="col-12">
                              <label className="form-label small fw-bold">Jawaban Benar</label>
                              <select className="form-select w-25" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required>
                                <option value="">-- Pilih --</option>{['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </>
                        )}
                        {qForm.question_type === 'true_false' && (
                          <div className="col-12">
                            <label className="form-label small fw-bold">Jawaban Benar</label>
                            <select className="form-select w-25" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required>
                              <option value="">-- Pilih --</option><option value="true">Benar</option><option value="false">Salah</option>
                            </select>
                          </div>
                        )}
                        {qForm.question_type === 'essay' && (
                          <div className="col-12">
                            <label className="form-label small fw-bold">Kunci Jawaban Benar <span className="text-muted fw-normal">(Opsional, untuk patokan koreksi AI)</span></label>
                            <textarea className="form-control" rows="3" value={qForm.correct_answer || ''} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} placeholder="Masukkan jawaban ideal. AI akan membandingkan jawaban mahasiswa dengan kunci jawaban ini." />
                          </div>
                        )}
                      </div>
                    </form>
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-light" onClick={() => setShowQModal(false)}>Batal</button>
                    <button type="submit" form="qForm" className="btn btn-primary fw-bold">{editQId ? 'Simpan Perubahan' : 'Simpan ke Paket'}</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {showAiModal && (
          <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold">Generate Soal dengan AI</h5>
                    <button type="button" className="btn-close" onClick={() => !generatingAi && setShowAiModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    <form id="aiForm" onSubmit={handleGenerateAi}>
                      <p className="text-muted small">AI akan membaca materi dan membuat soal langsung ke dalam paket: <strong>{activePaket}</strong></p>
                      <div className="row g-3">
                        <div className="col-4">
                          <label className="form-label small fw-bold">Pilihan Ganda</label>
                          <input type="number" className="form-control" min="0" max="50" value={aiForm.pgCount} onChange={e => setAiForm({ ...aiForm, pgCount: parseInt(e.target.value) || 0 })} disabled={generatingAi} />
                        </div>
                        <div className="col-4">
                          <label className="form-label small fw-bold">Benar / Salah</label>
                          <input type="number" className="form-control" min="0" max="20" value={aiForm.tfCount} onChange={e => setAiForm({ ...aiForm, tfCount: parseInt(e.target.value) || 0 })} disabled={generatingAi} />
                        </div>
                        <div className="col-4">
                          <label className="form-label small fw-bold">Essay</label>
                          <input type="number" className="form-control" min="0" max="10" value={aiForm.essayCount} onChange={e => setAiForm({ ...aiForm, essayCount: parseInt(e.target.value) || 0 })} disabled={generatingAi} />
                        </div>
                      </div>
                    </form>
                  </div>
                  <div className="modal-footer border-0 pt-0 mt-3">
                    <button type="button" className="btn btn-light" onClick={() => !generatingAi && setShowAiModal(false)} disabled={generatingAi}>Batal</button>
                    <button type="submit" form="aiForm" className="btn btn-primary fw-bold" disabled={generatingAi}>
                      {generatingAi ? (<span><span className="spinner-border spinner-border-sm me-2" />Generating...</span>) : (<span>✨ Generate Soal</span>)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // LIST PAKET VIEW
  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-0">Bank Soal Terpusat</h3>
          <p className="text-muted mb-0">Kelola paket soal untuk digunakan ulang di berbagai ujian</p>
        </div>
        {selectedSchedule && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => setShowPaketModal(true)}>
            <Plus size={16} /> Buat Paket Baru
          </button>
        )}
      </div>

      <div className="card shadow-sm border-0 rounded-4 mb-4">
        <div className="card-body p-4">
          <label className="form-label fw-bold small text-muted">Pilih Matakuliah / Kelas</label>
          <select className="form-select w-50" value={selectedSchedule} onChange={e => setSelectedSchedule(e.target.value)}>
            <option value="">-- Pilih Kelas --</option>
            {schedules.map(s => <option key={s.id} value={s.id}>{s.course_code} - {s.course_name} ({s.class_name})</option>)}
          </select>
        </div>
      </div>

      {selectedSchedule && (
        loading ? <div className="text-center text-muted py-4">Memuat paket soal...</div>
        : pakets.length === 0 ? (
          <div className="text-center text-muted py-5"><Folder size={48} className="mb-3 opacity-50" /><h5>Belum ada paket soal untuk kelas ini</h5></div>
        ) : (
          <div className="row g-3">
            {pakets.map((p, i) => (
              <div key={i} className="col-md-6">
                <div className="card shadow-sm border-0 rounded-4 h-100 hover-elevate">
                  <div className="card-body p-4 text-center">
                    <Folder size={32} className="text-primary mb-3" />
                    <h5 className="fw-bold mb-1">{p.paket_name}</h5>
                    <p className="text-muted small mb-3">{p.total_questions} Soal Tersimpan</p>
                    <div className="d-flex gap-2 w-100 mt-2">
                      <button className="btn btn-outline-primary btn-sm flex-grow-1" onClick={() => openManagePaket(p.paket_name)}>
                        Kelola Soal
                      </button>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeletePaket(p.paket_name)} title="Hapus Paket">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* CREATE PAKET MODAL */}
      {showPaketModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Buat Paket Soal Baru</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPaketModal(false)}></button>
                </div>
                <div className="modal-body">
                  <form id="paketForm" onSubmit={handleCreatePaket}>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Nama Paket</label>
                      <input type="text" className="form-control" value={newPaketName} onChange={e => setNewPaketName(e.target.value)} placeholder="Contoh: Paket UTS Susulan A" required />
                      <div className="form-text">Paket akan otomatis tersimpan saat Anda menambahkan soal pertama.</div>
                    </div>
                  </form>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowPaketModal(false)}>Batal</button>
                  <button type="submit" form="paketForm" className="btn btn-primary fw-bold">Mulai Kelola Soal</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
