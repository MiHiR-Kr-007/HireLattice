import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/redis.js';
import { pool } from '../shared/db.js';
import { AI_RANKING_QUEUE } from '../queues/ai.queue.js';
import { PDFParse } from 'pdf-parse';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const aiWorker = new Worker(AI_RANKING_QUEUE, async (job: Job) => {
    const { applicationId, jobId, fileUrl } = job.data;
    console.log(`[Worker] Processing Job ${job.id} for Application ${applicationId}`);

    try {
        const pdfResponse = await fetch(fileUrl);
        if (!pdfResponse.ok) {
            throw new Error(`HTTP ${pdfResponse.status} ${pdfResponse.statusText} - URL: ${fileUrl}`);
        }
        
        const arrayBuffer = await pdfResponse.arrayBuffer();
        const dataBuffer = Buffer.from(arrayBuffer);

        const parser = new PDFParse({ data: dataBuffer });
        const textResult = await parser.getText();
        const resumeText = textResult.text;

        const jobQuery = await pool.query('SELECT title, description FROM jobs WHERE id = $1', [jobId]);
        if (jobQuery.rowCount === 0) {
            throw new Error(`Job ${jobId} not found in database`);
        }
        const jobDescription = `${jobQuery.rows[0].title} - ${jobQuery.rows[0].description}`;

        const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ job_description: jobDescription, resume_text: resumeText })
        });

        if (!aiResponse.ok) {
            throw new Error(`AI Service returned status ${aiResponse.status}`);
        }

        const matchReport = await aiResponse.json();

        const updateAppQuery = `
            UPDATE applications 
            SET status = 'RANKED', 
                match_score = $1, 
                ai_match_report = $2
            WHERE id = $3
        `;
        
        await pool.query(updateAppQuery, [
            matchReport.fit_score,
            JSON.stringify(matchReport),
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