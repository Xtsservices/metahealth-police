import { Request, Response } from 'express';
import { User, UserRegistrationRequest } from '../models/User';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class UserController {
    // Create a user from hospital contact info
    static async createHospitalAdmin(hospitalId: string, name: string, phone: string, email: string): Promise<User | null> {
        const client = await pool.connect();
        
        try {
            // Check if user with same phone or email already exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE phone = $1 OR email = $2',
                [phone, email]
            );

            if (existingUser.rows.length > 0) {
                console.log('User with this phone or email already exists');
                return null;
            }

            // Insert new user
            const userId = uuidv4();
            const insertQuery = `
                INSERT INTO users (
                    id, name, phone, email, role, status, hospital_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name, phone, email, role, status, hospital_id, created_date, updated_at
            `;

            const values = [
                userId,
                name,
                phone,
                email,
                'hospital_admin',
                'inactive', // Default status
                hospitalId
            ];

            const result = await client.query(insertQuery, values);
            const newUser = result.rows[0];

            return {
                id: newUser.id,
                name: newUser.name,
                phone: newUser.phone,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status,
                hospitalId: newUser.hospital_id,
                createdDate: newUser.created_date,
                updatedAt: newUser.updated_at
            };

        } catch (error) {
            console.error('Error creating hospital admin user:', error);
            return null;
        } finally {
            client.release();
        }
    }

    // Create a new user (for manual user creation)
    static async createUser(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const userData: UserRegistrationRequest = req.body;
            const { name, email, phone, role, hospitalId } = userData;

            // Check if user with same email already exists
            const existingEmailUser = await client.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingEmailUser.rows.length > 0) {
                res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
                return;
            }

            // Check if user with same phone number already exists
            const existingPhoneUser = await client.query(
                'SELECT id FROM users WHERE phone = $1',
                [phone]
            );

            if (existingPhoneUser.rows.length > 0) {
                res.status(409).json({
                    success: false,
                    message: 'User with this phone number already exists'
                });
                return;
            }

            // Verify hospital exists if hospitalId is provided
            if (hospitalId) {
                const hospitalExists = await client.query(
                    'SELECT id FROM hospitals WHERE id = $1',
                    [hospitalId]
                );

                if (hospitalExists.rows.length === 0) {
                    res.status(404).json({
                        success: false,
                        message: 'Hospital not found'
                    });
                    return;
                }
            }

            // Insert new user
            const userId = uuidv4();
            const insertQuery = `
                INSERT INTO users (
                    id, name, phone, email, role, status, hospital_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, name, phone, email, role, status, hospital_id, created_date, updated_at
            `;

            const values = [
                userId,
                name,
                phone,
                email,
                role,
                'inactive', // Default status
                hospitalId || null
            ];

            const result = await client.query(insertQuery, values);
            const newUser = result.rows[0];

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                data: {
                    id: newUser.id,
                    name: newUser.name,
                    phone: newUser.phone,
                    email: newUser.email,
                    role: newUser.role,
                    status: newUser.status,
                    hospitalId: newUser.hospital_id,
                    createdDate: newUser.created_date,
                    updatedAt: newUser.updated_at
                }
            });

        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during user creation'
            });
        } finally {
            client.release();
        }
    }

    // Get all users
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    u.phone,
                    u.email,
                    u.role,
                    u.status,
                    u.hospital_id,
                    u.created_date,
                    u.updated_at,
                    h.name as hospital_name
                FROM users u
                LEFT JOIN hospitals h ON u.hospital_id = h.id
                ORDER BY u.created_date DESC
            `;

            const result = await client.query(query);
            
            const users = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                role: row.role,
                status: row.status,
                hospitalId: row.hospital_id,
                hospitalName: row.hospital_name,
                createdDate: row.created_date,
                updatedAt: row.updated_at
            }));

            res.status(200).json({
                success: true,
                message: 'Users retrieved successfully',
                data: users,
                count: users.length
            });

        } catch (error) {
            console.error('Error retrieving users:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving users'
            });
        } finally {
            client.release();
        }
    }

    // Get user by ID
    static async getUserById(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    u.phone,
                    u.email,
                    u.role,
                    u.status,
                    u.hospital_id,
                    u.created_date,
                    u.updated_at,
                    h.name as hospital_name
                FROM users u
                LEFT JOIN hospitals h ON u.hospital_id = h.id
                WHERE u.id = $1
            `;

            const result = await client.query(query, [id]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            const row = result.rows[0];
            const user = {
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                role: row.role,
                status: row.status,
                hospitalId: row.hospital_id,
                hospitalName: row.hospital_name,
                createdDate: row.created_date,
                updatedAt: row.updated_at
            };

            res.status(200).json({
                success: true,
                message: 'User retrieved successfully',
                data: user
            });

        } catch (error) {
            console.error('Error retrieving user:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving user'
            });
        } finally {
            client.release();
        }
    }

    // Update user status
    static async updateUserStatus(req: Request, res: Response): Promise<void> {
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
                UPDATE users 
                SET status = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 
                RETURNING id, name, status, updated_at
            `;

            const result = await client.query(updateQuery, [status, id]);

            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
                return;
            }

            const updatedUser = result.rows[0];

            res.status(200).json({
                success: true,
                message: 'User status updated successfully',
                data: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    status: updatedUser.status,
                    updatedAt: updatedUser.updated_at
                }
            });

        } catch (error) {
            console.error('Error updating user status:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while updating user status'
            });
        } finally {
            client.release();
        }
    }

    // Get users by hospital ID
    static async getUsersByHospitalId(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { hospitalId } = req.params;
            
            const query = `
                SELECT 
                    id, name, phone, email, role, status, created_date, updated_at
                FROM users 
                WHERE hospital_id = $1
                ORDER BY created_date DESC
            `;

            const result = await client.query(query, [hospitalId]);
            
            const users = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                phone: row.phone,
                email: row.email,
                role: row.role,
                status: row.status,
                createdDate: row.created_date,
                updatedAt: row.updated_at
            }));

            res.status(200).json({
                success: true,
                message: 'Hospital users retrieved successfully',
                data: users,
                count: users.length
            });

        } catch (error) {
            console.error('Error retrieving hospital users:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving hospital users'
            });
        } finally {
            client.release();
        }
    }
}
