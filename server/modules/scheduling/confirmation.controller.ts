import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { redisClient } from '../../shared/redis.js';
import { calendarService } from '../../shared/calendar.service.js'; 
import { notificationQueue } from '../../queues/notification.queue.js';
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
                    c.name AS candidate_name,
                    i.email AS interviewer_email,
                    i.name AS interviewer_name,
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
                ).then(async ({ meetLink, eventId }) => {
                    if (meetLink || eventId) {
                        pool.query(
                            'UPDATE interviews SET meet_link = $1, google_event_id = $2 WHERE slot_id = $3 AND candidate_id = $4', 
                            [meetLink, eventId, slotId, candidateId]
                        ).catch(console.error);
                    }

                    // Enqueue Immediate Confirmation Email
                    await notificationQueue.add('interview-confirmed', {
                        type: 'INTERVIEW_CONFIRMED',
                        candidateName: data.candidate_name,
                        candidateEmail: data.candidate_email,
                        interviewerName: data.interviewer_name,
                        startTime: data.start_time_utc,
                        meetLink: meetLink || 'Link will be provided soon'
                    });

                    const startTimeMs = new Date(data.start_time_utc).getTime();
                    const nowMs = Date.now();
                    const oneHourMs = 60 * 60 * 1000;
                    const tenMinMs = 10 * 60 * 1000;

                    // Enqueue 1-hour reminder
                    if (startTimeMs - oneHourMs > nowMs) {
                        await notificationQueue.add('interview-reminder-1hr', {
                            type: 'INTERVIEW_REMINDER',
                            candidateName: data.candidate_name,
                            candidateEmail: data.candidate_email,
                            interviewerName: data.interviewer_name,
                            startTime: data.start_time_utc,
                            meetLink: meetLink || 'Link will be provided soon'
                        }, { delay: startTimeMs - oneHourMs - nowMs });
                    }

                    // Enqueue 10-minute reminder
                    if (startTimeMs - tenMinMs > nowMs) {
                        await notificationQueue.add('interview-reminder-10min', {
                            type: 'INTERVIEW_REMINDER',
                            candidateName: data.candidate_name,
                            candidateEmail: data.candidate_email,
                            interviewerName: data.interviewer_name,
                            startTime: data.start_time_utc,
                            meetLink: meetLink || 'Link will be provided soon'
                        }, { delay: startTimeMs - tenMinMs - nowMs });
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