import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Users, BookOpen, Clock } from 'lucide-react';

export default function DosenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({ activeTasks: 0, totalStudents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Schedules
        const resSched = await api.get('/schedules');
        const mySchedules = resSched.data.filter(s => s.dosen_id === user.id);
        setSchedules(mySchedules);

        // 2. Fetch Assignments & Students for these schedules
        let taskCount = 0;
        let uniqueStudents = new Set();

        const scheduleIds = mySchedules.map(s => s.id);
        
        if (scheduleIds.length > 0) {
           // Fetch all assignments and filter by dosen's schedules
           const assignmentsPromises = scheduleIds.map(id => api.get(`/assignments/${id}`));
           const assignmentsRes = await Promise.all(assignmentsPromises);
           
           assignmentsRes.forEach(res => {
              // Count tasks that are not past deadlines (simple logic)
              const active = res.data.filter(a => new Date(a.deadline) > new Date());
              taskCount += active.length;
           });

           // Fetch all students for the dosen's schedules (via grades api which resolves class_ids)
           const gradesPromises = scheduleIds.map(id => api.get(`/grades/${id}`));
           const gradesRes = await Promise.all(gradesPromises);
           
           gradesRes.forEach(res => {
              res.data.forEach(student => {
                 uniqueStudents.add(student.mahasiswa_id);
              });
           });
        }

        setStats({
           activeTasks: taskCount,
           totalStudents: uniqueStudents.size
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user.id]);

  const cards = [
    { title: 'Jadwal Mengajar', value: schedules.length, icon: <Calendar size={28} className="text-primary"/>, bg: 'bg-primary-subtle' },
    { title: 'Tugas Aktif', value: stats.activeTasks, icon: <BookOpen size={28} className="text-warning"/>, bg: 'bg-warning-subtle' },
    { title: 'Total Mahasiswa', value: stats.totalStudents, icon: <Users size={28} className="text-success"/>, bg: 'bg-success-subtle' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Selamat datang, {user?.name}</h3>
        <p className="text-muted">NIDN: {user?.nidn_nim}</p>
      </div>
      
      <div className="row g-4 mb-4">
        {cards.map((card, idx) => (
          <div className="col-12 col-md-4" key={idx}>
            <div className="card shadow-sm border-0 h-100 rounded-4 overflow-hidden">
              <div className="card-body p-3 d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1 fw-semibold" style={{ fontSize: '0.8rem' }}>{card.title}</p>
                  <h4 className="fw-bold mb-0 text-dark">{card.value}</h4>
                </div>
                <div className={`${card.bg} p-2 rounded-circle d-flex align-items-center justify-content-center`} style={{ width: '45px', height: '45px' }}>
                  {React.cloneElement(card.icon, { size: 22 })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h5 className="fw-bold mb-3 mt-5">Jadwal Mengajar Anda</h5>
      <div className="row g-3">
        {loading ? (
          <div className="col-12 text-center text-muted">Memuat jadwal...</div>
        ) : schedules.length === 0 ? (
          <div className="col-12 text-center text-muted">Anda belum memiliki jadwal mengajar.</div>
        ) : (
          schedules.map((s, idx) => (
            <div className="col-md-6 col-lg-4" key={idx}>
              <div className="card shadow-sm border-0 h-100 rounded-4">
                <div className="card-body p-3 pb-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-primary-subtle text-primary border px-2 py-1">{s.class_name}</span>
                    <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                      <Clock size={12} className="me-1 mb-1"/>{s.day}, {s.time_start} - {s.time_end}
                    </span>
                  </div>
                  <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: '0.95rem' }}>
                    {s.course_name}
                  </h6>
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>Ruang: {s.room || 'TBA'} ({s.course_code})</p>
                </div>
                <div className="card-footer bg-white border-0 p-3 pt-0">
                  <button
                    className="btn btn-outline-primary w-100 btn-sm fw-bold"
                    onClick={() => navigate('/dosen/attendance', { state: { scheduleId: s.id } })}
                  >Masuk Kelas</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
