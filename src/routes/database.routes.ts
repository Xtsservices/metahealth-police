import { Router } from 'express';
import { DatabaseController } from '../controllers/DatabaseController';

const router = Router();

// Database status and migration routes (super admin only)
router.get('/status', DatabaseController.getDatabaseStatus);
router.post('/migrations/run', DatabaseController.runPendingMigrations);
router.post('/migrations/reset/:version', DatabaseController.resetMigration);

export default router;
