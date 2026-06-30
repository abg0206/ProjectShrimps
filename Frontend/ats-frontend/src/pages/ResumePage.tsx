import Sidebar from '../components/Sidebar';
import {
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type ChangeEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { plainTextToEditorHtml } from '../lib/utils';

const REWRITE_GOALS = [
  'Professional, ATS-friendly',
  'More concise / shorter',
  'More detailed / longer',
  'Fix grammar only',
  'More technical',
  'More executive / senior-sounding',
];

export default function ResumePage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';
  const [isEmpty, setIsEmpty] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<string>('3');
  const [blockType, setBlockType] = useState<string>('<p>');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [rewriteGoal, setRewriteGoal] = useState<string>(REWRITE_GOALS[0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [tailoredFor, setTailoredFor] = useState<string | null>(null);
  const [tailoredJobId, setTailoredJobId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // If we got here from "Tailor Resume" on a job card, drop that AI-generated
  // resume straight into the editor.
  useEffect(() => {
    const state = location.state as {
      aiContent?: string;
      resumeHtml?: string;
      jobTitle?: string;
      jobId?: number;
    } | null;
    const incoming = state?.resumeHtml ?? state?.aiContent;
    if (!incoming) return;

    if (editorRef.current) {
      editorRef.current.innerHTML = state?.resumeHtml
        ? incoming
        : plainTextToEditorHtml(incoming);
      setIsEmpty(false);
    }
    setTailoredFor(state?.jobTitle ?? 'this job');
    setTailoredJobId(state?.jobId ?? null);

    // Clear the navigation state so a refresh/back doesn't redo this.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateActiveFormats() {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }

  function exec(command: string, value: string | null = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, value ?? undefined);
    updateActiveFormats();
  }

  function handleFormatBlock(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setBlockType(value);
    exec('formatBlock', value);
  }

  function handleFontSize(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setFontSize(value);
    exec('fontSize', value);
  }

  function handleInput() {
    const text = editorRef.current?.textContent || '';
    setIsEmpty(text.trim().length === 0);
    updateActiveFormats();
  }

  async function handleSave() {
    const html = editorRef.current?.innerHTML || '';
    const text = editorRef.current?.innerText.trim() || '';

    if (!text) {
      setSaveError('Write or upload a resume before saving.');
      return;
    }

    if (!tailoredJobId) {
      setSaveError(
        'Open a resume from a job first so it can be saved to that job.'
      );
      return;
    }

    setSaving(true);
    setSaveError('');
    setSaveMessage('');

    try {
      const res = await fetch(
        `/api/jobs/${encodeURIComponent(userEmail)}/${tailoredJobId}/resumes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: tailoredFor ? `Resume for ${tailoredFor}` : 'Saved resume',
            content: html,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error ?? 'Failed to save resume.');
        return;
      }

      setSaveMessage('Resume saved to this job.');
    } catch (err) {
      console.error('Save resume error:', err);
      setSaveError('Could not connect to the server.');
    } finally {
      setSaving(false);
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (!editorRef.current) return;

      if (ext === 'txt') {
        const text = await file.text();
        editorRef.current.innerText = text;
      } else if (ext === 'docx') {
        // npm install mammoth
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        editorRef.current.innerHTML = html;
      } else if (ext === 'pdf') {
        // npm install pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          let pageText = '';
          let lastY: number | null = null;
          for (const item of content.items as any[]) {
            if (typeof item.str !== 'string') continue;
            const y = item.transform[5];
            if (lastY !== null && Math.abs(y - lastY) > 1) {
              pageText += '\n';
            } else if (pageText.length > 0) {
              pageText += ' ';
            }
            pageText += item.str;
            lastY = y;
          }
          fullText += pageText + '\n\n';
        }
        editorRef.current.innerText = fullText.trim();
      } else {
        window.alert('Please upload a PDF, DOCX, or TXT file.');
        return;
      }
      setIsEmpty(false);
    } catch (err) {
      console.error('Error reading file:', err);
      window.alert('Something went wrong while reading that file.');
    } finally {
      e.target.value = '';
    }
  }

  async function handleAIEdit() {
    const currentText = editorRef.current?.innerText.trim() ?? '';

    if (!currentText) {
      window.alert('Write or upload a resume first, then try AI Edit.');
      return;
    }

    setAiError('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: currentText,
          rewriteType: rewriteGoal,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAiError(data.error ?? 'AI edit failed. Please try again.');
        return;
      }

      if (editorRef.current) {
        editorRef.current.innerHTML = plainTextToEditorHtml(data.content);
        setIsEmpty(false);
      }
      setTailoredFor(null);
    } catch (err) {
      console.error('AI edit error:', err);
      setAiError('Could not connect to the server.');
    } finally {
      setAiLoading(false);
    }
  }

  const toolbarBtnStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 10px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#3C1510',
  };

  const activeToolbarBtnStyle: CSSProperties = {
    backgroundColor: '#932C20',
    color: '#FFFFFF',
  };

  const dividerStyle: CSSProperties = {
    width: '1px',
    height: '22px',
    backgroundColor: '#c9a8a3',
    margin: '0 4px',
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
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
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
            Resume
          </h1>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              onClick={handleUploadClick}
              style={{
                backgroundColor: 'transparent',
                color: '#932C20',
                border: '1.5px solid #932C20',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              ⬆ Upload Resume
            </button>
            <select
              value={rewriteGoal}
              onChange={(e) => setRewriteGoal(e.target.value)}
              disabled={aiLoading}
              title="AI Edit goal"
              style={{
                border: '1.5px solid #932C20',
                borderRadius: '6px',
                padding: '8px 10px',
                fontSize: '13px',
                color: '#932C20',
                backgroundColor: '#fff',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {REWRITE_GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
            <button
              onClick={handleAIEdit}
              disabled={aiLoading}
              style={{
                backgroundColor: aiLoading ? '#8d76b3' : '#5B3A8E',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: aiLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {aiLoading ? '✨ Editing…' : '✨ AI Edit'}
            </button>
          </div>
        </div>

        {tailoredFor && (
          <p
            style={{
              backgroundColor: '#E9F7EF',
              border: '1px solid #16A34A',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#166534',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ✨ This resume was tailored for <strong>{tailoredFor}</strong>.
            Review it, then click Save.
          </p>
        )}

        {aiError && (
          <p
            style={{
              backgroundColor: '#F5DDD9',
              border: '1px solid #932C20',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#932C20',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {aiError}
          </p>
        )}

        {saveError && (
          <p
            style={{
              backgroundColor: '#F5DDD9',
              border: '1px solid #932C20',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#932C20',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {saveError}
          </p>
        )}

        {saveMessage && (
          <p
            style={{
              backgroundColor: '#E9F7EF',
              border: '1px solid #16A34A',
              borderRadius: '8px',
              padding: '10px 16px',
              color: '#166534',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {saveMessage}
          </p>
        )}

        {/* Toolbar */}
        <div
          style={{
            backgroundColor: '#E6CECB',
            borderRadius: '10px 10px 0 0',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            borderBottom: '1px solid #d4b9b5',
          }}
        >
          <select
            value={blockType}
            onChange={handleFormatBlock}
            style={{
              ...toolbarBtnStyle,
              border: '1px solid #d4b9b5',
              backgroundColor: '#fff',
            }}
          >
            <option value="<p>">Normal text</option>
            <option value="<h1>">Heading 1</option>
            <option value="<h2>">Heading 2</option>
            <option value="<h3>">Heading 3</option>
          </select>

          <select
            value={fontSize}
            onChange={handleFontSize}
            style={{
              ...toolbarBtnStyle,
              border: '1px solid #d4b9b5',
              backgroundColor: '#fff',
            }}
          >
            <option value="2">Small</option>
            <option value="3">Normal</option>
            <option value="5">Large</option>
            <option value="7">X-Large</option>
          </select>

          <div style={dividerStyle} />

          <button
            style={{
              ...toolbarBtnStyle,
              fontWeight: 'bold',
              ...(activeFormats.bold ? activeToolbarBtnStyle : {}),
            }}
            onClick={() => exec('bold')}
            title="Bold"
          >
            B
          </button>
          <button
            style={{
              ...toolbarBtnStyle,
              fontStyle: 'italic',
              ...(activeFormats.italic ? activeToolbarBtnStyle : {}),
            }}
            onClick={() => exec('italic')}
            title="Italic"
          >
            I
          </button>
          <button
            style={{
              ...toolbarBtnStyle,
              textDecoration: 'underline',
              ...(activeFormats.underline ? activeToolbarBtnStyle : {}),
            }}
            onClick={() => exec('underline')}
            title="Underline"
          >
            U
          </button>

          <div style={dividerStyle} />

          <button
            style={toolbarBtnStyle}
            onClick={() => exec('insertUnorderedList')}
            title="Bullet list"
          >
            • List
          </button>
          <button
            style={toolbarBtnStyle}
            onClick={() => exec('insertOrderedList')}
            title="Numbered list"
          >
            1. List
          </button>

          <div style={dividerStyle} />

          <button
            style={toolbarBtnStyle}
            onClick={() => exec('justifyLeft')}
            title="Align left"
          >
            ⟸
          </button>
          <button
            style={toolbarBtnStyle}
            onClick={() => exec('justifyCenter')}
            title="Align center"
          >
            ≡
          </button>
          <button
            style={toolbarBtnStyle}
            onClick={() => exec('justifyRight')}
            title="Align right"
          >
            ⟹
          </button>
        </div>

        {/* Editor "page" */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 2px 10px rgba(60, 21, 16, 0.15)',
            marginBottom: '16px',
            position: 'relative',
          }}
        >
          {isEmpty && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                left: '48px',
                color: '#9b9b9b',
                fontSize: '14px',
                pointerEvents: 'none',
              }}
            >
              Write your resume here...
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onSelect={updateActiveFormats}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
            suppressContentEditableWarning
            style={{
              minHeight: '700px',
              padding: '48px',
              fontSize: '14px',
              fontFamily: 'Georgia, "Times New Roman", serif',
              color: '#2b2b2b',
              lineHeight: 1.6,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              backgroundColor: saving ? '#B8736B' : '#932C20',
              color: '#FFFFFF',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
