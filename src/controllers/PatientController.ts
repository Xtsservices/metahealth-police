import { Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../middleware/tokenValidation';

export class PatientController {
    // Create new patient
    static async createPatient(req: AuthenticatedRequest, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { 
                name, 
                mobile, 
                aadhar, 
                policeIdNo,
                gender, // New field
                // Appointment data
                appointmentDate,
                appointmentTime,
                purpose,
                notes
            } = req.body;

            // Get hospitalId from authenticated user's token
            const hospitalId = req.user?.hospital_id;

            console.log("ss",hospitalId)

            // Validate required fields
             if (!name || !mobile || !aadhar || !policeIdNo || !gender) {
            res.status(400).json({
                success: false,
                message: 'Required patient fields are: name, mobile, aadhar, policeIdNo, gender'
            });
            return;
        }

        // Validate gender value
        const validGenders = ['male', 'female', 'other'];
        if (!validGenders.includes(gender.toLowerCase())) {
            res.status(400).json({
                success: false,
                message: 'Invalid gender. Must be one of: male, female, other'
            });
            return;
        }

            // Always create appointment - set default values if not provided
            const defaultAppointmentDate = appointmentDate || new Date().toISOString().split('T')[0]; // Today
            const defaultAppointmentTime = appointmentTime || "10:00"; // Default 10:00 AM if not provided
            const defaultPurpose = purpose || 'General Consultation';

            // Validate that hospitalId exists (required for appointment)
            if (!hospitalId) {
                res.status(400).json({
                    success: false,
                    message: 'Hospital ID is required to create patient with appointment'
                });
                return;
            }

            // Validate appointment fields (now mandatory)
            if (true) { // Always validate since appointment is mandatory
                // For hospital admins, hospitalId must be available from token
                if (req.user?.role === 'hospital_admin' && !hospitalId) {
                    res.status(400).json({
                        success: false,
                        message: 'Hospital admin must be associated with a hospital to create appointments'
                    });
                    return;
                }

                // For super admins, they can create appointments for any hospital (but hospitalId should still be from their context)
                if (!hospitalId) {
                    res.status(400).json({
                        success: false,
                        message: 'Hospital ID is required to create appointments'
                    });
                    return;
                }

                // Validate appointment date format (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(defaultAppointmentDate)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid appointment date format. Use YYYY-MM-DD'
                    });
                    return;
                }

                // Validate appointment time format (HH:MM)
                const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
                if (!timeRegex.test(defaultAppointmentTime)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid appointment time format. Use HH:MM (24-hour format)'
                    });
                    return;
                }

                // Validate that appointment date is not in the past (allow today)
                const appointmentDateTime = new Date(defaultAppointmentDate + 'T' + defaultAppointmentTime);
                const now = new Date();
                now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
                
                if (new Date(defaultAppointmentDate) < now) {
                    res.status(400).json({
                        success: false,
                        message: 'Appointment date cannot be in the past'
                    });
                    return;
                }

                // Check if hospital exists and is active
                const hospitalQuery = `SELECT id, name, status FROM hospitals WHERE id = $1`;
                const hospitalResult = await client.query(hospitalQuery, [hospitalId]);
                
                if (hospitalResult.rows.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Hospital not found'
                    });
                    return;
                }

                if (hospitalResult.rows[0].status !== 'active') {
                    res.status(400).json({
                        success: false,
                        message: 'Hospital is not active and cannot accept appointments'
                    });
                    return;
                }
            }

            // Validate mobile format
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(mobile)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid mobile number format. Must be 10 digits starting with 6-9'
                });
                return;
            }

            // Validate Aadhar format (12 digits)
            const aadharRegex = /^\d{12}$/;
            if (!aadharRegex.test(aadhar)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid Aadhar number. Must be 12 digits'
                });
                return;
            }

            // Check for existing patient with same mobile, aadhar, or police ID
            const existingPatientQuery = `
                SELECT mobile, aadhar, police_id_no 
                FROM patients 
                WHERE mobile = $1 OR aadhar = $2 OR police_id_no = $3
            `;

            const existingPatient = await client.query(existingPatientQuery, [mobile, aadhar, policeIdNo]);

            if (existingPatient.rows.length > 0) {
                const existing = existingPatient.rows[0];
                let duplicateField = '';
                if (existing.mobile === mobile) duplicateField = 'mobile number';
                else if (existing.aadhar === aadhar) duplicateField = 'Aadhar number';
                else if (existing.police_id_no === policeIdNo) duplicateField = 'Police ID number';

                res.status(409).json({
                    success: false,
                    message: `Patient with this ${duplicateField} already exists`
                });
                return;
            }

            // Create new patient
            const patientId = uuidv4();
            
            // Start transaction
            await client.query('BEGIN');
            
            const insertPatientQuery = `
            INSERT INTO patients (
                id, name, mobile, aadhar, police_id_no, gender, status, created_date, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, name, mobile, aadhar, police_id_no, gender, status, created_date
        `;

            const patientValues = [
                patientId,
                name.trim(),
                mobile.trim(),
                aadhar.trim(),
                policeIdNo.trim(),
                gender.toLowerCase().trim(),
                'active'
            ];

            const patientResult = await client.query(insertPatientQuery, patientValues);
            const newPatient = patientResult.rows[0];

            // Always create appointment (mandatory)
            const appointmentId = uuidv4();
            
            const insertAppointmentQuery = `
                INSERT INTO appointments (
                    id, patient_id, hospital_id, appointment_date, appointment_time, 
                    status, purpose, notes, created_date, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, patient_id, hospital_id, appointment_date, appointment_time, 
                         status, purpose, notes, created_date
            `;

            const appointmentValues = [
                appointmentId,
                patientId,
                hospitalId,
                defaultAppointmentDate,
                defaultAppointmentTime,
                'scheduled',
                defaultPurpose.trim(),
                notes ? notes.trim() : null
            ];

            const appointmentResult = await client.query(insertAppointmentQuery, appointmentValues);
            const newAppointment = appointmentResult.rows[0];

            // Commit transaction only if both patient and appointment are created successfully
            await client.query('COMMIT');

            const responseData = {
                patient: {
                    id: newPatient.id,
                    name: newPatient.name,
                    mobile: newPatient.mobile,
                    aadhar: newPatient.aadhar,
                    policeIdNo: newPatient.police_id_no,
                                    gender: newPatient.gender,

                    status: newPatient.status,
                    createdDate: newPatient.created_date
                },
                appointment: {
                    id: newAppointment.id,
                    patientId: newAppointment.patient_id,
                    hospitalId: newAppointment.hospital_id,
                    appointmentDate: newAppointment.appointment_date,
                    appointmentTime: newAppointment.appointment_time,
                    status: newAppointment.status,
                    purpose: newAppointment.purpose,
                    notes: newAppointment.notes,
                    createdDate: newAppointment.created_date
                }
            };

            res.status(201).json({
                success: true,
                message: 'Patient and appointment created successfully',
                data: responseData
            });

        } catch (error) {
            // Rollback transaction on error - this will rollback both patient and appointment
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError);
            }
            console.error('Error creating patient and appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while creating patient and appointment. Both operations have been rolled back.'
            });
        } finally {
            client.release();
        }
    }

    // Get all patients with pagination and filtering
    static async getPatients(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { page, limit, status, search } = req.query;
            
            // Parse pagination parameters
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 10;
            
            // Validate pagination parameters
            if (pageNumber < 1) {
                res.status(400).json({
                    success: false,
                    message: 'Page number must be greater than 0'
                });
                return;
            }
            
            if (pageSize < 1 || pageSize > 100) {
                res.status(400).json({
                    success: false,
                    message: 'Limit must be between 1 and 100'
                });
                return;
            }

            const offset = (pageNumber - 1) * pageSize;
            
            // Build query with optional filters
            let query = `
                SELECT 
                    id, name, mobile, aadhar, police_id_no, status, created_date, updated_at, last_login
                FROM patients
            `;
            
            let countQuery = `SELECT COUNT(*) as total FROM patients`;
            
            const queryParams: any[] = [];
            const countParams: any[] = [];
            let whereConditions: string[] = [];
            
            // Add status filter
            if (status && typeof status === 'string') {
                const validStatuses = ['active', 'inactive', 'suspended'];
                if (validStatuses.includes(status.toLowerCase())) {
                    whereConditions.push(`status = $${queryParams.length + 1}`);
                    queryParams.push(status.toLowerCase());
                    countParams.push(status.toLowerCase());
                }
            }
            
            // Add search filter (name, mobile, aadhar, police ID)
            if (search && typeof search === 'string') {
                const searchTerm = `%${search.trim()}%`;
                whereConditions.push(`(
                    name ILIKE $${queryParams.length + 1} OR 
                    mobile ILIKE $${queryParams.length + 1} OR 
                    aadhar ILIKE $${queryParams.length + 1} OR 
                    police_id_no ILIKE $${queryParams.length + 1}
                )`);
                queryParams.push(searchTerm);
                countParams.push(searchTerm);
            }
            
            // Apply WHERE conditions
            if (whereConditions.length > 0) {
                const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
                query += whereClause;
                countQuery += whereClause;
            }
            
            // Add ordering and pagination
            query += `
                ORDER BY created_date DESC
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
            `;
            
            queryParams.push(pageSize, offset);

            // Execute both queries
            const [result, countResult] = await Promise.all([
                client.query(query, queryParams),
                client.query(countQuery, countParams)
            ]);

            const totalRecords = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalRecords / pageSize);

            const patients = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                mobile: row.mobile,
                aadhar: row.aadhar,
                policeIdNo: row.police_id_no,
                status: row.status,
                createdDate: row.created_date,
                updatedAt: row.updated_at,
                lastLogin: row.last_login
            }));

            res.status(200).json({
                success: true,
                message: 'Patients retrieved successfully',
                data: patients,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    recordsPerPage: pageSize,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                },
                count: patients.length,
                filters: {
                    status: status || null,
                    search: search || null
                }
            });

        } catch (error) {
            console.error('Error retrieving patients:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving patients'
            });
        } finally {
            client.release();
        }
    }

    // Get patient by ID
    static async getPatientById(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    id, name, mobile, aadhar, police_id_no, status, created_date, updated_at, last_login
                FROM patients 
                WHERE id = $1
            `;

            const result = await client.query(query, [id]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Patient not found'
                });
                return;
            }

            const patient = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Patient retrieved successfully',
                data: {
                    id: patient.id,
                    name: patient.name,
                    mobile: patient.mobile,
                    aadhar: patient.aadhar,
                    policeIdNo: patient.police_id_no,
                    status: patient.status,
                    createdDate: patient.created_date,
                    updatedAt: patient.updated_at,
                    lastLogin: patient.last_login
                }
            });

        } catch (error) {
            console.error('Error retrieving patient:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving patient'
            });
        } finally {
            client.release();
        }
    }

    // Update patient
    static async updatePatient(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;
            const { name, mobile, aadhar, policeIdNo, status } = req.body;

            // Check if patient exists
            const existingPatientQuery = `SELECT id FROM patients WHERE id = $1`;
            const existingPatient = await client.query(existingPatientQuery, [id]);

            if (existingPatient.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Patient not found'
                });
                return;
            }

            // Build update fields
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCount = 1;

            if (name !== undefined) {
                updateFields.push(`name = $${paramCount++}`);
                updateValues.push(name.trim());
            }

            if (mobile !== undefined) {
                // Validate mobile format
                const mobileRegex = /^[6-9]\d{9}$/;
                if (!mobileRegex.test(mobile)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid mobile number format'
                    });
                    return;
                }

                // Check if mobile is already in use by another patient
                const mobileCheckQuery = `SELECT id FROM patients WHERE mobile = $1 AND id != $2`;
                const mobileCheck = await client.query(mobileCheckQuery, [mobile, id]);
                
                if (mobileCheck.rows.length > 0) {
                    res.status(409).json({
                        success: false,
                        message: 'Mobile number already in use by another patient'
                    });
                    return;
                }

                updateFields.push(`mobile = $${paramCount++}`);
                updateValues.push(mobile.trim());
            }

            if (aadhar !== undefined) {
                // Validate Aadhar format
                const aadharRegex = /^\d{12}$/;
                if (!aadharRegex.test(aadhar)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid Aadhar number. Must be 12 digits'
                    });
                    return;
                }

                // Check if Aadhar is already in use by another patient
                const aadharCheckQuery = `SELECT id FROM patients WHERE aadhar = $1 AND id != $2`;
                const aadharCheck = await client.query(aadharCheckQuery, [aadhar, id]);
                
                if (aadharCheck.rows.length > 0) {
                    res.status(409).json({
                        success: false,
                        message: 'Aadhar number already in use by another patient'
                    });
                    return;
                }

                updateFields.push(`aadhar = $${paramCount++}`);
                updateValues.push(aadhar.trim());
            }

            if (policeIdNo !== undefined) {
                // Check if Police ID is already in use by another patient
                const policeIdCheckQuery = `SELECT id FROM patients WHERE police_id_no = $1 AND id != $2`;
                const policeIdCheck = await client.query(policeIdCheckQuery, [policeIdNo, id]);
                
                if (policeIdCheck.rows.length > 0) {
                    res.status(409).json({
                        success: false,
                        message: 'Police ID number already in use by another patient'
                    });
                    return;
                }

                updateFields.push(`police_id_no = $${paramCount++}`);
                updateValues.push(policeIdNo.trim());
            }

            if (status !== undefined) {
                const validStatuses = ['active', 'inactive', 'suspended'];
                if (!validStatuses.includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid status. Must be one of: active, inactive, suspended'
                    });
                    return;
                }

                updateFields.push(`status = $${paramCount++}`);
                updateValues.push(status);
            }

            if (updateFields.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No valid fields to update'
                });
                return;
            }

            // Add updated_at field
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(id);

            const updateQuery = `
                UPDATE patients 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING id, name, mobile, aadhar, police_id_no, status, updated_at
            `;

            const result = await client.query(updateQuery, updateValues);
            const updatedPatient = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Patient updated successfully',
                data: {
                    id: updatedPatient.id,
                    name: updatedPatient.name,
                    mobile: updatedPatient.mobile,
                    aadhar: updatedPatient.aadhar,
                    policeIdNo: updatedPatient.police_id_no,
                    status: updatedPatient.status,
                    updatedAt: updatedPatient.updated_at
                }
            });

        } catch (error) {
            console.error('Error updating patient:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while updating patient'
            });
        } finally {
            client.release();
        }
    }

    // Delete patient (soft delete by setting status to inactive)
    static async deletePatient(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;

            // Check if patient exists
            const existingPatientQuery = `
                SELECT id, name, status 
                FROM patients 
                WHERE id = $1
            `;
            const existingPatient = await client.query(existingPatientQuery, [id]);

            if (existingPatient.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Patient not found'
                });
                return;
            }

            // Soft delete by setting status to inactive
            const updateQuery = `
                UPDATE patients 
                SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, name, status, updated_at
            `;

            const result = await client.query(updateQuery, [id]);
            const updatedPatient = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Patient deactivated successfully',
                data: {
                    id: updatedPatient.id,
                    name: updatedPatient.name,
                    status: updatedPatient.status,
                    updatedAt: updatedPatient.updated_at
                }
            });

        } catch (error) {
            console.error('Error deleting patient:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while deleting patient'
            });
        } finally {
            client.release();
        }
    }
}
