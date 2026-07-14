import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { aiQueue } from '../../queues/ai.queue.js';

import { IStorageService } from '../../shared/storage/storage.interface.js';
import { CloudinaryService } from '../../shared/storage/cloudinary.service.js';
const storageService: IStorageService = new CloudinaryService();

export const applyForJob = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || req.user.role !== 'CANDIDATE') {
        res.status(403).json({ error: 'Only registered candidates can apply for jobs' });
        return;
    }

    const candidateId = req.user.userId;
    const { jobId } = req.body;

    const file = req.file as Express.Multer.File;

    if (!jobId || !file) {
        res.status(400).json({ error: 'Job ID and a PDF resume file are required' });
        return;
    }

    try {
        const secureResumeUrl = await storageService.uploadFile(file.path);

        const jobCheck = await pool.query('SELECT status FROM jobs WHERE id = $1', [jobId]);
        if (jobCheck.rowCount === 0) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        const userCheck = await pool.query('SELECT name, email FROM users WHERE id = $1', [candidateId]);
        const candidateName = userCheck.rows[0].name;
        const candidateEmail = userCheck.rows[0].email;

        const insertAppQuery = `
            INSERT INTO applications (job_id, candidate_id, candidate_name, candidate_email, resume_url, status)
            VALUES ($1, $2, $3, $4, $5, 'APPLIED')
            RETURNING id;
        `;
        const appResult = await pool.query(insertAppQuery, [jobId, candidateId, candidateName, candidateEmail, secureResumeUrl]);
        const applicationId = appResult.rows[0].id;

        await aiQueue.add('rank-resume', {
            applicationId,
            jobId: parseInt(jobId, 10),
            fileUrl: secureResumeUrl
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });

        res.status(202).json({
            message: 'Application received. AI is currently reviewing your resume.',
            applicationId,
            status: 'APPLIED'
        });

    } catch (error: any) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: 'Failed to process application' });
    }
};

export const getMyApplications = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'CANDIDATE') {
            res.status(403).json({ error: 'Only candidates can view their applications' });
            return;
        }

        const candidateId = req.user.userId;

        const query = `
            SELECT 
                a.id AS application_id,
                a.job_id,
                j.title AS job_title,
                a.status,
                a.created_at,
                i.status AS interview_status,
                s.start_time_utc AS interview_time
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN LATERAL (
                SELECT id, status, slot_id 
                FROM interviews 
                WHERE candidate_id = a.candidate_id 
                ORDER BY created_at DESC LIMIT 1
            ) i ON a.status IN ('SCHEDULED', 'INTERVIEWED', 'HIRED', 'REJECTED')
            LEFT JOIN availability_slots s ON i.slot_id = s.id
            WHERE a.candidate_id = $1
            ORDER BY a.created_at DESC
        `;

        const result = await pool.query(query, [candidateId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching candidate applications:', error);
        res.status(500).json({ error: 'Failed to fetch your applications.' });
    }
};

export const retryAiRanking = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const query = `
            SELECT id, job_id, resume_url, status 
            FROM applications 
            WHERE id = $1
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Application not found' });
            return;
        }

        const application = result.rows[0];

        // only retried if it's stuck in APPLIED
        if (application.status !== 'APPLIED') {
            res.status(400).json({ error: 'Can only retry AI ranking for applications stuck in APPLIED status' });
            return;
        }

        await aiQueue.add('rank-resume', {
            applicationId: application.id,
            jobId: application.job_id,
            fileUrl: application.resume_url
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });

        res.status(202).json({
            message: 'AI Ranking job re-queued successfully.',
            applicationId: application.id
        });
    } catch (error) {
        console.error('Error retrying AI ranking:', error);
        res.status(500).json({ error: 'Failed to re-queue AI ranking job.' });
    }
};