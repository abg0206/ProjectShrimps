const express = require('express');

// Returns stage conversion and time-in-stage analytics for the last 7 days
// CONNECTS TO: server.js as /api/analytics || Reads from: stage_history + job_table || called by dashboardPage

module.exports = function (pool) {
  const router = express.Router();

  // S3-014 :  GET STAGE CONVERSIONS <--
  // Returns all stage transitions in the last 7 days for a user's jobs

  router.get('/:email/conversions', async (req, res) => {
    try {
      const { email } = req.params;

      // LAG() looks at the prev row for the same job_id 
      // to assume what stage the job was in BEFORE this transition
      const result = await pool.query(
        `WITH transitions AS (
           SELECT
             sh.history_id,
             sh.job_id,
             jt.title,
             jt.company,
             LAG(sh.stage::text) OVER (
               PARTITION BY sh.job_id
               ORDER BY sh.changed_at
             ) AS from_stage,        -- previous stage (inferred)
             sh.stage::text AS to_stage,  -- new stage (stored)
             sh.changed_at
           FROM stage_history sh
           JOIN job_table jt
             ON sh.job_id = jt.unique_num
           WHERE jt.email = $1
             AND jt.is_deleted = FALSE
         )
         SELECT *
         FROM transitions
         WHERE changed_at >= NOW() - INTERVAL '7 days'
           AND from_stage IS NOT NULL  -- exclude first-ever stage log (no previous)
         ORDER BY changed_at DESC`,
        [email]
      );

      // Filter specifically for Interested(0) → Applied(1)

      const interestedToApplied = result.rows.filter(
        (r) => r.from_stage === '0' && r.to_stage === '1'
      );

      res.status(200).json({
        transitions: result.rows,         // all transitions in last 7 days
        interestedToApplied,              // specifically 0 → 1
        totalTransitions: result.rows.length,
      });
    } catch (err) {
      console.error('Analytics conversions error:', err);
      res.status(500).json({ error: 'Failed to fetch conversion analytics' });
    }
  });

  // (S3-014)  GET STAGE VELOCITYYYY --> Returns AVG time (in hours) a job spends in each stage
  // LEAD() to calculate duration between consecutive stage changes || gets the timestamp of the NEXT stage change for the same job
  router.get('/:email/velocity', async (req, res) => {
    try {
      const { email } = req.params;


      // so we can calculate how long the job stayed in each stage
      const result = await pool.query(
        `WITH stage_durations AS (
           SELECT
             sh.job_id,
             sh.stage::text AS stage,
             sh.changed_at,
             LEAD(sh.changed_at) OVER (
               PARTITION BY sh.job_id
               ORDER BY sh.changed_at
             ) AS left_stage_at     -- when the job moved out of this stage
           FROM stage_history sh
           JOIN job_table jt
             ON sh.job_id = jt.unique_num
           WHERE jt.email = $1
             AND jt.is_deleted = FALSE
             AND sh.changed_at >= NOW() - INTERVAL '7 days'
         )
         SELECT
           stage,
           ROUND(
             AVG(
               EXTRACT(EPOCH FROM (left_stage_at - changed_at)) / 3600
             )::numeric, 2
           ) AS avg_hours_in_stage,  -- average hours spent in this stage
           COUNT(*) AS transition_count
         FROM stage_durations
         WHERE left_stage_at IS NOT NULL  -- exclude jobs still in this stage
         GROUP BY stage
         ORDER BY stage`,
        [email]
      );

      res.status(200).json({
        velocity: result.rows, // { stage, avg_hours_in_stage, transition_count }
      });
    } catch (err) {
      console.error('Analytics velocity error:', err);
      res.status(500).json({ error: 'Failed to fetch velocity analytics' });
    }
  });

  return router;
};