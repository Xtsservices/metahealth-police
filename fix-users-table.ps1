# Fix Users Table for Super Admin Support
# Run this script if you encounter the hospital_id NOT NULL error

Write-Host "🔧 Fixing Users Table for Super Admin Support" -ForegroundColor Yellow
Write-Host "================================================================"

$migrationFile = "database\migrations\005_update_users_for_super_admin.sql"

Write-Host "`n📋 This migration will:" -ForegroundColor Cyan
Write-Host "   • Allow NULL hospital_id for super admin users" -ForegroundColor Gray
Write-Host "   • Add 'super_admin' to role constraint" -ForegroundColor Gray
Write-Host "   • Add last_login column for OTP authentication" -ForegroundColor Gray
Write-Host "   • Update foreign key constraint" -ForegroundColor Gray

Write-Host "`n🔧 Please run this command manually:" -ForegroundColor Yellow
$currentPath = (Get-Location).Path
Write-Host "psql -U postgres -d metahealth_police -f `"$currentPath\$migrationFile`""

Write-Host "`n📝 Alternative: Copy and paste this SQL into your PostgreSQL client:" -ForegroundColor Cyan
Write-Host ""
if (Test-Path $migrationFile) {
    Get-Content $migrationFile
} else {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
}

Write-Host "`n💡 After running the migration, restart the server with: npm run dev" -ForegroundColor Yellow
