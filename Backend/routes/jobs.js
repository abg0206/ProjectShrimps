const express = require('express');

module.exports = function (pool) {
  const router = express.Router();
  const VALID_STAGES = ['0', '1', '2', '3', '4', '5'];

  // GET /jobs/:email/archived - all archived jobs for a user
  router.get('/jobs/:email/archived', async (req, res) => {
    try {
      const { email } = req.params;
      const { search, sort } = req.query;

      const conditions = [
        'email = $1',
        'is_deleted = FALSE',
        "stages::text = '5'",
      ];
      const params = [email];
      let paramIndex = 2;

      if (search && search.trim()) {
        const keywords = search.trim().split(/\s+/).filter(Boolean);
        for (const keyword of keywords) {
          conditions.push(
            `(title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
          );
          params.push(`%${keyword}%`);
          paramIndex++;
        }
      }

      const SORT_MAP = {
        newest: 'created_at DESC',
        oldest: 'created_at ASC',
        company: 'company ASC',
        title: 'title ASC',
      };
      const orderBy = SORT_MAP[sort] ?? 'created_at DESC';

      const result = await pool.query(
        `SELECT unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes, reminder_text, reminder_date::text AS reminder_date
         FROM job_table
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${orderBy}`,
        params
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Get archived jobs error:', err);
      res.status(500).json({ error: 'Failed to fetch archived jobs' });
    }
  });
  // GET /jobs/:email — all active jobs for a user
  router.get('/jobs/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const { stage, search, sort } = req.query;

      // Build dynamic WHERE clauses
      const conditions = [
        'email = $1',
        'is_deleted = FALSE',
        "stages::text != '5'", // exclude archived by default unless explicitly filtered
      ];
      const params = [email];
      let paramIndex = 2;

      // Stage filter — override the default "exclude archived" if a specific stage is requested
      if (stage && VALID_STAGES.includes(stage)) {
        // Remove the default "stages != 5" and replace with exact match
        conditions.splice(2, 1, `stages = $${paramIndex}::job_stage_enum`);
        params.push(stage);
        paramIndex++;
      }

      // Search filter
      if (search && search.trim()) {
        const keywords = search.trim().split(/\s+/).filter(Boolean);
        for (const keyword of keywords) {
          conditions.push(
            `(title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
          );
          params.push(`%${keyword}%`);
          paramIndex++;
        }
      }

      // Sort order
      const SORT_MAP = {
        newest: 'created_at DESC',
        oldest: 'created_at ASC',
        company: 'company ASC',
        title: 'title ASC',
      };
      const orderBy = SORT_MAP[sort] ?? 'created_at DESC';

      const query = `
        SELECT unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes, reminder_text, reminder_date::text AS reminder_date
        FROM job_table
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderBy}
      `;

      const result = await pool.query(query, params);
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Get jobs error:', err);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  // POST /jobs/:email — add a new job
  router.post('/jobs/:email', async (req, res) => {
    try {
      const { email } = req.params;
      const { title, company, description, reminder_text, reminder_date } =
        req.body;

      if (!title || !company || !description) {
        return res
          .status(400)
          .json({ error: 'title, company, and description are required' });
      }

      if (reminder_date) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (String(reminder_date).slice(0, 10) < todayStr) {
          return res
            .status(400)
            .json({ error: 'Reminder date cannot be in the past.' });
        }
      }

      const result = await pool.query(
        `INSERT INTO job_table (email, title, company, description, stages, reminder_text, reminder_date)
         VALUES ($1, $2, $3, $4, '0', $5, $6)
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes, reminder_text, reminder_date::text AS reminder_date`,
        [
          email,
          title.trim(),
          company.trim(),
          description.trim(),
          reminder_text?.trim() || null,
          reminder_date || null,
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Add job error:', err);
      res.status(500).json({ error: 'Failed to add job' });
    }
  });

  // PUT /jobs/:email/:id — update a job's fields and/or stage
  router.put('/jobs/:email/:id', async (req, res) => {
    try {
      const { email, id } = req.params;
      const { stages, title, company, description, recruiter_notes, reminder_text, reminder_date } =
        req.body;

      if (stages !== undefined && !VALID_STAGES.includes(stages)) {
        return res
          .status(400)
          .json({ error: `stages must be one of: ${VALID_STAGES.join(', ')}` });
      }

      if (reminder_date) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (String(reminder_date).slice(0, 10) < todayStr) {
          return res
            .status(400)
            .json({ error: 'Reminder date cannot be in the past.' });
        }
      }

      // progression rules
      if (stages !== undefined) {
        const current = await pool.query(
          `SELECT stages::text AS status FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
          [id, email]
        );

        if (current.rows.length === 0) {
          return res.status(404).json({ error: 'Job not found' });
        }

        const currentStage = Number(current.rows[0].status);
        const newStage = Number(stages);
        const ARCHIVED = 5;

        const REJECTED = 4;

        const isValidMove =
          newStage === ARCHIVED ||           // always allowed
          newStage === REJECTED ||           // always allowed
          newStage === currentStage + 1;     // next stage in sequence

        if (!isValidMove) {
          return res.status(400).json({
            error: 'Can only advance one stage at a time, or move to Rejected/Archived.',
          });
        }
      }

      const result = await pool.query(
        `UPDATE job_table
         SET
           stages          = COALESCE($1::job_stage_enum, stages),
           title           = COALESCE($4, title),
           company         = COALESCE($5, company),
           description     = COALESCE($6, description),
           recruiter_notes = COALESCE($7, recruiter_notes),
           reminder_text   = COALESCE($8, reminder_text),
           reminder_date   = COALESCE($9::date, reminder_date)
         WHERE unique_num = $2 AND email = $3 AND is_deleted = FALSE
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes, reminder_text, reminder_date::text AS reminder_date`,
        [
          stages ?? null,
          id,
          email,
          title?.trim() ?? null,
          company?.trim() ?? null,
          description?.trim() ?? null,
          recruiter_notes ?? null,
          reminder_text ?? null,
          reminder_date || null,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (stages !== undefined) {
        await pool.query(
          `INSERT INTO stage_history (job_id, stage) VALUES ($1, $2::job_stage_enum)`,
          [id, stages]
        );
      }

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Update job error:', err);
      res.status(500).json({ error: 'Failed to update job' });
    }
  });

  // DELETE /jobs/:email/:id — soft delete a job
  router.delete('/jobs/:email/:id', async (req, res) => {
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

  // GET /jobs/:email/:id/history — stage history for a job
  router.get('/jobs/:email/:id/history', async (req, res) => {
    try {
      const { email, id } = req.params;

      const result = await pool.query(
        `SELECT sh.stage, sh.changed_at
         FROM stage_history sh
         JOIN job_table j ON j.unique_num = sh.job_id
         WHERE sh.job_id = $1 AND j.email = $2 AND j.is_deleted = FALSE
         ORDER BY sh.changed_at ASC`,
        [id, email]
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Get history error:', err);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // GET /jobs/:email/:id/interviews — list interviews for a job
  router.get('/jobs/:email/:id/interviews', async (req, res) => {
    try {
      const { email, id } = req.params;

      const result = await pool.query(
        `SELECT i.interview_id AS id, i.round_type, i.scheduled_at AS interview_date, i.notes
         FROM interview_table i
         JOIN job_table j ON j.unique_num = i.job_id
         WHERE i.job_id = $1 AND j.email = $2 AND j.is_deleted = FALSE
         ORDER BY i.scheduled_at ASC`,
        [id, email]
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Get interviews error:', err);
      res.status(500).json({ error: 'Failed to fetch interviews' });
    }
  });

  // POST /jobs/:email/:id/interviews — add an interview for a job
  router.post('/jobs/:email/:id/interviews', async (req, res) => {
    try {
      const { email, id } = req.params;
      const { round_type, interview_date, notes } = req.body;

      if (!round_type || !interview_date) {
        return res
          .status(400)
          .json({ error: 'round_type and interview_date are required' });
      }

      // Confirm the job exists and belongs to this email before inserting.
      const job = await pool.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const result = await pool.query(
        `INSERT INTO interview_table (job_id, round_type, scheduled_at, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING interview_id AS id, round_type, scheduled_at AS interview_date, notes`,
        [id, round_type, interview_date, notes?.trim() ?? null]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Add interview error:', err);
      res.status(500).json({ error: 'Failed to add interview' });
    }
  });

  // PUT /jobs/:email/:id/interviews/:interviewId — edit an existing interview
  router.put('/jobs/:email/:id/interviews/:interviewId', async (req, res) => {
    try {
      const { email, id, interviewId } = req.params;
      const { round_type, interview_date, notes } = req.body;

      if (!round_type || !interview_date) {
        return res
          .status(400)
          .json({ error: 'round_type and interview_date are required' });
      }

      const job = await pool.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const result = await pool.query(
        `UPDATE interview_table
         SET round_type = $1, scheduled_at = $2, notes = $3
         WHERE interview_id = $4 AND job_id = $5
         RETURNING interview_id AS id, round_type, scheduled_at AS interview_date, notes`,
        [round_type, interview_date, notes?.trim() ?? null, interviewId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Update interview error:', err);
      res.status(500).json({ error: 'Failed to update interview' });
    }
  });

  // DELETE /jobs/:email/:id/interviews/:interviewId — remove an interview
  router.delete('/jobs/:email/:id/interviews/:interviewId', async (req, res) => {
    try {
      const { email, id, interviewId } = req.params;

      const job = await pool.query(
        `SELECT unique_num FROM job_table WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const result = await pool.query(
        `DELETE FROM interview_table
         WHERE interview_id = $1 AND job_id = $2
         RETURNING interview_id`,
        [interviewId, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Interview not found' });
      }

      res.json({ success: true });
    } catch (err) {
      console.error('Delete interview error:', err);
      res.status(500).json({ error: 'Failed to delete interview' });
    }
  });

  // GET /jobs/:email/:id/resumes/latest - fetch the newest resume saved to a job
  router.get('/jobs/:email/:id/resumes/latest', async (req, res) => {
    try {
      const { email, id } = req.params;

      const job = await pool.query(
        `SELECT unique_num
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const savedResume = await pool.query(
        `SELECT r.experience_id AS id, r.title, r.content, r.created_at
         FROM job_resume jr
         JOIN resume_table r ON r.experience_id = jr.resume_id
         WHERE jr.job_id = $1 AND r.email = $2
         ORDER BY r.created_at DESC NULLS LAST, r.experience_id DESC
         LIMIT 1`,
        [id, email]
      );

      res.json({
        success: true,
        resume: savedResume.rows[0] ?? null,
      });
    } catch (err) {
      console.error('Get saved job resume error:', err);
      res.status(500).json({ error: 'Failed to fetch saved resume' });
    }
  });
  // POST /jobs/:email/:id/resumes - save a resume and attach it to a job
  router.post('/jobs/:email/:id/resumes', async (req, res) => {
    const client = await pool.connect();

    try {
      const { email, id } = req.params;
      const { title, content } = req.body;

      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'content is required' });
      }

      await client.query('BEGIN');

      const job = await client.query(
        `SELECT unique_num, title, company
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Job not found' });
      }

      const savedResume = await client.query(
        `INSERT INTO resume_table (email, title, content)
         VALUES ($1, $2, $3)
         RETURNING experience_id AS id, title, content, created_at`,
        [
          email,
          title?.trim() ||
            `Resume for ${job.rows[0].title} at ${job.rows[0].company}`,
          content,
        ]
      );

      await client.query(
        `INSERT INTO job_resume (job_id, resume_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, savedResume.rows[0].id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        resume: savedResume.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Save job resume error:', err);
      res.status(500).json({ error: 'Failed to save resume' });
    } finally {
      client.release();
    }
  });

  // GET /jobs/:email/:id/cover-letters/latest - fetch the newest cover
  // letter saved to a job
  router.get('/jobs/:email/:id/cover-letters/latest', async (req, res) => {
    try {
      const { email, id } = req.params;

      const job = await pool.query(
        `SELECT unique_num
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const savedCoverLetter = await pool.query(
        `SELECT cl.cover_letter_id AS id, cl.title, cl.content, cl.created_at
         FROM job_cover_letter jcl
         JOIN cover_letter_table cl ON cl.cover_letter_id = jcl.cover_letter_id
         WHERE jcl.job_id = $1 AND cl.email = $2
         ORDER BY cl.created_at DESC NULLS LAST, cl.cover_letter_id DESC
         LIMIT 1`,
        [id, email]
      );

      res.json({
        success: true,
        coverLetter: savedCoverLetter.rows[0] ?? null,
      });
    } catch (err) {
      console.error('Get saved job cover letter error:', err);
      res.status(500).json({ error: 'Failed to fetch saved cover letter' });
    }
  });

  // POST /jobs/:email/:id/cover-letters - save a cover letter and attach it
  // to a job
  router.post('/jobs/:email/:id/cover-letters', async (req, res) => {
    const client = await pool.connect();

    try {
      const { email, id } = req.params;
      const { title, content } = req.body;

      if (!content || !String(content).trim()) {
        return res.status(400).json({ error: 'content is required' });
      }

      await client.query('BEGIN');

      const job = await client.query(
        `SELECT unique_num, title, company
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (job.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Job not found' });
      }

      const savedCoverLetter = await client.query(
        `INSERT INTO cover_letter_table (email, title, content)
         VALUES ($1, $2, $3)
         RETURNING cover_letter_id AS id, title, content, created_at`,
        [
          email,
          title?.trim() ||
            `Cover letter for ${job.rows[0].title} at ${job.rows[0].company}`,
          content,
        ]
      );

      await client.query(
        `INSERT INTO job_cover_letter (job_id, cover_letter_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, savedCoverLetter.rows[0].id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        coverLetter: savedCoverLetter.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Save job cover letter error:', err);
      res.status(500).json({ error: 'Failed to save cover letter' });
    } finally {
      client.release();
    }
  });

  return router;
};