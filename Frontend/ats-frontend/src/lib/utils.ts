import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Gemini returns plain text (one resume "line" per line). Turn that into
// simple HTML paragraphs so it drops cleanly into the contentEditable
// resume editor.
export function plainTextToEditorHtml(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return text
    .split(/\n{2,}/) // blank line = new paragraph
    .map((block) => `<p>${escape(block).split('\n').join('<br>')}</p>`)
    .join('');
}

// S3-BR-006: the only formats the system stores/serves. Content for pdf and
// docx is base64 in the DB (the content column is TEXT); txt is stored as
// plain text.
export const MIME_BY_FORMAT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

// Turns a document/version's stored `content` back into a real file and
// triggers a browser download. Shared by DocumentsPage and any other view
// (e.g. the job detail linked-documents section) that downloads documents.
export function saveFileDownload(
  content: string,
  file_format: string,
  filename: string
): void {
  const mime = MIME_BY_FORMAT[file_format] ?? 'application/octet-stream';
  let blob: Blob;
  if (file_format === 'txt') {
    blob = new Blob([content], { type: mime });
  } else {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    blob = new Blob([bytes], { type: mime });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Decodes a base64 string (as stored for pdf/docx content) into raw bytes —
// used by the document preview modal to build Blob URLs / arrayBuffers
// without triggering a download.
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
