# Database Schema Synchronization Guide

## Overview

This project implements a comprehensive database schema synchronization system to handle new columns, indexes, and constraints added after initial deployment. This is crucial for **project sharing** and **production deployments** where databases may be at different schema versions.

## How Schema Sync Works

### 1. **Current Implementation**

The project uses multiple approaches for schema synchronization:

#### A. **DatabaseInitService (Basic)**
- Located in: `src/services/DatabaseInitService.ts`
- Uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 
- Handles basic column additions with error handling
- Runs automatically on server startup

#### B. **SchemaMigrationService (Advanced)**
- Located in: `src/services/SchemaMigrationService.ts`
- Implements proper migration tracking with versioning
- Provides rollback capabilities
- Records migration history in `schema_migrations` table

#### C. **Simple Migration Runner**
- Located in: `run-migrations.js`
- Immediate solution for current sync needs
- Can be run manually: `node run-migrations.js`

### 2. **Migration Tracking**

The system creates a `schema_migrations` table to track applied changes:

```sql
CREATE TABLE schema_migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    rollback_sql TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed'
);
```

### 3. **Current Schema Status**

Based on our schema check, these key columns are now properly synced:

```
✅ hospitals.approval_status
✅ hospitals.approved_by  
✅ hospitals.gst_number
✅ users.is_active
✅ users.approval_status
✅ patients.address_city
✅ patients.address_state
✅ appointment_documents.file_data (for base64 storage)
```

## Usage Scenarios

### **Scenario 1: New Team Member Setup**

When someone gets the project:

1. **Clone the repository**
2. **Setup database** (empty PostgreSQL database)
3. **Run server**: `npm start`
   - Automatically creates all tables
   - Applies all migrations
   - Sets up default admin user

### **Scenario 2: Existing Database Sync**

When new columns are added to the code:

1. **Pull latest changes**
2. **Run migration script**: `node run-migrations.js`
   - Checks for missing columns
   - Adds only what's needed
   - Records changes in migration table

3. **Or restart server**: `npm start`
   - Automatically detects and applies missing schema changes

### **Scenario 3: Production Deployment**

For production updates:

1. **Backup database first**
2. **Deploy new code**
3. **Run migrations**: `node run-migrations.js`
4. **Restart application**

## Adding New Schema Changes

### **Method 1: Add to DatabaseInitService**

For simple column additions, update the relevant `create*Table` method:

```typescript
// In createHospitalsTable method
const addColumnsQueries = [
    'ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS new_field VARCHAR(100)',
    // ... existing columns
];
```

### **Method 2: Create Proper Migration (Recommended)**

Add to `SchemaMigrationService.MIGRATIONS`:

```typescript
{
    version: '2025.01.06_new_feature',
    description: 'Add new feature columns',
    sql: `
        ALTER TABLE hospitals 
        ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_hospitals_new_field ON hospitals(new_field);
    `,
    rollback: `
        DROP INDEX IF EXISTS idx_hospitals_new_field;
        ALTER TABLE hospitals DROP COLUMN IF EXISTS new_field;
    `
}
```

### **Method 3: Simple Migration Script**

For immediate needs, add to `run-migrations.js`:

```javascript
{
    version: '2025.01.06_new_feature',
    description: 'Add new feature columns',
    check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'hospitals' AND column_name = 'new_field'`,
    sql: `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);`
}
```

## Best Practices

### **1. Version Naming**
- Use format: `YYYY.MM.DD_descriptive_name`
- Example: `2025.01.15_add_patient_medical_history`

### **2. Always Include Rollback**
- Provide rollback SQL for production safety
- Test rollback scripts before deployment

### **3. Test Migrations**
- Run on development database first
- Verify data integrity after migration
- Check application functionality

### **4. Handle Existing Data**
- Use `ADD COLUMN IF NOT EXISTS` for safety
- Provide DEFAULT values for NOT NULL columns
- Consider data migration for complex changes

## Troubleshooting

### **Common Issues**

1. **"Column already exists" error**
   - Solution: Use `IF NOT EXISTS` clause
   - Our system handles this automatically

2. **"Migration already applied" message**
   - This is normal - system prevents duplicate applications
   - Check `schema_migrations` table for history

3. **Index creation fails**
   - Usually means index already exists
   - Use `CREATE INDEX IF NOT EXISTS`

4. **Constraint violations**
   - Check existing data before adding constraints
   - Use conditional constraint addition

### **Manual Schema Check**

Run our schema checker:
```bash
node check-schema.js
```

This shows:
- All existing tables
- Current column status
- Sync verification

### **Manual Migration Run**

Force run migrations:
```bash
node run-migrations.js
```

### **Check Migration History**

Query the migration table:
```sql
SELECT version, description, executed_at, status 
FROM schema_migrations 
ORDER BY executed_at DESC;
```

## Future Enhancements

### **Planned Features**

1. **Web UI for Migrations**
   - View migration status in admin dashboard
   - Manual migration triggers
   - Rollback capabilities

2. **Automated Testing**
   - Migration verification tests
   - Schema consistency checks
   - Data integrity validation

3. **Environment-Specific Migrations**
   - Development vs Production
   - Feature flags based on environment
   - Staging environment sync

### **Advanced Migration Patterns**

1. **Data Migrations**
   - Transform existing data during schema changes
   - Batch processing for large tables
   - Progress tracking

2. **Multi-Step Migrations**
   - Breaking complex changes into steps
   - Dependencies between migrations
   - Conditional migrations

## Summary

The current schema synchronization system provides:

✅ **Automatic detection** of missing columns  
✅ **Safe application** with IF NOT EXISTS checks  
✅ **Migration tracking** to prevent duplicates  
✅ **Error handling** that doesn't break the application  
✅ **Multiple execution methods** (startup, manual, script)  

This ensures that when the project is shared or deployed:

1. **New users** get a complete, up-to-date database
2. **Existing users** receive only the changes they need
3. **Production systems** can be updated safely
4. **Schema history** is preserved for auditing

The system is designed to be **safe**, **reliable**, and **easy to use** for any team member or deployment scenario.
