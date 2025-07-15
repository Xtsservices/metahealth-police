require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Simple migration runner for immediate use
async function runMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Running schema synchronization...');
        
        // Create migration tracking table
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                version VARCHAR(50) NOT NULL UNIQUE,
                description TEXT NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) NOT NULL DEFAULT 'completed'
            );
        `);
        
        // Define migrations with check if already applied
        const migrations = [
            {
                version: '2025.01.01_hospital_approval_fields',
                description: 'Add approval fields to hospitals table',
                check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'approval_status'`,
                sql: `
                    ALTER TABLE hospitals 
                    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    ADD COLUMN IF NOT EXISTS approved_by UUID,
                    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
                    ADD COLUMN IF NOT EXISTS approval_notes TEXT;
                    
                    CREATE INDEX IF NOT EXISTS idx_hospitals_approval_status ON hospitals(approval_status);
                `
            },
            {
                version: '2025.01.02_user_active_status',
                description: 'Add is_active field to users table',
                check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active'`,
                sql: `
                    ALTER TABLE users 
                    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
                    
                    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
                `
            },
            {
                version: '2025.01.03_patient_address_fields',
                description: 'Add address fields to patients table',
                check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'address_city'`,
                sql: `
                    ALTER TABLE patients 
                    ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
                    ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
                    ADD COLUMN IF NOT EXISTS address_state VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20),
                    ADD COLUMN IF NOT EXISTS address_country VARCHAR(50) DEFAULT 'India';
                    
                    CREATE INDEX IF NOT EXISTS idx_patients_city_state ON patients(address_city, address_state);
                `
            },
            {
                version: '2025.01.04_hospital_business_fields', 
                description: 'Add business information fields to hospitals table',
                check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'gst_number'`,
                sql: `
                    ALTER TABLE hospitals 
                    ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50),
                    ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
                    ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);
                    
                    CREATE INDEX IF NOT EXISTS idx_hospitals_gst_number ON hospitals(gst_number);
                `
            },
            {
                version: '2025.01.05_appointment_documents_base64',
                description: 'Add base64 storage support to appointment_documents',
                check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'appointment_documents' AND column_name = 'file_data'`,
                sql: `
                    ALTER TABLE appointment_documents 
                    ADD COLUMN IF NOT EXISTS file_data TEXT;
                    
                    CREATE INDEX IF NOT EXISTS idx_appointment_documents_file_data 
                    ON appointment_documents USING HASH (md5(file_data)) 
                    WHERE file_data IS NOT NULL;
                `
            }
        ];
        
        for (const migration of migrations) {
            try {
                // Check if migration is already applied
                const existing = await client.query(
                    'SELECT version FROM schema_migrations WHERE version = $1',
                    [migration.version]
                );
                
                if (existing.rows.length > 0) {
                    console.log(`✅ Migration ${migration.version} already applied`);
                    continue;
                }
                
                // Check if changes already exist in schema
                const checkResult = await client.query(migration.check);
                if (checkResult.rows.length > 0) {
                    console.log(`✅ ${migration.version}: Schema already updated, marking as applied`);
                    await client.query(
                        'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
                        [migration.version, migration.description]
                    );
                    continue;
                }
                
                // Apply migration
                console.log(`🔄 Applying ${migration.version}: ${migration.description}`);
                await client.query('BEGIN');
                
                await client.query(migration.sql);
                
                await client.query(
                    'INSERT INTO schema_migrations (version, description) VALUES ($1, $2)',
                    [migration.version, migration.description]
                );
                
                await client.query('COMMIT');
                console.log(`✅ Applied ${migration.version}`);
                
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`❌ Failed to apply ${migration.version}:`, error.message);
                // Continue with other migrations
            }
        }
        
        console.log('✅ Schema synchronization completed!');
        
        // Show final status
        const finalCheck = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('hospitals', 'users', 'patients', 'appointment_documents')
            AND column_name IN ('approval_status', 'is_active', 'address_city', 'gst_number', 'file_data')
            ORDER BY table_name, column_name
        `);
        
        console.log('\n📋 Key columns status:');
        finalCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}.${row.column_name}`);
        });
        
    } finally {
        client.release();
        process.exit(0);
    }
}

runMigrations().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
});
