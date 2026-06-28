import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback } from 'react';

type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  status: string;
  created_at: string;
};

function normalise(raw: Record<string, string | number>): Job {
  return {
    id: Number(raw.id ?? raw.unique_num),
    title: String(raw.title),
    company: String(raw.company),
    description: String(raw.description),
    status: String(raw.status ?? raw.stages ?? '5'),
    created_at: String(raw.created_at),
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ArchivedPage() {
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  // Unarchive confirmation modal
  const [unarchiveTarget, setUnarchiveTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [unarchiving, setUnarchiving] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('stage', '5');
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('sort', sortBy);

      const url = `/api/jobs/${encodeURIComponent(userEmail)}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load archived jobs');
      const data = await res.json();
      setJobs(data.map(normalise));
    } catch (err) {
      console.error(err);
      setError('Could not load archived jobs. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [userEmail, debouncedSearch, sortBy]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Unarchive
  async function handleConfirmUnarchive() {
    if (!unarchiveTarget) return;
    setUnarchiving(true);
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${unarchiveTarget.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stages: '1' }),
        }
      );
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => j.id !== unarchiveTarget.id));
      }
    } catch (err) {
      console.error('Unarchive failed:', err);
    } finally {
      setUnarchiving(false);
      setUnarchiveTarget(null);
    }
  }

  // Delete permanently
  async function handleDelete(jobId: number) {
    if (!confirm('Permanently delete this job? This cannot be undone.')) return;
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
            Archived Jobs
          </h1>
        </div>

        {/* Filters */}
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
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={selectStyle}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="company">Company A–Z</option>
            <option value="title">Title A–Z</option>
          </select>

          {debouncedSearch && (
            <button
              onClick={() => setSearch('')}
              style={{
                ...btnSecondary,
                fontSize: '12px',
                padding: '6px 12px',
                whiteSpace: 'nowrap',
              }}
            >
              Clear search ✕
            </button>
          )}
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
            {jobs.length} archived job{jobs.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` · "${debouncedSearch}"` : ''}
          </p>
        )}

        {loading ? (
          <p style={{ color: '#3C1510' }}>Loading archived jobs…</p>
        ) : jobs.length === 0 ? (
          <p style={{ color: '#3C1510', fontSize: '14px' }}>
            {debouncedSearch
              ? 'No archived jobs match your search.'
              : 'No archived jobs yet.'}
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
                  opacity: 0.9,
                }}
              >
                {/* Archived badge */}
                <span
                  style={{
                    display: 'inline-block',
                    alignSelf: 'flex-start',
                    backgroundColor: '#932C20',
                    color: '#E6CECB',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  Archived
                </span>

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
                      onClick={() =>
                        setUnarchiveTarget({ id: job.id, title: job.title })
                      }
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#932C20',
                        cursor: 'pointer',
                        fontSize: '13px',
                        padding: 0,
                      }}
                    >
                      Unarchive
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
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Unarchive Confirmation Modal ── */}
      {unarchiveTarget && (
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
              Unarchive Job?
            </h2>
            <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
              <strong>{unarchiveTarget.title}</strong> will be moved back to
              your dashboard with status set to <strong>Applied</strong>.
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setUnarchiveTarget(null)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUnarchive}
                disabled={unarchiving}
                style={btnPrimary(unarchiving)}
              >
                {unarchiving ? 'Unarchiving…' : 'Unarchive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
