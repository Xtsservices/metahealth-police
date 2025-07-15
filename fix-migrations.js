require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function fixMigrations() {
    const client = await pool.connect();
    try {
        console.log('🔧 Fixing migration conflicts...');
        
        // Remove the failed migration
        await client.query(`
            DELETE FROM schema_migrations 
            WHERE version = '2025.01.02_user_status_field' AND status = 'failed'
        `);
        
        console.log('✅ Removed failed migration: 2025.01.02_user_status_field');
        
        // Check if status column actually exists in users table
        const statusCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'status'
        `);
        
        if (statusCheck.rows.length > 0) {
            console.log('✅ Status column already exists in users table');
            
            // Add successful migration record for status column
            await client.query(`
                INSERT INTO schema_migrations (version, description, status)
                VALUES ('2025.01.03_user_status_column', 'Add status column to users table', 'completed')
                ON CONFLICT (version) DO NOTHING
            `);
            
            console.log('✅ Added migration record for existing status column');
        } else {
            console.log('❌ Status column missing - need to run migration');
        }
        
        // Show final migration state
        const final = await client.query('SELECT version, status FROM schema_migrations ORDER BY executed_at');
        console.log('\n📋 Final migration state:');
        final.rows.forEach(row => {
            console.log(`   ${row.version} - ${row.status}`);
        });
        
    } catch (error) {
        console.error('Error fixing migrations:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

fixMigrations().catch(console.error);
