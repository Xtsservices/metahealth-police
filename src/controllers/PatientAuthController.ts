import { Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class PatientAuthController {
   static async myProfile(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization header with token required'
                });
                return;
            }
            const token = authHeader;

            // Validate session and get patient info
            const sessionQuery = `
                SELECT 
                    s.patient_id,
                    s.expires_at,
                    p.id,
                    p.name,
                    p.mobile,
                    p.status,
                    p.gender,
                    p.date_of_birth,
                    p.police_id_no,
                    p.created_date,
                    p.registration_date
                FROM patient_sessions s
                JOIN patients p ON s.patient_id = p.id
                WHERE s.token_hash = $1 
                  AND s.expires_at > CURRENT_TIMESTAMP
                  AND p.status = 'active'
            `;
            const result = await client.query(sessionQuery, [token]);
            if (result.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session token'
                });
                return;
            }
            const patient = result.rows[0];
            res.status(200).json({
                success: true,
                message: 'Patient profile fetched successfully',
                data: {
                    id: patient.id,
                    name: patient.name,
                    mobile: patient.mobile,
                    status: patient.status,
                    gender: patient.gender,
                    dateOfBirth: patient.date_of_birth,
                    policeIdNo: patient.police_id_no,
                    createdDate: patient.created_date,
                    registrationDate: patient.registration_date
                }
            });
        } catch (error) {
            console.error('Error fetching patient profile:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching profile'
            });
        } finally {
            client.release();
        }
    }
    // Generate OTP for patient mobile login
    static async generatePatientOTP(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { mobile } = req.body;

            // Validate mobile number
            if (!mobile || typeof mobile !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Mobile number is required'
                });
                return;
            }

            // Validate mobile format
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(mobile.trim())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid mobile number format. Must be 10 digits starting with 6-9'
                });
                return;
            }

            const cleanMobile = mobile.trim();

            // Check if patient exists with this mobile number
            const patientQuery = `
                SELECT id, name, mobile, status
                FROM patients 
                WHERE mobile = $1
            `;

            const patientResult = await client.query(patientQuery, [cleanMobile]);

            if (patientResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'No patient found with this mobile number'
                });
                return;
            }

            const patient = patientResult.rows[0];

            if (patient.status !== 'active') {
                res.status(403).json({
                    success: false,
                    message: 'Patient account is not active'
                });
                return;
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

            // Delete any existing OTPs for this patient
            await client.query('DELETE FROM patient_otp WHERE mobile = $1', [cleanMobile]);

            // Insert new OTP
            const insertOTPQuery = `
                INSERT INTO patient_otp (mobile, otp, expires_at, created_at) 
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `;

            await client.query(insertOTPQuery, [cleanMobile, otp, expiresAt]);

            // In production, send OTP via SMS service
            // For development, return OTP in response
            const responseData: any = {
                phone: cleanMobile,
                expiresAt: expiresAt.toISOString(),
                message: 'OTP sent successfully to your mobile number'
            };

            // Include OTP in development mode
            if (process.env.NODE_ENV !== 'production') {
                responseData.otp = otp;
                responseData.message += ` (Development: ${otp})`;
            }

            res.status(200).json({
                success: true,
                message: 'OTP generated successfully',
                data: responseData
            });

        } catch (error) {
            console.error('Error generating patient OTP:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while generating OTP'
            });
        } finally {
            client.release();
        }
    }

    // Verify OTP and login patient
    static async verifyPatientOTPAndLogin(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { mobile, otp } = req.body;

            // Validate input
            if (!mobile || !otp) {
                res.status(400).json({
                    success: false,
                    message: 'Mobile number and OTP are required'
                });
                return;
            }

            const cleanMobile = mobile.trim();
            const cleanOTP = otp.trim();

            // Verify OTP
            const otpQuery = `
                SELECT mobile, otp, expires_at 
                FROM patient_otp 
                WHERE mobile = $1 AND otp = $2 AND expires_at > CURRENT_TIMESTAMP
            `;

            const otpResult = await client.query(otpQuery, [cleanMobile, cleanOTP]);

            if (otpResult.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired OTP'
                });
                return;
            }

            // Get patient details
            const patientQuery = `
                SELECT id, name, mobile, status
                FROM patients 
                WHERE mobile = $1 AND status = 'active'
            `;

            const patientResult = await client.query(patientQuery, [cleanMobile]);

            if (patientResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Patient not found or not active'
                });
                return;
            }

            const patient = patientResult.rows[0];

            // Generate session token
            const sessionToken = uuidv4();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

            // Delete any existing sessions for this patient
           // Delete any existing sessions for this patient
await client.query('DELETE FROM patient_sessions WHERE patient_id = $1', [patient.id]);

// Create new session (reusing the sessions table with patient_id)
const insertSessionQuery = `
    INSERT INTO patient_sessions (id, patient_id, token_hash, expires_at, created_at) 
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
`;

await client.query(insertSessionQuery, [uuidv4(), patient.id, sessionToken, expiresAt]);
            // Update patient's last login
         

            // Delete used OTP
            await client.query('DELETE FROM patient_otp WHERE mobile = $1', [cleanMobile]);

            res.status(200).json({
                success: true,
                message: 'Patient login successful',
                data: {
                    patient: {
                        id: patient.id,
                        name: patient.name,
                        mobile: patient.mobile,
                        status: patient.status
                    },
                    session: {
                        token: sessionToken,
                        expiresAt: expiresAt.toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('Error verifying patient OTP:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during login'
            });
        } finally {
            client.release();
        }
    }

    // Logout patient
    static async logoutPatient(req: Request, res: Response): Promise<void> {
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
                RETURNING user_id
            `;

            const result = await client.query(deleteSessionQuery, [token.trim()]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Session not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Patient logged out successfully'
            });

        } catch (error) {
            console.error('Error logging out patient:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during logout'
            });
        } finally {
            client.release();
        }
    }

    // Validate patient session
    static async validatePatientSession(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization header with Bearer token required'
                });
                return;
            }

            const token = authHeader.substring(7);

            // Validate session
            const sessionQuery = `
                SELECT 
                    s.user_id,
                    s.expires_at,
                    p.id,
                    p.name,
                    p.mobile,
                    p.status
                FROM sessions s
                JOIN patients p ON s.user_id = p.id
                WHERE s.token = $1 
                  AND s.expires_at > CURRENT_TIMESTAMP
                  AND p.status = 'active'
            `;

            const result = await client.query(sessionQuery, [token]);

            if (result.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session token'
                });
                return;
            }

            const sessionData = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Valid session',
                data: {
                    patient: {
                        id: sessionData.id,
                        name: sessionData.name,
                        mobile: sessionData.mobile,
                        status: sessionData.status
                    },
                    session: {
                        expiresAt: sessionData.expires_at
                    }
                }
            });

        } catch (error) {
            console.error('Error validating patient session:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while validating session'
            });
        } finally {
            client.release();
        }
    }

    // Check if patient mobile exists
    static async checkPatientMobile(req: Request, res: Response): Promise<void> {
        try {
            const { mobile } = req.body;

            // Validate mobile number
            if (!mobile || typeof mobile !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Mobile number is required'
                });
                return;
            }

            // Validate mobile format
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(mobile.trim())) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid mobile number format'
                });
                return;
            }

            const cleanMobile = mobile.trim();
            const client = await pool.connect();

            try {
                const query = `
                    SELECT id, name, mobile, status, created_date
                    FROM patients 
                    WHERE mobile = $1
                `;

                const result = await client.query(query, [cleanMobile]);

                if (result.rows.length > 0) {
                    const patient = result.rows[0];
                    res.json({
                        success: true,
                        exists: true,
                        message: 'Mobile number found in system',
                        patient: {
                            id: patient.id,
                            name: patient.name,
                            mobile: patient.mobile,
                            status: patient.status,
                            createdDate: patient.created_date
                        }
                    });
                } else {
                    res.json({
                        success: true,
                        exists: false,
                        message: 'Mobile number not found in system',
                        patient: null
                    });
                }
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('Error checking patient mobile:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while checking mobile'
            });
        }
    }

    // Get patient appointments
    static async myAppointments(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization header with token required'
                });
                return;
            }
            const token = authHeader;

            // Validate session and get patient info
            const sessionQuery = `
                SELECT 
                    s.patient_id,
                    s.expires_at
                FROM patient_sessions s
                WHERE s.token_hash = $1 
                  AND s.expires_at > CURRENT_TIMESTAMP
            `;
            const sessionResult = await client.query(sessionQuery, [token]);
            if (sessionResult.rows.length === 0) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session token'
                });
                return;
            }

            const patientId = sessionResult.rows[0].patient_id;

            // Get appointments for the patient
            const appointmentsQuery = `
                SELECT 
                    a.id,
                    a.appointment_date,
                    a.appointment_time,
                    a.status,
                    a.notes,
                    a.created_date,
                    h.name as hospital_name
                FROM appointments a
                LEFT JOIN hospitals h ON a.hospital_id = h.id
                WHERE a.patient_id = $1
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
            `;
            
            const appointmentsResult = await client.query(appointmentsQuery, [patientId]);

            const appointments = appointmentsResult.rows.map(appointment => ({
                id: appointment.id,
                appointmentDate: appointment.appointment_date,
                appointmentTime: appointment.appointment_time,
                status: appointment.status,
                notes: appointment.notes,
                createdAt: appointment.created_at,
                doctor: {
                    name: appointment.doctor_name,
                    specialization: appointment.specialization
                },
                hospital: {
                    name: appointment.hospital_name,
                    address: appointment.hospital_address
                }
            }));

            res.status(200).json({
                success: true,
                message: 'Appointments fetched successfully',
                data: {
                    appointments: appointments,
                    total: appointments.length
                }
            });

        } catch (error) {
            console.error('Error fetching patient appointments:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while fetching appointments'
            });
        } finally {
            client.release();
        }
    }
}
