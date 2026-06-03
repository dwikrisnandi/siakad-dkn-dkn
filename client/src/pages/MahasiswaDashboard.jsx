import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { BookOpen, AlertCircle, Award, Clock, BrainCircuit, X } from 'lucide-react';

export default function MahasiswaDashboard() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({ activeTasks: 0, ipk: '0.00' });
  const [loading, setLoading] = useState(true);
  const [aiNotifs, setAiNotifs] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const resSched = await api.get('/schedules');
        setSchedules(resSched.data);

        let uncompletedTasks = 0;
        let totalScore = 0;
        let scoreCount = 0;

        const scheduleIds = resSched.data.map(s => s.id);
        
        if (scheduleIds.length > 0) {
           try {
             const notifRes = await api.get('/notifications');
             uncompletedTasks = notifRes.data.count || 0;
           } catch(e) {}

           const gradesPromises = scheduleIds.map(id => api.get(`/grades/${id}`));
           const gradesRes = await Promise.all(gradesPromises);
           
           gradesRes.forEach(res => {
              const myGrade = res.data.find(g => g.mahasiswa_id === user.id);
              if (myGrade && myGrade.final_score > 0) {
                 let scale4 = (myGrade.final_score / 100) * 4;
                 totalScore += scale4;
                 scoreCount++;
              }
           });
        }

        let calculatedIpk = '0.00';
        if (scoreCount > 0) {
           calculatedIpk = (totalScore / scoreCount).toFixed(2);
        }

        setStats({
          activeTasks: uncompletedTasks,
          ipk: calculatedIpk
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user.id]);

  // Fetch AI grade notifications
  useEffect(() => {
    const fetchAiNotifs = async () => {
      try {
        const res = await api.get('/ai-notifications');
        setAiNotifs(res.data);
      } catch (e) {
        console.warn('AI notifications fetch error:', e);
      }
    };
    fetchAiNotifs();
  }, []);

  const handleDismissNotif = async (id) => {
    try {
      await api.put(`/ai-notifications/${id}/dismiss`);
      setAiNotifs(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('Dismiss error:', e);
    }
  };

  const cards = [
    { title: 'Matakuliah Terdaftar', value: schedules.length, icon: <BookOpen size={28} className="text-primary"/>, bg: 'bg-primary-subtle' },
    { title: 'Tugas Belum Selesai', value: stats.activeTasks, icon: <AlertCircle size={28} className="text-danger"/>, bg: 'bg-danger-subtle' },
    { title: 'IPK Sementara', value: stats.ipk, icon: <Award size={28} className="text-success"/>, bg: 'bg-success-subtle' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Selamat datang, {user?.name}</h3>
        <p className="text-muted">NIM: {user?.nidn_nim}</p>
      </div>
      
      <div className="row g-4 mb-4">
        {cards.map((card, idx) => (
          <div className="col-12 col-md-4" key={idx}>
            <div className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
              <div className="card-body p-4 d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 fw-semibold">{card.title}</p>
                  <h2 className="fw-bold mb-0 text-dark">{card.value}</h2>
                </div>
                <div className={`${card.bg} p-3 rounded-circle d-flex align-items-center justify-content-center`}>
                  {card.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Grade Notifications */}
      {aiNotifs.length > 0 && (
        <div className="mb-4">
          <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
            <BrainCircuit size={22} className="text-purple" style={{ color: '#7c3aed' }} />
            Hasil Koreksi AI
          </h5>
          <div className="row g-3">
            {aiNotifs.map(n => (
              <div className="col-md-6" key={n.id}>
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ borderLeft: '4px solid #7c3aed' }}>
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <BrainCircuit size={18} style={{ color: '#7c3aed' }} />
                        <h6 className="fw-bold mb-0">{n.assignment_title}</h6>
                      </div>
                      <button className="btn btn-sm btn-outline-secondary border-0 p-1" onClick={() => handleDismissNotif(n.id)} title="Hapus notifikasi">
                        <X size={16} />
                      </button>
                    </div>

                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="text-center px-3 py-2 rounded-3" style={{ background: n.skor >= 70 ? '#dcfce7' : '#fef2f2' }}>
                        <div className="fw-bold" style={{ fontSize: '28px', color: n.skor >= 70 ? '#16a34a' : '#dc2626' }}>{n.skor}</div>
                        <small className="text-muted">Skor</small>
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-1 small fw-bold" style={{ color: '#7c3aed' }}>💡 Feedback Dosen AI:</p>
                        <p className="mb-0 small text-muted">{n.feedback}</p>
                      </div>
                    </div>

                    <div className={`rounded-3 px-3 py-2 small ${n.ai_terindikasi ? 'bg-warning-subtle border border-warning-subtle text-warning-emphasis' : 'bg-success-subtle border border-success-subtle text-success-emphasis'}`}>
                      <span className="fw-bold me-2">{n.ai_terindikasi ? '🤖 Terindikasi Jawaban AI' : '✅ Jawaban Asli'}</span>
                      <span>{n.ai_keterangan}</span>
                    </div>

                    <div className="mt-2 text-end">
                      <small className="text-muted">{new Date(n.created_at).toLocaleString('id-ID')}</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h5 className="fw-bold mb-3 mt-5">Jadwal Kuliah Anda</h5>
      <div className="row g-3">
        {loading ? (
          <div className="col-12 text-center text-muted">Memuat jadwal...</div>
        ) : schedules.length === 0 ? (
          <div className="col-12 text-center text-muted">Anda belum memiliki jadwal kuliah.</div>
        ) : (
          schedules.map((s, idx) => (
            <div className="col-md-6 col-lg-4" key={idx}>
              <div className="card shadow-sm border-0 h-100 rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <span className="badge bg-primary-subtle text-primary border">{s.class_name}</span>
                    <span className="text-muted small fw-semibold"><Clock size={14} className="me-1 mb-1"/>{s.day}, {s.time_start} - {s.time_end}</span>
                  </div>
                  <h5 className="fw-bold mb-1">{s.course_name} <span className="text-muted fs-6">({s.course_code})</span></h5>
                  <p className="text-muted small mb-2">Dosen: {s.dosen_name}</p>
                  <p className="text-muted small mb-0">Ruang: {s.room || 'TBA'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

