const pool = require('./dist/config/database.js').default;

async function checkTables() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking existing tables...');
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Existing tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if patients table exists
    const patientsExists = result.rows.some(row => row.table_name === 'patients');
    
    if (patientsExists) {
      console.log('\n🔍 Checking patients table structure...');
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'patients' 
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Patients table columns:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type}) - nullable: ${row.is_nullable}`);
      });
      
      // Check if police_id_no exists
      const hasPoliceId = columnsResult.rows.some(row => row.column_name === 'police_id_no');
      console.log(`\n🏷️  police_id_no column exists: ${hasPoliceId}`);
      
    } else {
      console.log('\n❌ Patients table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkTables();
