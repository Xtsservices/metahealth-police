import { Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class AuthController {
    // Generate OTP for mobile login
    static async generateOTP(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { phone } = req.body;

            // Validate phone number
            if (!phone || typeof phone !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Phone number is required'
                });
                return;
            }

            // Basic phone number validation (adjust regex as needed)
            const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
            if (!phoneRegex.test(phone.trim())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
                return;
            }

            const cleanPhone = phone.trim();

            // Check if user exists with this phone number
            const userQuery = `
                SELECT id, name, phone, email, role, status, hospital_id
                FROM users 
                WHERE phone = $1
            `;

            const userResult = await client.query(userQuery, [cleanPhone]);

            if (userResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'No user found with this phone number'
                });
                return;
            }

            const user = userResult.rows[0];

            // Check if user is active
            if (user.status !== 'active') {
                res.status(403).json({
                    success: false,
                    message: `Account is ${user.status}. Please contact administrator.`
                });
                return;
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
            const otpId = uuidv4();

            // Store OTP in database (create otps table)
            const insertOtpQuery = `
                INSERT INTO otps (id, user_id, phone, otp, expires_at, is_used, created_at)
                VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    otp = $4, 
                    expires_at = $5, 
                    is_used = false, 
                    created_at = CURRENT_TIMESTAMP
            `;

            await client.query(insertOtpQuery, [otpId, user.id, cleanPhone, otp, otpExpiry]);

            // TODO: Send OTP via SMS (integrate with SMS service)
            // For now, we'll return the OTP in response (remove in production)
            console.log(`OTP for ${cleanPhone}: ${otp}`);

            res.status(200).json({
                success: true,
                message: 'OTP sent successfully to your mobile number',
                data: {
                    phone: cleanPhone,
                    otpExpiry: otpExpiry,
                    // TODO: Remove this in production - only for testing
                    otp: process.env.NODE_ENV === 'development' ? otp : undefined
                }
            });

        } catch (error) {
            console.error('Error generating OTP:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while generating OTP'
            });
        } finally {
            client.release();
        }
    }

    // Verify OTP and login
    static async verifyOTPAndLogin(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { phone, otp } = req.body;

            // Validate input
            if (!phone || !otp) {
                res.status(400).json({
                    success: false,
                    message: 'Phone number and OTP are required'
                });
                return;
            }

            const cleanPhone = phone.trim();
            const cleanOtp = otp.trim();

            // Verify OTP
            const otpQuery = `
                SELECT o.*, u.id as user_id, u.name, u.email, u.role, u.status, u.hospital_id
                FROM otps o
                JOIN users u ON o.user_id = u.id
                WHERE o.phone = $1 AND o.otp = $2 AND o.is_used = false AND o.expires_at > CURRENT_TIMESTAMP
                ORDER BY o.created_at DESC
                LIMIT 1
            `;

            const otpResult = await client.query(otpQuery, [cleanPhone, cleanOtp]);

            if (otpResult.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired OTP'
                });
                return;
            }

            const otpRecord = otpResult.rows[0];

            // Check if user is still active
            if (otpRecord.status !== 'active') {
                res.status(403).json({
                    success: false,
                    message: `Account is ${otpRecord.status}. Please contact administrator.`
                });
                return;
            }

            // Mark OTP as used
            const markOtpUsedQuery = `
                UPDATE otps 
                SET is_used = true, used_at = CURRENT_TIMESTAMP 
                WHERE user_id = $1 AND phone = $2
            `;

            await client.query(markOtpUsedQuery, [otpRecord.user_id, cleanPhone]);

            // Get hospital details if user belongs to a hospital
            let hospitalInfo = null;
            if (otpRecord.hospital_id) {
                const hospitalQuery = `
                    SELECT id, name, license_number, status
                    FROM hospitals 
                    WHERE id = $1
                `;
                const hospitalResult = await client.query(hospitalQuery, [otpRecord.hospital_id]);
                if (hospitalResult.rows.length > 0) {
                    hospitalInfo = hospitalResult.rows[0];
                }
            }

            // Generate session token (simple UUID for now - use JWT in production)
            const sessionToken = uuidv4();
            const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // Store session (create sessions table)
            const createSessionQuery = `
                INSERT INTO sessions (id, user_id, token, expires_at, created_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    token = $3, 
                    expires_at = $4, 
                    created_at = CURRENT_TIMESTAMP
            `;

            await client.query(createSessionQuery, [uuidv4(), otpRecord.user_id, sessionToken, sessionExpiry]);

            // Update user's last login
            const updateLastLoginQuery = `
                UPDATE users 
                SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $1
            `;

            await client.query(updateLastLoginQuery, [otpRecord.user_id]);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: otpRecord.user_id,
                        name: otpRecord.name,
                        phone: otpRecord.phone,
                        email: otpRecord.email,
                        role: otpRecord.role,
                        status: otpRecord.status
                    },
                    hospital: hospitalInfo,
                    session: {
                        token: sessionToken,
                        expiresAt: sessionExpiry
                    }
                }
            });

        } catch (error) {
            console.error('Error verifying OTP:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while verifying OTP'
            });
        } finally {
            client.release();
        }
    }

    // Logout user
    static async logout(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { token } = req.body;

            if (!token) {
                res.status(400).json({
                    success: false,
                    message: 'Session token is required'
                });
                return;
            }

            // Delete session
            const deleteSessionQuery = `
                DELETE FROM sessions 
                WHERE token = $1
            `;

            const result = await client.query(deleteSessionQuery, [token]);

            if (result.rowCount === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Logout successful'
            });

        } catch (error) {
            console.error('Error during logout:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during logout'
            });
        } finally {
            client.release();
        }
    }

    // Validate session (middleware helper)
    static async validateSession(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { token } = req.query;

            if (!token) {
                res.status(400).json({
                    success: false,
                    message: 'Session token is required'
                });
                return;
            }

            // Check session validity
            const sessionQuery = `
                SELECT s.*, u.id as user_id, u.name, u.email, u.role, u.status, u.hospital_id
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP
            `;

            const sessionResult = await client.query(sessionQuery, [token]);

            if (sessionResult.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session'
                });
                return;
            }

            const session = sessionResult.rows[0];

            res.status(200).json({
                success: true,
                message: 'Session is valid',
                data: {
                    user: {
                        id: session.user_id,
                        name: session.name,
                        email: session.email,
                        role: session.role,
                        status: session.status,
                        hospitalId: session.hospital_id
                    },
                    session: {
                        token: session.token,
                        expiresAt: session.expires_at
                    }
                }
            });

        } catch (error) {
            console.error('Error validating session:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while validating session'
            });
        } finally {
            client.release();
        }
    }
}
