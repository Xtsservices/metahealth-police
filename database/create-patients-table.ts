import pool from '../src/config/database';

async function createPatientsTable() {
    const client = await pool.connect();
    
    try {
        console.log('Creating patients table...');
        
        // Create the patients table without the trigger first
        const createTableSQL = `
            BEGIN;
            
            -- Create patients table
            CREATE TABLE IF NOT EXISTS patients (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                mobile VARCHAR(20) NOT NULL UNIQUE,
                aadhar VARCHAR(20) NOT NULL UNIQUE,
                police_id_no VARCHAR(50) NOT NULL UNIQUE,
                status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
                created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP WITH TIME ZONE,
                
                -- Constraints
                CONSTRAINT valid_patient_name CHECK (LENGTH(TRIM(name)) > 0),
                CONSTRAINT valid_patient_mobile CHECK (LENGTH(TRIM(mobile)) >= 10),
                CONSTRAINT valid_patient_aadhar CHECK (LENGTH(TRIM(aadhar)) >= 12),
                CONSTRAINT valid_police_id CHECK (LENGTH(TRIM(police_id_no)) > 0)
            );
            
            -- Create indexes for better query performance
            CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
            CREATE INDEX IF NOT EXISTS idx_patients_aadhar ON patients(aadhar);
            CREATE INDEX IF NOT EXISTS idx_patients_police_id ON patients(police_id_no);
            CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
            CREATE INDEX IF NOT EXISTS idx_patients_created_date ON patients(created_date);
            
            COMMIT;
        `;
        
        await client.query(createTableSQL);
        console.log('✓ Patients table created successfully!');
        
        // Verify the table was created
        const checkQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'patients'
            );
        `;
        
        const result = await client.query(checkQuery);
        console.log(`Patients table exists: ${result.rows[0].exists}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating patients table:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

createPatientsTable();
