import { Router } from 'express';
import { PatientController } from '../controllers/PatientController';
import { validatePatientCreation, validatePatientUpdate } from '../middleware/patientValidation';
import { validateToken } from '../middleware/tokenValidation';

const router = Router();

// POST /api/patients - Create new patient (requires authentication)
router.post('/createPatient', validateToken, validatePatientCreation, PatientController.createPatient);

// GET /api/patients - Get all patients with pagination and filtering
router.get('/', PatientController.getPatients);

// GET /api/patients/:id - Get patient by ID
router.get('/:id', PatientController.getPatientById);

// PUT /api/patients/:id - Update patient
router.put('/:id', validatePatientUpdate, PatientController.updatePatient);

// DELETE /api/patients/:id - Delete patient (soft delete)
router.delete('/:id', PatientController.deletePatient);

export default router;
