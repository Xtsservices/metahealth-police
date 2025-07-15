const pool = require('./dist/config/database.js').default;

async function dropAndRecreatePatients() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Dropping existing patients table...');
    
    // Drop the table if it exists (CASCADE will remove any dependent objects)
    await client.query('DROP TABLE IF EXISTS patients CASCADE');
    console.log('✅ Dropped patients table');
    
    // Also drop appointments table since it references patients
    await client.query('DROP TABLE IF EXISTS appointments CASCADE');
    console.log('✅ Dropped appointments table');
    
    console.log('🔄 Recreating patients table with police_id_no from original migration...');
    
    // Create patients table exactly as in the original migration
    await client.query(`
      CREATE TABLE patients (
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
    `);
    
    console.log('✅ Created patients table');
    
    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
      CREATE INDEX IF NOT EXISTS idx_patients_aadhar ON patients(aadhar);
      CREATE INDEX IF NOT EXISTS idx_patients_police_id ON patients(police_id_no);
      CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
      CREATE INDEX IF NOT EXISTS idx_patients_created_date ON patients(created_date);
    `);
    
    console.log('✅ Created indexes');
    
    // Create trigger function if not exists
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create trigger to automatically update updated_at
    await client.query(`
      CREATE TRIGGER update_patients_updated_at 
        BEFORE UPDATE ON patients 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Created triggers');
    
    // Now create appointments table
    await client.query(`
      CREATE TABLE appointments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
        purpose VARCHAR(255) NOT NULL DEFAULT 'General Consultation',
        notes TEXT,
        created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT valid_appointment_purpose CHECK (LENGTH(TRIM(purpose)) > 0)
      );
    `);
    
    console.log('✅ Created appointments table');
    
    // Create indexes for appointments
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_appointments_created_date ON appointments(created_date);
    `);
    
    // Create trigger for appointments
    await client.query(`
      CREATE TRIGGER update_appointments_updated_at 
        BEFORE UPDATE ON appointments 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Created appointments indexes and triggers');
    
    console.log('🎉 Successfully recreated both tables with proper structure!');
    
  } catch (error) {
    console.error('❌ Error recreating tables:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

dropAndRecreatePatients();
