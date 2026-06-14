import { expect, test, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label'; // Adjust path to your component file

describe('Label Component', () => {
  // Test Case 1: Simple Text Rendering
  test('should render label text content correctly', () => {
    render(<Label>Email Address</Label>);

    const labelEl = screen.getByText('Email Address');

    expect(labelEl).toBeInTheDocument();
    expect(labelEl.tagName).toBe('LABEL');
    expect(labelEl).toHaveAttribute('data-slot', 'label');
  });

  // Test Case 2: Attribute Forwarding (CRITICAL for Accessibility)
  test('should forward native HTML attributes like htmlFor', () => {
    render(<Label htmlFor="email-input">Email Address</Label>);

    const labelEl = screen.getByText('Email Address');

    expect(labelEl).toHaveAttribute('for', 'email-input'); // DOM lowers 'htmlFor' to 'for'
  });

  // Test Case 3: Style Amalgamation via cn()
  test('should merge default core styles with injected custom classNames', () => {
    render(
      <Label className="text-red-500 font-bold" data-testid="label-element">
        Required Field
      </Label>
    );

    const labelEl = screen.getByTestId('label-element');

    // Core structural tokens must be preserved
    expect(labelEl.className).toContain('flex');
    expect(labelEl.className).toContain('text-sm');

    // Injected classes should blend gracefully
    expect(labelEl.className).toContain('text-red-500');
    expect(labelEl.className).toContain('font-bold');
  });

  // Test Case 4: Group & Peer Variant Classes Verification
  test('should contain Tailwind state modifier classes for disabled groups and peers', () => {
    render(<Label data-testid="label-states">Form Label</Label>);

    const labelEl = screen.getByTestId('label-states');

    // Check for the presence of peer and data-attribute selector tokens
    expect(labelEl.className).toContain(
      'group-data-[disabled=true]:pointer-events-none'
    );
    expect(labelEl.className).toContain('peer-disabled:cursor-not-allowed');
  });
});
