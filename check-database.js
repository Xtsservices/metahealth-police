// Check current database state
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'metahealth_police',
    user: 'postgres',
    password: 'Prashanth',
    ssl: false
});

async function checkDatabase() {
    try {
        console.log('🔄 Connecting to database...');
        
        // Check if tables exist
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;
        
        const result = await pool.query(tablesQuery);
        console.log('📊 Existing tables:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        // Check users table structure if it exists
        const usersCheck = result.rows.find(row => row.table_name === 'users');
        if (usersCheck) {
            console.log('\n📊 Users table columns:');
            const columnsQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'users' AND table_schema = 'public'
                ORDER BY ordinal_position;
            `;
            const columnsResult = await pool.query(columnsQuery);
            columnsResult.rows.forEach(row => {
                console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        } else {
            console.log('\n❌ Users table does not exist!');
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        await pool.end();
    }
}

checkDatabase();
