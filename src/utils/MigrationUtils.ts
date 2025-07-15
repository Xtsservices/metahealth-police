import pool from '../config/database';
import { MigrationStep } from '../services/SchemaMigrationService';

export class MigrationUtils {
    /**
     * Resets a specific migration state to allow it to be re-run
     * @param version - The migration version to reset
     */
    static async resetMigration(version: string): Promise<void> {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Delete the migration from the tracking table
            const deleteResult = await client.query(
                'DELETE FROM schema_migrations WHERE version = $1 RETURNING version',
                [version]
            );
            
            if (deleteResult.rowCount && deleteResult.rowCount > 0) {
                console.log(`✅ Reset migration state for ${version}`);
            } else {
                console.log(`ℹ️  Migration ${version} was not found in the tracking table`);
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`❌ Failed to reset migration ${version}:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Checks the database status and returns information about migrations
     */
    static async getDatabaseStatus(): Promise<{
        appliedMigrations: string[];
        pendingMigrations: string[];
        failedMigrations: string[];
    }> {
        const client = await pool.connect();
        
        try {
            // Get all migrations from tracking table
            const result = await client.query(`
                SELECT version, status
                FROM schema_migrations
                ORDER BY executed_at
            `);
            
            const appliedMigrations: string[] = [];
            const failedMigrations: string[] = [];
            
            result.rows.forEach(row => {
                if (row.status === 'completed') {
                    appliedMigrations.push(row.version);
                } else if (row.status === 'failed') {
                    failedMigrations.push(row.version);
                }
            });
            
            // Import the migration list from the service
            const { SchemaMigrationService } = await import('../services/SchemaMigrationService');
            
            // Get all available migrations
            const allMigrations = SchemaMigrationService.MIGRATIONS.map((m: MigrationStep) => m.version);
            
            // Calculate pending migrations
            const pendingMigrations = allMigrations.filter(
                (m: string) => !appliedMigrations.includes(m) && !failedMigrations.includes(m)
            );
            
            return {
                appliedMigrations,
                pendingMigrations,
                failedMigrations
            };
        } finally {
            client.release();
        }
    }
}
