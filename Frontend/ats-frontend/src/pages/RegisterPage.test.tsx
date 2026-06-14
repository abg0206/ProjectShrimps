import { expect, test, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from './RegisterPage'; // Adjust path to file

// Mock the routing hook from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Case 1: Elements Rendering
  test('renders the base form input elements, headings, and buttons', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: 'Shrimply', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Create an account', level: 2 })
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: 'Register' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Login here' })).toHaveAttribute(
      'href',
      '/'
    );
  });

  // Test Case 2: Validation Guard for Empty Fields
  test('shows a error message if any required form field is submitted blank', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    const registerButton = screen.getByRole('button', { name: 'Register' });

    // Submit straight away with empty values
    await user.click(registerButton);

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Test Case 3: Validation Guard for Mismatched Passwords
  test('shows a specific error message if password inputs do not match each other', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill form fields with divergent passwords
    await user.type(screen.getByPlaceholderText('Email'), 'test@ocean.com');
    await user.type(screen.getByPlaceholderText('Password'), 'Password123');
    await user.type(
      screen.getByPlaceholderText('Confirm Password'),
      'DifferentPassword456'
    );

    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Test Case 4: Successful Registration & Redirect Path
  test('clears error messages and routes to login page upon valid submission form data', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Enter correct matching data sets
    await user.type(screen.getByPlaceholderText('Email'), 'shrimp@ocean.com');
    await user.type(screen.getByPlaceholderText('Password'), 'securePass111');
    await user.type(
      screen.getByPlaceholderText('Confirm Password'),
      'securePass111'
    );

    await user.click(screen.getByRole('button', { name: 'Register' }));

    // Errors should remain empty or hidden, and navigation fires home
    expect(
      screen.queryByText('All fields are required.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Passwords do not match.')
    ).not.toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
