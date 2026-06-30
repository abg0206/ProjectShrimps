require('dotenv').config();
const pool = require('../config/db');

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
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_enum') THEN
          CREATE TYPE skill_enum AS ENUM ('Python', 'Java');
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_stage_enum') THEN
          CREATE TYPE job_stage_enum AS ENUM ('0','1','2','3','4','5');
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = 'job_stage_enum'::regtype AND enumlabel = '5'
        ) THEN
          ALTER TYPE job_stage_enum ADD VALUE '5';
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_type_enum') THEN
          CREATE TYPE interview_type_enum AS ENUM (
            'Phone',
            'Technical',
            'Onsite',
            'HR',
            'Other'
          );
        END IF;
      END $$;
    `);

    //tables logic

    //User profile
    //User account
    await pool.query(`
   CREATE TABLE IF NOT EXISTS user_account (
     user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     clerk_id       VARCHAR(255) UNIQUE NOT NULL,
     email          VARCHAR(255) UNIQUE NOT NULL,
     email_verified BOOLEAN DEFAULT FALSE,
     password_hash  VARCHAR(255),
     created_at     TIMESTAMP DEFAULT NOW()
   );
 `);

    // Migration: add password_hash to user_account if missing
    await pool.query(`
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'user_account' AND column_name = 'password_hash'
     ) THEN
       ALTER TABLE user_account ADD COLUMN password_hash VARCHAR(255);
     END IF;
   END $$;
 `);

    //User profile
    await pool.query(`
   CREATE TABLE IF NOT EXISTS user_profile (
     user_id        UUID REFERENCES user_account(user_id) ON DELETE CASCADE,
     email               VARCHAR(255) PRIMARY KEY,
     phone               BIGINT NOT NULL,
     first_name          VARCHAR(100) NOT NULL,
     last_name           VARCHAR(101) NOT NULL,
     summary             TEXT,
     experience          TEXT,
     skills              skill_enum[],
     career_preferences  TEXT,
     profile_picture_url VARCHAR(255)
   );
 `);

    // --- Migration: bring user_profile up to date with the Profile page ---
    // skills used to be a skill_enum[] limited to 'Python'/'Java'. The UI lets
    // users type any skill string, so we convert it to jsonb to store an
    // arbitrary array of strings. experience was TEXT; the UI now sends an
    // array of structured experience entries, so it becomes jsonb too.
    // education, and the four separate career-preference fields, never
    // existed as columns at all — they're added here.

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile'
            AND column_name = 'skills'
            AND udt_name = '_skill_enum'
        ) THEN
          ALTER TABLE user_profile
          ALTER COLUMN skills TYPE jsonb
          USING (
            CASE
              WHEN skills IS NULL THEN '[]'::jsonb
              ELSE to_jsonb(skills::text[])
            END
          );
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'skills'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile'
            AND column_name = 'experience'
            AND data_type = 'text'
        ) THEN
          ALTER TABLE user_profile
          ALTER COLUMN experience TYPE jsonb
          USING (
            CASE
              WHEN experience IS NULL OR experience = '' THEN '[]'::jsonb
              ELSE '[]'::jsonb
            END
          );
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'experience'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN experience jsonb DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'education'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN education jsonb DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'target_role'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN target_role VARCHAR(255);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'location_preference'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN location_preference VARCHAR(255);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'work_mode_preference'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN work_mode_preference VARCHAR(50);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_profile' AND column_name = 'salary_expectation'
        ) THEN
          ALTER TABLE user_profile ADD COLUMN salary_expectation VARCHAR(100);
        END IF;
      END $$;
    `);
    // --- end user_profile migration ---

    await pool.query(`
       CREATE TABLE IF NOT EXISTS job_table (
         unique_num  SERIAL PRIMARY KEY,
         email       VARCHAR(255) NOT NULL,
         company     VARCHAR(255) NOT NULL,
         title       VARCHAR(255) NOT NULL,
         description TEXT NOT NULL,
         stages      job_stage_enum NOT NULL DEFAULT '0',
         is_deleted  BOOLEAN DEFAULT FALSE,
         created_at  TIMESTAMP DEFAULT NOW()
       );
     `);

    await pool.query(`
       DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'job_table' AND column_name = 'email'
         ) THEN
           ALTER TABLE job_table ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '';
         END IF;
 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'job_table' AND column_name = 'created_at'
         ) THEN
           ALTER TABLE job_table ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
         END IF;

         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'job_table' AND column_name = 'recruiter_notes'
         ) THEN
           ALTER TABLE job_table ADD COLUMN recruiter_notes TEXT;
         END IF;

         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'job_table' AND column_name = 'reminder_text'
         ) THEN
           ALTER TABLE job_table ADD COLUMN reminder_text VARCHAR(255);
         END IF;

         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'job_table' AND column_name = 'reminder_date'
         ) THEN
           ALTER TABLE job_table ADD COLUMN reminder_date DATE;
         END IF;
       END $$;
     `);

    await pool.query(`
       CREATE TABLE IF NOT EXISTS resume_table (
         experience_id SERIAL PRIMARY KEY,
         email         VARCHAR(255),
         title         VARCHAR(255),
         content       TEXT,
         other_links   TEXT,
         linkedin      VARCHAR(255),
         education     TEXT,
         summary       TEXT,
         created_at    TIMESTAMP DEFAULT NOW()
       );
     `);

    await pool.query(`
       DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'resume_table' AND column_name = 'title'
         ) THEN
           ALTER TABLE resume_table ADD COLUMN title VARCHAR(255);
         END IF;

         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'resume_table' AND column_name = 'content'
         ) THEN
           ALTER TABLE resume_table ADD COLUMN content TEXT;
         END IF;

         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_name = 'resume_table' AND column_name = 'created_at'
         ) THEN
           ALTER TABLE resume_table ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
         END IF;
       END $$;
     `);

    await pool.query(`
       CREATE TABLE IF NOT EXISTS job_resume (
         job_id    INTEGER NOT NULL,
         resume_id INTEGER NOT NULL,
         PRIMARY KEY (job_id, resume_id)
       );
     `);

    await pool.query(`
       CREATE TABLE IF NOT EXISTS cover_letter_table (
         cover_letter_id SERIAL PRIMARY KEY,
         email           VARCHAR(255),
         title           VARCHAR(255),
         content         TEXT,
         created_at      TIMESTAMP DEFAULT NOW()
       );
     `);

    await pool.query(`
       CREATE TABLE IF NOT EXISTS job_cover_letter (
         job_id          INTEGER NOT NULL,
         cover_letter_id INTEGER NOT NULL,
         PRIMARY KEY (job_id, cover_letter_id)
       );
     `);

    await pool.query(`
  CREATE TABLE IF NOT EXISTS interview_table (
    interview_id   SERIAL PRIMARY KEY,
    job_id         INTEGER NOT NULL,
    interview_type interview_type_enum NOT NULL DEFAULT 'Other',
    scheduled_at   TIMESTAMP,
    reminder_at    TIMESTAMP,
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT NOW()
  );
`);

    // Migration: the frontend's round-type options ('First Round', 'Virtual',
    // 'Final', etc.) don't match interview_type_enum, so store them as free
    // text instead of forcing them through that enum.
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'interview_table' AND column_name = 'round_type'
        ) THEN
          ALTER TABLE interview_table ADD COLUMN round_type VARCHAR(100);
        END IF;
      END $$;
    `);
    await pool.query(`
  CREATE TABLE IF NOT EXISTS stage_history (
    history_id SERIAL PRIMARY KEY,
    job_id     INTEGER NOT NULL,
    stage      job_stage_enum NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW()
  );
`);

    // Stage history to Job
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_stagehistory_job'
        ) THEN
          ALTER TABLE stage_history
          ADD CONSTRAINT fk_stagehistory_job
          FOREIGN KEY (job_id)
          REFERENCES job_table(unique_num)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stagehistory_job_id
      ON stage_history(job_id);
    `);

    //forein keys and indexes
    // Interview to Job
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_interview_job'
        ) THEN
          ALTER TABLE interview_table
          ADD CONSTRAINT fk_interview_job
          FOREIGN KEY (job_id)
          REFERENCES job_table(unique_num)
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    // JobResume & Job deleate
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobresume_job'
        ) THEN
          ALTER TABLE job_resume
          ADD CONSTRAINT fk_jobresume_job
          FOREIGN KEY (job_id)
          REFERENCES job_table(unique_num)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // JobResume & Resume deleate
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobresume_resume'
        ) THEN
          ALTER TABLE job_resume
          ADD CONSTRAINT fk_jobresume_resume
          FOREIGN KEY (resume_id)
          REFERENCES resume_table(experience_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // JobCoverLetter & Job deleate
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobcoverletter_job'
        ) THEN
          ALTER TABLE job_cover_letter
          ADD CONSTRAINT fk_jobcoverletter_job
          FOREIGN KEY (job_id)
          REFERENCES job_table(unique_num)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // JobCoverLetter & CoverLetter deleate
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobcoverletter_coverletter'
        ) THEN
          ALTER TABLE job_cover_letter
          ADD CONSTRAINT fk_jobcoverletter_coverletter
          FOREIGN KEY (cover_letter_id)
          REFERENCES cover_letter_table(cover_letter_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_company
      ON job_table(company);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_job_title
      ON job_table(title);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_job_id
      ON interview_table(job_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_resume_email
      ON resume_table(email);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cover_letter_email
      ON cover_letter_table(email);
    `);

    console.log('Tables created successfully');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
