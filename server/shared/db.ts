import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hirelattice',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432', 10),
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle database client:', err);
});

export const query = async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`Executed query`, { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Query execution error:', error);
        throw error; 
    }
};