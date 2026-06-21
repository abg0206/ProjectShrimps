const express = require('express');

module.exports = function jobsRouter(pool) {
  const router = express.Router();

  // all active jobs for a user
  router.get('/jobs/:email', async (req, res) => {
    try {
      const { email } = req.params;

      const result = await pool.query(
        `SELECT unique_num AS id, title, company, description, stages AS status, created_at
         FROM job_table
         WHERE email = $1 AND is_deleted = FALSE
         ORDER BY created_at DESC`,
        [email]
      );

      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Get jobs error:', err);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  // adds new jobs
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
        [email, title, company, description]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Add job error:', err);
      res.status(500).json({ error: 'Failed to add job' });
    }
  });

  // update job status 
  router.put('/jobs/:email/:id', async (req, res) => {
    try {
      const { email, id } = req.params;
      const { stages, title, company, description } = req.body;

      const validStages = ['0', '1', '2', '3', '4', '5'];
      if (!validStages.includes(stages)) {
        return res.status(400).json({ error: 'stages must be 0–4' });
      }

      const result = await pool.query(
        `UPDATE job_table
          SET stages = $1,
              title = COALESCE($4, title),
              company = COALESCE($5, company),
              description = COALESCE($6, description)
         WHERE unique_num = $2 AND email = $3 AND is_deleted = FALSE
         RETURNING unique_num AS id, title, company, description, stages AS status, created_at`,
        [stages, id, email, title ?? null, company ?? null, description ?? null]
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

  // soft delete a job
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
