import Sidebar from '../components/Sidebar';
import { useState, useEffect, useCallback, useRef } from 'react';

interface DocumentVersion {
  versionNumber: number;
  updatedAt: string;
  note: string;
}

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  tags: string[];
  updatedAt: string;
  versions: DocumentVersion[];
}

export default function DocumentsPage() {
  const session = JSON.parse(sessionStorage.getItem('user') ?? '{}');
  const userEmail = session.email ?? '';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const MAX_FILE_SIZE_MB = 10;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only PDF and Word documents are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setUploadError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setUploadFile(file);
  }

  async function handleUpload() {
    if (!uploadFile) {
      setUploadError('Please select a file.');
      return;
    }
    setUploading(true);
    setUploadError('');

    try {
      const newDoc: Document = {
        id: crypto.randomUUID(),
        title: uploadFile.name,
        type: 'Resume',
        status: 'active',
        tags: [],
        updatedAt: new Date().toISOString(),
        versions: [
          {
            versionNumber: 1,
            updatedAt: new Date().toISOString(),
            note: 'Initial version',
          },
        ],
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setShowUploadModal(false);
      setUploadFile(null);
    } catch (err) {
      console.error(err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleDownload(doc: Document) {
    alert(`Downloading "${doc.title}" (placeholder — no file storage yet).`);
  }

  function handleDuplicate(doc: Document) {
    const copy: Document = {
      ...doc,
      id: crypto.randomUUID(),
      title: `${doc.title} (Copy)`,
      updatedAt: new Date().toISOString(),
      versions: [
        {
          versionNumber: 1,
          updatedAt: new Date().toISOString(),
          note: 'Initial version',
        },
      ],
    };
    setDocuments((prev) => [copy, ...prev]);
  }

  function handleArchiveToggle(doc: Document) {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? { ...d, status: d.status === 'archived' ? 'active' : 'archived' }
          : d
      )
    );
  }

  function handleConfirmRename() {
    if (!renameTarget || !renameValue.trim()) return;
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === renameTarget.id ? { ...d, title: renameValue.trim() } : d
      )
    );
    setRenameTarget(null);
    setRenameValue('');
  }

  const fetchDocuments = useCallback(async () => {
    if (!userEmail) return;
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(userEmail)}`
      );
      if (!res.ok) throw new Error('Failed to load documents');
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
      setError('Could not load documents.');
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments = documents
    .filter((doc) => typeFilter === 'all' || doc.type === typeFilter)
    .filter((doc) => statusFilter === 'all' || doc.status === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

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

      <div
        style={{
          flex: 1,
          padding: '32px',
        }}
      >
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
            Document Library
          </h1>

          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadError('');
              setUploadFile(null);
            }}
            style={{
              backgroundColor: '#932C20',
              color: '#E6CECB',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Upload Document
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Types</option>
            <option value="Resume">Resume</option>
            <option value="Cover Letter">Cover Letter</option>
            <option value="Portfolio">Portfolio</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={selectStyle}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
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

        {!isLoading && (
          <p
            style={{ color: '#3C1510', fontSize: '13px', marginBottom: '16px' }}
          >
            {filteredDocuments.length} document
            {filteredDocuments.length !== 1 ? 's' : ''}
          </p>
        )}

        {isLoading ? (
          <p style={{ color: '#3C1510' }}>...</p>
        ) : filteredDocuments.length === 0 ? (
          <p style={{ color: '#3C1510', fontSize: '14px' }}>
            No documents yet.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#E6CECB',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <p style={{ fontWeight: 'bold', color: '#3C1510', margin: 0 }}>
                  {doc.title}
                </p>
                <p style={{ color: '#3C1510', margin: 0, fontSize: '13px' }}>
                  {doc.type} · {doc.status}
                </p>
                <p style={{ color: '#932C20', margin: 0, fontSize: '12px' }}>
                  Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '4px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => handleDownload(doc)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#932C20',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0,
                    }}
                  >
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setRenameTarget({ id: doc.id, title: doc.title });
                      setRenameValue(doc.title);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#932C20',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0,
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDuplicate(doc)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#932C20',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0,
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleArchiveToggle(doc)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#932C20',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: 0,
                    }}
                  >
                    {doc.status === 'archived' ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={() =>
                      setExpandedDocId(expandedDocId === doc.id ? null : doc.id)
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
                    {expandedDocId === doc.id
                      ? 'Hide Versions'
                      : `Versions (${doc.versions.length})`}
                  </button>
                </div>

                {expandedDocId === doc.id && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #D9958C',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {doc.versions
                      .slice()
                      .sort((a, b) => b.versionNumber - a.versionNumber)
                      .map((v) => (
                        <div
                          key={v.versionNumber}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: '#3C1510',
                          }}
                        >
                          <span>
                            v{v.versionNumber} — {v.note}
                          </span>
                          <span style={{ color: '#932C20' }}>
                            {new Date(v.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showUploadModal && (
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
          onClick={() => setShowUploadModal(false)}
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
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Upload Document
            </h2>

            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: '#E6CECB',
                color: '#3C1510',
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #3C1510',
                cursor: 'pointer',
                fontSize: '14px',
                textAlign: 'left',
              }}
            >
              Choose File
            </button>

            {uploadFile && (
              <p style={{ color: '#3C1510', fontSize: '13px', margin: 0 }}>
                Selected: {uploadFile.name}
              </p>
            )}

            {uploadError && (
              <p style={{ color: '#932C20', fontSize: '13px', margin: 0 }}>
                {uploadError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3C1510',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #3C1510',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  backgroundColor: uploading ? '#c0847a' : '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {renameTarget && (
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
          onClick={() => setRenameTarget(null)}
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
                color: '#3C1510',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: 0,
              }}
            >
              Rename Document
            </h2>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setRenameTarget(null)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3C1510',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #3C1510',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRename}
                style={{
                  backgroundColor: '#932C20',
                  color: '#E6CECB',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
