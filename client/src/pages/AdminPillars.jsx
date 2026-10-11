import React, { useState, useEffect } from 'react';
import { BookOpen, CheckSquare, Save, Plus, Target, Award } from 'lucide-react';
import api from '../utils/api';

export default function AdminPillars() {
    const [pillar, setPillar] = useState({ id: null, study_program_name: '', visi: '', misi: '' });
    const [cplList, setCplList] = useState([]);
    const [cpmkList, setCpmkList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [newCpl, setNewCpl] = useState({ code: '', description: '' });
    const [newCpmk, setNewCpmk] = useState({ code: '', description: '' });

    const fetchPillars = async () => {
        setLoading(true);
        try {
            const res = await api.get('/rps-builder/pillars');
            if (res.data.length > 0) {
                setPillar(res.data[0]);
                fetchPoints(res.data[0].id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPoints = async (pillarId) => {
        try {
            const res = await api.get(`/rps-builder/pillars/${pillarId}/points`);
            setCplList(res.data.cpl);
            setCpmkList(res.data.cpmk);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchPillars();
    }, []);

    const handleSavePillar = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.post('/rps-builder/pillars', pillar);
            alert('Berhasil menyimpan Visi Misi & Profil Lulusan.');
            if (res.data.pillarId) {
                setPillar({ ...pillar, id: res.data.pillarId });
                fetchPoints(res.data.pillarId);
            }
        } catch (error) {
            alert('Gagal menyimpan.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddPoint = async (type) => {
        if (!pillar.id) {
            alert("Simpan Visi Misi terlebih dahulu!");
            return;
        }
        
        const payload = type === 'cpl' ? newCpl : newCpmk;
        if (!payload.code || !payload.description) return;

        try {
            await api.post(`/rps-builder/pillars/${pillar.id}/points`, { ...payload, type });
            if (type === 'cpl') setNewCpl({ code: '', description: '' });
            else setNewCpmk({ code: '', description: '' });
            fetchPoints(pillar.id);
        } catch (error) {
            alert(`Gagal menambah ${type.toUpperCase()}`);
        }
    };

    return (
        <div className="animate-fade-in p-4">
            <div className="mb-4">
                <h3 className="fw-bold mb-1">Visi Misi & Pilar Akademik</h3>
                <p className="text-muted mb-0">Atur Visi, Misi, CPL (Capaian Pembelajaran Lulusan), dan CPMK untuk acuan RPS AI.</p>
            </div>

            <div className="row g-4">
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
                            <h5 className="fw-bold d-flex align-items-center gap-2">
                                <Target size={20} className="text-primary" /> Profil Program Studi
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSavePillar}>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Nama Program Studi</label>
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder="Misal: S1 Teknik Informatika"
                                        value={pillar.study_program_name}
                                        onChange={e => setPillar({...pillar, study_program_name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label fw-semibold">Visi Program Studi</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="3"
                                        placeholder="Tuliskan visi prodi..."
                                        value={pillar.visi}
                                        onChange={e => setPillar({...pillar, visi: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="form-label fw-semibold">Misi Program Studi</label>
                                    <textarea 
                                        className="form-control" 
                                        rows="4"
                                        placeholder="Tuliskan misi prodi..."
                                        value={pillar.misi}
                                        onChange={e => setPillar({...pillar, misi: e.target.value})}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary rounded-pill px-4" disabled={saving}>
                                    <Save size={16} className="me-2" /> {saving ? 'Menyimpan...' : 'Simpan Profil & Visi Misi'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                        <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold d-flex align-items-center gap-2 mb-0">
                                <Award size={20} className="text-success" /> CPL (Capaian Pembelajaran Lulusan)
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control w-25" placeholder="Kode (CPL-01)" value={newCpl.code} onChange={e => setNewCpl({...newCpl, code: e.target.value})} />
                                <input type="text" className="form-control" placeholder="Deskripsi CPL..." value={newCpl.description} onChange={e => setNewCpl({...newCpl, description: e.target.value})} />
                                <button className="btn btn-success text-white px-3 rounded-3" onClick={() => handleAddPoint('cpl')}>
                                    <Plus size={18} />
                                </button>
                            </div>
                            <ul className="list-group list-group-flush border-top pt-2">
                                {cplList.map(c => (
                                    <li key={c.id} className="list-group-item px-0 py-2 border-0">
                                        <strong className="text-success">{c.code}</strong>: {c.description}
                                    </li>
                                ))}
                                {cplList.length === 0 && <li className="list-group-item text-muted px-0 border-0">Belum ada CPL.</li>}
                            </ul>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-header bg-white border-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold d-flex align-items-center gap-2 mb-0">
                                <BookOpen size={20} className="text-info" /> CPMK (Capaian Pembelajaran Mata Kuliah)
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="d-flex gap-2 mb-3">
                                <input type="text" className="form-control w-25" placeholder="Kode (CPMK-01)" value={newCpmk.code} onChange={e => setNewCpmk({...newCpmk, code: e.target.value})} />
                                <input type="text" className="form-control" placeholder="Deskripsi CPMK Umum..." value={newCpmk.description} onChange={e => setNewCpmk({...newCpmk, description: e.target.value})} />
                                <button className="btn btn-info text-white px-3 rounded-3" onClick={() => handleAddPoint('cpmk')}>
                                    <Plus size={18} />
                                </button>
                            </div>
                            <ul className="list-group list-group-flush border-top pt-2">
                                {cpmkList.map(c => (
                                    <li key={c.id} className="list-group-item px-0 py-2 border-0">
                                        <strong className="text-info">{c.code}</strong>: {c.description}
                                    </li>
                                ))}
                                {cpmkList.length === 0 && <li className="list-group-item text-muted px-0 border-0">Belum ada CPMK.</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
