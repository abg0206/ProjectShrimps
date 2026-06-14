import 'dotenv/config';

import pool from '../config/db';

async function main() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);

    console.log('Existing tables:', result.rows);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'skill_enum'
        ) THEN
          CREATE TYPE skill_enum AS ENUM (
            'Python',
            'Java'
          );
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        email VARCHAR(255) PRIMARY KEY,
        phone BIGINT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(101) NOT NULL,
        summary TEXT,
        experience TEXT,
        skills skill_enum[],
        career_preferences TEXT,
        profile_picture_url VARCHAR(255)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_account (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Tables created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
