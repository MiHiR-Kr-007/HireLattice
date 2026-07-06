import fs from 'fs';
import path from 'path';
import { pool } from './db.js'; 

async function runMigrations() {
    try {
        console.log('Starting database migrations...');
        
        const sqlFilePath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        await pool.query(sql);
        
        console.log('Schema created successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end(); 
    }
}

runMigrations();