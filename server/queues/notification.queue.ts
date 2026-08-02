import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis.js';

export interface NotificationJobData {
    type: 'DECISION' | 'INTERVIEW_CONFIRMED' | 'INTERVIEW_REMINDER';
    candidateId?: string;
    candidateName: string;
    candidateEmail: string;
    jobId?: string;
    decision?: 'HIRED' | 'REJECTED';
    rejectionReason?: string;
    interviewerName?: string;
    startTime?: string;
    meetLink?: string;
}

export const notificationQueue = new Queue<NotificationJobData>('notification-queue', {
    connection: redisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
    },
});