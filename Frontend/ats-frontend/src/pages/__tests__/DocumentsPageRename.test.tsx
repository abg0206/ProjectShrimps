import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import {
  mockLoggedInUser,
  renderDocumentsPage,
  uploadTestFile,
} from './testUtils';

beforeEach(() => {
  mockLoggedInUser();
});

describe('DocumentsPage - Rename', () => {
  it('updates the document title after confirming a rename', async () => {
    renderDocumentsPage();
    await uploadTestFile(screen, fireEvent, 'old-name.pdf');

    fireEvent.click(screen.getByText('Rename'));

    const renameInput = screen.getByDisplayValue('old-name.pdf');
    fireEvent.change(renameInput, { target: { value: 'new-name.pdf' } });
    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('new-name.pdf')).toBeInTheDocument();
    expect(screen.queryByText('old-name.pdf')).not.toBeInTheDocument();
  });
});
