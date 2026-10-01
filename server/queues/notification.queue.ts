import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis.js';

export interface NotificationJobData {
    type: 'DECISION' | 'INTERVIEW_CONFIRMED' | 'INTERVIEW_REMINDER' | 'CALENDAR_SYNC';
    candidateId?: string | number;
    candidateName: string;
    candidateEmail: string;
    jobId?: string;
    decision?: 'HIRED' | 'REJECTED';
    rejectionReason?: string;
    interviewerName?: string;
    interviewerEmail?: string;
    startTime?: string;
    endTime?: string;
    jobTitle?: string;
    googleRefreshToken?: string;
    meetLink?: string;
    slotId?: number;
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