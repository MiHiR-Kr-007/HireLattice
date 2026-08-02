import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface CreateJobRequest {
    title: string;
    description: string;
    interviewerIds?: number[];
    selectAllInterviewers?: boolean;
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

        const poolName = title + ' Pool';
        const poolInsert = await client.query(
            'INSERT INTO interviewer_pools (job_id, name) VALUES ($1, $2) RETURNING id',
            [newJob.id, poolName]
        );
        const poolId = poolInsert.rows[0].id;

        let idsToInsert = req.body.interviewerIds || [];
        if (req.body.selectAllInterviewers) {
            const allInts = await client.query("SELECT id FROM users WHERE role = 'INTERVIEWER'");
            idsToInsert = allInts.rows.map((row: any) => row.id);
        }

        if (idsToInsert.length > 0) {
            const values = idsToInsert.map((id: number) => `(${poolId}, ${id})`).join(', ');
            await client.query(`INSERT INTO pool_members (pool_id, interviewer_id) VALUES ${values}`);
        }

        const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_id: newJob.id.toString(),
                job_description: title + " - " + description
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

export const getOpenJobs = async (req: Request, res: Response): Promise<void> => {
    try {
        let query = '';
        if (req.user?.role === 'HR') {
            query = `
                SELECT id, title, description, status, created_at
                FROM jobs
                ORDER BY created_at DESC
            `;
        } else {
            query = `
                SELECT id, title, description, status, created_at
                FROM jobs
                WHERE status = 'OPEN'
                ORDER BY created_at DESC
            `;
        }
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching open jobs:', error);
        res.status(500).json({ error: 'Failed to fetch open jobs' });
    }
};

export const getAllInterviewers = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query("SELECT id, name, email FROM users WHERE role = 'INTERVIEWER'");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching interviewers:', error);
        res.status(500).json({ error: 'Failed to fetch interviewers' });
    }
};

export const getJobInterviewers = async (req: Request, res: Response): Promise<void> => {
    try {
        const jobId = parseInt(req.params.id as string);
        const result = await pool.query(`
            SELECT u.id, u.name, u.email 
            FROM pool_members pm
            JOIN interviewer_pools ip ON ip.id = pm.pool_id
            JOIN users u ON u.id = pm.interviewer_id
            WHERE ip.job_id = $1
        `, [jobId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching job interviewers:', error);
        res.status(500).json({ error: 'Failed to fetch job interviewers' });
    }
};

export const updateJobInterviewers = async (req: Request, res: Response): Promise<void> => {
    const jobId = parseInt(req.params.id as string);
    const { interviewerIds, selectAllInterviewers } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let poolResult = await client.query('SELECT id FROM interviewer_pools WHERE job_id = $1', [jobId]);
        let poolId;
        if (poolResult.rowCount === 0) {
            const newPool = await client.query('INSERT INTO interviewer_pools (job_id, name) VALUES ($1, $2) RETURNING id', [jobId, `Pool for Job ${jobId}`]);
            poolId = newPool.rows[0].id;
        } else {
            poolId = poolResult.rows[0].id;
        }

        await client.query('DELETE FROM pool_members WHERE pool_id = $1', [poolId]);

        let idsToInsert = interviewerIds || [];
        if (selectAllInterviewers) {
            const allInts = await client.query("SELECT id FROM users WHERE role = 'INTERVIEWER'");
            idsToInsert = allInts.rows.map(row => row.id);
        }

        if (idsToInsert.length > 0) {
            const values = idsToInsert.map((id: number) => `(${poolId}, ${id})`).join(', ');
            await client.query(`INSERT INTO pool_members (pool_id, interviewer_id) VALUES ${values}`);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Interviewers updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating job interviewers:', error);
        res.status(500).json({ error: 'Failed to update interviewers' });
    } finally {
        client.release();
    }
};

export const searchSemanticJobs = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No resume file uploaded' });
            return;
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const resumeText = textResult.text;

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/jobs/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resume_text: resumeText })
        });

        if (!aiResponse.ok) {
            const aiError = await aiResponse.text();
            throw new Error(`AI Service search failed: ${aiError}`);
        }

        const data = await aiResponse.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error in semantic search:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to perform semantic search' });
    }
};

export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
    const jobId = parseInt(req.params.id as string);
    const { status } = req.body;

    if (!status || !['OPEN', 'CLOSED'].includes(status)) {
        res.status(400).json({ error: 'Invalid or missing status. Must be OPEN or CLOSED.' });
        return;
    }

    try {
        const result = await pool.query(
            'UPDATE jobs SET status = $1 WHERE id = $2 RETURNING id, status',
            [status, jobId]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        res.status(200).json({ message: 'Job status updated successfully', job: result.rows[0] });
    } catch (error) {
        console.error('Error updating job status:', error);
        res.status(500).json({ error: 'Failed to update job status' });
    }
};