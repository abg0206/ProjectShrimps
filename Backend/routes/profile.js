const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  // GET /profile/:email — fetch all profile fields for the profile page
  router.get('/profile/:email', async (req, res) => {
    try {
      const { email } = req.params;

      const result = await pool.query(
        `SELECT
           first_name,
           last_name,
           phone,
           summary,
           profile_picture_url
         FROM user_profile
         WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  // PUT /profile/:email — create or update profile fields
  router.put('/profile/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const { first_name, last_name, phone, summary } = req.body;

      if (!first_name || !last_name) {
        return res
          .status(400)
          .json({ error: 'first_name and last_name are required' });
      }

      const phoneValue = phone
        ? Number(String(phone).replace(/\D/g, '')) || null
        : null;

      const result = await pool.query(
        `INSERT INTO user_profile (email, first_name, last_name, phone, summary)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email)
         DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name  = EXCLUDED.last_name,
           phone      = EXCLUDED.phone,
           summary    = EXCLUDED.summary
         RETURNING first_name, last_name, phone, summary`,
        [email, first_name, last_name, phoneValue, summary ?? null]
      );

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // GET /user/:email — full user info (profile + account join)
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