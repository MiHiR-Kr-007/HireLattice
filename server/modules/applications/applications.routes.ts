import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { applyForJob, getMyApplications, retryAiRanking } from './applications.controller.js';
import { authenticateToken, requireRole } from '../../shared/middleware/auth.middleware.js';

const router = Router();

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

router.post('/apply', authenticateToken, requireRole('CANDIDATE'), upload.single('resume'), applyForJob);
router.get('/me', authenticateToken, requireRole('CANDIDATE'), getMyApplications);
router.post('/:id/retry', authenticateToken, requireRole('HR'), retryAiRanking);

export default router;