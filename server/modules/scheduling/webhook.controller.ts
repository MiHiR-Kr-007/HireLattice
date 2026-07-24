import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { matchmakingQueue } from '../../queues/matchmaker.queue.js';
import { notificationQueue } from '../../queues/notification.queue.js';

export const simulateCalendarCancellation = async (req: Request, res: Response): Promise<void> => {
    const { googleEventId } = req.body;

    if (!googleEventId) {
        res.status(400).json({ error: 'googleEventId is required' });
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const query = `
            SELECT 
                i.id AS interview_id,
                i.candidate_id,
                i.application_id,
                i.slot_id,
                i.status,
                s.interviewer_id,
                s.start_time_utc,
                a.job_id,
                a.match_score,
                c.email AS candidate_email,
                c.name AS candidate_name
            FROM interviews i
            JOIN availability_slots s ON i.slot_id = s.id
            JOIN applications a ON i.application_id = a.id
            JOIN users c ON i.candidate_id = c.id
            WHERE i.google_event_id = $1 AND (i.status = 'CONFIRMED' OR i.status = 'OFFERED')
        `;

        const result = await client.query(query, [googleEventId]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ message: 'Active interview not found for this event ID.' });
            return;
        }

        const interview = result.rows[0];

        const startTimeMs = new Date(interview.start_time_utc).getTime();
        const nowMs = Date.now();
        const hoursNotice = (startTimeMs - nowMs) / (1000 * 60 * 60);

        let penalty = 10;
        if (hoursNotice < 24) {
            penalty = 30;
        }

        await client.query(
            `UPDATE users SET reliability_score = GREATEST(reliability_score - $1, 0) WHERE id = $2`,
            [penalty, interview.interviewer_id]
        );

        await client.query(
            `UPDATE interviews SET status = 'CANCELLED_BY_INTERVIEWER' WHERE id = $1`,
            [interview.interview_id]
        );

        await client.query(
            `UPDATE availability_slots SET status = 'CANCELLED' WHERE id = $1`,
            [interview.slot_id]
        );

        await client.query(
            `UPDATE applications SET status = 'RANKED' WHERE id = $1`,
            [interview.application_id]
        );

        await client.query('COMMIT');

        await matchmakingQueue.add('rematch-candidate', {
            candidateId: interview.candidate_id,
            jobId: interview.job_id,
            rankScore: interview.match_score ? parseFloat(interview.match_score) : 0
        });

        res.status(200).json({
            message: 'Webhook processed successfully. Interview cancelled, penalty applied, and candidate returned to matchmaking queue.',
            penaltyApplied: penalty
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing calendar webhook simulation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
};
