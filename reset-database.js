const { Pool } = require('pg');
const readline = require('readline');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metahealth_police',
    password: process.env.DB_PASSWORD || 'Prashanth',
    port: parseInt(process.env.DB_PORT || '5432'),
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetDatabase() {
    console.log('🚨 DATABASE RESET UTILITY 🚨');
    console.log('This will DROP ALL TABLES and recreate them from scratch!');
    console.log('⚠️  ALL DATA WILL BE LOST! ⚠️');
    
    rl.question('\nAre you sure you want to continue? (type "YES" to confirm): ', async (answer) => {
        if (answer !== 'YES') {
            console.log('❌ Operation cancelled.');
            rl.close();
            await pool.end();
            return;
        }

        const client = await pool.connect();
        
        try {
            console.log('\n🔥 Dropping all tables...');
            
            // Drop tables in reverse dependency order
            const dropTables = [
                'DROP TABLE IF EXISTS appointment_documents CASCADE',
                'DROP TABLE IF EXISTS appointments CASCADE',
                'DROP TABLE IF EXISTS patients CASCADE',
                'DROP TABLE IF EXISTS patient_sessions CASCADE',
                'DROP TABLE IF EXISTS patient_otp CASCADE',
                'DROP TABLE IF EXISTS admin_sessions CASCADE',
                'DROP TABLE IF EXISTS admin_otp CASCADE',
                'DROP TABLE IF EXISTS users CASCADE',
                'DROP TABLE IF EXISTS hospitals CASCADE'
            ];

            for (const dropQuery of dropTables) {
                await client.query(dropQuery);
                console.log(`✅ ${dropQuery.split(' ')[4]} dropped`);
            }

            // Drop functions
            await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
            console.log('✅ Functions dropped');

            console.log('\n🏗️  Recreating database schema...');
            
            // Now call the initialization service
            const { DatabaseInitService } = require('./dist/services/DatabaseInitService');
            await DatabaseInitService.initializeDatabase();
            
            console.log('\n👑 Creating default super admin...');
            const { DefaultUserService } = require('./dist/services/DefaultUserService');
            await DefaultUserService.createDefaultSuperAdmin();
            
            console.log('\n✅ Database reset completed successfully!');
            console.log('🎉 All tables recreated and default data inserted.');
            
        } catch (error) {
            console.error('❌ Error during database reset:', error);
        } finally {
            client.release();
            await pool.end();
            rl.close();
        }
    });
}

// Check if compiled TypeScript exists
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    console.log('❌ TypeScript not compiled. Please run "npm run build" first.');
    process.exit(1);
}

resetDatabase().catch(console.error);
