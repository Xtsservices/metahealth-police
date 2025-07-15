import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api';
import hospitalRoutes from './routes/hospitals';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import appointmentRoutes from './routes/appointments';
import patientAuthRoutes from './routes/patient-auth';
import appointmentDocumentRoutes from './routes/appointment-documents';
import { testConnection } from './config/database';
import { DefaultUserService } from './services/DefaultUserService';
import { DatabaseInitService } from './services/DatabaseInitService';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3100;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: any, res: any) => {
    res.json({
        message: 'Hello, MetaHealth Police!',
        environment: NODE_ENV,
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api', apiRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patient-auth', patientAuthRoutes);
app.use('/api/appointment-documents', appointmentDocumentRoutes);

function main(): void {
    app.listen(PORT, async () => {
        console.log(`🚀 MetaHealth Police server is running!`);
        console.log(`📍 Environment: ${NODE_ENV}`);
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`⚡ Health check: http://localhost:${PORT}/api/health`);
        console.log(`� Database status: http://localhost:${PORT}/api/database/status`);
        console.log(`�📋 API info: http://localhost:${PORT}/api/info`);
        console.log(`🏥 Hospital registration: http://localhost:${PORT}/api/hospitals/register`);
        console.log(`👥 Users management: http://localhost:${PORT}/api/users`);
        console.log(`� Patients management: http://localhost:${PORT}/api/patients`);
        console.log(`📅 Appointments: http://localhost:${PORT}/api/appointments`);
        console.log(`📄 Document uploads: http://localhost:${PORT}/api/appointment-documents`);
        console.log(`�📊 Super Admin Dashboard: http://localhost:${PORT}/api/dashboard/stats`);
        console.log(`🔐 Admin Authentication: http://localhost:${PORT}/api/auth/generate-otp`);
        console.log(`📱 Patient Authentication: http://localhost:${PORT}/api/patient-auth/generate-otp`);
        
        // Test database connection
        console.log(`\n🔌 Testing database connection...`);
        await testConnection();
        
        // Initialize database schema
        console.log(`\n🏗️  Initializing database schema...`);
        try {
            await DatabaseInitService.initializeDatabase();
        } catch (error) {
            console.error('❌ Failed to initialize database schema:', error);
            console.log('⚠️  Server will continue but some features may not work properly');
        }
        
        // Create default super admin user
        console.log(`\n👑 Initializing default super admin...`);
        try {
            await DefaultUserService.createDefaultSuperAdmin();
        } catch (error) {
            console.error('❌ Failed to initialize default super admin:', error);
        }
    });
}

main();
