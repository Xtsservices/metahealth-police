import { Router } from 'express';

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

export default router;
