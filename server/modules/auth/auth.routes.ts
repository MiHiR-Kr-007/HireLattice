import { Router } from 'express';
import { register, login, googleLogin, logout, getGoogleCalendarOAuthUrl, googleCalendarCallback, getMe } from './auth.controller.js';
import { authenticateToken } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/logout', logout);

router.get('/google/calendar/link', authenticateToken, getGoogleCalendarOAuthUrl);
router.get('/google/calendar/callback', googleCalendarCallback);
router.get('/me', authenticateToken, getMe);

export default router;