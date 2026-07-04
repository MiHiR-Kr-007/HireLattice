import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface CreateJobRequest {
    title: string;
    description: string;
}

export const createJob = async (req: Request, res: Response): Promise<void> => {
    const { title, description } = req.body as CreateJobRequest;

    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized user context' });
        return;
    }

    const hrUserId = req.user.userId;

    if (!title || !description) {
        res.status(400).json({ error: 'Missing required fields: title, description' });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const insertJobQuery = `
            INSERT INTO jobs (title, description, created_by)
            VALUES ($1, $2, $3)
            RETURNING id, title, status;
        `;
        const jobResult = await client.query(insertJobQuery, [title, description, hrUserId]);
        const newJob = jobResult.rows[0];

        const aiResponse = await fetch(`${AI_SERVICE_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_id: newJob.id,
                title: title,
                description: description
            })
        });

        if (!aiResponse.ok) {
            const aiError = await aiResponse.text();
            throw new Error(`AI Service indexing failed: ${aiError}`);
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Job created and successfully indexed by AI service',
            job: newJob
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Transaction failed, rolled back:', error.message);
        res.status(500).json({ 
            error: 'Failed to create job', 
            details: error instanceof Error ? error.message : 'Unknown error' 
        });
    } finally {
        client.release();
    }
};