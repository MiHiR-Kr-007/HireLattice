import { Request, Response } from 'express';
import { pool } from '../../shared/db.js';
import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { addWeeks } from 'date-fns';
import crypto from 'crypto';

const createSlotSchema = z.object({
    start_time: z.string(),
    end_time: z.string(),
    timezone_iana: z.string(),
    is_recurring: z.boolean(),
    weeks_to_repeat: z.number().min(1).max(12).optional().default(1)
});

export const createAvailabilitySlots = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsedData = createSlotSchema.parse(req.body);

        const interviewerId = (req as any).user.userId;

        const recurrenceGroupId = parsedData.is_recurring ? crypto.randomUUID() : null;
        const totalWeeks = parsedData.is_recurring ? parsedData.weeks_to_repeat : 1;

        const slotsToInsert = [];

        for (let i = 0; i < totalWeeks; i++) {
            const localStart = addWeeks(new Date(parsedData.start_time), i);
            const localEnd = addWeeks(new Date(parsedData.end_time), i);

            const startUtc = fromZonedTime(localStart, parsedData.timezone_iana);
            const endUtc = fromZonedTime(localEnd, parsedData.timezone_iana);

            slotsToInsert.push({
                interviewerId,
                startUtc,
                endUtc,
                timezoneIana: parsedData.timezone_iana,
                recurrenceGroupId
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const slot of slotsToInsert) {
                await client.query(
                    `INSERT INTO availability_slots 
                    (interviewer_id, start_time_utc, end_time_utc, timezone_iana, recurrence_group_id) 
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        slot.interviewerId,
                        slot.startUtc,
                        slot.endUtc,
                        slot.timezoneIana,
                        slot.recurrenceGroupId
                    ]
                );
            }

            await client.query('COMMIT');

            res.status(201).json({
                message: `Successfully created ${totalWeeks} slot(s)`,
                recurrence_group: recurrenceGroupId
            });

        } catch (dbError: any) {
            await client.query('ROLLBACK');

            if (dbError.code === '23P01') {
                res.status(409).json({ error: 'One or more of these slots overlap with your existing availability.' });
                return;
            }
            throw dbError;
        } finally {
            client.release();
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request payload', details: error.issues });
            return;
        }
        console.error('Error creating slots:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getUpcomingInterviews = async (req: Request, res: Response): Promise<void> => {
    try {
        const interviewerId = (req as any).user.userId;

        const query = `
            SELECT 
                i.id AS interview_id,
                i.status,
                s.start_time_utc,
                s.end_time_utc,
                a.candidate_name,
                a.candidate_email,
                a.resume_url,
                j.title AS job_title
            FROM interviews i
            JOIN availability_slots s ON i.slot_id = s.id
            JOIN LATERAL (
                SELECT candidate_name, candidate_email, resume_url, job_id, status
                FROM applications 
                WHERE candidate_id = i.candidate_id 
                ORDER BY id DESC LIMIT 1
            ) a ON true
            JOIN jobs j ON a.job_id = j.id
            WHERE s.interviewer_id = $1 
              AND i.status IN ('CONFIRMED', 'OFFERED')
            ORDER BY s.start_time_utc ASC
        `;

        const result = await pool.query(query, [interviewerId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching upcoming interviews:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming interviews.' });
    }
};