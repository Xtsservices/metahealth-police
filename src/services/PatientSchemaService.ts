import pool from '../config/database';

export class PatientSchemaService {
    static async ensurePoliceIdColumn(): Promise<void> {
        const client = await pool.connect();
        try {
            console.log('🔍 Checking patients table schema...');
            // Check if patients table exists
            const tableExistsQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'patients';
            `;
            const tableResult = await client.query(tableExistsQuery);
            if (tableResult.rows.length === 0) {
                console.log('⚠️  Patients table does not exist. It will be created when needed.');
                return;
            }

            // Ensure created_date column exists and is backfilled
            const createdDateColumnQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'created_date';
            `;
            const createdDateResult = await client.query(createdDateColumnQuery);
            if (createdDateResult.rows.length === 0) {
                console.log('❌ created_date column missing. Adding it now...');
                await client.query(`
                  ALTER TABLE patients
                  ADD COLUMN IF NOT EXISTS created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                `);
                console.log('✅ created_date column added (if not already present)');
                await client.query(`
                  UPDATE patients
                  SET created_date = registration_date
                  WHERE created_date IS NULL
                `);
                console.log('✅ created_date backfilled for existing records');
            } else {
                console.log('✅ created_date column already exists in patients table');
            }

            // Check if police_id_no column exists
            const columnExistsQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'police_id_no';
            `;
            const columnResult = await client.query(columnExistsQuery);
            if (columnResult.rows.length > 0) {
                console.log('✅ police_id_no column exists in patients table');
                // Verify unique constraint exists
                const constraintQuery = `
                    SELECT tc.constraint_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = 'patients' 
                    AND kcu.column_name = 'police_id_no' 
                    AND tc.constraint_type = 'UNIQUE';
                `;
                const constraintResult = await client.query(constraintQuery);
                if (constraintResult.rows.length === 0) {
                    console.log('⚠️  Adding missing UNIQUE constraint to police_id_no...');
                    try {
                        await client.query('ALTER TABLE patients ADD CONSTRAINT unique_police_id_no UNIQUE (police_id_no);');
                        console.log('✅ Added UNIQUE constraint to police_id_no');
                    } catch (error: any) {
                        console.log('⚠️  Could not add UNIQUE constraint:', error.message);
                    }
                }
                return;
            }

            console.log('❌ police_id_no column missing. Adding it now...');
            // Start transaction
            await client.query('BEGIN');
            try {
                // Step 1: Add the column as nullable first
                console.log('📝 Adding police_id_no column...');
                await client.query('ALTER TABLE patients ADD COLUMN police_id_no VARCHAR(50);');
                // Step 2: Update existing records with temporary unique values
                console.log('📝 Updating existing records with temporary police IDs...');
                const updateResult = await client.query(`
                  WITH numbered AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY registration_date) AS rn
                    FROM patients
                    WHERE police_id_no IS NULL
                  )
                  UPDATE patients
                  SET police_id_no = 'PID_' || LPAD(numbered.rn::text, 6, '0')
                  FROM numbered
                  WHERE patients.id = numbered.id;
                `);
                // rowCount is not reliable for CTE UPDATE, so just log success
                console.log(`✅ Updated existing records with temporary police IDs`);
                // Step 3: Make the column NOT NULL
                console.log('📝 Setting police_id_no as NOT NULL...');
                await client.query('ALTER TABLE patients ALTER COLUMN police_id_no SET NOT NULL;');
                // Step 4: Add unique constraint
                console.log('📝 Adding UNIQUE constraint...');
                await client.query('ALTER TABLE patients ADD CONSTRAINT unique_police_id_no UNIQUE (police_id_no);');
                // Step 5: Add validation constraint
                console.log('📝 Adding validation constraint...');
                await client.query(`
                    ALTER TABLE patients 
                    ADD CONSTRAINT valid_police_id_no 
                    CHECK (LENGTH(TRIM(police_id_no)) > 0);
                `);
                // Step 6: Create index for better performance
                console.log('📝 Creating index...');
                await client.query('CREATE INDEX IF NOT EXISTS idx_patients_police_id_no ON patients(police_id_no);');
                // Commit transaction
                await client.query('COMMIT');
                console.log('🎉 Successfully added police_id_no column with all constraints!');
            } catch (error) {
                // Rollback on error
                await client.query('ROLLBACK');
                console.error('❌ Error during schema update, rolled back changes:', error);
                throw error;
            }
        } catch (error) {
            console.error('❌ Error checking/updating patients schema:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    static async addCreatedDateColumn(): Promise<void> {
        const client = await pool.connect();
        try {
            console.log('🔍 Checking patients table for created_date column...');
            
            // Check if created_date column exists
            const columnExistsQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'patients' AND column_name = 'created_date';
            `;
            
            const columnResult = await client.query(columnExistsQuery);
            
            if (columnResult.rows.length > 0) {
                console.log('✅ created_date column already exists in patients table');
                return;
            }
            
            console.log('❌ created_date column missing. Adding it now...');
            
            // Add the created_date column
            await client.query(`
              ALTER TABLE patients
              ADD COLUMN IF NOT EXISTS created_date TIMESTAMP WITH TIME ZONE
                DEFAULT CURRENT_TIMESTAMP
            `);
            console.log('✅ created_date column added (if not already present)');
            
            // Backfill for existing records if needed
            await client.query(`
              UPDATE patients
              SET created_date = registration_date
              WHERE created_date IS NULL
            `);
            console.log('✅ created_date backfilled for existing records');
            
        } catch (error) {
            console.error('❌ Error checking/updating patients schema:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}
