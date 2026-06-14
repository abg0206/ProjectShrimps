import { expect, test, vi, beforeEach, describe } from 'vitest';
import usersModel from './User'; // Adjust path to your model file
import pool from '../config/db'; // Adjust path to your db file

// 1. Mock the database pool dependency completely
vi.mock('../config/db', () => {
  return {
    default: {
      query: vi.fn(),
      connect: vi.fn(),
    },
  };
});

describe('Users Model', () => {
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // 2. Set up a fresh mock client for transactions before each test
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
  });

  describe('findByClerkId', () => {
    test('should return the first user row found', async () => {
      const mockUser = {
        id: 1,
        email: 'shrimp@test.com',
        clerk_id: 'clerk_123',
      };

      // Simulate pg returning rows array
      vi.mocked(pool.query).mockResolvedValue({ rows: [mockUser] });

      const result = await usersModel.findByClerkId('clerk_123');

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM user_account WHERE clerk_id = $1',
        ['clerk_123']
      );
      expect(result).toEqual(mockUser);
    });

    test('should return undefined if user is not found', async () => {
      vi.mocked(pool.query).mockResolvedValue({ rows: [] });

      const result = await usersModel.findByClerkId('clerk_unknown');

      expect(result).toBeUndefined();
    });
  });

  describe('createUser Transaction Flow', () => {
    test('should COMMIT transaction when database insert succeeds', async () => {
      const mockCreatedAccount = {
        id: 99,
        email: 'shrimp@test.com',
        clerk_id: 'clerk_123',
      };

      // Link mock pool.connect to return our mock client
      vi.mocked(pool.connect).mockResolvedValue(mockClient);

      // Simulate a successful account entry statement returning data
      mockClient.query.mockImplementation(async (sql) => {
        if (sql.includes('INSERT INTO user_account')) {
          return { rows: [mockCreatedAccount] };
        }
        return { rows: [] };
      });

      const result = await usersModel.createUser(
        'shrimp@test.com',
        'clerk_123',
        '12345678',
        'Bubba',
        'Gump'
      );

      // Assert entire sequence executed in exact sequence order
      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO user_account'),
        ['shrimp@test.com', 'clerk_123']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO user_profile'),
        ['shrimp@test.com', '12345678', 'Bubba', 'Gump']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');

      // Verify resource management safety rules loop back cleanly
      expect(mockClient.release).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCreatedAccount);
    });

    test('should ROLLBACK transaction and re-throw error if queries crash', async () => {
      vi.mocked(pool.connect).mockResolvedValue(mockClient);

      // Simulate database crash on the very first insert script run
      mockClient.query.mockImplementation(async (sql) => {
        if (sql.includes('INSERT INTO user_account')) {
          throw new Error('Unique constraint violation: Email exists');
        }
        return { rows: [] };
      });

      // Assert error bubbles all the way back up to application state context
      await expect(
        usersModel.createUser(
          'shrimp@test.com',
          'clerk_123',
          '123456',
          'B',
          'G'
        )
      ).rejects.toThrow('Unique constraint violation: Email exists');

      // Verify catch/finally behavior metrics logic
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.contained.toEqual('COMMIT');
      expect(mockClient.client?.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});
