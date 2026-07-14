import { Router } from 'express';
import { createJob, getOpenJobs } from './jobs.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, getOpenJobs);
router.post('/', authenticateToken, requireRole('HR'), createJob);

export default router;