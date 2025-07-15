// Simple migration runner
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'metahealth_police',
    user: 'postgres',
    password: 'Prashanth',
    ssl: false
});

async function runMigration() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database', 'migrations', '004_create_auth_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Running migration: 004_create_auth_tables.sql');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Tables created: otps, sessions');
        console.log('📊 Column added: users.last_login');
        console.log('📊 Indexes created for performance');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
