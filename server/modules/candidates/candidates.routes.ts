import { Router } from 'express';
import {
    getPendingDecisions,
    makeFinalDecision
} from './hr-decision.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.get(
    '/pending-decision',
    authenticateToken,
    requireRole('HR'),
    getPendingDecisions
);

router.post(
    '/:id/decision',
    authenticateToken,
    requireRole('HR'),
    makeFinalDecision
);

export default router;