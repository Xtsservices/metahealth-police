# Quick Database Base64 Verification Script
Write-Host "=== Base64 Storage Verification ===" -ForegroundColor Green

# Database connection test script
$testScript = @"
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'metahealth_police',
    password: 'password123',
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
            console.log(`- \${doc.document_name}: \${doc.base64_length} chars, preview: \${doc.base64_preview}`);
        });
        
        // Count total documents
        const totalCount = await client.query('SELECT COUNT(*) FROM appointment_documents');
        console.log(`📊 Total documents: \${totalCount.rows[0].count}`);
        
        // Count documents with base64 data
        const base64Count = await client.query('SELECT COUNT(*) FROM appointment_documents WHERE file_data IS NOT NULL');
        console.log(`📊 Documents with base64 data: \${base64Count.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyBase64Storage();
"@

# Save the verification script
$scriptPath = "verify-base64-storage.js"
Set-Content -Path $scriptPath -Value $testScript -Encoding UTF8

Write-Host "Verification script created: $scriptPath" -ForegroundColor Yellow
Write-Host "`nTo run the verification:" -ForegroundColor Cyan
Write-Host "1. npm install pg" -ForegroundColor White
Write-Host "2. node verify-base64-storage.js" -ForegroundColor White

Write-Host "`n=== Common Issues to Check ===" -ForegroundColor Yellow
Write-Host "1. ❓ Is the file_data column properly created?" -ForegroundColor White
Write-Host "2. ❓ Are base64 strings being stored as null?" -ForegroundColor White
Write-Host "3. ❓ Is the base64 validation too strict?" -ForegroundColor White
Write-Host "4. ❓ Are there database transaction rollbacks?" -ForegroundColor White
Write-Host "5. ❓ Is the base64 data being corrupted during storage?" -ForegroundColor White

Write-Host "`n=== Quick Fix Applied ===" -ForegroundColor Green
Write-Host "✅ Removed overly strict base64 regex validation" -ForegroundColor White
Write-Host "✅ Added base64 string cleanup (remove whitespace)" -ForegroundColor White
Write-Host "✅ Added detailed debug logging" -ForegroundColor White
Write-Host "✅ Improved error messages" -ForegroundColor White

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Start your server and check the console logs" -ForegroundColor White
Write-Host "2. Test with the test-base64-upload.ps1 script" -ForegroundColor White
Write-Host "3. Run the database verification script" -ForegroundColor White
Write-Host "4. Check if documents are actually stored with base64 data" -ForegroundColor White
