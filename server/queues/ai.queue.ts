import { Queue } from 'bullmq';
import redisConnection from '../shared/redis.js';

export const AI_RANKING_QUEUE = 'ai-ranking-queue';

export const aiQueue = new Queue(AI_RANKING_QUEUE, {
    connection: redisConnection as any,
});