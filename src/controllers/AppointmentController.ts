import { Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class AppointmentController {
    // Create new appointment
    static async createAppointment(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { patientId, hospitalId, appointmentDate, appointmentTime, purpose, notes } = req.body;

            // Validate required fields
            if (!patientId || !hospitalId || !appointmentDate || !appointmentTime || !purpose) {
                res.status(400).json({
                    success: false,
                    message: 'Required fields: patientId, hospitalId, appointmentDate, appointmentTime, purpose'
                });
                return;
            }

            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(appointmentDate)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
                return;
            }

            // Validate time format (HH:MM)
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(appointmentTime)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid time format. Use HH:MM (24-hour format)'
                });
                return;
            }

            // Validate that appointment date is not in the past
            const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
            const now = new Date();
            if (appointmentDateTime < now) {
                res.status(400).json({
                    success: false,
                    message: 'Appointment date and time cannot be in the past'
                });
                return;
            }

            // Check if patient exists and is active
            const patientQuery = `
                SELECT id, name, status 
                FROM patients 
                WHERE id = $1
            `;
            const patientResult = await client.query(patientQuery, [patientId]);

            if (patientResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Patient not found'
                });
                return;
            }

            if (patientResult.rows[0].status !== 'active') {
                res.status(400).json({
                    success: false,
                    message: 'Patient is not active'
                });
                return;
            }

            // Check if hospital exists and is active
            const hospitalQuery = `
                SELECT id, name, status 
                FROM hospitals 
                WHERE id = $1
            `;
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
                    message: 'Hospital is not active'
                });
                return;
            }

            // Check for existing appointment at the same time for the same patient
            const conflictQuery = `
                SELECT id 
                FROM appointments 
                WHERE patient_id = $1 AND appointment_date = $2 AND appointment_time = $3
                AND status NOT IN ('cancelled', 'completed')
            `;
            const conflictResult = await client.query(conflictQuery, [patientId, appointmentDate, appointmentTime]);

            if (conflictResult.rows.length > 0) {
                res.status(409).json({
                    success: false,
                    message: 'Patient already has an appointment at this date and time'
                });
                return;
            }

            // Create new appointment
            const appointmentId = uuidv4();
            const insertQuery = `
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
                appointmentDate,
                appointmentTime,
                'scheduled',
                purpose.trim(),
                notes ? notes.trim() : null
            ];

            const result = await client.query(insertQuery, appointmentValues);
            const newAppointment = result.rows[0];

            res.status(201).json({
                success: true,
                message: 'Appointment created successfully',
                data: {
                    id: newAppointment.id,
                    patientId: newAppointment.patient_id,
                    hospitalId: newAppointment.hospital_id,
                    appointmentDate: newAppointment.appointment_date,
                    appointmentTime: newAppointment.appointment_time,
                    status: newAppointment.status,
                    purpose: newAppointment.purpose,
                    notes: newAppointment.notes,
                    createdDate: newAppointment.created_date,
                    patientName: patientResult.rows[0].name,
                    hospitalName: hospitalResult.rows[0].name
                }
            });

        } catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while creating appointment'
            });
        } finally {
            client.release();
        }
    }

    // Get appointments with filters and pagination
    static async getAppointments(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { patientId, hospitalId, status, dateFrom, dateTo, page, limit } = req.query;
            
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
            
            // Build query with joins to get patient and hospital details
            let query = `
                SELECT 
                    a.id, a.patient_id, a.hospital_id, a.appointment_date, a.appointment_time,
                    a.status, a.purpose, a.notes, a.created_date, a.updated_at,
                    p.name as patient_name, p.mobile as patient_mobile,
                    h.name as hospital_name, h.contact_phone as hospital_phone
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
            `;
            
            let countQuery = `
                SELECT COUNT(*) as total
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
            `;
            
            const queryParams: any[] = [];
            const countParams: any[] = [];
            let whereConditions: string[] = [];
            
            // Add filters
            if (patientId && typeof patientId === 'string') {
                whereConditions.push(`a.patient_id = $${queryParams.length + 1}`);
                queryParams.push(patientId);
                countParams.push(patientId);
            }
            
            if (hospitalId && typeof hospitalId === 'string') {
                whereConditions.push(`a.hospital_id = $${queryParams.length + 1}`);
                queryParams.push(hospitalId);
                countParams.push(hospitalId);
            }
            
            if (status && typeof status === 'string') {
                const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
                if (validStatuses.includes(status.toLowerCase())) {
                    whereConditions.push(`a.status = $${queryParams.length + 1}`);
                    queryParams.push(status.toLowerCase());
                    countParams.push(status.toLowerCase());
                }
            }
            
            if (dateFrom && typeof dateFrom === 'string') {
                whereConditions.push(`a.appointment_date >= $${queryParams.length + 1}`);
                queryParams.push(dateFrom);
                countParams.push(dateFrom);
            }
            
            if (dateTo && typeof dateTo === 'string') {
                whereConditions.push(`a.appointment_date <= $${queryParams.length + 1}`);
                queryParams.push(dateTo);
                countParams.push(dateTo);
            }
            
            // Apply WHERE conditions
            if (whereConditions.length > 0) {
                const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
                query += whereClause;
                countQuery += whereClause;
            }
            
            // Add ordering and pagination
            query += `
                ORDER BY a.appointment_date DESC, a.appointment_time DESC
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

            const appointments = result.rows.map(row => ({
                id: row.id,
                patientId: row.patient_id,
                hospitalId: row.hospital_id,
                appointmentDate: row.appointment_date,
                appointmentTime: row.appointment_time,
                status: row.status,
                purpose: row.purpose,
                notes: row.notes,
                createdDate: row.created_date,
                updatedAt: row.updated_at,
                patientName: row.patient_name,
                patientMobile: row.patient_mobile,
                hospitalName: row.hospital_name,
                hospitalPhone: row.hospital_phone
            }));

            res.status(200).json({
                success: true,
                message: 'Appointments retrieved successfully',
                data: appointments,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    recordsPerPage: pageSize,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                },
                count: appointments.length,
                filters: {
                    patientId: patientId || null,
                    hospitalId: hospitalId || null,
                    status: status || null,
                    dateFrom: dateFrom || null,
                    dateTo: dateTo || null
                }
            });

        } catch (error) {
            console.error('Error retrieving appointments:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving appointments'
            });
        } finally {
            client.release();
        }
    }

    // Get appointment by ID
    static async getAppointmentById(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    a.id, a.patient_id, a.hospital_id, a.appointment_date, a.appointment_time,
                    a.status, a.purpose, a.notes, a.created_date, a.updated_at,
                    p.name as patient_name, p.mobile as patient_mobile, p.aadhar as patient_aadhar,
                    h.name as hospital_name, h.contact_phone as hospital_phone, h.contact_email as hospital_email,
                    COUNT(ad.id) as document_count
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
                LEFT JOIN appointment_documents ad ON a.id = ad.appointment_id
                WHERE a.id = $1
                GROUP BY a.id, a.patient_id, a.hospital_id, a.appointment_date, a.appointment_time,
                         a.status, a.purpose, a.notes, a.created_date, a.updated_at,
                         p.name, p.mobile, p.aadhar, h.name, h.contact_phone, h.contact_email
            `;

            const result = await client.query(query, [id]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
                return;
            }

            const appointment = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Appointment retrieved successfully',
                data: {
                    id: appointment.id,
                    patientId: appointment.patient_id,
                    hospitalId: appointment.hospital_id,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    status: appointment.status,
                    purpose: appointment.purpose,
                    notes: appointment.notes,
                    createdDate: appointment.created_date,
                    updatedAt: appointment.updated_at,
                    documentCount: parseInt(appointment.document_count) || 0,
                    patient: {
                        id: appointment.patient_id,
                        name: appointment.patient_name,
                        mobile: appointment.patient_mobile,
                        aadhar: appointment.patient_aadhar
                    },
                    hospital: {
                        id: appointment.hospital_id,
                        name: appointment.hospital_name,
                        phone: appointment.hospital_phone,
                        email: appointment.hospital_email
                    }
                }
            });

        } catch (error) {
            console.error('Error retrieving appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving appointment'
            });
        } finally {
            client.release();
        }
    }

    // Update appointment
    static async updateAppointment(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const {  status,id } = req.body;

            // Check if appointment exists
            const existingQuery = `SELECT id, status FROM appointments WHERE id = $1`;
            const existingResult = await client.query(existingQuery, [id]);

            if (existingResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
                return;
            }

            // Build update fields
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCount = 1;

        

            if (status !== undefined) {
                const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
                if (!validStatuses.includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid status. Must be one of: scheduled, confirmed, completed, cancelled, no_show'
                    });
                    return;
                }

                // If setting status to completed, check for required documents
                if (status === 'completed') {
                    const documentCheckQuery = `
                        SELECT 
                            COUNT(CASE WHEN document_type = 'lab_report' THEN 1 END) as lab_report_count,
                            COUNT(CASE WHEN document_type = 'prescription' THEN 1 END) as prescription_count,
                            COUNT(*) as total_documents
                        FROM appointment_documents 
                        WHERE appointment_id = $1
                    `;
                    
                    const documentCheck = await client.query(documentCheckQuery, [id]);
                    const docCounts = documentCheck.rows[0];
                    
                    const hasLabReport = parseInt(docCounts.lab_report_count) > 0;
                    const hasPrescription = parseInt(docCounts.prescription_count) > 0;
                    
                    console.log('=== Document Check for Completion ===');
                    console.log('Appointment ID:', id);
                    console.log('Lab Reports:', docCounts.lab_report_count);
                    console.log('Prescriptions:', docCounts.prescription_count);
                    console.log('Total Documents:', docCounts.total_documents);
                    console.log('Has Lab Report:', hasLabReport);
                    console.log('Has Prescription:', hasPrescription);
                    
                    if (!hasLabReport || !hasPrescription) {
                        const missingDocs = [];
                        if (!hasLabReport) missingDocs.push('lab_report');
                        if (!hasPrescription) missingDocs.push('prescription');
                        
                        res.status(400).json({
                            success: false,
                            message: `Cannot mark appointment as completed. Missing required documents: ${missingDocs.join(', ')}`,
                            data: {
                                currentDocuments: {
                                    labReports: parseInt(docCounts.lab_report_count),
                                    prescriptions: parseInt(docCounts.prescription_count),
                                    total: parseInt(docCounts.total_documents)
                                },
                                requiredDocuments: ['lab_report', 'prescription'],
                                missingDocuments: missingDocs
                            }
                        });
                        return;
                    }
                    
                    console.log('✅ All required documents present. Allowing completion.');
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
                UPDATE appointments 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING id, patient_id, hospital_id, appointment_date, appointment_time, 
                         status, purpose, notes, updated_at
            `;

            const result = await client.query(updateQuery, updateValues);
            const updatedAppointment = result.rows[0];

            // If appointment was completed, get document summary
            let documentSummary = null;
            if (updatedAppointment.status === 'completed') {
                const docSummaryQuery = `
                    SELECT 
                        document_type,
                        COUNT(*) as count,
                        STRING_AGG(document_name, ', ') as document_names
                    FROM appointment_documents 
                    WHERE appointment_id = $1
                    GROUP BY document_type
                    ORDER BY document_type
                `;
                
                const docSummaryResult = await client.query(docSummaryQuery, [id]);
                documentSummary = {
                    totalDocuments: docSummaryResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
                    documentsByType: docSummaryResult.rows.reduce((acc, row) => {
                        acc[row.document_type] = {
                            count: parseInt(row.count),
                            documents: row.document_names.split(', ')
                        };
                        return acc;
                    }, {})
                };
            }

            res.status(200).json({
                success: true,
                message: updatedAppointment.status === 'completed' 
                    ? 'Appointment completed successfully with all required documents' 
                    : 'Appointment updated successfully',
                data: {
                    id: updatedAppointment.id,
                    patientId: updatedAppointment.patient_id,
                    hospitalId: updatedAppointment.hospital_id,
                    appointmentDate: updatedAppointment.appointment_date,
                    appointmentTime: updatedAppointment.appointment_time,
                    status: updatedAppointment.status,
                    purpose: updatedAppointment.purpose,
                    notes: updatedAppointment.notes,
                    updatedAt: updatedAppointment.updated_at,
                    ...(documentSummary && { documents: documentSummary })
                }
            });

        } catch (error) {
            console.error('Error updating appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while updating appointment'
            });
        } finally {
            client.release();
        }
    }

    // Cancel appointment
    static async cancelAppointment(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;
            const { reason } = req.body;

            // Check if appointment exists and can be cancelled
            const existingQuery = `
                SELECT id, status, appointment_date, appointment_time 
                FROM appointments 
                WHERE id = $1
            `;
            const existingResult = await client.query(existingQuery, [id]);

            if (existingResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
                return;
            }

            const appointment = existingResult.rows[0];

            if (appointment.status === 'cancelled') {
                res.status(400).json({
                    success: false,
                    message: 'Appointment is already cancelled'
                });
                return;
            }

            if (appointment.status === 'completed') {
                res.status(400).json({
                    success: false,
                    message: 'Cannot cancel completed appointment'
                });
                return;
            }

            // Update appointment status to cancelled
            const updateQuery = `
                UPDATE appointments 
                SET status = 'cancelled', 
                    notes = CASE 
                        WHEN notes IS NULL THEN $2
                        ELSE notes || '; Cancellation reason: ' || $2
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, status, notes, updated_at
            `;

            const result = await client.query(updateQuery, [id, reason || 'No reason provided']);
            const cancelledAppointment = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Appointment cancelled successfully',
                data: {
                    id: cancelledAppointment.id,
                    status: cancelledAppointment.status,
                    notes: cancelledAppointment.notes,
                    updatedAt: cancelledAppointment.updated_at
                }
            });

        } catch (error) {
            console.error('Error cancelling appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while cancelling appointment'
            });
        } finally {
            client.release();
        }
    }

    // Get patient's appointments (for patient login)
    static async getPatientAppointments(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { patientId } = req.params;
            const { status, upcoming } = req.query;

            // Verify patient exists
            const patientQuery = `SELECT id, name FROM patients WHERE id = $1`;
            const patientResult = await client.query(patientQuery, [patientId]);

            if (patientResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Patient not found'
                });
                return;
            }

            // Build query for patient's appointments
            let query = `
                SELECT 
                    a.id, a.appointment_date, a.appointment_time, a.status, a.purpose, a.notes,
                    a.created_date, a.updated_at,
                    h.name as hospital_name, h.contact_phone as hospital_phone, 
                    h.contact_email as hospital_email, h.address_city, h.address_state
                FROM appointments a
                JOIN hospitals h ON a.hospital_id = h.id
                WHERE a.patient_id = $1
            `;

            const queryParams: any[] = [patientId];
            let whereConditions: string[] = [];

            // Add status filter
            if (status && typeof status === 'string') {
                const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
                if (validStatuses.includes(status.toLowerCase())) {
                    whereConditions.push(`a.status = $${queryParams.length + 1}`);
                    queryParams.push(status.toLowerCase());
                }
            }

            // Add upcoming filter (appointments from today onwards)
            if (upcoming === 'true') {
                whereConditions.push(`a.appointment_date >= CURRENT_DATE`);
                whereConditions.push(`a.status NOT IN ('cancelled', 'completed', 'no_show')`);
            }

            // Apply additional WHERE conditions
            if (whereConditions.length > 0) {
                query += ` AND ${whereConditions.join(' AND ')}`;
            }

            query += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;

            const result = await client.query(query, queryParams);

            const appointments = result.rows.map(row => ({
                id: row.id,
                appointmentDate: row.appointment_date,
                appointmentTime: row.appointment_time,
                status: row.status,
                purpose: row.purpose,
                notes: row.notes,
                createdDate: row.created_date,
                updatedAt: row.updated_at,
                hospital: {
                    name: row.hospital_name,
                    phone: row.hospital_phone,
                    email: row.hospital_email,
                    location: `${row.address_city}, ${row.address_state}`
                }
            }));

            res.status(200).json({
                success: true,
                message: 'Patient appointments retrieved successfully',
                data: {
                    patient: {
                        id: patientResult.rows[0].id,
                        name: patientResult.rows[0].name
                    },
                    appointments: appointments,
                    count: appointments.length
                },
                filters: {
                    status: status || null,
                    upcoming: upcoming === 'true' || false
                }
            });

        } catch (error) {
            console.error('Error retrieving patient appointments:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving patient appointments'
            });
        } finally {
            client.release();
        }
    }
}
