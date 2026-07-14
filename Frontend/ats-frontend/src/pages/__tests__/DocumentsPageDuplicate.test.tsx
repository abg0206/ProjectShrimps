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

describe('DocumentsPage - Duplicate', () => {
  it('creates a copy with "(Copy)" appended to the title', async () => {
    renderDocumentsPage();
    await uploadTestFile(screen, fireEvent, 'cover-letter.pdf');

    fireEvent.click(screen.getByText('Duplicate'));

    expect(
      await screen.findByText('cover-letter.pdf (Copy)')
    ).toBeInTheDocument();
    expect(screen.getByText('cover-letter.pdf')).toBeInTheDocument();
  });
});
