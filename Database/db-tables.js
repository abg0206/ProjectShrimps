require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./global-bundle.pem', 'utf8'),
  },
});

async function main() {
  try {
    await client.connect();

    // Check existing tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);

    console.log("Existing tables:", result.rows);


    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_enum') THEN
          CREATE TYPE skill_enum AS ENUM (
            'Python',
            'Java',
          );
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profile (
        email VARCHAR(255) PRIMARY KEY,
        phone BIGINT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        summary TEXT,
        experience TEXT,
        skills skill_enum[],
        career_preferences TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_account (
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        clerk_id VARCHAR(255) NOT NULL UNIQUE,
        CONSTRAINT fk_user_profile
          FOREIGN KEY (email)
          REFERENCES user_profile(email)
          ON DELETE CASCADE
      );
    `);

    console.log('Tables created successfully');
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

main();