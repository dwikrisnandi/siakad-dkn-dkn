import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, ArrowLeft, Clock, CheckCircle, AlertCircle, Send, FileText, WifiOff, Wifi, HardDrive } from 'lucide-react';
import { getCachedExam, getAllCachedExams, removeCachedExam, cacheExamData } from '../utils/examCache';

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

  // Online/Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | synced | error
  const pendingQueueRef = useRef([]);
  const syncingRef = useRef(false);
  const [offlineMode, setOfflineMode] = useState(false); // true when exam started from cache
  const [cachedExams, setCachedExams] = useState([]); // exams available from IndexedDB cache

  // Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [targetExam, setTargetExam] = useState(null);
  const [tokenError, setTokenError] = useState('');

  const [showKisiModal, setShowKisiModal] = useState(false);
  const [activeKisiExam, setActiveKisiExam] = useState(null);

  // ── LOCAL STORAGE HELPERS ──
  const LS_KEY_PREFIX = 'siakad_exam_answers_';
  const getLocalAnswers = (examId) => {
    try {
      const data = localStorage.getItem(LS_KEY_PREFIX + examId);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  };
  const setLocalAnswers = (examId, answersObj) => {
    try {
      localStorage.setItem(LS_KEY_PREFIX + examId, JSON.stringify(answersObj));
    } catch (e) { console.error('localStorage save error:', e); }
  };
  const getPendingQueue = (examId) => {
    try {
      const data = localStorage.getItem(LS_KEY_PREFIX + examId + '_pending');
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };
  const setPendingQueue = (examId, queue) => {
    try {
      localStorage.setItem(LS_KEY_PREFIX + examId + '_pending', JSON.stringify(queue));
    } catch (e) { console.error('localStorage pending save error:', e); }
  };
  const clearLocalExamData = (examId) => {
    try {
      localStorage.removeItem(LS_KEY_PREFIX + examId);
      localStorage.removeItem(LS_KEY_PREFIX + examId + '_pending');
    } catch (e) { console.error('localStorage clear error:', e); }
  };

  // ── SYNC PENDING ANSWERS TO SERVER ──
  const syncPendingAnswers = useCallback(async (examId) => {
    const eid = examId || activeExam?.id;
    if (!eid || syncingRef.current) return;
    const queue = getPendingQueue(eid);
    if (queue.length === 0) return;

    syncingRef.current = true;
    setSyncStatus('syncing');
    const failedQueue = [];

    for (const item of queue) {
      try {
        await api.post(`/exam-sessions/${eid}/answer`, { question_id: item.question_id, answer: item.answer });
      } catch (e) {
        console.error('Sync error for question', item.question_id, e);
        failedQueue.push(item);
      }
    }

    setPendingQueue(eid, failedQueue);
    pendingQueueRef.current = failedQueue;
    syncingRef.current = false;
    setSyncStatus(failedQueue.length > 0 ? 'error' : 'synced');

    if (failedQueue.length === 0) {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  }, [activeExam]);

  // ── SYNC DEFERRED SUBMISSIONS ──
  const syncDeferredSubmissions = async () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('siakad_deferred_submit_')) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key));
        const eid = data.exam_id;
        if (!eid) continue;

        // Ensure session exists
        const cachedExam = await getCachedExam(eid);
        try {
          await api.post(`/exam-sessions/${eid}/start`, { token: cachedExam?.token || '' });
        } catch (e) { /* session might already exist */ }

        // Sync all answers
        const answers = data.answers || getLocalAnswers(eid);
        for (const [qid, ans] of Object.entries(answers)) {
          try {
            await api.post(`/exam-sessions/${eid}/answer`, { question_id: parseInt(qid), answer: ans });
          } catch (e) { console.error('Deferred sync error for q', qid, e); }
        }

        // Submit
        await api.post(`/exam-sessions/${eid}/submit`);
        // Cleanup
        clearLocalExamData(eid);
        removeCachedExam(eid).catch(() => {});
        localStorage.removeItem(key);
        console.log('✅ Deferred submission synced for exam', eid);
      } catch (e) {
        console.error('Failed to sync deferred submission:', key, e);
      }
    }
  };

  useEffect(() => {
    fetchExams();
    loadCachedExams();
    // Auto-sync deferred submissions on mount if online
    if (navigator.onLine) syncDeferredSubmissions();
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── ONLINE/OFFLINE LISTENER ──
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync pending answers when back online
      if (activeExam?.id) {
        syncPendingAnswers(activeExam.id);
      }
      // If in offline exam mode and now back online, try to create session + sync all answers
      if (offlineMode && activeExam?.id) {
        (async () => {
          try {
            // Create session on server
            const cachedExam = await getCachedExam(activeExam.id);
            await api.post(`/exam-sessions/${activeExam.id}/start`, { token: cachedExam?.token || '' });
            // Sync all localStorage answers as pending
            const localAnswers = getLocalAnswers(activeExam.id);
            const allPending = Object.entries(localAnswers).map(([qid, ans]) => ({ question_id: parseInt(qid), answer: ans }));
            setPendingQueue(activeExam.id, allPending);
            pendingQueueRef.current = allPending;
            setOfflineMode(false);
            syncPendingAnswers(activeExam.id);
          } catch (e) {
            console.error('Failed to sync offline exam session:', e);
          }
        })();
      }
      // Auto-sync any deferred submissions
      syncDeferredSubmissions();
      // Refresh exam list
      fetchExams();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeExam, syncPendingAnswers, offlineMode]);

  const loadCachedExams = async () => {
    try {
      const cached = await getAllCachedExams();
      setCachedExams(cached);
    } catch (e) { console.error('Failed to load cached exams:', e); }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const r = await api.get('/exams/available');
        setExams(r.data);
        // ── PRE-CACHE: silently cache all active exams in background ──
        preCacheExams(r.data);
      } else {
        // Offline: show cached exams as available
        const cached = await getAllCachedExams();
        setCachedExams(cached);
        setExams(cached.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          description: c.description,
          duration_minutes: c.duration_minutes,
          start_time: c.start_time,
          end_time: c.end_time,
          course_name: c.course_name,
          is_submitted: 0,
          _fromCache: true
        })));
      }
    } catch (e) {
      console.error(e);
      // If server unreachable, fall back to cache
      const cached = await getAllCachedExams();
      if (cached.length > 0) {
        setCachedExams(cached);
        setExams(cached.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          description: c.description,
          duration_minutes: c.duration_minutes,
          start_time: c.start_time,
          end_time: c.end_time,
          course_name: c.course_name,
          is_submitted: 0,
          _fromCache: true
        })));
      }
    } finally { setLoading(false); }
  };

  // ── PRE-CACHE ALL ACTIVE EXAMS IN BACKGROUND ──
  // Saat mahasiswa buka halaman ujian, semua soal ujian yang aktif
  // (walaupun belum waktunya) akan otomatis di-download dan di-cache.
  // Jadi saat jadwal tiba, soal sudah ada di perangkat.
  const preCacheExams = async (examList) => {
    if (!navigator.onLine || !examList || examList.length === 0) return;
    const currentCached = await getAllCachedExams();
    const cachedIds = currentCached.map(c => c.id);

    for (const exam of examList) {
      // Skip if already submitted
      if (exam.is_submitted === 1) continue;
      try {
        const detailRes = await api.get(`/exams/${exam.id}`);
        if (detailRes.data && Array.isArray(detailRes.data.questions)) {
          await cacheExamData({
            ...detailRes.data,
            token: exam.token || '',
            duration_minutes: exam.duration_minutes || detailRes.data.duration_minutes || 90,
            course_name: exam.course_name || '',
            course_code: exam.course_code || ''
          });
          console.log(`✅ Pre-cached exam: ${exam.title} (ID: ${exam.id})`);
        }
      } catch (e) {
        console.warn(`⚠️ Failed to pre-cache exam ${exam.id}:`, e.message);
      }
    }
    // Refresh cached exams state after pre-caching
    loadCachedExams();
  };

  const openTokenPrompt = (exam) => {
    setTargetExam(exam);
    setTokenInput('');
    setTokenError('');
    setShowTokenModal(true);
  };

  // ── Deterministic shuffle helper ──
  const shuffleQuestions = (questions, examId) => {
    const shuffled = [...questions];
    let seed = user?.id ? user.id + examId : examId;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // First, map and shuffle options inside each PG question
    for (let i = 0; i < shuffled.length; i++) {
      const q = shuffled[i];
      if (q.question_type === 'pg' && Array.isArray(q.options)) {
        let opts = q.options.map((optText, idx) => ({
          originalLetter: String.fromCharCode(65 + idx),
          text: optText
        }));
        
        for (let k = opts.length - 1; k > 0; k--) {
          const j = Math.floor(random() * (k + 1));
          [opts[k], opts[j]] = [opts[j], opts[k]];
        }
        q.shuffledOptions = opts;
      }
    }

    // Then shuffle the questions themselves
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleStartExam = async (e) => {
    e?.preventDefault();
    if (!tokenInput.trim()) {
      setTokenError('Token tidak boleh kosong');
      return;
    }

    setIsStarting(true);

    // ── OFFLINE MODE: use cached exam data from IndexedDB ──
    if (!navigator.onLine) {
      try {
        const cachedExam = await getCachedExam(targetExam.id);
        if (!cachedExam) {
          setTokenError('Soal ujian belum ter-cache di perangkat ini. Hubungkan internet untuk mengunduh soal.');
          setIsStarting(false);
          return;
        }

        // Validate token locally against cached token
        if (cachedExam.token && cachedExam.token !== tokenInput.trim().toUpperCase()) {
          setTokenError('Token ujian tidak valid');
          setIsStarting(false);
          return;
        }

        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen error:', e));
        }

        setShowTokenModal(false);
        setOfflineMode(true);

        // Use cached questions
        const shuffled = shuffleQuestions(cachedExam.questions || [], cachedExam.id);
        setExamDetail({ ...cachedExam, questions: shuffled });
        setActiveExam(targetExam);

        // Load answers from localStorage only
        const localAnswers = getLocalAnswers(targetExam.id);
        setAnswers(localAnswers);

        // Start timer
        const durationSec = (targetExam.duration_minutes || cachedExam.duration_minutes || 90) * 60;
        setTimeLeft(durationSec);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) { clearInterval(timerRef.current); handleSubmit(targetExam.id, true); return 0; }
            return prev - 1;
          });
        }, 1000);
        setView('exam');
      } catch (err) {
        setTokenError('Gagal memuat soal dari cache: ' + err.message);
      } finally {
        setIsStarting(false);
      }
      return;
    }

    // ── ONLINE MODE: normal flow ──
    // Trik Jeda Acak (Jitter) 0 hingga 3000 ms untuk menyebar beban traffic
    const randomJitter = Math.floor(Math.random() * 3000);
    await new Promise(resolve => setTimeout(resolve, randomJitter));

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen error:', e));
      }
      const startRes = await api.post(`/exam-sessions/${targetExam.id}/start`, { token: tokenInput.trim().toUpperCase() });
      setShowTokenModal(false);
      setOfflineMode(false);
      
      setSessionId(startRes.data.session_id);
      const detailRes = await api.get(`/exams/${targetExam.id}`);
      
      // Mengacak urutan soal secara deterministik
      if (detailRes.data && Array.isArray(detailRes.data.questions)) {
        detailRes.data.questions = shuffleQuestions(detailRes.data.questions, targetExam.id);
      }

      setExamDetail(detailRes.data);
      setActiveExam(targetExam);

      // Cache exam data to IndexedDB for offline fallback (even without PWA push)
      try {
        await cacheExamData({
          ...detailRes.data,
          token: targetExam.token || '',
          duration_minutes: targetExam.duration_minutes || detailRes.data.duration_minutes || 90,
          course_name: targetExam.course_name || '',
          course_code: targetExam.course_code || ''
        });
        console.log('✅ Exam cached to IndexedDB on start');
      } catch (cacheErr) {
        console.warn('⚠️ Failed to cache exam on start:', cacheErr);
      }

      // Load saved answers from server, then merge with any localStorage leftovers
      const savedRes = await api.get(`/exam-sessions/${targetExam.id}/answers`);
      const serverAnswers = savedRes.data.answers || {};
      const localAnswers = getLocalAnswers(targetExam.id);
      const mergedAnswers = { ...serverAnswers, ...localAnswers };
      setAnswers(mergedAnswers);
      setLocalAnswers(targetExam.id, mergedAnswers);

      // Sync any pending offline answers to server
      const pending = getPendingQueue(targetExam.id);
      if (pending.length > 0 && navigator.onLine) {
        pendingQueueRef.current = pending;
        syncPendingAnswers(targetExam.id);
      }

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
      // If server unreachable, try offline fallback
      if (!e.response) {
        const cachedExam = await getCachedExam(targetExam.id);
        if (cachedExam) {
          setTokenError('Server tidak dapat dijangkau. Ketuk "Verifikasi" lagi untuk mode offline.');
        } else {
          setTokenError('Server tidak dapat dijangkau dan soal belum ter-cache.');
        }
      } else {
        setTokenError(e.response?.data?.error || 'Gagal memulai ujian');
      }
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
    const examId = activeExam?.id;
    // 1. Update UI state immediately
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: answer };
      // 2. Always save to localStorage first (instant, offline-safe)
      if (examId) setLocalAnswers(examId, updated);
      return updated;
    });

    // 3. Try syncing to server
    if (navigator.onLine) {
      try {
        await api.post(`/exam-sessions/${examId}/answer`, { question_id: questionId, answer });
      } catch (e) {
        console.error('Auto-save to server failed, queuing:', e);
        // Failed even though online — add to pending queue
        if (examId) {
          const queue = getPendingQueue(examId);
          // Replace existing entry for same question or append
          const idx = queue.findIndex(q => q.question_id === questionId);
          if (idx >= 0) queue[idx].answer = answer;
          else queue.push({ question_id: questionId, answer });
          setPendingQueue(examId, queue);
          pendingQueueRef.current = queue;
        }
      }
    } else {
      // Offline — add to pending queue for later sync
      if (examId) {
        const queue = getPendingQueue(examId);
        const idx = queue.findIndex(q => q.question_id === questionId);
        if (idx >= 0) queue[idx].answer = answer;
        else queue.push({ question_id: questionId, answer });
        setPendingQueue(examId, queue);
        pendingQueueRef.current = queue;
      }
    }
  };

  const handleSubmit = async (examId, auto = false) => {
    const eid = examId || activeExam?.id;
    if (!auto && !window.confirm('Yakin ingin mengumpulkan ujian? Jawaban tidak dapat diubah setelah dikumpulkan.')) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log('Exit fullscreen error:', e));
    }
    setSubmitting(true);

    // ── OFFLINE SUBMIT: defer to later ──
    if (!navigator.onLine || offlineMode) {
      try {
        // Mark this exam for deferred submission
        localStorage.setItem('siakad_deferred_submit_' + eid, JSON.stringify({
          exam_id: eid,
          answers: getLocalAnswers(eid),
          submitted_at: new Date().toISOString()
        }));
        alert('Ujian dikumpulkan secara offline. Jawaban Anda tersimpan aman di perangkat dan akan otomatis dikirim ke server saat koneksi kembali.');
        setView('list');
        fetchExams();
      } catch (e) {
        alert('Gagal menyimpan pengumpulan offline: ' + e.message);
      } finally { setSubmitting(false); }
      return;
    }

    // ── ONLINE SUBMIT ──
    try {
      // Sync any remaining pending answers before submitting
      const queue = getPendingQueue(eid);
      if (queue.length > 0) {
        for (const item of queue) {
          try {
            await api.post(`/exam-sessions/${eid}/answer`, { question_id: item.question_id, answer: item.answer });
          } catch (e) { console.error('Final sync error:', e); }
        }
      }

      await api.post(`/exam-sessions/${eid}/submit`);
      // Clean up localStorage after successful submit
      clearLocalExamData(eid);
      removeCachedExam(eid).catch(() => {});
      localStorage.removeItem('siakad_deferred_submit_' + eid);
      await fetchExams();
      const resultRes = await api.get(`/exam-sessions/${eid}/result`);
      setResult(resultRes.data);
      setView('result');
    } catch (e) {
      if (!e.response) {
        // Server unreachable — defer
        localStorage.setItem('siakad_deferred_submit_' + eid, JSON.stringify({
          exam_id: eid,
          answers: getLocalAnswers(eid),
          submitted_at: new Date().toISOString()
        }));
        alert('Server tidak dapat dijangkau. Jawaban disimpan di perangkat dan akan otomatis dikirim saat koneksi kembali.');
        setView('list');
      } else {
        alert(e.response?.data?.error || 'Gagal mengumpulkan ujian');
      }
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

        {resAnswers.map((a, i) => {
          const isPg = a.question_type === 'pg';
          const myAnswerText = isPg && a.options && a.answer 
            ? (a.options[a.answer.charCodeAt(0) - 65] || '')
            : (a.answer || '(tidak dijawab)');

          return (
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
                <p className="fw-semibold mb-3">{a.question_text}</p>
                
                <div className="p-3 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                  <div className="text-muted small mb-1">Jawaban Anda:</div>
                  <strong className={a.question_type === 'essay' ? 'text-dark' : a.is_correct ? 'text-success' : 'text-danger'}>
                    {myAnswerText}
                  </strong>
                </div>
              </div>
            </div>
          );
        })}
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

          {/* Offline Mode Banner */}
          {offlineMode && (
            <div className="alert mb-3 py-2 px-3 d-flex align-items-center gap-2 border-0 rounded-3 shadow-sm"
              style={{ backgroundColor: '#ede9fe', color: '#5b21b6', fontSize: '0.875rem' }}>
              <HardDrive size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Mode Offline</strong> — Soal dimuat dari cache perangkat. Jawaban tersimpan lokal dan akan otomatis dikirim ke server saat koneksi kembali.
              </div>
            </div>
          )}

          {/* Offline/Sync Banner */}
          {!isOnline && !offlineMode && (
            <div className="alert mb-3 py-2 px-3 d-flex align-items-center gap-2 border-0 rounded-3 shadow-sm animate-fade-in"
              style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.875rem' }}>
              <WifiOff size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>Koneksi terputus</strong> — Jawaban Anda tetap tersimpan di perangkat ini. Akan otomatis dikirim ke server saat koneksi kembali.
              </div>
            </div>
          )}
          {isOnline && syncStatus === 'syncing' && (
            <div className="alert mb-3 py-2 px-3 d-flex align-items-center gap-2 border-0 rounded-3 shadow-sm"
              style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.875rem' }}>
              <span className="spinner-border spinner-border-sm" role="status" />
              <span>Menyinkronkan jawaban offline ke server...</span>
            </div>
          )}
          {isOnline && syncStatus === 'synced' && (
            <div className="alert mb-3 py-2 px-3 d-flex align-items-center gap-2 border-0 rounded-3 shadow-sm"
              style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.875rem' }}>
              <Wifi size={18} />
              <span>Semua jawaban berhasil disinkronkan!</span>
            </div>
          )}

          {/* Header */}
          <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ background: offlineMode ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <div className="card-body p-4 text-white">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-0">{examDetail.title}</h4>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <small className="opacity-75">{examDetail.type}</small>
                  {offlineMode && <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}><HardDrive size={10} className="me-1" />OFFLINE</span>}
                </div>
              </div>
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
          <div className="col-md-9" key={q ? q.id : 'empty'}>
            {questions.length === 0 ? (
               <div className="card shadow-sm border-0 rounded-4 h-100 d-flex flex-column align-items-center justify-content-center p-5 text-center" style={{ minHeight: '400px' }}>
                 <ClipboardList size={64} className="mb-3 text-muted opacity-50" />
                 <h4 className="fw-bold text-dark">Soal belum tersedia</h4>
                 <p className="text-muted">Dosen belum memasukkan soal ke dalam ujian ini. Silakan hubungi dosen Anda.</p>
               </div>
            ) : q && (
              <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex gap-2 align-items-center mb-3">
                    <span className="badge bg-secondary fs-6">Soal {currentQ + 1} / {questions.length}</span>
                    <span className={`badge bg-${typeBg[q.question_type]}`}>{typeLabel[q.question_type]}</span>
                    <span className="badge bg-light text-dark border">{q.points} poin</span>
                  </div>
                  <p className="fw-semibold mb-4" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>{q.question_text}</p>

                  {/* PG */}
                  {q.question_type === 'pg' && q.shuffledOptions && (
                    <div className="d-flex flex-column gap-2">
                      {q.shuffledOptions.map((optObj, oi) => {
                        const displayLetter = String.fromCharCode(65 + oi);
                        const selected = answers[q.id] === optObj.originalLetter;
                        return (
                          <button key={optObj.originalLetter} className={`btn text-start rounded-3 fw-semibold border ${selected ? 'btn-primary border-primary' : 'btn-light border-secondary-subtle'}`}
                            style={{ padding: '12px 16px' }} onClick={() => saveAnswer(q.id, optObj.originalLetter)}>
                            <span className={`me-3 badge ${selected ? 'bg-white text-primary' : 'bg-secondary-subtle text-dark'}`}>{displayLetter}</span>
                            {optObj.text}
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
      {!isOnline && (
        <div className="alert mb-3 py-2 px-3 d-flex align-items-center gap-2 border-0 rounded-3 shadow-sm"
          style={{ backgroundColor: '#ede9fe', color: '#5b21b6', fontSize: '0.875rem' }}>
          <WifiOff size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Mode Offline</strong> — Menampilkan ujian yang tersimpan di perangkat. Anda tetap bisa mengerjakan ujian yang sudah di-cache.
          </div>
        </div>
      )}
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

              // Check if this exam has a deferred submission pending
              const hasDeferredSubmit = !!localStorage.getItem('siakad_deferred_submit_' + exam.id);
              // Check if this exam is cached in IndexedDB
              const isCached = cachedExams.some(c => c.id === exam.id);

              return (
                <div key={exam.id} className="col-md-6 col-lg-4">
                  <div className="card shadow-sm border-0 rounded-4 h-100">
                    <div className="card-body p-4">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex gap-1 flex-wrap">
                          <span className={`badge ${exam.type === 'UTS' ? 'bg-warning text-dark' : 'bg-danger'}`}>{exam.type}</span>
                          {isCached && <span className="badge text-white" style={{ backgroundColor: '#7c3aed', fontSize: '0.65rem' }}><HardDrive size={10} className="me-1" />Cached</span>}
                        </div>
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
                        {hasDeferredSubmit && (
                          <div className="text-warning fw-bold">
                            ⏳ Menunggu sinkronisasi ke server...
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
