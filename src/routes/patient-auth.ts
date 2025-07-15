import { Router } from 'express';
import { PatientAuthController } from '../controllers/PatientAuthController';

const router = Router();

// POST /api/patient-auth/check-mobile - Check if patient mobile exists
router.post('/check-mobile', PatientAuthController.checkPatientMobile);

// POST /api/patient-auth/generate-otp - Generate OTP for patient mobile login
router.post('/generate-otp', PatientAuthController.generatePatientOTP);

// POST /api/patient-auth/verify-otp - Verify OTP and login patient
router.post('/verify-otp', PatientAuthController.verifyPatientOTPAndLogin);

// POST /api/patient-auth/logout - Logout patient
router.post('/logout', PatientAuthController.logoutPatient);

// GET /api/patient-auth/validate-session - Validate patient session token
router.get('/validate-session', PatientAuthController.validatePatientSession);

export default router;
