
import { Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { DefaultUserService } from '../services/DefaultUserService';

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

            // Store OTP in database - first delete any existing OTP for this phone, then insert new one
            const deleteOldOtpQuery = `
                DELETE FROM admin_otp WHERE phone = $1
            `;
            
            await client.query(deleteOldOtpQuery, [cleanPhone]);
            
            const insertOtpQuery = `
                INSERT INTO admin_otp (id, phone, otp, purpose, expires_at, is_used, created_at)
                VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)
            `;

            await client.query(insertOtpQuery, [otpId, cleanPhone, otp, 'login', otpExpiry]);

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
                FROM admin_otp o
                JOIN users u ON o.phone = u.phone
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
                UPDATE admin_otp 
                SET is_used = true, used_at = CURRENT_TIMESTAMP 
                WHERE phone = $1 AND otp = $2
            `;

            await client.query(markOtpUsedQuery, [cleanPhone, cleanOtp]);

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

            // Store session - first delete any existing session for this user, then insert new one
            const deleteOldSessionQuery = `
                DELETE FROM admin_sessions WHERE user_id = $1
            `;
            
            await client.query(deleteOldSessionQuery, [otpRecord.user_id]);
            
            const createSessionQuery = `
                INSERT INTO admin_sessions (id, user_id, token_hash, expires_at, created_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            `;

            await client.query(createSessionQuery, [uuidv4(), otpRecord.user_id, sessionToken, sessionExpiry]);

            // Update user's last activity
            const updateLastLoginQuery = `
                UPDATE users 
                SET updated_at = CURRENT_TIMESTAMP 
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



        // Get current user's profile based on session token
    static async myProfile(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();

         const reqAny = req as any;
        try {
            // Accept token from query, header, or body
            const token = req.headers['authorization'];
           
            if (!token) {
                res.status(400).json({ success: false, message: 'Session token is required' });
                return;
            }

            // Get session info
            const sessionQuery = `SELECT user_id FROM admin_sessions WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP`;
            const sessionResult = await client.query(sessionQuery, [token]);
            if (sessionResult.rows.length === 0) {
                res.status(401).json({ success: false, message: 'Invalid or expired session' });
                return;
            }
            const userId = sessionResult.rows[0].user_id;

            // Get user info directly from users table
            const userQuery = `SELECT id, name, phone, email, role, status, hospital_id FROM users WHERE id = $1`;
            const userResult = await client.query(userQuery, [userId]);
            if (userResult.rows.length === 0) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            const user = userResult.rows[0];

            // Get hospital info if available
            let hospitalInfo = null;
            if (user.hospital_id) {
                const hospitalQuery = `SELECT id, name, license_number, status FROM hospitals WHERE id = $1`;
                const hospitalResult = await client.query(hospitalQuery, [user.hospital_id]);
                if (hospitalResult.rows.length > 0) {
                    hospitalInfo = hospitalResult.rows[0];
                }
            }

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        phone: user.phone,
                        email: user.email,
                        role: user.role,
                        status: user.status,
                        hospitalId: user.hospital_id
                    },
                    hospital: hospitalInfo
                }
            });
        } catch (error) {
            console.error('Error retrieving profile:', error);
            res.status(500).json({ success: false, message: 'Internal server error while retrieving profile' });
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
                DELETE FROM admin_sessions 
                WHERE token_hash = $1
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
                FROM admin_sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
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
                        token: session.token_hash,
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

    // Check if phone number exists in the system
    static async checkPhone(req: Request, res: Response): Promise<void> {
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

            // Basic phone number validation
            const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
            if (!phoneRegex.test(phone.trim())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
                return;
            }

            const cleanPhone = phone.trim();

            // Check if phone exists using DefaultUserService
            const userInfo = await DefaultUserService.checkPhoneExists(cleanPhone);

            if (userInfo) {
                res.json({
                    success: true,
                    exists: true,
                    message: 'Phone number found in system',
                    user: {
                        id: userInfo.id,
                        name: userInfo.name,
                        phone: userInfo.phone,
                        email: userInfo.email,
                        role: userInfo.role,
                        status: userInfo.status,
                        hospital_id: userInfo.hospital_id,
                        hospital_name: userInfo.hospital_name,
                        hospital_status: userInfo.hospital_status
                    }
                });
            } else {
                res.json({
                    success: true,
                    exists: false,
                    message: 'Phone number not found in system',
                    user: null
                });
            }

        } catch (error) {
            console.error('Error checking phone existence:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while checking phone'
            });
        }
    }
}
