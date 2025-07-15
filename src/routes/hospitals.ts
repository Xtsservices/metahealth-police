import { Router } from 'express';
import { PostgreSQLHospitalController } from '../controllers/PostgreSQLHospitalController';
import { validateHospitalRegistration } from '../middleware/validation';

const router = Router();

// POST /api/hospitals/register - Register a new hospital
router.post('/register', validateHospitalRegistration, PostgreSQLHospitalController.registerHospital);

// GET /api/hospitals - Get all hospitals
router.get('/', PostgreSQLHospitalController.getAllHospitals);

// GET /api/hospitals/:id - Get hospital by ID
router.get('/:id', PostgreSQLHospitalController.getHospitalById);

// PATCH /api/hospitals/:id/status - Update hospital status
router.patch('/:id/status', PostgreSQLHospitalController.updateHospitalStatus);

export default router;
