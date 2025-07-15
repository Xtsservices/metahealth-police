const pool = require('./dist/config/database.js').default;

async function addPoliceIdColumnIfNotExists() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking if police_id_no column exists in patients table...');
    
    // Check if patients table exists
    const tableExistsQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'patients';
    `;
    
    const tableResult = await client.query(tableExistsQuery);
    
    if (tableResult.rows.length === 0) {
      console.log('❌ Patients table does not exist. Please create the table first.');
      return;
    }
    
    console.log('✅ Patients table exists');
    
    // Check if police_id_no column exists
    const columnExistsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'patients' AND column_name = 'police_id_no';
    `;
    
    const columnResult = await client.query(columnExistsQuery);
    
    if (columnResult.rows.length > 0) {
      console.log('✅ police_id_no column already exists in patients table');
      
      // Check if it has unique constraint
      const constraintQuery = `
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'patients' 
        AND kcu.column_name = 'police_id_no' 
        AND tc.constraint_type = 'UNIQUE';
      `;
      
      const constraintResult = await client.query(constraintQuery);
      
      if (constraintResult.rows.length === 0) {
        console.log('⚠️  Adding missing UNIQUE constraint...');
        try {
          await client.query('ALTER TABLE patients ADD CONSTRAINT unique_police_id_no UNIQUE (police_id_no);');
          console.log('✅ Added UNIQUE constraint to police_id_no');
        } catch (error) {
          console.log('⚠️  Could not add UNIQUE constraint (may already exist or have duplicate values):', error.message);
        }
      } else {
        console.log('✅ UNIQUE constraint already exists on police_id_no');
      }
      
      return;
    }
    
    console.log('❌ police_id_no column does not exist. Adding it now...');
    
    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Step 1: Add the column as nullable first
      console.log('📝 Step 1: Adding police_id_no column...');
      await client.query('ALTER TABLE patients ADD COLUMN police_id_no VARCHAR(50);');
      
      // Step 2: Update existing records with temporary unique values
      console.log('📝 Step 2: Updating existing records with temporary police IDs...');
      const updateResult = await client.query(`
        UPDATE patients 
        SET police_id_no = 'PID_' || LPAD(ROW_NUMBER() OVER (ORDER BY created_date)::text, 6, '0')
        WHERE police_id_no IS NULL;
      `);
      
      if (updateResult.rowCount > 0) {
        console.log(`✅ Updated ${updateResult.rowCount} existing records with temporary police IDs`);
      }
      
      // Step 3: Make the column NOT NULL
      console.log('📝 Step 3: Setting police_id_no as NOT NULL...');
      await client.query('ALTER TABLE patients ALTER COLUMN police_id_no SET NOT NULL;');
      
      // Step 4: Add unique constraint
      console.log('📝 Step 4: Adding UNIQUE constraint...');
      await client.query('ALTER TABLE patients ADD CONSTRAINT unique_police_id_no UNIQUE (police_id_no);');
      
      // Step 5: Add validation constraint
      console.log('📝 Step 5: Adding validation constraint...');
      await client.query(`
        ALTER TABLE patients 
        ADD CONSTRAINT valid_police_id_no 
        CHECK (LENGTH(TRIM(police_id_no)) > 0);
      `);
      
      // Step 6: Create index for better performance
      console.log('📝 Step 6: Creating index...');
      await client.query('CREATE INDEX IF NOT EXISTS idx_patients_police_id_no ON patients(police_id_no);');
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('🎉 Successfully added police_id_no column with all constraints and indexes!');
      
      // Show some sample data
      console.log('\n📋 Sample of updated patient records:');
      const sampleQuery = await client.query(`
        SELECT id, name, mobile, police_id_no, created_date 
        FROM patients 
        ORDER BY created_date 
        LIMIT 5;
      `);
      
      if (sampleQuery.rows.length > 0) {
        sampleQuery.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.name} - Police ID: ${row.police_id_no}`);
        });
      } else {
        console.log('  No existing patient records found.');
      }
      
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('❌ Error during migration, rolled back changes:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error checking/adding police_id_no column:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run the script
addPoliceIdColumnIfNotExists();
