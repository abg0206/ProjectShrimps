const express = require('express');
const bcrypt = require('bcrypt');

module.exports = function (pool) {
  const router = express.Router();

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: 'Email and password are required' });
      }

      const result = await pool.query(
        `SELECT email, clerk_id, password_hash FROM user_account WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res
          .status(401)
          .json({ error: 'No account found for that email' });
      }

      const account = result.rows[0];

      const validPassword = await bcrypt.compare(
        password,
        account.password_hash
      );

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      res.status(200).json({
        success: true,
        email: account.email,
        clerkId: account.clerk_id,
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { email, password, clerk_id } = req.body;

      if (!email || !password || !clerk_id) {
        return res
          .status(400)
          .json({ error: 'email, password, and clerk_id are required' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO user_account (email, password_hash, clerk_id)
         VALUES ($1, $2, $3)
         RETURNING email, clerk_id`,
        [email, passwordHash, clerk_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create account error:', err);

      if (err.code === '23505') {
        return res.status(409).json({ error: 'Account already exists' });
      }

      if (err.code === '23503') {
        return res.status(400).json({ error: 'Email does not exist' });
      }

      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  return router;
};
