require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const cors = require('cors');

const usersRouter = require('./routes/users');
const profileRouter = require('./routes/profile');
const jobsRouter = require('./routes/jobs');

const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// PostgreSQL Connection Pool
const isLocal = process.env.NODE_ENV === 'development';
const sslConfig = isLocal
  ? false
  : {
      rejectUnauthorized: false,
      ca: fs.readFileSync(__dirname + '/repoConnect.pem').toString(),
    };

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: sslConfig,
});

// Server running check
app.get('/api/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Database connection test
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ connected: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Feature routers
app.use('/api', usersRouter(pool));
app.use('/api', profileRouter(pool));
app.use('/api', jobsRouter(pool));

// start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
