import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';

export const submitFeedback = async (req: Request, res: Response): Promise<void> => {

    if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Unauthorized: User missing from request context.' });
        return;
    }

    const { interviewId } = req.params;
    const { technical_score, communication_score, strengths, recommendation, comments } = req.body;
    const interviewerId = req.user.userId;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const interviewCheck = await client.query(
            `SELECT candidate_id FROM interviews WHERE id = $1 AND interviewer_id = $2 AND status = 'CONFIRMED'`,
            [interviewId, interviewerId]
        );

        if (interviewCheck.rowCount === 0) {
            res.status(400).json({ error: 'Valid, confirmed interview not found.' });
            return;
        }

        const candidateId = interviewCheck.rows[0].candidate_id;

        const feedbackPayload = JSON.stringify({
            technical_score,
            communication_score,
            strengths,
            recommendation,
            comments,
            submitted_at: new Date().toISOString()
        });

        await client.query(
            `UPDATE interviews SET status = 'COMPLETED', feedback = $1 WHERE id = $2`,
            [feedbackPayload, interviewId]
        );

        await client.query(
            `UPDATE applications SET status = 'INTERVIEWED' WHERE id = $1`,
            [candidateId]
        );

        await client.query(
            `UPDATE users 
       SET reliability_score = LEAST(reliability_score + 5, 100) 
       WHERE id = $1`,
            [interviewerId]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Feedback submitted successfully. Candidate moved to HR review.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Internal server error during feedback submission.' });
    } finally {
        client.release();
    }
};