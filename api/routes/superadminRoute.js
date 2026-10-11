const express = require('express');
const router = express.Router();
const { query, run } = require('../db');
const { verifyToken } = require('../middlewares/auth');
const bcrypt = require('bcryptjs');

// Middleware check superadmin
const requireSuperadmin = (req, res, next) => {
    if (req.userRole === 'superadmin') {
        next();
    } else {
        res.status(403).json({ error: 'Akses ditolak. Khusus Super Admin.' });
    }
};

// Get all tenants with admin information
router.get('/tenants', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const [tenants] = await query(`
            SELECT t.*, 
                COALESCE((SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin'), 0) as admin_count,
                (SELECT u.name FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' LIMIT 1) as admin_name,
                (SELECT u.nidn_nim FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' LIMIT 1) as admin_username,
                (SELECT u.id FROM users u WHERE u.tenant_id = t.id AND u.role = 'admin' LIMIT 1) as admin_id
            FROM tenants t 
            ORDER BY t.created_at DESC
        `);
        res.json(tenants);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data kampus' });
    }
});

// Create new tenant
router.post('/tenants', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { name, slug, max_students, ai_points, admin_name, admin_username, admin_password } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ error: 'Nama kampus dan subdomain wajib diisi' });
        }

        const [existing] = await query('SELECT id FROM tenants WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Subdomain sudah digunakan' });
        }

        const newTenant = await run(`
            INSERT INTO tenants (name, slug, max_students, ai_points, subscription_status, is_ai_enabled)
            VALUES (?, ?, ?, ?, 'active', true) RETURNING id
        `, [name, slug, max_students || 1000, ai_points || 100]);

        const tenantId = newTenant.id;

        if (admin_username && admin_password) {
            const hashed = await bcrypt.hash(admin_password, 10);
            await run(`
                INSERT INTO users (nidn_nim, name, role, password, tenant_id)
                VALUES (?, ?, 'admin', ?, ?)
            `, [admin_username, admin_name || 'Admin ' + name, hashed, tenantId]);
        }

        res.json({ message: 'Kampus berhasil didaftarkan', id: tenantId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menambah kampus' });
    }
});

// Update tenant
router.put('/tenants/:id', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, max_students, theme_color, subscription_status } = req.body;
        await query(`
            UPDATE tenants 
            SET name = COALESCE(?, name),
                slug = COALESCE(?, slug),
                max_students = COALESCE(?, max_students),
                theme_color = COALESCE(?, theme_color),
                subscription_status = COALESCE(?, subscription_status)
            WHERE id = ?
        `, [name, slug, max_students, theme_color, subscription_status, id]);
        res.json({ message: 'Kampus berhasil diperbarui' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui kampus' });
    }
});

// Get all admin users for a tenant
router.get('/tenants/:id/admins', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [admins] = await query("SELECT id, name, nidn_nim, role, created_at FROM users WHERE tenant_id = ? AND role = 'admin' ORDER BY id ASC", [id]);
        res.json(admins);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil daftar admin kampus' });
    }
});

// Create new admin user for a tenant
router.post('/tenants/:id/admins', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, nidn_nim, password } = req.body;
        if (!name || !nidn_nim || !password) {
            return res.status(400).json({ error: 'Nama, username/NIDN, dan password wajib diisi' });
        }

        const [existing] = await query('SELECT id FROM users WHERE nidn_nim = ? AND tenant_id = ?', [nidn_nim, id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username/NIDN tersebut sudah digunakan di kampus ini' });
        }

        const hashed = await bcrypt.hash(password, 10);
        await run('INSERT INTO users (name, nidn_nim, role, password, tenant_id) VALUES (?, ?, ?, ?, ?)', [name, nidn_nim, 'admin', hashed, id]);
        res.json({ message: 'Admin kampus berhasil ditambahkan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menambahkan admin kampus' });
    }
});

// Update specific admin user
router.put('/tenants/:id/admins/:adminId', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id, adminId } = req.params;
        const { name, nidn_nim, password } = req.body;

        if (password && password.trim() !== '') {
            const hashed = await bcrypt.hash(password, 10);
            await query('UPDATE users SET name = ?, nidn_nim = ?, password = ? WHERE id = ? AND tenant_id = ?', [name, nidn_nim, hashed, adminId, id]);
        } else {
            await query('UPDATE users SET name = ?, nidn_nim = ? WHERE id = ? AND tenant_id = ?', [name, nidn_nim, adminId, id]);
        }
        res.json({ message: 'Akun admin berhasil diperbarui' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui admin' });
    }
});

// Delete specific admin user
router.delete('/tenants/:id/admins/:adminId', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id, adminId } = req.params;
        await query('DELETE FROM users WHERE id = ? AND tenant_id = ? AND role = ?', [adminId, id, 'admin']);
        res.json({ message: 'Admin kampus berhasil dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menghapus admin' });
    }
});

// Top up AI points for tenant
router.post('/tenants/:id/topup', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;
        const pts = parseInt(points);
        if (isNaN(pts)) {
            return res.status(400).json({ error: 'Poin tidak valid' });
        }
        await query('UPDATE tenants SET ai_points = COALESCE(ai_points, 0) + ? WHERE id = ?', [pts, id]);
        res.json({ message: 'Poin AI berhasil ditambahkan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal top up AI' });
    }
});

// Get stats
router.get('/stats', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const [tenantsCount] = await query('SELECT count(*) as count FROM tenants');
        const [adminsCount] = await query("SELECT count(*) as count FROM users WHERE role = 'admin'");
        res.json({
            total_tenants: parseInt(tenantsCount[0]?.count || 0),
            total_admins: parseInt(adminsCount[0]?.count || 0),
            total_users: parseInt(adminsCount[0]?.count || 0)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil statistik' });
    }
});
// Get all tenants with plan info for subscriptions
router.get('/subscriptions', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const [subs] = await query(`
            SELECT t.*, p.name as plan_name, p.price_per_month
            FROM tenants t 
            LEFT JOIN subscription_plans p ON t.active_plan_id = p.id 
            ORDER BY t.created_at DESC
        `);
        res.json(subs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data subscriptions' });
    }
});

// Update tenant subscription status
router.put('/subscriptions/:id', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { subscription_status, subscription_end_date, active_plan_id } = req.body;
        
        await query(
            'UPDATE tenants SET subscription_status = ?, subscription_end_date = ?, active_plan_id = ? WHERE id = ?',
            [subscription_status, subscription_end_date, active_plan_id, id]
        );
        res.json({ message: 'Subscription berhasil diupdate' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal update subscription' });
    }
});

// Get all plans
router.get('/plans', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const [plans] = await query('SELECT * FROM subscription_plans ORDER BY price_per_month ASC');
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data plans' });
    }
});

// Create new plan
router.post('/plans', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { name, description, price_per_month, max_students, is_active } = req.body;
        // PostgreSQL compatibility for INSERT RETURNING
        const [result] = await query(
            'INSERT INTO subscription_plans (name, description, price_per_month, max_students, is_active) VALUES (?, ?, ?, ?, ?) RETURNING id',
            [name, description || '', price_per_month, max_students, is_active !== undefined ? is_active : true]
        );
        res.json({ message: 'Plan berhasil dibuat', id: result[0]?.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal membuat plan' });
    }
});

// Update plan
router.put('/plans/:id', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price_per_month, max_students, is_active } = req.body;
        await query(
            'UPDATE subscription_plans SET name = ?, description = ?, price_per_month = ?, max_students = ?, is_active = ? WHERE id = ?',
            [name, description, price_per_month, max_students, is_active, id]
        );
        res.json({ message: 'Plan berhasil diupdate' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal update plan' });
    }
});

// Delete plan (soft delete or hard delete)
router.delete('/plans/:id', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM subscription_plans WHERE id = ?', [id]);
        res.json({ message: 'Plan berhasil dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menghapus plan' });
    }
});

// Get Server Monitoring Stats
const os = require('os');
let prevCpuTimes = null;

const calculateCpuUsage = () => {
    const cpus = os.cpus();
    let idle = 0, total = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) {
            total += cpu.times[type];
        }
        idle += cpu.times.idle;
    }

    if (!prevCpuTimes) {
        prevCpuTimes = { idle, total };
        return 5; // Default safe initial value
    }

    const diffIdle = idle - prevCpuTimes.idle;
    const diffTotal = total - prevCpuTimes.total;
    prevCpuTimes = { idle, total };

    if (diffTotal <= 0) return 4;
    const usage = Math.round((1 - diffIdle / diffTotal) * 100);
    return Math.max(1, Math.min(100, usage));
};

router.get('/monitoring', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        const cpus = os.cpus();
        const cpuUsagePercent = calculateCpuUsage();
        
        res.json({
            uptime: os.uptime(),
            platform: `${os.type()} ${os.arch()}`,
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                percentUsed: ((usedMem / totalMem) * 100).toFixed(2)
            },
            cpu: {
                model: cpus[0].model,
                speed: cpus[0].speed,
                cores: cpus.length,
                usagePercent: cpuUsagePercent
            },
            serverTime: new Date()
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data monitoring' });
    }
});
// --- DATABASE MANAGER (Like phpMyAdmin) ---

// Get all tables in the current database schema
router.get('/database/tables', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const [tables] = await query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name ASC
        `);
        res.json(tables);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil daftar tabel database' });
    }
});

// Execute raw SQL query
router.post('/database/query', verifyToken, requireSuperadmin, async (req, res) => {
    try {
        const sql = req.body.query;
        if (!sql || sql.trim() === '') {
            return res.status(400).json({ error: 'Query tidak boleh kosong' });
        }
        
        // Execute using db pool directly to support multiple query types and returning objects
        const { db } = require('../db');
        const result = await db.query(sql);
        
        // Return command type, rowCount, and rows (if any)
        res.json({
            command: result.command,
            rowCount: result.rowCount,
            rows: result.rows
        });
    } catch (err) {
        console.error('SQL Execution Error:', err.message);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
