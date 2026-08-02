import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/redis.js';
import { pool } from '../shared/db.js';
import { AI_RANKING_QUEUE } from '../queues/ai.queue.js';
import { matchmakingQueue } from '../queues/matchmaker.queue.js';
import { notificationQueue } from '../queues/notification.queue.js';
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

        const newStatus = matchReport.fit_score >= 7 ? 'RANKED' : 'REJECTED';

        const updateAppQuery = `
            UPDATE applications 
            SET status = $1, 
                match_score = $2, 
                ai_match_report = $3
            WHERE id = $4
            RETURNING candidate_id, candidate_name, candidate_email
        `;
        
        const updateResult = await pool.query(updateAppQuery, [
            newStatus,
            matchReport.fit_score,
            JSON.stringify(matchReport),
            applicationId
        ]);

        const appData = updateResult.rows[0];

        console.log(`[Worker] Successfully ranked Application ${applicationId}. Score: ${matchReport.fit_score}`);

        if (matchReport.fit_score >= 7) {
            console.log(`[Worker] Score >= 7. Queueing Application ${applicationId} for scheduling...`);
            
            await matchmakingQueue.add('schedule-interview', {
                candidateId: appData.candidate_id,
                jobId,
                rankScore: matchReport.fit_score
            });
        } else {
            console.log(`[Worker] Score < 7. Application ${applicationId} REJECTED. Sending email.`);
            
            await notificationQueue.add('send-decision-email', {
                type: 'DECISION',
                candidateId: String(appData.candidate_id),
                candidateName: appData.candidate_name,
                candidateEmail: appData.candidate_email,
                jobId: String(jobId),
                decision: 'REJECTED',
                rejectionReason: matchReport.summary || "Your profile doesn't match the required skills for this role."
            });
        }

    } catch (error) {
        console.error(`[Worker] Failed to process Application ${applicationId}:`, error);
        throw error; 
    }
}, { connection: redisConnection as any });

aiWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} permanently failed: ${err.message}`);
});