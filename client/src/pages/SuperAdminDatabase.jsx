import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Database, Play, AlertCircle, Save, Table as TableIcon, Trash2 } from 'lucide-react';

export default function SuperAdminDatabase() {
    const [tables, setTables] = useState([]);
    const [query, setQuery] = useState('SELECT * FROM tenants LIMIT 10;');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    
    // Tab state: 'query' or 'tables'
    const [activeTab, setActiveTab] = useState('query');

    const fetchTables = async () => {
        setLoadingTables(true);
        try {
            const res = await api.get('/superadmin/database/tables');
            setTables(res.data);
        } catch (err) {
            console.error('Error fetching tables', err);
            setError('Gagal memuat daftar tabel dari database.');
        } finally {
            setLoadingTables(false);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    const runQuery = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        setResult(null);
        
        try {
            const res = await api.post('/superadmin/database/query', { query });
            setResult(res.data);
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Terjadi kesalahan saat menjalankan query.');
        } finally {
            setLoading(false);
        }
    };

    const handleTableClick = (tableName) => {
        setQuery(`SELECT * FROM ${tableName} LIMIT 50;`);
        setActiveTab('query');
        setTimeout(() => runQuery(), 100);
    };

    const renderTableResult = () => {
        if (!result) return null;
        
        if (result.command && !result.rows) {
            return (
                <div className="alert alert-success mt-3">
                    Query berhasil dieksekusi. Command: <strong>{result.command}</strong>. Baris terpengaruh: <strong>{result.rowCount || 0}</strong>.
                </div>
            );
        }

        if (!Array.isArray(result.rows) || result.rows.length === 0) {
            return <div className="alert alert-info mt-3">Query berhasil. Tidak ada data / baris kosong.</div>;
        }

        const columns = Object.keys(result.rows[0]);

        return (
            <div className="table-responsive mt-4 rounded-3 border">
                <table className="table table-hover table-bordered table-striped align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="table-dark">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className="fw-semibold py-3">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {result.rows.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((col, cIdx) => (
                                    <td key={cIdx}>
                                        {row[col] === null ? (
                                            <em className="text-muted">NULL</em>
                                        ) : typeof row[col] === 'object' ? (
                                            JSON.stringify(row[col])
                                        ) : (
                                            String(row[col])
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="animate-fade-in p-4 h-100 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-1 d-flex align-items-center">
                        <Database className="me-2 text-primary" size={28} /> Database Manager (SIAKAD_DKN)
                    </h3>
                    <p className="text-muted mb-0">Kelola dan eksekusi SQL secara langsung layaknya phpMyAdmin</p>
                </div>
            </div>

            <div className="row g-4 flex-grow-1">
                {/* Sidebar Tabel */}
                <div className="col-md-3 d-flex flex-column h-100">
                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 d-flex flex-column" style={{ maxHeight: '80vh' }}>
                        <div className="card-header bg-white border-bottom-0 pt-4 pb-2">
                            <h6 className="fw-bold mb-0 d-flex align-items-center text-secondary">
                                <TableIcon size={18} className="me-2" /> Tabel Database
                            </h6>
                        </div>
                        <div className="card-body overflow-auto p-2">
                            {loadingTables ? (
                                <div className="text-center py-4 text-muted small">Memuat...</div>
                            ) : tables.length === 0 ? (
                                <div className="text-center py-4 text-muted small">Tidak ada tabel</div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {tables.map(t => (
                                        <button 
                                            key={t.table_name}
                                            className="list-group-item list-group-item-action border-0 rounded-3 mb-1 px-3 py-2 d-flex justify-content-between align-items-center"
                                            onClick={() => handleTableClick(t.table_name)}
                                        >
                                            <span className="font-monospace small text-truncate" style={{maxWidth: '85%'}}>
                                                {t.table_name}
                                            </span>
                                            <span className="badge bg-light text-secondary border">{t.table_type === 'VIEW' ? 'VIEW' : 'TBL'}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Area Query SQL */}
                <div className="col-md-9 d-flex flex-column h-100">
                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                        <div className="card-header bg-dark text-white rounded-top-4 py-3 border-0 d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <span className="font-monospace fw-semibold">SQL Console</span>
                            </div>
                            <button 
                                className="btn btn-sm btn-primary rounded-pill px-4 fw-bold"
                                onClick={runQuery}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Mengeksekusi...</>
                                ) : (
                                    <><Play size={14} className="me-1" /> Jalankan Query</>
                                )}
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <textarea 
                                className="form-control border-0 font-monospace p-4" 
                                style={{ minHeight: '160px', backgroundColor: '#1e1e1e', color: '#d4d4d4', resize: 'vertical' }}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Ketik query SQL di sini... contoh: SELECT * FROM users;"
                                spellCheck="false"
                            ></textarea>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm rounded-4 flex-grow-1 d-flex flex-column" style={{ minHeight: '40vh' }}>
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="fw-bold mb-0 text-secondary">Hasil Eksekusi</h6>
                                {result?.rows && <span className="badge bg-success-subtle text-success">{result.rows.length} baris ditampilkan</span>}
                            </div>
                            
                            {error && (
                                <div className="alert alert-danger mt-3 d-flex align-items-start">
                                    <AlertCircle size={20} className="me-2 flex-shrink-0 mt-1" />
                                    <div className="font-monospace small" style={{ wordBreak: 'break-word' }}>
                                        <strong>SQL Error:</strong><br />
                                        {error}
                                    </div>
                                </div>
                            )}

                            {!error && renderTableResult()}

                            {!error && !result && !loading && (
                                <div className="text-center py-5 text-muted">
                                    <Database size={48} className="opacity-25 mb-3 mx-auto d-block" />
                                    Tulis query SQL dan klik "Jalankan Query" untuk melihat hasil.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
