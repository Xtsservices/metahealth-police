import pool from '../src/config/database';

async function checkTables() {
    const client = await pool.connect();
    
    try {
        console.log('Checking database tables...');
        
        // Check if tables exist
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `;
        
        const result = await client.query(tablesQuery);
        
        console.log('Existing tables:');
        if (result.rows.length === 0) {
            console.log('No tables found in the database.');
        } else {
            result.rows.forEach(row => {
                console.log(`- ${row.table_name}`);
            });
        }
        
        // Check specifically for patients table
        const patientsTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'patients'
            );
        `;
        
        const patientsExists = await client.query(patientsTableQuery);
        console.log(`\nPatients table exists: ${patientsExists.rows[0].exists}`);
        
        // Check for appointments table
        const appointmentsTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'appointments'
            );
        `;
        
        const appointmentsExists = await client.query(appointmentsTableQuery);
        console.log(`Appointments table exists: ${appointmentsExists.rows[0].exists}`);
        
    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

checkTables();
