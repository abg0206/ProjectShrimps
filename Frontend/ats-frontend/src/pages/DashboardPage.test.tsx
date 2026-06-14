import { expect, test, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage'; // Adjust path to page component

// Mock react-router dependencies from your Sidebar component dependency
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Dashboard Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Case 1: Initial View Verification
  test('should display main page header and loop out default sample jobs', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Check header elements
    expect(
      screen.getByRole('heading', { name: 'My Jobs', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search jobs...')).toBeInTheDocument();

    // Check template job metrics cards
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Meta')).toBeInTheDocument();

    expect(screen.getByText('React Developer')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
  });

  // Test Case 2: Modal Visibility Lifecycle and Mutation Add Operations
  test('should open data modal, accept form input fields, and append card to UI list view', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // 1. Confirm modal input boxes are hidden initially
    expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();

    // 2. Open the structural overlay modal screen
    const addJobActionButton = screen.getByRole('button', { name: 'Add Job' });
    await user.click(addJobActionButton);

    // 3. Target form input slots
    const titleInput = screen.getByLabelText('Job Title');
    const companyInput = screen.getByLabelText('Company');
    const bodyTextarea = screen.getByLabelText('Job Posting Body');
    const modalSubmitButton = screen.getAllByRole('button', {
      name: 'Add Job',
    })[1]; // Index 1 targets the modal footer button

    // 4. Fill form text values
    await user.type(titleInput, 'Staff Engineer');
    await user.type(companyInput, 'Netflix');
    await user.type(
      bodyTextarea,
      'Building streaming interfaces at massive scale.'
    );

    // 5. Fire mutation dispatch script execution
    await user.click(modalSubmitButton);

    // 6. Assert overlay wrapper closes successfully
    expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();

    // 7. Verify fresh appended element cards populate DOM nodes smoothly
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(
      screen.getByText('Building streaming interfaces at massive scale.')
    ).toBeInTheDocument();
  });

  // Test Case 3: Cancel Button Action
  test('should close modal view cleanly when user clicks the cancel layout button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Open Modal
    await user.click(screen.getByRole('button', { name: 'Add Job' }));
    expect(screen.getByLabelText('Job Title')).toBeInTheDocument();

    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    // Assert item vanished from screen view space layers
    expect(screen.queryByLabelText('Job Title')).not.toBeInTheDocument();
  });
});
