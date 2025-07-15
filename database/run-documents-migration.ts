import pool from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function runDocumentsMigration() {
    const client = await pool.connect();
    
    try {
        console.log('Running appointment documents migration...');
        
        const migrationPath = path.join(__dirname, 'migrations', '008_create_appointment_documents_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query(migrationSQL);
        console.log('✓ Appointment documents table created successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

runDocumentsMigration();
