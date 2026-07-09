import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  tags: string[];
  updatedAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    //call to backend to get documents
    setIsLoading(false);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Document Library</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-gray-500">No documents yet.</p>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-sm text-gray-500">
                  {doc.type} · {doc.status}
                </p>
              </div>
              <span className="text-xs text-gray-400">{doc.updatedAt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
