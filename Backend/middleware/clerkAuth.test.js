import { expect, test, vi, beforeEach, describe } from 'vitest';
import authMiddleware from './clerkAuth'; // Adjust path to this file
import { findByClerkId } from '../models/users'; // Adjust path to your model

// 1. Mock the database model dependency
vi.mock('../models/users', () => ({
  findByClerkId: vi.fn(),
}));

describe('attachDbUser Middleware', () => {
  let req, res, next;

  // 2. Reset execution context before every test run
  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      auth: { userId: 'clerk_shrimp_123' },
    };

    res = {
      status: vi.fn().mockReturnThis(), // Enables chainable execution: res.status().json()
      json: vi.fn(),
    };

    next = vi.fn();
  });

  // Scenario 1: Happy Path
  test('should attach user to req and call next() if user matches clerkId', async () => {
    const mockUser = { id: 42, name: 'Bubba', clerk_id: 'clerk_shrimp_123' };
    vi.mocked(findByClerkId).mockResolvedValue(mockUser);

    await authMiddleware.attachDbUser(req, res, next);

    expect(findByClerkId).toHaveBeenCalledWith('clerk_shrimp_123');
    expect(req.user).toEqual(mockUser); // Affirms your app user is correctly attached
    expect(next).toHaveBeenCalledTimes(1); // Verifies the request pipeline continues
    expect(res.status).not.toHaveBeenCalled();
  });

  // Scenario 2: Unauthenticated Request
  test('should return 401 if clerkId token context is missing', async () => {
    req.auth = {}; // Missing token identification

    await authMiddleware.attachDbUser(req, res, next);

    expect(findByClerkId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled(); // Stops execution early
  });

  // Scenario 3: Missing database sync lookup
  test('should return 404 if user is missing from the underlying database', async () => {
    vi.mocked(findByClerkId).mockResolvedValue(null); // Valid token, but no matched user record

    await authMiddleware.attachDbUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found in DB' });
    expect(next).not.toHaveBeenCalled();
  });

  // Scenario 4: Error handling catching
  test('should safely intercept runtime database crashes and throw 500 status', async () => {
    // Suppress console.error output so it doesn't pollute your local terminal printout
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(findByClerkId).mockRejectedValue(
      new Error('Connection timeout pool failure')
    );

    await authMiddleware.attachDbUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Auth middleware error' });
    expect(next).not.toHaveBeenCalled();
  });
});
