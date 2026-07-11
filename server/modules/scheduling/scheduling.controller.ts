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