import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import redisConnection from '../shared/redis.js';
import { pool } from '../shared/db.js';
import { AI_RANKING_QUEUE } from '../queues/ai.queue.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// FIX: Force TS to recognize the ESM default export
const parsePdf = pdfParse as unknown as (dataBuffer: Buffer) => Promise<any>;

export const aiWorker = new Worker(AI_RANKING_QUEUE, async (job: Job) => {
    const { applicationId, jobId, filePath } = job.data;
    console.log(`[Worker] Processing Job ${job.id} for Application ${applicationId}`);

    try {
        // 1. Extract Text
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await parsePdf(dataBuffer);
        const resumeText = pdfData.text;

        // 2. Call AI Microservice
        const aiResponse = await fetch(`${AI_SERVICE_URL}/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jobId, resume_text: resumeText })
        });

        if (!aiResponse.ok) {
            // Throwing an error tells BullMQ to mark this attempt as failed and retry
            throw new Error(`AI Service returned status ${aiResponse.status}`);
        }

        const matchReport = await aiResponse.json();

        // 3. Update Database
        const updateAppQuery = `
            UPDATE applications 
            SET status = 'RANKED', 
                ai_fit_score = $1, 
                ai_summary = $2, 
                ai_matched_skills = $3, 
                ai_missing_skills = $4
            WHERE id = $5
        `;
        
        await pool.query(updateAppQuery, [
            matchReport.fit_score,
            matchReport.summary,
            JSON.stringify(matchReport.matched_skills),
            JSON.stringify(matchReport.missing_skills),
            applicationId
        ]);

        console.log(`[Worker] Successfully ranked Application ${applicationId}`);

    } catch (error) {
        console.error(`[Worker] Failed to process Application ${applicationId}:`, error);
        throw error; // Let BullMQ handle the retry logic
    }
}, { connection: redisConnection as any});

aiWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} permanently failed: ${err.message}`);
    // Here you could update the DB status to 'FAILED_RANKING' if all retries are exhausted
});