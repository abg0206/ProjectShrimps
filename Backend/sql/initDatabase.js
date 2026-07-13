require('dotenv').config();
const pool = require('../config/db');

// Migration for the Documents domain (S3-BR-001..012), plus company
// research fields and interview prep notes (S3-011, S3-012, S3-013).
// job_table and interview_table must already exist before this runs.
async function main() {
  try {
    // --- enums ---------------------------------------------------------
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type_enum') THEN
          CREATE TYPE document_type_enum AS ENUM ('resume', 'cover_letter');
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_format_enum') THEN
          CREATE TYPE file_format_enum AS ENUM ('pdf', 'docx', 'txt');
        END IF;
      END $$;
    `);

    // --- document (owning record) --------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_table (
        document_id        SERIAL PRIMARY KEY,
        email               VARCHAR(255) NOT NULL,
        doc_type            document_type_enum NOT NULL,
        title               VARCHAR(255) NOT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'draft',
        tags                jsonb NOT NULL DEFAULT '[]'::jsonb,
        current_version_id  INTEGER,
        is_archived         BOOLEAN DEFAULT FALSE,
        created_at          TIMESTAMP DEFAULT NOW(),
        updated_at          TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migration: add status/tags to document_table if the table pre-dates
    // this metadata model (S3-002).
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'document_table' AND column_name = 'status'
        ) THEN
          ALTER TABLE document_table ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'document_table' AND column_name = 'tags'
        ) THEN
          ALTER TABLE document_table ADD COLUMN tags jsonb NOT NULL DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    // Document workflow status is separate from is_archived (which is the
    // S3-BR-009 archive/restore lifecycle flag) — status tracks where the
    // document is in its editing workflow.
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_status'
        ) THEN
          ALTER TABLE document_table
          ADD CONSTRAINT chk_document_status
          CHECK (status IN ('draft', 'final'));
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_status
      ON document_table(status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_tags
      ON document_table USING GIN (tags);
    `);

    // --- document_version (history) -------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_version_table (
        version_id       SERIAL PRIMARY KEY,
        document_id       INTEGER NOT NULL,
        version_number    INTEGER NOT NULL,
        email             VARCHAR(255) NOT NULL,
        file_format       file_format_enum NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        content           TEXT NOT NULL,
        file_size_bytes   INTEGER,
        created_at        TIMESTAMP DEFAULT NOW(),
        UNIQUE (document_id, version_number)
      );
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_current_version'
        ) THEN
          ALTER TABLE document_table
          ADD CONSTRAINT fk_document_current_version
          FOREIGN KEY (current_version_id)
          REFERENCES document_version_table(version_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_version_document'
        ) THEN
          ALTER TABLE document_version_table
          ADD CONSTRAINT fk_version_document
          FOREIGN KEY (document_id)
          REFERENCES document_table(document_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // --- job <-> document link -------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_document_link (
        job_id      INTEGER NOT NULL,
        doc_type    document_type_enum NOT NULL,
        document_id INTEGER NOT NULL,
        version_id  INTEGER,
        linked_by   VARCHAR(255) NOT NULL,
        linked_at   TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (job_id, doc_type)
      );
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobdoclink_job'
        ) THEN
          ALTER TABLE job_document_link
          ADD CONSTRAINT fk_jobdoclink_job
          FOREIGN KEY (job_id)
          REFERENCES job_table(unique_num)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobdoclink_document'
        ) THEN
          ALTER TABLE job_document_link
          ADD CONSTRAINT fk_jobdoclink_document
          FOREIGN KEY (document_id)
          REFERENCES document_table(document_id)
          ON DELETE RESTRICT;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_jobdoclink_version'
        ) THEN
          ALTER TABLE job_document_link
          ADD CONSTRAINT fk_jobdoclink_version
          FOREIGN KEY (version_id)
          REFERENCES document_version_table(version_id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // S3-BR-013: a document may be attached to only one job at a time.
    // Older data could in theory have the same document linked to more
    // than one job (before this rule existed), so clear that out before
    // enforcing it — keep only the most recently linked row per document.
    await pool.query(`
      DELETE FROM job_document_link a
      USING job_document_link b
      WHERE a.document_id = b.document_id
        AND a.linked_at < b.linked_at;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_jobdoclink_document'
        ) THEN
          ALTER TABLE job_document_link
          ADD CONSTRAINT uq_jobdoclink_document
          UNIQUE (document_id);
        END IF;
      END $$;
    `);

    // --- indexes ----------------------------------------------------------
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_email
      ON document_table(email);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_document_email_type
      ON document_table(email, doc_type);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_version_document_id
      ON document_version_table(document_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_jobdoclink_document_id
      ON job_document_link(document_id);
    `);

    console.log('Document tables created successfully');

    // --- company research (S3-011 input UX / S3-012 persistence) -------
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'job_table' AND column_name = 'company_research_context'
        ) THEN
          ALTER TABLE job_table ADD COLUMN company_research_context TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'job_table' AND column_name = 'company_research_notes'
        ) THEN
          ALTER TABLE job_table ADD COLUMN company_research_notes TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'job_table' AND column_name = 'company_research_updated_at'
        ) THEN
          ALTER TABLE job_table ADD COLUMN company_research_updated_at TIMESTAMP;
        END IF;
      END $$;
    `);

    // --- interview prep notes (S3-013) ----------------------------------
    // Structured prep notes per interview. "category" gives the structure
    // (e.g. 'company_overview', 'questions_to_ask', 'talking_points',
    // 'technical_prep') while staying flexible enough for the UI to define
    // its own set of sections without another migration.
    // S3-BR-003: created_at / updated_at give an audit trail for actions.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_prep_notes (
        prep_note_id SERIAL PRIMARY KEY,
        interview_id INTEGER NOT NULL,
        category     VARCHAR(50) NOT NULL DEFAULT 'general',
        content      TEXT NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_prepnotes_interview'
        ) THEN
          ALTER TABLE interview_prep_notes
          ADD CONSTRAINT fk_prepnotes_interview
          FOREIGN KEY (interview_id)
          REFERENCES interview_table(interview_id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_prepnotes_interview_id
      ON interview_prep_notes(interview_id);
    `);

    console.log(
      'Company research columns and interview_prep_notes table created successfully'
    );
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();