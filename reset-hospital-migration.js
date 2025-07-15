require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function resetFailedMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Resetting failed migration...');
        
        // Delete the failed migration record
        const result = await client.query(`
            DELETE FROM schema_migrations 
            WHERE version = '2025.01.01_hospital_approval_fields'
            RETURNING version
        `);
        
        if (result.rows.length > 0) {
            console.log('✅ Reset migration 2025.01.01_hospital_approval_fields');
        } else {
            console.log('ℹ️  Migration 2025.01.01_hospital_approval_fields was not found in tracking table');
        }
        
        console.log('🎯 Migration reset complete. Restart the application to retry.');
        
    } catch (error) {
        console.error('❌ Error resetting migration:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

resetFailedMigration().catch(console.error);
