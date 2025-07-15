const pool = require('./dist/config/database.js').default;
const fs = require('fs');

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Adding police_id_no column to patients table...');
    
    // Execute migration step by step
    await client.query('ALTER TABLE patients ADD COLUMN IF NOT EXISTS police_id_no VARCHAR(50)');
    console.log('✅ Added police_id_no column');
    
    // Update existing records with temporary values
    await client.query("UPDATE patients SET police_id_no = 'PID_' || id::text WHERE police_id_no IS NULL");
    console.log('✅ Updated existing records with temporary police IDs');
    
    // Make it NOT NULL
    await client.query('ALTER TABLE patients ALTER COLUMN police_id_no SET NOT NULL');
    console.log('✅ Set police_id_no as NOT NULL');
    
    // Add unique constraint
    await client.query('ALTER TABLE patients ADD CONSTRAINT unique_police_id_no UNIQUE (police_id_no)');
    console.log('✅ Added unique constraint');
    
    // Add validation constraint
    await client.query("ALTER TABLE patients ADD CONSTRAINT valid_police_id_no CHECK (LENGTH(TRIM(police_id_no)) > 0)");
    console.log('✅ Added validation constraint');
    
    // Create index
    await client.query('CREATE INDEX IF NOT EXISTS idx_patients_police_id_no ON patients(police_id_no)');
    console.log('✅ Created index');
    
    console.log('🎉 Successfully added police_id_no column to patients table');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

applyMigration();
