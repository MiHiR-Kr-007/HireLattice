import { Worker, Job } from 'bullmq';
import pdfParse from 'pdf-parse';
import redisConnection from '../shared/redis.js';
import { pool } from '../shared/db.js';
import { AI_RANKING_QUEUE } from '../queues/ai.queue.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const parsePdf = pdfParse as unknown as (dataBuffer: Buffer) => Promise<any>;

export const aiWorker = new Worker(AI_RANKING_QUEUE, async (job: Job) => {
    const { applicationId, jobId, fileUrl } = job.data;
    console.log(`[Worker] Processing Job ${job.id} for Application ${applicationId}`);

    try {
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            throw new Error(`Failed to download resume from cloud storage: ${pdfResponse.statusText}`);
        }
        
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const dataBuffer = Buffer.from(arrayBuffer);

        const pdfData = await parsePdf(dataBuffer);
        const resumeText = pdfData.text;

        const aiResponse = await fetch(`${AI_SERVICE_URL}/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_id: jobId, resume_text: resumeText })
        });

        if (!aiResponse.ok) {
            throw new Error(`AI Service returned status ${aiResponse.status}`);
        }

        const matchReport = await aiResponse.json();

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
        throw error; 
    }
}, { connection: redisConnection as any });

aiWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} permanently failed: ${err.message}`);
});