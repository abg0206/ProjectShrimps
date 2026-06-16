const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { findByClerkId } = require('../models/users');

const requireAuth = ClerkExpressRequireAuth();

async function attachDbUser(req, res, next) {
  try {
    const clerkId = req.auth?.userId;

    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await findByClerkId(clerkId);

    if (!user) {
      return res.status(404).json({ error: 'User not found in DB' });
    }

    req.user = user; 
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Auth middleware error' });
  }
}

module.exports = {
  requireAuth,
  attachDbUser,
};
