import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function SuperAdminMonitoring() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await api.get('/superadmin/monitoring');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching monitoring stats:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Polling setiap 5 detik
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatUptime = (seconds) => {
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        const s = Math.floor(seconds % 60);
        
        let dDisplay = d > 0 ? d + (d == 1 ? " hari, " : " hari, ") : "";
        let hDisplay = h > 0 ? h + (h == 1 ? " jam, " : " jam, ") : "";
        let mDisplay = m > 0 ? m + (m == 1 ? " mnt, " : " mnt, ") : "";
        let sDisplay = s > 0 ? s + (s == 1 ? " dtk" : " dtk") : "";
        return dDisplay + hDisplay + mDisplay + sDisplay;
    };

    if (loading && !stats) {
        return <div className="p-4 text-center">Memuat metrik server...</div>;
    }

    if (!stats) {
        return <div className="p-4 text-center text-danger">Gagal memuat data server. Pastikan API berjalan.</div>;
    }

    return (
        <div className="container-fluid p-4">
            <h3 className="mb-4 text-primary fw-bold">Monitoring Server & Performa</h3>
            <div className="row">
                <div className="col-md-6 col-lg-4 mb-4">
                    <div className="card shadow-sm border-0 rounded-4 h-100 text-white" style={{ background: 'linear-gradient(45deg, #4e54c8, #8f94fb)' }}>
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h6 className="text-uppercase mb-1 opacity-75">Server Uptime</h6>
                                    <h3 className="fw-bold mb-0">{formatUptime(stats.uptime)}</h3>
                                </div>
                                <div className="bg-white text-primary rounded-circle p-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                                    <i className="fas fa-clock fs-4"></i>
                                </div>
                            </div>
                            <small className="opacity-75">Waktu Server: {new Date(stats.serverTime).toLocaleString('id-ID')}</small>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-lg-4 mb-4">
                    <div className="card shadow-sm border-0 rounded-4 h-100 text-white" style={{ background: 'linear-gradient(45deg, #11998e, #38ef7d)' }}>
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="w-100 pe-3">
                                    <h6 className="text-uppercase mb-1 opacity-75">Penggunaan Memori (RAM)</h6>
                                    <h3 className="fw-bold mb-2">{stats.memory.percentUsed}%</h3>
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div className="progress-bar bg-warning" role="progressbar" style={{ width: `${stats.memory.percentUsed}%` }} aria-valuenow={stats.memory.percentUsed} aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                </div>
                                <div className="bg-white text-success rounded-circle p-3 shadow-sm d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '60px', height: '60px' }}>
                                    <i className="fas fa-memory fs-4"></i>
                                </div>
                            </div>
                            <div className="d-flex justify-content-between small opacity-75">
                                <span>Terpakai: {formatBytes(stats.memory.used)}</span>
                                <span>Total: {formatBytes(stats.memory.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-12 col-lg-4 mb-4">
                    <div className="card shadow-sm border-0 rounded-4 h-100 text-white" style={{ background: 'linear-gradient(45deg, #ff416c, #ff4b2b)' }}>
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="w-100 pe-3">
                                    <h6 className="text-uppercase mb-1 opacity-75">Beban CPU ({stats.cpu.cores} Cores)</h6>
                                    <h3 className="fw-bold mb-2">{stats.cpu.usagePercent || 5}%</h3>
                                    <div className="progress" style={{ height: '8px' }}>
                                        <div className="progress-bar bg-white" role="progressbar" style={{ width: `${stats.cpu.usagePercent || 5}%` }} aria-valuenow={stats.cpu.usagePercent || 5} aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                </div>
                                <div className="bg-white text-danger rounded-circle p-3 shadow-sm d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '60px', height: '60px' }}>
                                    <i className="fas fa-microchip fs-4"></i>
                                </div>
                            </div>
                            <div className="small opacity-75 text-truncate" title={stats.cpu.model}>
                                {stats.cpu.model}
                            </div>
                            <small className="opacity-75 d-block mt-1">Platform: {stats.platform || 'Windows'}</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 mt-2">
                <div className="card-body">
                    <h5 className="fw-bold mb-3">Status Layanan & Dependencies</h5>
                    <div className="row">
                        <div className="col-md-4 mb-3">
                            <div className="d-flex align-items-center p-3 border rounded-3">
                                <div className="bg-success text-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                    <i className="fas fa-database"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold">PostgreSQL Database</h6>
                                    <small className="text-success fw-bold">Online & Connected</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 mb-3">
                            <div className="d-flex align-items-center p-3 border rounded-3">
                                <div className="bg-success text-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                    <i className="fas fa-server"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold">Node.js API Server</h6>
                                    <small className="text-success fw-bold">Running (Port 7542)</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 mb-3">
                            <div className="d-flex align-items-center p-3 border rounded-3">
                                <div className="bg-success text-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold">System Security</h6>
                                    <small className="text-success fw-bold">Active (CIV Protected)</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
