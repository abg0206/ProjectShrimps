import { expect, test, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage'; // Adjust path to file

// Mock react-router dependencies required by the internal Sidebar layout
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('ProfilePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Case 1: Initial Empty Render State
  test('renders profile form headings and begins at 0% complete tracker metrics', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    // Verify main headings are mounted
    expect(
      screen.getByRole('heading', { name: 'Profile', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Identity & Contact', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Professional Summary', level: 2 })
    ).toBeInTheDocument();

    // Verify progress tracking initializes empty
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    expect(
      screen.queryByText(/✓ Profile saved successfully/i)
    ).not.toBeInTheDocument();
  });

  // Test Case 2: Math Percentage Completion Reactive Logic
  test('increments progress tracker percentage dynamically as user completes input blocks', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const firstNameInput = screen.getByLabelText('First Name');
    const lastNameInput = screen.getByLabelText('Last Name');

    // 1. Fill out first name (1 field out of 5 = 20%)
    await user.type(firstNameInput, 'Alvin');
    expect(screen.getByText('20% complete')).toBeInTheDocument();

    // 2. Fill out last name (2 fields out of 5 = 40%)
    await user.type(lastNameInput, 'Lai');
    expect(screen.getByText('40% complete')).toBeInTheDocument();

    // 3. Backspace the input fields clear to verify reduction calculation paths
    await user.clear(firstNameInput);
    expect(screen.getByText('20% complete')).toBeInTheDocument();
  });

  // Test Case 3: Action Submission Mutators
  test('displays successful save layout indicators when clicking action buttons', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    // Target the first "Save" button inside the Identity section grid layout
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    await user.click(saveButtons[0]);

    // Verify confirmation message mounts cleanly to document node tree
    expect(
      screen.getByText('✓ Profile saved successfully')
    ).toBeInTheDocument();
  });
});
