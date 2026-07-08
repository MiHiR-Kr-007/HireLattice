import { Router } from 'express';
import { createAvailabilitySlots } from './scheduling.controller.js';
import { handleCandidateResponse } from './confirmation.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post(
    '/slots', 
    authenticateToken, 
    requireRole('INTERVIEWER'), 
    createAvailabilitySlots
);

router.post('/match/respond', handleCandidateResponse);

export default router;