import { expect, test, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card'; // Adjust path to your file

describe('Card Component Sub-System', () => {
  // Test Case 1: Simple Structure Rendering
  test('should render basic card structure with custom text content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title Text</CardTitle>
          <CardDescription>Card Description Subtext</CardDescription>
        </CardHeader>
        <CardContent>Main Body Content</CardContent>
        <CardFooter>Footer Content Actions</CardFooter>
      </Card>
    );

    // Verify presence of structural strings
    expect(screen.getByText('Card Title Text')).toBeInTheDocument();
    expect(screen.getByText('Card Description Subtext')).toBeInTheDocument();
    expect(screen.getByText('Main Body Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content Actions')).toBeInTheDocument();
  });

  // Test Case 2: Custom Data Attributes & Attributes Forwarding
  test('should attach data-slot and size attributes correctly to match styling rules', () => {
    render(
      <Card size="sm" data-testid="card-wrapper">
        <CardHeader data-testid="card-header-slot" />
        <CardContent data-testid="card-content-slot" />
      </Card>
    );

    const mainCard = screen.getByTestId('card-wrapper');
    const cardHeader = screen.getByTestId('card-header-slot');
    const cardContent = screen.getByTestId('card-content-slot');

    // Verify correct implementation of the underlying slots engine data
    expect(mainCard).toHaveAttribute('data-slot', 'card');
    expect(mainCard).toHaveAttribute('data-size', 'sm');

    expect(cardHeader).toHaveAttribute('data-slot', 'card-header');
    expect(cardContent).toHaveAttribute('data-slot', 'card-content');
  });

  // Test Case 3: CSS Class Merging Mechanics
  test('should correctly merge default tailwind tokens with injected custom classNames', () => {
    render(
      <Card className="custom-border-glow-effect" data-testid="card-element">
        <CardTitle className="text-red-500" data-testid="card-title-element">
          Alert Heading
        </CardTitle>
      </Card>
    );

    const mainCard = screen.getByTestId('card-element');
    const titleElement = screen.getByTestId('card-title-element');

    // Confirm cn() helper integrated custom styling parameters without losing defaults
    expect(mainCard.className).toContain('rounded-4xl');
    expect(mainCard.className).toContain('custom-border-glow-effect');

    expect(titleElement.className).toContain('font-heading');
    expect(titleElement.className).toContain('text-red-500');
  });

  // Test Case 4: Special Grid Structural Blocks
  test('should render auxiliary CardAction layouts correctly', () => {
    render(
      <CardHeader>
        <CardTitle>Settings Option</CardTitle>
        <CardAction data-testid="action-wrapper">
          <button>Edit</button>
        </CardAction>
      </CardHeader>
    );

    const actionWrapper = screen.getByTestId('action-wrapper');

    expect(actionWrapper).toHaveAttribute('data-slot', 'card-action');
    // Ensure layout properties are assigned to position it on the side of the header
    expect(actionWrapper.className).toContain('col-start-2');
    expect(actionWrapper.className).toContain('justify-self-end');
  });
});
