import './workers/ai.worker.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './modules/auth/auth.routes.js';
import jobRoutes from './modules/jobs/jobs.routes.js';
import applicationRoutes from './modules/applications/applications.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', service: 'HireFlow API' });
});

// Error handling middlewares
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled Application Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});