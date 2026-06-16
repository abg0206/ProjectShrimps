import express from 'express';
const router = express.Router();

import { requireAuth, attachUser } from '../middleware/auth';
import authController from '../controllers/authController';

// Sync user after login/signup
router.post('/sync', requireAuth, authController.syncUser);

// Get current
router.get('/me', requireAuth, attachUser, authController.me);

export default router;
