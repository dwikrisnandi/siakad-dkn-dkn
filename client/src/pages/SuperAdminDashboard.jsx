import React, { useState, useEffect } from 'react';
import { Database, Zap, Users, Shield, TrendingUp, Activity } from 'lucide-react';
import api from '../utils/api';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({ total_tenants: 0, total_users: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/superadmin/stats');
                setStats(res.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="animate-fade-in p-4">
            <div className="mb-4">
                <h3 className="fw-bold mb-1">SaaS Super Admin Dashboard</h3>
                <p className="text-muted mb-0">Overview sistem pusat SIAKAD DKN</p>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            ) : (
                <>
                    <div className="row g-4 mb-4">
                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm rounded-4 h-100 bg-primary text-white overflow-hidden">
                                <div className="card-body p-4 position-relative">
                                    <Database size={100} className="position-absolute opacity-10" style={{ right: '-20px', bottom: '-20px' }} />
                                    <div className="bg-white bg-opacity-25 d-inline-flex p-3 rounded-circle mb-3">
                                        <Database size={24} />
                                    </div>
                                    <h6 className="text-white-50 fw-semibold mb-1">Total Kampus (Tenants)</h6>
                                    <h2 className="fw-bold mb-0">{stats.total_tenants}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm rounded-4 h-100 bg-success text-white overflow-hidden">
                                <div className="card-body p-4 position-relative">
                                    <Shield size={100} className="position-absolute opacity-10" style={{ right: '-20px', bottom: '-20px' }} />
                                    <div className="bg-white bg-opacity-25 d-inline-flex p-3 rounded-circle mb-3">
                                        <Shield size={24} />
                                    </div>
                                    <h6 className="text-white-50 fw-semibold mb-1">Total Admin Kampus</h6>
                                    <h2 className="fw-bold mb-0">{stats.total_users}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm rounded-4 h-100 bg-info text-white overflow-hidden">
                                <div className="card-body p-4 position-relative">
                                    <Zap size={100} className="position-absolute opacity-10" style={{ right: '-20px', bottom: '-20px' }} />
                                    <div className="bg-white bg-opacity-25 d-inline-flex p-3 rounded-circle mb-3">
                                        <Zap size={24} />
                                    </div>
                                    <h6 className="text-white-50 fw-semibold mb-1">Status Sistem</h6>
                                    <h2 className="fw-bold mb-0">Online</h2>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 col-lg-3">
                            <div className="card border-0 shadow-sm rounded-4 h-100 bg-warning text-dark overflow-hidden">
                                <div className="card-body p-4 position-relative">
                                    <Activity size={100} className="position-absolute opacity-10" style={{ right: '-20px', bottom: '-20px' }} />
                                    <div className="bg-white bg-opacity-25 d-inline-flex p-3 rounded-circle mb-3">
                                        <Activity size={24} />
                                    </div>
                                    <h6 className="text-dark fw-semibold mb-1">Server Load</h6>
                                    <h2 className="fw-bold mb-0">Normal</h2>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-header bg-white border-0 pt-4 pb-0 px-4">
                            <h5 className="fw-bold d-flex align-items-center gap-2">
                                <TrendingUp size={20} className="text-primary" /> Statistik Pendaftaran Baru
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="text-center py-5 text-muted">
                                <Activity size={48} className="mb-3 opacity-50" />
                                <h5>Grafik Pertumbuhan Kampus</h5>
                                <p className="mb-0">Akan segera tersedia pada pembaruan versi berikutnya.</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
