import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback, useRef } from 'react';
import JobCard, { Job } from '../components/JobCard';

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

  // Archive confirmation modal
  const [archiveTarget, setArchiveTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [archiving, setArchiving] = useState(false);

  // Edit modal
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStage, setEditStage] = useState('0');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

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
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      setModalError('Could not connect to the server.');
    } finally {
      setAdding(false);
    }
  }

  // Open edit modal
  function openEdit(job: Job) {
    setEditJob(job);
    setEditTitle(job.title);
    setEditCompany(job.company);
    setEditDescription(job.description);
    setEditStage(job.status);
    setEditError('');
  }

  // Save edit
  async function handleSaveEdit() {
    if (!editJob) return;
    setEditError('');
    if (!editTitle.trim() || !editCompany.trim() || !editDescription.trim()) {
      setEditError('All fields are required.');
      return;
    }
    // Intercept archive from edit modal too
    if (editStage === '5') {
      setArchiveTarget({ id: editJob.id, title: editJob.title });
      setEditJob(null);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${editJob.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stages: editStage,
            title: editTitle.trim(),
            company: editCompany.trim(),
            description: editDescription.trim(),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error ?? 'Failed to save.');
        return;
      }
      // Refetch so the card reflects the new stage filter
      await fetchJobs();
      setEditJob(null);
    } catch (err) {
      console.error(err);
      setEditError('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  }

  // Quick status change from card dropdown
  async function handleStatusChange(
    jobId: number,
    newStage: string,
    jobTitle: string
  ) {
    // Intercept archive — show confirmation modal instead of firing immediately
    if (newStage === '5') {
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
    } catch (err) {
      console.error('Delete failed:', err);
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
                onStatusChange={handleStatusChange}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Add Job Modal ── */}
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

      {/* ── Edit Job Modal ── */}
      {editJob && (
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
              Edit Job
            </h2>
            {editError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {editError}
              </p>
            )}
            <div>
              <label style={labelStyle}>Job Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input
                type="text"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Job Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                style={{ ...inputStyle, height: '100px', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={editStage}
                onChange={(e) => setEditStage(e.target.value)}
                style={{
                  ...inputStyle,
                  border: '1px solid #932C20',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
              >
                {/* Current stage always shown */}
                <option value={editJob!.status}>
                  {STAGE_LABELS[editJob!.status]}
                </option>
                {/* Next stage (if not already at Rejected=4 or Archived=5) */}
                {Number(editJob!.status) < 4 && (
                  <option value={String(Number(editJob!.status) + 1)}>
                    {STAGE_LABELS[String(Number(editJob!.status) + 1)]}
                  </option>
                )}
                {/* Archived is always available unless already archived */}
                {editJob!.status !== '5' && (
                  <option value="5">{STAGE_LABELS['5']}</option>
                )}
              </select>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '8px',
              }}
            >
              <button onClick={() => setEditJob(null)} style={btnSecondary}>
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                style={btnPrimary(saving)}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Archive Confirmation Modal ── */}
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
