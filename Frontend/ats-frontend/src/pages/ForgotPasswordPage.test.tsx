import { expect, test, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from './ForgotPasswordPage'; // Adjust path to file

describe('ForgotPasswordPage Component', () => {
  // Test Case 1: Initial Form View Mount State
  test('renders the password reset form with default elements', () => {
    render(<ForgotPasswordPage />);

    // Brand and card context headings
    expect(
      screen.getByRole('heading', { name: 'Shrimply', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Reset your password', level: 2 })
    ).toBeInTheDocument();

    // Core interaction inputs and button links
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Reset Link' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Login' })).toHaveAttribute(
      'href',
      '/'
    );
  });

  // Test Case 2: Workflow Form Mutation Success Path
  test('displays confirmation success layout state upon entering email and submitting', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('Email');
    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });

    // Simulate standard user keystrokes filling the form path
    await user.type(emailInput, 'shrimp@ocean.com');
    await user.click(submitButton);

    // Form inputs and buttons should hide under the conditional state branch
    expect(screen.queryByPlaceholderText('Email')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Send Reset Link' })
    ).not.toBeInTheDocument();

    // Success response text block should populate the card element tree instead
    const successMessage = screen.getByText(
      /If an account exists for shrimp@ocean.com, a reset link will be sent to email\./i
    );
    expect(successMessage).toBeInTheDocument();
  });

  // Test Case 3: Submission Boundary Block Validation
  test('stops submit flow actions if the email element value is left empty', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const submitButton = screen.getByRole('button', {
      name: 'Send Reset Link',
    });

    // Click button immediately without typing anything
    await user.click(submitButton);

    // UI state should ignore it and keep the form context components mounted
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Send Reset Link' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/If an account exists for/i)
    ).not.toBeInTheDocument();
  });
});
