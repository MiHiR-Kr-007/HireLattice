import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/redis.js';
import { NotificationJobData } from '../queues/notification.queue.js';
import { sendEmail } from '../shared/mailer.js';

export const notificationWorker = new Worker<NotificationJobData>(
    'notification-queue',
    async (job: Job<NotificationJobData>) => {
        const { candidateName, candidateEmail, decision } = job.data;

        console.log(`[Notification Worker] Processing ${decision} email for ${candidateName} (${candidateEmail})`);

        try {
            const subject = decision === 'HIRED'
                ? 'Offer Extended - Welcome to the Team!'
                : 'Update regarding your application';

            const body = decision === 'HIRED'
                ? `Dear ${candidateName}, we are thrilled to offer you the position...`
                : `Dear ${candidateName}, after careful consideration...`;

            await sendEmail({ to: candidateEmail, subject, body });

            console.log(`[Notification Worker] Successfully sent email to ${candidateEmail}`);
        } catch (error) {
            console.error(`[Notification Worker] Failed to send email to ${candidateEmail}:`, error);
            throw error;
        }
    },
    { connection: redisConnection as any }
);

notificationWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
});