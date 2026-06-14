import { expect, test, vi, beforeEach } from 'vitest';
import authController from './authController'; // Path to your controller
import authService from '../services/authService'; // Path to your service

// 1. Tell Vitest to mock the authService dependency
vi.mock('../services/authService', () => ({
  default: {
    syncUser: vi.fn(),
  },
}));

describe('Register Controller', () => {
  let req, res;

  // 2. Reset mock request and response objects before each individual test
  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      auth: { userId: 'clerk_123' },
      body: {
        email: 'shrimp@example.com',
        phone: '123-456-7890',
        firstName: 'Bubba',
        lastName: 'Gump',
      },
    };

    res = {
      status: vi.fn().mockReturnThis(), // mockReturnThis allows chaining: res.status().json()
      json: vi.fn(),
    };
  });

  // Test Case 1: Success
  test('should successfully register a user and return the service result', async () => {
    // Fake a successful return from the service layer
    authService.syncUser.mockResolvedValue({
      status: 201,
      body: { success: true, userId: 'db_id_123' },
    });

    await authController.register(req, res);

    expect(authService.syncUser).toHaveBeenCalledWith({
      clerkId: 'clerk_123',
      email: 'shrimp@example.com',
      phone: '123-456-7890',
      firstName: 'Bubba',
      lastName: 'Gump',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      userId: 'db_id_123',
    });
  });

  // Test Case 2: Validation Failure
  test('should return 400 if profile fields are missing', async () => {
    req.body.firstName = ''; // Strip out a required field

    await authController.register(req, res);

    expect(authService.syncUser).not.toHaveBeenCalled(); // Pipeline should stop early
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing profile fields' });
  });

  // Test Case 3: Exception/Server Error Handling
  test('should return 500 if the authService crashes', async () => {
    // Hide the intentional console.error from clattering up your terminal output
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate a database or network failure inside the service
    authService.syncUser.mockRejectedValue(new Error('Database crash'));

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
