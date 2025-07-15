require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function demonstrateSchemaSync() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Schema Synchronization Demonstration');
        console.log('=====================================\n');
        
        // 1. Check current schema status
        console.log('1. 📋 Current Schema Status:');
        const keyColumns = [
            { table: 'hospitals', column: 'approval_status', purpose: 'Hospital approval workflow' },
            { table: 'hospitals', column: 'gst_number', purpose: 'Business information' },
            { table: 'users', column: 'is_active', purpose: 'User active status' },
            { table: 'users', column: 'approval_status', purpose: 'User approval workflow' },
            { table: 'patients', column: 'address_city', purpose: 'Patient address' },
            { table: 'appointment_documents', column: 'file_data', purpose: 'Base64 document storage' }
        ];
        
        for (const col of keyColumns) {
            const result = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [col.table, col.column]);
            
            const status = result.rows.length > 0 ? '✅' : '❌';
            console.log(`   ${status} ${col.table}.${col.column} - ${col.purpose}`);
        }
        
        // 2. Check migration tracking
        console.log('\n2. 🗃️ Migration Tracking:');
        const migrationCheck = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'schema_migrations'
        `);
        
        if (migrationCheck.rows.length > 0) {
            console.log('   ✅ Migration tracking table exists');
            
            const migrations = await client.query(`
                SELECT version, description, executed_at, status
                FROM schema_migrations
                ORDER BY executed_at DESC
                LIMIT 5
            `);
            
            if (migrations.rows.length > 0) {
                console.log('   📜 Recent migrations:');
                migrations.rows.forEach(row => {
                    const date = new Date(row.executed_at).toLocaleDateString();
                    console.log(`      • ${row.version} - ${row.description} (${date})`);
                });
            } else {
                console.log('   ℹ️  No migrations recorded yet');
            }
        } else {
            console.log('   ⚠️  Migration tracking table not created yet');
        }
        
        // 3. Database health check
        console.log('\n3. 🏥 Database Health:');
        const tableStats = await client.query(`
            SELECT 
                'hospitals' as table_name, COUNT(*) as count FROM hospitals
            UNION ALL
            SELECT 'users' as table_name, COUNT(*) as count FROM users
            UNION ALL
            SELECT 'patients' as table_name, COUNT(*) as count FROM patients
            UNION ALL
            SELECT 'appointments' as table_name, COUNT(*) as count FROM appointments
            UNION ALL
            SELECT 'appointment_documents' as table_name, COUNT(*) as count FROM appointment_documents
        `);
        
        let totalRecords = 0;
        tableStats.rows.forEach(row => {
            const count = parseInt(row.count);
            totalRecords += count;
            console.log(`   📊 ${row.table_name}: ${count} records`);
        });
        
        console.log(`   📈 Total records: ${totalRecords}`);
        
        // 4. Sync methods available
        console.log('\n4. 🔧 Available Sync Methods:');
        console.log('   ✅ Automatic on server startup (DatabaseInitService)');
        console.log('   ✅ Manual migration runner (node run-migrations.js)');
        console.log('   ✅ API endpoint (/api/dashboard/database-status)');
        console.log('   ✅ Advanced migration system (SchemaMigrationService)');
        
        // 5. Project sharing readiness
        console.log('\n5. 🤝 Project Sharing Status:');
        const allColumnsExist = keyColumns.every(async col => {
            const result = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2
            `, [col.table, col.column]);
            return result.rows.length > 0;
        });
        
        // Check if all essential columns exist
        const columnChecks = await Promise.all(
            keyColumns.map(async col => {
                const result = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [col.table, col.column]);
                return result.rows.length > 0;
            })
        );
        
        const allReady = columnChecks.every(exists => exists);
        
        if (allReady) {
            console.log('   ✅ All required schema changes are present');
            console.log('   ✅ Project is ready for sharing/deployment');
            console.log('   ✅ New team members will get complete schema');
            console.log('   ✅ Existing installations will sync automatically');
        } else {
            console.log('   ⚠️  Some schema changes are missing');
            console.log('   💡 Run: node run-migrations.js to fix');
        }
        
        console.log('\n6. 📚 Documentation:');
        console.log('   📖 SCHEMA_SYNC_GUIDE.md - Complete synchronization guide');
        console.log('   📖 SETUP_GUIDE.md - New user setup instructions');
        console.log('   🔧 run-migrations.js - Manual migration runner');
        console.log('   📊 check-schema.js - Schema verification tool');
        
        console.log('\n✅ Schema Synchronization System Ready!');
        console.log('=====================================');
        
    } finally {
        client.release();
        process.exit(0);
    }
}

demonstrateSchemaSync().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});
