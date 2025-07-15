import { Request, Response } from 'express';
import pool from '../config/database';

export class DashboardController {
    // Get dashboard statistics for super admin
    static async getDashboardStats(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            // Get hospital counts by status
            const hospitalStatsQuery = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM hospitals 
                GROUP BY status
                ORDER BY status
            `;

            const hospitalStats = await client.query(hospitalStatsQuery);

            // Get total hospitals count
            const totalHospitalsQuery = `SELECT COUNT(*) as total FROM hospitals`;
            const totalHospitals = await client.query(totalHospitalsQuery);

            // Get user counts by role and status
            const userStatsQuery = `
                SELECT 
                    role,
                    status,
                    COUNT(*) as count
                FROM users 
                GROUP BY role, status
                ORDER BY role, status
            `;

            const userStats = await client.query(userStatsQuery);

            // Get total users count
            const totalUsersQuery = `SELECT COUNT(*) as total FROM users`;
            const totalUsers = await client.query(totalUsersQuery);

            // Get recent registrations (last 30 days)
            const recentHospitalsQuery = `
                SELECT COUNT(*) as count 
                FROM hospitals 
                WHERE registration_date >= NOW() - INTERVAL '30 days'
            `;

            const recentHospitals = await client.query(recentHospitalsQuery);

            // Get recent users (last 30 days)
            const recentUsersQuery = `
                SELECT COUNT(*) as count 
                FROM users 
                WHERE created_date >= NOW() - INTERVAL '30 days'
            `;

            const recentUsers = await client.query(recentUsersQuery);

            // Get total patients count
            const totalPatientsQuery = `SELECT COUNT(*) as total FROM patients`;
            const totalPatients = await client.query(totalPatientsQuery);

            // Get recent patients (last 30 days)
            const recentPatientsQuery = `
                SELECT COUNT(*) as count 
                FROM patients 
                WHERE registration_date >= NOW() - INTERVAL '30 days'
            `;

            const recentPatients = await client.query(recentPatientsQuery);

            // Get total appointments count
            const totalAppointmentsQuery = `SELECT COUNT(*) as total FROM appointments`;
            const totalAppointments = await client.query(totalAppointmentsQuery);

            // Get appointment counts by status
            const appointmentStatsQuery = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM appointments 
                GROUP BY status
                ORDER BY status
            `;

            const appointmentStats = await client.query(appointmentStatsQuery);

            // Get recent appointments (last 30 days)
            const recentAppointmentsQuery = `
                SELECT COUNT(*) as count 
                FROM appointments 
                WHERE created_date >= NOW() - INTERVAL '30 days'
            `;

            const recentAppointments = await client.query(recentAppointmentsQuery);

            // Format hospital statistics
            const hospitalStatusCounts = {
                active: 0,
                inactive: 0,
                suspended: 0,
                rejected: 0
            };

            hospitalStats.rows.forEach(row => {
                if (hospitalStatusCounts.hasOwnProperty(row.status)) {
                    hospitalStatusCounts[row.status as keyof typeof hospitalStatusCounts] = parseInt(row.count);
                }
            });

            // Format user statistics
            const userStatistics = userStats.rows.reduce((acc, row) => {
                if (!acc[row.role]) {
                    acc[row.role] = { active: 0, inactive: 0, rejected: 0 };
                }
                acc[row.role][row.status] = parseInt(row.count);
                return acc;
            }, {} as Record<string, Record<string, number>>);

            // Format appointment statistics
            const appointmentStatusCounts = {
                scheduled: 0,
                completed: 0,
                cancelled: 0,
                pending: 0
            };

            appointmentStats.rows.forEach(row => {
                if (appointmentStatusCounts.hasOwnProperty(row.status)) {
                    appointmentStatusCounts[row.status as keyof typeof appointmentStatusCounts] = parseInt(row.count);
                }
            });

            res.status(200).json({
                success: true,
                message: 'Dashboard statistics retrieved successfully',
                data: {
                    hospitals: {
                        total: parseInt(totalHospitals.rows[0].total),
                        statusCounts: hospitalStatusCounts,
                        recentRegistrations: parseInt(recentHospitals.rows[0].count)
                    },
                    users: {
                        total: parseInt(totalUsers.rows[0].total),
                        byRoleAndStatus: userStatistics,
                        recentRegistrations: parseInt(recentUsers.rows[0].count)
                    },
                    patients: {
                        total: parseInt(totalPatients.rows[0].total),
                        recentRegistrations: parseInt(recentPatients.rows[0].count)
                    },
                    appointments: {
                        total: parseInt(totalAppointments.rows[0].total),
                        statusCounts: appointmentStatusCounts,
                        recentAppointments: parseInt(recentAppointments.rows[0].count),
                        completed: appointmentStatusCounts.completed,
                        scheduled: appointmentStatusCounts.scheduled
                    },
                    summary: {
                        totalHospitals: parseInt(totalHospitals.rows[0].total),
                        activeHospitals: hospitalStatusCounts.active,
                        inactiveHospitals: hospitalStatusCounts.inactive,
                        suspendedHospitals: hospitalStatusCounts.suspended,
                        rejectedHospitals: hospitalStatusCounts.rejected,
                        totalUsers: parseInt(totalUsers.rows[0].total),
                        totalPatients: parseInt(totalPatients.rows[0].total),
                        totalAppointments: parseInt(totalAppointments.rows[0].total),
                        completedAppointments: appointmentStatusCounts.completed,
                        scheduledAppointments: appointmentStatusCounts.scheduled
                    }
                }
            });

        } catch (error) {
            console.error('Error retrieving dashboard statistics:', error);
            res.status(500).json({
                success: false,
        message: 'Internal server error while rdashboard statistics'
            });
        } finally {
            client.release();
        }
    }

    // Get appointments with hospital and patient info, filterable by status, paginated
    static async getAppointmentsWithDetails(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        try {
            let { status, page, limit, search, hospitalId } = req.query;
            // If hospitalId is not provided in query, try to get from token (req.user)
            const reqAny = req as any;
            if (!hospitalId && reqAny.user && reqAny.user.hospital_id) {
                hospitalId = reqAny.user.hospital_id;
            }
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 10;
            if (pageNumber < 1) {
                res.status(400).json({ success: false, message: 'Page number must be greater than 0' });
                return;
            }
            if (pageSize < 1 || pageSize > 100) {
                res.status(400).json({ success: false, message: 'Limit must be between 1 and 100' });
                return;
            }
            const offset = (pageNumber - 1) * pageSize;

            // Build query with optional status and search (without scheduled_date, updated_date)
            let baseQuery = `
                SELECT a.id, a.status, a.created_date,
                       h.id as hospital_id, h.name as hospital_name, h.license_number, h.address_city, h.address_state,
                       p.id as patient_id, p.name as patient_name, p.gender as patient_gender, p.date_of_birth as patient_dob, p.police_id_no as patient_police_id_no
                FROM appointments a
                LEFT JOIN hospitals h ON a.hospital_id = h.id
                LEFT JOIN patients p ON a.patient_id = p.id
            `;
            let countQuery = `
                SELECT COUNT(*) as total
                FROM appointments a
                LEFT JOIN hospitals h ON a.hospital_id = h.id
                LEFT JOIN patients p ON a.patient_id = p.id
            `;
            const params: any[] = [];
            let whereParts: string[] = [];
            if (status && typeof status === 'string' && status.trim() !== '') {
                whereParts.push(`a.status = $${params.length + 1}`);
                params.push(status);
            }
            if (hospitalId && (typeof hospitalId === 'string' || typeof hospitalId === 'number')) {
                whereParts.push(`a.hospital_id = $${params.length + 1}`);
                params.push(hospitalId);
            }
            if (search && typeof search === 'string' && search.trim() !== '') {
                whereParts.push(`(p.name ILIKE $${params.length + 1} OR p.police_id_no ILIKE $${params.length + 1} OR h.name ILIKE $${params.length + 1} OR h.license_number ILIKE $${params.length + 1})`);
                params.push(`%${search}%`);
            }
            let whereClause = whereParts.length > 0 ? ` WHERE ` + whereParts.join(' AND ') : '';
            baseQuery += whereClause + ` ORDER BY a.created_date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            countQuery += whereClause;
            params.push(pageSize, offset);

            const [result, countResult] = await Promise.all([
                client.query(baseQuery, params),
                client.query(countQuery, params.slice(0, params.length - 2))
            ]);

            const totalRecords = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalRecords / pageSize);
            const appointments = result.rows.map(row => ({
                id: row.id,
                status: row.status,
                createdDate: row.created_date,
                hospital: {
                    id: row.hospital_id,
                    name: row.hospital_name,
                    licenseNumber: row.license_number,
                    city: row.address_city,
                    state: row.address_state
                },
                patient: {
                    id: row.patient_id,
                    name: row.patient_name,
                    gender: row.patient_gender,
                    dateOfBirth: row.patient_dob,
                    policeIdNo: row.patient_police_id_no
                }
            }));

            res.status(200).json({
                success: true,
                message: 'Appointments with hospital and patient info retrieved successfully',
                data: appointments,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    recordsPerPage: pageSize,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                },
                count: appointments.length
            });
        } catch (error) {
            console.error('Error retrieving appointments with details:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving appointments with details'
            });
        } finally {
            client.release();
        }
    }

    // Get paginated list of patients
    static async getPatientsList(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        try {
            const { page, limit, search } = req.query;
            const pageNumber = parseInt(page as string) || 1;
            const pageSize = parseInt(limit as string) || 10;
            if (pageNumber < 1) {
                res.status(400).json({ success: false, message: 'Page number must be greater than 0' });
                return;
            }
            if (pageSize < 1 || pageSize > 100) {
                res.status(400).json({ success: false, message: 'Limit must be between 1 and 100' });
                return;
            }
            const offset = (pageNumber - 1) * pageSize;

            // Build query with optional search
            let baseQuery = `SELECT id, name, gender, date_of_birth, police_id_no, created_date, registration_date FROM patients`;
            let countQuery = `SELECT COUNT(*) as total FROM patients`;
            const params: any[] = [];
            let whereClause = '';
            if (search && typeof search === 'string' && search.trim() !== '') {
                whereClause = ` WHERE name ILIKE $1 OR police_id_no ILIKE $1`;
                params.push(`%${search}%`);
            }
            baseQuery += whereClause + ` ORDER BY created_date DESC NULLS LAST, registration_date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            countQuery += whereClause;
            params.push(pageSize, offset);

            const [result, countResult] = await Promise.all([
                client.query(baseQuery, params),
                client.query(countQuery, params.slice(0, whereClause ? 1 : 0))
            ]);

            const totalRecords = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalRecords / pageSize);
            const patients = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                gender: row.gender,
                dateOfBirth: row.date_of_birth,
                policeIdNo: row.police_id_no,
                createdDate: row.created_date,
                registrationDate: row.registration_date
            }));

            res.status(200).json({
                success: true,
                message: 'Patients list retrieved successfully',
                data: patients,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    recordsPerPage: pageSize,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                },
                count: patients.length
            });
        } catch (error) {
            console.error('Error retrieving patients list:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving patients list'
            });
        } finally {
            client.release();
        }
    }

    // Get hospital status overview
    static async getHospitalStatusOverview(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { status, page, limit } = req.query;
            
            // Validate status parameter if provided
            if (status && typeof status === 'string') {
                const validStatuses = ['active', 'inactive', 'suspended', 'rejected'];
                if (!validStatuses.includes(status.toLowerCase())) {
                    res.status(400).json({
                        success: false,
                        message: `Invalid status '${status}'. Valid statuses are: ${validStatuses.join(', ')}`,
                        validStatuses: validStatuses
                    });
                    return;
                }
            }

            // Parse and validate pagination parameters
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
            
            // Build query with optional status filter
            let query = `
                SELECT 
                    h.id,
                    h.name,
                    h.license_number,
                    h.status,
                    h.registration_date,
                    h.address_city,
                    h.address_state,
                    COUNT(u.id) as user_count
                FROM hospitals h
                LEFT JOIN users u ON h.id = u.hospital_id
            `;
            
            // Build count query for total records (without pagination)
            let countQuery = `
                SELECT COUNT(DISTINCT h.id) as total
                FROM hospitals h
                LEFT JOIN users u ON h.id = u.hospital_id
            `;
            
            const queryParams: any[] = [];
            const countParams: any[] = [];
            
            // Add status filter if provided and valid
            if (status && typeof status === 'string') {
                query += ` WHERE h.status = $1`;
                countQuery += ` WHERE h.status = $1`;
                queryParams.push(status.toLowerCase());
                countParams.push(status.toLowerCase());
            }
            
            // Add grouping, ordering, and pagination to main query
            query += `
                GROUP BY h.id, h.name, h.license_number, h.status, h.registration_date, h.address_city, h.address_state
                ORDER BY h.registration_date DESC
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

            const hospitals = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                licenseNumber: row.license_number,
                status: row.status,
                registrationDate: row.registration_date,
                location: `${row.address_city}, ${row.address_state}`,
                userCount: parseInt(row.user_count)
            }));

            res.status(200).json({
                success: true,
                message: status 
                    ? `Hospital status overview retrieved successfully (filtered by: ${status})` 
                    : 'Hospital status overview retrieved successfully',
                data: hospitals,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    recordsPerPage: pageSize,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                },
                count: hospitals.length,
                filter: status ? { status: status } : null
            });

        } catch (error) {
            console.error('Error retrieving hospital overview:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving hospital overview'
            });
        } finally {
            client.release();
        }
    }

    // Get user statistics by hospital
    static async getUserStatsByHospital(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    h.id as hospital_id,
                    h.name as hospital_name,
                    h.status as hospital_status,
                    u.role,
                    u.status as user_status,
                    COUNT(u.id) as user_count
                FROM hospitals h
                LEFT JOIN users u ON h.id = u.hospital_id
                GROUP BY h.id, h.name, h.status, u.role, u.status
                ORDER BY h.name, u.role
            `;

            const result = await client.query(query);

            // Group by hospital
            const hospitalUserStats = result.rows.reduce((acc, row) => {
                const hospitalId = row.hospital_id;
                
                if (!acc[hospitalId]) {
                    acc[hospitalId] = {
                        hospitalId: row.hospital_id,
                        hospitalName: row.hospital_name,
                        hospitalStatus: row.hospital_status,
                        users: {}
                    };
                }

                if (row.role) {
                    if (!acc[hospitalId].users[row.role]) {
                        acc[hospitalId].users[row.role] = { active: 0, inactive: 0, rejected: 0 };
                    }
                    acc[hospitalId].users[row.role][row.user_status] = parseInt(row.user_count);
                }

                return acc;
            }, {} as Record<string, any>);

            res.status(200).json({
                success: true,
                message: 'User statistics by hospital retrieved successfully',
                data: Object.values(hospitalUserStats)
            });

        } catch (error) {
            console.error('Error retrieving user stats by hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving user statistics'
            });
        } finally {
            client.release();
        }
    }

    // Approve hospital and its admin user (Super Admin only)
    static async approveHospital(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            // Start transaction
            await client.query('BEGIN');
            
            const { hospitalId } = req.body; // Super admin user ID

            // Check if hospital exists and is in 'inactive' status
            const hospitalQuery = `
                SELECT id, name, status, contact_email 
                FROM hospitals 
                WHERE id = $1
            `;

            const hospitalResult = await client.query(hospitalQuery, [hospitalId]);

            if (hospitalResult.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({
                    success: false,
                    message: 'Hospital not found'
                });
                return;
            }

            const hospital = hospitalResult.rows[0];

            if (hospital.status === 'active') {
                await client.query('ROLLBACK');
                res.status(400).json({
                    success: false,
                    message: 'Hospital is already approved/active'
                });
                return;
            }

            if (hospital.status === 'suspended') {
                await client.query('ROLLBACK');
                res.status(400).json({
                    success: false,
                    message: 'Cannot approve suspended hospital. Please update status first.'
                });
                return;
            }

            // Update hospital status to active
            const updateHospitalQuery = `
                UPDATE hospitals 
                SET status = 'active', 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING id, name, status, updated_at
            `;

            const updatedHospital = await client.query(updateHospitalQuery, [hospitalId]);

            // Find and approve the hospital admin user
            const findAdminQuery = `
                SELECT id, name, email, phone, status
                FROM users 
                WHERE hospital_id = $1 AND role = 'hospital_admin'
            `;

            const adminResult = await client.query(findAdminQuery, [hospitalId]);

            if (adminResult.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({
                    success: false,
                    message: 'Hospital admin user not found'
                });
                return;
            }

            const adminUser = adminResult.rows[0];

            // Update admin user status to active
            const updateUserQuery = `
                UPDATE users 
                SET status = 'active', 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 
                RETURNING id, name, email, phone, status, updated_at
            `;

            const updatedUser = await client.query(updateUserQuery, [adminUser.id]);

            // Commit transaction
            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'Hospital and admin user approved successfully',
                data: {
                    hospital: {
                        id: updatedHospital.rows[0].id,
                        name: updatedHospital.rows[0].name,
                        status: updatedHospital.rows[0].status,
                        updatedAt: updatedHospital.rows[0].updated_at
                    },
                    adminUser: {
                        id: updatedUser.rows[0].id,
                        name: updatedUser.rows[0].name,
                        email: updatedUser.rows[0].email,
                        phone: updatedUser.rows[0].phone,
                        status: updatedUser.rows[0].status,
                        updatedAt: updatedUser.rows[0].updated_at
                    }
                }
            });

        } catch (error) {
            // Rollback transaction on any error
            await client.query('ROLLBACK');
            console.error('Error approving hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during hospital approval. All changes have been rolled back.'
            });
        } finally {
            client.release();
        }
    }

    // Get pending hospitals for approval
    static async getPendingHospitals(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { page, limit } = req.query;
            
            // Parse and validate pagination parameters
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
            
            const query = `
                SELECT 
                    h.id,
                    h.name,
                    h.license_number,
                    h.gst_number,
                    h.pan_number,
                    h.address_street,
                    h.address_city,
                    h.address_state,
                    h.address_country,
                    h.contact_phone,
                    h.contact_email,
                    h.contact_point_of_contact,
                    h.registration_date,
                    u.id as admin_user_id,
                    u.name as admin_name,
                    u.email as admin_email,
                    u.phone as admin_phone
                FROM hospitals h
                LEFT JOIN users u ON h.id = u.hospital_id AND u.role = 'hospital_admin'
                WHERE h.status = 'inactive'
                ORDER BY h.registration_date DESC
                LIMIT $1 OFFSET $2
            `;
            
            // Count query for total pending hospitals
            const countQuery = `
                SELECT COUNT(*) as total
                FROM hospitals h
                WHERE h.status = 'inactive'
            `;

            // Execute both queries
            const [result, countResult] = await Promise.all([
                client.query(query, [pageSize, offset]),
                client.query(countQuery)
            ]);
            
            const totalRecords = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(totalRecords / pageSize);
            
            const pendingHospitals = result.rows.map(row => ({
                hospital: {
                    id: row.id,
                    name: row.name,
                    licenseNumber: row.license_number,
                    gstNumber: row.gst_number,
                    panNumber: row.pan_number,
                    address: {
                        street: row.address_street,
                        city: row.address_city,
                        state: row.address_state,
                        country: row.address_country
                    },
                    contactInfo: {
                        phone: row.contact_phone,
                        email: row.contact_email,
                        pointOfContact: row.contact_point_of_contact
                    },
                    registrationDate: row.registration_date
                },
                adminUser: {
                    id: row.admin_user_id,
                    name: row.admin_name,
                    email: row.admin_email,
                    phone: row.admin_phone
                }
            }));

            res.status(200).json({
                success: true,
                message: 'Pending hospitals retrieved successfully',
                data: pendingHospitals,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: totalPages,
                    totalRecords: totalRecords,
                    recordsPerPage: pageSize,
                    hasNextPage: pageNumber < totalPages,
                    hasPreviousPage: pageNumber > 1
                },
                count: pendingHospitals.length
            });

        } catch (error) {
            console.error('Error retrieving pending hospitals:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving pending hospitals'
            });
        } finally {
            client.release();
        }
    }

    // Reject hospital application
    static async rejectHospital(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            // Start transaction
            await client.query('BEGIN');
            
            const { hospitalId } = req.params;
            const { rejectedBy, reason } = req.body; // Super admin user ID and reason

            // Check if hospital exists and is in 'inactive' status
            const hospitalQuery = `
                SELECT id, name, status
                FROM hospitals 
                WHERE id = $1
            `;

            const hospitalResult = await client.query(hospitalQuery, [hospitalId]);

            if (hospitalResult.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({
                    success: false,
                    message: 'Hospital not found'
                });
                return;
            }

            const hospital = hospitalResult.rows[0];

            if (hospital.status !== 'inactive') {
                await client.query('ROLLBACK');
                res.status(400).json({
                    success: false,
                    message: 'Can only reject hospitals with inactive status'
                });
                return;
            }

            // Update hospital status to rejected
            const updateHospitalQuery = `
                UPDATE hospitals 
                SET status = 'rejected', 
                    updated_at = CURRENT_TIMESTAMP,
                    rejected_by = $2,
                    rejected_date = CURRENT_TIMESTAMP,
                    rejection_reason = $3
                WHERE id = $1 
                RETURNING id, name, status, updated_at
            `;

            const updatedHospital = await client.query(updateHospitalQuery, [hospitalId, rejectedBy, reason]);

            // Update admin user status to rejected
            const updateUserQuery = `
                UPDATE users 
                SET status = 'rejected', 
                    updated_at = CURRENT_TIMESTAMP,
                    rejected_by = $2,
                    rejected_date = CURRENT_TIMESTAMP
                WHERE hospital_id = $1 AND role = 'hospital_admin'
                RETURNING id, name, email, status, updated_at
            `;

            const updatedUser = await client.query(updateUserQuery, [hospitalId, rejectedBy]);

            // Commit transaction
            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'Hospital application rejected successfully',
                data: {
                    hospital: updatedHospital.rows[0],
                    adminUser: updatedUser.rows.length > 0 ? updatedUser.rows[0] : null,
                    reason: reason
                }
            });

        } catch (error) {
            // Rollback transaction on any error
            await client.query('ROLLBACK');
            console.error('Error rejecting hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during hospital rejection. All changes have been rolled back.'
            });
        } finally {
            client.release();
        }
    }

    // Get database schema status and migration history
    static async getDatabaseStatus(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            // Check if migration table exists
            const migrationTableCheck = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'schema_migrations'
            `);
            
            const migrationTableExists = migrationTableCheck.rows.length > 0;
            let migrationHistory: any[] = [];
            
            if (migrationTableExists) {
                const historyResult = await client.query(`
                    SELECT version, description, executed_at, status
                    FROM schema_migrations
                    ORDER BY executed_at DESC
                `);
                migrationHistory = historyResult.rows;
            }
            
            // Check key schema elements
            const schemaCheck = await client.query(`
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_name IN ('hospitals', 'users', 'patients', 'appointment_documents')
                AND column_name IN ('approval_status', 'is_active', 'address_city', 'gst_number', 'file_data')
                ORDER BY table_name, column_name
            `);
            
            // Get table counts
            const tableCountsQuery = `
                SELECT 
                    'hospitals' as table_name, COUNT(*) as count FROM hospitals
                UNION ALL
                SELECT 'users' as table_name, COUNT(*) as count FROM users
                UNION ALL
                SELECT 'patients' as table_name, COUNT(*) as count FROM patients
                UNION ALL
                SELECT 'appointments' as table_name, COUNT(*) as count FROM appointments
                UNION ALL
                SELECT 'appointment_documents' as table_name, COUNT(*) as count FROM appointment_documents
            `;
            
            const tableCounts = await client.query(tableCountsQuery);
            
            // Expected key columns
            const expectedColumns = [
                { table: 'hospitals', column: 'approval_status' },
                { table: 'hospitals', column: 'gst_number' },
                { table: 'users', column: 'is_active' },
                { table: 'users', column: 'approval_status' },
                { table: 'patients', column: 'address_city' },
                { table: 'appointment_documents', column: 'file_data' }
            ];
            
            const schemaStatus = expectedColumns.map(expected => {
                const exists = schemaCheck.rows.some(row => 
                    row.table_name === expected.table && row.column_name === expected.column
                );
                return {
                    table: expected.table,
                    column: expected.column,
                    exists
                };
            });
            
            const allSchemaUpdated = schemaStatus.every(item => item.exists);
            
            res.status(200).json({
                success: true,
                message: 'Database status retrieved successfully',
                data: {
                    migrationSystem: {
                        trackingTableExists: migrationTableExists,
                        migrationsApplied: migrationHistory.length,
                        lastMigration: migrationHistory.length > 0 ? migrationHistory[0] : null
                    },
                    schema: {
                        allRequiredColumnsExist: allSchemaUpdated,
                        columnStatus: schemaStatus,
                        missingColumns: schemaStatus.filter(item => !item.exists)
                    },
                    tables: {
                        counts: tableCounts.rows.reduce((acc, row) => {
                            acc[row.table_name] = parseInt(row.count);
                            return acc;
                        }, {} as Record<string, number>),
                        totalRecords: tableCounts.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
                    },
                    migrationHistory: migrationHistory
                }
            });

        } catch (error) {
            console.error('Error retrieving database status:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving database status'
            });
        } finally {
            client.release();
        }
    }
}
