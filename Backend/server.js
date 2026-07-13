require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const cors = require('cors');

const logger = require('./Services/logger');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');

const usersRouter = require('./routes/users');
const profileRouter = require('./routes/profile');
const jobsRouter = require('./routes/jobs');
const settingsRouter = require('./routes/settings');
const aiRouter = require('./routes/ai');
const analyticsRouter = require('./routes/analytics'); //analytics
const documentsRouter = require('./routes/documents');
const app = express();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(requestId);

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
app.use('/api/settings', settingsRouter);
app.use('/api/users', settingsRouter);
app.use('/api/ai', aiRouter(pool));
app.use('/api/analytics', analyticsRouter(pool)); //analytics router mounted here
app.use('/api', documentsRouter(pool));

// Must be registered LAST, after every route above, so it catches errors
// from any of them and logs to Backend/logs/.
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled rejection', reason });
});
process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception', stack: err.stack });
});

// start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info({ message: `Server running on port ${PORT}` });
});
