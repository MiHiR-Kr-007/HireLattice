import { Worker, Job } from 'bullmq';
import { pool } from '../shared/db.js';
import {redisClient, redisConnection} from '../shared/redis.js'; 

interface MatchmakerJobData {
    candidateId: number;
    jobId: number;
    rankScore: number;
}

export const matchmakerWorker = new Worker<MatchmakerJobData>(
    'matchmaking-queue',
    async (job: Job<MatchmakerJobData>) => {
        const { candidateId, jobId, rankScore } = job.data;
        console.log(`Processing matchmaking for Candidate #${candidateId} on Job #${jobId}...`);

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // take the best interviewer from the pool
            const slotQuery = `
                SELECT s.id as slot_id, s.interviewer_id, pm.reliability_score
                FROM availability_slots s
                JOIN interviewer_pools ip ON ip.job_id = $1
                JOIN pool_members pm ON pm.pool_id = ip.id AND pm.interviewer_id = s.interviewer_id
                WHERE s.status = 'AVAILABLE' 
                  AND s.start_time_utc > CURRENT_TIMESTAMP
                ORDER BY pm.reliability_score DESC, s.start_time_utc ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED; -- Advanced Row-Level Locking to handle simultaneous workers safely
            `;

            const slotResult = await client.query(slotQuery, [jobId]);

            // No slots found
            if (slotResult.rows.length === 0) {
                console.warn(`SLA Alert: No slots available for Candidate #${candidateId} on Job #${jobId}. Flagging for HR escalation.`);
                
                await client.query(
                    `UPDATE applications SET status = 'STALLED_NO_SLOTS' WHERE candidate_id = $1 AND job_id = $2`,
                    [candidateId, jobId]
                );
                
                await client.query('COMMIT');
                return;
            }

            const bestSlot = slotResult.rows[0];
            const slotId = bestSlot.slot_id;

            // The Slot Contention Problem 
            const redisLockKey = `lock:slot:${slotId}`;
            const isReserved = await redisClient.set(
                redisLockKey, 
                `candidate:${candidateId}`, 
                'EX', 900, 
                'NX'
            );

            if (!isReserved) {
                throw new Error(`Slot #${slotId} was reserved by another thread concurrently. Retrying job.`);
            }

            await client.query(
                `UPDATE availability_slots SET status = 'RESERVED' WHERE id = $1`,
                [slotId]
            );

            await client.query(
                `INSERT INTO interviews (candidate_id, slot_id, status) VALUES ($1, $2, 'OFFERED')`,
                [candidateId, slotId]
            );

            await client.query(
                `UPDATE applications SET status = 'SLOT_OFFERED' WHERE candidate_id = $1 AND job_id = $2`,
                [candidateId, jobId]
            );

            await client.query('COMMIT');
            console.log(`Success: Slot #${slotId} reserved for Candidate #${candidateId}. Notification pipeline triggered.`);

            // TODO: In the next step, emit a event to the Notification queue to send the invitation link to the candidate.

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Matchmaking failed for Candidate #${candidateId}:`, error);
            throw error; 
        } finally {
            client.release();
        }
    },
    {
        connection: redisConnection as any,
        concurrency: 5
    }
);