import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveFileDownload } from '../lib/utils';
import {
  listDocuments,
  listArchivedDocuments,
  createDocument,
  updateDocument,
  duplicateDocument,
  archiveDocument,
  restoreDocument,
  downloadDocument,
  fileToBase64,
  extToFormat,
  linkJobDocument,
  unlinkJobDocument,
  listJobsForLinking,
  docTypeToUrlSegment,
  type DocumentRecord,
  type DocType,
  type JobOption,
} from '../lib/documentsApi';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const DOC_TYPE_LABELS: Record<DocType, string> = {
  resume: 'Resume',
  cover_letter: 'Cover Letter',
};

export default function DocumentsPage() {
  const navigate = useNavigate();
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<'active' | 'archived'>('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const debouncedSearch = useDebounce(search, 300);
  const debouncedTag = useDebounce(tagFilter, 300);

  // Per-document busy state (archive/restore/duplicate/download in flight)
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocType>('resume');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<DocumentRecord | null>(
    null
  );
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Attach-to-job modal (S3-BR-013: a document may be attached to only one
  // job at a time — this both attaches and moves it).
  const [attachTarget, setAttachTarget] = useState<DocumentRecord | null>(
    null
  );
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [loadingJobOptions, setLoadingJobOptions] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [needsReplaceConfirm, setNeedsReplaceConfirm] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!userEmail) return;
    setIsLoading(true);
    setError('');
    try {
      if (view === 'archived') {
        const data = await listArchivedDocuments(userEmail);
        setDocuments(data);
      } else {
        const data = await listDocuments(userEmail, {
          doc_type: typeFilter === 'all' ? undefined : typeFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          tag: debouncedTag.trim() || undefined,
          search: debouncedSearch.trim() || undefined,
          sort: sortBy,
        });
        setDocuments(data);
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
      setError('Could not load documents. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [
    userEmail,
    view,
    typeFilter,
    statusFilter,
    debouncedTag,
    debouncedSearch,
    sortBy,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, [fetchDocuments]);

  // ---------------------------------------------------------------------
  // Upload (S3-004)
  // ---------------------------------------------------------------------

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!extToFormat(file.name)) {
      setUploadError('Only PDF, DOCX, or TXT files are supported.');
      return;
    }
    setUploadFile(file);
    if (!uploadTitle.trim()) setUploadTitle(file.name.replace(/\.[^.]+$/, ''));
  }

  async function handleUpload() {
    if (!uploadFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }
    const format = extToFormat(uploadFile.name);
    if (!format) {
      setUploadError('Only PDF, DOCX, or TXT files are supported.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const content =
        format === 'txt' ? await uploadFile.text() : await fileToBase64(uploadFile);

      const tags = uploadTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await createDocument(userEmail, {
        doc_type: uploadDocType,
        title: uploadTitle.trim() || undefined,
        tags,
        file_format: format,
        original_filename: uploadFile.name,
        content,
      });

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadTags('');
      if (view === 'active') await fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  }

  // ---------------------------------------------------------------------
  // Download (S3-005)
  // ---------------------------------------------------------------------

  async function handleDownload(doc: DocumentRecord) {
    setActionError('');
    setActioningId(doc.id);
    try {
      const version = await downloadDocument(userEmail, doc.id);
      const filename =
        version.original_filename ||
        `${doc.title}.${version.file_format}`;
      saveFileDownload(version.content, version.file_format, filename);
    } catch (err) {
      console.error('Download error:', err);
      setActionError('Could not download that document.');
    } finally {
      setActioningId(null);
    }
  }

  // ---------------------------------------------------------------------
  // Rename (S3-007-ish metadata edit)
  // ---------------------------------------------------------------------

  async function handleConfirmRename() {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      await updateDocument(userEmail, renameTarget.id, {
        title: renameValue.trim(),
      });
      setRenameTarget(null);
      setRenameValue('');
      await fetchDocuments();
    } catch (err) {
      console.error('Rename error:', err);
      setActionError('Could not rename that document.');
    } finally {
      setRenaming(false);
    }
  }

  // ---------------------------------------------------------------------
  // Duplicate (S3-007)
  // ---------------------------------------------------------------------

  async function handleDuplicate(doc: DocumentRecord) {
    setActionError('');
    setActioningId(doc.id);
    try {
      await duplicateDocument(userEmail, doc.id);
      await fetchDocuments();
    } catch (err) {
      console.error('Duplicate error:', err);
      setActionError('Could not duplicate that document.');
    } finally {
      setActioningId(null);
    }
  }

  // ---------------------------------------------------------------------
  // Archive / restore (S3-008)
  // ---------------------------------------------------------------------

  async function handleArchive(doc: DocumentRecord) {
    setActionError('');
    setActioningId(doc.id);
    try {
      await archiveDocument(userEmail, doc.id);
      await fetchDocuments();
    } catch (err) {
      console.error('Archive error:', err);
      setActionError('Could not archive that document.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleRestore(doc: DocumentRecord) {
    setActionError('');
    setActioningId(doc.id);
    try {
      await restoreDocument(userEmail, doc.id);
      await fetchDocuments();
    } catch (err) {
      console.error('Restore error:', err);
      setActionError('Could not restore that document.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleToggleStatus(doc: DocumentRecord) {
    setActionError('');
    setActioningId(doc.id);
    try {
      await updateDocument(userEmail, doc.id, {
        status: doc.status === 'draft' ? 'final' : 'draft',
      });
      await fetchDocuments();
    } catch (err) {
      console.error('Status update error:', err);
      setActionError('Could not update that document.');
    } finally {
      setActioningId(null);
    }
  }

  // ---------------------------------------------------------------------
  // Preview — open in the same editor used for AI-generated resumes and
  // cover letters, instead of downloading the raw file.
  // ---------------------------------------------------------------------

  async function handlePreview(doc: DocumentRecord) {
    setActionError('');
    setActioningId(doc.id);
    try {
      const version = await downloadDocument(userEmail, doc.id);

      // The editor only knows how to render the HTML it saves itself
      // (stored as file_format "txt"). Anything else (an uploaded PDF or
      // DOCX) can't be previewed there, so fall back to a normal download.
      if (version.file_format !== 'txt') {
        const filename =
          version.original_filename || `${doc.title}.${version.file_format}`;
        saveFileDownload(version.content, version.file_format, filename);
        return;
      }

      const path = doc.doc_type === 'resume' ? '/resume' : '/cover-letter';
      const jobTitle = doc.linked_job_title
        ? doc.linked_job_company
          ? `${doc.linked_job_title} at ${doc.linked_job_company}`
          : doc.linked_job_title
        : doc.title;

      navigate(path, {
        state: {
          documentId: doc.id,
          jobId: doc.linked_job_id ?? undefined,
          jobTitle,
          ...(doc.doc_type === 'resume'
            ? { resumeHtml: version.content }
            : { coverLetterHtml: version.content }),
        },
      });
    } catch (err) {
      console.error('Preview error:', err);
      setActionError('Could not open that document for preview.');
    } finally {
      setActioningId(null);
    }
  }

  // ---------------------------------------------------------------------
  // Attach to job / remove from job (S3-BR-013: at most one job per doc)
  // ---------------------------------------------------------------------

  async function handleOpenAttachModal(doc: DocumentRecord) {
    setAttachTarget(doc);
    setSelectedJobId('');
    setAttachError('');
    setNeedsReplaceConfirm(false);
    setLoadingJobOptions(true);
    try {
      const jobs = await listJobsForLinking(userEmail);
      setJobOptions(jobs);
    } catch (err) {
      console.error('Load jobs error:', err);
      setAttachError('Could not load your jobs.');
    } finally {
      setLoadingJobOptions(false);
    }
  }

  async function handleConfirmAttach(confirm = false) {
    if (!attachTarget || !selectedJobId) return;
    setAttaching(true);
    setAttachError('');
    try {
      const result = await linkJobDocument(
        userEmail,
        Number(selectedJobId),
        docTypeToUrlSegment(attachTarget.doc_type),
        attachTarget.id,
        confirm
      );
      if (result.requiresConfirmation) {
        setNeedsReplaceConfirm(true);
        return;
      }
      setAttachTarget(null);
      setNeedsReplaceConfirm(false);
      await fetchDocuments();
    } catch (err) {
      console.error('Attach to job error:', err);
      setAttachError(
        err instanceof Error ? err.message : 'Could not attach that document.'
      );
    } finally {
      setAttaching(false);
    }
  }

  async function handleRemoveFromJob(doc: DocumentRecord) {
    if (!doc.linked_job_id) return;
    setActionError('');
    setActioningId(doc.id);
    try {
      await unlinkJobDocument(
        userEmail,
        doc.linked_job_id,
        docTypeToUrlSegment(doc.doc_type)
      );
      await fetchDocuments();
    } catch (err) {
      console.error('Remove from job error:', err);
      setActionError('Could not remove that document from its job.');
    } finally {
      setActioningId(null);
    }
  }

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    backgroundColor: '#E6CECB',
    color: '#3C1510',
    cursor: 'pointer' as const,
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
  };

  const linkBtnStyle = (disabled = false) => ({
    backgroundColor: 'transparent',
    border: 'none',
    color: disabled ? '#b8a09c' : '#932C20',
    cursor: disabled ? ('not-allowed' as const) : ('pointer' as const),
    fontSize: '13px',
    padding: 0,
  });

  return (
    <div
      style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#D9958C' }}
    >
      <Sidebar />

      <div style={{ flex: 1, padding: '32px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h1 style={{ color: '#3C1510', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            Document Library
          </h1>

          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadError('');
              setUploadFile(null);
              setUploadTitle('');
              setUploadTags('');
              setUploadDocType('resume');
            }}
            style={{
              backgroundColor: '#932C20',
              color: '#E6CECB',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Upload Document
          </button>
        </div>

        {/* Active / Archived tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {(['active', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setView(tab)}
              style={{
                backgroundColor: view === tab ? '#932C20' : '#E6CECB',
                color: view === tab ? '#E6CECB' : '#3C1510',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize' as const,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Filters — only meaningful for the active library (S3-006) */}
        {view === 'active' && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, flex: 1, minWidth: '180px' }}
            />
            <input
              type="text"
              placeholder="Filter by tag…"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              style={{ ...inputStyle, width: '160px' }}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Types</option>
              <option value="resume">Resume</option>
              <option value="cover_letter">Cover Letter</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={selectStyle}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title A–Z</option>
              <option value="type">Type</option>
              <option value="status">Status</option>
            </select>
          </div>
        )}

        {error && (
          <p
            style={{
              backgroundColor: '#F5DDD9',
              border: '1px solid #932C20',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#932C20',
              fontSize: '14px',
              marginBottom: '20px',
            }}
          >
            {error}
          </p>
        )}

        {actionError && (
          <p
            style={{
              backgroundColor: '#F5DDD9',
              border: '1px solid #932C20',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#932C20',
              fontSize: '14px',
              marginBottom: '20px',
            }}
          >
            {actionError}
          </p>
        )}

        {!isLoading && (
          <p style={{ color: '#3C1510', fontSize: '13px', marginBottom: '16px' }}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        )}

        {isLoading ? (
          <p style={{ color: '#3C1510' }}>Loading documents…</p>
        ) : documents.length === 0 ? (
          <p style={{ color: '#3C1510', fontSize: '14px' }}>
            {view === 'archived'
              ? 'No archived documents.'
              : 'No documents yet. Upload a resume or cover letter to get started.'}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {documents.map((doc) => {
              const busy = actioningId === doc.id;
              return (
                <div
                  key={doc.id}
                  style={{
                    backgroundColor: '#E6CECB',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    opacity: doc.is_archived ? 0.9 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <p style={{ fontWeight: 'bold', color: '#3C1510', margin: 0 }}>
                      {doc.title}
                    </p>
                    <button
                      onClick={() => handleToggleStatus(doc)}
                      disabled={busy || doc.is_archived}
                      title="Click to toggle draft/final"
                      style={{
                        backgroundColor:
                          doc.status === 'final' ? '#16A34A' : '#6B7280',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor:
                          busy || doc.is_archived ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      {doc.status}
                    </button>
                  </div>

                  <p style={{ color: '#3C1510', margin: 0, fontSize: '13px' }}>
                    {DOC_TYPE_LABELS[doc.doc_type]}
                    {doc.current_version_number
                      ? ` · v${doc.current_version_number}`
                      : ''}
                    {doc.current_file_format
                      ? ` · .${doc.current_file_format}`
                      : ''}
                  </p>

                  {doc.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            backgroundColor: '#D9958C',
                            color: '#3C1510',
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p style={{ color: '#932C20', margin: 0, fontSize: '12px' }}>
                    Updated: {new Date(doc.updated_at).toLocaleDateString()}
                  </p>

                  {doc.linked_job_id && (
                    <p style={{ color: '#3C1510', margin: 0, fontSize: '12px' }}>
                      Attached to:{' '}
                      <strong>
                        {doc.linked_job_title}
                        {doc.linked_job_company
                          ? ` at ${doc.linked_job_company}`
                          : ''}
                      </strong>
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '4px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {!doc.is_archived && (
                      <>
                        <button
                          onClick={() => handlePreview(doc)}
                          disabled={busy || !doc.current_version_id}
                          style={linkBtnStyle(busy || !doc.current_version_id)}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={busy || !doc.current_version_id}
                          style={linkBtnStyle(busy || !doc.current_version_id)}
                        >
                          Download
                        </button>
                        <button
                          onClick={() => {
                            setRenameTarget(doc);
                            setRenameValue(doc.title);
                          }}
                          disabled={busy}
                          style={linkBtnStyle(busy)}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDuplicate(doc)}
                          disabled={busy}
                          style={linkBtnStyle(busy)}
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => handleArchive(doc)}
                          disabled={busy}
                          style={linkBtnStyle(busy)}
                        >
                          Archive
                        </button>
                        {doc.linked_job_id ? (
                          <button
                            onClick={() => handleRemoveFromJob(doc)}
                            disabled={busy}
                            style={linkBtnStyle(busy)}
                          >
                            Remove from Job
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenAttachModal(doc)}
                            disabled={busy}
                            style={linkBtnStyle(busy)}
                          >
                            Attach to Job
                          </button>
                        )}
                      </>
                    )}
                    {doc.is_archived && (
                      <button
                        onClick={() => handleRestore(doc)}
                        disabled={busy}
                        style={linkBtnStyle(busy)}
                      >
                        {busy ? 'Restoring…' : 'Restore'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => !uploading && setShowUploadModal(false)}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#3C1510', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              Upload Document
            </h2>

            <select
              value={uploadDocType}
              onChange={(e) => setUploadDocType(e.target.value as DocType)}
              style={{ ...selectStyle, backgroundColor: '#fff' }}
            >
              <option value="resume">Resume</option>
              <option value="cover_letter">Cover Letter</option>
            </select>

            <input
              type="text"
              placeholder="Title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Tags (comma separated)"
              value={uploadTags}
              onChange={(e) => setUploadTags(e.target.value)}
              style={inputStyle}
            />

            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: '#E6CECB',
                color: '#3C1510',
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #3C1510',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              Choose File
            </button>

            {uploadFile && (
              <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                Selected: {uploadFile.name}
              </p>
            )}

            {uploadError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {uploadError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3C1510',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #3C1510',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  backgroundColor: uploading ? '#c0847a' : '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ── */}
      {renameTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => !renaming && setRenameTarget(null)}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#3C1510', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              Rename Document
            </h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setRenameTarget(null)}
                disabled={renaming}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3C1510',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #3C1510',
                  cursor: renaming ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                disabled={renaming || !renameValue.trim()}
                style={{
                  backgroundColor: renaming ? '#c0847a' : '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: renaming ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {renaming ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attach to Job Modal ── */}
      {attachTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => !attaching && setAttachTarget(null)}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#3C1510', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              Attach "{attachTarget.title}" to a Job
            </h2>

            {needsReplaceConfirm ? (
              <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
                That job already has a {attachTarget.doc_type === 'resume' ? 'resume' : 'cover letter'}{' '}
                attached. Attaching this one will replace it. A document can only
                be attached to one job at a time, so it will also be removed
                from any job it's currently attached to.
              </p>
            ) : (
              <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                A document can only be attached to one job at a time. Attaching
                it here will remove it from any job it's currently attached to.
              </p>
            )}

            {loadingJobOptions ? (
              <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
                Loading your jobs…
              </p>
            ) : jobOptions.length === 0 ? (
              <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
                You don't have any jobs yet.
              </p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  setNeedsReplaceConfirm(false);
                }}
                disabled={attaching}
                style={{ ...selectStyle, backgroundColor: '#fff' }}
              >
                <option value="">Select a job…</option>
                {jobOptions.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </select>
            )}

            {attachError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {attachError}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setAttachTarget(null)}
                disabled={attaching}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3C1510',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #3C1510',
                  cursor: attaching ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmAttach(needsReplaceConfirm)}
                disabled={attaching || !selectedJobId}
                style={{
                  backgroundColor: attaching ? '#c0847a' : '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: attaching || !selectedJobId ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {attaching
                  ? 'Attaching…'
                  : needsReplaceConfirm
                    ? 'Replace & Attach'
                    : 'Attach'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
