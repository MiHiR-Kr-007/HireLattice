import { Router } from 'express';
import { createAvailabilitySlots, getUpcomingInterviews } from './scheduling.controller.js';
import { handleCandidateResponse } from './confirmation.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post(
    '/slots', 
    authenticateToken, 
    requireRole('INTERVIEWER'), 
    createAvailabilitySlots
);

router.get(
    '/interviews/upcoming',
    authenticateToken,
    requireRole('INTERVIEWER'),
    getUpcomingInterviews
);

router.post('/match/respond', handleCandidateResponse);

export default router;