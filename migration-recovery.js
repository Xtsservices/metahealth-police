/**
 * Meta Health Police Migration Auto-Recovery Script
 * 
 * This script automatically fixes common migration issues:
 * 1. Creates the migration tracking table if it doesn't exist
 * 2. Attempts to fix failed migrations
 * 3. Provides status information
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function autoRecoverMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('🩺 Starting migration auto-recovery...');
        
        // Check if migration table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'schema_migrations'
            );
        `);
        
        const migrationTableExists = tableCheck.rows[0].exists;
        
        if (!migrationTableExists) {
            console.log('⚠️ Migration tracking table does not exist, creating it...');
            
            await client.query(`
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    id SERIAL PRIMARY KEY,
                    version VARCHAR(255) NOT NULL UNIQUE,
                    description TEXT NOT NULL,
                    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'rolled_back'))
                );
                
                CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
            `);
            
            console.log('✅ Migration tracking table created successfully');
        }
        
        // Check migrations status
        const migrations = await client.query(`
            SELECT version, status, executed_at 
            FROM schema_migrations 
            ORDER BY executed_at
        `);
        
        console.log('\n📋 Migration Status:');
        console.log('--------------------------------------------------');
        
        let completedCount = 0;
        let failedCount = 0;
        let rolledBackCount = 0;
        
        migrations.rows.forEach(row => {
            const status = row.status === 'completed' ? '✅' : (row.status === 'failed' ? '❌' : '⏮️');
            console.log(`${status} ${row.version} (${row.status})`);
            
            if (row.status === 'completed') {
                completedCount++;
            } else if (row.status === 'failed') {
                failedCount++;
            } else if (row.status === 'rolled_back') {
                rolledBackCount++;
            }
        });
        
        console.log('--------------------------------------------------');
        console.log(`Total migrations: ${migrations.rows.length}`);
        console.log(`✅ Completed: ${completedCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log(`⏮️ Rolled back: ${rolledBackCount}`);
        
        // Reset failed migrations
        if (failedCount > 0) {
            console.log('\n🔄 Resetting failed migrations...');
            
            for (const row of migrations.rows) {
                if (row.status === 'failed') {
                    await client.query(`
                        DELETE FROM schema_migrations WHERE version = $1
                    `, [row.version]);
                    
                    console.log(`✅ Reset migration ${row.version}`);
                }
            }
        }
        
        console.log('\n🏁 Recovery complete!');
        console.log('Please restart the application to apply pending migrations.');
        
    } catch (error) {
        console.error('❌ Error during migration recovery:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

autoRecoverMigrations().catch(console.error);
