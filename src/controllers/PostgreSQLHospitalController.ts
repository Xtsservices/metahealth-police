import { Request, Response } from 'express';
import { Hospital, HospitalRegistrationRequest } from '../models/Hospital';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { UserController } from './UserController';

export class PostgreSQLHospitalController {
    // Register a new hospital
    static async registerHospital(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            // Start transaction
            await client.query('BEGIN');
            
            const registrationData: HospitalRegistrationRequest = req.body;
            const { name, address, contactInfo, licenseNumber, gstNumber, panNumber } = registrationData;

            // Check if hospital with same license number already exists
            const existingHospital = await client.query(
                'SELECT id FROM hospitals WHERE license_number = $1',
                [licenseNumber]
            );

            if (existingHospital.rows.length > 0) {
                await client.query('ROLLBACK');
                res.status(409).json({
                    success: false,
                    message: 'Hospital with this license number already exists'
                });
                return;
            }

            // Check if GST number already exists
            const existingGST = await client.query(
                'SELECT id FROM hospitals WHERE gst_number = $1',
                [gstNumber]
            );

            if (existingGST.rows.length > 0) {
                await client.query('ROLLBACK');
                res.status(409).json({
                    success: false,
                    message: 'Hospital with this GST number already exists'
                });
                return;
            }

            // Check if PAN number already exists
            const existingPAN = await client.query(
                'SELECT id FROM hospitals WHERE pan_number = $1',
                [panNumber]
            );

            if (existingPAN.rows.length > 0) {
                await client.query('ROLLBACK');
                res.status(409).json({
                    success: false,
                    message: 'Hospital with this PAN number already exists'
                });
                return;
            }

            // Check if user with same phone or email already exists (before hospital creation)
            const existingUser = await client.query(
                'SELECT id, phone, email FROM users WHERE phone = $1 OR email = $2',
                [contactInfo.phone, contactInfo.email]
            );

            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                const existingUserData = existingUser.rows[0];
                const conflictField = existingUserData.phone === contactInfo.phone ? 'phone number' : 'email';
                res.status(409).json({
                    success: false,
                    message: `User with this ${conflictField} already exists. Cannot create hospital admin.`
                });
                return;
            }

            // Insert new hospital
            const hospitalId = uuidv4();
            const insertHospitalQuery = `
                INSERT INTO hospitals (
                    id, name, license_number, gst_number, pan_number,
                    address_street, address_city, address_state, address_zip_code, address_country,
                    contact_country_code, contact_phone, contact_email, contact_point_of_contact,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                RETURNING id, name, license_number, gst_number, pan_number, registration_date, status
            `;

            const hospitalValues = [
                hospitalId,
                name,
                licenseNumber,
                gstNumber,
                panNumber,
                address.street,
                address.city,
                address.state,
                address.zipCode,
                address.country,
                contactInfo.countryCode,
                contactInfo.phone,
                contactInfo.email,
                contactInfo.pointOfContact,
                'inactive' // Default status
            ];

            const hospitalResult = await client.query(insertHospitalQuery, hospitalValues);
            const newHospital = hospitalResult.rows[0];

            // Create hospital admin user in the same transaction
            const userId = uuidv4();
            const insertUserQuery = `
                INSERT INTO users (
                    id, name, phone, email, role, status, hospital_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name, phone, email, role, status, hospital_id, created_date, updated_at
            `;

            const userValues = [
                userId,
                contactInfo.pointOfContact,
                contactInfo.phone,
                contactInfo.email,
                'hospital_admin',
                'inactive', // Default status
                hospitalId
            ];

            const userResult = await client.query(insertUserQuery, userValues);
            const newUser = userResult.rows[0];

            // If we reach here, both hospital and user were created successfully
            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Hospital and admin user registered successfully',
                data: {
                    hospital: {
                        id: newHospital.id,
                        name: newHospital.name,
                        licenseNumber: newHospital.license_number,
                        gstNumber: newHospital.gst_number,
                        panNumber: newHospital.pan_number,
                        registrationDate: newHospital.registration_date,
                        status: newHospital.status
                    },
                    adminUser: {
                        id: newUser.id,
                        name: newUser.name,
                        email: newUser.email,
                        phone: newUser.phone,
                        role: newUser.role,
                        status: newUser.status,
                        hospitalId: newUser.hospital_id,
                        createdDate: newUser.created_date
                    }
                }
            });

        } catch (error) {
            // Rollback transaction on any error
            await client.query('ROLLBACK');
            console.error('Error registering hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during hospital registration. All changes have been rolled back.'
            });
        } finally {
            client.release();
        }
    }

    // Get all hospitals
    static async getAllHospitals(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    id,
                    name,
                    license_number,
                    address_street,
                    address_city,
                    address_state,
                    address_zip_code,
                    address_country,
                    contact_phone,
                    contact_email,
                    contact_website,
                    status,
                    registration_date,
                    updated_at
                FROM hospitals 
                ORDER BY registration_date DESC
            `;

            const result = await client.query(query);
            
            // Transform the data to match our interface
            const hospitals = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                licenseNumber: row.license_number,
                address: {
                    street: row.address_street,
                    city: row.address_city,
                    state: row.address_state,
                    zipCode: row.address_zip_code,
                    country: row.address_country
                },
                contactInfo: {
                    phone: row.contact_phone,
                    email: row.contact_email,
                    website: row.contact_website
                },
                status: row.status,
                registrationDate: row.registration_date,
                updatedAt: row.updated_at
            }));

            res.status(200).json({
                success: true,
                message: 'Hospitals retrieved successfully',
                data: hospitals,
                count: hospitals.length
            });

        } catch (error) {
            console.error('Error retrieving hospitals:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving hospitals'
            });
        } finally {
            client.release();
        }
    }

    // Get hospital by ID
    static async getHospitalById(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    id,
                    name,
                    license_number,
                    address_street,
                    address_city,
                    address_state,
                    address_zip_code,
                    address_country,
                    contact_phone,
                    contact_email,
                    contact_website,
                    status,
                    registration_date,
                    updated_at
                FROM hospitals 
                WHERE id = $1
            `;

            const result = await client.query(query, [id]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Hospital not found'
                });
                return;
            }

            const row = result.rows[0];
            const hospital = {
                id: row.id,
                name: row.name,
                licenseNumber: row.license_number,
                address: {
                    street: row.address_street,
                    city: row.address_city,
                    state: row.address_state,
                    zipCode: row.address_zip_code,
                    country: row.address_country
                },
                contactInfo: {
                    phone: row.contact_phone,
                    email: row.contact_email,
                    website: row.contact_website
                },
                status: row.status,
                registrationDate: row.registration_date,
                updatedAt: row.updated_at
            };

            res.status(200).json({
                success: true,
                message: 'Hospital retrieved successfully',
                data: hospital
            });

        } catch (error) {
            console.error('Error retrieving hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving hospital'
            });
        } finally {
            client.release();
        }
    }

    // Update hospital status
    static async updateHospitalStatus(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive', 'suspended'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: active, inactive, or suspended'
                });
                return;
            }

            const updateQuery = `
                UPDATE hospitals 
                SET status = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 
                RETURNING id, name, status, updated_at
            `;

            const result = await client.query(updateQuery, [status, id]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Hospital not found'
                });
                return;
            }

            const updatedHospital = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'Hospital status updated successfully',
                data: {
                    id: updatedHospital.id,
                    name: updatedHospital.name,
                    status: updatedHospital.status,
                    updatedAt: updatedHospital.updated_at
                }
            });

        } catch (error) {
            console.error('Error updating hospital status:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while updating hospital status'
            });
        } finally {
            client.release();
        }
    }
}
