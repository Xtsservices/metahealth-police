import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateOTPGeneration, validateOTPVerification, validateLogout } from '../middleware/authValidation';

const router = Router();

// POST /api/auth/check-phone - Check if phone number exists in system
router.post('/check-phone', AuthController.checkPhone);

// POST /api/auth/generate-otp - Generate OTP for mobile login
router.post('/generate-otp', validateOTPGeneration, AuthController.generateOTP);

// POST /api/auth/verify-otp - Verify OTP and login
router.post('/verify-otp', validateOTPVerification, AuthController.verifyOTPAndLogin);

// POST /api/auth/logout - Logout user
router.post('/logout', validateLogout, AuthController.logout);

// GET /api/auth/validate-session - Validate session token
router.get('/validate-session', AuthController.validateSession);

export default router;
