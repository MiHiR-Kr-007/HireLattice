import { Router } from 'express';
import {
    getPendingDecisions,
    makeFinalDecision,
    getAllCandidates,
    getCandidateById
} from './hr-decision.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.get(
    '/',
    authenticateToken,
    requireRole('HR'),
    getAllCandidates
);

router.get(
    '/pending-decision',
    authenticateToken,
    requireRole('HR'),
    getPendingDecisions
);

router.get(
    '/:id',
    authenticateToken,
    requireRole('HR'),
    getCandidateById
);

router.post(
    '/:id/decision',
    authenticateToken,
    requireRole('HR'),
    makeFinalDecision
);

export default router;