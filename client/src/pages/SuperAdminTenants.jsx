import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, Zap, Shield, Edit2 } from 'lucide-react';
import api from '../utils/api';

export default function SuperAdminTenants() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total_tenants: 0, total_admins: 0, total_users: 0 });

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);

    // Form data
    const [addForm, setAddForm] = useState({
        name: '',
        slug: '',
        max_students: 1000,
        ai_points: 100,
        admin_name: '',
        admin_username: '',
        admin_password: ''
    });

    const [editForm, setEditForm] = useState({
        id: '',
        name: '',
        slug: '',
        max_students: 1000,
        theme_color: '#0d6efd',
        subscription_status: 'active'
    });

    const [tenantAdmins, setTenantAdmins] = useState([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);
    const [showEditAdminModal, setShowEditAdminModal] = useState(false);
    const [editAdminState, setEditAdminState] = useState('list'); // 'list', 'add', 'edit'

    const [editAdminForm, setEditAdminForm] = useState({
        admin_id: '',
        name: '',
        nidn_nim: '',
        password: ''
    });

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const res = await api.get('/superadmin/tenants?t=' + Date.now());
            if (Array.isArray(res.data)) {
                setTenants(res.data);
            }
        } catch (error) {
            console.error('Error fetching tenants', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    // Derived statistics using the actual array to prevent desync
    const totalTenantsCount = tenants.length;
    const totalAdminsCount = tenants.reduce((acc, curr) => acc + (parseInt(curr.admin_count) || 0), 0);

    const handleTopup = async (tenantId) => {
        const pointsStr = window.prompt("Berapa poin AI yang ingin ditambahkan ke kampus ini?", "1000");
        if (!pointsStr) return;
        const points = parseInt(pointsStr);
        if (isNaN(points) || points <= 0) return;
        
        try {
            await api.post(`/superadmin/tenants/${tenantId}/topup`, { points });
            alert("Top up " + points + " poin AI berhasil!");
            fetchTenants();
        } catch(e) {
            alert("Gagal top up AI: " + (e.response?.data?.error || e.message));
        }
    };

    const handleAddTenant = async (e) => {
        e.preventDefault();
        try {
            await api.post('/superadmin/tenants', addForm);
            alert("Kampus berhasil didaftarkan!");
            setShowAddModal(false);
            setAddForm({
                name: '',
                slug: '',
                max_students: 1000,
                ai_points: 100,
                admin_name: '',
                admin_username: '',
                admin_password: ''
            });
            fetchTenants();
        } catch (err) {
            alert("Gagal mendaftarkan kampus: " + (err.response?.data?.error || err.message));
        }
    };

    const handleOpenEdit = (tenant) => {
        setSelectedTenant(tenant);
        setEditForm({
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            max_students: tenant.max_students,
            theme_color: tenant.theme_color || '#0d6efd',
            subscription_status: tenant.subscription_status || 'active'
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/superadmin/tenants/${editForm.id}`, editForm);
            alert("Data kampus berhasil diperbarui!");
            setShowEditModal(false);
            fetchTenants();
        } catch (err) {
            alert("Gagal memperbarui kampus: " + (err.response?.data?.error || err.message));
        }
    };

    const fetchTenantAdmins = async (tenantId) => {
        setLoadingAdmins(true);
        try {
            const res = await api.get(`/superadmin/tenants/${tenantId}/admins?t=` + Date.now());
            if (Array.isArray(res.data)) {
                setTenantAdmins(res.data);
            } else {
                setTenantAdmins([]);
            }
        } catch (err) {
            console.error('Fetch admins error:', err);
            setTenantAdmins([]);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const handleOpenEditAdmin = (tenant) => {
        setSelectedTenant(tenant);
        setEditAdminState('list');
        setShowEditAdminModal(true);
        fetchTenantAdmins(tenant.id);
    };

    const handleSaveAdmin = async (e) => {
        e.preventDefault();
        try {
            if (editAdminState === 'edit') {
                await api.put(`/superadmin/tenants/${selectedTenant.id}/admins/${editAdminForm.admin_id}`, editAdminForm);
                alert("Data admin berhasil diperbarui!");
            } else {
                await api.post(`/superadmin/tenants/${selectedTenant.id}/admins`, editAdminForm);
                alert("Admin baru berhasil ditambahkan!");
            }
            setEditAdminState('list');
            fetchTenantAdmins(selectedTenant.id);
            fetchTenants(); // update counts
        } catch (err) {
            alert("Gagal menyimpan admin: " + (err.response?.data?.error || err.message));
        }
    };

    const handleDeleteAdmin = async (adminId) => {
        if (!confirm('Yakin ingin menghapus admin ini?')) return;
        try {
            await api.delete(`/superadmin/tenants/${selectedTenant.id}/admins/${adminId}`);
            fetchTenantAdmins(selectedTenant.id);
            fetchTenants();
        } catch (err) {
            alert("Gagal menghapus admin: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="animate-fade-in p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-1">Manajemen Kampus (Tenants)</h3>
                    <p className="text-muted mb-0">Kelola semua universitas & kampus yang berlangganan SIAKAD DKN SaaS</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary rounded-pill px-3" onClick={fetchTenants} disabled={loading}>
                        <RefreshCw size={16} className={`me-2 ${loading ? 'spin' : ''}`} /> Refresh
                    </button>
                    <button className="btn btn-primary rounded-pill px-3 shadow-sm" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} className="me-1" /> Tambah Kampus
                    </button>
                </div>
            </div>

            {/* Metric Overview Cards */}
            {!loading ? (
                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm rounded-4 h-100 bg-primary text-white">
                            <div className="card-body p-4 d-flex align-items-center">
                                <div className="bg-white bg-opacity-25 p-3 rounded-circle me-3">
                                    <Database size={28} />
                                </div>
                                <div>
                                    <h6 className="mb-1 text-white-50 fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>Total Kampus Terdaftar</h6>
                                    <h2 className="fw-bold mb-0"><span className="notranslate" key={`t-${totalTenantsCount}`}>{totalTenantsCount}</span> Kampus</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm rounded-4 h-100 text-white" style={{ background: 'linear-gradient(45deg, #0284c7, #06b6d4)' }}>
                            <div className="card-body p-4 d-flex align-items-center">
                                <div className="bg-white bg-opacity-25 p-3 rounded-circle me-3">
                                    <Shield size={28} />
                                </div>
                                <div>
                                    <h6 className="mb-1 text-white-50 fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>Total Admin Kampus Aktif</h6>
                                    <h2 className="fw-bold mb-0"><span className="notranslate" key={`a-${totalAdminsCount}`}>{totalAdminsCount}</span> Admin Kampus</h2>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row g-3 mb-4">
                    <div className="col-md-6"><div className="card border-0 shadow-sm rounded-4 h-100 placeholder-glow" style={{height: '116px'}}><div className="placeholder w-100 h-100 rounded-4"></div></div></div>
                    <div className="col-md-6"><div className="card border-0 shadow-sm rounded-4 h-100 placeholder-glow" style={{height: '116px'}}><div className="placeholder w-100 h-100 rounded-4"></div></div></div>
                </div>
            )}

            {/* Tenants Data Table */}
            <div className="card border-0 shadow-sm rounded-4">
                <div className="card-header bg-white py-3 border-0">
                    <h5 className="fw-bold mb-0">Daftar Kampus & Status Operasional</h5>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="py-3 ps-4 border-0">Nama Kampus</th>
                                    <th className="py-3 border-0">Subdomain (Slug)</th>
                                    <th className="py-3 border-0">Admin Kampus</th>
                                    <th className="py-3 border-0">Maks Mahasiswa</th>
                                    <th className="py-3 border-0">Poin AI</th>
                                    <th className="py-3 border-0">Status Sewa</th>
                                    <th className="py-3 pe-4 border-0 text-end">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="text-center py-5 text-muted">Memuat data kampus...</td></tr>
                                ) : tenants.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center py-5 text-muted">Belum ada kampus yang terdaftar.</td></tr>
                                ) : tenants.map((tenant) => (
                                    <tr key={tenant.id}>
                                        <td className="ps-4 py-3 fw-semibold">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="rounded-circle shadow-sm" style={{width: 14, height: 14, backgroundColor: tenant.theme_color || '#0d6efd'}}></div>
                                                <div>
                                                    <span className="fw-bold text-dark">{tenant.name}</span>
                                                    {tenant.country && <small className="d-block text-muted">{tenant.country}</small>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                                                {tenant.slug}.arthavirddhisampada.online
                                            </span>
                                        </td>
                                        <td>
                                            {tenant.admin_name ? (
                                                <div>
                                                    <span className="fw-medium text-dark">{tenant.admin_name}</span>
                                                    <small className="d-block text-muted">({tenant.admin_username}) {tenant.admin_count > 1 ? `+${tenant.admin_count - 1} lainnya` : ''}</small>
                                                </div>
                                            ) : (
                                                <span className="badge bg-secondary-subtle text-secondary">Belum ada</span>
                                            )}
                                        </td>
                                        <td><span className="fw-bold">{tenant.max_students}</span> akun</td>
                                        <td>
                                            <span className={`badge ${tenant.ai_points > 0 ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-2`}>
                                                {tenant.ai_points} pts
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge rounded-pill px-3 py-2 ${tenant.subscription_status === 'active' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                {tenant.subscription_status?.toUpperCase() || 'TRIAL'}
                                            </span>
                                        </td>
                                        <td className="pe-4 text-end">
                                            <div className="btn-group">
                                                <button 
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => handleOpenEdit(tenant)}
                                                    title="Edit Kampus"
                                                >
                                                    <Edit2 size={14} /> Kampus
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-outline-info"
                                                    onClick={() => handleOpenEditAdmin(tenant)}
                                                    title="Edit Admin"
                                                >
                                                    <Shield size={14} /> Admin
                                                </button>
                                                <button 
                                                    className="btn btn-sm btn-outline-success"
                                                    onClick={() => handleTopup(tenant.id)}
                                                    title="Top Up AI"
                                                >
                                                    Top Up AI
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Tambah Kampus */}
            {showAddModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold">Daftarkan Kampus Baru</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                            </div>
                            <form onSubmit={handleAddTenant}>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Nama Kampus / Universitas</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="Contoh: STMIK Pamitran" 
                                                required
                                                value={addForm.name}
                                                onChange={e => setAddForm({...addForm, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Subdomain (Slug)</label>
                                            <div className="input-group">
                                                <input 
                                                    type="text" 
                                                    className="form-control font-monospace" 
                                                    placeholder="pamitran" 
                                                    required
                                                    value={addForm.slug}
                                                    onChange={e => setAddForm({...addForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                                                />
                                                <span className="input-group-text text-muted small">.arthavirddhisampada.online</span>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Batas Maksimal Mahasiswa</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={addForm.max_students}
                                                onChange={e => setAddForm({...addForm, max_students: parseInt(e.target.value) || 0})}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Bonus Poin AI Awal</label>
                                            <input 
                                                type="number" 
                                                className="form-control" 
                                                value={addForm.ai_points}
                                                onChange={e => setAddForm({...addForm, ai_points: parseInt(e.target.value) || 0})}
                                            />
                                        </div>

                                        <hr className="my-3" />
                                        <h6 className="fw-bold mb-2 text-primary">Akun Admin Kampus Pertama</h6>

                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold">Nama Lengkap Admin</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="Admin Pamitran"
                                                value={addForm.admin_name}
                                                onChange={e => setAddForm({...addForm, admin_name: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold">Username / NIDN Admin</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="admin"
                                                value={addForm.admin_username}
                                                onChange={e => setAddForm({...addForm, admin_username: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-4">
                                            <label className="form-label small fw-semibold">Password Admin</label>
                                            <input 
                                                type="password" 
                                                className="form-control" 
                                                placeholder="Minimal 6 karakter"
                                                value={addForm.admin_password}
                                                onChange={e => setAddForm({...addForm, admin_password: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer border-0">
                                    <button type="button" className="btn btn-secondary rounded-pill" onClick={() => setShowAddModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary rounded-pill px-4">Daftarkan Kampus</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Kampus */}
            {showEditModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold">Edit Informasi Kampus</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleSaveEdit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Nama Kampus</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            required
                                            value={editForm.name}
                                            onChange={e => setEditForm({...editForm, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Subdomain (Slug)</label>
                                        <input 
                                            type="text" 
                                            className="form-control font-monospace" 
                                            required
                                            value={editForm.slug}
                                            onChange={e => setEditForm({...editForm, slug: e.target.value})}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Kapasitas Maks Mahasiswa</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            value={editForm.max_students}
                                            onChange={e => setEditForm({...editForm, max_students: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Status Sewa</label>
                                        <select 
                                            className="form-select"
                                            value={editForm.subscription_status}
                                            onChange={e => setEditForm({...editForm, subscription_status: e.target.value})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="trial">Trial</option>
                                            <option value="expired">Expired</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer border-0">
                                    <button type="button" className="btn btn-secondary rounded-pill" onClick={() => setShowEditModal(false)}>Batal</button>
                                    <button type="submit" className="btn btn-primary rounded-pill px-4">Simpan Perubahan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Kelola Admin Kampus */}
            {showEditAdminModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content rounded-4 border-0 shadow">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title fw-bold">
                                    Kelola Admin - {selectedTenant?.name}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditAdminModal(false)}></button>
                            </div>
                            
                            <div className="modal-body">
                                {editAdminState === 'list' ? (
                                    <>
                                        <div className="d-flex justify-content-end mb-3">
                                            <button className="btn btn-sm btn-primary rounded-pill px-3" onClick={() => {
                                                setEditAdminForm({ admin_id: '', name: '', nidn_nim: '', password: '' });
                                                setEditAdminState('add');
                                            }}>
                                                <Plus size={14} className="me-1"/> Tambah Admin Baru
                                            </button>
                                        </div>
                                        {loadingAdmins ? (
                                            <div className="text-center py-4">Memuat data admin...</div>
                                        ) : !Array.isArray(tenantAdmins) || tenantAdmins.length === 0 ? (
                                            <div className="alert alert-warning">Kampus ini belum memiliki akun Admin.</div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-bordered align-middle">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Nama Admin</th>
                                                            <th>Username / NIDN</th>
                                                            <th className="text-end">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tenantAdmins.map(admin => (
                                                            <tr key={admin.id}>
                                                                <td className="fw-medium">{admin.name}</td>
                                                                <td><code>{admin.nidn_nim}</code></td>
                                                                <td className="text-end">
                                                                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => {
                                                                        setEditAdminForm({ admin_id: admin.id, name: admin.name, nidn_nim: admin.nidn_nim, password: '' });
                                                                        setEditAdminState('edit');
                                                                    }}>Edit</button>
                                                                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteAdmin(admin.id)}>Hapus</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <form onSubmit={handleSaveAdmin}>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Nama Lengkap Admin</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                required
                                                value={editAdminForm.name}
                                                onChange={e => setEditAdminForm({...editAdminForm, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">Username / NIDN</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                required
                                                value={editAdminForm.nidn_nim}
                                                onChange={e => setEditAdminForm({...editAdminForm, nidn_nim: e.target.value})}
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label fw-semibold">{editAdminState === 'edit' ? 'Ubah Password (Opsional)' : 'Password'}</label>
                                            <input 
                                                type="password" 
                                                className="form-control" 
                                                required={editAdminState === 'add'}
                                                placeholder={editAdminState === 'edit' ? "Kosongkan jika tidak ingin mengubah password" : "Buat password"}
                                                value={editAdminForm.password}
                                                onChange={e => setEditAdminForm({...editAdminForm, password: e.target.value})}
                                            />
                                        </div>
                                        <div className="d-flex justify-content-end gap-2 mt-4">
                                            <button type="button" className="btn btn-secondary rounded-pill" onClick={() => setEditAdminState('list')}>Kembali ke Daftar</button>
                                            <button type="submit" className="btn btn-primary rounded-pill px-4">Simpan Akun</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
