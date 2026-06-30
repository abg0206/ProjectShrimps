// Loads prompt templates from Backend/Prompts and fills in {{placeholders}}.
// These are the same templates the original Python service used.

const fs = require('fs');
const path = require('path');

const PROMPT_DIR = path.join(__dirname, '..', 'Prompts');

function loadTemplate(templateName) {
  const templatePath = path.join(PROMPT_DIR, templateName);

  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (err) {
    throw new Error(`Prompt template '${templateName}' was not found.`);
  }
}

function replaceVariables(template, variables) {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.split(`{{${key}}}`).join(value ?? '');
  }

  return result;
}

function buildPrompt(templateName, variables) {
  const template = loadTemplate(templateName);
  return replaceVariables(template, variables);
}

// Profile fields like skills/education/experience come out of Postgres as
// JSON (arrays of strings or objects). Turn them into readable plain text
// for the prompt instead of dumping raw JSON.
function formatForPrompt(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided.';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'Not provided.';

    return value
      .map((item) => {
        if (typeof item === 'string') return `- ${item}`;
        if (item && typeof item === 'object') {
          return `- ${Object.values(item).filter(Boolean).join(' — ')}`;
        }
        return `- ${item}`;
      })
      .join('\n');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  }

  return String(value);
}

function buildResumePrompt({ profile, experience, education, skills, job }) {
  return buildPrompt('Resume.txt', {
    profile: formatForPrompt(profile),
    experience: formatForPrompt(experience),
    education: formatForPrompt(education),
    skills: formatForPrompt(skills),
    job: formatForPrompt(job),
  });
}

function buildCoverLetterPrompt({
  profile,
  experience,
  education,
  skills,
  job,
}) {
  return buildPrompt('CoverLetter.txt', {
    profile: formatForPrompt(profile),
    experience: formatForPrompt(experience),
    education: formatForPrompt(education),
    skills: formatForPrompt(skills),
    job: formatForPrompt(job),
  });
}

function buildRewritePrompt({ documentType, rewriteType, content, job }) {
  return buildPrompt('Rewrite.txt', {
    documentType: documentType ?? 'Resume',
    rewriteType: rewriteType ?? 'Professional',
    content: content ?? '',
    job: job ?? 'Not provided.',
  });
}

module.exports = {
  buildResumePrompt,
  buildCoverLetterPrompt,
  buildRewritePrompt,
  formatForPrompt,
};
