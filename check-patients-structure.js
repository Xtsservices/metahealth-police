const pool = require('./dist/config/database.js').default;

async function checkPatientsTable() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position;
    `);
    console.log('Patients table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) - nullable: ${row.is_nullable}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkPatientsTable();
