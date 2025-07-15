require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkUsersTable() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 USERS TABLE SCHEMA:');
        result.rows.forEach(row => {
            const nullable = row.is_nullable === 'NO' ? ' NOT NULL' : '';
            const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
            console.log(`   ${row.column_name} (${row.data_type}${nullable}${defaultVal})`);
        });
    } finally {
        client.release();
        process.exit(0);
    }
}

checkUsersTable().catch(console.error);
