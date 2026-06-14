import { expect, test, describe, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage'; // Adjust path to file

// 1. Mock React Router navigation mechanics
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Stub window fetch framework with an empty base mock implementation
    window.fetch = vi.fn();
  });

  // Test Case 1: Base Element Rendering
  test('renders login input elements, submit button, and links cleanly', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Create one here' })
    ).toHaveAttribute('href', '/register');
  });

  // Test Case 2: Validation Check Bounds Path
  test('displays warning error text if credentials are submitted blank', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole('button', { name: 'Login' });
    await user.click(submitButton);

    expect(
      screen.getByText('Please enter your email and password.')
    ).toBeInTheDocument();
    expect(window.fetch).not.toHaveBeenCalled();
  });

  // Test Case 3: Complete Authentication End-to-End Success Journey
  test('authenticates successfully, saves to session storage, and routes to dashboard', async () => {
    const user = userEvent.setup();

    // Configure window fetch to fake a healthy 200 OK server response
    const mockSuccessResponse = {
      ok: true,
      json: async () => ({
        email: 'shrimp@ocean.com',
        clerkId: 'user_clerk123',
      }),
    };
    vi.mocked(window.fetch).mockResolvedValueOnce(
      mockSuccessResponse as Response
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    // Populate input credentials
    await user.type(emailInput, 'shrimp@ocean.com');
    await user.type(passwordInput, 'secretPassword123');

    // Trigger form execution
    await user.click(submitButton);

    // Verify UI goes into loading state immediately
    expect(
      screen.getByRole('button', { name: 'Signing in...' })
    ).toBeDisabled();

    // Await async state dispatches
    await waitFor(() => {
      // Confirm exact network contract parameters passed outwards
      expect(window.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'shrimp@ocean.com',
          password: 'secretPassword123',
        }),
      });

      // Confirm persistent user state written locally
      const storedUserData = JSON.parse(sessionStorage.getItem('user') || '{}');
      expect(storedUserData).toEqual({
        email: 'shrimp@ocean.com',
        clerkId: 'user_clerk123',
      });

      // Confirm application routing fires right into the dashboard path context
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // Test Case 4: Server Rejected Credentials Path Handling
  test('displays api fallback text values when server issues bad response types (401/400)', async () => {
    const user = userEvent.setup();

    // Fake an unauthorized bad response pipeline
    const mockErrorResponse = {
      ok: false,
      json: async () => ({ error: 'Invalid password configuration.' }),
    };
    vi.mocked(window.fetch).mockResolvedValueOnce(
      mockErrorResponse as Response
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Email'), 'shrimp@ocean.com');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong-pass');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    // Confirm UI rendered backend rejection string to screen node space safely
    await waitFor(() => {
      expect(
        screen.getByText('Invalid password configuration.')
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // Test Case 5: Enter Key Down Submission Workflow
  test('triggers login action sequences when pressing the Enter key inside form boundaries', async () => {
    const user = userEvent.setup();
    const mockSuccessResponse = {
      ok: true,
      json: async () => ({ email: 'test@ocean.com', clerkId: '123' }),
    };
    vi.mocked(window.fetch).mockResolvedValueOnce(
      mockSuccessResponse as Response
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText('Email');
    await user.type(emailInput, 'test@ocean.com');

    // Pressing enter key inside input node should fire handleKeyDown wrapper pipeline
    await user.type(emailInput, '{Enter}');

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalled();
    });
  });
});
