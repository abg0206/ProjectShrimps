// @vitest-environment jsdom

import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import RouteProtect from './RouteProtect'; // Adjust path as needed
import '@testing-library/jest-dom/vitest';

describe('RouteProtect', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test to maintain a clean slate
    sessionStorage.clear();
    sessionStorage.removeItem('user');
  });

  afterEach(() => {
    cleanup();
  });

  // --- PASSING / POSITIVE TEST CASE ---
  it('should render children when the user is logged in', () => {
    // Simulate logged-in state
    sessionStorage.setItem('user', JSON.stringify({ name: 'Alvin' }));

    render(
      <MemoryRouter key="test-logged-in" initialEntries={['/protected']}>
        <RouteProtect>
          <div data-testid="protected-content">Secret Dashboard</div>
        </RouteProtect>
      </MemoryRouter>
    );

    // Expect the protected content to be visible
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Secret Dashboard')).toBeInTheDocument();
  });

  // --- NEGATIVE TEST CASE 1: Completely missing key ---
  it('should redirect to "/" when the user key is completely missing from sessionStorage', () => {
    // sessionStorage is explicitly left empty here

    render(
      <MemoryRouter key="test-missing-key" initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/"
            element={<div data-testid="landing-page">Landing Page</div>}
          />
          <Route
            path="/protected"
            element={
              <RouteProtect>
                <div data-testid="protected-content">Secret Dashboard</div>
              </RouteProtect>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Expect protected content to NOT be there, and landing page to be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  // --- NEGATIVE TEST CASE 2: Key exists but is an empty string ---
  it('should redirect to "/" when the user key is an empty string', () => {
    // Coercing an empty string !!"" results in false
    sessionStorage.setItem('user', '');

    render(
      <MemoryRouter key="test-empty-key" initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/"
            element={<div data-testid="landing-page">Landing Page</div>}
          />
          <Route
            path="/protected"
            element={
              <RouteProtect>
                <div data-testid="protected-content">Secret Dashboard</div>
              </RouteProtect>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  // --- NEGATIVE TEST CASE 3: Key exists but is literally "null" or "undefined" as strings ---
  it('should redirect to "/" when the user key is the string "null"', () => {
    // Common bug: sometimes devs accidentally stringify a null value into storage
    // !!"null" evaluates to true in JS, so let's verify how your current code handles it
    sessionStorage.setItem('user', 'null');

    render(
      <MemoryRouter key="test-null-string" initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/"
            element={<div data-testid="landing-page">Landing Page</div>}
          />
          <Route
            path="/protected"
            element={
              <RouteProtect>
                <div data-testid="protected-content">Secret Dashboard</div>
              </RouteProtect>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    /* ⚠️ CAUTION NOTE: 
      Because your component uses `!!sessionStorage.getItem('user')`, 
      the literal string 'null' actually evaluates to `true` in JavaScript!
      
      If you want this test to PASS (meaning it successfully blocks them), 
      you will need to update your component logic to parse the item or explicitly check for 'null'.
      
      If your intention is to assert that it currently FAILS to protect against 'null' strings, 
      swap `.not.toBeInTheDocument()` with `.toBeInTheDocument()`.
    */
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });
});
