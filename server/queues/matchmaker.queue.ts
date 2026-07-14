import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis.js';

export const MATCHMAKING_QUEUE = 'matchmaking-queue';

export const matchmakingQueue = new Queue(MATCHMAKING_QUEUE, {
    connection: redisConnection as any,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
