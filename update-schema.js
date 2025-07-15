const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function updateSchema() {
    try {
        console.log('🔄 Updating database schema...');
        
        // Add new columns
        await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15)');
        await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10)');
        await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS contact_country_code VARCHAR(5)');
        await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS contact_mobile VARCHAR(20)');
        
        console.log('✅ New columns added successfully!');
        
        // Check current table structure
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'hospitals' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Current table structure:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
    } finally {
        await pool.end();
    }
}

updateSchema();
