require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function cleanFailedMigrations() {
    const client = await pool.connect();
    try {
        console.log('🧹 Cleaning failed migrations...');
        
        // Check current failed migrations
        const failed = await client.query(`
            SELECT version, status, executed_at 
            FROM schema_migrations 
            WHERE status = 'failed'
            ORDER BY executed_at DESC
        `);
        
        console.log(`\n❌ Failed migrations (${failed.rows.length}):`);
        failed.rows.forEach(row => {
            console.log(`   ${row.version} - ${row.status}`);
        });
        
        // Check if the columns actually exist for failed migrations
        for (const migration of failed.rows) {
            if (migration.version === '2025.01.04_patient_address_fields') {
                // Check if address_city column exists
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'patients' AND column_name = 'address_city'
                `);
                
                if (columnCheck.rows.length > 0) {
                    console.log(`✅ address_city column exists - marking migration as completed`);
                    await client.query(`
                        UPDATE schema_migrations 
                        SET status = 'completed' 
                        WHERE version = '2025.01.04_patient_address_fields'
                    `);
                }
            }
        }
        
        // Show final state
        const final = await client.query(`
            SELECT version, status 
            FROM schema_migrations 
            ORDER BY executed_at DESC
        `);
        
        console.log(`\n📋 Final migration state (${final.rows.length}):`);
        final.rows.forEach(row => {
            const status = row.status === 'completed' ? '✅' : '❌';
            console.log(`   ${status} ${row.version}`);
        });
        
    } catch (error) {
        console.error('Error cleaning failed migrations:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

cleanFailedMigrations().catch(console.error);
