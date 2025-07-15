require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function testMigrationSQL() {
    const client = await pool.connect();
    try {
        console.log('🧪 Testing migration SQL syntax...');
        
        // Test the first migration SQL that was failing
        const testSQL = `
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS test_approval_status VARCHAR(20) NOT NULL DEFAULT 'pending';
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS test_approved_by UUID;
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS test_approved_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS test_approval_notes TEXT;
        `;
        
        console.log('Testing SQL syntax...');
        await client.query(testSQL);
        console.log('✅ SQL syntax is valid');
        
        // Clean up test columns
        const cleanupSQL = `
            ALTER TABLE hospitals DROP COLUMN IF EXISTS test_approval_notes;
            ALTER TABLE hospitals DROP COLUMN IF EXISTS test_approved_at;
            ALTER TABLE hospitals DROP COLUMN IF EXISTS test_approved_by;
            ALTER TABLE hospitals DROP COLUMN IF EXISTS test_approval_status;
        `;
        
        await client.query(cleanupSQL);
        console.log('✅ Test columns cleaned up');
        
        // Test ON CONFLICT syntax
        console.log('\nTesting ON CONFLICT migration record...');
        await client.query(`
            INSERT INTO schema_migrations (version, description, status)
            VALUES ('test_conflict_123', 'Test conflict handling', 'completed')
            ON CONFLICT (version) DO UPDATE SET 
            status = 'completed', 
            executed_at = CURRENT_TIMESTAMP
        `);
        
        console.log('✅ ON CONFLICT syntax works');
        
        // Clean up test migration
        await client.query(`DELETE FROM schema_migrations WHERE version = 'test_conflict_123'`);
        console.log('✅ Test migration cleaned up');
        
        console.log('\n🎉 All migration fixes validated successfully!');
        
    } catch (error) {
        console.error('❌ Migration test failed:', error.message);
        console.error('Error details:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

testMigrationSQL().catch(console.error);
