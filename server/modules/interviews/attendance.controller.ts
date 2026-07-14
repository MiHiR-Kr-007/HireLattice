import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';

// protected by: interviewer role
export const reportCandidateNoShow = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { id } = req.params;
    const interviewerId = req.user.userId;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const interviewCheck = await client.query(
            `SELECT candidate_id FROM interviews WHERE id = $1 AND interviewer_id = $2 AND status = 'CONFIRMED'`,
            [id, interviewerId]
        );

        if (interviewCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'Valid, confirmed interview not found.' });
            return;
        }

        const candidateId = interviewCheck.rows[0].candidate_id;

        await client.query(`UPDATE interviews SET status = 'CANDIDATE_NO_SHOW' WHERE id = $1`, [id]);

        await client.query(`UPDATE applications SET status = 'REJECTED' WHERE id = $1`, [candidateId]);

        await client.query(
            `UPDATE users SET reliability_score = LEAST(reliability_score + 5, 100) WHERE id = $1`,
            [interviewerId]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Candidate marked as no-show. Reliability score increased.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
};

// protected by: candidate role
export const reportInterviewerNoShow = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.user.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { id } = req.params; // Interview ID
    const candidateId = req.user.userId;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const interviewCheck = await client.query(
            `SELECT i.slot_id, s.interviewer_id 
             FROM interviews i
             JOIN availability_slots s ON i.slot_id = s.id
             WHERE i.id = $1 AND i.candidate_id = $2 AND i.status = 'CONFIRMED'`,
            [id, candidateId]
        );

        if (interviewCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'Valid, confirmed interview not found.' });
            return;
        }

        const { interviewer_id, slot_id } = interviewCheck.rows[0];

        await client.query(`UPDATE interviews SET status = 'INTERVIEWER_NO_SHOW' WHERE id = $1`, [id]);

        await client.query(`UPDATE applications SET status = 'RANKED' WHERE id = $1`, [candidateId]);

        await client.query(
            `UPDATE users SET reliability_score = GREATEST(reliability_score - 20, 0) WHERE id = $1`,
            [interviewer_id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Interviewer reported. You have been placed back in the scheduling queue.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Internal server error.' });
    } finally {
        client.release();
    }
};