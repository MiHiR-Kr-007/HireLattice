import { Router } from 'express';
import { createJob, getOpenJobs, getAllInterviewers, getJobInterviewers, updateJobInterviewers, searchSemanticJobs, updateJobStatus } from './jobs.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';
import multer from 'multer';
import fs from 'fs';

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files are allowed'));
    }
});

const router = Router();

router.get('/', authenticateToken, getOpenJobs);
router.post('/', authenticateToken, requireRole('HR'), createJob);
router.get('/interviewers/all', authenticateToken, requireRole('HR'), getAllInterviewers);
router.get('/:id/interviewers', authenticateToken, requireRole('HR'), getJobInterviewers);
router.put('/:id/interviewers', authenticateToken, requireRole('HR'), updateJobInterviewers);
router.post('/search-semantic', authenticateToken, requireRole('CANDIDATE'), upload.single('resume'), searchSemanticJobs);
router.put('/:id/status', authenticateToken, requireRole('HR'), updateJobStatus);

export default router;