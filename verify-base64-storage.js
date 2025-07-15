const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'metahealth_police',
    password: 'Prashanth',
    port: 5432,
});

async function verifyBase64Storage() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Connecting to database...');
        
        // Check if file_data column exists
        const columnCheck = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'appointment_documents' AND column_name = 'file_data'
        `);
        
        if (columnCheck.rows.length === 0) {
            console.log('❌ file_data column does not exist!');
            return;
        }
        
        console.log('✅ file_data column exists:', columnCheck.rows[0]);
        
        // Check recent documents with base64 data
        const recentDocs = await client.query(`
            SELECT 
                id, document_name, 
                CASE 
                    WHEN file_data IS NOT NULL THEN LENGTH(file_data)
                    ELSE 0
                END as base64_length,
                CASE 
                    WHEN file_data IS NOT NULL THEN SUBSTRING(file_data, 1, 50) || '...'
                    ELSE 'NULL'
                END as base64_preview,
                created_date
            FROM appointment_documents 
            ORDER BY created_date DESC 
            LIMIT 5
        `);
        
        console.log('📋 Recent documents:');
        recentDocs.rows.forEach(doc => {
            console.log(`- ${doc.document_name}: ${doc.base64_length} chars, preview: ${doc.base64_preview}`);
        });
        
        // Count total documents
        const totalCount = await client.query('SELECT COUNT(*) FROM appointment_documents');
        console.log(`📊 Total documents: ${totalCount.rows[0].count}`);
        
        // Count documents with base64 data
        const base64Count = await client.query('SELECT COUNT(*) FROM appointment_documents WHERE file_data IS NOT NULL');
        console.log(`📊 Documents with base64 data: ${base64Count.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyBase64Storage();
