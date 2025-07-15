@echo off
echo Fixing users table for super admin support...
echo.

REM Try to find PostgreSQL installation
set "PSQL_PATH="
for %%i in (psql.exe) do set "PSQL_PATH=%%~$PATH:i"

if not defined PSQL_PATH (
    echo PostgreSQL psql not found in PATH. Please run this SQL manually:
    echo.
    type fix-users-quick.sql
    echo.
    echo Copy the above SQL and paste it into your PostgreSQL client.
    pause
    exit /b 1
)

echo Found psql: %PSQL_PATH%
echo Running migration...
echo.

psql -U postgres -d metahealth_police -f fix-users-quick.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Users table updated successfully!
    echo ✓ hospital_id is now nullable
    echo ✓ super_admin role added to constraints
    echo ✓ last_login column added
    echo.
    echo You can now restart the server with: npm run dev
) else (
    echo.
    echo ✗ Failed to update users table
    echo Please run the SQL manually in your PostgreSQL client
)

pause
