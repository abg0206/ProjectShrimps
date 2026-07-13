import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getJob,
  getCompanyResearch,
  generateCompanyResearch,
  saveCompanyResearch,
  listInterviews,
  listPrepNotes,
  addPrepNote,
  updatePrepNote,
  deletePrepNote,
  PREP_NOTE_CATEGORIES,
  type JobSummary,
  type Interview,
  type PrepNote,
} from '../lib/jobDetailApi';

const STAGE_LABELS: Record<string, string> = {
  '0': 'Interested',
  '1': 'Applied',
  '2': 'Interview',
  '3': 'Offer',
  '4': 'Rejected',
  '5': 'Archived',
};

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PREP_NOTE_CATEGORIES.map((c) => [c.value, c.label])
);

const cardStyle: React.CSSProperties = {
  backgroundColor: '#E6CECB',
  borderRadius: '10px',
  padding: '20px',
  marginBottom: '20px',
};

const btnPrimary = (disabled = false): React.CSSProperties => ({
  backgroundColor: disabled ? '#c0847a' : '#932C20',
  color: '#E6CECB',
  padding: '8px 20px',
  borderRadius: '6px',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '14px',
});

const btnSecondary: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#932C20',
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid #932C20',
  cursor: 'pointer',
  fontSize: '13px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #D9958C',
  fontSize: '14px',
  fontFamily: 'inherit',
  resize: 'vertical' as const,
  boxSizing: 'border-box' as const,
};

export default function JobDetailPage() {
  const { id } = useParams();
  const jobId = Number(id);
  const navigate = useNavigate();
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [job, setJob] = useState<JobSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // --- Company research state (S3-011 / S3-012) -------------------------
  const [researchContext, setResearchContext] = useState('');
  const [researchNotes, setResearchNotes] = useState('');
  const [researchUpdatedAt, setResearchUpdatedAt] = useState<string | null>(
    null
  );
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [savingResearch, setSavingResearch] = useState(false);
  const [researchSaveMessage, setResearchSaveMessage] = useState('');
  const [researchSaveError, setResearchSaveError] = useState('');

  // --- Interview prep notes state (S3-013) ------------------------------
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<number | null>(
    null
  );
  const [prepNotes, setPrepNotes] = useState<PrepNote[]>([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState('');

  const [newCategory, setNewCategory] = useState(
    PREP_NOTE_CATEGORIES[0].value as string
  );
  const [newContent, setNewContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    if (!userEmail || !jobId) return;
    setLoading(true);
    setLoadError('');
    try {
      const [jobData, research, interviewList] = await Promise.all([
        getJob(userEmail, jobId),
        getCompanyResearch(userEmail, jobId),
        listInterviews(userEmail, jobId),
      ]);

      setJob(jobData);
      setResearchContext(research.research_context ?? '');
      setResearchNotes(research.research_notes ?? '');
      setResearchUpdatedAt(research.updated_at);

      setInterviews(interviewList);
      if (interviewList.length > 0) {
        setSelectedInterviewId(interviewList[0].id);
      }
    } catch (err) {
      console.error(err);
      setLoadError('Could not load this job. It may not exist anymore.');
    } finally {
      setLoading(false);
    }
  }, [userEmail, jobId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const loadPrepNotes = useCallback(async () => {
    if (!userEmail || !jobId || !selectedInterviewId) {
      setPrepNotes([]);
      return;
    }
    setPrepLoading(true);
    setPrepError('');
    try {
      const notes = await listPrepNotes(userEmail, jobId, selectedInterviewId);
      setPrepNotes(notes);
    } catch (err) {
      console.error(err);
      setPrepError('Could not load prep notes for this interview.');
    } finally {
      setPrepLoading(false);
    }
  }, [userEmail, jobId, selectedInterviewId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPrepNotes();
  }, [loadPrepNotes]);

  // --- Company research handlers ----------------------------------------

  async function handleGenerateResearch() {
    if (!researchContext.trim()) {
      setGenerateError(
        'Add some context first (role focus, what to look into, etc).'
      );
      return;
    }
    setGenerating(true);
    setGenerateError('');
    try {
      const result = await generateCompanyResearch(
        userEmail,
        jobId,
        researchContext.trim()
      );
      setResearchNotes(result.research_notes);
    } catch (err) {
      console.error(err);
      setGenerateError(
        err instanceof Error ? err.message : 'Failed to generate research.'
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveResearch() {
    setSavingResearch(true);
    setResearchSaveError('');
    setResearchSaveMessage('');
    try {
      const result = await saveCompanyResearch(userEmail, jobId, {
        research_context: researchContext,
        research_notes: researchNotes,
      });
      setResearchUpdatedAt(result.updated_at);
      setResearchSaveMessage('Saved.');
      setTimeout(() => setResearchSaveMessage(''), 2500);
    } catch (err) {
      console.error(err);
      setResearchSaveError('Failed to save research.');
    } finally {
      setSavingResearch(false);
    }
  }

  // --- Prep note handlers -------------------------------------------------

  async function handleAddNote() {
    if (!selectedInterviewId || !newContent.trim()) return;
    setAddingNote(true);
    setPrepError('');
    try {
      const note = await addPrepNote(userEmail, jobId, selectedInterviewId, {
        category: newCategory,
        content: newContent.trim(),
      });
      setPrepNotes((prev) => [...prev, note]);
      setNewContent('');
    } catch (err) {
      console.error(err);
      setPrepError('Failed to add prep note.');
    } finally {
      setAddingNote(false);
    }
  }

  function startEdit(note: PrepNote) {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditCategory(note.category);
  }

  async function handleSaveEdit(noteId: number) {
    if (!selectedInterviewId || !editContent.trim()) return;
    setSavingNoteId(noteId);
    try {
      const updated = await updatePrepNote(
        userEmail,
        jobId,
        selectedInterviewId,
        noteId,
        { category: editCategory, content: editContent.trim() }
      );
      setPrepNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingNoteId(null);
    } catch (err) {
      console.error(err);
      setPrepError('Failed to update prep note.');
    } finally {
      setSavingNoteId(null);
    }
  }

  async function handleDeleteNote(noteId: number) {
    if (!selectedInterviewId) return;
    if (!confirm('Delete this prep note?')) return;
    setDeletingNoteId(noteId);
    try {
      await deletePrepNote(userEmail, jobId, selectedInterviewId, noteId);
      setPrepNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error(err);
      setPrepError('Failed to delete prep note.');
    } finally {
      setDeletingNoteId(null);
    }
  }

  const notesByCategory = PREP_NOTE_CATEGORIES.map((cat) => ({
    ...cat,
    notes: prepNotes.filter((n) => n.category === cat.value),
  }));
  const otherNotes = prepNotes.filter(
    (n) => !PREP_NOTE_CATEGORIES.some((c) => c.value === n.category)
  );

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#D9958C',
      }}
    >
      <Sidebar />

      <div style={{ flex: 1, padding: '32px', maxWidth: '900px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3C1510',
            cursor: 'pointer',
            fontSize: '13px',
            marginBottom: '16px',
            padding: 0,
          }}
        >
          ← Back
        </button>

        {loading ? (
          <p style={{ color: '#3C1510' }}>Loading job…</p>
        ) : loadError ? (
          <p style={{ color: '#932C20' }}>{loadError}</p>
        ) : job ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#932C20',
                  color: '#E6CECB',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  marginBottom: '8px',
                }}
              >
                {STAGE_LABELS[job.status] ?? 'Unknown'}
              </div>
              <h1
                style={{
                  color: '#3C1510',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  margin: 0,
                }}
              >
                {job.title}
              </h1>
              <p
                style={{
                  color: '#3C1510',
                  fontSize: '15px',
                  margin: '4px 0 0',
                }}
              >
                {job.company}
              </p>
            </div>

            {/* Company research (S3-011 / S3-012) */}
            <div style={cardStyle}>
              <h2
                style={{
                  color: '#3C1510',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginTop: 0,
                  marginBottom: '12px',
                }}
              >
                Company Research
              </h2>

              <label
                style={{
                  color: '#3C1510',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                What should we focus on?
              </label>
              <textarea
                value={researchContext}
                onChange={(e) => setResearchContext(e.target.value)}
                placeholder="e.g. engineering culture, recent product launches, interview process for this role…"
                rows={3}
                style={{ ...textareaStyle, marginBottom: '10px' }}
              />

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <button
                  onClick={handleGenerateResearch}
                  disabled={generating}
                  style={btnPrimary(generating)}
                >
                  {generating ? 'Generating…' : 'Generate with AI'}
                </button>
                {generateError && (
                  <span style={{ color: '#932C20', fontSize: '13px' }}>
                    {generateError}
                  </span>
                )}
              </div>

              <label
                style={{
                  color: '#3C1510',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Research notes
              </label>
              <textarea
                value={researchNotes}
                onChange={(e) => setResearchNotes(e.target.value)}
                placeholder="Generated notes appear here — feel free to edit before saving."
                rows={10}
                style={{ ...textareaStyle, marginBottom: '10px' }}
              />

              <div
                style={{ display: 'flex', gap: '10px', alignItems: 'center' }}
              >
                <button
                  onClick={handleSaveResearch}
                  disabled={savingResearch}
                  style={btnPrimary(savingResearch)}
                >
                  {savingResearch ? 'Saving…' : 'Save'}
                </button>
                {researchSaveMessage && (
                  <span style={{ color: '#3C1510', fontSize: '13px' }}>
                    {researchSaveMessage}
                  </span>
                )}
                {researchSaveError && (
                  <span style={{ color: '#932C20', fontSize: '13px' }}>
                    {researchSaveError}
                  </span>
                )}
                {researchUpdatedAt && (
                  <span
                    style={{
                      color: '#932C20',
                      fontSize: '12px',
                      marginLeft: 'auto',
                    }}
                  >
                    Last updated {new Date(researchUpdatedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Interview prep notes (S3-013) */}
            <div style={cardStyle}>
              <h2
                style={{
                  color: '#3C1510',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  marginTop: 0,
                  marginBottom: '12px',
                }}
              >
                Interview Prep Notes
              </h2>

              {interviews.length === 0 ? (
                <p style={{ color: '#3C1510', fontSize: '14px' }}>
                  No interviews logged for this job yet. Add one from the
                  dashboard to start tracking prep notes.
                </p>
              ) : (
                <>
                  <label
                    style={{
                      color: '#3C1510',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '6px',
                    }}
                  >
                    Interview
                  </label>
                  <select
                    value={selectedInterviewId ?? ''}
                    onChange={(e) =>
                      setSelectedInterviewId(Number(e.target.value))
                    }
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D9958C',
                      fontSize: '14px',
                      marginBottom: '16px',
                      backgroundColor: '#fff',
                    }}
                  >
                    {interviews.map((iv) => (
                      <option key={iv.id} value={iv.id}>
                        {iv.round_type} —{' '}
                        {new Date(iv.interview_date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>

                  {prepError && (
                    <p style={{ color: '#932C20', fontSize: '13px' }}>
                      {prepError}
                    </p>
                  )}

                  {prepLoading ? (
                    <p style={{ color: '#3C1510', fontSize: '14px' }}>
                      Loading prep notes…
                    </p>
                  ) : (
                    <div style={{ marginBottom: '20px' }}>
                      {[
                        ...notesByCategory.map(
                          (c) => [c.label, c.notes] as const
                        ),
                        ...(otherNotes.length
                          ? [
                              [
                                CATEGORY_LABELS['general'] ?? 'Other',
                                otherNotes,
                              ] as const,
                            ]
                          : []),
                      ].map(([label, notes]) =>
                        notes.length === 0 ? null : (
                          <div key={label} style={{ marginBottom: '14px' }}>
                            <h3
                              style={{
                                color: '#932C20',
                                fontSize: '13px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                              }}
                            >
                              {label}
                            </h3>
                            {notes.map((note) => (
                              <div
                                key={note.id}
                                style={{
                                  backgroundColor: '#fff',
                                  borderRadius: '8px',
                                  padding: '10px 14px',
                                  marginBottom: '8px',
                                }}
                              >
                                {editingNoteId === note.id ? (
                                  <>
                                    <select
                                      value={editCategory}
                                      onChange={(e) =>
                                        setEditCategory(e.target.value)
                                      }
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #D9958C',
                                        fontSize: '13px',
                                        marginBottom: '8px',
                                      }}
                                    >
                                      {PREP_NOTE_CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>
                                          {c.label}
                                        </option>
                                      ))}
                                    </select>
                                    <textarea
                                      value={editContent}
                                      onChange={(e) =>
                                        setEditContent(e.target.value)
                                      }
                                      rows={3}
                                      style={{
                                        ...textareaStyle,
                                        marginBottom: '8px',
                                      }}
                                    />
                                    <div
                                      style={{ display: 'flex', gap: '8px' }}
                                    >
                                      <button
                                        onClick={() => handleSaveEdit(note.id)}
                                        disabled={savingNoteId === note.id}
                                        style={btnPrimary(
                                          savingNoteId === note.id
                                        )}
                                      >
                                        {savingNoteId === note.id
                                          ? 'Saving…'
                                          : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => setEditingNoteId(null)}
                                        style={btnSecondary}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p
                                      style={{
                                        color: '#3C1510',
                                        fontSize: '14px',
                                        margin: '0 0 8px',
                                        whiteSpace: 'pre-wrap',
                                      }}
                                    >
                                      {note.content}
                                    </p>
                                    <div
                                      style={{ display: 'flex', gap: '12px' }}
                                    >
                                      <button
                                        onClick={() => startEdit(note)}
                                        style={{
                                          background: 'none',
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
                                        onClick={() =>
                                          handleDeleteNote(note.id)
                                        }
                                        disabled={deletingNoteId === note.id}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#932C20',
                                          cursor: 'pointer',
                                          fontSize: '13px',
                                          padding: 0,
                                        }}
                                      >
                                        {deletingNoteId === note.id
                                          ? 'Deleting…'
                                          : 'Delete'}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      )}
                      {prepNotes.length === 0 && (
                        <p style={{ color: '#3C1510', fontSize: '14px' }}>
                          No prep notes yet for this interview.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Add note form */}
                  <div
                    style={{
                      borderTop: '1px solid #D9958C',
                      paddingTop: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '10px',
                        marginBottom: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid #D9958C',
                          fontSize: '14px',
                          backgroundColor: '#fff',
                        }}
                      >
                        {PREP_NOTE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Add a prep note…"
                      rows={2}
                      style={{ ...textareaStyle, marginBottom: '8px' }}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={addingNote || !newContent.trim()}
                      style={btnPrimary(addingNote || !newContent.trim())}
                    >
                      {addingNote ? 'Adding…' : 'Add Note'}
                    </button>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/dashboard"
              style={{ color: '#3C1510', fontSize: '13px' }}
            >
              ← Back to dashboard
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
