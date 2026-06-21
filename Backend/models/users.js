const express = require('express');
const bcrypt = require('bcrypt');

// Routes are mounted at /api in server.js, so paths here are relative to that.
module.exports = function usersRouter(pool) {
  const router = express.Router();

  // Login api
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await pool.query(
        `SELECT email, clerk_id, password_hash FROM user_account WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'No account found for that email' });
      }

      const account = result.rows[0];

      const validPassword = await bcrypt.compare(password, account.password_hash);

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

  // Register api
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

  // full user info (profile + account join)
  router.get('/user/:email', async (req, res) => {
    try {
      const { email } = req.params;

      const result = await pool.query(
        `SELECT
           up.email,
           up.phone,
           up.first_name,
           up.last_name,
           up.summary,
           up.experience,
           up.skills,
           up.career_preferences,
           up.profile_picture_url,
           ua.clerk_id
         FROM user_profile up
         JOIN user_account ua ON up.email = ua.email
         WHERE up.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Get user error:', err);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  return router;
};
