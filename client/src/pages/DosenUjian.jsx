import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Plus, Trash2, Eye, ArrowLeft, ToggleLeft, ToggleRight, CheckCircle, XCircle, Edit3, Database, Sparkles, Download, FileText, Users, ShieldAlert } from 'lucide-react';

const EMPTY_EXAM = { title: '', type: 'UTS', description: '', start_time: '', end_time: '', duration_minutes: 90 };
const EMPTY_Q = { question_type: 'pg', question_text: '', options: ['', '', '', ''], correct_answer: '', points: 10 };

export default function DosenUjian() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [exams, setExams] = useState([]);
  const [view, setView] = useState('list'); // list | manage | results
  const [activeExam, setActiveExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQModal, setShowQModal] = useState(false);
  const [examForm, setExamForm] = useState(EMPTY_EXAM);
  const [editExamId, setEditExamId] = useState(null);
  const [essayScores, setEssayScores] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingEssay, setSavingEssay] = useState({});
  const [gradingAI, setGradingAI] = useState({});
  const [aiFeedbacks, setAiFeedbacks] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [showKisiModal, setShowKisiModal] = useState(false);
  const [generatingKisi, setGeneratingKisi] = useState(false);
  
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankIds, setSelectedBankIds] = useState([]);
  const [importingBank, setImportingBank] = useState(false);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    api.get('/schedules').then(r => setSchedules(r.data.filter(s => s.dosen_id === user.id))).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    if (!selectedSchedule) return;
    fetchExams();
  }, [selectedSchedule]);

  const fetchExams = async () => {
    setLoading(true);
    try { const r = await api.get(`/exams/schedule/${selectedSchedule}`); setExams(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openManage = async (exam) => {
    setActiveExam(exam);
    const r = await api.get(`/exams/${exam.id}`);
    setQuestions(r.data.questions || []);
    setView('manage');
  };

  const openStudents = async (exam) => {
    setActiveExam(exam);
    setLoading(true);
    try {
      const [rStud, rRes] = await Promise.all([
        api.get(`/exams/${exam.id}/students`),
        api.get(`/exams/${exam.id}/results`)
      ]);
      setStudents(rStud.data || []);
      setResults(rRes.data);
      setView('students');
    } catch (e) {
      alert('Gagal mengambil daftar peserta & hasil');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (student) => {
    try {
      const newBlocked = student.is_blocked ? 0 : 1;
      await api.post(`/exams/${activeExam.id}/blocks`, { mahasiswa_id: student.id, is_blocked: newBlocked });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, is_blocked: newBlocked } : s));
    } catch (e) {
      alert('Gagal mengubah status blokir');
    }
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...examForm, schedule_id: parseInt(selectedSchedule) };
      if (editExamId) { await api.put(`/exams/${editExamId}`, payload); }
      else { await api.post('/exams', payload); }
      setShowExamModal(false); setEditExamId(null); setExamForm(EMPTY_EXAM);
      fetchExams();
    } catch { alert('Gagal menyimpan ujian'); }
  };

  const handleToggle = async (exam) => {
    await api.patch(`/exams/${exam.id}/toggle`);
    fetchExams();
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Hapus ujian beserta semua soal & jawaban?')) return;
    await api.delete(`/exams/${id}`); fetchExams();
  };

  const handleSaveEssay = async (answerId) => {
    setSavingEssay(p => ({ ...p, [answerId]: true }));
    try {
      await api.put(`/exam-answers/${answerId}/score`, { essay_score: essayScores[answerId] });
      const r = await api.get(`/exams/${activeExam.id}/results`);
      setResults(r.data);
    } catch { alert('Gagal menyimpan nilai essay'); }
    finally { setSavingEssay(p => ({ ...p, [answerId]: false })); }
  };

  const handleAIGrade = async (answer) => {
    setGradingAI(p => ({ ...p, [answer.id]: true }));
    try {
      const res = await api.post('/ai-grade-essay', {
        question_text: answer.question_text,
        correct_answer: answer.correct_answer,
        student_answer: answer.answer,
        max_points: answer.points
      });
      setEssayScores(p => ({ ...p, [answer.id]: res.data.skor }));
      setAiFeedbacks(p => ({ ...p, [answer.id]: res.data.feedback }));
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal koreksi AI');
    } finally {
      setGradingAI(p => ({ ...p, [answer.id]: false }));
    }
  };

  const openBankModal = async () => {
    try {
      const r = await api.get(`/question-bank/schedule/${activeExam.schedule_id}`);
      setBankQuestions(r.data);
      const currentBankIds = questions.filter(q => q.bank_id).map(q => q.bank_id);
      setSelectedBankIds(currentBankIds);
      setShowBankModal(true);
    } catch { alert('Gagal memuat daftar soal bank'); }
  };

  const handleDownloadDocx = () => {
    window.open(`/api/exams/${activeExam.id}/export-docx?token=${localStorage.getItem('token')}`, '_blank');
  };

  const handleGenerateKisi = async () => {
    setGeneratingKisi(true);
    try {
      const res = await api.post('/ai-generate-kisi', { exam_id: activeExam.id });
      setActiveExam({ ...activeExam, kisi_kisi: res.data.kisi_kisi });
      const ex = exams.map(e => e.id === activeExam.id ? { ...e, kisi_kisi: res.data.kisi_kisi } : e);
      setExams(ex);
      alert('Kisi-kisi berhasil di-generate!');
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal generate kisi-kisi');
    } finally {
      setGeneratingKisi(false);
    }
  };

  const handleImportBank = async () => {
    if (selectedBankIds.length === 0) return alert('Pilih minimal 1 soal');
    setImportingBank(true);
    try {
      await api.post(`/exams/${activeExam.id}/import-from-bank`, { question_ids: selectedBankIds });
      setShowBankModal(false);
      const r = await api.get(`/exams/${activeExam.id}`);
      setQuestions(r.data.questions || []);
      alert('Berhasil sinkronisasi soal dengan Bank Soal!');
    } catch { alert('Gagal sinkronisasi soal'); }
    finally { setImportingBank(false); }
  };

  const openEditExam = (exam) => {
    setEditExamId(exam.id);
    const toLocal = (ts) => {
      if (!ts) return '';
      try { const d = new Date(ts); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); } catch { return ''; }
    };
    setExamForm({ title: exam.title, type: exam.type, description: exam.description || '', start_time: toLocal(exam.start_time), end_time: toLocal(exam.end_time), duration_minutes: exam.duration_minutes || 90, is_active: exam.is_active });
    setShowExamModal(true);
  };

  const handleDeleteQ = async (id) => {
    if (!window.confirm('Hapus soal ini dari ujian?')) return;
    await api.delete(`/exam-questions/${id}`);
    const r = await api.get(`/exams/${activeExam.id}`);
    setQuestions(r.data.questions || []);
  };

  const typeLabel = { pg: 'Pilihan Ganda', true_false: 'Benar/Salah', essay: 'Essay' };
  const typeBadge = { pg: 'primary', true_false: 'warning', essay: 'success' };

  // ── STUDENTS & RESULTS VIEW ──
  if (view === 'students') return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setView('list')}><ArrowLeft size={16} /></button>
        <div><h3 className="fw-bold mb-0">Peserta & Hasil Ujian</h3><small className="text-muted">{activeExam?.title}</small></div>
      </div>
      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3">Nama Mahasiswa</th>
                <th className="py-3 text-center">Blokir</th>
                <th className="py-3 text-center">Status / Skor</th>
                <th className="px-4 py-3 text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted py-4">Tidak ada mahasiswa yang terdaftar di kelas ini</td></tr>
              ) : students.map(s => {
                const session = results?.sessions?.find(res => res.mahasiswa_id === s.id);
                let essayAnswers = [];
                let essayGraded = 0;
                if (session) {
                  essayAnswers = session.answers.filter(a => a.question_type === 'essay');
                  essayGraded = essayAnswers.filter(a => a.graded_by_dosen).length;
                }

                return (
                  <React.Fragment key={s.id}>
                    <tr className={s.is_blocked ? 'table-danger' : ''}>
                      <td className="px-4 py-3">
                        <div className="fw-bold">{s.name}</div>
                        <div className="small text-muted">{s.nim}</div>
                      </td>
                      <td className="py-3 text-center">
                        <button 
                          className={`btn btn-sm fw-bold ${s.is_blocked ? 'btn-success' : 'btn-outline-danger'}`}
                          onClick={() => handleToggleBlock(s)}
                        >
                          {s.is_blocked ? 'Buka Blokir' : 'Blokir'}
                        </button>
                      </td>
                      <td className="py-3 text-center">
                        {!session ? (
                          <span className="badge bg-secondary">Belum Mulai</span>
                        ) : !session.is_submitted ? (
                          <span className="badge bg-warning text-dark">Mengerjakan</span>
                        ) : (
                          <div className="fw-bold text-primary" style={{ fontSize: '1.2rem' }}>{session.total_score ?? '-'}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          {session && (
                            <>
                              <button 
                                className="btn btn-sm btn-outline-warning text-dark fw-bold"
                                onClick={async () => {
                                  if (!window.confirm('Yakin ingin membuka kembali ujian untuk mahasiswa ini? Waktu akan berlanjut dan nilai sementara akan di-reset.')) return;
                                  try {
                                    await api.post(`/exam-sessions/${session.id}/reopen`);
                                    alert('Ujian berhasil dibuka kembali.');
                                    openStudents(activeExam); // Refresh
                                  } catch (e) {
                                    alert('Gagal membuka kembali ujian');
                                  }
                                }}
                              >
                                Buka Kembali
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setOpenDropdowns(p => ({ ...p, [s.id]: !p[s.id] }))}
                              >
                                {openDropdowns[s.id] ? 'Tutup Jawaban' : `Koreksi Essay (${essayGraded}/${essayAnswers.length})`}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {openDropdowns[s.id] && session && (
                      <tr>
                        <td colSpan="4" className="p-0 border-0">
                          <div className="bg-light px-4 py-4 border-bottom shadow-inner">
                            {essayAnswers.length === 0 ? (
                              <div className="text-center text-muted small py-3">Tidak ada soal essay untuk mahasiswa ini.</div>
                            ) : essayAnswers.map((a, i) => (
                              <div key={a.id} className="p-3 rounded-3 mb-3 border bg-white shadow-sm">
                                <div className="d-flex gap-2 align-items-start mb-2">
                                  <span className="badge bg-secondary">{i + 1}</span>
                                  <span className="badge bg-success">Essay</span>
                                  <small className="text-muted flex-grow-1">{a.question_text}</small>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                  <div className="p-2 bg-light rounded border small">
                                    <span className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>Jawaban Mahasiswa:</span>
                                    <strong className="text-dark">{a.answer || '-'}</strong>
                                  </div>
                                  <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                                    <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => handleAIGrade(a)} disabled={gradingAI[a.id]}>
                                      {gradingAI[a.id] ? <span className="spinner-border spinner-border-sm" /> : <Sparkles size={14} />} Koreksi AI
                                    </button>
                                    <div className="ms-auto d-flex align-items-center gap-2 bg-white border p-1 rounded-3">
                                      <input type="number" className="form-control form-control-sm text-center border-0 fw-bold" style={{ width: '60px', backgroundColor: 'transparent' }} min="0" max={a.points} placeholder={`0-${a.points}`}
                                        value={essayScores[a.id] !== undefined ? essayScores[a.id] : (a.essay_score ?? '')}
                                        onChange={ev => setEssayScores(p => ({ ...p, [a.id]: ev.target.value }))} />
                                      <span className="text-muted small fw-bold">/ {a.points}</span>
                                      <button className="btn btn-sm btn-success ms-2 rounded-2" onClick={() => handleSaveEssay(a.id)} disabled={savingEssay[a.id]}>
                                        {savingEssay[a.id] ? '...' : 'Simpan'}
                                      </button>
                                    </div>
                                    {a.graded_by_dosen ? <span className="badge bg-success">Sudah Dinilai</span> : <span className="badge bg-warning text-dark">Belum Dinilai</span>}
                                  </div>
                                  {aiFeedbacks[a.id] && <div className="w-100 mt-2 p-2 rounded bg-primary bg-opacity-10 border border-primary border-opacity-25 text-primary small fst-italic">🤖 AI Feedback: {aiFeedbacks[a.id]}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ── MANAGE QUESTIONS VIEW ──
  if (view === 'manage') return (
    <div className="animate-fade-in">
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setView('list')}><ArrowLeft size={16} /></button>
        <div className="flex-grow-1"><h3 className="fw-bold mb-0">Kelola Soal</h3><small className="text-muted">{activeExam?.title} — {activeExam?.type}</small></div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-success d-flex align-items-center gap-2" onClick={handleDownloadDocx}>
            <Download size={16} /> Download Soal (Word)
          </button>
          <button className="btn btn-outline-info d-flex align-items-center gap-2" onClick={() => setShowKisiModal(true)}>
            <FileText size={16} /> Kisi-kisi Ujian
          </button>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openBankModal}>
            <Database size={16} /> Ambil dari Bank Soal
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center text-muted py-5"><ClipboardList size={48} className="mb-3 opacity-50" /><h5>Belum ada soal</h5></div>
      ) : questions.map((q, i) => (
        <div key={q.id} className="card shadow-sm border-0 rounded-4 mb-3">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div className="flex-grow-1">
                <div className="d-flex gap-2 align-items-center mb-2">
                  <span className="badge bg-secondary">#{i + 1}</span>
                  <span className={`badge bg-${typeBadge[q.question_type]}`}>{typeLabel[q.question_type]}</span>
                  <span className="badge bg-light text-dark border">{q.points} poin</span>
                </div>
                <p className="fw-semibold mb-2">{q.question_text}</p>
                {q.question_type === 'pg' && q.options && (
                  <div className="row g-1">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="col-6">
                        <span className={`d-block small px-2 py-1 rounded ${String.fromCharCode(65+oi) === q.correct_answer ? 'bg-success text-white fw-bold' : 'text-muted'}`}>
                          {String.fromCharCode(65+oi)}. {opt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {q.question_type === 'true_false' && (
                  <small className="text-muted">Jawaban benar: <strong className="text-success">{q.correct_answer === 'true' ? 'Benar' : 'Salah'}</strong></small>
                )}
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteQ(q.id)}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* BANK SOAL MODAL */}
      {showBankModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Ambil dari Bank Soal</h5>
                  <button type="button" className="btn-close" onClick={() => !importingBank && setShowBankModal(false)}></button>
                </div>
                <div className="modal-body">
                  {bankQuestions.length === 0 ? (
                    <div className="text-center text-muted py-5"><h5>Belum ada soal di Bank Soal untuk matakuliah ini</h5></div>
                  ) : (
                    <div className="row g-2">
                      <div className="col-12 mb-2 d-flex justify-content-between align-items-center">
                        <span className="text-muted fw-bold">{selectedBankIds.length} / {bankQuestions.length} Terpilih</span>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedBankIds(selectedBankIds.length === bankQuestions.length ? [] : bankQuestions.map(q => q.id))}>
                          {selectedBankIds.length === bankQuestions.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                        </button>
                      </div>
                      {bankQuestions.map((q, i) => (
                        <div key={q.id} className="col-12">
                          <label className="card border-0 shadow-sm rounded-3 w-100" style={{ cursor: 'pointer' }}>
                            <div className="card-body d-flex align-items-start gap-3">
                              <input className="form-check-input mt-1" type="checkbox" style={{ transform: 'scale(1.2)' }}
                                checked={selectedBankIds.includes(q.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedBankIds(prev => [...prev, q.id]);
                                  else setSelectedBankIds(prev => prev.filter(id => id !== q.id));
                                }} />
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <span className="badge bg-secondary">Paket: {q.paket_name}</span>
                                  <span className={`badge bg-${typeBadge[q.question_type]}`}>{typeLabel[q.question_type]}</span>
                                </div>
                                <p className="mb-0 fw-semibold">{q.question_text}</p>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0 pt-0 mt-3">
                  <button type="button" className="btn btn-light" onClick={() => setShowBankModal(false)} disabled={importingBank}>Batal</button>
                  <button type="button" className="btn btn-primary fw-bold" onClick={handleImportBank} disabled={importingBank}>
                    {importingBank ? 'Menyimpan...' : `Simpan ${selectedBankIds.length} Soal`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* KISI-KISI MODAL */}
      {showKisiModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Kisi-Kisi Ujian: {activeExam?.title}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowKisiModal(false)}></button>
                </div>
                <div className="modal-body">
                  {activeExam?.kisi_kisi ? (
                    <div className="table-responsive" dangerouslySetInnerHTML={{ __html: activeExam.kisi_kisi }} />
                  ) : (
                    <div className="text-center text-muted py-4">
                      <FileText size={48} className="mb-3 opacity-50" />
                      <p>Belum ada kisi-kisi untuk ujian ini.</p>
                      <p className="small">Klik tombol di bawah untuk generate otomatis dengan AI.</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-0">
                  <button type="button" className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={handleGenerateKisi} disabled={generatingKisi}>
                    {generatingKisi ? <><span className="spinner-border spinner-border-sm" /> Generating...</> : <><Sparkles size={16} /> {activeExam?.kisi_kisi ? 'Generate Ulang' : 'Generate dengan AI'}</>}
                  </button>
                  <button type="button" className="btn btn-primary px-4" onClick={() => setShowKisiModal(false)}>Tutup</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );

  // ── MAIN LIST VIEW ──
  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">Kelola Ujian (UTS & UAS)</h3>
        {selectedSchedule && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={() => { setEditExamId(null); setExamForm(EMPTY_EXAM); setShowExamModal(true); }}>
            <Plus size={18} /> Buat Ujian
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
        loading ? <div className="text-center text-muted py-4">Memuat...</div>
        : exams.length === 0 ? (
          <div className="text-center text-muted py-5"><ClipboardList size={48} className="mb-3 opacity-50" /><h5>Belum ada ujian</h5></div>
        ) : (
          <div className="row g-3">
            {exams.map(exam => (
              <div key={exam.id} className="col-md-6">
                <div className="card shadow-sm border-0 rounded-4 h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span className={`badge ${exam.type === 'UTS' ? 'bg-warning text-dark' : 'bg-danger'} mb-2`}>{exam.type}</span>
                        <h5 className="fw-bold mb-1">{exam.title}</h5>
                        <p className="text-muted small mb-0">{exam.description}</p>
                      </div>
                      <span className={`badge ${exam.is_active ? 'bg-success' : 'bg-secondary'}`}>{exam.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </div>
                    <div className="d-flex flex-wrap gap-3 text-muted small mb-4">
                      <span className={exam.total_questions === 0 ? "text-danger fw-bold" : "text-success fw-bold"}>
                        {exam.total_questions === 0 ? "⚠️ 0 Soal (Kosong)" : `📝 ${exam.total_questions} Soal Tersedia`}
                      </span>
                      <span>👥 {exam.total_submitted} dikumpulkan</span>
                      <span>⏱ {exam.duration_minutes} menit</span>
                      {exam.token && <span className="fw-bold text-primary">🔑 Token: {exam.token}</span>}
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <button className="btn btn-sm btn-outline-warning text-dark" onClick={() => openStudents(exam)}><Users size={14} className="me-1" />Peserta & Hasil</button>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => openManage(exam)}><Edit3 size={14} className="me-1" />Kelola Soal</button>
                      <button className={`btn btn-sm ${exam.is_active ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => handleToggle(exam)}>
                        {exam.is_active ? <ToggleRight size={14} className="me-1" /> : <ToggleLeft size={14} className="me-1" />}
                        {exam.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditExam(exam)}><Edit3 size={14} /></button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteExam(exam.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* EXAM MODAL */}
      {showExamModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold">{editExamId ? 'Edit Ujian' : 'Buat Ujian Baru'}</h5>
                  <button className="btn-close" onClick={() => setShowExamModal(false)} />
                </div>
                <div className="modal-body">
                  <form onSubmit={handleSaveExam}>
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted">Jenis Ujian</label>
                      <select className="form-select" value={examForm.type} onChange={e => setExamForm({ ...examForm, type: e.target.value })}>
                        <option value="UTS">UTS (Ujian Tengah Semester)</option>
                        <option value="UAS">UAS (Ujian Akhir Semester)</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted">Judul Ujian</label>
                      <input type="text" className="form-control" required value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} placeholder="Contoh: UTS Pemrograman Web" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted">Keterangan (opsional)</label>
                      <textarea className="form-control" rows="2" value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} />
                    </div>
                    <div className="row g-2 mb-3">
                      <div className="col">
                        <label className="form-label fw-bold small text-muted">Waktu Mulai</label>
                        <input type="datetime-local" className="form-control" value={examForm.start_time} onChange={e => setExamForm({ ...examForm, start_time: e.target.value })} />
                      </div>
                      <div className="col">
                        <label className="form-label fw-bold small text-muted">Waktu Selesai</label>
                        <input type="datetime-local" className="form-control" value={examForm.end_time} onChange={e => setExamForm({ ...examForm, end_time: e.target.value })} />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted">Durasi Pengerjaan (menit)</label>
                      <input type="number" className="form-control" min="10" max="300" value={examForm.duration_minutes} onChange={e => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) || 90 })} />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-light" onClick={() => setShowExamModal(false)}>Batal</button>
                      <button type="submit" className="btn btn-primary px-4">{editExamId ? 'Simpan' : 'Buat Ujian'}</button>
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
