import { Router } from 'express';
import { submitFeedback } from '../feedback/feedback.controller.js';
import {
    reportCandidateNoShow,
    reportInterviewerNoShow
} from './attendance.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post(
    '/:interviewId/feedback',
    authenticateToken,
    requireRole('INTERVIEWER'),
    submitFeedback
);

router.post(
    '/:id/candidate-no-show',
    authenticateToken,
    requireRole('INTERVIEWER'),
    reportCandidateNoShow
);

router.post(
    '/:id/interviewer-no-show',
    authenticateToken,
    requireRole('CANDIDATE'),
    reportInterviewerNoShow
);

export default router;