const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function updateSchemaForUniqueFields() {
    try {
        console.log('🔄 Updating database schema for unique fields and point of contact...');
        
        // Add point of contact field
        await pool.query('ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS contact_point_of_contact VARCHAR(255)');
        
        // Drop mobile and website columns if they exist
        await pool.query('ALTER TABLE hospitals DROP COLUMN IF EXISTS contact_mobile');
        await pool.query('ALTER TABLE hospitals DROP COLUMN IF EXISTS contact_website');
        
        // Add unique constraints for GST and PAN
        await pool.query('ALTER TABLE hospitals ADD CONSTRAINT unique_gst_number UNIQUE (gst_number)');
        await pool.query('ALTER TABLE hospitals ADD CONSTRAINT unique_pan_number UNIQUE (pan_number)');
        
        console.log('✅ Schema updated successfully!');
        
        // Check current table structure
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'hospitals' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Updated table structure:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // Check constraints
        const constraints = await pool.query(`
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'hospitals' AND constraint_type = 'UNIQUE'
        `);
        
        console.log('🔒 Unique constraints:');
        constraints.rows.forEach(row => {
            console.log(`  - ${row.constraint_name}`);
        });
        
    } catch (error) {
        console.error('❌ Schema update failed:', error.message);
    } finally {
        await pool.end();
    }
}

updateSchemaForUniqueFields();
