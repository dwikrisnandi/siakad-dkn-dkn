import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, ArrowLeft, Clock, CheckCircle, AlertCircle, Send, FileText } from 'lucide-react';

export default function MahasiswaUjian() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [view, setView] = useState('list'); // list | exam | result
  const [activeExam, setActiveExam] = useState(null);
  const [examDetail, setExamDetail] = useState(null);
  const [answers, setAnswers] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const timerRef = useRef(null);

  // Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [targetExam, setTargetExam] = useState(null);
  const [tokenError, setTokenError] = useState('');

  const [showKisiModal, setShowKisiModal] = useState(false);
  const [activeKisiExam, setActiveKisiExam] = useState(null);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try { const r = await api.get('/exams/available'); setExams(r.data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openTokenPrompt = (exam) => {
    setTargetExam(exam);
    setTokenInput('');
    setTokenError('');
    setShowTokenModal(true);
  };

  const handleStartExam = async (e) => {
    e?.preventDefault();
    if (!tokenInput.trim()) {
      setTokenError('Token tidak boleh kosong');
      return;
    }

    setIsStarting(true);
    
    // Trik Jeda Acak (Jitter) 0 hingga 3000 ms untuk menyebar beban traffic
    const randomJitter = Math.floor(Math.random() * 3000);
    await new Promise(resolve => setTimeout(resolve, randomJitter));

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen error:', e));
      }
      const startRes = await api.post(`/exam-sessions/${targetExam.id}/start`, { token: tokenInput.trim().toUpperCase() });
      setShowTokenModal(false);
      
      setSessionId(startRes.data.session_id);
      const detailRes = await api.get(`/exams/${targetExam.id}`);
      
      // Mengacak urutan soal secara deterministik (konsisten untuk mahasiswa yang sama jika ter-refresh)
      if (detailRes.data && Array.isArray(detailRes.data.questions)) {
        const questions = [...detailRes.data.questions];
        let seed = user?.id ? user.id + targetExam.id : targetExam.id;
        const random = () => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        detailRes.data.questions = questions;
      }

      setExamDetail(detailRes.data);
      setActiveExam(targetExam);

      // Load saved answers
      const savedRes = await api.get(`/exam-sessions/${targetExam.id}/answers`);
      setAnswers(savedRes.data.answers || {});

      // Start timer
      const durationSec = (targetExam.duration_minutes || 90) * 60;
      setTimeLeft(durationSec);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(targetExam.id, true); return 0; }
          return prev - 1;
        });
      }, 1000);
      setView('exam');
    } catch (e) {
      setTokenError(e.response?.data?.error || 'Gagal memulai ujian');
    } finally {
      setIsStarting(false);
    }
  };

  const viewResult = async (exam) => {
    try {
      const r = await api.get(`/exam-sessions/${exam.id}/result`);
      setResult(r.data);
      setActiveExam(exam);
      setView('result');
    } catch { alert('Gagal mengambil hasil ujian'); }
  };

  const saveAnswer = async (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    try {
      await api.post(`/exam-sessions/${activeExam?.id}/answer`, { question_id: questionId, answer });
    } catch (e) { console.error('Auto-save error:', e); }
  };

  const handleSubmit = async (examId, auto = false) => {
    if (!auto && !window.confirm('Yakin ingin mengumpulkan ujian? Jawaban tidak dapat diubah setelah dikumpulkan.')) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log('Exit fullscreen error:', e));
    }
    setSubmitting(true);
    try {
      const r = await api.post(`/exam-sessions/${examId || activeExam?.id}/submit`);
      await fetchExams();
      const resultRes = await api.get(`/exam-sessions/${examId || activeExam?.id}/result`);
      setResult(resultRes.data);
      setView('result');
    } catch (e) {
      alert(e.response?.data?.error || 'Gagal mengumpulkan ujian');
    } finally { setSubmitting(false); }
  };

  const formatTime = (sec) => {
    if (sec === null) return '--:--';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const typeLabel = { pg: 'PG', true_false: 'B/S', essay: 'Essay' };
  const typeBg = { pg: 'primary', true_false: 'warning', essay: 'success' };

  // ── RESULT VIEW ──
  if (view === 'result' && result) {
    const { session, answers: resAnswers } = result;
    const totalPoints = resAnswers.reduce((a, b) => a + b.points, 0);
    const earned = resAnswers.reduce((a, b) => a + (b.question_type === 'essay' ? (b.essay_score || 0) : (b.points_earned || 0)), 0);
    const essayPending = resAnswers.filter(a => a.question_type === 'essay' && !a.graded_by_dosen).length;

    return (
      <div className="animate-fade-in">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setView('list'); fetchExams(); }}><ArrowLeft size={16} /></button>
          <h3 className="fw-bold mb-0">Hasil Ujian</h3>
        </div>

        <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ borderTop: '4px solid #6366f1' }}>
          <div className="card-body p-4 text-center">
            <div style={{ fontSize: '3rem', fontWeight: 900, color: session.total_score >= 75 ? '#16a34a' : '#dc2626' }}>
              {session.total_score ?? '--'}
            </div>
            <div className="text-muted">Skor Akhir</div>
            {essayPending > 0 && (
              <div className="alert alert-warning mt-3 mb-0 text-start">
                <AlertCircle size={16} className="me-2" />
                <strong>{essayPending} soal essay</strong> belum dinilai oleh dosen. Skor mungkin berubah.
              </div>
            )}
          </div>
        </div>

        {resAnswers.map((a, i) => (
          <div key={a.id} className={`card shadow-sm border-0 rounded-4 mb-3 border-start border-4 ${a.question_type === 'essay' ? 'border-info' : a.is_correct ? 'border-success' : 'border-danger'}`}>
            <div className="card-body p-4">
              <div className="d-flex gap-2 align-items-center mb-2">
                <span className="badge bg-secondary">#{i + 1}</span>
                <span className={`badge bg-${typeBg[a.question_type]}`}>{typeLabel[a.question_type]}</span>
                <span className="badge bg-light text-dark border">{a.points} poin</span>
                {a.question_type !== 'essay' && (a.is_correct
                  ? <span className="badge bg-success ms-auto"><CheckCircle size={12} className="me-1" />Benar ({a.points_earned} poin)</span>
                  : <span className="badge bg-danger ms-auto"><AlertCircle size={12} className="me-1" />Salah (0 poin)</span>)}
                {a.question_type === 'essay' && (
                  <span className={`badge ms-auto ${a.graded_by_dosen ? 'bg-success' : 'bg-warning text-dark'}`}>
                    {a.graded_by_dosen ? `Dinilai: ${a.essay_score} poin` : 'Belum Dinilai'}
                  </span>
                )}
              </div>
              <p className="fw-semibold mb-2">{a.question_text}</p>
              {a.question_type === 'pg' && a.options && (
                <div className="row g-1 mb-2">
                  {a.options.map((opt, oi) => {
                    const ltr = String.fromCharCode(65 + oi);
                    const isMyAnswer = a.answer === ltr;
                    const isCorrect = a.correct_answer === ltr;
                    let cls = 'text-muted';
                    if (isCorrect) cls = 'text-success fw-bold';
                    if (isMyAnswer && !isCorrect) cls = 'text-danger fw-bold text-decoration-line-through';
                    return <div key={oi} className={`col-6 small px-2 py-1 rounded ${cls}`}>{ltr}. {opt}</div>;
                  })}
                </div>
              )}
              <div className="text-muted small">Jawaban Anda: <strong className={a.is_correct ? 'text-success' : a.question_type === 'essay' ? 'text-dark' : 'text-danger'}>{a.answer || '(tidak dijawab)'}</strong>
                {a.question_type !== 'essay' && !a.is_correct && <> | Benar: <strong className="text-success">{a.correct_answer}</strong></>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── EXAM VIEW ──
  if (view === 'exam' && examDetail) {
    const questions = examDetail.questions || [];
    const q = questions[currentQ];
    const answered = Object.keys(answers).filter(k => answers[k]).length;
    const isLowTime = timeLeft !== null && timeLeft < 300;

    return (
      <div className="animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, overflowY: 'auto', backgroundColor: '#f8f9fa', padding: '2rem' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <div className="card-body p-4 text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div><h4 className="fw-bold mb-0">{examDetail.title}</h4><small className="opacity-75">{examDetail.type}</small></div>
              <div className="text-center">
                <div className={`fw-bold fs-3 ${isLowTime ? 'text-warning' : ''}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <Clock size={18} className="me-1" />{formatTime(timeLeft)}
                </div>
                <small className="opacity-75">{answered}/{questions.length} terjawab</small>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Navigation panel */}
          <div className="col-md-3">
            <div className="card shadow-sm border-0 rounded-4 sticky-top" style={{ top: '16px' }}>
              <div className="card-body p-3">
                <p className="small fw-bold text-muted mb-2">Navigasi Soal</p>
                <div className="d-flex flex-wrap gap-1">
                  {questions.map((_, i) => (
                    <button key={i} className={`btn btn-sm fw-bold ${currentQ === i ? 'btn-primary' : answers[questions[i]?.id] ? 'btn-success' : 'btn-outline-secondary'}`}
                      style={{ width: '36px', height: '36px', padding: 0 }} onClick={() => setCurrentQ(i)}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-3 d-flex flex-column gap-1">
                  <small><span className="badge bg-primary me-1">■</span> Sedang Dikerjakan</small>
                  <small><span className="badge bg-success me-1">■</span> Sudah Dijawab</small>
                  <small><span className="badge bg-secondary me-1">■</span> Belum Dijawab</small>
                </div>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="col-md-9">
            {q && (
              <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex gap-2 align-items-center mb-3">
                    <span className="badge bg-secondary fs-6">Soal {currentQ + 1} / {questions.length}</span>
                    <span className={`badge bg-${typeBg[q.question_type]}`}>{typeLabel[q.question_type]}</span>
                    <span className="badge bg-light text-dark border">{q.points} poin</span>
                  </div>
                  <p className="fw-semibold mb-4" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>{q.question_text}</p>

                  {/* PG */}
                  {q.question_type === 'pg' && q.options && (
                    <div className="d-flex flex-column gap-2">
                      {q.options.map((opt, oi) => {
                        const ltr = String.fromCharCode(65 + oi);
                        const selected = answers[q.id] === ltr;
                        return (
                          <button key={oi} className={`btn text-start rounded-3 fw-semibold border ${selected ? 'btn-primary border-primary' : 'btn-light border-secondary-subtle'}`}
                            style={{ padding: '12px 16px' }} onClick={() => saveAnswer(q.id, ltr)}>
                            <span className={`me-3 badge ${selected ? 'bg-white text-primary' : 'bg-secondary-subtle text-dark'}`}>{ltr}</span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* TRUE/FALSE */}
                  {q.question_type === 'true_false' && (
                    <div className="d-flex gap-3">
                      {[['true', '✅ Benar'], ['false', '❌ Salah']].map(([val, lbl]) => (
                        <button key={val} className={`btn rounded-3 fw-bold px-5 py-3 ${answers[q.id] === val ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => saveAnswer(q.id, val)}>{lbl}</button>
                      ))}
                    </div>
                  )}

                  {/* ESSAY */}
                  {q.question_type === 'essay' && (
                    <textarea className="form-control" rows="6" placeholder="Tulis jawaban essay Anda di sini..."
                      value={answers[q.id] || ''}
                      onChange={e => saveAnswer(q.id, e.target.value)}
                      style={{ resize: 'vertical' }} />
                  )}

                  <div className="d-flex justify-content-between mt-4">
                    <button className="btn btn-outline-secondary" onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}>← Sebelumnya</button>
                    {currentQ < questions.length - 1
                      ? <button className="btn btn-primary" onClick={() => setCurrentQ(p => p + 1)}>Selanjutnya →</button>
                      : <button className="btn btn-danger fw-bold px-4" onClick={() => handleSubmit()} disabled={submitting}>
                          <Send size={16} className="me-2" />{submitting ? 'Mengumpulkan...' : 'Kumpulkan Ujian'}
                        </button>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div className="animate-fade-in">
      <h3 className="fw-bold mb-4">Ujian (UTS & UAS)</h3>
      {loading ? <div className="text-center py-5 text-muted">Memuat...</div>
        : exams.length === 0 ? (
          <div className="text-center text-muted py-5"><ClipboardList size={48} className="mb-3 opacity-50" /><h5>Belum ada ujian tersedia</h5></div>
        ) : (
          <div className="row g-3">
            {exams.map(exam => {
              const submitted = exam.is_submitted === 1;
              const now = new Date();
              const start = exam.start_time ? new Date(exam.start_time) : null;
              const end = exam.end_time ? new Date(exam.end_time) : null;
              
              let statusText = 'Siap Dikerjakan';
              let badgeColor = 'bg-primary';
              let canStart = true;
              
              if (start && now < start) {
                statusText = 'Belum Dimulai';
                badgeColor = 'bg-secondary';
                canStart = false;
              } else if (end && now > end) {
                statusText = 'Berakhir';
                badgeColor = 'bg-danger';
                canStart = false;
              }
              
              if (submitted) {
                statusText = 'Sudah Dikumpulkan';
                badgeColor = 'bg-success';
              }

              return (
                <div key={exam.id} className="col-md-6 col-lg-4">
                  <div className="card shadow-sm border-0 rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <span className={`badge ${exam.type === 'UTS' ? 'bg-warning text-dark' : 'bg-danger'}`}>{exam.type}</span>
                        <span className={`badge ${badgeColor}`}>
                          {statusText}
                        </span>
                      </div>
                      <h5 className="fw-bold mb-1">{exam.title}</h5>
                      <p className="text-muted small mb-3">{exam.course_name}</p>
                      <div className="d-flex flex-column gap-2 text-muted small mb-4">
                        <div className="d-flex gap-3">
                          <span>⏱ {exam.duration_minutes} menit</span>
                          {submitted && <span className="text-success fw-bold">Skor: {exam.total_score ?? '-'}</span>}
                        </div>
                        {exam.start_time && exam.end_time && (
                          <div className="text-primary fw-bold">
                            📅 {start.toLocaleString('id-ID', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})} - {end.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-footer bg-transparent border-0 p-4 pt-0">
                      {submitted ? (
                        <button className="btn btn-outline-success w-100 fw-bold" onClick={() => viewResult(exam)}>
                          <CheckCircle size={16} className="me-2" />Lihat Hasil
                        </button>
                      ) : canStart ? (
                        <div className="d-flex flex-column gap-2">
                          <button className="btn btn-primary w-100 fw-bold" onClick={() => openTokenPrompt(exam)}>
                            {exam.session_id ? '▶ Lanjutkan Ujian' : '▶ Mulai Ujian'}
                          </button>
                          {exam.kisi_kisi && (
                            <button className="btn btn-outline-info w-100 fw-bold" onClick={() => { setActiveKisiExam(exam); setShowKisiModal(true); }}>
                              <FileText size={16} className="me-2" />Lihat Kisi-Kisi
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          <button className="btn btn-secondary w-100 fw-bold" disabled>{statusText}</button>
                          {exam.kisi_kisi && (
                            <button className="btn btn-outline-info w-100 fw-bold" onClick={() => { setActiveKisiExam(exam); setShowKisiModal(true); }}>
                              <FileText size={16} className="me-2" />Lihat Kisi-Kisi
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* TOKEN MODAL */}
      {showTokenModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040, backdropFilter: 'blur(4px)' }} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
              <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <div className="modal-header border-0 bg-primary text-white pb-3 pt-4 px-4 d-flex flex-column align-items-center">
                  <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: 50, height: 50 }}>
                    <AlertCircle size={24} />
                  </div>
                  <h5 className="modal-title fw-bold text-center w-100 mb-0">Verifikasi Token</h5>
                </div>
                <div className="modal-body p-4 bg-light">
                  <form onSubmit={handleStartExam}>
                    <p className="text-center text-muted small mb-3">
                      Masukkan token ujian untuk {targetExam?.session_id ? 'melanjutkan' : 'memulai'} <strong className="text-dark">{targetExam?.title}</strong>
                    </p>
                    <div className="mb-3">
                      <input 
                        type="text" 
                        className={`form-control form-control-lg text-center fw-bold fs-4 tracking-widest rounded-3 ${tokenError ? 'is-invalid' : ''}`}
                        placeholder="TOKEN"
                        style={{ textTransform: 'uppercase', letterSpacing: '4px' }}
                        value={tokenInput}
                        onChange={(e) => { setTokenInput(e.target.value.toUpperCase()); setTokenError(''); }}
                        autoFocus
                      />
                      {tokenError && <div className="invalid-feedback text-center mt-2">{tokenError}</div>}
                    </div>
                    <button type="submit" className="btn btn-primary w-100 fw-bold py-2 rounded-3 shadow-sm" disabled={isStarting}>
                      {isStarting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Menyiapkan Soal...
                        </>
                      ) : (
                        'Verifikasi & Masuk'
                      )}
                    </button>
                    {!isStarting && (
                      <button type="button" className="btn btn-link text-muted text-decoration-none w-100 mt-2 small" onClick={() => setShowTokenModal(false)}>
                        Batal
                      </button>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

        {/* KISI KISI MODAL */}
        {showKisiModal && activeKisiExam && (
          <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
            <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
              <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content border-0 shadow">
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold">Kisi-Kisi Ujian: {activeKisiExam.title}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowKisiModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="alert alert-info border-0 bg-info bg-opacity-10 text-info mb-3">
                      <strong>Pelajari kisi-kisi berikut</strong> sebelum mulai mengerjakan ujian.
                    </div>
                    <div className="table-responsive" dangerouslySetInnerHTML={{ __html: activeKisiExam.kisi_kisi }} />
                  </div>
                  <div className="modal-footer border-0">
                    <button type="button" className="btn btn-primary px-4" onClick={() => setShowKisiModal(false)}>Tutup</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
  );
}
