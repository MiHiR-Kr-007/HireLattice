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
                if (decision === 'HIRED') {
                    subject = 'Offer Extended - Welcome to the HireFlow Team!';
                    body = `Dear ${candidateName}, We are thrilled to offer you the position. Our team was incredibly impressed with your skills and experience during the interview process. We will be sending over the official offer letter and onboarding details shortly. Welcome aboard!`;
                    html = `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <h1 style="color: #10B981; margin: 0; font-size: 28px;">Congratulations! 🎉</h1>
                            </div>
                            <h2 style="color: #1E293B; font-size: 20px; font-weight: 600;">Offer Extended</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Dear ${candidateName},</p>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">We are absolutely thrilled to offer you the position. Throughout the interview process, our team was incredibly impressed with your skills, experience, and the unique perspective you bring.</p>
                            <div style="background-color: #F0FDF4; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #10B981;">
                                <p style="color: #166534; font-size: 16px; margin: 0; font-weight: 500;">What happens next?</p>
                                <p style="color: #15803D; font-size: 15px; margin: 10px 0 0 0;">Our HR team will be reaching out within the next 24 hours with your official offer letter, benefits package details, and information regarding your onboarding schedule.</p>
                            </div>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">We firmly believe that you will be a fantastic addition to our team and we cannot wait to see the impact you will make.</p>
                            <p style="color: #94A3B8; font-size: 14px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">Warmly,<br><strong>The HireFlow Team</strong></p>
                        </div>
                    `;
                } else {
                    subject = 'Update regarding your application at HireFlow';
                    body = `Dear ${candidateName}, Thank you for taking the time to interview with us. After careful consideration, we have decided to move forward with other candidates whose qualifications better meet our current needs. We appreciate your interest and wish you the best in your career.`;
                    html = `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <h2 style="color: #1E293B; font-size: 20px; font-weight: 600;">Application Update</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Dear ${candidateName},</p>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">Thank you for taking the time to speak with our team and for your interest in joining us. We sincerely appreciate the effort you put into the interview process.</p>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">After careful consideration of your application and interviews, we have decided to move forward with another candidate whose qualifications more closely match the specific needs of the role at this time.</p>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">This was a difficult decision, as our team truly enjoyed getting to know you. We were impressed by your background and encourage you to keep an eye on our careers page for future opportunities that might be a good fit.</p>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6;">We wish you all the best in your job search and your future professional endeavors.</p>
                            <p style="color: #94A3B8; font-size: 14px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">Sincerely,<br><strong>The HireFlow Team</strong></p>
                        </div>
                    `;
                }
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