import pool from '../config/database';
import { SchemaMigrationService } from './SchemaMigrationService';

export class DatabaseInitService {
    
    static async initializeDatabase(): Promise<void> {
        const client = await pool.connect();
        
        try {
            console.log('🔧 Initializing database schema...');

            // Create UUID extension
            try {
                await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
                console.log('✅ UUID extension created');
            } catch (error) {
                console.log('ℹ️  UUID extension might already exist');
            }

            // Create update trigger function
            const triggerFunction = `
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            `;
            try {
                await client.query(triggerFunction);
                console.log('✅ Update trigger function created');
            } catch (error) {
                console.log('ℹ️  Trigger function might already exist');
            }

            // Create tables in order with individual error handling
            try {
                await this.createHospitalsTable(client);
            } catch (error) {
                console.error('❌ Failed to create hospitals table:', error);
                throw error;
            }

            try {
                await this.createUsersTable(client);
            } catch (error) {
                console.error('❌ Failed to create users table:', error);
                throw error;
            }

            try {
                await this.createAuthTables(client);
            } catch (error) {
                console.error('❌ Failed to create auth tables:', error);
                throw error;
            }

            try {
                await this.createPatientsTable(client);
            } catch (error) {
                console.error('❌ Failed to create patients table:', error);
                throw error;
            }

            try {
                await this.createAppointmentsTable(client);
            } catch (error) {
                console.error('❌ Failed to create appointments table:', error);
                throw error;
            }

            try {
                await this.createAppointmentDocumentsTable(client);
            } catch (error) {
                console.error('❌ Failed to create appointment documents table:', error);
                throw error;
            }

            console.log('✅ Database initialization completed successfully!');

        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        } finally {
            client.release();
        }

        // Run schema migrations after basic table creation
        try {
            console.log('🔄 Running schema migrations...');
            await SchemaMigrationService.runPendingMigrations();
            console.log('✅ Schema migrations completed!');
        } catch (error) {
            console.error('❌ Schema migrations failed:', error);
            // Don't throw here - basic tables are created, migrations can be run later
            console.log('⚠️  Database is functional but migrations need attention');
        }
    }

    private static async createHospitalsTable(client: any): Promise<void> {
        const createHospitalsTable = `
            CREATE TABLE IF NOT EXISTS hospitals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                license_number VARCHAR(100) NOT NULL UNIQUE,
                
                -- Address fields
                address_street VARCHAR(255) NOT NULL,
                address_city VARCHAR(100) NOT NULL,
                address_state VARCHAR(50) NOT NULL,
                address_zip_code VARCHAR(20) NOT NULL,
                address_country VARCHAR(50) NOT NULL DEFAULT 'India',
                
                -- Contact information
                contact_phone VARCHAR(20) NOT NULL,
                contact_email VARCHAR(255) NOT NULL,
                contact_website VARCHAR(255),
                
                -- Business information
                gst_number VARCHAR(50),
                pan_number VARCHAR(20),
                mobile_number VARCHAR(15),
                
                -- Approval fields
                approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
                approved_by UUID,
                approved_at TIMESTAMP WITH TIME ZONE,
                approval_notes TEXT,
                
                -- Metadata
                status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
                registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
                CONSTRAINT valid_name CHECK (LENGTH(TRIM(name)) > 0),
                CONSTRAINT valid_license CHECK (LENGTH(TRIM(license_number)) > 0)
            );
        `;

        try {
            await client.query(createHospitalsTable);
            console.log('✅ Hospitals table structure created');
        } catch (error) {
            console.error('❌ Error creating hospitals table:', error);
            throw error;
        }

        // Add missing columns if they don't exist (for existing tables)
        try {
            const addColumnsQueries = [
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50)',
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20)',
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15)',
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT \'pending\'',
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_by UUID',
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE',
                'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_notes TEXT'
            ];

            for (const query of addColumnsQueries) {
                await client.query(query);
            }
            console.log('✅ Hospitals table columns updated');
        } catch (error) {
            console.log('ℹ️  Some columns might already exist, continuing...');
        }

        // Add constraints if they don't exist
        try {
            await client.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'hospitals_approval_status_check'
                    ) THEN
                        ALTER TABLE hospitals ADD CONSTRAINT hospitals_approval_status_check 
                        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
                    END IF;
                END $$;
            `);
        } catch (error) {
            console.log('ℹ️  Approval status constraint might already exist');
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_hospitals_license_number ON hospitals(license_number)',
            'CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals(name)',
            'CREATE INDEX IF NOT EXISTS idx_hospitals_status ON hospitals(status)',
            'CREATE INDEX IF NOT EXISTS idx_hospitals_city_state ON hospitals(address_city, address_state)',
            'CREATE INDEX IF NOT EXISTS idx_hospitals_registration_date ON hospitals(registration_date)'
        ];

        for (const index of indexes) {
            try {
                await client.query(index);
            } catch (error) {
                console.log(`ℹ️  Index might already exist: ${index}`);
            }
        }

        // Add approval_status index only if column exists
        try {
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'hospitals' AND column_name = 'approval_status'
            `);
            
            if (columnCheck.rows.length > 0) {
                await client.query('CREATE INDEX IF NOT EXISTS idx_hospitals_approval_status ON hospitals(approval_status)');
                console.log('✅ Approval status index created');
            }
        } catch (error) {
            console.log('ℹ️  Approval status index creation skipped');
        }

        // Create trigger
        try {
            await client.query(`
                DROP TRIGGER IF EXISTS update_hospitals_updated_at ON hospitals;
                CREATE TRIGGER update_hospitals_updated_at 
                    BEFORE UPDATE ON hospitals 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column();
            `);
            console.log('✅ Hospitals trigger created');
        } catch (error) {
            console.log('ℹ️  Hospitals trigger creation failed, might already exist');
        }

        console.log('✅ Hospitals table created');
    }

    private static async createUsersTable(client: any): Promise<void> {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
                
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(20) NOT NULL UNIQUE,
                role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'hospital_admin')),
                
                -- Status fields
                status VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
                is_active BOOLEAN NOT NULL DEFAULT true,
                
                -- Approval tracking
                approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
                approved_by UUID REFERENCES users(id),
                approved_at TIMESTAMP WITH TIME ZONE,
                approval_notes TEXT,
                
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
                CONSTRAINT valid_name CHECK (LENGTH(TRIM(name)) > 0),
                CONSTRAINT hospital_admin_needs_hospital CHECK (
                    (role = 'super_admin' AND hospital_id IS NULL) OR 
                    (role = 'hospital_admin' AND hospital_id IS NOT NULL)
                )
            );
        `;

        try {
            await client.query(createUsersTable);
            console.log('✅ Users table structure created');
        } catch (error) {
            console.error('❌ Error creating users table:', error);
            throw error;
        }

        // Add missing columns if they don't exist (for existing tables)
        try {
            const addColumnsQueries = [
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT \'inactive\'',
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true',
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT \'pending\'',
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID',
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE',
                'ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_notes TEXT'
            ];

            for (const query of addColumnsQueries) {
                await client.query(query);
            }
            console.log('✅ Users table columns updated');
        } catch (error) {
            console.log('ℹ️  Some user columns might already exist, continuing...');
        }

        // Add constraints if they don't exist
        try {
            await client.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'users_status_check'
                    ) THEN
                        ALTER TABLE users ADD CONSTRAINT users_status_check 
                        CHECK (status IN ('active', 'inactive', 'suspended'));
                    END IF;
                END $$;
            `);
            
            await client.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'users_approval_status_check'
                    ) THEN
                        ALTER TABLE users ADD CONSTRAINT users_approval_status_check 
                        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
                    END IF;
                END $$;
            `);
        } catch (error) {
            console.log('ℹ️  Users constraints might already exist');
        }

        // Create indexes with individual error handling
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
            'CREATE INDEX IF NOT EXISTS idx_users_hospital_id ON users(hospital_id)'
        ];

        for (const index of indexes) {
            try {
                await client.query(index);
            } catch (error) {
                console.log(`ℹ️  Index might already exist: ${index}`);
            }
        }

        // Add conditional indexes only if columns exist
        try {
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name IN ('approval_status', 'is_active', 'status')
            `);
            
            const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
            
            if (existingColumns.includes('approval_status')) {
                await client.query('CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status)');
                console.log('✅ Users approval status index created');
            }
            
            if (existingColumns.includes('is_active')) {
                await client.query('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');
                console.log('✅ Users is_active index created');
            }
            
            if (existingColumns.includes('status')) {
                await client.query('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
                console.log('✅ Users status index created');
            }
        } catch (error) {
            console.log('ℹ️  Users conditional index creation skipped');
        }

        // Create trigger
        try {
            await client.query(`
                DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                CREATE TRIGGER update_users_updated_at 
                    BEFORE UPDATE ON users 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column();
            `);
            console.log('✅ Users trigger created');
        } catch (error) {
            console.log('ℹ️  Users trigger creation failed, might already exist');
        }

        console.log('✅ Users table created');
    }

    private static async createAuthTables(client: any): Promise<void> {
        // Admin OTP table
        const createAdminOtpTable = `
            CREATE TABLE IF NOT EXISTS admin_otp (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                phone VARCHAR(20) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                purpose VARCHAR(50) NOT NULL DEFAULT 'login',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP WITH TIME ZONE
            );
        `;

        // Admin sessions table
        const createAdminSessionsTable = `
            CREATE TABLE IF NOT EXISTS admin_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address INET
            );
        `;

        // Patient OTP table
        const createPatientOtpTable = `
            CREATE TABLE IF NOT EXISTS patient_otp (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                mobile VARCHAR(20) NOT NULL,
                otp VARCHAR(10) NOT NULL,
                purpose VARCHAR(50) NOT NULL DEFAULT 'login',
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                used_at TIMESTAMP WITH TIME ZONE
            );
        `;

        // Patient sessions table
        const createPatientSessionsTable = `
            CREATE TABLE IF NOT EXISTS patient_sessions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                patient_id UUID NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address INET
            );
        `;

        try {
            await client.query(createAdminOtpTable);
            await client.query(createAdminSessionsTable);
            await client.query(createPatientOtpTable);
            await client.query(createPatientSessionsTable);
            console.log('✅ Auth tables structure created');
        } catch (error) {
            console.error('❌ Error creating auth tables:', error);
            throw error;
        }

        // Create indexes with individual error handling
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_admin_otp_phone ON admin_otp(phone)',
            'CREATE INDEX IF NOT EXISTS idx_admin_otp_expires_at ON admin_otp(expires_at)',
            'CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash)',
            'CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at)',
            'CREATE INDEX IF NOT EXISTS idx_patient_otp_mobile ON patient_otp(mobile)',
            'CREATE INDEX IF NOT EXISTS idx_patient_otp_expires_at ON patient_otp(expires_at)',
            'CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient_id ON patient_sessions(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_patient_sessions_token_hash ON patient_sessions(token_hash)',
            'CREATE INDEX IF NOT EXISTS idx_patient_sessions_expires_at ON patient_sessions(expires_at)'
        ];

        for (const index of indexes) {
            try {
                await client.query(index);
            } catch (error) {
                console.log(`ℹ️  Index might already exist: ${index}`);
            }
        }

        console.log('✅ Auth tables created');
    }

    private static async createPatientsTable(client: any): Promise<void> {
        const createPatientsTable = `
            CREATE TABLE IF NOT EXISTS patients (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(15) NOT NULL UNIQUE,
                aadhar VARCHAR(20) UNIQUE,
                date_of_birth DATE,
                gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
                
                -- Address
                address_street VARCHAR(255),
                address_city VARCHAR(100),
                address_state VARCHAR(50),
                address_zip_code VARCHAR(20),
                address_country VARCHAR(50) DEFAULT 'India',
                
                -- Emergency contact
                emergency_contact_name VARCHAR(255),
                emergency_contact_phone VARCHAR(20),
                emergency_contact_relation VARCHAR(100),
                
                -- Medical information
                blood_group VARCHAR(5),
                medical_conditions TEXT,
                allergies TEXT,
                current_medications TEXT,
                
                -- System fields
                status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
                registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                CONSTRAINT valid_name CHECK (LENGTH(TRIM(name)) > 0),
                CONSTRAINT valid_mobile CHECK (LENGTH(TRIM(mobile)) >= 10)
            );
        `;

        try {
            await client.query(createPatientsTable);
            console.log('✅ Patients table structure created');
        } catch (error) {
            console.error('❌ Error creating patients table:', error);
            throw error;
        }

        // Add missing columns if they don't exist (for existing tables)
        try {
            const addColumnsQueries = [
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_street VARCHAR(255)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_city VARCHAR(100)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_state VARCHAR(50)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS address_country VARCHAR(50) DEFAULT \'India\'',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(100)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5)',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_conditions TEXT',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT',
                'ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications TEXT'
            ];

            for (const query of addColumnsQueries) {
                await client.query(query);
            }
            console.log('✅ Patients table columns updated');
        } catch (error) {
            console.log('ℹ️  Some patient columns might already exist, continuing...');
        }

        // Create indexes with individual error handling
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile)',
            'CREATE INDEX IF NOT EXISTS idx_patients_aadhar ON patients(aadhar)',
            'CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name)',
            'CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status)',
            'CREATE INDEX IF NOT EXISTS idx_patients_registration_date ON patients(registration_date)'
        ];

        for (const index of indexes) {
            try {
                await client.query(index);
            } catch (error) {
                console.log(`ℹ️  Index might already exist: ${index}`);
            }
        }

        // Add conditional indexes only if columns exist
        try {
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name IN ('address_city', 'address_state')
            `);
            
            const existingColumns = columnCheck.rows.map((row: any) => row.column_name);
            
            if (existingColumns.includes('address_city') && existingColumns.includes('address_state')) {
                await client.query('CREATE INDEX IF NOT EXISTS idx_patients_city_state ON patients(address_city, address_state)');
                console.log('✅ Patients city/state index created');
            }
        } catch (error) {
            console.log('ℹ️  Patients city/state index creation skipped');
        }

        // Create trigger
        try {
            await client.query(`
                DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
                CREATE TRIGGER update_patients_updated_at 
                    BEFORE UPDATE ON patients 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column();
            `);
            console.log('✅ Patients trigger created');
        } catch (error) {
            console.log('ℹ️  Patients trigger creation failed, might already exist');
        }

        console.log('✅ Patients table created');
    }

    private static async createAppointmentsTable(client: any): Promise<void> {
        const createAppointmentsTable = `
            CREATE TABLE IF NOT EXISTS appointments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                
                appointment_date DATE NOT NULL,
                appointment_time TIME NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
                
                purpose TEXT NOT NULL,
                notes TEXT,
                
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                CONSTRAINT valid_purpose CHECK (LENGTH(TRIM(purpose)) > 0),
                CONSTRAINT future_appointment CHECK (appointment_date >= CURRENT_DATE)
            );
        `;

        try {
            await client.query(createAppointmentsTable);
            console.log('✅ Appointments table structure created');
        } catch (error) {
            console.error('❌ Error creating appointments table:', error);
            throw error;
        }

        // Create indexes with individual error handling
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time)',
            'CREATE INDEX IF NOT EXISTS idx_appointments_created_date ON appointments(created_date)'
        ];

        for (const index of indexes) {
            try {
                await client.query(index);
            } catch (error) {
                console.log(`ℹ️  Index might already exist: ${index}`);
            }
        }

        // Create trigger
        try {
            await client.query(`
                DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
                CREATE TRIGGER update_appointments_updated_at 
                    BEFORE UPDATE ON appointments 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column();
            `);
            console.log('✅ Appointments trigger created');
        } catch (error) {
            console.log('ℹ️  Appointments trigger creation failed, might already exist');
        }

        console.log('✅ Appointments table created');
    }

    private static async createAppointmentDocumentsTable(client: any): Promise<void> {
        const createAppointmentDocumentsTable = `
            CREATE TABLE IF NOT EXISTS appointment_documents (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
                
                document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('lab_report', 'prescription', 'operation_sheet', 'other')),
                document_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500),
                file_data TEXT,
                file_size INTEGER,
                mime_type VARCHAR(100),
                
                uploaded_by VARCHAR(50) NOT NULL,
                uploaded_by_id UUID,
                description TEXT,
                
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                
                -- Constraints
                CONSTRAINT valid_document_name CHECK (LENGTH(TRIM(document_name)) > 0),
                CONSTRAINT valid_uploaded_by CHECK (LENGTH(TRIM(uploaded_by)) > 0),
                CONSTRAINT file_storage_check CHECK (file_path IS NOT NULL OR file_data IS NOT NULL)
            );
        `;

        try {
            await client.query(createAppointmentDocumentsTable);
            console.log('✅ Appointment documents table structure created');
        } catch (error) {
            console.error('❌ Error creating appointment documents table:', error);
            throw error;
        }

        // Create indexes with individual error handling
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment_id ON appointment_documents(appointment_id)',
            'CREATE INDEX IF NOT EXISTS idx_appointment_documents_type ON appointment_documents(document_type)',
            'CREATE INDEX IF NOT EXISTS idx_appointment_documents_uploaded_by ON appointment_documents(uploaded_by)',
            'CREATE INDEX IF NOT EXISTS idx_appointment_documents_created_date ON appointment_documents(created_date)'
        ];

        for (const index of indexes) {
            try {
                await client.query(index);
            } catch (error) {
                console.log(`ℹ️  Index might already exist: ${index}`);
            }
        }

        // Create file_data hash index only if column exists and has data
        try {
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'appointment_documents' AND column_name = 'file_data'
            `);
            
            if (columnCheck.rows.length > 0) {
                await client.query('CREATE INDEX IF NOT EXISTS idx_appointment_documents_file_data ON appointment_documents USING HASH (md5(file_data)) WHERE file_data IS NOT NULL');
                console.log('✅ Appointment documents file_data index created');
            }
        } catch (error) {
            console.log('ℹ️  Appointment documents file_data index creation skipped');
        }

        // Create trigger
        try {
            await client.query(`
                DROP TRIGGER IF EXISTS update_appointment_documents_updated_at ON appointment_documents;
                CREATE TRIGGER update_appointment_documents_updated_at 
                    BEFORE UPDATE ON appointment_documents 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column();
            `);
            console.log('✅ Appointment documents trigger created');
        } catch (error) {
            console.log('ℹ️  Appointment documents trigger creation failed, might already exist');
        }

        console.log('✅ Appointment documents table created');
    }

    static async checkDatabaseStatus(): Promise<any> {
        const client = await pool.connect();
        
        try {
            const tables = [
                'hospitals',
                'users', 
                'admin_otp',
                'admin_sessions',
                'patient_otp',
                'patient_sessions',
                'patients',
                'appointments',
                'appointment_documents'
            ];

            const tableChecks = await Promise.all(
                tables.map(async (table) => {
                    try {
                        const result = await client.query(`
                            SELECT COUNT(*) as count 
                            FROM information_schema.tables 
                            WHERE table_name = $1
                        `, [table]);
                        
                        const exists = parseInt(result.rows[0].count) > 0;
                        
                        let recordCount = 0;
                        if (exists) {
                            const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                            recordCount = parseInt(countResult.rows[0].count);
                        }
                        
                        return {
                            table,
                            exists,
                            recordCount
                        };
                    } catch (error) {
                        return {
                            table,
                            exists: false,
                            recordCount: 0,
                            error: (error as Error).message
                        };
                    }
                })
            );

            return {
                databaseConnected: true,
                tables: tableChecks,
                allTablesExist: tableChecks.every(t => t.exists),
                totalTables: tableChecks.length,
                existingTables: tableChecks.filter(t => t.exists).length
            };

        } catch (error) {
            return {
                databaseConnected: false,
                error: (error as Error).message
            };
        } finally {
            client.release();
        }
    }
}
