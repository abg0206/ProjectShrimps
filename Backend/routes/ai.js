const express = require('express');
const { generateContent } = require('../services/geminiService');
const {
  buildResumePrompt,
  buildCoverLetterPrompt,
  buildRewritePrompt,
} = require('../services/promptBuilder');

module.exports = function (pool) {
  const router = express.Router();

  // POST /api/ai/resume/:email/:jobId
  // Generates a resume tailored to one specific job, using the user's
  // saved profile (summary/skills/education/experience) + that job's
  // description.
  router.post('/resume/:email/:jobId', async (req, res) => {
    try {
      const { email, jobId } = req.params;

      const profileResult = await pool.query(
        `SELECT first_name, last_name, summary, skills, education, experience, target_role
         FROM user_profile
         WHERE email = $1`,
        [email]
      );

      if (profileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found. Fill out your profile before generating a resume.',
        });
      }

      const jobResult = await pool.query(
        `SELECT title, company, description
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [jobId, email]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Job not found.' });
      }

      const p = profileResult.rows[0];
      const job = jobResult.rows[0];

      const profileSummary = [
        `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        p.target_role ? `Target role: ${p.target_role}` : null,
        p.summary ?? null,
      ]
        .filter(Boolean)
        .join('\n');

      const prompt = buildResumePrompt({
        profile: profileSummary,
        experience: p.experience,
        education: p.education,
        skills: p.skills,
        job: `${job.title} at ${job.company}\n\n${job.description}`,
      });

      const result = await generateContent(prompt);

      if (!result.success) {
        return res.status(502).json({ success: false, error: result.error });
      }

      res.json({
        success: true,
        content: result.content,
        job: { id: Number(jobId), title: job.title, company: job.company },
      });
    } catch (err) {
      console.error('AI resume generation error:', err);
      res.status(500).json({ success: false, error: 'Failed to generate resume.' });
    }
  });

  // POST /api/ai/edit
  // Rewrites/improves whatever document content is currently in the editor.
  // Body: { content, rewriteType?, jobDescription?, documentType? }
  // documentType defaults to 'Resume' so existing callers keep working, but
  // the Cover Letter editor passes documentType: 'Cover Letter'.
  router.post('/edit', async (req, res) => {
    try {
      const { content, rewriteType, jobDescription, documentType } =
        req.body ?? {};

      if (!content || !String(content).trim()) {
        return res
          .status(400)
          .json({ success: false, error: 'content is required.' });
      }

      const prompt = buildRewritePrompt({
        documentType: documentType?.trim() || 'Resume',
        rewriteType: rewriteType?.trim() || 'Professional, ATS-friendly',
        content,
        job: jobDescription ?? '',
      });

      const result = await generateContent(prompt);

      if (!result.success) {
        return res.status(502).json({ success: false, error: result.error });
      }

      res.json({ success: true, content: result.content });
    } catch (err) {
      console.error('AI edit error:', err);
      res
        .status(500)
        .json({ success: false, error: 'Failed to edit document.' });
    }
  });

  // POST /api/ai/cover-letter/:email/:jobId
  // Generates a cover letter tailored to one specific job, using the user's
  // saved profile (summary/skills/education/experience) + that job's
  // description.
  router.post('/cover-letter/:email/:jobId', async (req, res) => {
    try {
      const { email, jobId } = req.params;

      const profileResult = await pool.query(
        `SELECT first_name, last_name, summary, skills, education, experience, target_role
         FROM user_profile
         WHERE email = $1`,
        [email]
      );

      if (profileResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found. Fill out your profile before generating a cover letter.',
        });
      }

      const jobResult = await pool.query(
        `SELECT title, company, description
         FROM job_table
         WHERE unique_num = $1 AND email = $2 AND is_deleted = FALSE`,
        [jobId, email]
      );

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Job not found.' });
      }

      const p = profileResult.rows[0];
      const job = jobResult.rows[0];

      const profileSummary = [
        `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        p.target_role ? `Target role: ${p.target_role}` : null,
        p.summary ?? null,
      ]
        .filter(Boolean)
        .join('\n');

      const prompt = buildCoverLetterPrompt({
        profile: profileSummary,
        experience: p.experience,
        education: p.education,
        skills: p.skills,
        job: `${job.title} at ${job.company}\n\n${job.description}`,
      });

      const result = await generateContent(prompt);

      if (!result.success) {
        return res.status(502).json({ success: false, error: result.error });
      }

      res.json({
        success: true,
        content: result.content,
        job: { id: Number(jobId), title: job.title, company: job.company },
      });
    } catch (err) {
      console.error('AI cover letter generation error:', err);
      res
        .status(500)
        .json({ success: false, error: 'Failed to generate cover letter.' });
    }
  });

  return router;
};
