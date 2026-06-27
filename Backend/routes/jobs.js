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

      // Search filter — title or company (case-insensitive)
      if (search && search.trim()) {
        conditions.push(
          `(title ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`
        );
        params.push(`%${search.trim()}%`);
        paramIndex++;
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
        SELECT unique_num AS id, title, company, description, stages AS status, created_at
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
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at`,
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
      const { stages, title, company, description } = req.body;

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
           stages      = COALESCE($1::job_stage_enum, stages),
           title       = COALESCE($4, title),
           company     = COALESCE($5, company),
           description = COALESCE($6, description)
         WHERE unique_num = $2 AND email = $3 AND is_deleted = FALSE
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at`,
        [
          stages ?? null,
          id,
          email,
          title?.trim() ?? null,
          company?.trim() ?? null,
          description?.trim() ?? null,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
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

  return router;
};
