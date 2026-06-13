import { describe, it, expect, vi, beforeEach } from 'vitest';
import validRegister from './sanitValidation';

describe('validRegister middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {
        clerkId: 'clerk_123',
        email: 'Test@Example.com',
        phone: '1234567890',
        firstName: '  John ',
        lastName: ' Doe  ',
      },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it('calls next() when input is valid', () => {
    validRegister(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('trims and lowercases email', () => {
    validRegister(req, res, next);
    expect(req.body.email).toBe('test@example.com');
  });

  it('trims firstName and lastName', () => {
    validRegister(req, res, next);
    expect(req.body.firstName).toBe('John');
    expect(req.body.lastName).toBe('Doe');
  });

  it('rejects missing clerkId', () => {
    delete req.body.clerkId;
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'clerkId and email are required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing email', () => {
    delete req.body.email;
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing phone, firstName, or lastName', () => {
    delete req.body.phone;
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Phone, first name, and last name are required' });
  });

  it('rejects invalid email format', () => {
    req.body.email = 'not-an-email';
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
  });

  it('rejects names with invalid characters', () => {
    req.body.firstName = 'John123';
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Name fields must contain only letters, spaces, apostrophes, and hyphens',
    });
  });

  it('allows names with apostrophes and hyphens', () => {
    req.body.firstName = "O'Brien";
    req.body.lastName = 'Smith-Jones';
    validRegister(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects names over 100 characters', () => {
    req.body.firstName = 'a'.repeat(101);
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Name fields must be under 100 characters' });
  });

  it('rejects clerkId longer than 255 characters', () => {
    req.body.clerkId = 'a'.repeat(256);
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid clerkId' });
  });

  it('rejects non-string clerkId', () => {
    req.body.clerkId = 12345;
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid clerkId' });
  });

  it('rejects phone numbers that are not 10 digits', () => {
    req.body.phone = '12345';
    validRegister(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Phone number must be a 10-digit number' });
  });
});