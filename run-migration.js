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
        const migrationPath = path.join(__dirname, 'migrations', '009_add_base64_storage.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Running migration: 009_add_base64_storage.sql');
        
        // Execute the migration
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Column added: appointment_documents.file_data');
        console.log('📊 Indexes created for performance');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
