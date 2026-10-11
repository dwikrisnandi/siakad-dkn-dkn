import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SuperAdminPlans() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        price_per_month: 0,
        max_students: 0,
        is_active: true
    });

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await api.get('/superadmin/plans');
            setPlans(res.data);
        } catch (error) {
            console.error('Error fetching plans:', error);
            alert('Gagal mengambil data paket');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleAdd = () => {
        setIsEdit(false);
        setFormData({ id: '', name: '', description: '', price_per_month: 0, max_students: 0, is_active: true });
        setShowModal(true);
    };

    const handleEdit = (plan) => {
        setIsEdit(true);
        setFormData({ ...plan });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if(confirm('Yakin ingin menghapus paket ini?')) {
            try {
                await api.delete(`/superadmin/plans/${id}`);
                fetchPlans();
            } catch (error) {
                console.error(error);
                alert('Gagal menghapus paket');
            }
        }
    };

    const handleSave = async () => {
        try {
            if (isEdit) {
                await api.put(`/superadmin/plans/${formData.id}`, formData);
            } else {
                await api.post('/superadmin/plans', formData);
            }
            setShowModal(false);
            fetchPlans();
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan paket');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-primary fw-bold mb-0">Manajemen Paket & Harga</h3>
                <button className="btn btn-primary rounded-pill px-4" onClick={handleAdd}>
                    <i className="fas fa-plus me-2"></i> Tambah Paket
                </button>
            </div>
            
            <div className="row">
                {loading ? (
                    <div className="text-center py-5">Memuat data paket...</div>
                ) : plans.map(plan => (
                    <div className="col-md-4 mb-4" key={plan.id}>
                        <div className={`card h-100 shadow-sm border-0 rounded-4 ${!plan.is_active ? 'opacity-50' : ''}`}>
                            <div className="card-body d-flex flex-column">
                                <h4 className="fw-bold text-center mb-3">{plan.name}</h4>
                                <h2 className="text-center text-primary mb-4">{formatCurrency(plan.price_per_month)}<span className="fs-6 text-muted">/bln</span></h2>
                                <div className="mb-4 flex-grow-1 text-center">
                                    <p className="text-muted">{plan.description}</p>
                                    <ul className="list-unstyled text-start w-75 mx-auto">
                                        <li className="mb-2"><i className="fas fa-check text-success me-2"></i> Maks {plan.max_students} Mahasiswa</li>
                                        <li className="mb-2"><i className="fas fa-check text-success me-2"></i> Custom Domain</li>
                                        <li className="mb-2"><i className="fas fa-check text-success me-2"></i> Dukungan Prioritas</li>
                                        <li className="mb-2"><i className="fas fa-check text-success me-2"></i> Fitur AI Lengkap</li>
                                    </ul>
                                </div>
                                <div className="d-grid gap-2">
                                    <button className="btn btn-outline-primary" onClick={() => handleEdit(plan)}>Edit Paket</button>
                                    <button className="btn btn-outline-danger" onClick={() => handleDelete(plan.id)}>Hapus</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{isEdit ? 'Edit Paket' : 'Tambah Paket Baru'}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">Nama Paket</label>
                                        <input 
                                            type="text" 
                                            className="form-control"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            placeholder="Contoh: Pro, Enterprise"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Harga per Bulan (Rp)</label>
                                        <input 
                                            type="number" 
                                            className="form-control"
                                            value={formData.price_per_month}
                                            onChange={e => setFormData({...formData, price_per_month: e.target.value})}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Maksimal Mahasiswa</label>
                                        <input 
                                            type="number" 
                                            className="form-control"
                                            value={formData.max_students}
                                            onChange={e => setFormData({...formData, max_students: e.target.value})}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Deskripsi</label>
                                        <textarea 
                                            className="form-control"
                                            rows={3}
                                            value={formData.description}
                                            onChange={e => setFormData({...formData, description: e.target.value})}
                                        />
                                    </div>
                                    <div className="form-check form-switch mb-3">
                                        <input 
                                            className="form-check-input"
                                            type="checkbox"
                                            id="planActiveSwitch"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                        />
                                        <label className="form-check-label" htmlFor="planActiveSwitch">Paket Aktif (Tampil di pendaftaran)</label>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="button" className="btn btn-primary" onClick={handleSave}>Simpan Paket</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
