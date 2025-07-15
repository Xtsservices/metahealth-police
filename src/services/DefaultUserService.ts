import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class DefaultUserService {
    
    // Create default super admin user if it doesn't exist
    static async createDefaultSuperAdmin(): Promise<void> {
        const client = await pool.connect();
        
        try {
            const defaultSuperAdmin = {
                phone: '9999999999', // Default super admin phone
                name: 'Super Admin',
                email: 'superadmin@metahealth.com',
                role: 'super_admin',
                status: 'active'
            };

            // Check if super admin already exists
            const existingQuery = `
                SELECT id, phone, email 
                FROM users 
                WHERE role = 'super_admin' OR phone = $1 OR email = $2
                LIMIT 1
            `;

            const existingResult = await client.query(existingQuery, [
                defaultSuperAdmin.phone, 
                defaultSuperAdmin.email
            ]);

            if (existingResult.rows.length > 0) {
                const existing = existingResult.rows[0];
                console.log(`ℹ️  Super admin already exists:`);
                console.log(`   Phone: ${existing.phone}`);
                console.log(`   Email: ${existing.email || 'N/A'}`);
                return;
            }

            // Create default super admin user
            const userId = uuidv4();
            const insertUserQuery = `
                INSERT INTO users (
                    id, name, phone, email, role, status, 
                    hospital_id, created_date, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, name, phone, email, role, status, created_date
            `;

            const userValues = [
                userId,
                defaultSuperAdmin.name,
                defaultSuperAdmin.phone,
                defaultSuperAdmin.email,
                defaultSuperAdmin.role,
                defaultSuperAdmin.status,
                null // No hospital association for super admin
            ];

            const result = await client.query(insertUserQuery, userValues);
            const newUser = result.rows[0];

            console.log(`✅ Default Super Admin created successfully:`);
            console.log(`   ID: ${newUser.id}`);
            console.log(`   Name: ${newUser.name}`);
            console.log(`   Phone: ${newUser.phone}`);
            console.log(`   Email: ${newUser.email}`);
            console.log(`   Role: ${newUser.role}`);
            console.log(`   Status: ${newUser.status}`);
            console.log(`   Created: ${newUser.created_date}`);

        } catch (error) {
            console.error('❌ Error creating default super admin:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Check if phone number exists and return user info
    static async checkPhoneExists(phone: string): Promise<any> {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT 
                    u.id, u.name, u.phone, u.email, u.role, u.status, u.hospital_id,
                    h.name as hospital_name, h.status as hospital_status
                FROM users u
                LEFT JOIN hospitals h ON u.hospital_id = h.id
                WHERE u.phone = $1
            `;

            const result = await client.query(query, [phone]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error('Error checking phone existence:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Get all super admin users
    static async getSuperAdmins(): Promise<any[]> {
        const client = await pool.connect();
        
        try {
            const query = `
                SELECT id, name, phone, email, status, created_date, last_login
                FROM users 
                WHERE role = 'super_admin'
                ORDER BY created_date ASC
            `;

            const result = await client.query(query);
            return result.rows;

        } catch (error) {
            console.error('Error getting super admins:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Update default super admin phone number
    static async updateSuperAdminPhone(newPhone: string): Promise<boolean> {
        const client = await pool.connect();
        
        try {
            // Check if new phone number is already in use by another user
            const existingQuery = `
                SELECT id, role 
                FROM users 
                WHERE phone = $1 AND role != 'super_admin'
            `;

            const existingResult = await client.query(existingQuery, [newPhone]);
            
            if (existingResult.rows.length > 0) {
                throw new Error(`Phone number ${newPhone} is already in use by another user`);
            }

            // Update super admin phone number
            const updateQuery = `
                UPDATE users 
                SET phone = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE role = 'super_admin'
                RETURNING id, name, phone
            `;

            const result = await client.query(updateQuery, [newPhone]);
            
            if (result.rows.length > 0) {
                console.log(`✅ Super admin phone updated to: ${newPhone}`);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Error updating super admin phone:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}
