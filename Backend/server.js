require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(__dirname + '/repoConnect.pem').toString(),
  },
});

// Server running check
app.get('/api/', (req, res) => {
  res.json({ message: 'Server is running' });
});

//Database connection test
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ connected: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Login api
app.post('/api/login', async (req, res) => {
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
app.post('/api/register', async (req, res) => {
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

// GET /profile/:email — fetch all profile fields for the profile page
app.get('/api/profile/:email', async (req, res) => {
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

// create or update profile fields
app.put('/api/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { first_name, last_name, phone, summary } = req.body;

    if (!first_name || !last_name) {
      return res
        .status(400)
        .json({ error: 'first_name and last_name are required' });
    }

    const phoneValue = phone ? Number(String(phone).replace(/\D/g, '')) || null : null;

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

// full user info (profile + account join)
app.get('/api/user/:email', async (req, res) => {
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

// all active jobs for a user
app.get('/api/jobs/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      `SELECT unique_num AS id, title, company, description, stages AS status, created_at
       FROM job_table
       WHERE email = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC`,
      [email]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// add a new job
app.post('/api/jobs/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { title, company, description } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ error: 'title, company, and description are required' });
    }

    const result = await pool.query(
      `INSERT INTO job_table (email, title, company, description, stages)
       VALUES ($1, $2, $3, $4, '0')
       RETURNING unique_num AS id, title, company, description, stages AS status, created_at`,
      [email, title, company, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add job error:', err);
    res.status(500).json({ error: 'Failed to add job' });
  }
});

//  update job status (stage)
app.put('/api/jobs/:email/:id', async (req, res) => {
  try {
    const { email, id } = req.params;
    const { stages, title, company, description } = req.body;

    const validStages = ['0', '1', '2', '3', '4', '5'];
    if (!validStages.includes(stages)) {
      return res.status(400).json({ error: 'stages must be 0–4' });
    }

    const result = await pool.query(
      `UPDATE job_table
       SET stages = $1,
           title = COALESCE($4, title),
           company = COALESCE($5, company),
           description = COALESCE($6, description)
       WHERE unique_num = $2 AND email = $3 AND is_deleted = FALSE
       RETURNING unique_num AS id, title, company, description, stages AS status, created_at`,
      [stages, id, email, title ?? null, company ?? null, description ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

//  soft delete a job
app.delete('/api/jobs/:email/:id', async (req, res) => {
  try {
    const { email, id } = req.params;

    const result = await pool.query(
      `UPDATE job_table
       SET is_deleted = TRUE
       WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE
       RETURNING unique_num AS id`,
      [id, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ success: true, deleted: result.rows[0].id });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

//start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
