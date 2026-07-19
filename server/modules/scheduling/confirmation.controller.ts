import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { redisClient } from '../../shared/redis.js';
import { calendarService } from '../../shared/calendar.service.js'; 
import { z } from 'zod';

const responseSchema = z.object({
    candidateId: z.number(),
    slotId: z.number(),
    action: z.enum(['CONFIRM', 'DECLINE'])
});

export const handleCandidateResponse = async (req: Request, res: Response): Promise<void> => {
    try {
        const { candidateId, slotId, action } = responseSchema.parse(req.body);
        const redisLockKey = `lock:slot:${slotId}`;

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            if (action === 'DECLINE') {
                await client.query(`UPDATE availability_slots SET status = 'AVAILABLE' WHERE id = $1`, [slotId]);
                await client.query(`UPDATE interviews SET status = 'DECLINED' WHERE slot_id = $1 AND candidate_id = $2`, [slotId, candidateId]);
                await client.query(`UPDATE applications SET status = 'RANKED' WHERE candidate_id = $1`, [candidateId]); 
                
                await redisClient.del(redisLockKey);
                await client.query('COMMIT');
                client.release();
                
                res.status(200).json({ message: 'Slot declined successfully. Your profile has returned to the scheduling pool.' });
                return;
            }

            // ACTION IS CONFIRM
            const activeLock = await redisClient.get(redisLockKey);
            
            if (!activeLock || activeLock !== `candidate:${candidateId}`) {
                await client.query(`UPDATE interviews SET status = 'EXPIRED' WHERE slot_id = $1 AND candidate_id = $2`, [slotId, candidateId]);
                await client.query(`UPDATE applications SET status = 'RANKED' WHERE candidate_id = $1`, [candidateId]);
                await client.query(`UPDATE availability_slots SET status = 'AVAILABLE' WHERE id = $1`, [slotId]);
                
                await client.query('COMMIT');
                client.release();
                res.status(410).json({ error: 'Reservation window expired. Please request a new interview slot.' });
                return;
            }

            // change state machine to CONFIRMED
            await client.query(`UPDATE availability_slots SET status = 'CONFIRMED' WHERE id = $1`, [slotId]);
            await client.query(`UPDATE interviews SET status = 'CONFIRMED' WHERE slot_id = $1 AND candidate_id = $2`, [slotId, candidateId]);
            await client.query(`UPDATE applications SET status = 'CONFIRMED' WHERE candidate_id = $1`, [candidateId]);
            await redisClient.del(redisLockKey);

            const metadataQuery = `
                SELECT 
                    c.email AS candidate_email,
                    i.email AS interviewer_email,
                    s.start_time_utc,
                    s.end_time_utc,
                    j.title AS job_title,
                    i.google_refresh_token
                FROM availability_slots s
                JOIN users i ON s.interviewer_id = i.id
                JOIN users c ON c.id = $1
                JOIN applications a ON a.candidate_id = c.id
                JOIN jobs j ON a.job_id = j.id
                WHERE s.id = $2
                LIMIT 1;
            `;
            const { rows } = await client.query(metadataQuery, [candidateId, slotId]);
            
            await client.query('COMMIT');
            client.release(); 

            if (rows.length > 0) {
                const data = rows[0];
                
                calendarService.createInterviewEvent(
                    data.candidate_email,
                    data.interviewer_email,
                    new Date(data.start_time_utc),
                    new Date(data.end_time_utc),
                    data.job_title,
                    data.google_refresh_token
                ).then(meetLink => {
                    if (meetLink) {
                        pool.query('UPDATE interviews SET meet_link = $1 WHERE slot_id = $2 AND candidate_id = $3', [meetLink, slotId, candidateId]).catch(console.error);
                    }
                }).catch(err => {
                    console.error('Non-fatal error: Calendar sync failed after DB commit:', err);
                });
            }

            res.status(200).json({ message: 'Interview successfully confirmed! Calendar invites have been dispatched.' });

        } catch (txError) {
            await client.query('ROLLBACK');
            client.release();
            throw txError;
        }

    } catch (error) {
        console.error('Error handling candidate scheduling response:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};