const pool = require('./dist/config/database.js').default;

async function createPatientsTable() {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating patients table with police_id_no...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(20) NOT NULL UNIQUE,
        aadhar VARCHAR(20) NOT NULL UNIQUE,
        police_id_no VARCHAR(50) NOT NULL UNIQUE,
        date_of_birth DATE,
        gender VARCHAR(20),
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_state VARCHAR(100),
        address_zip_code VARCHAR(20),
        address_country VARCHAR(100),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relation VARCHAR(100),
        blood_group VARCHAR(10),
        medical_conditions TEXT,
        allergies TEXT,
        current_medications TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT valid_patient_name CHECK (LENGTH(TRIM(name)) > 0),
        CONSTRAINT valid_patient_mobile CHECK (LENGTH(TRIM(mobile)) >= 10),
        CONSTRAINT valid_patient_aadhar CHECK (LENGTH(TRIM(aadhar)) >= 12),
        CONSTRAINT valid_police_id_no CHECK (LENGTH(TRIM(police_id_no)) > 0)
      );
    `);
    
    console.log('✅ Created patients table');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_mobile ON patients(mobile);
      CREATE INDEX IF NOT EXISTS idx_patients_aadhar ON patients(aadhar);
      CREATE INDEX IF NOT EXISTS idx_patients_police_id_no ON patients(police_id_no);
      CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
      CREATE INDEX IF NOT EXISTS idx_patients_registration_date ON patients(registration_date);
    `);
    
    console.log('✅ Created indexes');
    
    // Create update trigger function if not exists
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Create trigger for auto-updating updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
      CREATE TRIGGER update_patients_updated_at 
        BEFORE UPDATE ON patients 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Created triggers');
    
    console.log('🎉 Successfully created patients table with police_id_no field!');
    
  } catch (error) {
    console.error('❌ Error creating patients table:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

createPatientsTable();
