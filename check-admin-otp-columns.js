require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkAdminOtpColumns() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'admin_otp'
            ORDER BY ordinal_position
        `);
        
        console.log('admin_otp table columns:');
        result.rows.forEach(row => {
            console.log(`   ${row.column_name} (${row.data_type})`);
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkAdminOtpColumns().catch(console.error);
