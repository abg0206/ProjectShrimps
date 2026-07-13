const express = require('express');

module.exports = function (pool) {
  const router = express.Router();

  // S3-BR-001: only these two document business types exist.
  const DOC_TYPES = ['resume', 'cover_letter'];
  // S3-BR-004 / S3-BR-006: the only formats the system will accept on
  // upload or hand back on download/export.
  const ALLOWED_FORMATS = ['pdf', 'docx', 'txt'];
  // S3-002: document workflow status, independent of the S3-BR-009
  // archive/restore flag (is_archived).
  const ALLOWED_STATUSES = ['draft', 'final'];

  // Maps the URL-friendly path segment ("cover-letter") to the DB enum
  // value ("cover_letter") used everywhere else.
  const urlToDocType = (seg) =>
    seg === 'cover-letter' ? 'cover_letter' : seg === 'resume' ? 'resume' : null;

  const DOCUMENT_COLUMNS = `
    d.document_id AS id,
    d.doc_type,
    d.title,
    d.status,
    d.tags,
    d.is_archived,
    d.created_at,
    d.updated_at,
    v.version_id AS current_version_id,
    v.version_number AS current_version_number,
    v.file_format AS current_file_format,
    v.original_filename AS current_original_filename,
    v.created_at AS current_version_created_at,
    jdl.job_id AS linked_job_id,
    j.title AS linked_job_title,
    j.company AS linked_job_company
  `;

  // S3-BR-013: a document can be attached to at most one job (the
  // job_document_link.document_id UNIQUE constraint enforces this at the DB
  // level), so this join can never fan a document out into multiple rows.
  const DOCUMENT_FROM = `
    FROM document_table d
    LEFT JOIN document_version_table v ON v.version_id = d.current_version_id
    LEFT JOIN job_document_link jdl ON jdl.document_id = d.document_id
    LEFT JOIN job_table j ON j.unique_num = jdl.job_id
  `;

  // S3-BR-004 / S3-BR-005: reject unsupported formats (or a filename whose
  // extension disagrees with the declared format) with a clear message.
  function validateFormat(file_format, original_filename) {
    if (!file_format || !ALLOWED_FORMATS.includes(file_format)) {
      return `file_format must be one of: ${ALLOWED_FORMATS.join(', ')}`;
    }
    if (original_filename) {
      const ext = String(original_filename).split('.').pop()?.toLowerCase();
      if (ext !== file_format) {
        return `File extension ".${ext}" does not match declared format "${file_format}"`;
      }
    }
    return null;
  }

  function validateTags(tags) {
    if (tags === undefined) return null;
    if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
      return 'tags must be an array of strings';
    }
    return null;
  }

  // ===================================================================
  // Documents: list / read (S3-001, S3-006)
  // ===================================================================

  // GET /documents/:email — the user's global document library.
  // Supports filtering by type, status, and tag, plus sorting — S3-006.
  router.get('/documents/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const { doc_type, status, tag, search, sort } = req.query;

      // S3-BR-002: every query is scoped to the requesting user's email.
      const conditions = ['d.email = $1', 'd.is_archived = FALSE'];
      const params = [email];
      let paramIndex = 2;

      if (doc_type) {
        // S3-BR-001: only resume / cover_letter are valid library types.
        if (!DOC_TYPES.includes(doc_type)) {
          return res
            .status(400)
            .json({ error: `doc_type must be one of: ${DOC_TYPES.join(', ')}` });
        }
        conditions.push(`d.doc_type = $${paramIndex}::document_type_enum`);
        params.push(doc_type);
        paramIndex++;
      }

      if (status) {
        if (!ALLOWED_STATUSES.includes(status)) {
          return res
            .status(400)
            .json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        }
        conditions.push(`d.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      if (tag && tag.trim()) {
        // jsonb containment: does the tags array include this tag?
        conditions.push(`d.tags @> $${paramIndex}::jsonb`);
        params.push(JSON.stringify([tag.trim()]));
        paramIndex++;
      }

      if (search && search.trim()) {
        conditions.push(`d.title ILIKE $${paramIndex}`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      const SORT_MAP = {
        newest: 'd.updated_at DESC',
        oldest: 'd.updated_at ASC',
        title: 'd.title ASC',
        type: 'd.doc_type ASC',
        status: 'd.status ASC',
      };
      const orderBy = SORT_MAP[sort] ?? 'd.updated_at DESC';

      const result = await pool.query(
        `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM}
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${orderBy}`,
        params
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Get documents error:', err);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  // GET /documents/:email/archived — archived documents for a user
  router.get('/documents/:email/archived', async (req, res) => {
    try {
      const { email } = req.params;

      const result = await pool.query(
        `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM}
         WHERE d.email = $1 AND d.is_archived = TRUE
         ORDER BY d.updated_at DESC`,
        [email]
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Get archived documents error:', err);
      res.status(500).json({ error: 'Failed to fetch archived documents' });
    }
  });

  // GET /documents/:email/:id — single document (metadata + current version)
  router.get('/documents/:email/:id', async (req, res) => {
    try {
      const { email, id } = req.params;

      const result = await pool.query(
        `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM}
         WHERE d.document_id = $1 AND d.email = $2`,
        [id, email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Get document error:', err);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  // ===================================================================
  // Documents: create (implicitly creates version 1)
  // ===================================================================

  // POST /documents/:email — create a new document with its first version
  router.post('/documents/:email', async (req, res) => {
    const client = await pool.connect();

    try {
      const { email } = req.params;
      const { doc_type, title, status, tags, file_format, original_filename, content } =
        req.body;

      if (!doc_type || !DOC_TYPES.includes(doc_type)) {
        return res
          .status(400)
          .json({ error: `doc_type must be one of: ${DOC_TYPES.join(', ')}` }); // S3-BR-001
      }
      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'content is required' });
      }
      if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      }
      const tagsError = validateTags(tags);
      if (tagsError) {
        return res.status(400).json({ error: tagsError });
      }
      const formatError = validateFormat(file_format, original_filename);
      if (formatError) {
        return res.status(400).json({ error: formatError }); // S3-BR-005
      }

      await client.query('BEGIN');

      const doc = await client.query(
        `INSERT INTO document_table (email, doc_type, title, status, tags)
         VALUES ($1, $2::document_type_enum, $3, $4, $5::jsonb)
         RETURNING document_id`,
        [
          email,
          doc_type,
          title?.trim() || (doc_type === 'resume' ? 'Untitled Resume' : 'Untitled Cover Letter'),
          status || 'draft',
          JSON.stringify(tags || []),
        ]
      );
      const documentId = doc.rows[0].document_id;

      const version = await client.query(
        `INSERT INTO document_version_table
           (document_id, version_number, email, file_format, original_filename, content, file_size_bytes)
         VALUES ($1, 1, $2, $3::file_format_enum, $4, $5, $6)
         RETURNING version_id`,
        [
          documentId,
          email,
          file_format,
          original_filename,
          content,
          Buffer.byteLength(String(content), 'utf8'),
        ]
      );

      await client.query(
        `UPDATE document_table SET current_version_id = $1 WHERE document_id = $2`,
        [version.rows[0].version_id, documentId]
      );

      await client.query('COMMIT');

      const created = await pool.query(
        `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM} WHERE d.document_id = $1`,
        [documentId]
      );

      res.status(201).json(created.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Create document error:', err);
      res.status(500).json({ error: 'Failed to create document' });
    } finally {
      client.release();
    }
  });

  // PATCH /documents/:email/:id — update metadata: title (rename), status,
  // and/or tags. Content is intentionally NOT editable here: per
  // S3-BR-007, changing document content can only happen through the
  // explicit /versions endpoint below.
  router.patch('/documents/:email/:id', async (req, res) => {
    try {
      const { email, id } = req.params;
      const { title, status, tags } = req.body;

      if (title === undefined && status === undefined && tags === undefined) {
        return res
          .status(400)
          .json({ error: 'At least one of title, status, tags is required' });
      }
      if (title !== undefined && !title.trim()) {
        return res.status(400).json({ error: 'title cannot be empty' });
      }
      if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
      }
      const tagsError = validateTags(tags);
      if (tagsError) {
        return res.status(400).json({ error: tagsError });
      }

      const result = await pool.query(
        `UPDATE document_table
         SET title      = COALESCE($1, title),
             status     = COALESCE($2, status),
             tags       = COALESCE($3::jsonb, tags),
             updated_at = NOW()
         WHERE document_id = $4 AND email = $5
         RETURNING document_id AS id`,
        [
          title?.trim() ?? null,
          status ?? null,
          tags !== undefined ? JSON.stringify(tags) : null,
          id,
          email,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const updated = await pool.query(
        `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM} WHERE d.document_id = $1`,
        [id]
      );

      res.status(200).json(updated.rows[0]);
    } catch (err) {
      console.error('Update document error:', err);
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

  // POST /documents/:email/:id/duplicate — clone a document as a brand new
  // library artifact (S3-007). The clone gets its own document_id and a
  // fresh version 1, sourced from the original's current version content;
  // it does NOT share version history with the source (each artifact's
  // history stays independently auditable per S3-BR-007/S3-BR-008).
  router.post('/documents/:email/:id/duplicate', async (req, res) => {
    const client = await pool.connect();
    try {
      const { email, id } = req.params;
      const { title } = req.body;

      await client.query('BEGIN');

      const source = await client.query(
        `SELECT d.doc_type, d.title, d.status, d.tags,
                v.file_format, v.original_filename, v.content
         FROM document_table d
         LEFT JOIN document_version_table v ON v.version_id = d.current_version_id
         WHERE d.document_id = $1 AND d.email = $2`,
        [id, email]
      );
      if (source.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Document not found' });
      }
      const src = source.rows[0];
      if (!src.content) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Source document has no version to duplicate' });
      }

      const newDoc = await client.query(
        `INSERT INTO document_table (email, doc_type, title, status, tags)
         VALUES ($1, $2, $3, 'draft', $4::jsonb)
         RETURNING document_id`,
        [email, src.doc_type, title?.trim() || `${src.title} (Copy)`, JSON.stringify(src.tags)]
      );
      const newDocumentId = newDoc.rows[0].document_id;

      const newVersion = await client.query(
        `INSERT INTO document_version_table
           (document_id, version_number, email, file_format, original_filename, content, file_size_bytes)
         VALUES ($1, 1, $2, $3, $4, $5, $6)
         RETURNING version_id`,
        [
          newDocumentId,
          email,
          src.file_format,
          src.original_filename,
          src.content,
          Buffer.byteLength(src.content, 'utf8'),
        ]
      );

      await client.query(
        `UPDATE document_table SET current_version_id = $1 WHERE document_id = $2`,
        [newVersion.rows[0].version_id, newDocumentId]
      );

      await client.query('COMMIT');

      const created = await pool.query(
        `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_FROM} WHERE d.document_id = $1`,
        [newDocumentId]
      );

      res.status(201).json(created.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Duplicate document error:', err);
      res.status(500).json({ error: 'Failed to duplicate document' });
    } finally {
      client.release();
    }
  });

  // ===================================================================
  // Versioning (S3-BR-007, S3-BR-008)
  // ===================================================================

  // GET /documents/:email/:id/versions — full version history
  router.get('/documents/:email/:id/versions', async (req, res) => {
    try {
      const { email, id } = req.params;

      const doc = await pool.query(
        `SELECT document_id FROM document_table WHERE document_id = $1 AND email = $2`,
        [id, email]
      );
      if (doc.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const result = await pool.query(
        `SELECT version_id AS id, version_number, email AS created_by,
                file_format, original_filename, created_at
         FROM document_version_table
         WHERE document_id = $1
         ORDER BY version_number DESC`,
        [id]
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Get version history error:', err);
      res.status(500).json({ error: 'Failed to fetch version history' });
    }
  });

  // GET /documents/:email/:id/versions/:versionId — a single version (content included)
  router.get('/documents/:email/:id/versions/:versionId', async (req, res) => {
    try {
      const { email, id, versionId } = req.params;

      const result = await pool.query(
        `SELECT v.version_id AS id, v.version_number, v.email AS created_by,
                v.file_format, v.original_filename, v.content, v.created_at
         FROM document_version_table v
         JOIN document_table d ON d.document_id = v.document_id
         WHERE v.version_id = $1 AND v.document_id = $2 AND d.email = $3`,
        [versionId, id, email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Version not found' });
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Get version error:', err);
      res.status(500).json({ error: 'Failed to fetch version' });
    }
  });

  // POST /documents/:email/:id/versions — explicitly create a new version.
  // This is the ONLY way document content changes (S3-BR-007).
  router.post('/documents/:email/:id/versions', async (req, res) => {
    const client = await pool.connect();

    try {
      const { email, id } = req.params;
      const { file_format, original_filename, content } = req.body;

      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'content is required' });
      }
      const formatError = validateFormat(file_format, original_filename);
      if (formatError) {
        return res.status(400).json({ error: formatError }); // S3-BR-005
      }

      await client.query('BEGIN');

      const doc = await client.query(
        `SELECT document_id, is_archived FROM document_table
         WHERE document_id = $1 AND email = $2
         FOR UPDATE`,
        [id, email]
      );
      if (doc.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Document not found' });
      }
      if (doc.rows[0].is_archived) {
        await client.query('ROLLBACK');
        return res
          .status(409)
          .json({ error: 'Cannot add a version to an archived document. Restore it first.' });
      }

      const maxVersion = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) AS max FROM document_version_table WHERE document_id = $1`,
        [id]
      );
      const nextVersion = Number(maxVersion.rows[0].max) + 1;

      const version = await client.query(
        `INSERT INTO document_version_table
           (document_id, version_number, email, file_format, original_filename, content, file_size_bytes)
         VALUES ($1, $2, $3, $4::file_format_enum, $5, $6, $7)
         RETURNING version_id, version_number, created_at`,
        [
          id,
          nextVersion,
          email,
          file_format,
          original_filename,
          content,
          Buffer.byteLength(String(content), 'utf8'),
        ]
      );

      await client.query(
        `UPDATE document_table SET current_version_id = $1, updated_at = NOW() WHERE document_id = $2`,
        [version.rows[0].version_id, id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        id: version.rows[0].version_id,
        version_number: version.rows[0].version_number,
        created_at: version.rows[0].created_at,
        created_by: email,
        file_format,
        original_filename,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Create version error:', err);
      res.status(500).json({ error: 'Failed to create version' });
    } finally {
      client.release();
    }
  });

  // POST /documents/:email/:id/versions/:versionId/restore — make an older
  // version current again. This itself is recorded as a new version entry
  // so the history stays append-only and fully auditable.
  router.post(
    '/documents/:email/:id/versions/:versionId/restore',
    async (req, res) => {
      const client = await pool.connect();
      try {
        const { email, id, versionId } = req.params;

        await client.query('BEGIN');

        const source = await client.query(
          `SELECT v.file_format, v.original_filename, v.content
           FROM document_version_table v
           JOIN document_table d ON d.document_id = v.document_id
           WHERE v.version_id = $1 AND v.document_id = $2 AND d.email = $3
           FOR UPDATE`,
          [versionId, id, email]
        );
        if (source.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Version not found' });
        }

        const maxVersion = await client.query(
          `SELECT COALESCE(MAX(version_number), 0) AS max FROM document_version_table WHERE document_id = $1`,
          [id]
        );
        const nextVersion = Number(maxVersion.rows[0].max) + 1;
        const { file_format, original_filename, content } = source.rows[0];

        const newVersion = await client.query(
          `INSERT INTO document_version_table
             (document_id, version_number, email, file_format, original_filename, content, file_size_bytes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING version_id, version_number, created_at`,
          [id, nextVersion, email, file_format, original_filename, content, Buffer.byteLength(content, 'utf8')]
        );

        await client.query(
          `UPDATE document_table SET current_version_id = $1, updated_at = NOW() WHERE document_id = $2`,
          [newVersion.rows[0].version_id, id]
        );

        await client.query('COMMIT');

        res.status(201).json({
          id: newVersion.rows[0].version_id,
          version_number: newVersion.rows[0].version_number,
          restored_from_version: Number(versionId),
          created_at: newVersion.rows[0].created_at,
          created_by: email,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Restore version error:', err);
        res.status(500).json({ error: 'Failed to restore version' });
      } finally {
        client.release();
      }
    }
  );

  // ===================================================================
  // Download / export (S3-BR-006)
  // ===================================================================

  // GET /documents/:email/:id/download — download the current (or a
  // specific) version in one of the supported output formats.
  router.get('/documents/:email/:id/download', async (req, res) => {
    try {
      const { email, id } = req.params;
      const { version, format } = req.query;

      if (format && !ALLOWED_FORMATS.includes(format)) {
        return res
          .status(400)
          .json({ error: `format must be one of: ${ALLOWED_FORMATS.join(', ')}` });
      }

      const params = [id, email];
      let versionClause = 'v.version_id = d.current_version_id';
      if (version) {
        versionClause = 'v.version_id = $3';
        params.push(version);
      }

      const result = await pool.query(
        `SELECT v.version_id, v.version_number, v.file_format, v.original_filename, v.content
         FROM document_table d
         JOIN document_version_table v ON v.document_id = d.document_id
         WHERE d.document_id = $1 AND d.email = $2 AND ${versionClause}`,
        params
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document or version not found' });
      }

      const row = result.rows[0];

      // We only serve back the format the version was stored in — no
      // on-the-fly conversion engine exists, so a mismatched request is
      // rejected rather than silently ignored.
      if (format && format !== row.file_format) {
        return res.status(400).json({
          error: `This version is stored as "${row.file_format}"; "${format}" export is not available for it.`,
        });
      }

      res.status(200).json({
        version_id: row.version_id,
        version_number: row.version_number,
        file_format: row.file_format,
        original_filename: row.original_filename,
        content: row.content,
      });
    } catch (err) {
      console.error('Download document error:', err);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  // ===================================================================
  // Archive / restore (S3-BR-009)
  // ===================================================================

  // POST /documents/:email/:id/archive
  router.post('/documents/:email/:id/archive', async (req, res) => {
    try {
      const { email, id } = req.params;

      // Archiving only flips a flag — document_version_table rows are
      // untouched, so full version history survives the archive/restore
      // cycle.
      const result = await pool.query(
        `UPDATE document_table
         SET is_archived = TRUE, updated_at = NOW()
         WHERE document_id = $1 AND email = $2 AND is_archived = FALSE
         RETURNING document_id AS id`,
        [id, email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found or already archived' });
      }

      res.status(200).json({ success: true, archived: result.rows[0].id });
    } catch (err) {
      console.error('Archive document error:', err);
      res.status(500).json({ error: 'Failed to archive document' });
    }
  });

  // POST /documents/:email/:id/restore
  router.post('/documents/:email/:id/restore', async (req, res) => {
    try {
      const { email, id } = req.params;

      const result = await pool.query(
        `UPDATE document_table
         SET is_archived = FALSE, updated_at = NOW()
         WHERE document_id = $1 AND email = $2 AND is_archived = TRUE
         RETURNING document_id AS id`,
        [id, email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Document not found or not archived' });
      }

      res.status(200).json({ success: true, restored: result.rows[0].id });
    } catch (err) {
      console.error('Restore document error:', err);
      res.status(500).json({ error: 'Failed to restore document' });
    }
  });

  // ===================================================================
  // Job <-> document linking (S3-BR-010, S3-BR-011, S3-BR-012)
  // ===================================================================

  // GET /jobs/:email/:jobId/documents — the resume + cover letter (if any)
  // currently linked to a job
  router.get('/jobs/:email/:jobId/documents', async (req, res) => {
    try {
      const { email, jobId } = req.params;

      const job = await pool.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [jobId, email]
      );
      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const result = await pool.query(
        `SELECT jdl.doc_type, jdl.document_id, jdl.version_id, jdl.linked_by, jdl.linked_at,
                d.title, d.status, d.tags, d.is_archived,
                v.version_number, v.file_format, v.original_filename
         FROM job_document_link jdl
         JOIN document_table d ON d.document_id = jdl.document_id
         LEFT JOIN document_version_table v ON v.version_id = jdl.version_id
         WHERE jdl.job_id = $1`,
        [jobId]
      );

      const links = { resume: null, cover_letter: null };
      for (const row of result.rows) links[row.doc_type] = row;

      res.status(200).json(links);
    } catch (err) {
      console.error('Get job documents error:', err);
      res.status(500).json({ error: 'Failed to fetch job documents' });
    }
  });

  // GET /jobs/:email/:jobId/documents/:docType/download — download the
  // version of a document currently linked to this job, without the
  // caller needing to already know its document_id (S3-005, S3-010: lets
  // the download workflow be driven from the job detail view as well as
  // the library view).
  router.get('/jobs/:email/:jobId/documents/:docTypeParam/download', async (req, res) => {
    try {
      const { email, jobId, docTypeParam } = req.params;

      const docType = urlToDocType(docTypeParam);
      if (!docType) {
        return res
          .status(400)
          .json({ error: 'Document type in URL must be "resume" or "cover-letter"' });
      }

      const job = await pool.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [jobId, email]
      );
      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const result = await pool.query(
        `SELECT v.version_id, v.version_number, v.file_format, v.original_filename, v.content
         FROM job_document_link jdl
         JOIN document_version_table v ON v.version_id = jdl.version_id
         JOIN document_table d ON d.document_id = jdl.document_id
         WHERE jdl.job_id = $1 AND jdl.doc_type = $2::document_type_enum AND d.email = $3`,
        [jobId, docType, email]
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ error: `No ${docType.replace('_', ' ')} is linked to this job` });
      }

      const row = result.rows[0];
      res.status(200).json({
        version_id: row.version_id,
        version_number: row.version_number,
        file_format: row.file_format,
        original_filename: row.original_filename,
        content: row.content,
      });
    } catch (err) {
      console.error('Download job document error:', err);
      res.status(500).json({ error: 'Failed to download job document' });
    }
  });

  // PUT /jobs/:email/:jobId/documents/:docType — link (or replace the link
  // for) a job's resume or cover letter. docType path segment is
  // "resume" or "cover-letter".
  //
  // S3-BR-010: PK(job_id, doc_type) on job_document_link means this is
  // always an upsert of a single row per type.
  // S3-BR-011: if a different document is already linked, the caller must
  // resend the request with { confirm: true } or it is rejected with 409.
  // S3-BR-012: both the job and the document are ownership-checked, and
  // the write happens in a transaction to keep the link consistent.
  router.put('/jobs/:email/:jobId/documents/:docTypeParam', async (req, res) => {
    const client = await pool.connect();
    try {
      const { email, jobId, docTypeParam } = req.params;
      const { document_id, confirm } = req.body;

      const docType = urlToDocType(docTypeParam);
      if (!docType) {
        return res
          .status(400)
          .json({ error: 'Document type in URL must be "resume" or "cover-letter"' }); // S3-BR-001
      }
      if (!document_id) {
        return res.status(400).json({ error: 'document_id is required' });
      }

      await client.query('BEGIN');

      const job = await client.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE FOR UPDATE`,
        [jobId, email]
      );
      if (job.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Job not found' }); // S3-BR-012
      }

      const document = await client.query(
        `SELECT document_id, doc_type, current_version_id, is_archived
         FROM document_table
         WHERE document_id = $1 AND email = $2`,
        [document_id, email]
      );
      if (document.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Document not found' }); // S3-BR-012 ownership check
      }
      if (document.rows[0].doc_type !== docType) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Document is a ${document.rows[0].doc_type}, not a ${docType}`,
        });
      }
      if (document.rows[0].is_archived) {
        await client.query('ROLLBACK');
        return res
          .status(409)
          .json({ error: 'Cannot link an archived document. Restore it first.' });
      }

      // S3-BR-013: a document may be attached to only one job at a time.
      // If it's currently attached elsewhere, detach it there first so the
      // move is atomic with the new link below.
      await client.query(
        `DELETE FROM job_document_link WHERE document_id = $1 AND job_id != $2`,
        [document_id, jobId]
      );

      const existingLink = await client.query(
        `SELECT document_id FROM job_document_link WHERE job_id = $1 AND doc_type = $2::document_type_enum FOR UPDATE`,
        [jobId, docType]
      );

      if (
        existingLink.rows.length > 0 &&
        Number(existingLink.rows[0].document_id) !== Number(document_id) &&
        !confirm
      ) {
        // S3-BR-011: replacing an existing link needs explicit confirmation.
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'A document of this type is already linked to this job. Resend with confirm: true to replace it.',
          requires_confirmation: true,
          currently_linked_document_id: existingLink.rows[0].document_id,
        });
      }

      await client.query(
        `INSERT INTO job_document_link (job_id, doc_type, document_id, version_id, linked_by)
         VALUES ($1, $2::document_type_enum, $3, $4, $5)
         ON CONFLICT (job_id, doc_type)
         DO UPDATE SET document_id = EXCLUDED.document_id,
                       version_id = EXCLUDED.version_id,
                       linked_by = EXCLUDED.linked_by,
                       linked_at = NOW()`,
        [jobId, docType, document_id, document.rows[0].current_version_id, email]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        job_id: Number(jobId),
        doc_type: docType,
        document_id: Number(document_id),
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Link document to job error:', err);
      res.status(500).json({ error: 'Failed to link document to job' });
    } finally {
      client.release();
    }
  });

  // DELETE /jobs/:email/:jobId/documents/:docType — unlink a job's resume
  // or cover letter (does not touch the document itself).
  router.delete('/jobs/:email/:jobId/documents/:docTypeParam', async (req, res) => {
    try {
      const { email, jobId, docTypeParam } = req.params;

      const docType = urlToDocType(docTypeParam);
      if (!docType) {
        return res
          .status(400)
          .json({ error: 'Document type in URL must be "resume" or "cover-letter"' });
      }

      const job = await pool.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [jobId, email]
      );
      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const result = await pool.query(
        `DELETE FROM job_document_link
         WHERE job_id = $1 AND doc_type = $2::document_type_enum
         RETURNING document_id`,
        [jobId, docType]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No document of this type linked to job' });
      }

      res.status(200).json({ success: true, unlinked_document_id: result.rows[0].document_id });
    } catch (err) {
      console.error('Unlink document from job error:', err);
      res.status(500).json({ error: 'Failed to unlink document from job' });
    }
  });

  return router;
};
