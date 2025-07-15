require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkSessionTables() {
    const client = await pool.connect();
    try {
        // Check if sessions table exists
        const sessionTableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'sessions'
            );
        `);
        
        console.log('Sessions table exists:', sessionTableCheck.rows[0].exists);
        
        // Check if admin_sessions table exists
        const adminSessionTableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admin_sessions'
            );
        `);
        
        console.log('Admin_sessions table exists:', adminSessionTableCheck.rows[0].exists);
        
        // If admin_sessions exists, show its columns
        if (adminSessionTableCheck.rows[0].exists) {
            const columns = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'admin_sessions'
                ORDER BY ordinal_position
            `);
            
            console.log('\nadmin_sessions table columns:');
            columns.rows.forEach(row => {
                console.log(`   ${row.column_name} (${row.data_type})`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkSessionTables().catch(console.error);
