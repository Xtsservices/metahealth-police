require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function testMigration() {
    const client = await pool.connect();
    try {
        console.log('🧪 Testing migration insertion...');
        
        // Try to insert a test migration record
        await client.query(`
            INSERT INTO schema_migrations (version, description, status)
            VALUES ('test_migration_123', 'Test migration for column compatibility', 'completed')
            ON CONFLICT (version) DO NOTHING
        `);
        
        console.log('✅ Migration insertion successful');
        
        // Check current migrations
        const migrations = await client.query(`
            SELECT version, status, executed_at 
            FROM schema_migrations 
            ORDER BY executed_at DESC 
            LIMIT 5
        `);
        
        console.log('\n📋 Recent migrations:');
        migrations.rows.forEach(row => {
            console.log(`   ${row.version} - ${row.status} (${new Date(row.executed_at).toLocaleString()})`);
        });
        
        // Clean up test migration
        await client.query(`
            DELETE FROM schema_migrations 
            WHERE version = 'test_migration_123'
        `);
        
        console.log('\n✅ Test migration cleaned up');
        
    } catch (error) {
        console.error('❌ Migration test failed:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

testMigration().catch(console.error);
