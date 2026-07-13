import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import JobCard, {
  Job,
  StageEvent,
  InterviewEntry,
} from '../components/JobCard';
import AnalyticsChart from '../components/AnalyticsChart';
import {
  getCompanyResearch,
  generateCompanyResearch,
  saveCompanyResearch,
  listPrepNotes,
  addPrepNote,
  updatePrepNote,
  deletePrepNote,
  PREP_NOTE_CATEGORIES,
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

//we no longer need since we have a job card

// Postgres DATE columns can come back as full ISO timestamps
// (e.g. "2027-03-15T00:00:00.000Z"). <input type="date"> only
// accepts a bare YYYY-MM-DD, so normalise here.
function toDateInputValue(raw: unknown): string | null {
  if (!raw) return null;
  const str = String(raw);
  return str.slice(0, 10);
}

// Today's date as YYYY-MM-DD, used as the floor for reminder date inputs
// so users can't set a reminder in the past.
function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalise(raw: Record<string, string | number>): Job {
  return {
    id: Number(raw.id ?? raw.unique_num),
    title: String(raw.title),
    company: String(raw.company),
    description: String(raw.description),
    status: String(raw.status ?? raw.stages ?? '0'),
    created_at: String(raw.created_at),
    recruiter_notes: raw.recruiter_notes ? String(raw.recruiter_notes) : null,
    reminder_text: raw.reminder_text ? String(raw.reminder_text) : null,
    reminder_date: toDateInputValue(raw.reminder_date),
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
  const navigate = useNavigate();
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bumped whenever something that affects the analytics panel happens
  // (job stage change, archive, add, or delete) so AnalyticsChart knows to
  // refetch and stay in sync.
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  // AI resume tailoring
  const [tailoringJobId, setTailoringJobId] = useState<number | null>(null);
  const [tailorResult, setTailorResult] = useState<{
    job: Job;
    content: string;
    contentIsHtml?: boolean;
  } | null>(null);
  const [tailorError, setTailorError] = useState('');

  // AI cover letter tailoring
  const [tailoringCoverLetterJobId, setTailoringCoverLetterJobId] = useState<
    number | null
  >(null);
  const [coverLetterResult, setCoverLetterResult] = useState<{
    job: Job;
    content: string;
    contentIsHtml?: boolean;
  } | null>(null);
  const [coverLetterError, setCoverLetterError] = useState('');

  // Debounce search so we don't fire on every keystroke
  const debouncedSearch = useDebounce(search, 300);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [modalError, setModalError] = useState('');

  const [newReminder, setNewReminder] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');

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
  const [detailEditReminder, setDetailEditReminder] = useState('');
  const [detailEditReminderDate, setDetailEditReminderDate] = useState('');
  const [savingJobDetails, setSavingJobDetails] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);

  const [detailNotes, setDetailNotes] = useState('');
  const [savingNotes, setSaveNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Company research — S3-011 (generate) / S3-012 (persist notes)
  const [researchContext, setResearchContext] = useState('');
  const [researchNotes, setResearchNotes] = useState('');
  const [researchUpdatedAt, setResearchUpdatedAt] = useState<string | null>(
    null
  );
  const [researchLoading, setResearchLoading] = useState(false);
  const [generatingResearch, setGeneratingResearch] = useState(false);
  const [generateResearchError, setGenerateResearchError] = useState('');
  const [savingResearch, setSavingResearch] = useState(false);
  const [researchSaveMessage, setResearchSaveMessage] = useState('');
  const [researchSaveError, setResearchSaveError] = useState('');

  // Interview prep notes — S3-013
  const [selectedInterviewId, setSelectedInterviewId] = useState<
    number | null
  >(null);
  const [prepNotes, setPrepNotes] = useState<PrepNote[]>([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState('');
  const [newPrepCategory, setNewPrepCategory] = useState(
    PREP_NOTE_CATEGORIES[0].value as string
  );
  const [newPrepContent, setNewPrepContent] = useState('');
  const [addingPrepNote, setAddingPrepNote] = useState(false);
  const [editingPrepNoteId, setEditingPrepNoteId] = useState<number | null>(
    null
  );
  const [editPrepContent, setEditPrepContent] = useState('');
  const [editPrepCategory, setEditPrepCategory] = useState('');
  const [savingPrepNoteId, setSavingPrepNoteId] = useState<number | null>(
    null
  );
  const [deletingPrepNoteId, setDeletingPrepNoteId] = useState<number | null>(
    null
  );

  // Per-job stage history and interviews stored by job id
  const [stageHistoryMap, setStageHistoryMap] = useState<
    Map<number, StageEvent[]>
  >(new Map());
  const [jobInterviewsMap, setJobInterviewsMap] = useState<
    Map<number, InterviewEntry[]>
  >(new Map());

  // interview tracker — scoped to current detailJob
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [newInterviewRound, setNewInterviewRound] = useState('');
  const [newInterviewDate, setNewInterviewDate] = useState('');
  const [newInterviewNotes, setNewInterviewNotes] = useState('');
  // null = adding a brand-new interview; a number = editing that existing entry
  const [editingInterviewIndex, setEditingInterviewIndex] = useState<
    number | null
  >(null);

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
    setReminderError('');
    setShowSavedConfirmation(false);
    setResearchContext('');
    setResearchNotes('');
    setResearchUpdatedAt(null);
    setGenerateResearchError('');
    setResearchSaveMessage('');
    setResearchSaveError('');
    setSelectedInterviewId(null);
    setPrepNotes([]);
    setPrepError('');
    setNewPrepContent('');
    setEditingPrepNoteId(null);
  }

  // Company research — load saved context/notes for a job (S3-011 / S3-012)
  async function loadCompanyResearch(jobId: number) {
    setResearchLoading(true);
    try {
      const research = await getCompanyResearch(userEmail, jobId);
      setResearchContext(research.research_context ?? '');
      setResearchNotes(research.research_notes ?? '');
      setResearchUpdatedAt(research.updated_at);
    } catch (err) {
      console.error('Failed to load company research:', err);
    } finally {
      setResearchLoading(false);
    }
  }

  async function handleGenerateResearch() {
    if (!detailJob) return;
    if (!researchContext.trim()) {
      setGenerateResearchError(
        'Add some context first (role focus, what to look into, etc).'
      );
      return;
    }
    setGeneratingResearch(true);
    setGenerateResearchError('');
    try {
      const result = await generateCompanyResearch(
        userEmail,
        detailJob.id,
        researchContext.trim()
      );
      setResearchNotes(result.research_notes);
    } catch (err) {
      console.error('Failed to generate company research:', err);
      setGenerateResearchError(
        err instanceof Error ? err.message : 'Failed to generate research.'
      );
    } finally {
      setGeneratingResearch(false);
    }
  }

  async function handleSaveResearch() {
    if (!detailJob) return;
    setSavingResearch(true);
    setResearchSaveError('');
    setResearchSaveMessage('');
    try {
      const result = await saveCompanyResearch(userEmail, detailJob.id, {
        research_context: researchContext,
        research_notes: researchNotes,
      });
      setResearchUpdatedAt(result.updated_at);
      setResearchSaveMessage('Saved.');
      setTimeout(() => setResearchSaveMessage(''), 2500);
    } catch (err) {
      console.error('Failed to save company research:', err);
      setResearchSaveError('Failed to save research.');
    } finally {
      setSavingResearch(false);
    }
  }

  // Interview prep notes — S3-013

  async function loadPrepNotes(jobId: number, interviewId: number) {
    setPrepLoading(true);
    setPrepError('');
    try {
      const notes = await listPrepNotes(userEmail, jobId, interviewId);
      setPrepNotes(notes);
    } catch (err) {
      console.error('Failed to load prep notes:', err);
      setPrepError('Could not load prep notes for this interview.');
    } finally {
      setPrepLoading(false);
    }
  }

  async function handleAddPrepNote() {
    if (!detailJob || !selectedInterviewId || !newPrepContent.trim()) return;
    setAddingPrepNote(true);
    setPrepError('');
    try {
      const note = await addPrepNote(
        userEmail,
        detailJob.id,
        selectedInterviewId,
        { category: newPrepCategory, content: newPrepContent.trim() }
      );
      setPrepNotes((prev) => [...prev, note]);
      setNewPrepContent('');
    } catch (err) {
      console.error('Failed to add prep note:', err);
      setPrepError('Failed to add prep note.');
    } finally {
      setAddingPrepNote(false);
    }
  }

  function startEditPrepNote(note: PrepNote) {
    setEditingPrepNoteId(note.id);
    setEditPrepContent(note.content);
    setEditPrepCategory(note.category);
  }

  async function handleSavePrepNoteEdit(noteId: number) {
    if (!detailJob || !selectedInterviewId || !editPrepContent.trim()) return;
    setSavingPrepNoteId(noteId);
    try {
      const updated = await updatePrepNote(
        userEmail,
        detailJob.id,
        selectedInterviewId,
        noteId,
        { category: editPrepCategory, content: editPrepContent.trim() }
      );
      setPrepNotes((prev) =>
        prev.map((n) => (n.id === noteId ? updated : n))
      );
      setEditingPrepNoteId(null);
    } catch (err) {
      console.error('Failed to update prep note:', err);
      setPrepError('Failed to update prep note.');
    } finally {
      setSavingPrepNoteId(null);
    }
  }

  async function handleDeletePrepNote(noteId: number) {
    if (!detailJob || !selectedInterviewId) return;
    if (!confirm('Delete this prep note?')) return;
    setDeletingPrepNoteId(noteId);
    try {
      await deletePrepNote(
        userEmail,
        detailJob.id,
        selectedInterviewId,
        noteId
      );
      setPrepNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete prep note:', err);
      setPrepError('Failed to delete prep note.');
    } finally {
      setDeletingPrepNoteId(null);
    }
  }

  function renderPrepNotesPanel() {
    return (
                                      <div
                                        style={{
                                          marginTop: '8px',
                                          backgroundColor: '#F3E4E1',
                                          borderRadius: '6px',
                                          padding: '10px',
                                        }}
                                      >
                                        {prepError && (
                                          <p
                                            style={{
                                              color: '#932C20',
                                              fontSize: '11px',
                                              margin: '0 0 6px',
                                            }}
                                          >
                                            {prepError}
                                          </p>
                                        )}

                                        {prepLoading ? (
                                          <p
                                            style={{
                                              color: '#3C1510',
                                              fontSize: '12px',
                                              margin: 0,
                                            }}
                                          >
                                            Loading prep notes…
                                          </p>
                                        ) : (
                                          <div style={{ marginBottom: '8px' }}>
                                            {prepNotes.length === 0 && (
                                              <p
                                                style={{
                                                  color: '#3C1510',
                                                  fontSize: '12px',
                                                  margin: '0 0 6px',
                                                }}
                                              >
                                                No prep notes yet.
                                              </p>
                                            )}
                                            {prepNotes.map((note) => {
                                              const categoryLabel =
                                                PREP_NOTE_CATEGORIES.find(
                                                  (c) =>
                                                    c.value === note.category
                                                )?.label ?? note.category;
                                              return (
                                                <div
                                                  key={note.id}
                                                  style={{
                                                    backgroundColor: '#F3E4E1',
                                                    borderRadius: '6px',
                                                    padding: '6px 10px',
                                                    marginBottom: '6px',
                                                  }}
                                                >
                                                  {editingPrepNoteId ===
                                                  note.id ? (
                                                    <>
                                                      <select
                                                        value={
                                                          editPrepCategory
                                                        }
                                                        onChange={(e) =>
                                                          setEditPrepCategory(
                                                            e.target.value
                                                          )
                                                        }
                                                        style={{
                                                          padding: '4px 8px',
                                                          borderRadius: '4px',
                                                          border:
                                                            '1px solid #D9958C',
                                                          fontSize: '11px',
                                                          marginBottom: '6px',
                                                        }}
                                                      >
                                                        {PREP_NOTE_CATEGORIES.map(
                                                          (c) => (
                                                            <option
                                                              key={c.value}
                                                              value={c.value}
                                                            >
                                                              {c.label}
                                                            </option>
                                                          )
                                                        )}
                                                      </select>
                                                      <textarea
                                                        value={
                                                          editPrepContent
                                                        }
                                                        onChange={(e) =>
                                                          setEditPrepContent(
                                                            e.target.value
                                                          )
                                                        }
                                                        style={{
                                                          ...inputStyle,
                                                          height: '50px',
                                                          fontSize: '12px',
                                                          resize:
                                                            'vertical' as const,
                                                          marginBottom: '6px',
                                                        }}
                                                      />
                                                      <div
                                                        style={{
                                                          display: 'flex',
                                                          gap: '8px',
                                                        }}
                                                      >
                                                        <button
                                                          onClick={() =>
                                                            handleSavePrepNoteEdit(
                                                              note.id
                                                            )
                                                          }
                                                          disabled={
                                                            savingPrepNoteId ===
                                                            note.id
                                                          }
                                                          style={btnPrimary(
                                                            savingPrepNoteId ===
                                                              note.id
                                                          )}
                                                        >
                                                          {savingPrepNoteId ===
                                                          note.id
                                                            ? 'Saving…'
                                                            : 'Save'}
                                                        </button>
                                                        <button
                                                          onClick={() =>
                                                            setEditingPrepNoteId(
                                                              null
                                                            )
                                                          }
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
                                                          color: '#932C20',
                                                          fontSize: '9px',
                                                          fontWeight: 700,
                                                          textTransform:
                                                            'uppercase' as const,
                                                          letterSpacing:
                                                            '0.4px',
                                                          margin: '0 0 3px',
                                                        }}
                                                      >
                                                        {categoryLabel}
                                                      </p>
                                                      <p
                                                        style={{
                                                          color: '#3C1510',
                                                          fontSize: '12px',
                                                          margin: '0 0 4px',
                                                          whiteSpace:
                                                            'pre-wrap' as const,
                                                        }}
                                                      >
                                                        {note.content}
                                                      </p>
                                                      <div
                                                        style={{
                                                          display: 'flex',
                                                          gap: '10px',
                                                        }}
                                                      >
                                                        <button
                                                          onClick={() =>
                                                            startEditPrepNote(
                                                              note
                                                            )
                                                          }
                                                          style={{
                                                            background:
                                                              'none',
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
                                                          onClick={() =>
                                                            handleDeletePrepNote(
                                                              note.id
                                                            )
                                                          }
                                                          disabled={
                                                            deletingPrepNoteId ===
                                                            note.id
                                                          }
                                                          style={{
                                                            background:
                                                              'none',
                                                            border: 'none',
                                                            color: '#932C20',
                                                            cursor: 'pointer',
                                                            fontSize: '11px',
                                                            padding: 0,
                                                          }}
                                                        >
                                                          {deletingPrepNoteId ===
                                                          note.id
                                                            ? 'Deleting…'
                                                            : 'Delete'}
                                                        </button>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {/* Add note form */}
                                        <div
                                          style={{
                                            borderTop: '1px solid #D9958C',
                                            paddingTop: '8px',
                                          }}
                                        >
                                          <select
                                            value={newPrepCategory}
                                            onChange={(e) =>
                                              setNewPrepCategory(
                                                e.target.value
                                              )
                                            }
                                            style={{
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              border: '1px solid #D9958C',
                                              fontSize: '12px',
                                              backgroundColor: '#F3E4E1',
                                              marginBottom: '6px',
                                            }}
                                          >
                                            {PREP_NOTE_CATEGORIES.map((c) => (
                                              <option
                                                key={c.value}
                                                value={c.value}
                                              >
                                                {c.label}
                                              </option>
                                            ))}
                                          </select>
                                          <textarea
                                            value={newPrepContent}
                                            onChange={(e) =>
                                              setNewPrepContent(
                                                e.target.value
                                              )
                                            }
                                            placeholder="Add a prep note…"
                                            style={{
                                              ...inputStyle,
                                              height: '44px',
                                              fontSize: '12px',
                                              resize: 'vertical' as const,
                                              marginBottom: '6px',
                                            }}
                                          />
                                          <button
                                            onClick={handleAddPrepNote}
                                            disabled={
                                              addingPrepNote ||
                                              !newPrepContent.trim()
                                            }
                                            style={btnPrimary(
                                              addingPrepNote ||
                                                !newPrepContent.trim()
                                            )}
                                          >
                                            {addingPrepNote
                                              ? 'Adding…'
                                              : 'Add Note'}
                                          </button>
                                        </div>
                                      </div>
    );
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

      // Fetch archived count separately (archived jobs live at a different endpoint)
      const archivedRes = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/archived`
      );
      if (archivedRes.ok) {
        const archivedData = await archivedRes.json();
        setArchivedCount(archivedData.length);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load jobs. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [userEmail, filterStage, debouncedSearch, sortBy]);

  // Re-fetch whenever filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs();
  }, [fetchJobs]);

  // Interview prep notes (S3-013) — notes panel lives inline under each
  // interview in the Timeline and is opened per-interview, so we only need
  // to clear the selection if the interview it belonged to disappears
  // (e.g. deleted, or a different job's modal opened).
  useEffect(() => {
    if (!detailJob) {
      if (selectedInterviewId !== null) setSelectedInterviewId(null);
      return;
    }
    const interviews = jobInterviewsMap.get(detailJob.id) ?? [];
    const stillValid = interviews.some(
      (iv) => iv.id === selectedInterviewId
    );
    if (selectedInterviewId !== null && !stillValid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedInterviewId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailJob, jobInterviewsMap]);

  // Load prep notes whenever the selected interview changes.
  useEffect(() => {
    if (!detailJob || !selectedInterviewId) {
      setPrepNotes([]);
      return;
    }
    loadPrepNotes(detailJob.id, selectedInterviewId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailJob, selectedInterviewId]);

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
          reminder_text: newReminder.trim() || null,
          reminder_date: newReminderDate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const message = data.error ?? 'Failed to add job.';
        if (message.toLowerCase().includes('reminder')) {
          setReminderError(message);
        } else {
          setModalError(message);
        }
        return;
      }
      // Refetch so new job respects current filters/sort
      await fetchJobs();
      setAnalyticsRefreshKey((prev) => prev + 1);
      setNewTitle('');
      setNewCompany('');
      setNewDescription('');
      setNewReminder('');
      setNewReminderDate('');
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
    loadInterviews(job.id);
    loadStageHistory(job.id);
    loadCompanyResearch(job.id);
    startEditJobDetails(job);
  }

  function startEditJobDetails(job: Job) {
    setDetailEditTitle(job.title);
    setDetailEditCompany(job.company);
    setDetailEditDescription(job.description);
    setDetailEditReminder(job.reminder_text ?? '');
    setDetailEditReminderDate(toDateInputValue(job.reminder_date) ?? '');
    setJobDetailsError('');
    setEditingJobDetails(true);
  }

  function cancelEditJobDetails() {
    setEditingJobDetails(false);
    setJobDetailsError('');
  }

  // Save inline job-detail edits (title/company/description/reminder).
  // Stage is intentionally left untouched here — it's changed via the
  // "Change Stage" dropdown, which already has its own archive-confirmation flow.
  async function saveJobDetails() {
    if (!detailJob) return;
    setJobDetailsError('');
    if (
      !detailEditTitle.trim() ||
      !detailEditCompany.trim() ||
      !detailEditDescription.trim()
    ) {
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
            title: detailEditTitle.trim(),
            company: detailEditCompany.trim(),
            description: detailEditDescription.trim(),
            reminder_text: detailEditReminder.trim() || null,
            reminder_date: detailEditReminderDate || null,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        const message = data.error ?? 'Failed to save.';
        if (message.toLowerCase().includes('reminder')) {
          setReminderError(message);
        } else {
          setJobDetailsError(message);
        }
        return;
      }
      setDetailJob((prev) =>
        prev
          ? {
              ...prev,
              title: detailEditTitle.trim(),
              company: detailEditCompany.trim(),
              description: detailEditDescription.trim(),
              reminder_text: detailEditReminder.trim() || null,
              reminder_date: detailEditReminderDate || null,
            }
          : prev
      );
      await fetchJobs();
      setShowSavedConfirmation(true);
      setTimeout(() => setShowSavedConfirmation(false), 2500);
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
      // Refresh stage history from the server so it reflects what was
      // actually recorded (and survives refresh/reopen).
      await loadStageHistory(jobId);
      // Also update detailJob if it's open
      setDetailJob((prev) =>
        prev && prev.id === jobId ? { ...prev, status: newStage } : prev
      );
      await fetchJobs();
      setAnalyticsRefreshKey((prev) => prev + 1);
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
        setArchivedCount((prev) => prev + 1);
        // In case the detail view still references this job, clear it too.
        setDetailJob((prev) =>
          prev && prev.id === archiveTarget.id ? null : prev
        );
        setAnalyticsRefreshKey((prev) => prev + 1);
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
      setAnalyticsRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  async function handleTailorResume(job: Job) {
    setTailorError('');
    setTailoringJobId(job.id);
    try {
      const savedRes = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${job.id}/resumes/latest`
      );
      const savedData = await savedRes.json();

      if (savedRes.ok && savedData.resume?.content) {
        setTailorResult({
          job,
          content: savedData.resume.content,
          contentIsHtml: true,
        });
        return;
      }

      if (!savedRes.ok && savedRes.status !== 404) {
        setTailorError(
          savedData.error ?? 'Could not check for a saved resume for this job.'
        );
        return;
      }

      const res = await fetch(
        `/api/ai/resume/${encodeURIComponent(userEmail)}/${job.id}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTailorError(
          data.error ?? 'Could not generate a tailored resume for this job.'
        );
        return;
      }
      setTailorResult({ job, content: data.content });
    } catch (err) {
      console.error('Tailor resume failed:', err);
      setTailorError('Could not connect to the server.');
    } finally {
      setTailoringJobId(null);
    }
  }

  function handleOpenTailoredResume() {
    if (!tailorResult) return;
    navigate('/resume', {
      state: {
        ...(tailorResult.contentIsHtml
          ? { resumeHtml: tailorResult.content }
          : { aiContent: tailorResult.content }),
        jobTitle: `${tailorResult.job.title} at ${tailorResult.job.company}`,
        jobId: tailorResult.job.id,
      },
    });
  }

  async function handleTailorCoverLetter(job: Job) {
    setCoverLetterError('');
    setTailoringCoverLetterJobId(job.id);
    try {
      const savedRes = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${job.id}/cover-letters/latest`
      );
      const savedData = await savedRes.json();

      if (savedRes.ok && savedData.coverLetter?.content) {
        setCoverLetterResult({
          job,
          content: savedData.coverLetter.content,
          contentIsHtml: true,
        });
        return;
      }

      if (!savedRes.ok && savedRes.status !== 404) {
        setCoverLetterError(
          savedData.error ??
            'Could not check for a saved cover letter for this job.'
        );
        return;
      }

      const res = await fetch(
        `/api/ai/cover-letter/${encodeURIComponent(userEmail)}/${job.id}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCoverLetterError(
          data.error ??
            'Could not generate a tailored cover letter for this job.'
        );
        return;
      }
      setCoverLetterResult({ job, content: data.content });
    } catch (err) {
      console.error('Tailor cover letter failed:', err);
      setCoverLetterError('Could not connect to the server.');
    } finally {
      setTailoringCoverLetterJobId(null);
    }
  }

  function handleOpenTailoredCoverLetter() {
    if (!coverLetterResult) return;
    navigate('/cover-letter', {
      state: {
        ...(coverLetterResult.contentIsHtml
          ? { coverLetterHtml: coverLetterResult.content }
          : { aiContent: coverLetterResult.content }),
        jobTitle: `${coverLetterResult.job.title} at ${coverLetterResult.job.company}`,
        jobId: coverLetterResult.job.id,
      },
    });
  }

  async function loadStageHistory(jobId: number) {
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}/history`
      );
      if (!res.ok) return;
      const data: { stage: string; changed_at: string }[] = await res.json();
      setStageHistoryMap((prev) => {
        const next = new Map(prev);
        next.set(
          jobId,
          data.map((row) => ({
            stage: row.stage,
            changedAt: row.changed_at,
          }))
        );
        return next;
      });
    } catch (err) {
      console.error('Failed to load stage history:', err);
    }
  }

  async function loadInterviews(
    jobId: number
  ): Promise<InterviewEntry[] | null> {
    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}/interviews`
      );
      if (!res.ok) return null;
      const data: InterviewEntry[] = await res.json();
      setJobInterviewsMap((prev) => {
        const next = new Map(prev);
        next.set(jobId, data);
        return next;
      });
      return data;
    } catch (err) {
      console.error('Failed to load interviews:', err);
      return null;
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => navigate('/archived')} style={btnSecondary}>
              Archive
            </button>
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
            onChange={(e) => {
              if (e.target.value === '5') {
                navigate('/archived');
                return;
              }
              setFilterStage(e.target.value);
            }}
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

        {tailorError && (
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
            {tailorError}
          </p>
        )}

        {coverLetterError && (
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
            {coverLetterError}
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
              const count =
                val === '5'
                  ? archivedCount
                  : jobs.filter((j) => j.status === val).length;
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
                onTailorResume={handleTailorResume}
                isTailoring={tailoringJobId === job.id}
                onTailorCoverLetter={handleTailorCoverLetter}
                isTailoringCoverLetter={tailoringCoverLetterJobId === job.id}
                onViewDetail={(job) => {
                  closeAllModals();
                  setDetailJob(job);
                  setDetailNotes(job.recruiter_notes ?? '');
                  setNotesSaved(false);
                  setShowAddInterview(false);
                  setEditingInterviewIndex(null);
                  loadInterviews(job.id);
                  loadStageHistory(job.id);
                  loadCompanyResearch(job.id);
                  startEditJobDetails(job);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* S3-014: Stage Conversion Analytics — third column, always visible */}
      <AnalyticsChart email={userEmail} refreshKey={analyticsRefreshKey} />

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
            </div>

            {editingJobDetails ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
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
                    style={{
                      ...inputStyle,
                      height: '100px',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Reminder</label>
                  <input
                    type="text"
                    value={detailEditReminder}
                    onChange={(e) => setDetailEditReminder(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="date"
                    value={detailEditReminderDate}
                    min={todayDateInputValue()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && val < todayDateInputValue()) return;
                      setDetailEditReminderDate(val);
                    }}
                    style={{ ...inputStyle, marginTop: '8px' }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {showSavedConfirmation && (
                    <span
                      style={{
                        color: '#16A34A',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginRight: '4px',
                      }}
                    >
                      ✓ Saved!
                    </span>
                  )}
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

                {/* reminder */}
                <div>
                  <p
                    style={{
                      color: '#3C1510',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '4px',
                    }}
                  >
                    Reminder
                  </p>
                  <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
                    {detailJob.reminder_text
                      ? `${detailJob.reminder_text}${
                          detailJob.reminder_date
                            ? ` — ${new Date(
                                detailJob.reminder_date
                              ).toLocaleDateString()}`
                            : ''
                        }`
                      : 'No reminder set'}
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

            {/* Company research (S3-011 / S3-012) */}
            <div>
              <p
                style={{
                  color: '#3C1510',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                }}
              >
                Company Research
              </p>

              {researchLoading ? (
                <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                  Loading research…
                </p>
              ) : (
                <>
                  <label style={{ ...labelStyle, marginTop: '8px' }}>
                    What should we focus on?
                  </label>
                  <textarea
                    value={researchContext}
                    onChange={(e) => setResearchContext(e.target.value)}
                    placeholder="e.g. engineering culture, recent product launches, interview process for this role…"
                    style={{
                      ...inputStyle,
                      height: '60px',
                      resize: 'vertical' as const,
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      marginTop: '8px',
                    }}
                  >
                    <button
                      onClick={handleGenerateResearch}
                      disabled={generatingResearch}
                      style={btnPrimary(generatingResearch)}
                    >
                      {generatingResearch ? 'Generating…' : 'Generate with AI'}
                    </button>
                    {generateResearchError && (
                      <span style={{ color: '#932C20', fontSize: '12px' }}>
                        {generateResearchError}
                      </span>
                    )}
                  </div>

                  <label style={{ ...labelStyle, marginTop: '12px' }}>
                    Research notes
                  </label>
                  <textarea
                    value={researchNotes}
                    onChange={(e) => setResearchNotes(e.target.value)}
                    placeholder="Generated notes appear here — feel free to edit before saving."
                    style={{
                      ...inputStyle,
                      height: '140px',
                      resize: 'vertical' as const,
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
                    {researchSaveMessage && (
                      <p
                        style={{
                          color: '#3C1510',
                          fontSize: '13px',
                          margin: 0,
                        }}
                      >
                        ✓ {researchSaveMessage}
                      </p>
                    )}
                    {researchSaveError && (
                      <p
                        style={{
                          color: '#932C20',
                          fontSize: '13px',
                          margin: 0,
                        }}
                      >
                        {researchSaveError}
                      </p>
                    )}
                    {researchUpdatedAt && (
                      <span style={{ color: '#932C20', fontSize: '11px' }}>
                        Last updated{' '}
                        {new Date(researchUpdatedAt).toLocaleString()}
                      </span>
                    )}
                    <button
                      onClick={handleSaveResearch}
                      disabled={savingResearch}
                      style={{
                        backgroundColor: savingResearch ? '#c0847a' : '#932C20',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: savingResearch ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {savingResearch ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              )}
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
                {/* Current stage always shown */}
                <option value={detailJob.status}>
                  {STAGE_LABELS[detailJob.status]}
                </option>
                {/* Next stage in sequence — only for stages 0, 1, 2 (next would be 1, 2, 3) */}
                {Number(detailJob.status) < 3 && (
                  <option value={String(Number(detailJob.status) + 1)}>
                    {STAGE_LABELS[String(Number(detailJob.status) + 1)]}
                  </option>
                )}
                {/* Rejected — always available unless already Rejected or Archived */}
                {detailJob.status !== '4' && detailJob.status !== '5' && (
                  <option value="4">{STAGE_LABELS['4']}</option>
                )}
                {/* Archived — always available unless already Archived */}
                {detailJob.status !== '5' && (
                  <option value="5">{STAGE_LABELS['5']}</option>
                )}
              </select>
            </div>

            {/* Unified Timeline */}
            {detailJob &&
              (() => {
                const jobId = detailJob.id;
                const stageHistory = stageHistoryMap.get(jobId) ?? [];
                const detailInterviews = jobInterviewsMap.get(jobId) ?? [];

                type TimelineItem =
                  | { kind: 'stage'; stage: string; date: Date }
                  | { kind: 'created'; date: Date }
                  | {
                      kind: 'interview';
                      entry: InterviewEntry;
                      index: number;
                      date: Date;
                    };

                const getTimelinePosition = (item: TimelineItem) => {
                  if (item.kind === 'created') return 0;
                  if (item.kind === 'interview') return 2.5;
                  return Number(item.stage) || 0;
                };

                const items: TimelineItem[] = [
                  {
                    kind: 'created' as const,
                    date: new Date(detailJob.created_at),
                  },
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
                ].sort((a, b) => {
                  const positionDifference =
                    getTimelinePosition(a) - getTimelinePosition(b);

                  if (positionDifference !== 0) return positionDifference;

                  return a.date.getTime() - b.date.getTime();
                });

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

                async function saveInterview() {
                  if (!newInterviewRound.trim() || !newInterviewDate) return;
                  const entry: InterviewEntry = {
                    round_type: newInterviewRound.trim(),
                    interview_date: newInterviewDate,
                    notes: newInterviewNotes.trim(),
                  };

                  if (editingInterviewIndex !== null) {
                    const existing =
                      jobInterviewsMap.get(jobId)?.[editingInterviewIndex];

                    if (!existing?.id) {
                      console.error('Cannot edit interview: missing id');
                      return;
                    }

                    try {
                      const res = await fetch(
                        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}/interviews/${existing.id}`,
                        {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(entry),
                        }
                      );
                      if (!res.ok) {
                        console.error(
                          'Failed to update interview:',
                          await res.text()
                        );
                        return;
                      }
                      await loadInterviews(jobId);
                    } catch (err) {
                      console.error('Failed to update interview:', err);
                      return;
                    }
                  } else {
                    try {
                      const res = await fetch(
                        `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}/interviews`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(entry),
                        }
                      );
                      if (!res.ok) {
                        console.error(
                          'Failed to save interview:',
                          await res.text()
                        );
                        return;
                      }
                      const created = await res
                        .json()
                        .catch(() => null as InterviewEntry | null);
                      const refreshed = await loadInterviews(jobId);

                      // Rather than closing the form, drop straight into
                      // "edit" mode for the interview we just created so its
                      // Prep Notes section is available immediately — no
                      // need to close and reopen via the timeline's Edit
                      // link just to jot down prep notes.
                      const newId = created?.id;
                      const newIndex =
                        newId !== undefined && refreshed
                          ? refreshed.findIndex((iv) => iv.id === newId)
                          : -1;

                      if (newIndex !== -1) {
                        setEditingInterviewIndex(newIndex);
                        setSelectedInterviewId(newId as number);
                        return;
                      }
                    } catch (err) {
                      console.error('Failed to save interview:', err);
                      return;
                    }
                  }

                  setNewInterviewRound('');
                  setNewInterviewDate('');
                  setNewInterviewNotes('');
                  setEditingInterviewIndex(null);
                  setShowAddInterview(false);
                }

                function startEditInterview(
                  index: number,
                  entry: InterviewEntry
                ) {
                  setNewInterviewRound(entry.round_type);
                  setNewInterviewDate(entry.interview_date);
                  setNewInterviewNotes(entry.notes);
                  setEditingInterviewIndex(index);
                  setShowAddInterview(true);
                }

                async function deleteInterview(index: number) {
                  const existing = jobInterviewsMap.get(jobId)?.[index];

                  if (!existing?.id) {
                    // No id to delete on the backend with — just drop it locally.
                    setJobInterviewsMap((prev) => {
                      const next = new Map(prev);
                      const current = next.get(jobId) ?? [];
                      next.set(
                        jobId,
                        current.filter((_, i) => i !== index)
                      );
                      return next;
                    });
                    return;
                  }

                  try {
                    const res = await fetch(
                      `/api/jobs/${encodeURIComponent(userEmail)}/${jobId}/interviews/${existing.id}`,
                      { method: 'DELETE' }
                    );
                    if (!res.ok) {
                      console.error(
                        'Failed to delete interview:',
                        await res.text()
                      );
                      return;
                    }
                    await loadInterviews(jobId);
                  } catch (err) {
                    console.error('Failed to delete interview:', err);
                  }
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
                          {editingInterviewIndex !== null
                            ? 'Edit Interview'
                            : 'New Interview'}
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
                            onChange={(e) =>
                              setNewInterviewRound(e.target.value)
                            }
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
                            onChange={(e) =>
                              setNewInterviewDate(e.target.value)
                            }
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
                            onChange={(e) =>
                              setNewInterviewNotes(e.target.value)
                            }
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

                        {/* Interview prep notes (S3-013) — only available once
                            the interview has been saved and has an id. */}
                        {editingInterviewIndex !== null &&
                          detailInterviews[editingInterviewIndex]?.id !==
                            undefined && (
                            <div>
                              {(() => {
                                const editingId = detailInterviews[
                                  editingInterviewIndex
                                ]!.id as number;
                                return (
                                  <>
                                    <button
                                      onClick={() =>
                                        setSelectedInterviewId((prev) =>
                                          prev === editingId ? null : editingId
                                        )
                                      }
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#932C20',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight:
                                          selectedInterviewId === editingId
                                            ? 700
                                            : 400,
                                        padding: 0,
                                      }}
                                    >
                                      {selectedInterviewId === editingId
                                        ? 'Hide Prep Notes'
                                        : 'Prep Notes'}
                                    </button>
                                    {selectedInterviewId === editingId &&
                                      renderPrepNotesPanel()}
                                  </>
                                );
                              })()}
                            </div>
                          )}

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
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {items.map((item, i) => {
                          if (item.kind === 'created') {
                            return (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'flex-start',
                                }}
                              >
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
                                  <p
                                    style={{
                                      color: '#3C1510',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      margin: 0,
                                    }}
                                  >
                                    Added as Interested
                                  </p>
                                  <p
                                    style={{
                                      color: '#7A4540',
                                      fontSize: '11px',
                                      margin: '2px 0 0 0',
                                    }}
                                  >
                                    {item.date.toLocaleDateString(undefined, {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          if (item.kind === 'stage') {
                            return (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'flex-start',
                                }}
                              >
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: '2px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '3px',
                                    backgroundColor:
                                      STAGE_COLORS_MAP[item.stage] ?? '#6B7280',
                                    border: '2px solid #E6CECB',
                                    marginTop: '2px',
                                    flexShrink: 0,
                                  }}
                                />
                                <div>
                                  <p
                                    style={{
                                      color: '#3C1510',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      margin: 0,
                                    }}
                                  >
                                    Stage changed to{' '}
                                    <span
                                      style={{
                                        color:
                                          STAGE_COLORS_MAP[item.stage] ??
                                          '#3C1510',
                                      }}
                                    >
                                      {STAGE_LABELS_MAP[item.stage] ??
                                        'Unknown'}
                                    </span>
                                  </p>
                                  <p
                                    style={{
                                      color: '#7A4540',
                                      fontSize: '11px',
                                      margin: '2px 0 0 0',
                                    }}
                                  >
                                    {item.date.toLocaleDateString(undefined, {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          if (item.kind === 'interview') {
                            return (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  gap: '10px',
                                  alignItems: 'flex-start',
                                }}
                              >
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
                                  <span
                                    style={{
                                      color: 'white',
                                      fontSize: '7px',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    ▸
                                  </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <p
                                      style={{
                                        color: '#3C1510',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        margin: 0,
                                      }}
                                    >
                                      Interview: {item.entry.round_type}
                                    </p>
                                    <div
                                      style={{ display: 'flex', gap: '10px' }}
                                    >
                                      {item.entry.id !== undefined && (
                                        <button
                                          onClick={() =>
                                            setSelectedInterviewId((prev) =>
                                              prev === item.entry.id
                                                ? null
                                                : (item.entry.id as number)
                                            )
                                          }
                                          style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#932C20',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            fontWeight:
                                              selectedInterviewId ===
                                              item.entry.id
                                                ? 700
                                                : 400,
                                            padding: 0,
                                          }}
                                        >
                                          {selectedInterviewId ===
                                          item.entry.id
                                            ? 'Hide Prep Notes'
                                            : 'Prep Notes'}
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          startEditInterview(
                                            item.index,
                                            item.entry
                                          )
                                        }
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
                                        onClick={() =>
                                          deleteInterview(item.index)
                                        }
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
                                  <p
                                    style={{
                                      color: '#7A4540',
                                      fontSize: '11px',
                                      margin: '2px 0 0 0',
                                    }}
                                  >
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

                                  {/* Interview prep notes (S3-013) — inline, per interview */}
                                  {item.entry.id !== undefined &&
                                    selectedInterviewId === item.entry.id &&
                                    renderPrepNotesPanel()}
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
              <label style={labelStyle}>Reminder</label>
              <input
                type="text"
                placeholder="What's this reminder for?"
                value={newReminder}
                onChange={(e) => setNewReminder(e.target.value)}
                style={inputStyle}
              />
              <input
                type="date"
                value={newReminderDate}
                min={todayDateInputValue()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && val < todayDateInputValue()) return;
                  setNewReminderDate(val);
                }}
                style={{ ...inputStyle, marginTop: '8px' }}
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

      {/* Reminder Error Modal */}
      {reminderError && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setReminderError('')}
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
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: '#932C20',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Reminder Error
            </h2>
            <p style={{ color: '#3C1510', fontSize: '14px', margin: 0 }}>
              {reminderError}
            </p>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button onClick={() => setReminderError('')} style={btnPrimary()}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailored Resume preview modal */}
      {tailorResult && (
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
          onClick={() => setTailorResult(null)}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              ✨ Resume tailored for {tailorResult.job.title} at{' '}
              {tailorResult.job.company}
            </h2>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '13px',
                color: '#2b2b2b',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {tailorResult.contentIsHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: tailorResult.content }}
                />
              ) : (
                tailorResult.content
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setTailorResult(null)}
                style={btnSecondary}
              >
                Close
              </button>
              <button onClick={handleOpenTailoredResume} style={btnPrimary()}>
                Open in Resume Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tailored Cover Letter preview modal */}
      {coverLetterResult && (
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
          onClick={() => setCoverLetterResult(null)}
        >
          <div
            style={{
              backgroundColor: '#E6CECB',
              borderRadius: '10px',
              padding: '24px',
              width: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              ✨ Cover letter tailored for {coverLetterResult.job.title} at{' '}
              {coverLetterResult.job.company}
            </h2>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '13px',
                color: '#2b2b2b',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {coverLetterResult.contentIsHtml ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: coverLetterResult.content,
                  }}
                />
              ) : (
                coverLetterResult.content
              )}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setCoverLetterResult(null)}
                style={btnSecondary}
              >
                Close
              </button>
              <button
                onClick={handleOpenTailoredCoverLetter}
                style={btnPrimary()}
              >
                Open in Cover Letter Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}