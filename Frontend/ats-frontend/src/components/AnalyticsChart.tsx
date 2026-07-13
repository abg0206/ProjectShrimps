// S3-014 (Expand Dashboard Analytics)
// report (Interested → Applied) for the last 7 days
// CONNECTS TO: GET /api/analytics/:email/conversions (Backend/routes/analytics.js)
//   • Imported by DashboardPage.tsx as a persistent right-hand column,
//     rendered as a sibling of the Sidebar + main content, e.g.:
//       <div style={{ display: 'flex', minHeight: '100vh' }}>
//         <Sidebar />
//         <div style={{ flex: 1 }}>...main content...</div>
//         <AnalyticsChart email={userEmail} />
//       </div>

import { useState, useEffect } from 'react';

interface Transition {
  job_id: number;
  title: string;
  company: string;
  from_stage: string;
  to_stage: string;
  changed_at: string;
}

interface Props {
  email: string;
  // Bump this (e.g. increment a counter) whenever a job's stage changes
  // elsewhere in the app, so this panel refetches and stays in sync.
  refreshKey?: number;
}

export default function AnalyticsChart({ email, refreshKey }: Props) {
  const [interestedToApplied, setInterestedToApplied] = useState<Transition[]>([]);
  const [totalInterested, setTotalInterested] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!email) return;

    async function fetchAnalytics() {
      setLoading(true);
      setError('');
      try {
        // fetch conversion data from analytics endpoint
        const res = await fetch(
          `/api/analytics/${encodeURIComponent(email)}/conversions`
        );
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();
        setInterestedToApplied(data.interestedToApplied ?? []);
        // Denominator for conversion rate: jobs currently Interested OR
        // Applied, computed server-side so already-converted jobs aren't
        // dropped from the pool. (Previously this was a separate fetch of
        // only stage=0 jobs, which undercounted and inflated the rate.)
        setTotalInterested(data.totalInterested ?? 0);
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Could not load analytics.');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [email, refreshKey]);

  // Calculate conversion rate percentage
  const conversionRate =
    totalInterested > 0
      ? Math.round((interestedToApplied.length / totalInterested) * 100)
      : 0;

  // ── Styles UI ── always-visible right-hand column, not a floating widget
  const panelStyle: React.CSSProperties = {
    width: '300px',
    flexShrink: 0,
    backgroundColor: '#E6CECB',
    padding: '24px 20px',
    minHeight: '100vh',
    overflowY: 'auto',
    boxShadow: '-2px 0 8px rgba(0,0,0,0.06)',
  };

  const headerRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '2px',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#3C1510',
    margin: 0,
  };

  const subStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#888',
    marginBottom: '16px',
    marginTop: '4px',
  };

  const conversionBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#932C20',
    color: '#ffffff',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '12px',
  };

  const rateBarContainerStyle: React.CSSProperties = {
    backgroundColor: '#E6CECB',
    borderRadius: '8px',
    height: '8px',
    width: '100%',
    overflow: 'hidden',
    marginTop: '4px',
  };

  const rateBarFillStyle: React.CSSProperties = {
    backgroundColor: '#932C20',
    height: '100%',
    width: `${conversionRate}%`,
    borderRadius: '8px',
    transition: 'width 0.4s ease',
  };

  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #3C1510',
    margin: '12px 0',
  };

  const jobRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: '#E6CECB',
    marginBottom: '6px',
  };

  const jobTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3C1510',
  };

  const jobCompanyStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#3C1510',
    marginTop: '2px',
  };

  const jobDateStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#3C1510',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerRowStyle}>
        <span style={{ fontSize: '16px' }}>📊</span>
        <h3 style={headerStyle}>Stage Conversion Report</h3>
      </div>
      <p style={subStyle}>Last 7 days · Interested → Applied</p>

      {loading ? (
        <p style={{ color: '#3C1510', fontSize: '12px', padding: '8px 0' }}>
          Loading analytics…
        </p>
      ) : error ? (
        <p style={{ color: '#932C20', fontSize: '12px', padding: '8px 0' }}>
          {error}
        </p>
      ) : (
        <>
          {/* Conversion badge */}
          <span style={conversionBadgeStyle}>
            {interestedToApplied.length} job
            {interestedToApplied.length !== 1 ? 's' : ''} moved to Applied
          </span>

          {/* Progress bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#3C1510',
              marginBottom: '4px',
            }}>
              <span>Conversion rate</span>
              <span style={{ fontWeight: 600, color: '#3C1510' }}>
                {interestedToApplied.length} of {totalInterested} ({conversionRate}%)
              </span>
            </div>
            <div style={rateBarContainerStyle}>
              <div style={rateBarFillStyle} />
            </div>
          </div>

          <div style={dividerStyle} />

          {/* Job list */}
          {interestedToApplied.length === 0 ? (
            <p style={{ color: '#3C1510', fontSize: '12px', textAlign: 'center', padding: '8px 0' }}>
              No jobs moved from Interested to Applied in the last 7 days.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#3C1510', fontWeight: 600, marginBottom: '8px' }}>
                Jobs that moved forward:
              </p>
              {interestedToApplied.map((t, i) => (
                <div key={i} style={jobRowStyle}>
                  <div>
                    <div style={jobTitleStyle}>{t.title}</div>
                    <div style={jobCompanyStyle}>@ {t.company}</div>
                  </div>
                  <div style={jobDateStyle}>
                    {new Date(t.changed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          <div style={dividerStyle} />

          {/* Footer */}
          <p style={{ fontSize: '11px', color: '#3C1510', textAlign: 'center', margin: 0 }}>
            Showing transitions from the past 7 days only
          </p>
        </>
      )}
    </div>
  );
}