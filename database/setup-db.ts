import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function setupDatabase() {
    console.log('🚀 Starting database setup...');

    // First, connect to postgres database to create our database
    const adminClient = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: 'postgres' // Connect to default postgres database
    });

    try {
        // Connect to postgres database
        await adminClient.connect();
        console.log('✅ Connected to PostgreSQL');

        // Check if database exists
        const dbCheckResult = await adminClient.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [process.env.DB_NAME || 'metahealth_police']
        );

        if (dbCheckResult.rows.length === 0) {
            // Create database
            await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME || 'metahealth_police'}`);
            console.log(`✅ Database '${process.env.DB_NAME || 'metahealth_police'}' created`);
        } else {
            console.log(`✅ Database '${process.env.DB_NAME || 'metahealth_police'}' already exists`);
        }

    } catch (error) {
        console.error('❌ Error creating database:', error);
    } finally {
        await adminClient.end();
    }

    // Now connect to our database and create tables
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'metahealth_police'
    });

    try {
        await client.connect();
        console.log(`✅ Connected to database '${process.env.DB_NAME || 'metahealth_police'}'`);

        // Read and execute migration
        const migrationPath = join(__dirname, 'migrations', '001_create_hospitals_table.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        console.log('📝 Running migration: 001_create_hospitals_table.sql');
        await client.query(migrationSQL);
        console.log('✅ Migration completed successfully');

        // Verify table creation
        const tableCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'hospitals'
        `);

        if (tableCheck.rows.length > 0) {
            console.log('✅ Hospitals table created successfully');
            
            // Check table structure
            const columnCheck = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'hospitals'
                ORDER BY ordinal_position
            `);
            
            console.log('📋 Table structure:');
            columnCheck.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type}`);
            });
        } else {
            console.log('❌ Hospitals table was not created');
        }

        console.log('🎉 Database setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        throw error;
    } finally {
        await client.end();
    }
}

// Run the setup
setupDatabase().catch(error => {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
});
