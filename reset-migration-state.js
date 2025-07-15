require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function resetMigrationState() {
    const client = await pool.connect();
    try {
        console.log('🔄 Resetting migration state for fresh deployment...');
        
        // 1. Check current migration records
        const current = await client.query('SELECT version, status FROM schema_migrations ORDER BY executed_at');
        console.log(`\n📋 Current migrations (${current.rows.length}):`);
        current.rows.forEach(row => {
            const status = row.status === 'completed' ? '✅' : '❌';
            console.log(`   ${status} ${row.version}`);
        });
        
        // 2. Mark all existing columns as properly migrated
        const expectedMigrations = [
            { version: '2025.01.01_hospital_approval_fields', columns: ['approval_status', 'approved_by', 'approved_at', 'approval_notes'], table: 'hospitals' },
            { version: '2025.01.03_user_status_column', columns: ['status'], table: 'users' },
            { version: '2025.01.07_user_active_status', columns: ['is_active'], table: 'users' },
            { version: '2025.01.04_patient_address_fields', columns: ['address_city', 'address_state'], table: 'patients' },
            { version: '2025.01.05_hospital_business_fields', columns: ['gst_number', 'pan_number', 'mobile_number'], table: 'hospitals' },
            { version: '2025.01.06_appointment_documents_base64', columns: ['file_data'], table: 'appointment_documents' }
        ];
        
        console.log('\n🔍 Checking and updating migration records...');
        for (const migration of expectedMigrations) {
            // Check if columns exist
            let allColumnsExist = true;
            for (const column of migration.columns) {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [migration.table, column]);
                
                if (columnCheck.rows.length === 0) {
                    allColumnsExist = false;
                    console.log(`   ❌ ${migration.table}.${column} missing`);
                    break;
                }
            }
            
            if (allColumnsExist) {
                // Mark migration as completed
                await client.query(`
                    INSERT INTO schema_migrations (version, description, status)
                    VALUES ($1, $2, 'completed')
                    ON CONFLICT (version) DO UPDATE SET 
                    status = 'completed',
                    executed_at = CURRENT_TIMESTAMP
                `, [migration.version, `Migration for ${migration.table} table`]);
                
                console.log(`   ✅ ${migration.version} - marked as completed`);
            }
        }
        
        // 3. Remove any failed migration records
        const deleteResult = await client.query(`
            DELETE FROM schema_migrations 
            WHERE status = 'failed'
        `);
        
        if (deleteResult.rowCount > 0) {
            console.log(`\n🧹 Removed ${deleteResult.rowCount} failed migration records`);
        }
        
        // 4. Show final state
        const final = await client.query('SELECT version, status FROM schema_migrations ORDER BY executed_at');
        console.log(`\n📋 Final migration state (${final.rows.length}):`);
        final.rows.forEach(row => {
            const status = row.status === 'completed' ? '✅' : '❌';
            console.log(`   ${status} ${row.version}`);
        });
        
        console.log('\n🎉 Migration state reset complete!');
        console.log('📝 Next steps for your colleague:');
        console.log('   1. Pull the latest code with SQL syntax fixes');
        console.log('   2. Run npm start - migrations should work smoothly');
        console.log('   3. No duplicate key errors expected');
        
    } catch (error) {
        console.error('❌ Migration reset failed:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

resetMigrationState().catch(console.error);
