// Node.js script to fix users table for super admin support
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metahealth_police',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function fixUsersTable() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Fixing users table for super admin support...');
        
        // 1. Remove the NOT NULL constraint from hospital_id
        console.log('1️⃣ Removing NOT NULL constraint from hospital_id...');
        await client.query('ALTER TABLE users ALTER COLUMN hospital_id DROP NOT NULL');
        console.log('✅ hospital_id is now nullable');
        
        // 2. Update the role constraint to include super_admin
        console.log('2️⃣ Updating role constraint...');
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        await client.query(`ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('hospital_admin', 'system_admin', 'operator', 'super_admin'))`);
        console.log('✅ super_admin role added to constraints');
        
        // 3. Add last_login column if it doesn't exist
        console.log('3️⃣ Adding last_login column...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE');
        console.log('✅ last_login column added');
        
        console.log('\n🎉 Users table updated successfully!');
        console.log('💡 You can now restart the server with: npm run dev');
        
    } catch (error) {
        console.error('❌ Error fixing users table:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

fixUsersTable();
