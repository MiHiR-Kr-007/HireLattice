import { Router } from 'express';
import { createJob } from './jobs.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticateToken, requireRole('HR'), createJob);

export default router;