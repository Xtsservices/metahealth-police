import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testSimpleConnection() {
    console.log('🔌 Testing simple PostgreSQL connection...');
    
    // Test with individual parameters
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'postgres', // Try connecting to default postgres database first
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL successfully!');
        
        const result = await client.query('SELECT version()');
        console.log('📊 PostgreSQL version:', result.rows[0].version);
        
        // Test if our database exists
        const dbCheck = await client.query(`
            SELECT datname FROM pg_database WHERE datname = '${process.env.DB_NAME}'
        `);
        
        if (dbCheck.rows.length > 0) {
            console.log(`✅ Database '${process.env.DB_NAME}' exists`);
        } else {
            console.log(`❌ Database '${process.env.DB_NAME}' does not exist`);
            console.log('Creating database...');
            await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log(`✅ Database '${process.env.DB_NAME}' created successfully`);
        }
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
    } finally {
        await client.end();
    }
}

testSimpleConnection();
