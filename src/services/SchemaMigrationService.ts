import pool from '../config/database';

export interface MigrationStep {
    version: string;
    description: string;
    sql: string;
    rollback?: string;
}

export class SchemaMigrationService {
    
    // Create migration tracking table
    static async initializeMigrationTable(): Promise<void> {
        const client = await pool.connect();
        
        try {
            const createMigrationTable = `
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) NOT NULL UNIQUE,
                    description TEXT NOT NULL,
                    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'rolled_back'))
                );
            `;
            
            await client.query(createMigrationTable);
            console.log('✅ Migration tracking table ready');
            
            // Create index for faster lookups
            await client.query('CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version)');
            
        } catch (error) {
            console.error('❌ Failed to initialize migration table:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Check if migration has been applied
    static async isMigrationApplied(version: string): Promise<boolean> {
        const client = await pool.connect();
        
        try {
            const result = await client.query(
                'SELECT version FROM schema_migrations WHERE version = $1 AND status = $2',
                [version, 'completed']
            );
            return result.rows.length > 0;
        } finally {
            client.release();
        }
    }

    // Apply a single migration
    static async applyMigration(migration: MigrationStep): Promise<void> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check if already applied
            if (await this.isMigrationApplied(migration.version)) {
                console.log(`ℹ️  Migration ${migration.version} already applied`);
                await client.query('ROLLBACK');
                return;
            }
            
            const startTime = Date.now();
            
            // Execute migration
            await client.query(migration.sql);
            
            const executionTime = Date.now() - startTime;
            
            // Record migration
            await client.query(`
                INSERT INTO schema_migrations (version, description, status)
                VALUES ($1, $2, 'completed')
            `, [migration.version, migration.description]);
            
            await client.query('COMMIT');
            console.log(`✅ Applied migration ${migration.version}: ${migration.description} (${executionTime}ms)`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            
            // Record failed migration
            try {
                await client.query(`
                    INSERT INTO schema_migrations (version, description, status)
                    VALUES ($1, $2, 'failed')
                `, [migration.version, migration.description]);
            } catch (recordError) {
                console.error('Failed to record migration failure:', recordError);
            }
            
            console.error(`❌ Migration ${migration.version} failed:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Apply multiple migrations in order
    static async applyMigrations(migrations: MigrationStep[]): Promise<void> {
        console.log(`🔄 Applying ${migrations.length} migrations...`);
        
        // Sort by version to ensure correct order
        const sortedMigrations = migrations.sort((a, b) => a.version.localeCompare(b.version));
        
        for (const migration of sortedMigrations) {
            await this.applyMigration(migration);
        }
        
        console.log('✅ All migrations applied successfully');
    }

    // Get migration status
    static async getMigrationStatus(): Promise<any[]> {
        const client = await pool.connect();
        
        try {
            const result = await client.query(`
                SELECT version, description, executed_at, execution_time_ms, status
                FROM schema_migrations
                ORDER BY executed_at DESC
            `);
            
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Rollback a migration (if rollback SQL is provided)
    static async rollbackMigration(version: string): Promise<void> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get migration details
            const migrationResult = await client.query(
                'SELECT rollback_sql, description FROM schema_migrations WHERE version = $1 AND status = $2',
                [version, 'completed']
            );
            
            if (migrationResult.rows.length === 0) {
                throw new Error(`Migration ${version} not found or not completed`);
            }
            
            const { rollback_sql, description } = migrationResult.rows[0];
            
            if (!rollback_sql) {
                throw new Error(`Migration ${version} has no rollback script`);
            }
            
            // Execute rollback
            await client.query(rollback_sql);
            
            // Update migration record
            await client.query(
                'UPDATE schema_migrations SET status = $1 WHERE version = $2',
                ['rolled_back', version]
            );
            
            await client.query('COMMIT');
            console.log(`✅ Rolled back migration ${version}: ${description}`);
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Rollback failed for migration ${version}:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Predefined migrations for new columns added
    static readonly MIGRATIONS: MigrationStep[] = [
        {
            version: '2025.01.01_hospital_approval_fields',
            description: 'Add approval fields to hospitals table',
            sql: `
                ALTER TABLE hospitals 
                ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS approved_by UUID,
                ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS approval_notes TEXT;
                
                ALTER TABLE hospitals 
                ADD CONSTRAINT IF NOT EXISTS hospitals_approval_status_check 
                CHECK (approval_status IN ('pending', 'approved', 'rejected'));
                
                CREATE INDEX IF NOT EXISTS idx_hospitals_approval_status ON hospitals(approval_status);
            `,
            rollback: `
                DROP INDEX IF EXISTS idx_hospitals_approval_status;
                ALTER TABLE hospitals 
                DROP CONSTRAINT IF EXISTS hospitals_approval_status_check;
                ALTER TABLE hospitals 
                DROP COLUMN IF EXISTS approval_notes,
                DROP COLUMN IF EXISTS approved_at,
                DROP COLUMN IF EXISTS approved_by,
                DROP COLUMN IF EXISTS approval_status;
            `
        },
        {
            version: '2025.01.03_user_status_column',
            description: 'Add status field to users table',
            sql: `
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'inactive';
                
                ALTER TABLE users 
                ADD CONSTRAINT IF NOT EXISTS users_status_check 
                CHECK (status IN ('active', 'inactive', 'suspended'));
                
                CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
            `,
            rollback: `
                DROP INDEX IF EXISTS idx_users_status;
                ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
                ALTER TABLE users DROP COLUMN IF EXISTS status;
            `
        },
        {
            version: '2025.01.07_user_active_status',
            description: 'Add is_active field to users table',
            sql: `
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
                
                CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
            `,
            rollback: `
                DROP INDEX IF EXISTS idx_users_is_active;
                ALTER TABLE users DROP COLUMN IF EXISTS is_active;
            `
        },
        {
            version: '2025.01.04_patient_address_fields',
            description: 'Add address fields to patients table',
            sql: `
                ALTER TABLE patients 
                ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
                ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
                ADD COLUMN IF NOT EXISTS address_state VARCHAR(50),
                ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20),
                ADD COLUMN IF NOT EXISTS address_country VARCHAR(50) DEFAULT 'India';
                
                CREATE INDEX IF NOT EXISTS idx_patients_city_state ON patients(address_city, address_state);
            `,
            rollback: `
                DROP INDEX IF EXISTS idx_patients_city_state;
                ALTER TABLE patients 
                DROP COLUMN IF EXISTS address_country,
                DROP COLUMN IF EXISTS address_zip_code,
                DROP COLUMN IF EXISTS address_state,
                DROP COLUMN IF EXISTS address_city,
                DROP COLUMN IF EXISTS address_street;
            `
        },
        {
            version: '2025.01.05_hospital_business_fields',
            description: 'Add business information fields to hospitals table',
            sql: `
                ALTER TABLE hospitals 
                ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50),
                ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
                ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15);
                
                CREATE INDEX IF NOT EXISTS idx_hospitals_gst_number ON hospitals(gst_number);
                CREATE INDEX IF NOT EXISTS idx_hospitals_pan_number ON hospitals(pan_number);
            `,
            rollback: `
                DROP INDEX IF EXISTS idx_hospitals_pan_number;
                DROP INDEX IF EXISTS idx_hospitals_gst_number;
                ALTER TABLE hospitals 
                DROP COLUMN IF EXISTS mobile_number,
                DROP COLUMN IF EXISTS pan_number,
                DROP COLUMN IF EXISTS gst_number;
            `
        },
        {
            version: '2025.01.06_appointment_documents_base64',
            description: 'Add base64 storage support to appointment_documents',
            sql: `
                ALTER TABLE appointment_documents 
                ADD COLUMN IF NOT EXISTS file_data TEXT;
                
                -- Update constraint to allow either file_path or file_data
                ALTER TABLE appointment_documents 
                DROP CONSTRAINT IF EXISTS file_storage_check;
                
                ALTER TABLE appointment_documents 
                ADD CONSTRAINT file_storage_check 
                CHECK (file_path IS NOT NULL OR file_data IS NOT NULL);
                
                CREATE INDEX IF NOT EXISTS idx_appointment_documents_file_data 
                ON appointment_documents USING HASH (md5(file_data)) 
                WHERE file_data IS NOT NULL;
            `,
            rollback: `
                DROP INDEX IF EXISTS idx_appointment_documents_file_data;
                ALTER TABLE appointment_documents 
                DROP CONSTRAINT IF EXISTS file_storage_check;
                ALTER TABLE appointment_documents 
                ADD CONSTRAINT file_storage_check 
                CHECK (file_path IS NOT NULL);
                ALTER TABLE appointment_documents 
                DROP COLUMN IF EXISTS file_data;
            `
        }
    ];

    // Run all pending migrations
    static async runPendingMigrations(): Promise<void> {
        try {
            console.log('🔄 Checking for pending migrations...');
            
            // Initialize migration table
            await this.initializeMigrationTable();
            
            // Filter out already applied migrations
            const pendingMigrations: MigrationStep[] = [];
            
            for (const migration of this.MIGRATIONS) {
                if (!(await this.isMigrationApplied(migration.version))) {
                    pendingMigrations.push(migration);
                }
            }
            
            if (pendingMigrations.length === 0) {
                console.log('✅ No pending migrations');
                return;
            }
            
            console.log(`📋 Found ${pendingMigrations.length} pending migrations`);
            await this.applyMigrations(pendingMigrations);
            
        } catch (error) {
            console.error('❌ Migration process failed:', error);
            throw error;
        }
    }
}
