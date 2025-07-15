#!/usr/bin/env node

/**
 * Database Setup Script
 * This script sets up the PostgreSQL database for MetaHealth Police
 */

import { pool, testConnection, closePool } from '../src/config/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration(migrationFile: string): Promise<void> {
    try {
        const migrationPath = join(__dirname, 'migrations', migrationFile);
        const sql = readFileSync(migrationPath, 'utf8');
        
        console.log(`📝 Running migration: ${migrationFile}`);
        await pool.query(sql);
        console.log(`✅ Migration completed: ${migrationFile}`);
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`, error);
        throw error;
    }
}

async function setupDatabase(): Promise<void> {
    console.log('🚀 Starting database setup...');
    
    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Could not connect to database');
        }
        
        // Run migrations
        await runMigration('001_create_hospitals_table.sql');
        
        console.log('🎉 Database setup completed successfully!');
        
    } catch (error) {
        console.error('💥 Database setup failed:', error);
        process.exit(1);
    } finally {
        await closePool();
    }
}

// Run if called directly
if (require.main === module) {
    setupDatabase();
}

export { setupDatabase };
