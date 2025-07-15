require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function cleanMigrations() {
    const client = await pool.connect();
    try {
        console.log('🧹 Cleaning up migration table...');
        
        // Show current migrations
        const current = await client.query('SELECT * FROM schema_migrations ORDER BY executed_at');
        console.log(`\n📋 Current migrations (${current.rows.length}):`);
        current.rows.forEach(row => {
            console.log(`   ${row.version} - ${row.status}`);
        });
        
        // Remove duplicates if any
        await client.query(`
            DELETE FROM schema_migrations 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM schema_migrations 
                GROUP BY version
            )
        `);
        
        // Update all to completed status if they don't have errors
        await client.query(`
            UPDATE schema_migrations 
            SET status = 'completed' 
            WHERE status IS NULL OR status = ''
        `);
        
        console.log('\n✅ Migration table cleaned up');
        
        // Show final state
        const final = await client.query('SELECT * FROM schema_migrations ORDER BY executed_at');
        console.log(`\n📋 Final migrations (${final.rows.length}):`);
        final.rows.forEach(row => {
            console.log(`   ${row.version} - ${row.status}`);
        });
        
    } catch (error) {
        console.error('Error cleaning migrations:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

cleanMigrations().catch(console.error);
