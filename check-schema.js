require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        console.log('📋 Current Database Schema:');
        
        // Check which tables exist
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('\n🏗️ Existing Tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   ✅ ${row.table_name}`);
        });
        
        // Check specific columns we're concerned about
        const columnsResult = await client.query(`
            SELECT table_name, column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('hospitals', 'users', 'patients') 
            ORDER BY table_name, ordinal_position
        `);
        
        console.log('\n🔍 Key Table Columns:');
        let currentTable = '';
        columnsResult.rows.forEach(row => {
            if (row.table_name !== currentTable) {
                console.log(`\n🔹 ${row.table_name.toUpperCase()}:`);
                currentTable = row.table_name;
            }
            const nullable = row.is_nullable === 'NO' ? ' NOT NULL' : '';
            const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
            console.log(`   ${row.column_name} (${row.data_type}${nullable}${defaultVal})`);
        });
        
        // Check schema_migrations table structure
        console.log('\n🔍 schema_migrations Table Structure:');
        const migrationColumns = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'schema_migrations'
            ORDER BY ordinal_position
        `);
        
        migrationColumns.rows.forEach(row => {
            const nullable = row.is_nullable === 'NO' ? ' NOT NULL' : '';
            const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
            console.log(`   ${row.column_name} (${row.data_type}${nullable}${defaultVal})`);
        });
        
        // Check for newly added columns
        console.log('\n🔄 Schema Sync Status:');
        const newColumns = [
            { table: 'hospitals', column: 'approval_status' },
            { table: 'hospitals', column: 'approved_by' },
            { table: 'hospitals', column: 'gst_number' },
            { table: 'users', column: 'is_active' },
            { table: 'users', column: 'approval_status' },
            { table: 'users', column: 'status' },
            { table: 'patients', column: 'address_city' },
            { table: 'patients', column: 'address_state' }
        ];
        
        for (const col of newColumns) {
            const result = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [col.table, col.column]);
            
            const exists = result.rows.length > 0;
            console.log(`   ${exists ? '✅' : '❌'} ${col.table}.${col.column}`);
        }
        
    } finally {
        client.release();
        process.exit(0);
    }
}

checkSchema().catch(console.error);
