require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function testDashboardQuery() {
    const client = await pool.connect();
    try {
        console.log('🧪 Testing Dashboard Queries...');
        
        // Test each query separately
        console.log('\n1. Testing hospitals query...');
        const hospitalStats = await client.query(`
            SELECT status, COUNT(*) as count
            FROM hospitals 
            GROUP BY status
            ORDER BY status
        `);
        console.log('✅ Hospitals query successful:', hospitalStats.rows);
        
        console.log('\n2. Testing users query...');
        const userStats = await client.query(`
            SELECT role, status, COUNT(*) as count
            FROM users 
            GROUP BY role, status
            ORDER BY role, status
        `);
        console.log('✅ Users query successful:', userStats.rows);
        
        console.log('\n3. Testing patients query...');
        const patientStats = await client.query(`
            SELECT COUNT(*) as total FROM patients
        `);
        console.log('✅ Patients query successful:', patientStats.rows);
        
        console.log('\n4. Testing appointments query...');
        const appointmentStats = await client.query(`
            SELECT status, COUNT(*) as count
            FROM appointments 
            GROUP BY status
            ORDER BY status
        `);
        console.log('✅ Appointments query successful:', appointmentStats.rows);
        
        console.log('\n5. Testing recent appointments query...');
        const recentAppointments = await client.query(`
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE created_date >= NOW() - INTERVAL '30 days'
        `);
        console.log('✅ Recent appointments query successful:', recentAppointments.rows);
        
        console.log('\n🎉 All dashboard queries working correctly!');
        
    } catch (error) {
        console.error('❌ Query failed:', error.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

testDashboardQuery().catch(console.error);
