import { Redis, RedisOptions } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isUpstash = REDIS_URL.includes('upstash.io');
const isTls = REDIS_URL.startsWith('rediss://');

const baseOptions: RedisOptions = {
    family: 4,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {})
};

// Connection instance dedicated for BullMQ/Workers
export const redisConnection = new Redis(REDIS_URL, {
    ...baseOptions,
    maxRetriesPerRequest: null,
});

// instance for general caching and TTL slot locks
export const redisClient = new Redis(REDIS_URL, baseOptions);

redisConnection.on('error', (err) => console.error('Redis connection error (Queue):', err));
redisClient.on('error', (err) => console.error('Redis connection error (Cache):', err));