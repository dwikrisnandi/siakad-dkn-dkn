import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SuperAdminSubscriptions() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);
    const [formData, setFormData] = useState({
        subscription_status: '',
        subscription_end_date: '',
        active_plan_id: ''
    });
    const [plans, setPlans] = useState([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [subsRes, plansRes] = await Promise.all([
                api.get('/superadmin/subscriptions'),
                api.get('/superadmin/plans')
            ]);
            setSubscriptions(subsRes.data);
            setPlans(plansRes.data);
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            alert('Gagal mengambil data subscriptions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (sub) => {
        setSelectedSub(sub);
        setFormData({
            subscription_status: sub.subscription_status || 'trial',
            subscription_end_date: sub.subscription_end_date ? new Date(sub.subscription_end_date).toISOString().split('T')[0] : '',
            active_plan_id: sub.active_plan_id || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            await api.put(`/superadmin/subscriptions/${selectedSub.id}`, formData);
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving subscription:', error);
            alert('Gagal menyimpan perubahan');
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
    };

    return (
        <div className="container-fluid p-4">
            <h3 className="mb-4 text-primary fw-bold">Status Sewa & Penagihan</h3>
            <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Kampus</th>
                                    <th>Paket Aktif</th>
                                    <th>Biaya / Bulan</th>
                                    <th>Status</th>
                                    <th>Berakhir Pada</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">Memuat data...</td>
                                    </tr>
                                ) : subscriptions.map(sub => (
                                    <tr key={sub.id}>
                                        <td>
                                            <div className="fw-bold">{sub.name}</div>
                                            <small className="text-muted">{sub.slug}.arthavirddhisampada.online</small>
                                        </td>
                                        <td>
                                            {sub.plan_name ? (
                                                <span className="badge bg-info text-dark rounded-pill px-3 py-2">
                                                    {sub.plan_name}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>{sub.price_per_month ? formatCurrency(sub.price_per_month) : '-'}</td>
                                        <td>
                                            <span 
                                                className={`badge rounded-pill px-3 py-2 bg-${sub.subscription_status === 'active' ? 'success' : sub.subscription_status === 'trial' ? 'warning' : 'danger'}`}
                                            >
                                                {(sub.subscription_status || 'unknown').toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            {sub.subscription_end_date 
                                                ? new Date(sub.subscription_end_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) 
                                                : '-'}
                                        </td>
                                        <td>
                                            <button className="btn btn-outline-primary btn-sm" onClick={() => handleEdit(sub)}>
                                                Kelola
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Kelola Penagihan - {selectedSub?.name}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">Status Sewa</label>
                                        <select 
                                            className="form-select"
                                            value={formData.subscription_status}
                                            onChange={e => setFormData({...formData, subscription_status: e.target.value})}
                                        >
                                            <option value="trial">Trial</option>
                                            <option value="active">Active</option>
                                            <option value="expired">Expired</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Paket Langganan</label>
                                        <select 
                                            className="form-select"
                                            value={formData.active_plan_id}
                                            onChange={e => setFormData({...formData, active_plan_id: e.target.value})}
                                        >
                                            <option value="">Pilih Paket...</option>
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price_per_month)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Berakhir Pada</label>
                                        <input 
                                            type="date" 
                                            className="form-control"
                                            value={formData.subscription_end_date}
                                            onChange={e => setFormData({...formData, subscription_end_date: e.target.value})}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="button" className="btn btn-primary" onClick={handleSave}>Simpan Perubahan</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
