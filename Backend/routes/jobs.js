const express = require('express');

// TODO(S3-011): point this at whatever AI client the app already uses for
// resume/cover-letter tailoring — this file doesn't have access to that
// client, so it's stubbed here. Should return a string of research notes.
async function generateCompanyResearch({ company, title, context }) {
  throw new Error(
    'generateCompanyResearch is not wired up yet — see TODO(S3-011) in jobs.js'
  );
}

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
      //ANALYTICS: LOG INITIAL STAGE TO STAGE_HISTORY <-------
      // so LAG() in analytics has baseline row to compare against
      await pool.query(
        `INSERT INTO stage_history (job_id, stage) VALUES ($1, '0')`,
        [result.rows[0].id]
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
      const {
        stages,
        title,
        company,
        description,
        recruiter_notes,
        reminder_text,
        reminder_date,
      } = req.body;

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
          newStage === ARCHIVED || // always allowed
          newStage === REJECTED || // always allowed
          newStage === currentStage + 1; // next stage in sequence

        if (!isValidMove) {
          return res.status(400).json({
            error:
              'Can only advance one stage at a time, or move to Rejected/Archived.',
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
  router.delete(
    '/jobs/:email/:id/interviews/:interviewId',
    async (req, res) => {
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
    }
  );

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

  // ---------------------------------------------------------------------
  // Company research (S3-011 / S3-012)
  // ---------------------------------------------------------------------

  // GET /jobs/:email/:id/company-research — fetch the saved research
  // context + notes for a job's detail view.
  router.get('/jobs/:email/:id/company-research', async (req, res) => {
    try {
      const { email, id } = req.params;

      const result = await pool.query(
        `SELECT unique_num AS id,
                company_research_context AS research_context,
                company_research_notes AS research_notes,
                company_research_updated_at AS updated_at
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [id, email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Get company research error:', err);
      res.status(500).json({ error: 'Failed to fetch company research' });
    }
  });

  // POST /jobs/:email/:id/company-research/generate — trigger AI-assisted
  // company research from user-provided context (S3-011). This only
  // generates notes; saving them is a separate step (PUT below, S3-012) so
  // the user can review/edit before persisting.
  router.post(
    '/jobs/:email/:id/company-research/generate',
    async (req, res) => {
      try {
        const { email, id } = req.params;
        const { context } = req.body;

        if (!context || !String(context).trim()) {
          return res.status(400).json({ error: 'context is required' });
        }

        const job = await pool.query(
          `SELECT unique_num, title, company
           FROM job_table
           WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
          [id, email]
        );

        if (job.rows.length === 0) {
          return res.status(404).json({ error: 'Job not found' });
        }

        const generatedNotes = await generateCompanyResearch({
          company: job.rows[0].company,
          title: job.rows[0].title,
          context: context.trim(),
        });

        res.json({ success: true, research_notes: generatedNotes });
      } catch (err) {
        console.error('Generate company research error:', err);
        res.status(500).json({ error: 'Failed to generate company research' });
      }
    }
  );

  // PUT /jobs/:email/:id/company-research — persist research context
  // and/or editable notes to the job record (S3-012).
  router.put('/jobs/:email/:id/company-research', async (req, res) => {
    try {
      const { email, id } = req.params;
      const { research_context, research_notes } = req.body;

      if (research_context === undefined && research_notes === undefined) {
        return res.status(400).json({
          error: 'research_context or research_notes is required',
        });
      }

      const result = await pool.query(
        `UPDATE job_table
         SET
           company_research_context    = COALESCE($1, company_research_context),
           company_research_notes      = COALESCE($2, company_research_notes),
           company_research_updated_at = NOW()
         WHERE unique_num = $3 AND email = $4 AND is_deleted = FALSE
         RETURNING unique_num AS id,
                   company_research_context AS research_context,
                   company_research_notes AS research_notes,
                   company_research_updated_at AS updated_at`,
        [research_context ?? null, research_notes ?? null, id, email]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Update company research error:', err);
      res.status(500).json({ error: 'Failed to update company research' });
    }
  });

  // ---------------------------------------------------------------------
  // Interview prep notes (S3-013)
  // ---------------------------------------------------------------------

  // GET /jobs/:email/:id/interviews/:interviewId/prep-notes — list
  // structured prep notes for one interview.
  router.get(
    '/jobs/:email/:id/interviews/:interviewId/prep-notes',
    async (req, res) => {
      try {
        const { email, id, interviewId } = req.params;

        const interview = await pool.query(
          `SELECT i.interview_id
           FROM interview_table i
           JOIN job_table j ON j.unique_num = i.job_id
           WHERE i.interview_id = $1 AND i.job_id = $2 AND j.email = $3 AND j.is_deleted = FALSE`,
          [interviewId, id, email]
        );

        if (interview.rows.length === 0) {
          return res.status(404).json({ error: 'Interview not found' });
        }

        const result = await pool.query(
          `SELECT prep_note_id AS id, category, content, created_at, updated_at
           FROM interview_prep_notes
           WHERE interview_id = $1
           ORDER BY created_at ASC`,
          [interviewId]
        );

        res.json(result.rows);
      } catch (err) {
        console.error('Get interview prep notes error:', err);
        res.status(500).json({ error: 'Failed to fetch interview prep notes' });
      }
    }
  );

  // POST /jobs/:email/:id/interviews/:interviewId/prep-notes — add a
  // prep note in a given category (e.g. 'questions_to_ask', 'talking_points').
  router.post(
    '/jobs/:email/:id/interviews/:interviewId/prep-notes',
    async (req, res) => {
      try {
        const { email, id, interviewId } = req.params;
        const { category, content } = req.body;

        if (!content || !String(content).trim()) {
          return res.status(400).json({ error: 'content is required' });
        }

        const interview = await pool.query(
          `SELECT i.interview_id
           FROM interview_table i
           JOIN job_table j ON j.unique_num = i.job_id
           WHERE i.interview_id = $1 AND i.job_id = $2 AND j.email = $3 AND j.is_deleted = FALSE`,
          [interviewId, id, email]
        );

        if (interview.rows.length === 0) {
          return res.status(404).json({ error: 'Interview not found' });
        }

        const result = await pool.query(
          `INSERT INTO interview_prep_notes (interview_id, category, content)
           VALUES ($1, $2, $3)
           RETURNING prep_note_id AS id, category, content, created_at, updated_at`,
          [interviewId, category?.trim() || 'general', content.trim()]
        );

        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error('Add interview prep note error:', err);
        res.status(500).json({ error: 'Failed to add interview prep note' });
      }
    }
  );

  // PUT /jobs/:email/:id/interviews/:interviewId/prep-notes/:prepNoteId —
  // edit an existing prep note.
  router.put(
    '/jobs/:email/:id/interviews/:interviewId/prep-notes/:prepNoteId',
    async (req, res) => {
      try {
        const { email, id, interviewId, prepNoteId } = req.params;
        const { category, content } = req.body;

        if (!content || !String(content).trim()) {
          return res.status(400).json({ error: 'content is required' });
        }

        const interview = await pool.query(
          `SELECT i.interview_id
           FROM interview_table i
           JOIN job_table j ON j.unique_num = i.job_id
           WHERE i.interview_id = $1 AND i.job_id = $2 AND j.email = $3 AND j.is_deleted = FALSE`,
          [interviewId, id, email]
        );

        if (interview.rows.length === 0) {
          return res.status(404).json({ error: 'Interview not found' });
        }

        const result = await pool.query(
          `UPDATE interview_prep_notes
           SET category = COALESCE($1, category), content = $2, updated_at = NOW()
           WHERE prep_note_id = $3 AND interview_id = $4
           RETURNING prep_note_id AS id, category, content, created_at, updated_at`,
          [category?.trim() || null, content.trim(), prepNoteId, interviewId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Prep note not found' });
        }

        res.json(result.rows[0]);
      } catch (err) {
        console.error('Update interview prep note error:', err);
        res.status(500).json({ error: 'Failed to update interview prep note' });
      }
    }
  );

  // DELETE /jobs/:email/:id/interviews/:interviewId/prep-notes/:prepNoteId
  router.delete(
    '/jobs/:email/:id/interviews/:interviewId/prep-notes/:prepNoteId',
    async (req, res) => {
      try {
        const { email, id, interviewId, prepNoteId } = req.params;

        const interview = await pool.query(
          `SELECT i.interview_id
           FROM interview_table i
           JOIN job_table j ON j.unique_num = i.job_id
           WHERE i.interview_id = $1 AND i.job_id = $2 AND j.email = $3 AND j.is_deleted = FALSE`,
          [interviewId, id, email]
        );

        if (interview.rows.length === 0) {
          return res.status(404).json({ error: 'Interview not found' });
        }

        const result = await pool.query(
          `DELETE FROM interview_prep_notes
           WHERE prep_note_id = $1 AND interview_id = $2
           RETURNING prep_note_id`,
          [prepNoteId, interviewId]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Prep note not found' });
        }

        res.json({ success: true });
      } catch (err) {
        console.error('Delete interview prep note error:', err);
        res.status(500).json({ error: 'Failed to delete interview prep note' });
      }
    }
  );

  return router;
};