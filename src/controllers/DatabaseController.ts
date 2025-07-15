import { Request, Response } from 'express';
import { MigrationUtils } from '../utils/MigrationUtils';
import { SchemaMigrationService } from '../services/SchemaMigrationService';

export class DatabaseController {
    /**
     * Get database migration status
     */
    static async getDatabaseStatus(req: Request, res: Response): Promise<void> {
        try {
            const status = await MigrationUtils.getDatabaseStatus();
            
            res.json({
                success: true,
                data: {
                    appliedMigrations: status.appliedMigrations,
                    pendingMigrations: status.pendingMigrations,
                    failedMigrations: status.failedMigrations,
                    totalMigrations: SchemaMigrationService.MIGRATIONS.length
                }
            });
        } catch (error) {
            console.error('Error getting database status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get database status'
            });
        }
    }

    /**
     * Reset a specific migration to allow it to be re-run
     */
    static async resetMigration(req: Request, res: Response): Promise<void> {
        const { version } = req.params;
        
        if (!version) {
            res.status(400).json({
                success: false,
                error: 'Migration version is required'
            });
            return;
        }
        
        try {
            await MigrationUtils.resetMigration(version);
            
            res.json({
                success: true,
                message: `Migration ${version} has been reset`
            });
        } catch (error) {
            console.error(`Error resetting migration ${version}:`, error);
            res.status(500).json({
                success: false,
                error: `Failed to reset migration ${version}`
            });
        }
    }

    /**
     * Run pending migrations
     */
    static async runPendingMigrations(req: Request, res: Response): Promise<void> {
        try {
            await SchemaMigrationService.runPendingMigrations();
            
            const status = await MigrationUtils.getDatabaseStatus();
            
            res.json({
                success: true,
                message: 'Migrations have been run',
                data: {
                    appliedMigrations: status.appliedMigrations,
                    pendingMigrations: status.pendingMigrations,
                    failedMigrations: status.failedMigrations
                }
            });
        } catch (error) {
            console.error('Error running migrations:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to run migrations'
            });
        }
    }
}
