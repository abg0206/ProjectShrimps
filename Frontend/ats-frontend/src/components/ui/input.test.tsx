/*
import { expect, test, describe, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input'; // Adjust path to your component file

describe('Input Component', () => {
  // Test Case 1: Standard Rendering
  test('should render an input field with default properties', () => {
    render(<Input placeholder="Enter your email" data-testid="test-input" />);

    const inputEl = screen.getByPlaceholderText('Enter your email');

    expect(inputEl).toBeInTheDocument();
    expect(inputEl).toHaveAttribute('data-slot', 'input');
    // Default fallback type for html inputs is "text"
    expect(inputEl).toHaveAttribute('type', 'text');
  });

  // Test Case 2: Custom Prop Forwarding (Type variations)
  test('should correctly honor type configurations', () => {
    render(<Input type="password" placeholder="Password" />);

    const inputEl = screen.getByPlaceholderText('Password');
    expect(inputEl).toHaveAttribute('type', 'password');
  });

  // Test Case 3: Interactive Typing
  test('should allow users to type text into the input field', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);

    const inputEl = screen.getByPlaceholderText(
      'Type here'
    ) as HTMLInputElement;

    // Simulate real user keys keystrokes
    await user.type(inputEl, 'Shrimp Project');

    expect(inputEl.value).toBe('Shrimp Project');
  });

  // Test Case 4: Event Forwarding (onChange)
  test('should trigger custom onChange handlers when text changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input placeholder="Controlled" onChange={handleChange} />);
    const inputEl = screen.getByPlaceholderText('Controlled');

    await user.type(inputEl, 'A');

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  // Test Case 5: Disabled Behavior
  test('should prevent interaction and apply accessibility limits when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(
      <Input placeholder="Locked input" disabled onChange={handleChange} />
    );
    const inputEl = screen.getByPlaceholderText('Locked input');

    expect(inputEl).toBeDisabled();

    // Attempt to click and type anyway
    await user.click(inputEl);
    await user.type(inputEl, 'Hello');

    // The spy shouldn't fire since interaction states are locked down
    expect(handleChange).not.toHaveBeenCalled();
  });

  // Test Case 6: Dynamic Class Amalgamation via cn()
  test('should merge standard styles with external layout classes', () => {
    render(
      <Input
        placeholder="Styled"
        className="mt-4 border-red-500"
        data-testid="input-classes"
      />
    );

    const inputEl = screen.getByTestId('input-classes');

    // Core design token classes must exist
    expect(inputEl.className).toContain('h-9');
    expect(inputEl.className).toContain('w-full');

    // Extraneous injection classes should combine cleanly
    expect(inputEl.className).toContain('mt-4');
    expect(inputEl.className).toContain('border-red-500');
  });
});
*/