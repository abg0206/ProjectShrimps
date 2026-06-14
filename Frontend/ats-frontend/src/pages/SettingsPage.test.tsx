import { expect, test, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage'; // Adjust path to file

// Mock react-router dependencies required by the internal Sidebar component layout
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Case 1: Initial Component Setup Layout Verification
  test('renders page structural headers and form sections cleanly', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Main header check
    expect(
      screen.getByRole('heading', { name: 'Settings', level: 1 })
    ).toBeInTheDocument();

    // Section subheaders check
    expect(
      screen.getByRole('heading', { name: 'Change Email', level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Change Password', level: 2 })
    ).toBeInTheDocument();

    // Action button checks
    expect(
      screen.getByRole('button', { name: 'Update Email' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Update Password' })
    ).toBeInTheDocument();
  });

  // Test Case 2: Email State Mutation Channel
  test('allows typing inside the new email element container boundary', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Select input by its placeholder description or associated accessible text label
    const emailInput = screen.getByLabelText('New Email');

    // Test text mutation channel
    await user.type(emailInput, 'fresh-email@shrimply.com');
    expect(emailInput).toHaveValue('fresh-email@shrimply.com');
  });

  // Test Case 3: Password Grid State Mutation Channels
  test('accepts text across password string entry fields safely', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    // Populate password sequences step by step
    await user.type(currentPasswordInput, 'oldSecretPassword123');
    await user.type(newPasswordInput, 'freshSecureString456');
    await user.type(confirmPasswordInput, 'freshSecureString456');

    // Confirm local UI states are controlled properly
    expect(currentPasswordInput).toHaveValue('oldSecretPassword123');
    expect(newPasswordInput).toHaveValue('freshSecureString456');
    expect(confirmPasswordInput).toHaveValue('freshSecureString456');
  });
});
