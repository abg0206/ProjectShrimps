require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const cors = require('cors');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./repoConnect.pem', 'utf8'),
  },
});

// Server running check
app.get('/', (req, res) => {
  res.json({
    message: 'Server is running',
  });
});

// Login api
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await pool.query(
      `
      SELECT email, password_hash, clerk_id
      FROM user_account
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    const account = result.rows[0];

    const validPassword = await bcrypt.compare(password, account.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    res.status(200).json({
      success: true,
      email: account.email,
      clerkId: account.clerk_id,
    });
  } catch (err) {
    console.error('Login error:', err);

    res.status(500).json({
      error: 'Login failed',
    });
  }
});

// Create register api
app.post('/register', async (req, res) => {
  try {
    const { email, password, clerk_id } = req.body;

    if (!email || !password || !clerk_id) {
      return res.status(400).json({
        error: 'email, password, and clerk_id are required',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO user_account
      (
        email,
        password_hash,
        clerk_id
      )
      VALUES ($1, $2, $3)
      RETURNING email, clerk_id
      `,
      [email, passwordHash, clerk_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create account error:', err);

    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Account already exists',
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Email does not exist',
      });
    }

    res.status(500).json({
      error: 'Failed to create account',
    });
  }
});

// Get User Profile api (returns first, last, and profile pic)
app.get('/profile/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      `
      SELECT
        first_name,
        last_name,
        profile_picture_url
      FROM user_profile
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Profile not found',
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Get profile error:', err);

    res.status(500).json({
      error: 'Failed to fetch profile',
    });
  }
});

// All Profile (gets all user info for profile page)
app.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      `
      SELECT
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
      JOIN user_account ua
        ON up.email = ua.email
      WHERE up.email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);

    res.status(500).json({
      error: 'Failed to fetch user',
    });
  }
});

// Test Database Connection
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      connected: true,
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      connected: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
