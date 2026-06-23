import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';

const STAGE_LABELS: Record<string, string> = {
  '0': 'Interested',
  '1': 'Applied',
  '2': 'Interview',
  '3': 'Offer',
  '4': 'Rejected',
  '5': 'Archived',
};

type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  status: string;
  created_at: string;
};

export default function DashboardPage() {
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [modalError, setModalError] = useState('');

  // Edit modal
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStage, setEditStage] = useState('0');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Normalise a raw API response into our Job shape
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

  // Load jobs on mount
  useEffect(() => {
    if (!userEmail) return;

    fetch(`/api/jobs/${encodeURIComponent(userEmail)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load jobs');
        return res.json();
      })
      .then((data) => setJobs(data.map(normalise)))
      .catch((err) => {
        console.error(err);
        setError('Could not load jobs. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

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

      const raw = await res.json();
      setJobs((prev) => [normalise(raw), ...prev]);
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
      const raw = await res.json();
      const updated = normalise(raw);
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
      setEditJob(null);
    } catch (err) {
      console.error(err);
      setEditError('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  }

  // Quick status change from card dropdown
  async function handleStatusChange(jobId: number, newStage: string) {
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

      const raw = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? normalise(raw) : j)));
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  // Delete job
  async function handleDelete(jobId: number) {
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) return;
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const filtered = jobs
    .filter((j) => {
      const matchesSearch =
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company.toLowerCase().includes(search.toLowerCase());
      const matchesStage = filterStage === 'all' || j.status === filterStage;
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

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="Search by title or company..."
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

        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: 'solid',
            marginBottom: '24px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />

        {loading ? (
          <p style={{ color: '#3C1510' }}>Loading jobs...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#3C1510', fontSize: '14px' }}>
            {jobs.length === 0
              ? 'No jobs yet. Click "Add Job" to get started.'
              : 'No jobs match your search.'}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
            }}
          >
            {filtered.map((job) => (
              <div
                key={job.id}
                style={{
                  backgroundColor: '#E6CECB',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  minHeight: '200px',
                }}
              >
                <p style={{ fontWeight: 'bold', color: '#3C1510', margin: 0 }}>
                  {job.title}
                </p>
                <p style={{ color: '#3C1510', margin: 0, fontSize: '14px' }}>
                  {job.company}
                </p>
                <p
                  style={{
                    color: '#3C1510',
                    margin: 0,
                    fontSize: '13px',
                    flex: 1,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical' as const,
                  }}
                >
                  {job.description}
                </p>

                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(job.id, e.target.value)}
                  style={{
                    fontSize: '13px',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    border: '1px solid #932C20',
                    backgroundColor: '#fff',
                    color: '#3C1510',
                    cursor: 'pointer',
                  }}
                >
                  {Object.entries(STAGE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: '#932C20',
                  }}
                >
                  <span>
                    Added: {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => openEdit(job)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#932C20',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: 0,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#932C20',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                {adding ? 'Adding...' : 'Add Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
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
                {Object.entries(STAGE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
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
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
