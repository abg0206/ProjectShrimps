/*
import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button'; // Adjust path to your component

test('renders with default variant and size classes', () => {
  render(<Button>Click me</Button>);

  const buttonEl = screen.getByRole('button', { name: /click me/i });
  expect(buttonEl).toBeInTheDocument();

  // Verify it contains a base Cva class rule
  expect(buttonEl.className).toContain('inline-flex');
  // Verify it defaults to the primary color background style
  expect(buttonEl.className).toContain('bg-primary');
});

test('correctly applies destructive variant styles', () => {
  render(<Button variant="destructive">Delete</Button>);

  const buttonEl = screen.getByRole('button', { name: /delete/i });
  // Verify that CVA applied the right token variation
  expect(buttonEl.className).toContain('text-destructive');
});

test('fires onClick event handler when pressed', async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Interactive</Button>);
  const buttonEl = screen.getByRole('button', { name: /interactive/i });

  await user.click(buttonEl);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test('disables interaction when the disabled attribute is active', async () => {
  const handleClick = vi.fn();
  render(
    <Button disabled onClick={handleClick}>
      Blocked
    </Button>
  );

  const buttonEl = screen.getByRole('button', { name: /blocked/i });
  expect(buttonEl).toBeDisabled();
});
*/