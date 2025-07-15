import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

// GET /api/dashboard/stats - Get overall dashboard statistics
router.get('/stats', DashboardController.getDashboardStats);

// GET /api/dashboard/hospitals - Get hospital status overview
router.get('/hospitals', DashboardController.getHospitalStatusOverview);

// GET /api/dashboard/users-by-hospital - Get user statistics by hospital
router.get('/users-by-hospital', DashboardController.getUserStatsByHospital);

// GET /api/dashboard/pending-hospitals - Get hospitals pending approval
router.get('/pending-hospitals', DashboardController.getPendingHospitals);

// PUT /api/dashboard/approve-hospital/:hospitalId - Approve hospital and admin user
router.put('/approve-hospital/:hospitalId', DashboardController.approveHospital);

// PUT /api/dashboard/reject-hospital/:hospitalId - Reject hospital application
router.put('/reject-hospital/:hospitalId', DashboardController.rejectHospital);

export default router;
