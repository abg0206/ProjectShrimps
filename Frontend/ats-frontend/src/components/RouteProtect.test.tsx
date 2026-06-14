import { expect, test, vi, beforeEach, describe } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RouteProtect from './RouteProtect'; // Adjust path to your component

describe('RouteProtect Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test so they don't leak state into each other
    localStorage.clear();
  });

  test('renders children when user is logged in', () => {
    // 1. Set the correct authentication state
    localStorage.setItem('isLoggedIn', 'true');

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <RouteProtect>
          <div data-testid="protected-content">Welcome to the Dashboard</div>
        </RouteProtect>
      </MemoryRouter>
    );

    // 2. Assert that the secret content is visible
    const content = screen.getByTestId('protected-content');
    expect(content).toBeInTheDocument();
    expect(content.textContent).toBe('Welcome to the Dashboard');
  });

  test('redirects to root "/" when user is not logged in', () => {
    // 1. Leave localStorage empty (simulating an unauthenticated state)

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          {/* Landing page placeholder */}
          <Route
            path="/"
            element={<div data-testid="landing-page">Landing Page</div>}
          />

          {/* Protected route wrapper */}
          <Route
            path="/dashboard"
            element={
              <RouteProtect>
                <div data-testid="protected-content">Secret Dashboard</div>
              </RouteProtect>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // 2. Assert that the secret content was BLOCKED and we were pushed to the root
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });
});
