import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback, useRef } from 'react';
import JobCard, { Job, StageEvent, InterviewEntry } from '../components/JobCard';

const STAGE_LABELS: Record<string, string> = {
  '0': 'Interested',
  '1': 'Applied',
  '2': 'Interview',
  '3': 'Offer',
  '4': 'Rejected',
  '5': 'Archived',
};

//we no longer need since we have a job card

function normalise(raw: Record<string, string | number>): Job {
  return {
    id: Number(raw.id ?? raw.unique_num),
    title: String(raw.title),
    company: String(raw.company),
    description: String(raw.description),
    status: String(raw.status ?? raw.stages ?? '0'),
    created_at: String(raw.created_at),
    deadline: raw.deadline ? String(raw.deadline) : null,
    recruiter_notes: raw.recruiter_notes ? String(raw.recruiter_notes) : null,
  };
}

// Debounce hook — delays updating a value until the user stops typing
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function DashboardPage() {
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search so we don't fire on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [modalError, setModalError] = useState('');

  const [newDeadline, setNewDeadline] = useState('');

  // Archive confirmation modal
  const [archiveTarget, setArchiveTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [archiving, setArchiving] = useState(false);

  const [detailJob, setDetailJob] = useState<Job | null>(null);

  // Inline "edit job details" mode — lives inside the detail view itself now,
  // instead of a separate Edit Job modal.
  const [editingJobDetails, setEditingJobDetails] = useState(false);
  const [detailEditTitle, setDetailEditTitle] = useState('');
  const [detailEditCompany, setDetailEditCompany] = useState('');
  const [detailEditDescription, setDetailEditDescription] = useState('');
  const [detailEditDeadline, setDetailEditDeadline] = useState('');
  const [savingJobDetails, setSavingJobDetails] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState('');

  const [detailNotes, setDetailNotes] = useState('');
  const [savingNotes, setSaveNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Per-job stage history and interviews stored by job id
  const [stageHistoryMap, setStageHistoryMap] = useState<Map<number, StageEvent[]>>(new Map());
  const [jobInterviewsMap, setJobInterviewsMap] = useState<Map<number, InterviewEntry[]>>(new Map());

  // interview tracker — scoped to current detailJob
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [newInterviewRound, setNewInterviewRound] = useState('');
  const [newInterviewDate, setNewInterviewDate] = useState('');
  const [newInterviewNotes, setNewInterviewNotes] = useState('');
  // null = adding a brand-new interview; a number = editing that existing entry
  const [editingInterviewIndex, setEditingInterviewIndex] = useState<number | null>(null);

  // ── Modal exclusivity ───────────────────────────────────────────────────────
  // Only one of these should ever be open at a time. Call this before opening
  // any modal so a stale one can never linger behind / reappear underneath
  // another. This is the single source of truth for "close everything else."
  function closeAllModals() {
    setShowAddModal(false);
    setArchiveTarget(null);
    setDetailJob(null);
    setEditingJobDetails(false);
    setShowAddInterview(false);
    setEditingInterviewIndex(null);
  }

  // Fetch jobs from the server, passing filters as query params
  const fetchJobs = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filterStage !== 'all') params.set('stage', filterStage);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('sort', sortBy);

      const url = `/api/jobs/${encodeURIComponent(userEmail)}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      setJobs(data.map(normalise));
    } catch (err) {
      console.error(err);
      setError('Could not load jobs. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [userEmail, filterStage, debouncedSearch, sortBy]);

  // Re-fetch whenever filters change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Add job
  async function handleAddJob() {
    setModalError('');
    if (!newTitle.trim() || !newCompany.trim() || !newDescription.trim()) {
      setModalError('All fields are required.');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          company: newCompany.trim(),
          description: newDescription.trim(),
          deadline: newDeadline || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setModalError(data.error ?? 'Failed to add job.');
        return;
      }
      // Refetch so new job respects current filters/sort
      await fetchJobs();
      setNewTitle('');
      setNewCompany('');
      setNewDescription('');
      setNewDeadline('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setModalError('Could not connect to the server.');
    } finally {
      setAdding(false);
    }
  }

  // Card's "Edit" button — jump straight into the detail view, already in edit mode.
  function openEdit(job: Job) {
    closeAllModals();
    setDetailJob(job);
    setDetailNotes(job.recruiter_notes ?? '');
    setNotesSaved(false);
    startEditJobDetails(job);
  }

  function startEditJobDetails(job: Job) {
    setDetailEditTitle(job.title);
    setDetailEditCompany(job.company);
    setDetailEditDescription(job.description);
    setDetailEditDeadline(job.deadline ?? '');
    setJobDetailsError('');
    setEditingJobDetails(true);
  }

  function cancelEditJobDetails() {
    setEditingJobDetails(false);
    setJobDetailsError('');
  }

  // Save inline job-detail edits (title/company/description/deadline).
  // Stage is intentionally left untouched here — it's changed via the
  // "Change Stage" dropdown, which already has its own archive-confirmation flow.
  async function saveJobDetails() {
    if (!detailJob) return;
    setJobDetailsError('');
    if (!detailEditTitle.trim() || !detailEditCompany.trim() || !detailEditDescription.trim()) {
      setJobDetailsError('All fields are required.');
      return;
    }
    setSavingJobDetails(true);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${detailJob.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stages: detailJob.status,
            title: detailEditTitle.trim(),
            company: detailEditCompany.trim(),
            description: detailEditDescription.trim(),
            deadline: detailEditDeadline || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setJobDetailsError(data.error ?? 'Failed to save.');
        return;
      }
      setDetailJob((prev) =>
        prev
          ? {
              ...prev,
              title: detailEditTitle.trim(),
              company: detailEditCompany.trim(),
              description: detailEditDescription.trim(),
              deadline: detailEditDeadline || null,
            }
          : prev
      );
      await fetchJobs();
      setEditingJobDetails(false);
    } catch (err) {
      console.error(err);
      setJobDetailsError('Could not connect to the server.');
    } finally {
      setSavingJobDetails(false);
    }
  }

  // Quick status change from card dropdown / detail view
  async function handleStatusChange(
    jobId: number,
    newStage: string,
    jobTitle: string
  ) {
    // Intercept archive — show confirmation modal instead of firing immediately,
    // and make sure no other modal (e.g. the detail view this was triggered from)
    // is left open behind it.
    if (newStage === '5') {
      closeAllModals();
      setArchiveTarget({ id: jobId, title: jobTitle });
      return;
    }
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: newStage }),
        }
      );
      if (!res.ok) return;
      // Record stage change in history
      setStageHistoryMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(jobId) ?? [];
        next.set(jobId, [...existing, { stage: newStage, changedAt: new Date().toISOString() }]);
        return next;
      });
      // Also update detailJob if it's open
      setDetailJob((prev) => prev && prev.id === jobId ? { ...prev, status: newStage } : prev);
      await fetchJobs();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  // Confirm and execute archive
  async function handleConfirmArchive() {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${archiveTarget.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: '5' }),
        }
      );
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== archiveTarget.id));
        // In case the detail view still references this job, clear it too.
        setDetailJob((prev) => (prev && prev.id === archiveTarget.id ? null : prev));
      }
    } catch (err) {
      console.error('Archive failed:', err);
    } finally {
      setArchiving(false);
      setArchiveTarget(null);
    }
  }

  // Delete job
  async function handleDelete(jobId: number) {
    if (!confirm('Remove this job?')) return;
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) return;
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      // Clean up the detail view if it was pointing at the deleted job.
      setDetailJob((prev) => (prev && prev.id === jobId ? null : prev));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleSaveNotes() {
    if (!detailJob) return;
    setSaveNotes(true);
    setNotesSaved(false);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${detailJob.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recruiter_notes: detailNotes }),
        }
      );
      if (res.ok) {
        setNotesSaved(true);
        await fetchJobs();
      }
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaveNotes(false);
    }
  }

  const filtered = jobs
    .filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase());
      const matchesStage = filterStage === 'all' || job.status === filterStage;
      return matchesSearch && matchesStage;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else if (sortBy === 'oldest') {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      } else if (sortBy === 'company') {
        return a.company.localeCompare(b.company);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  const inputStyle = {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  };
  const labelStyle = {
    fontSize: '13px',
    color: '#3C1510',
    display: 'block',
    marginBottom: '4px',
  };
  const btnPrimary = (disabled = false) => ({
    backgroundColor: disabled ? '#c0847a' : '#932C20',
    color: '#E6CECB',
    padding: '8px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: disabled ? ('not-allowed' as const) : ('pointer' as const),
    fontSize: '14px',
  });
  const btnSecondary = {
    backgroundColor: 'transparent',
    color: '#3C1510',
    padding: '8px 20px',
    borderRadius: '6px',
    border: '1px solid #3C1510',
    cursor: 'pointer' as const,
    fontSize: '14px',
  };
  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    backgroundColor: '#E6CECB',
    color: '#3C1510',
    cursor: 'pointer' as const,
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#D9958C',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, padding: '32px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <h1
            style={{
              color: '#3C1510',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            My Jobs
          </h1>
          <button
            onClick={() => {
              closeAllModals();
              setShowAddModal(true);
              setModalError('');
            }}
            style={btnPrimary()}
          >
            Add Job
          </button>
        </div>

        {/* Filters — single row, all server-driven */}
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
            placeholder="Search by title or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
            }}
          />

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              backgroundColor: '#E6CECB',
              color: '#3C1510',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              backgroundColor: '#E6CECB',
              color: '#3C1510',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="company">Company A-Z</option>
            <option value="title">Title A-Z</option>
          </select>
        </div>

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

        {/* Job count */}
        {!loading && (
          <p
            style={{ color: '#3C1510', fontSize: '13px', marginBottom: '16px' }}
          >
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            {filterStage !== 'all' ? ` · ${STAGE_LABELS[filterStage]}` : ''}
            {debouncedSearch ? ` · "${debouncedSearch}"` : ''}
          </p>
        )}

        {/* metrics panel */}
        {!loading && jobs.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            {Object.entries(STAGE_LABELS).map(([val, label]) => {
              const count = jobs.filter((j) => j.status === val).length;
              return (
                <div
                  key={val}
                  style={{
                    backgroundColor: '#E6CECB',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      color: '#932C20',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      margin: 0,
                    }}
                  >
                    {count}
                  </p>
                  <p
                    style={{
                      color: '#3C1510',
                      fontSize: '12px',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#3C1510' }}>Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p style={{ color: '#3C1510', fontSize: '14px' }}>
            {filterStage === 'all' && !debouncedSearch
              ? 'No jobs yet. Click "Add Job" to get started.'
              : 'No jobs match your filters.'}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                stageHistory={stageHistoryMap.get(job.id) ?? []}
                interviews={jobInterviewsMap.get(job.id) ?? []}
                onStatusChange={handleStatusChange}
                onEdit={openEdit}
                onDelete={handleDelete}
                onViewDetail={(job) => {
                  closeAllModals();
                  setDetailJob(job);
                  setDetailNotes(job.recruiter_notes ?? '');
                  setNotesSaved(false);
                  setShowAddInterview(false);
                  setEditingInterviewIndex(null);
                  setEditingJobDetails(false);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Job detail */}
      {detailJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#00000066',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setDetailJob(null)}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '32px',
              width: '520px',
              maxHeight: '80vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* stage + edit toggle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor:
                    (
                      {
                        '0': '#6B7280',
                        '1': '#2563EB',
                        '2': '#D97706',
                        '3': '#16A34A',
                        '4': '#DC2626',
                        '5': '#9CA3AF',
                      } as Record<string, string>
                    )[detailJob.status] ?? '#6B7280',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 10px',
                  borderRadius: '999px',
                }}
              >
                {STAGE_LABELS[detailJob.status]}
              </div>
              {!editingJobDetails && (
                <button
                  onClick={() => startEditJobDetails(detailJob)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#932C20',
                    border: '1px solid #932C20',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Edit Job
                </button>
              )}
            </div>

            {editingJobDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jobDetailsError && (
                  <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                    {jobDetailsError}
                  </p>
                )}
                <div>
                  <label style={labelStyle}>Job Title</label>
                  <input
                    type="text"
                    value={detailEditTitle}
                    onChange={(e) => setDetailEditTitle(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Company</label>
                  <input
                    type="text"
                    value={detailEditCompany}
                    onChange={(e) => setDetailEditCompany(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Job Description</label>
                  <textarea
                    value={detailEditDescription}
                    onChange={(e) => setDetailEditDescription(e.target.value)}
                    style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Application Deadline</label>
                  <input
                    type="date"
                    value={detailEditDeadline}
                    onChange={(e) => setDetailEditDeadline(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={cancelEditJobDetails} style={btnSecondary}>
                    Cancel
                  </button>
                  <button
                    onClick={saveJobDetails}
                    disabled={savingJobDetails}
                    style={btnPrimary(savingJobDetails)}
                  >
                    {savingJobDetails ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* title */}
                <h2
                  style={{
                    color: '#3C1510',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    margin: 0,
                  }}
                >
                  {detailJob.title}
                </h2>

                {/* company */}
                <p
                  style={{
                    color: '#3C1510',
                    fontSize: '15px',
                    margin: 0,
                    fontWeight: '500',
                  }}
                >
                  {detailJob.company}
                </p>

                {/* date added */}
                <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                  Added: {new Date(detailJob.created_at).toLocaleDateString()}
                </p>

                {/*deadline */}
                <div>
                  <p
                    style={{
                      color: '#3C1510',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    Deadline
                  </p>
                  <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
                    {detailJob.deadline
                      ? new Date(detailJob.deadline).toLocaleDateString()
                      : 'No deadline set'}
                  </p>
                </div>

                {/* description */}
                <div>
                  <p
                    style={{
                      color: '#3C1510',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    Job Description
                  </p>
                  <p
                    style={{
                      color: '#3C1510',
                      fontSize: '14px',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {detailJob.description}
                  </p>
                </div>
              </>
            )}

            {/* recruiter Notes */}
            <div>
              <p
                style={{
                  color: '#3C1510',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                Recruiter / Contact Notes
              </p>
              <textarea
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                placeholder="Add notes about recruiter or contact..."
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'solid',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '8px',
                }}
              >
                {notesSaved && (
                  <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                    ✓ Notes saved
                  </p>
                )}
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{
                    backgroundColor: savingNotes ? '#c0847a' : '#932C20',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: savingNotes ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>

            {/* change stage of job */}
            <div>
              <p
                style={{
                  color: '#3C1510',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                Change Stage
              </p>
              <select
                value={detailJob.status}
                onChange={(e) =>
                  handleStatusChange(
                    detailJob.id,
                    e.target.value,
                    detailJob.title
                  )
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #932C20',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                  color: '#3C1510',
                  cursor: 'pointer',
                }}
              >
                <option value={detailJob.status}>
                  {STAGE_LABELS[detailJob.status]}
                </option>
                {Number(detailJob.status) < 3 && (
                  <option value={String(Number(detailJob.status) + 1)}>
                    {STAGE_LABELS[String(Number(detailJob.status) + 1)]}
                  </option>
                )}
                {detailJob.status !== '4' && detailJob.status !== '5' && (
                  <option value="4">{STAGE_LABELS['4']}</option>
                )}
                {detailJob.status !== '5' && (
                  <option value="5">{STAGE_LABELS['5']}</option>
                )}
              </select>
            </div>

            {/* Unified Timeline */}
            {detailJob && (() => {
              const jobId = detailJob.id;
              const stageHistory = stageHistoryMap.get(jobId) ?? [];
              const detailInterviews = jobInterviewsMap.get(jobId) ?? [];

              type TimelineItem =
                | { kind: 'stage'; stage: string; date: Date }
                | { kind: 'created'; date: Date }
                | { kind: 'interview'; entry: InterviewEntry; index: number; date: Date };

              const items: TimelineItem[] = [
                { kind: 'created', date: new Date(detailJob.created_at) },
                ...stageHistory.map((e) => ({
                  kind: 'stage' as const,
                  stage: e.stage,
                  date: new Date(e.changedAt),
                })),
                ...detailInterviews.map((iv, idx) => ({
                  kind: 'interview' as const,
                  entry: iv,
                  index: idx,
                  date: new Date(iv.interview_date),
                })),
              ].sort((a, b) => a.date.getTime() - b.date.getTime());

              const STAGE_COLORS_MAP: Record<string, string> = {
                '0': '#6B7280',
                '1': '#2563EB',
                '2': '#D97706',
                '3': '#16A34A',
                '4': '#DC2626',
                '5': '#9CA3AF',
              };
              const STAGE_LABELS_MAP: Record<string, string> = {
                '0': 'Interested',
                '1': 'Applied',
                '2': 'Interview',
                '3': 'Offer',
                '4': 'Rejected',
                '5': 'Archived',
              };

              function saveInterview() {
                if (!newInterviewRound.trim() || !newInterviewDate) return;
                setJobInterviewsMap((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(jobId) ?? [];
                  const entry: InterviewEntry = {
                    round_type: newInterviewRound.trim(),
                    interview_date: newInterviewDate,
                    notes: newInterviewNotes.trim(),
                  };
                  if (editingInterviewIndex !== null) {
                    next.set(
                      jobId,
                      existing.map((iv, i) => (i === editingInterviewIndex ? entry : iv))
                    );
                  } else {
                    next.set(jobId, [...existing, entry]);
                  }
                  return next;
                });
                setNewInterviewRound('');
                setNewInterviewDate('');
                setNewInterviewNotes('');
                setEditingInterviewIndex(null);
                setShowAddInterview(false);
              }

              function startEditInterview(index: number, entry: InterviewEntry) {
                setNewInterviewRound(entry.round_type);
                setNewInterviewDate(entry.interview_date);
                setNewInterviewNotes(entry.notes);
                setEditingInterviewIndex(index);
                setShowAddInterview(true);
              }

              function deleteInterview(index: number) {
                setJobInterviewsMap((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(jobId) ?? [];
                  next.set(jobId, existing.filter((_, i) => i !== index));
                  return next;
                });
              }

              return (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <p
                      style={{
                        color: '#3C1510',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        margin: 0,
                      }}
                    >
                      Timeline
                    </p>
                    <button
                      onClick={() => {
                        if (showAddInterview) {
                          setShowAddInterview(false);
                          setEditingInterviewIndex(null);
                        } else {
                          setNewInterviewRound('');
                          setNewInterviewDate('');
                          setNewInterviewNotes('');
                          setEditingInterviewIndex(null);
                          setShowAddInterview(true);
                        }
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#932C20',
                        border: '2px solid #932C20',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      + Add Interview
                    </button>
                  </div>

                  {/* Add interview form */}
                  {showAddInterview && (
                    <div
                      style={{
                        backgroundColor: '#D9958C',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#3C1510',
                          fontWeight: 'bold',
                          margin: 0,
                        }}
                      >
                        {editingInterviewIndex !== null ? 'Edit Interview' : 'New Interview'}
                      </p>
                      <div>
                        <label
                          style={{
                            fontSize: '12px',
                            color: '#3C1510',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Round Type
                        </label>
                        <select
                          value={newInterviewRound}
                          onChange={(e) => setNewInterviewRound(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'solid',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            backgroundColor: 'white',
                          }}
                        >
                          <option value="">Select round...</option>
                          <option value="First Round">First Round</option>
                          <option value="Virtual">Virtual</option>
                          <option value="Technical">Technical</option>
                          <option value="Final">Final</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '12px',
                            color: '#3C1510',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={newInterviewDate}
                          onChange={(e) => setNewInterviewDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'solid',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: '12px',
                            color: '#3C1510',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          Notes
                        </label>
                        <textarea
                          value={newInterviewNotes}
                          onChange={(e) => setNewInterviewNotes(e.target.value)}
                          placeholder="How did it go? What was discussed?"
                          style={{
                            width: '100%',
                            height: '60px',
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'solid',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            resize: 'vertical',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '8px',
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowAddInterview(false);
                            setEditingInterviewIndex(null);
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#3C1510',
                            border: '1px solid #3C1510',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveInterview}
                          style={{
                            backgroundColor: '#932C20',
                            color: 'white',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {editingInterviewIndex !== null ? 'Update' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Timeline items */}
                  <div style={{ position: 'relative', paddingLeft: '20px' }}>
                    {/* vertical line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '7px',
                        top: '8px',
                        bottom: '8px',
                        width: '2px',
                        backgroundColor: '#C9A99E',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {items.map((item, i) => {
                        if (item.kind === 'created') {
                          return (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '2px',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: STAGE_COLORS_MAP['0'],
                                  border: '2px solid #E6CECB',
                                  marginTop: '2px',
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <p style={{ color: '#3C1510', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
                                  Added as Interested
                                </p>
                                <p style={{ color: '#7A4540', fontSize: '11px', margin: '2px 0 0 0' }}>
                                  {item.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (item.kind === 'stage') {
                          return (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '2px',
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '3px',
                                  backgroundColor: STAGE_COLORS_MAP[item.stage] ?? '#6B7280',
                                  border: '2px solid #E6CECB',
                                  marginTop: '2px',
                                  flexShrink: 0,
                                }}
                              />
                              <div>
                                <p style={{ color: '#3C1510', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
                                  Stage changed to{' '}
                                  <span style={{ color: STAGE_COLORS_MAP[item.stage] ?? '#3C1510' }}>
                                    {STAGE_LABELS_MAP[item.stage] ?? 'Unknown'}
                                  </span>
                                </p>
                                <p style={{ color: '#7A4540', fontSize: '11px', margin: '2px 0 0 0' }}>
                                  {item.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          );
                        }

                        if (item.kind === 'interview') {
                          return (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '1px',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: '#7C3AED',
                                  border: '2px solid #E6CECB',
                                  marginTop: '1px',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <span style={{ color: 'white', fontSize: '7px', fontWeight: 'bold' }}>▸</span>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <p style={{ color: '#3C1510', fontSize: '12px', fontWeight: 'bold', margin: 0 }}>
                                    Interview: {item.entry.round_type}
                                  </p>
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                      onClick={() => startEditInterview(item.index, item.entry)}
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#932C20',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        padding: 0,
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => deleteInterview(item.index)}
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#932C20',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        padding: 0,
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                                <p style={{ color: '#7A4540', fontSize: '11px', margin: '2px 0 0 0' }}>
                                  {item.date.toLocaleString(undefined, {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                {item.entry.notes && (
                                  <p
                                    style={{
                                      color: '#3C1510',
                                      fontSize: '11px',
                                      margin: '4px 0 0 0',
                                      backgroundColor: '#D9958C',
                                      borderRadius: '4px',
                                      padding: '4px 8px',
                                    }}
                                  >
                                    {item.entry.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Close button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '8px',
              }}
            >
              <button
                onClick={() => setDetailJob(null)}
                style={{
                  backgroundColor: '#932C20',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Job Modal */}
      {showAddModal && (
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
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '400px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h2
              style={{
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Add Job
            </h2>
            {modalError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {modalError}
              </p>
            )}
            <div>
              <label style={labelStyle}>Job Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Job Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Application Deadline</label>
              <input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleAddJob}
                disabled={adding}
                style={btnPrimary(adding)}
              >
                {adding ? 'Adding…' : 'Add Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  Archive Confirmation Modal */}
      {archiveTarget && (
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
          >
            <h2
              style={{
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Archive Job?
            </h2>
            <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
              <strong>{archiveTarget.title}</strong> will be removed from your
              jobs list and moved to your archive. This cannot be undone.
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setArchiveTarget(null)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArchive}
                disabled={archiving}
                style={btnPrimary(archiving)}
              >
                {archiving ? 'Archiving…' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}