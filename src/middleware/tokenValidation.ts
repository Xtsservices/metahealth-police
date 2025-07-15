import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

// Extended Request interface to include user info
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        name: string;
        phone: string;
        email: string;
        role: string;
        status: string;
        hospital_id?: string;
    };
}

// Middleware to validate session token for protected routes
export const validateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get token from Authorization header or query parameter
        let token = req.headers.authorization;
        console.log('Token from headers:', token);
        
        if (!token && req.query.token) {
            token = req.query.token as string;
        }

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Access token is required. Provide token in Authorization header or as query parameter.',
                error: 'MISSING_TOKEN'
            });
            return;
        }

        // Remove "Bearer " prefix if present
        if (token.startsWith('Bearer ')) {
            token = token.substring(7);
        }

        // Basic UUID validation for session token
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(token.trim())) {
            res.status(401).json({
                success: false,
                message: 'Invalid token format',
                error: 'INVALID_TOKEN_FORMAT'
            });
            return;
        }

        const cleanToken = token.trim();

        // Validate session in database
        const client = await pool.connect();
        
        try {
            const sessionQuery = `
                SELECT 
                    s.id as session_id,
                    s.user_id,
                    s.expires_at,
                    u.id,
                    u.name,
                    u.phone,
                    u.email,
                    u.role,
                    u.status,
                    u.hospital_id
                FROM admin_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token_hash = $1 
                  AND s.expires_at > CURRENT_TIMESTAMP
            `;

            const result = await client.query(sessionQuery, [cleanToken]);

            if (result.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session token',
                    error: 'INVALID_SESSION'
                });
                return;
            }

            const sessionData = result.rows[0];

            // Check if user is active
            if (sessionData.status !== 'active') {
                res.status(403).json({
                    success: false,
                    message: 'User account is not active',
                    error: 'INACTIVE_USER'
                });
                return;
            }

            // Add user info to request object
            req.user = {
                id: sessionData.id,
                name: sessionData.name,
                phone: sessionData.phone,
                email: sessionData.email,
                role: sessionData.role,
                status: sessionData.status,
                hospital_id: sessionData.hospital_id
            };

            next();

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during token validation',
            error: 'SERVER_ERROR'
        });
    }
};

// Middleware to check if user has super admin role
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'NOT_AUTHENTICATED'
        });
        return;
    }

    if (req.user.role !== 'super_admin') {
        res.status(403).json({
            success: false,
            message: 'Super admin access required',
            error: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }

    next();
};

// Middleware to check if user has admin role (super_admin or hospital_admin)
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'NOT_AUTHENTICATED'
        });
        return;
    }

    const adminRoles = ['super_admin', 'hospital_admin'];
    if (!adminRoles.includes(req.user.role)) {
        res.status(403).json({
            success: false,
            message: 'Admin access required',
            error: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
    }

    next();
};
