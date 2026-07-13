// Thin client around the document-library backend (Backend/routes/documents.js).
// Shared by DocumentsPage (S3-001/004/005/006/007/008) and the
// Resume/CoverLetter editors (S3-009/010) so both surfaces talk to the same
// model instead of the legacy per-job resume/cover-letter tables.

export type DocType = 'resume' | 'cover_letter';
export type DocStatus = 'draft' | 'final';
export type FileFormat = 'pdf' | 'docx' | 'txt';

export interface DocumentRecord {
  id: number;
  doc_type: DocType;
  title: string;
  status: DocStatus;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  current_version_id: number | null;
  current_version_number: number | null;
  current_file_format: FileFormat | null;
  current_original_filename: string | null;
  current_version_created_at: string | null;
  // S3-BR-013: the single job (if any) this document is currently
  // attached to. A document can be attached to at most one job.
  linked_job_id: number | null;
  linked_job_title: string | null;
  linked_job_company: string | null;
}

export interface JobOption {
  id: number;
  title: string;
  company: string;
}

// Maps a document's own doc_type to the URL segment the job-linking
// endpoints expect ("cover-letter", not "cover_letter").
export function docTypeToUrlSegment(
  docType: DocType
): 'resume' | 'cover-letter' {
  return docType === 'cover_letter' ? 'cover-letter' : 'resume';
}

export interface VersionRecord {
  id: number;
  version_number: number;
  created_by: string;
  file_format: FileFormat;
  original_filename: string | null;
  created_at: string;
}

export interface VersionContent extends VersionRecord {
  content: string;
}

export interface JobDocumentLink {
  doc_type: DocType;
  document_id: number;
  version_id: number;
  linked_by: string;
  linked_at: string;
  title: string;
  status: DocStatus;
  tags: string[];
  is_archived: boolean;
  version_number: number;
  file_format: FileFormat;
  original_filename: string | null;
}

export interface JobDocuments {
  resume: JobDocumentLink | null;
  cover_letter: JobDocumentLink | null;
}

class ApiError extends Error {
  status: number;
  requires_confirmation?: boolean;
  currently_linked_document_id?: number;
  constructor(
    message: string,
    status: number,
    extra?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    Object.assign(this, extra);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? 'Request failed', res.status, data);
  }
  return data as T;
}

const enc = encodeURIComponent;

// ---------------------------------------------------------------------
// Document library (S3-001, S3-004..S3-008)
// ---------------------------------------------------------------------

export function listDocuments(
  email: string,
  filters: {
    doc_type?: string;
    status?: string;
    tag?: string;
    search?: string;
    sort?: string;
  } = {}
): Promise<DocumentRecord[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return request(`/api/documents/${enc(email)}${qs ? `?${qs}` : ''}`);
}

export function listArchivedDocuments(
  email: string
): Promise<DocumentRecord[]> {
  return request(`/api/documents/${enc(email)}/archived`);
}

export function createDocument(
  email: string,
  payload: {
    doc_type: DocType;
    title?: string;
    status?: DocStatus;
    tags?: string[];
    file_format: FileFormat;
    original_filename?: string;
    content: string;
  }
): Promise<DocumentRecord> {
  return request(`/api/documents/${enc(email)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDocument(
  email: string,
  id: number,
  payload: { title?: string; status?: DocStatus; tags?: string[] }
): Promise<DocumentRecord> {
  return request(`/api/documents/${enc(email)}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function duplicateDocument(
  email: string,
  id: number,
  title?: string
): Promise<DocumentRecord> {
  return request(`/api/documents/${enc(email)}/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(title ? { title } : {}),
  });
}

export function addVersion(
  email: string,
  id: number,
  payload: {
    file_format: FileFormat;
    original_filename?: string;
    content: string;
  }
): Promise<VersionRecord> {
  return request(`/api/documents/${enc(email)}/${id}/versions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listVersions(
  email: string,
  id: number
): Promise<VersionRecord[]> {
  return request(`/api/documents/${enc(email)}/${id}/versions`);
}

export function downloadDocument(
  email: string,
  id: number,
  opts: { version?: number; format?: FileFormat } = {}
): Promise<VersionContent> {
  const params = new URLSearchParams();
  if (opts.version) params.set('version', String(opts.version));
  if (opts.format) params.set('format', opts.format);
  const qs = params.toString();
  return request(
    `/api/documents/${enc(email)}/${id}/download${qs ? `?${qs}` : ''}`
  );
}

export function archiveDocument(
  email: string,
  id: number
): Promise<{ success: boolean; archived: number }> {
  return request(`/api/documents/${enc(email)}/${id}/archive`, {
    method: 'POST',
  });
}

export function restoreDocument(
  email: string,
  id: number
): Promise<{ success: boolean; restored: number }> {
  return request(`/api/documents/${enc(email)}/${id}/restore`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------
// Job <-> document linking (S3-009, S3-010)
// ---------------------------------------------------------------------

export function getJobDocuments(
  email: string,
  jobId: number
): Promise<JobDocuments> {
  return request(`/api/jobs/${enc(email)}/${jobId}/documents`);
}

// Active jobs for the "Attach to Job" picker on the Documents page.
export function listJobsForLinking(email: string): Promise<JobOption[]> {
  return request(`/api/jobs/${enc(email)}`);
}

// Resolves normally on success. On a 409 "already linked to a different
// document" conflict, resolves with { requiresConfirmation: true } instead
// of throwing, so callers can show a confirm-to-replace prompt (S3-BR-011)
// and resend with confirm: true.
export async function linkJobDocument(
  email: string,
  jobId: number,
  docType: 'resume' | 'cover-letter',
  documentId: number,
  confirm = false
): Promise<
  | { requiresConfirmation: true; currentlyLinkedDocumentId: number }
  | { requiresConfirmation: false; document_id: number }
> {
  try {
    const data = await request<{ document_id: number }>(
      `/api/jobs/${enc(email)}/${jobId}/documents/${docType}`,
      {
        method: 'PUT',
        body: JSON.stringify({ document_id: documentId, confirm }),
      }
    );
    return { requiresConfirmation: false, document_id: data.document_id };
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 409 &&
      err.requires_confirmation
    ) {
      return {
        requiresConfirmation: true,
        currentlyLinkedDocumentId: Number(err.currently_linked_document_id),
      };
    }
    throw err;
  }
}

export function unlinkJobDocument(
  email: string,
  jobId: number,
  docType: 'resume' | 'cover-letter'
): Promise<{ success: boolean; unlinked_document_id: number }> {
  return request(`/api/jobs/${enc(email)}/${jobId}/documents/${docType}`, {
    method: 'DELETE',
  });
}

export function downloadJobDocument(
  email: string,
  jobId: number,
  docType: 'resume' | 'cover-letter'
): Promise<VersionContent> {
  return request(
    `/api/jobs/${enc(email)}/${jobId}/documents/${docType}/download`
  );
}

// ---------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------

// Reads a File as base64 (no data: prefix) — how pdf/docx content is stored,
// matching saveFileDownload()'s expectations in lib/utils.ts.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export function extToFormat(filename: string): FileFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'docx' || ext === 'txt' ? ext : null;
}
