import { expect, test, vi, beforeEach, describe } from 'vitest';
import authMiddleware from './auth'; // Adjust path to this file
import { findByClerkId } from '../models/users'; // Adjust path to your model

// 1. Mock the user model database dependency
vi.mock('../models/users', () => ({
  findByClerkId: vi.fn(),
}));

describe('attachUser Middleware', () => {
  let req, res, next;

  // 2. Set up clean request, response, and next mocks before every test
  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      auth: { userId: 'clerk_shrimp_123' },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    next = vi.fn();
  });

  // Test Case 1: Success Path
  test('should attach user to req and call next() if user is found', async () => {
    const mockUser = { id: 1, name: 'Bubba', clerk_id: 'clerk_shrimp_123' };
    vi.mocked(findByClerkId).mockResolvedValue(mockUser);

    await authMiddleware.attachUser(req, res, next);

    expect(findByClerkId).toHaveBeenCalledWith('clerk_shrimp_123');
    expect(req.user).toEqual(mockUser); // Verifies the user was attached
    expect(next).toHaveBeenCalledTimes(1); // Verifies pipeline moves forward
    expect(res.status).not.toHaveBeenCalled();
  });

  // Test Case 2: No Clerk ID
  test('should return 401 if clerkId is missing', async () => {
    req.auth = {}; // Simulate missing auth context

    await authMiddleware.attachUser(req, res, next);

    expect(findByClerkId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled(); // Pipeline should stop
  });

  // Test Case 3: User Not in Database
  test('should return 404 if user does not exist in the database', async () => {
    vi.mocked(findByClerkId).mockResolvedValue(null); // Database returns nothing

    await authMiddleware.attachUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  // Test Case 4: Exception Caught
  test('should return 500 if database query throws an error', async () => {
    // Suppress console.error logs from messy terminal output during testing
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(findByClerkId).mockRejectedValue(new Error('Database timed out'));

    await authMiddleware.attachUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Auth error' });
    expect(next).not.toHaveBeenCalled();
  });
});
