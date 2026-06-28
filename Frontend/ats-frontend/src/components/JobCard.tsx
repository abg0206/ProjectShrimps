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

export type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  status: string;
  created_at: string;
};

type JobCardProps = {
  job: Job;
  onStatusChange: (jobId: number, newStage: string, jobTitle: string) => void;
  onEdit: (job: Job) => void;
  onDelete: (jobId: number) => void;
};

export default function JobCard({
  job,
  onStatusChange,
  onEdit,
  onDelete,
}: JobCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#E6CECB',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
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

      {/* stage dropdown */}
      <select
        value={job.status}
        onChange={(e) => onStatusChange(job.id, e.target.value, job.title)}
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
        <span>Added: {new Date(job.created_at).toLocaleDateString()}</span>
        <div style={{ display: 'flex', gap: '12px' }}>
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
