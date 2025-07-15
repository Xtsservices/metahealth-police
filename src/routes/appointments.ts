import { Router } from 'express';
import { AppointmentController } from '../controllers/AppointmentController';
import { validateAppointmentCreation, validateAppointmentUpdate } from '../middleware/patientValidation';

const router = Router();

// POST /api/appointments - Create new appointment
router.post('/', validateAppointmentCreation, AppointmentController.createAppointment);

// GET /api/appointments - Get all appointments with filtering and pagination
router.get('/', AppointmentController.getAppointments);

// GET /api/appointments/:id - Get appointment by ID
router.get('/:id', AppointmentController.getAppointmentById);

// PUT /api/appointments/:id - Update appointment
router.post('/updateAppointment', validateAppointmentUpdate, AppointmentController.updateAppointment);

// POST /api/appointments/:id/cancel - Cancel appointment
router.post('/:id/cancel', AppointmentController.cancelAppointment);

// GET /api/appointments/patient/:patientId - Get patient's appointments
router.get('/patient/:patientId', AppointmentController.getPatientAppointments);


export default router;
