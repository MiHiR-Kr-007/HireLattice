import { Router } from 'express';
import { createAvailabilitySlots } from './scheduling.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post(
    '/slots', 
    authenticateToken, 
    requireRole('INTERVIEWER'), 
    createAvailabilitySlots
);

export default router;