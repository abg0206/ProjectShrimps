import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';

const STAGE_LABELS: Record<string, string> = {
  '0': 'Interested',
  '1': 'Applied',
  '2': 'Interview',
  '3': 'Offer',
  '4': 'Rejected',
};

type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  status: string;        // '0'–'4'
  created_at: string;
};

export default function DashboardPage() {
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add job modal
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [modalError, setModalError] = useState('');

  // Load jobs on mount
  useEffect(() => {
    if (!userEmail) return;

    fetch(`/jobs/${encodeURIComponent(userEmail)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load jobs');
        return res.json();
      })
      .then((data) => setJobs(data))
      .catch((err) => {
        console.error(err);
        setError('Could not load jobs. Please refresh.');
      })
      .finally(() => setLoading(false));
  }, [userEmail]);

  // Add a new job
  async function handleAddJob() {
    setModalError('');
    if (!newTitle.trim() || !newCompany.trim() || !newDescription.trim()) {
      setModalError('All fields are required.');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/jobs/${encodeURIComponent(userEmail)}`, {
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

      const newJob = await res.json();
      setJobs((prev) => [newJob, ...prev]);
      setNewTitle('');
      setNewCompany('');
      setNewDescription('');
      setShowModal(false);
    } catch (err) {
      console.error(err);
      setModalError('Could not connect to the server.');
    } finally {
      setAdding(false);
    }
  }

  // Update job status
  async function handleStatusChange(jobId: number, newStage: string) {
    try {
      const res = await fetch(
        `/jobs/${encodeURIComponent(userEmail)}/${jobId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: newStage }),
        }
      );

      if (!res.ok) return;

      const updated = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    } catch (err) {
      console.error('Status update failed:', err);
    }
  }

  // Soft-delete a job
  async function handleDelete(jobId: number) {
    try {
      const res = await fetch(
        `/jobs/${encodeURIComponent(userEmail)}/${jobId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) return;
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#D9958C' }}>
      <Sidebar />

      <div style={{ flex: 1, padding: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#3C1510', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            My Jobs
          </h1>
          <button
            onClick={() => { setShowModal(true); setModalError(''); }}
            style={{ backgroundColor: '#932C20', color: '#E6CECB', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            Add Job
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <p style={{ backgroundColor: '#F5DDD9', border: '1px solid #932C20', borderRadius: '8px', padding: '12px 16px', color: '#932C20', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </p>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'solid', marginBottom: '24px', fontSize: '14px', boxSizing: 'border-box' }}
        />

        {/* Job cards */}
        {loading ? (
          <p style={{ color: '#3C1510' }}>Loading jobs...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#3C1510', fontSize: '14px' }}>
            {jobs.length === 0 ? 'No jobs yet. Click "Add Job" to get started.' : 'No jobs match your search.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {filtered.map((job) => (
              <div
                key={job.id}
                style={{ backgroundColor: '#E6CECB', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}
              >
                <p style={{ fontWeight: 'bold', color: '#3C1510', margin: 0 }}>{job.title}</p>
                <p style={{ color: '#3C1510', margin: 0, fontSize: '14px' }}>{job.company}</p>
                <p style={{ color: '#3C1510', margin: 0, fontSize: '13px', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const }}>
                  {job.description}
                </p>

                {/* Status dropdown */}
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(job.id, e.target.value)}
                  style={{ fontSize: '13px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #932C20', backgroundColor: '#fff', color: '#3C1510', cursor: 'pointer' }}
                >
                  {Object.entries(STAGE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#932C20' }}>
                  <span>Added: {new Date(job.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDelete(job.id)}
                    style={{ backgroundColor: 'transparent', border: 'none', color: '#932C20', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Job Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#E6CECB', borderRadius: '10px', padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ color: '#3C1510', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Add Job</h2>

            {modalError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>{modalError}</p>
            )}

            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Job Title</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Company</label>
              <input type="text" value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#3C1510', display: 'block', marginBottom: '4px' }}>Job Description</label>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                style={{ width: '100%', height: '100px', padding: '8px', borderRadius: '6px', border: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button onClick={() => setShowModal(false)}
                style={{ backgroundColor: 'transparent', color: '#3C1510', padding: '8px 20px', borderRadius: '6px', border: '1px solid #3C1510', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={handleAddJob} disabled={adding}
                style={{ backgroundColor: adding ? '#c0847a' : '#932C20', color: '#E6CECB', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: adding ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                {adding ? 'Adding...' : 'Add Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
