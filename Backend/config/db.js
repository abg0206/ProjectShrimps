import 'dotenv/config';
import { Pool } from 'pg';

console.log('DB_HOST:', process.env.DB_HOST);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
