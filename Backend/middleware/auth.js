const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { findByClerkId } = require('../models/users');

const requireAuth = ClerkExpressRequireAuth();

async function attachUser(req, res, next) {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await findByClerkId(clerkId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Auth error' });
  }
}

module.exports = {
  requireAuth,
  attachUser,
};
