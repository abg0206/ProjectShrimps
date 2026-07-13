// Thin client around the Job Detail backend endpoints (Backend/routes/jobs.js):
// the single-job lookup, company research (S3-011/S3-012), and interview
// prep notes (S3-013). Mirrors the request()/enc() pattern in documentsApi.ts.

export interface JobSummary {
  id: number;
  title: string;
  company: string;
  description: string;
  status: string;
  created_at: string;
  recruiter_notes: string | null;
  reminder_text: string | null;
  reminder_date: string | null;
}

export interface CompanyResearch {
  id: number;
  research_context: string | null;
  research_notes: string | null;
  updated_at: string | null;
}

export interface Interview {
  id: number;
  round_type: string;
  interview_date: string;
  notes: string | null;
}

export type PrepNoteCategory =
  | 'questions_to_ask'
  | 'talking_points'
  | 'general';

export const PREP_NOTE_CATEGORIES: { value: PrepNoteCategory; label: string }[] =
  [
    { value: 'talking_points', label: 'Talking Points' },
    { value: 'questions_to_ask', label: 'Questions to Ask' },
    { value: 'general', label: 'General' },
  ];

export interface PrepNote {
  id: number;
  category: string;
  content: string;
  created_at: string;
  updated_at: string;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? 'Request failed', res.status);
  }
  return data as T;
}

const enc = encodeURIComponent;

// ---------------------------------------------------------------------
// Job header
// ---------------------------------------------------------------------

export function getJob(email: string, jobId: number): Promise<JobSummary> {
  return request(`/api/jobs/${enc(email)}/${jobId}`);
}

// ---------------------------------------------------------------------
// Company research (S3-011 / S3-012)
// ---------------------------------------------------------------------

export function getCompanyResearch(
  email: string,
  jobId: number
): Promise<CompanyResearch> {
  return request(`/api/jobs/${enc(email)}/${jobId}/company-research`);
}

export function generateCompanyResearch(
  email: string,
  jobId: number,
  context: string
): Promise<{ success: boolean; research_notes: string }> {
  return request(
    `/api/jobs/${enc(email)}/${jobId}/company-research/generate`,
    {
      method: 'POST',
      body: JSON.stringify({ context }),
    }
  );
}

export function saveCompanyResearch(
  email: string,
  jobId: number,
  payload: { research_context?: string; research_notes?: string }
): Promise<CompanyResearch> {
  return request(`/api/jobs/${enc(email)}/${jobId}/company-research`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------

export function listInterviews(
  email: string,
  jobId: number
): Promise<Interview[]> {
  return request(`/api/jobs/${enc(email)}/${jobId}/interviews`);
}

// ---------------------------------------------------------------------
// Interview prep notes (S3-013)
// ---------------------------------------------------------------------

export function listPrepNotes(
  email: string,
  jobId: number,
  interviewId: number
): Promise<PrepNote[]> {
  return request(
    `/api/jobs/${enc(email)}/${jobId}/interviews/${interviewId}/prep-notes`
  );
}

export function addPrepNote(
  email: string,
  jobId: number,
  interviewId: number,
  payload: { category: string; content: string }
): Promise<PrepNote> {
  return request(
    `/api/jobs/${enc(email)}/${jobId}/interviews/${interviewId}/prep-notes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export function updatePrepNote(
  email: string,
  jobId: number,
  interviewId: number,
  prepNoteId: number,
  payload: { category?: string; content: string }
): Promise<PrepNote> {
  return request(
    `/api/jobs/${enc(email)}/${jobId}/interviews/${interviewId}/prep-notes/${prepNoteId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

export function deletePrepNote(
  email: string,
  jobId: number,
  interviewId: number,
  prepNoteId: number
): Promise<{ success: boolean }> {
  return request(
    `/api/jobs/${enc(email)}/${jobId}/interviews/${interviewId}/prep-notes/${prepNoteId}`,
    { method: 'DELETE' }
  );
}
