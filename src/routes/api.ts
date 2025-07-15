import { Router } from 'express';
import { DatabaseInitService } from '../services/DatabaseInitService';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'MetaHealth Police API'
    });
});

// API info endpoint
router.get('/info', (req, res) => {
    res.json({
        name: 'MetaHealth Police API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3100
    });
});

// Database status endpoint
router.get('/database/status', async (req, res) => {
    try {
        const status = await DatabaseInitService.checkDatabaseStatus();
        
        res.json({
            success: true,
            message: status.allTablesExist 
                ? 'All database tables are properly initialized' 
                : 'Some database tables are missing',
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check database status',
            error: (error as Error).message
        });
    }
});

// Database initialization endpoint (for manual initialization)
router.post('/database/initialize', async (req, res) => {
    try {
        await DatabaseInitService.initializeDatabase();
        
        const status = await DatabaseInitService.checkDatabaseStatus();
        
        res.json({
            success: true,
            message: 'Database initialized successfully',
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to initialize database',
            error: (error as Error).message
        });
    }
});

export default router;
