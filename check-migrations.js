require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkMigrations() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking Migration Status:');
        
        // Check if schema_migrations table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'schema_migrations'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.log('❌ schema_migrations table does not exist');
            return;
        }
        
        console.log('✅ schema_migrations table exists');
        
        // Check table structure first
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'schema_migrations'
            ORDER BY ordinal_position
        `);
        
        console.log('\n🏗️ schema_migrations table structure:');
        columns.rows.forEach(col => {
            console.log(`   ${col.column_name} (${col.data_type})`);
        });
        
        // Get all migration records
        const migrations = await client.query(`
            SELECT * FROM schema_migrations 
            ORDER BY version DESC
        `);
        
        console.log(`\n📊 Migration Records (${migrations.rows.length} total):`);
        migrations.rows.forEach(row => {
            console.log(`${row.version} - Success: ${row.success || 'N/A'}`);
            if (row.error_message) {
                console.log(`   Error: ${row.error_message.substring(0, 100)}...`);
            }
        });
        
        // Check for duplicates
        const duplicates = await client.query(`
            SELECT version, COUNT(*) as count
            FROM schema_migrations 
            GROUP BY version 
            HAVING COUNT(*) > 1
        `);
        
        if (duplicates.rows.length > 0) {
            console.log('\n⚠️ Duplicate Migration Versions Found:');
            duplicates.rows.forEach(row => {
                console.log(`   ${row.version} (${row.count} times)`);
            });
        } else {
            console.log('\n✅ No duplicate migration versions found');
        }
        
    } catch (error) {
        console.error('Error checking migrations:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkMigrations().catch(console.error);
