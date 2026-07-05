import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { aiQueue } from '../../queues/ai.queue.js';

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
        const jobCheck = await pool.query('SELECT status FROM jobs WHERE id = $1', [jobId]);
        if (jobCheck.rowCount === 0) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        const insertAppQuery = `
            INSERT INTO applications (job_id, candidate_id, resume_url, status)
            VALUES ($1, $2, $3, 'APPLIED')
            RETURNING id;
        `;
        const appResult = await pool.query(insertAppQuery, [jobId, candidateId, file.path]);
        const applicationId = appResult.rows[0].id;

        await aiQueue.add('rank-resume', {
            applicationId,
            jobId: parseInt(jobId, 10),
            filePath: file.path
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