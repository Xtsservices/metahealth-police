# MetaHealth Police - Migration Troubleshooting Guide

If you're experiencing database migration issues, follow these steps to resolve them:

## Common Migration Errors

### Syntax Error near "NOT" or other SQL syntax issues

This typically happens when PostgreSQL encounters a SQL syntax error in migration scripts. The most common causes are:

1. Using `NOT NULL` constraints with `IF NOT EXISTS` in column definitions
2. Multiple ALTER TABLE statements not separated properly
3. Missing semicolons between SQL statements

## Automatic Recovery

The system has been updated to handle migrations more robustly:

1. Each SQL statement is now executed separately
2. Proper error handling has been implemented
3. Migration status endpoints are available to monitor progress

### Recovery Steps

If you still encounter migration issues:

1. **Check Database Status**: 
   - Visit `/api/database/status` endpoint to see migration status

2. **Automatic Recovery Script**:
   - Run the included recovery script:
   ```
   node migration-recovery.js
   ```
   - This script will automatically:
     - Create the migration tracking table if missing
     - Reset any failed migrations
     - Show the current migration status

3. **Restart Application**:
   - After running the recovery script, restart the application:
   ```
   npm run dev
   ```
   - The system will automatically retry any pending migrations

## For Developers

If you need to add new migrations, follow these guidelines:

1. Use the array syntax for SQL statements:
   ```typescript
   sql: [
       `ALTER TABLE your_table ADD COLUMN your_column TYPE`,
       `CREATE INDEX idx_name ON your_table(column)`
   ]
   ```

2. For columns with NOT NULL constraints, use two separate statements:
   ```typescript
   sql: [
       `ALTER TABLE your_table ADD COLUMN your_column TYPE DEFAULT value`,
       `ALTER TABLE your_table ALTER COLUMN your_column SET NOT NULL`
   ]
   ```

3. Always include rollback statements for every migration:
   ```typescript
   rollback: [
       `DROP INDEX idx_name`,
       `ALTER TABLE your_table DROP COLUMN your_column`
   ]
   ```

## Support

If you continue to experience issues, please contact the development team.
