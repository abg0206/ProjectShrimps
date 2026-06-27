const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

// PUT /api/settings/email
// Update email for the authenticated user
router.put('/email', async (req, res) => {
  const { currentEmail, newEmail } = req.body;

  if (!currentEmail || !newEmail) {
    return res
      .status(400)
      .json({ error: 'Current email and new email are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  if (currentEmail === newEmail) {
    return res
      .status(400)
      .json({ error: 'New email must be different from current email.' });
  }

  try {
    const userCheck = await pool.query(
      'SELECT user_id FROM user_account WHERE email = $1',
      [currentEmail]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const emailTaken = await pool.query(
      'SELECT user_id FROM user_account WHERE email = $1',
      [newEmail]
    );

    if (emailTaken.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already in use.' });
    }

    await pool.query('UPDATE user_account SET email = $1 WHERE email = $2', [
      newEmail,
      currentEmail,
    ]);

    await pool.query('UPDATE user_profile SET email = $1 WHERE email = $2', [
      newEmail,
      currentEmail,
    ]);

    await pool.query('UPDATE job_table SET email = $1 WHERE email = $2', [
      newEmail,
      currentEmail,
    ]);

    await pool.query('UPDATE resume_table SET email = $1 WHERE email = $2', [
      newEmail,
      currentEmail,
    ]);

    return res.status(200).json({ message: 'Email updated successfully.' });
  } catch (err) {
    console.error('Error updating email:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/settings/password
// Update password for the authenticated user
router.put('/password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({
      error: 'Email, current password, and new password are required.',
    });
  }

  try {
    const result = await pool.query(
      'SELECT user_id, password_hash FROM user_account WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { user_id, password_hash } = result.rows[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash the new password
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE user_account SET password_hash = $1 WHERE user_id = $2',
      [newHash, user_id]
    );

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Error updating password:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/users/:email
router.delete('/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id FROM user_account WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete user
    await pool.query('DELETE FROM job_table WHERE email = $1', [email]);
    await pool.query('DELETE FROM resume_table WHERE email = $1', [email]);
    await pool.query('DELETE FROM user_account WHERE email = $1', [email]);

    return res.status(200).json({ message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('Error deleting account:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
