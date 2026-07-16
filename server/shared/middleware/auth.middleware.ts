import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

interface UserPayload {
    userId: number;
    email: string;
    role: 'HR' | 'INTERVIEWER' | 'CANDIDATE';
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    let token = req.cookies?.token;
    
    // Fallback for Authorization header (optional, but good for non-browser clients)
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ error: 'Access denied: No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        console.error('JWT Verification failed:', error);
        res.status(403).json({ error: 'Access denied: Invalid or expired token' });
    }
};

// role authorization
export const requireRole = (...roles: ('HR' | 'INTERVIEWER' | 'CANDIDATE')[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ 
                error: `Forbidden: This action requires one of the following roles: [${roles.join(', ')}]` 
            });
            return;
        }

        next();
    };
};