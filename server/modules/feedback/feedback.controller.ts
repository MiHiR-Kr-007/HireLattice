import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';

export const submitFeedback = async (req: Request, res: Response): Promise<void> => {

    if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Unauthorized: User missing from request context.' });
        return;
    }

    const { interviewId } = req.params;
    const { technical_notes, communication_notes, final_recommendation } = req.body;
    const interviewerId = req.user.userId;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const interviewCheck = await client.query(
            `SELECT i.candidate_id, i.application_id 
             FROM interviews i
             JOIN availability_slots s ON i.slot_id = s.id
             WHERE i.id = $1 AND s.interviewer_id = $2 AND (i.status = 'CONFIRMED' OR i.status = 'OFFERED')`,
            [interviewId, interviewerId]
        );

        if (interviewCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'Valid, confirmed interview not found.' });
            return;
        }

        const applicationId = interviewCheck.rows[0].application_id;

        const feedbackPayload = JSON.stringify({
            technical_notes,
            communication_notes,
            final_recommendation,
            submitted_at: new Date().toISOString()
        });

        await client.query(
            `UPDATE interviews SET status = 'COMPLETED', feedback = $1 WHERE id = $2`,
            [feedbackPayload, interviewId]
        );

        await client.query(
            `UPDATE applications SET status = 'INTERVIEWED' WHERE id = $1`,
            [applicationId]
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