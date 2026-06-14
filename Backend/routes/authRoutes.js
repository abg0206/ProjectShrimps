const express = require('express');
const router = express.Router();

const { requireAuth, attachUser } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Sync user after login/signup
router.post('/sync', requireAuth, authController.syncUser);

// Get current
router.get('/me', requireAuth, attachUser, authController.me);

module.exports = router;
