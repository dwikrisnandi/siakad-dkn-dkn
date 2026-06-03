const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, run } = require('../db');
const { verifyToken } = require('../middlewares/auth');

router.post('/login', async (req, res) => {
  try {
    const { nidn_nim, password } = req.body;

    // Find user
    const [users] = await query('SELECT * FROM users WHERE nidn_nim = ?', [nidn_nim]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = users[0];

    // Check password
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

    // Generate token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 hours
    });

    res.status(200).json({
      id: user.id,
      nidn_nim: user.nidn_nim,
      name: user.name,
      role: user.role,
      token: token
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await query('SELECT id, nidn_nim, name, role FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    // Fetch current user
    const [users] = await query('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];

    // Verify old password
    const passwordIsValid = await bcrypt.compare(old_password, user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Password lama salah' });

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.userId]);

    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Gagal mengubah password' });
  }
});

router.post('/save-fcm-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // 1. Check if token already exists for this user
    const [existing] = await query('SELECT id FROM user_fcm_tokens WHERE user_id = ? AND token = ?', [req.userId, token]);
    
    if (existing.length > 0) {
      await run('UPDATE user_fcm_tokens SET last_used_at = (CURRENT_TIMESTAMP AT TIME ZONE \'Asia/Jakarta\') WHERE id = ?', [existing[0].id]);
    } else {
      // 2. Check current count
      const [countRows] = await query('SELECT COUNT(*) as cnt FROM user_fcm_tokens WHERE user_id = ?', [req.userId]);
      if (countRows[0].cnt >= 5) {
        // Delete the oldest one (FIFO by last_used_at)
        await run('DELETE FROM user_fcm_tokens WHERE id IN (SELECT id FROM user_fcm_tokens WHERE user_id = ? ORDER BY last_used_at ASC LIMIT 1)', [req.userId]);
      }
      // 3. Insert new token
      await run('INSERT INTO user_fcm_tokens (user_id, token) VALUES (?, ?)', [req.userId, token]);
    }

    res.json({ message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
