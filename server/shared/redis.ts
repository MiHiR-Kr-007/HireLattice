import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection instance dedicated for BullMQ/Workers
export const redisConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, 
});

// instance for general caching and TTL slot locks
export const redisClient = new Redis(REDIS_URL);

redisConnection.on('error', (err) => console.error('Redis connection error (Queue):', err));
redisClient.on('error', (err) => console.error('Redis connection error (Cache):', err));