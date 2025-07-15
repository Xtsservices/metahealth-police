require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function fixMigrationSyntaxIssues() {
    const client = await pool.connect();
    try {
        console.log('🔧 MIGRATION SYNTAX FIX UTILITY');
        console.log('=' .repeat(50));
        
        // 1. Check current migration state
        console.log('\n📊 Checking current migration state...');
        
        const migrationCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'schema_migrations'
        `);
        
        if (migrationCheck.rows.length === 0) {
            console.log('❌ Migration table does not exist');
            return;
        }
        
        const migrations = await client.query(`
            SELECT version, status 
            FROM schema_migrations 
            ORDER BY executed_at DESC
        `);
        
        console.log(`✅ Found ${migrations.rows.length} migration records`);
        migrations.rows.forEach(row => {
            const status = row.status === 'completed' ? '✅' : '❌';
            console.log(`   ${status} ${row.version}`);
        });
        
        // 2. Remove failed migrations that we'll fix
        console.log('\n🧹 Cleaning failed migration records...');
        
        const failedMigrations = await client.query(`
            SELECT version FROM schema_migrations WHERE status = 'failed'
        `);
        
        if (failedMigrations.rows.length > 0) {
            console.log(`Found ${failedMigrations.rows.length} failed migrations to clean:`);
            failedMigrations.rows.forEach(row => {
                console.log(`   ❌ ${row.version}`);
            });
            
            await client.query(`DELETE FROM schema_migrations WHERE status = 'failed'`);
            console.log('✅ Failed migration records cleaned');
        } else {
            console.log('✅ No failed migrations to clean');
        }
        
        // 3. Apply fixed migrations manually with correct syntax
        console.log('\n🔄 Applying migrations with correct SQL syntax...');
        
        const fixedMigrations = [
            {
                version: '2025.01.01_hospital_approval_fields',
                description: 'Add approval fields to hospitals table',
                sql: `
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending';
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_by UUID;
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_notes TEXT;
                    
                    ALTER TABLE hospitals 
                    ADD CONSTRAINT IF NOT EXISTS hospitals_approval_status_check 
                    CHECK (approval_status IN ('pending', 'approved', 'rejected'));
                    
                    CREATE INDEX IF NOT EXISTS idx_hospitals_approval_status ON hospitals(approval_status);
                `
            },
            {
                version: '2025.01.03_user_status_column',
                description: 'Add status field to users table',
                sql: `
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'inactive';
                    
                    ALTER TABLE users 
                    ADD CONSTRAINT IF NOT EXISTS users_status_check 
                    CHECK (status IN ('active', 'inactive', 'suspended'));
                    
                    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
                `
            },
            {
                version: '2025.01.07_user_active_status',
                description: 'Add is_active field to users table',
                sql: `
                    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
                    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
                `
            },
            {
                version: '2025.01.04_patient_address_fields',
                description: 'Add address fields to patients table',
                sql: `
                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_city VARCHAR(100);
                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_state VARCHAR(50);
                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20);
                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_country VARCHAR(50) DEFAULT 'India';
                    
                    CREATE INDEX IF NOT EXISTS idx_patients_city_state ON patients(address_city, address_state);
                `
            },
            {
                version: '2025.01.05_hospital_business_fields',
                description: 'Add business information fields to hospitals table',
                sql: `
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20);
                    ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);
                    
                    CREATE INDEX IF NOT EXISTS idx_hospitals_gst_number ON hospitals(gst_number);
                    CREATE INDEX IF NOT EXISTS idx_hospitals_pan_number ON hospitals(pan_number);
                `
            },
            {
                version: '2025.01.06_appointment_documents_base64',
                description: 'Add base64 storage support to appointment_documents',
                sql: `
                    ALTER TABLE appointment_documents ADD COLUMN IF NOT EXISTS file_data TEXT;
                    
                    CREATE INDEX IF NOT EXISTS idx_appointment_documents_file_data 
                    ON appointment_documents USING HASH (md5(file_data)) 
                    WHERE file_data IS NOT NULL;
                `
            }
        ];
        
        for (const migration of fixedMigrations) {
            try {
                console.log(`\n🔄 Applying ${migration.version}...`);
                
                // Check if already completed
                const existing = await client.query(`
                    SELECT version FROM schema_migrations 
                    WHERE version = $1 AND status = 'completed'
                `, [migration.version]);
                
                if (existing.rows.length > 0) {
                    console.log(`   ✅ Already completed: ${migration.version}`);
                    continue;
                }
                
                // Apply the migration SQL
                await client.query('BEGIN');
                await client.query(migration.sql);
                
                // Record successful migration
                await client.query(`
                    INSERT INTO schema_migrations (version, description, status)
                    VALUES ($1, $2, 'completed')
                    ON CONFLICT (version) DO UPDATE SET 
                    status = 'completed', 
                    executed_at = CURRENT_TIMESTAMP
                `, [migration.version, migration.description]);
                
                await client.query('COMMIT');
                console.log(`   ✅ Successfully applied: ${migration.version}`);
                
            } catch (error) {
                await client.query('ROLLBACK');
                console.log(`   ❌ Failed to apply ${migration.version}: ${error.message}`);
                
                // Record failed migration
                try {
                    await client.query(`
                        INSERT INTO schema_migrations (version, description, status)
                        VALUES ($1, $2, 'failed')
                        ON CONFLICT (version) DO UPDATE SET 
                        status = 'failed', 
                        executed_at = CURRENT_TIMESTAMP
                    `, [migration.version, migration.description]);
                } catch (recordError) {
                    console.log(`   ⚠️  Could not record failure: ${recordError.message}`);
                }
            }
        }
        
        // 4. Verify final state
        console.log('\n📋 Final Migration State:');
        const finalMigrations = await client.query(`
            SELECT version, status, executed_at 
            FROM schema_migrations 
            ORDER BY executed_at DESC
        `);
        
        const completed = finalMigrations.rows.filter(r => r.status === 'completed').length;
        const failed = finalMigrations.rows.filter(r => r.status === 'failed').length;
        
        console.log(`✅ Total migrations: ${finalMigrations.rows.length}`);
        console.log(`✅ Completed: ${completed}`);
        console.log(`${failed > 0 ? '❌' : '✅'} Failed: ${failed}`);
        
        finalMigrations.rows.forEach(row => {
            const status = row.status === 'completed' ? '✅' : '❌';
            console.log(`   ${status} ${row.version}`);
        });
        
        // 5. Verify critical columns exist
        console.log('\n🔍 Verifying Critical Columns:');
        const criticalColumns = [
            { table: 'hospitals', column: 'approval_status' },
            { table: 'hospitals', column: 'gst_number' },
            { table: 'users', column: 'status' },
            { table: 'users', column: 'is_active' },
            { table: 'patients', column: 'address_city' },
            { table: 'appointment_documents', column: 'file_data' }
        ];
        
        for (const col of criticalColumns) {
            const result = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [col.table, col.column]);
            
            const exists = result.rows.length > 0;
            console.log(`   ${exists ? '✅' : '❌'} ${col.table}.${col.column}`);
        }
        
        if (failed === 0) {
            console.log('\n🎉 SUCCESS: All migrations completed successfully!');
            console.log('✅ Database schema is now fully synchronized');
            console.log('✅ Server should start without migration errors');
        } else {
            console.log('\n⚠️  Some migrations failed. Check the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Migration fix failed:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixMigrationSyntaxIssues().catch(console.error);
