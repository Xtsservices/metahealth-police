const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metahealth_police',
    password: process.env.DB_PASSWORD || 'Prashanth',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function simpleInit() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Simple database initialization...');

        // Create UUID extension
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        console.log('✅ UUID extension ready');

        // Create basic hospitals table
        const hospitalTable = `
            CREATE TABLE IF NOT EXISTS hospitals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                license_number VARCHAR(100) NOT NULL UNIQUE,
                address_street VARCHAR(255) NOT NULL,
                address_city VARCHAR(100) NOT NULL,
                address_state VARCHAR(50) NOT NULL,
                address_zip_code VARCHAR(20) NOT NULL,
                address_country VARCHAR(50) NOT NULL DEFAULT 'India',
                contact_phone VARCHAR(20) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                contact_website VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await client.query(hospitalTable);

        // Add new columns if they don't exist
        const alterQueries = [
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50)",
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20)",
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15)",
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_by UUID",
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_notes TEXT"
        ];

        for (const query of alterQueries) {
            try {
                await client.query(query);
                console.log(`✅ ${query.split(' ')[3]} column added`);
            } catch (error) {
                console.log(`ℹ️  Column might already exist: ${query.split(' ')[3]}`);
            }
        }

        // Create basic users table
        const usersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                hospital_id UUID,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(20) NOT NULL UNIQUE,
                role VARCHAR(50) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await client.query(usersTable);

        // Add approval columns to users
        const userAlterQueries = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_notes TEXT"
        ];

        for (const query of userAlterQueries) {
            try {
                await client.query(query);
            } catch (error) {
                console.log(`ℹ️  User column might already exist`);
            }
        }

        // Create auth tables
        const authTables = [
            `CREATE TABLE IF NOT EXISTS admin_otp (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                phone VARCHAR(20) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                purpose VARCHAR(50) NOT NULL DEFAULT 'login',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP WITH TIME ZONE
            )`,
            `CREATE TABLE IF NOT EXISTS admin_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address INET
            )`,
            `CREATE TABLE IF NOT EXISTS patient_otp (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                mobile VARCHAR(20) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                purpose VARCHAR(50) NOT NULL DEFAULT 'login',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP WITH TIME ZONE
            )`,
            `CREATE TABLE IF NOT EXISTS patient_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                patient_id UUID NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address INET
            )`
        ];

        for (const table of authTables) {
            await client.query(table);
        }

        // Create patients table
        const patientsTable = `
            CREATE TABLE IF NOT EXISTS patients (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(15) NOT NULL UNIQUE,
                aadhar VARCHAR(20) UNIQUE,
                date_of_birth DATE,
                gender VARCHAR(10),
                address_street VARCHAR(255),
                address_city VARCHAR(100),
                address_state VARCHAR(50),
                address_zip_code VARCHAR(20),
                address_country VARCHAR(50) DEFAULT 'India',
                emergency_contact_name VARCHAR(255),
                emergency_contact_phone VARCHAR(20),
                emergency_contact_relation VARCHAR(100),
                blood_group VARCHAR(5),
                medical_conditions TEXT,
                allergies TEXT,
                current_medications TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await client.query(patientsTable);

        // Create appointments table
        const appointmentsTable = `
            CREATE TABLE IF NOT EXISTS appointments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                patient_id UUID NOT NULL,
                hospital_id UUID NOT NULL,
                appointment_date DATE NOT NULL,
                appointment_time TIME NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
                purpose TEXT NOT NULL,
                notes TEXT,
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await client.query(appointmentsTable);

        // Create appointment documents table
        const documentsTable = `
            CREATE TABLE IF NOT EXISTS appointment_documents (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                appointment_id UUID NOT NULL,
                document_type VARCHAR(50) NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500),
                file_data TEXT,
                file_size INTEGER,
                mime_type VARCHAR(100),
                uploaded_by VARCHAR(50) NOT NULL,
                uploaded_by_id UUID,
                description TEXT,
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await client.query(documentsTable);

        console.log('✅ All tables created successfully!');

        // Check table status
        const tables = ['hospitals', 'users', 'admin_otp', 'admin_sessions', 'patient_otp', 'patient_sessions', 'patients', 'appointments', 'appointment_documents'];
        
        for (const table of tables) {
            const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`📊 ${table}: ${result.rows[0].count} records`);
        }

    } catch (error) {
        console.error('❌ Initialization failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

simpleInit();
