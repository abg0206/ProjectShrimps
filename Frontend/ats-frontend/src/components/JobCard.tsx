const STAGE_LABELS: Record<string, string> = {
  '0': 'Interested',
  '1': 'Applied',
  '2': 'Interview',
  '3': 'Offer',
  '4': 'Rejected',
  '5': 'Archived',
};

// seperate colors for different stages, we can change them though, if you guys don't agree
const STAGE_COLORS: Record<string, string> = {
  '0': '#6B7280',
  '1': '#2563EB',
  '2': '#D97706',
  '3': '#16A34A',
  '4': '#DC2626',
  '5': '#9CA3AF',
};

export type StageEvent = {
  stage: string;
  changedAt: string; // ISO date string
};

export type InterviewEntry = {
  id?: number;
  round_type: string;
  interview_date: string;
  notes: string;
};

export type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  status: string;
  created_at: string;
  recruiter_notes: string | null;
  reminder_text: string | null;
  reminder_date: string | null;
};

type JobCardProps = {
  job: Job;
  stageHistory: StageEvent[];
  interviews: InterviewEntry[];
  onStatusChange: (jobId: number, newStage: string, jobTitle: string) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: number) => void;
  onViewDetail: (job: Job) => void;
  onTailorResume: (job: Job) => void;
  isTailoring?: boolean;
  onTailorCoverLetter: (job: Job) => void;
  isTailoringCoverLetter?: boolean;
};

// Handles two formats:
//   - plain "YYYY-MM-DD" (e.g. reminder_date) — parsed as UTC by `new Date()`,
//     which can roll back a day once `.toLocaleDateString()` converts to local
//     time, so we parse the parts directly to keep the displayed day correct.
//   - full ISO timestamps (e.g. created_at, "2026-06-30T02:05:21.226Z") —
//     these are unambiguous and safe to hand straight to `new Date()`.
// Returns null (instead of silently producing a wrong/blank date) when the
// string can't be parsed, so callers can show a warning instead of hiding it.
function formatLocalDate(dateStr: string): string | null {
  const datePart = dateStr.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  if (dateStr.includes('T')) {
    // Full timestamp — let the Date constructor handle the time/zone info,
    // just verify it parsed into a real date.
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
  }

  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    // e.g. month 13 or day 32 — Date() would otherwise silently roll over
    return null;
  }
  return parsed.toLocaleDateString();
}

export default function JobCard({
  job,
  onEdit,
  onDelete,
  onViewDetail,
  onTailorResume,
  isTailoring = false,
  onTailorCoverLetter,
  isTailoringCoverLetter = false,
}: JobCardProps) {
  return (
    <div
      onClick={() => onViewDetail(job)}
      style={{
        backgroundColor: '#E6CECB',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: 'pointer',
      }}
    >
      {/* stage of job  */}

      <div
        style={{
          display: 'inline-block',
          backgroundColor: STAGE_COLORS[job.status] ?? '#6B7280',
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold',
          padding: '2px 10px',
          borderRadius: '999px',
          alignSelf: 'flex-start',
        }}
      >
        {STAGE_LABELS[job.status] ?? 'Unknown'}
      </div>

      {/* title and company */}

      <h3
        style={{
          color: '#3C1510',
          fontSize: '16px',
          fontWeight: 'bold',
          margin: 0,
        }}
      >
        {job.title}
      </h3>
      <p
        style={{
          color: '#3C1510',
          fontSize: '13px',
          margin: 0,
          fontWeight: '500',
        }}
      >
        {job.company}
      </p>

      {/* description preview */}
      <p
        style={{
          color: '#3C1510',
          fontSize: '13px',
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical' as const,
        }}
      >
        {job.description}
      </p>

      {/* reminder — only shown when both text and date are set */}
      {job.reminder_text && job.reminder_date && (
        <p
          style={{
            color: '#c600a8',
            fontSize: '14px',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Remember: {job.reminder_text} —{' '}
          {formatLocalDate(job.reminder_date) ?? (
            <span style={{ color: '#DC2626' }}>
              ⚠ Invalid reminder date ({job.reminder_date})
            </span>
          )}
        </p>
      )}

      {/* bottom of card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: '#932C20',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span>
            Added:{' '}
            {formatLocalDate(job.created_at) ?? (
              <span style={{ color: '#DC2626' }}>
                ⚠ Invalid date ({job.created_at})
              </span>
            )}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onTailorResume(job)}
            disabled={isTailoring}
            title="Generate a resume tailored to this job"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: isTailoring ? '#9b8a8a' : '#932C20',
              cursor: isTailoring ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              padding: 0,
            }}
          >
            {isTailoring ? 'Tailoring…' : 'Tailor Resume'}
          </button>
          <button
            onClick={() => onTailorCoverLetter(job)}
            disabled={isTailoringCoverLetter}
            title="Generate a cover letter tailored to this job"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: isTailoringCoverLetter ? '#9b8a8a' : '#932C20',
              cursor: isTailoringCoverLetter ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              padding: 0,
            }}
          >
            {isTailoringCoverLetter ? 'Tailoring…' : 'Tailor Cover Letter'}
          </button>
          <button
            onClick={() => onEdit(job)}
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
            onClick={() => onDelete(job.id)}
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
  );
}
