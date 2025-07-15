# MIGRATION SYNTAX ERROR FIX - IMMEDIATE SOLUTION

## Problem
Your colleague is getting "syntax error at or near 'NOT'" when running migrations. This is due to incorrect SQL syntax in the migration files.

## Immediate Fix Steps

### Step 1: Run the Migration Fix Script
```bash
node fix-migration-syntax.js
```

This script will:
- Clean failed migration records
- Apply migrations with correct SQL syntax
- Verify all critical columns exist
- Show final migration state

### Step 2: Verify SchemaMigrationService.ts Has Correct Syntax

The issue is in the migration SQL. Make sure your SchemaMigrationService.ts has this CORRECT syntax:

**❌ WRONG (causes error):**
```sql
ALTER TABLE hospitals 
ADD COLUMN IF NOT EXISTS col1 VARCHAR(20),
ADD COLUMN IF NOT EXISTS col2 UUID;  -- This causes syntax error
```

**✅ CORRECT:**
```sql
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS col1 VARCHAR(20);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS col2 UUID;
```

### Step 3: Check Migration Version in SchemaMigrationService.ts

Ensure the `2025.01.01_hospital_approval_fields` migration looks like this:

```typescript
{
    version: '2025.01.01_hospital_approval_fields',
    description: 'Add approval fields to hospitals table',
    sql: `
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending';
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_by UUID;
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS approval_notes TEXT;
        
        ALTER TABLE hospitals 
        ADD CONSTRAINT IF NOT EXISTS hospitals_approval_status_check 
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));
        
        CREATE INDEX IF NOT EXISTS idx_hospitals_approval_status ON hospitals(approval_status);
    `,
    rollback: `
        DROP INDEX IF EXISTS idx_hospitals_approval_status;
        ALTER TABLE hospitals DROP CONSTRAINT IF EXISTS hospitals_approval_status_check;
        ALTER TABLE hospitals DROP COLUMN IF EXISTS approval_notes;
        ALTER TABLE hospitals DROP COLUMN IF EXISTS approved_at;
        ALTER TABLE hospitals DROP COLUMN IF EXISTS approved_by;
        ALTER TABLE hospitals DROP COLUMN IF EXISTS approval_status;
    `
}
```

## For Your Colleague

### Option A: Run the Fix Script (Recommended)
1. Copy the `fix-migration-syntax.js` file to your project root
2. Run: `node fix-migration-syntax.js`
3. Run: `npm start`

### Option B: Manual Database Reset (If needed)
If the fix script doesn't work:

1. **Backup your database first**
2. **Clear migration table:**
   ```sql
   DELETE FROM schema_migrations WHERE status = 'failed';
   ```
3. **Run the fix script**
4. **Start server**

## Expected Output After Fix

```
🎉 SUCCESS: All migrations completed successfully!
✅ Database schema is now fully synchronized
✅ Server should start without migration errors
```

## Verification Commands

```bash
# Check migration status
node fix-migration-syntax.js

# Verify server starts
npm start
```

## Root Cause
The error occurs because PostgreSQL doesn't allow comma-separated ADD COLUMN statements in the same ALTER TABLE command when using IF NOT EXISTS. Each ADD COLUMN must be a separate statement.

## Contact
If this doesn't resolve the issue, the colleague should:
1. Check they have the latest code
2. Verify database credentials in .env
3. Ensure PostgreSQL is running
4. Run the verification commands above
