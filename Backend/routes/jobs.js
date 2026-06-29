const express = require('express');

module.exports = function (pool) {
  const router = express.Router();
  const VALID_STAGES = ['0', '1', '2', '3', '4', '5'];

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
        SELECT unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes
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
      const { title, company, description } = req.body;

      if (!title || !company || !description) {
        return res
          .status(400)
          .json({ error: 'title, company, and description are required' });
      }

      const result = await pool.query(
        `INSERT INTO job_table (email, title, company, description, stages)
         VALUES ($1, $2, $3, $4, '0')
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes`,
        [email, title.trim(), company.trim(), description.trim()]
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
      const { stages, title, company, description, recruiter_notes } =
        req.body;

      if (stages !== undefined && !VALID_STAGES.includes(stages)) {
        return res
          .status(400)
          .json({ error: `stages must be one of: ${VALID_STAGES.join(', ')}` });
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

        const isValidMove =
          newStage === ARCHIVED ||
          newStage === currentStage - 1 ||
          newStage === currentStage + 1;

        if (!isValidMove) {
          return res.status(400).json({
            error:
              newStage <= currentStage
                ? 'Cannot move a job backwards.'
                : 'Can only advance one stage at a time.',
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
           recruiter_notes = COALESCE($7, recruiter_notes)
         WHERE unique_num = $2 AND email = $3 AND is_deleted = FALSE
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at, recruiter_notes`,
        [
          stages ?? null,
          id,
          email,
          title?.trim() ?? null,
          company?.trim() ?? null,
          description?.trim() ?? null,
          recruiter_notes ?? null,
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
        `SELECT i.round_type, i.scheduled_at AS interview_date, i.notes
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
         RETURNING round_type, scheduled_at AS interview_date, notes`,
        [id, round_type, interview_date, notes?.trim() ?? null]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Add interview error:', err);
      res.status(500).json({ error: 'Failed to add interview' });
    }
  });

  return router;
};