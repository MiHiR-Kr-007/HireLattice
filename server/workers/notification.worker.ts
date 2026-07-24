import { Worker, Job } from 'bullmq';
import { redisConnection } from '../shared/redis.js';
import { NotificationJobData } from '../queues/notification.queue.js';
import { sendEmail } from '../shared/mailer.js';

export const notificationWorker = new Worker<NotificationJobData>(
    'notification-queue',
    async (job: Job<NotificationJobData>) => {
        const { type, candidateName, candidateEmail, decision, interviewerName, startTime, meetLink } = job.data;

        console.log(`[Notification Worker] Processing ${type} email for ${candidateName} (${candidateEmail})`);

        try {
            let subject = '';
            let body = '';
            let html = '';

            if (type === 'DECISION') {
                subject = decision === 'HIRED' ? 'Offer Extended - Welcome to the Team!' : 'Update regarding your application';
                body = decision === 'HIRED' ? `Dear ${candidateName}, we are thrilled to offer you the position...` : `Dear ${candidateName}, after careful consideration...`;
                
                html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaeb; border-radius: 8px;">
                        <h2 style="color: #2D3748;">${subject}</h2>
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.5;">${body}</p>
                        <p style="color: #A0AEC0; font-size: 14px; margin-top: 30px;">Best regards,<br>The HireFlow Team</p>
                    </div>
                `;
            } else if (type === 'INTERVIEW_CONFIRMED') {
                subject = `Interview Confirmed: ${candidateName} & ${interviewerName}`;
                const formattedTime = new Date(startTime!).toLocaleString();
                body = `Your interview is confirmed for ${formattedTime}. Google Meet Link: ${meetLink}`;
                
                html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaeb; border-radius: 8px;">
                        <h2 style="color: #3182CE;">Interview Confirmed!</h2>
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.5;">Hi ${candidateName},</p>
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.5;">Your interview with <strong>${interviewerName}</strong> has been successfully scheduled.</p>
                        
                        <div style="background-color: #F7FAFC; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0; color: #2D3748;"><strong>Date & Time:</strong> ${formattedTime}</p>
                            <p style="margin: 0; color: #2D3748;"><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #3182CE; text-decoration: none;">Join Google Meet</a></p>
                        </div>
                        
                        <p style="color: #A0AEC0; font-size: 14px; margin-top: 30px;">Best regards,<br>The HireFlow Team</p>
                    </div>
                `;
            } else if (type === 'INTERVIEW_REMINDER') {
                subject = `Reminder: Upcoming Interview in less than an hour`;
                const formattedTime = new Date(startTime!).toLocaleString();
                body = `Reminder: Your interview is coming up at ${formattedTime}. Google Meet Link: ${meetLink}`;
                
                html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaeb; border-radius: 8px;">
                        <h2 style="color: #DD6B20;">Interview Reminder</h2>
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.5;">Hi ${candidateName},</p>
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.5;">This is a quick reminder that your interview with <strong>${interviewerName}</strong> is starting soon.</p>
                        
                        <div style="background-color: #FFFAF0; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #FEEBC8;">
                            <p style="margin: 0 0 10px 0; color: #C05621;"><strong>Date & Time:</strong> ${formattedTime}</p>
                            <p style="margin: 0; color: #C05621;"><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #DD6B20; font-weight: bold; text-decoration: none;">Join Google Meet</a></p>
                        </div>
                        
                        <p style="color: #A0AEC0; font-size: 14px; margin-top: 30px;">Good luck!<br>The HireFlow Team</p>
                    </div>
                `;
            }

            await sendEmail({ to: candidateEmail, subject, body, html });

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