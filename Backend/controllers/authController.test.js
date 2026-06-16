import { describe, it, expect, vi, beforeEach } from 'vitest';
import authController from './authController'; // Adjust path as needed
import authService from '../middleware/clerkAuth';

// Mock the authService module
vi.mock('../middleware/clerkAuth', () => ({
  default: {
    syncUser: vi.fn(),
  },
}));

describe('authController.register', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();

    // Re-create fresh req and res mocks before each test
    req = {
      auth: { userId: 'clerk_123' },
      body: {
        email: 'test@example.com',
        phone: '123-456-7890',
        firstName: 'Bubba',
        lastName: 'Gump',
      },
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  // --- PASSING / POSITIVE TEST CASE ---
  it('should successfully register and sync a user', async () => {
    const mockServiceResponse = {
      status: 201,
      body: { message: 'User synced successfully', userId: 'db_123' },
    };
    vi.mocked(authService.syncUser).mockResolvedValue(mockServiceResponse);

    await authController.register(req, res);

    expect(authService.syncUser).toHaveBeenCalledWith({
      clerkId: 'clerk_123',
      email: 'test@example.com',
      phone: '123-456-7890',
      firstName: 'Bubba',
      lastName: 'Gump',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockServiceResponse.body);
  });

  // --- NEGATIVE TEST CASE 1: Missing Authentication/Email ---
  it('should return 400 if clerkId or email is missing', async () => {
    req.auth = undefined;

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required authentication or email',
    });
    expect(authService.syncUser).not.toHaveBeenCalled();
  });

  // --- NEGATIVE TEST CASE 2: Missing Profile Fields ---
  it('should return 400 if profile fields (phone, firstName, lastName) are missing', async () => {
    req.body.phone = '';

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing profile fields',
    });
    expect(authService.syncUser).not.toHaveBeenCalled();
  });

  // --- NEGATIVE TEST CASE 3: Internal Server Error (Catch Block) ---
  it('should return 500 if authService throws an unhandled error', async () => {
    vi.mocked(authService.syncUser).mockRejectedValue(
      new Error('Database error')
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
    });

    consoleSpy.mockRestore();
  });
});
