// Run Migration: Add approval tracking columns
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metahealth_police',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Running migration: Add approval tracking columns...');
        
        const migrationPath = path.join(__dirname, 'database/migrations/006_add_approval_tracking_columns.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        console.log('   Added columns: approved_date, approved_by, rejected_date, rejected_by, rejection_reason');
        console.log('   Tables updated: hospitals, users');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(console.error);
