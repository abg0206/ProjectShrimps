import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { mockLoggedInUser, renderDocumentsPage } from './testUtils';

beforeEach(() => {
  mockLoggedInUser();
});

describe('DocumentsPage - Upload', () => {
  it('opens the upload modal when "Upload Document" is clicked', () => {
    renderDocumentsPage();
    fireEvent.click(screen.getByText('Upload Document'));
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('rejects a file that is not PDF/DOC/DOCX', () => {
    renderDocumentsPage();
    fireEvent.click(screen.getByText('Upload Document'));

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const badFile = new File(['fake image content'], 'photo.jpg', {
      type: 'image/jpeg',
    });

    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(
      screen.getByText('Only PDF and Word documents are supported.')
    ).toBeInTheDocument();
  });

  it('accepts a valid PDF and adds it to the list after clicking Upload', async () => {
    renderDocumentsPage();
    fireEvent.click(screen.getByText('Upload Document'));

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const goodFile = new File(['fake pdf content'], 'resume.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, { target: { files: [goodFile] } });
    expect(screen.getByText('Selected: resume.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Upload'));

    expect(await screen.findByText('resume.pdf')).toBeInTheDocument();
  });
});
