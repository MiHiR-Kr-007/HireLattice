import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { notificationQueue } from '../../queues/notification.queue.js';

export const getPendingDecisions = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT 
                a.id AS application_id,
                a.candidate_name,
                a.candidate_email,
                a.ai_match_report,
                i.feedback AS human_feedback,
                i.interviewer_id
            FROM applications a
            JOIN interviews i ON a.id = i.candidate_id
            WHERE a.status = 'INTERVIEWED' AND i.status = 'COMPLETED'
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching pending decisions:', error);
        res.status(500).json({ error: 'Failed to fetch pending decisions.' });
    }
};

export const makeFinalDecision = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { final_decision } = req.body;

    if (!['HIRED', 'REJECTED'].includes(final_decision)) {
        res.status(400).json({ error: 'Decision must be HIRED or REJECTED' });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const updateResult = await client.query(
            `UPDATE applications SET status = $1 WHERE id = $2 RETURNING candidate_email, candidate_name, job_id`,
            [final_decision, id]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Candidate application not found.' });
            return;
        }

        const candidate = updateResult.rows[0];

        await notificationQueue.add('send-decision-email', {
            candidateId: String(id),
            candidateName: candidate.candidate_name,
            candidateEmail: candidate.candidate_email,
            jobId: String(candidate.job_id),
            decision: final_decision
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            }
        });

        await client.query('COMMIT');
        res.status(200).json({
            message: `Candidate successfully marked as ${final_decision}. Email job queued.`
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error making final decision:', error);
        res.status(500).json({ error: 'Failed to update candidate status.' });
    } finally {
        client.release();
    }
};