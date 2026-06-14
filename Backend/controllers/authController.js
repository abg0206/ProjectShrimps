import authService from '../services/authService';

async function register(req, res) {
  try {
    // Clerk middleware should attach this
    const clerkId = req.auth?.userId;

    const { email, phone, firstName, lastName } = req.body;

    if (!clerkId || !email) {
      return res
        .status(400)
        .json({ error: 'Missing required authentication or email' });
    }

    if (!phone || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing profile fields' });
    }

    const result = await authService.syncUser({
      clerkId,
      email,
      phone,
      firstName,
      lastName,
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Auth controller error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default { register };
