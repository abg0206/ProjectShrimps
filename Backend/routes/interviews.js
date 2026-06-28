const express = require('express');
 
module.exports = function (pool) {
  const router = express.Router();
//___________________________________________________________
// parse and validate integer IDs from URL params, checks in every route
  function parseId(value){
    const id = parseInt(value, 10);
    return isNaN(id) ? null : id;
  }
// get all interview tracking in job  (s2-011) <----
//return all interview jobs for a job, sorted by date
  router.get('/job/:jobId', async (req, res) => {
    try {
      const jobId = parseId(req.params.jobId); 
      if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
      //get all interviews linked to the job (order: oldest first)
      const result = await pool.query(
        'SELECT interview_id, job_id, interview_type, scheduled_at, notes, created_at FROM interview_table WHERE job_id = $1 ORDER BY scheduled_at ASC',
        [jobId]
      );
      res.status(200).json(result.rows); // returns all interviews as arr
    } catch (err) {
      console.error('Error fetching interviews error:', err);
      res.status(500).json({ error: 'Failed to fetch interviews. Internal server error' });
    }
  });
  // adding a NEW interview ENTRY (S2-BR-010, S2-BR-011) <-------------
  // creates a new interview entry linked to a job , multiple interviews can be added
  router.post('/job/:jobId', async (req, res) => {
    try {
      const jobId = parseId(req.params.jobId);
      if (!jobId) return res.status(400).json({ error: 'Invalid job ID' });
      const { interview_type, scheduled_at, notes } = req.body; // data from request body
      // insert a new interview entry
      // S2-BR-011: all three fields are req, reject if any are missing !
      if (!interview_type || !scheduled_at || !notes) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      // create new interview row into interview_table
      const result = await pool.query(
        `INSERT INTO interview_table (job_id, interview_type, scheduled_at, notes) VALUES ($1, $2, $3, $4)
         RETURNING interview_id, job_id, interview_type, scheduled_at, notes, created_at`,
         [jobId, interview_type, scheduled_at, notes]
      );
      res.status(201).json(result.rows[0]); // retun the new created interview
    } catch (error) {
      console.error('Error creating interview:', error);
      res.status(500).json({ error: 'Failed to create interview. Internal server error' });
    }
  });
  // Update EXISTING interview (S2-011) <---------------
  router.put('/job/:jobId/interview/:interviewId', async (req, res) => {
    try {
      const jobId = parseId(req.params.jobId);
      const interviewId = parseId(req.params.interviewId);
      if (!jobId) return res.status(400).json({ error: 'Invalid job ID' }); // job and interview IDs from URL
      if (!interviewId) return res.status(400).json({ error: 'Invalid interview ID' });
      const { interview_type, scheduled_at, notes } = req.body; // data from request body
      const result = await pool.query(
        `UPDATE interview_table SET interview_type = COALESCE($1, interview_type), scheduled_at = COALESCE($2, scheduled_at), notes = COALESCE($3, notes) WHERE interview_id = $4 AND job_id = $5
         RETURNING interview_id, job_id, interview_type, scheduled_at, notes`,
        [interview_type ?? null, scheduled_at ?? null, notes ?? null, interviewId, jobId]
      );
      //if no rows return, it means the interview was not found (doesn't exist or doesn't belong to the job)
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      res.status(200).json(result.rows[0]); // return updated interview
    } catch (error) {
      console.error('Error updating interview:', error);
      res.status(500).json({ error: 'Failed to update interview.' });
    }
  });
 
  // delete interview entry (S2-011)
  // removes interview entry from db
  router.delete('/job/:jobId/interview/:interviewId', async (req, res) => {
    try {
      const jobId = parseId(req.params.jobId);
      const interviewId = parseId(req.params.interviewId);
      if (!jobId) return res.status(400).json({ error: 'Invalid job ID.' });
      if (!interviewId) return res.status(400).json({ error: 'Invalid interview ID.' });
      //delete interview (required match both interviewid and jobid for security)
      const result = await pool.query(
        `DELETE FROM interview_table WHERE interview_id = $1 AND job_id = $2 RETURNING interview_id`,
        [interviewId, jobId]
      );
      //if no rows return, interview not found <-------------
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      res.status(200).json({
        success: true,
        message: 'Interview deleted successfully',
        deleted: result.rows[0].interview_id,  //confirm which interview was deleted -->
      });
    } catch (error) {
      console.error('Error deleting interview:', error);
      res.status(500).json({ error: 'Failed to delete interview. Internal server error' });
    }
  });
  return router;
};
