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
