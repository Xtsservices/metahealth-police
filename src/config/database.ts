import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables first
dotenv.config();

// Database configuration - use simple individual parameters
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'metahealth_police',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || ''), // Ensure password is a string
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000, // Increase timeout
    // Disable SSL for local development
    ssl: false,
};

// Log configuration (without password for security)
console.log('📊 Database Configuration:', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password ? '***' : '(empty)',
    passwordType: typeof dbConfig.password,
    passwordLength: dbConfig.password.length
});

// Create PostgreSQL connection pool
export const pool = new Pool(dbConfig);

// Handle pool events
pool.on('connect', (client) => {
    console.log('🔌 New database client connected');
});

pool.on('error', (err, client) => {
    console.error('💥 Unexpected error on idle database client', err);
    process.exit(-1);
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
    try {
        await pool.end();
        console.log('🔌 Database pool closed');
    } catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
};

export default pool;
