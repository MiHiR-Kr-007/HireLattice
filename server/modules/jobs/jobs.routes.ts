import { Router } from 'express';
import { createJob, getOpenJobs, getAllInterviewers, getJobInterviewers, updateJobInterviewers } from './jobs.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, getOpenJobs);
router.post('/', authenticateToken, requireRole('HR'), createJob);
router.get('/interviewers/all', authenticateToken, requireRole('HR'), getAllInterviewers);
router.get('/:id/interviewers', authenticateToken, requireRole('HR'), getJobInterviewers);
router.put('/:id/interviewers', authenticateToken, requireRole('HR'), updateJobInterviewers);

export default router;