import { expect, test, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';

// Mock the react-router useNavigate hook so we can track redirects directly
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('isLoggedIn', 'true');
  });

  // Test Case 1: Elements Rendering
  test('should render application name, initials profile avatar, and username', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: 'Shrimply' })
    ).toBeInTheDocument();
    expect(screen.getByText('CS')).toBeInTheDocument();
    expect(screen.getByText('Caridean Shrimp')).toBeInTheDocument();
  });

  // Test Case 2: Navigation link presence
  test('should contain valid links pointing to app segments', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const profileLink = screen.getByRole('link', { name: 'Profile' });
    const settingsLink = screen.getByRole('link', { name: 'Settings' });

    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(profileLink).toHaveAttribute('href', '/profile');
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });

  // Test Case 3: Active Routing Style Computations
  test('should apply active background styling to the current route link', () => {
    // Force the memory router to start physically on the profile page
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Sidebar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const profileLink = screen.getByRole('link', { name: 'Profile' });

    // Profile link should have your active dark red style (#932C20 converted to RGB)
    expect(profileLink).toHaveStyle({ backgroundColor: 'rgb(147, 44, 32)' });

    // Dashboard link should be unselected
    expect(dashboardLink).toHaveStyle({ backgroundColor: 'transparent' });
  });

  // Test Case 4: Logout Interaction Mechanism
  test('should clear auth storage token and push to home screen on logout click', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: 'Logout' });

    // Press the button
    await user.click(logoutButton);

    // Assert your authentication criteria updated safely
    expect(localStorage.getItem('isLoggedIn')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
