// S3-014 (Expand Dashboard Analytics)
// report (Interested → Applied) for the last 7 days
// CONNECTS TO: GET /api/analytics/:email/conversions (Backend/routes/analytics.js)
//   • Imported by DashboardPage.tsx as <AnalyticsChart email={userEmail} />

import { useState, useEffect } from 'react';

const STAGE_LABELS: Record<string, string> = {
  '0': 'Interested',
  '1': 'Applied',
  '2': 'Interview',
  '3': 'Offer',
  '4': 'Rejected',
  '5': 'Archived',
};

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
}

export default function AnalyticsChart({ email }: Props) {
  const [interestedToApplied, setInterestedToApplied] = useState<Transition[]>([]);
  const [totalInterested, setTotalInterested] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false); // controls panel open/close

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

        // fetch total jobs at Interested stage for conversion rate denominator
        const jobsRes = await fetch(
          `/api/jobs/${encodeURIComponent(email)}?stage=0`
        );
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setTotalInterested(jobsData.length);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Could not load analytics.');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [email]);

  // Calculate conversion rate percentage
  const conversionRate =
    totalInterested > 0
      ? Math.round((interestedToApplied.length / totalInterested) * 100)
      : 0;

  // ── Styles UI
  const floatingContainer: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  };

  const toggleButton: React.CSSProperties = {
    backgroundColor: '#932C20',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '20px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    width: '300px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    maxHeight: '400px',
    overflowY: 'auto',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#3C1510',
    marginBottom: '4px',
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
    color: '#FFFFFF',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '12px',
  };

  const rateBarContainerStyle: React.CSSProperties = {
    backgroundColor: '#F3F0EF',
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
    borderTop: '1px solid #F3F0EF',
    margin: '12px 0',
  };

  const jobRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: '#F9F5F4',
    marginBottom: '6px',
  };

  const jobTitleStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: '#3C1510',
  };

  const jobCompanyStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#666',
    marginTop: '2px',
  };

  const jobDateStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#888',
    whiteSpace: 'nowrap',
  };

  // don't render anything while loading or if there's an error
  if (loading) return null;
  if (error) return null;

  return (
    <div style={floatingContainer}>

      {/* ── Expanded panel — only shown when isOpen = true  */}
      {isOpen && (
        <div style={panelStyle}>

          {/* Header */}
          <h3 style={headerStyle}>📌 Stage Conversion Report</h3>
          <p style={subStyle}>Last 7 days · Interested → Applied</p>

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
              color: '#888',
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
            <p style={{ color: '#999', fontSize: '12px', textAlign: 'center', padding: '8px 0' }}>
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
          <p style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', margin: 0 }}>
            Showing transitions from the past 7 days only
          </p>

        </div>
      )}

      {/* ── Toggle button — always visible in bottom-right  */}
      <button
        style={toggleButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        📊 {isOpen ? 'Hide Analytics ▼' : 'Analytics ▲'}
        {/* Show count badge when collapsed and there are conversions */}
        {!isOpen && interestedToApplied.length > 0 && (
          <span style={{
            backgroundColor: '#FFFFFF',
            color: '#932C20',
            borderRadius: '10px',
            padding: '1px 7px',
            fontSize: '11px',
            fontWeight: 700,
          }}>
            {interestedToApplied.length}
          </span>
        )}
      </button>

    </div>
  );
}