const pool = require('./dist/config/database.js').default;

async function createAppointmentsTable() {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating appointments table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
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
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_appointments_created_date ON appointments(created_date);
    `);
    
    console.log('✅ Created indexes');
    
    // Create trigger for auto-updating updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
      CREATE TRIGGER update_appointments_updated_at 
        BEFORE UPDATE ON appointments 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Created triggers');
    
    console.log('🎉 Successfully created appointments table!');
    
  } catch (error) {
    console.error('❌ Error creating appointments table:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

createAppointmentsTable();
