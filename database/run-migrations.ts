import pool from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('Starting database migrations...');
        
        // List of migrations to run in order
        const migrations = [
            '006_create_patients_table.sql',
            '007_create_appointments_table.sql'
        ];
        
        for (const migrationFile of migrations) {
            const migrationPath = path.join(__dirname, 'migrations', migrationFile);
            
            if (fs.existsSync(migrationPath)) {
                console.log(`Running migration: ${migrationFile}`);
                const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
                
                try {
                    await client.query(migrationSQL);
                    console.log(`✓ Successfully ran migration: ${migrationFile}`);
                } catch (error) {
                    console.error(`✗ Error running migration ${migrationFile}:`, error);
                    throw error;
                }
            } else {
                console.log(`Migration file not found: ${migrationPath}`);
            }
        }
        
        console.log('All migrations completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

runMigrations();
