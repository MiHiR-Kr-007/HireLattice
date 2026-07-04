import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken'; // <-- Import Secret and SignOptions
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../../shared/db.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (userId: number, email: string, role: string): string => {
    const options: SignOptions = { 
        expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] 
    };
    
    return jwt.sign({ userId, email, role }, JWT_SECRET, options);
};


// Native Email & Password Registration
export const register = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        res.status(400).json({ error: 'Missing required registration fields' });
        return;
    }

    try {
        const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rowCount && userCheck.rowCount > 0) {
            res.status(409).json({ error: 'User with this email already exists' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertUserQuery = `
            INSERT INTO users (name, email, password_hash, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role;
        `;
        const result = await pool.query(insertUserQuery, [name, email, passwordHash, role]);
        const newUser = result.rows[0];

        const token = generateToken(newUser.id, newUser.email, newUser.role);

        res.status(201).json({ user: newUser, token });
    } catch (error: any) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
};

// Native Email & Password Login
export const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rowCount === 0) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const user = result.rows[0];
        
        if (!user.password_hash) {
            res.status(400).json({ error: 'Account created using Google Sign-In. Please log in with Google.' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const token = generateToken(user.id, user.email, user.role);
        
        res.status(200).json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
};

// Stateless Google OAuth Verification & Ingestion
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
    const { idToken, targetRole } = req.body; 

    if (!idToken) {
        res.status(400).json({ error: 'Google idToken is required' });
        return;
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.name) {
            res.status(400).json({ error: 'Invalid token payload received from Google' });
            return;
        }

        const { email, name } = payload;

        let userResult = await pool.query('SELECT id, name, email, role FROM users WHERE email = $1', [email]);
        let user = userResult.rows[0];

        if (userResult.rowCount === 0) {
            if (!targetRole) {
                res.status(422).json({ 
                    error: 'New user detected. Please provide a designated role (HR, INTERVIEWER, or CANDIDATE) to register.' 
                });
                return;
            }

            const createUserQuery = `
                INSERT INTO users (name, email, role)
                VALUES ($1, $2, $3)
                RETURNING id, name, email, role;
            `;
            const newUserResult = await pool.query(createUserQuery, [name, email, targetRole]);
            user = newUserResult.rows[0];
        }

        const token = generateToken(user.id, user.email, user.role);

        res.status(200).json({ user, token });
    } catch (error: any) {
        console.error('Google OAuth validation error:', error.message);
        res.status(401).json({ error: 'Authentication failed: Invalid Google Token' });
    }
};