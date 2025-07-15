import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { validateUserRegistration } from '../middleware/userValidation';

const router = Router();

// POST /api/users - Create a new user (with validation)
router.post('/', validateUserRegistration, UserController.createUser);

// GET /api/users - Get all users
router.get('/', UserController.getAllUsers);

// GET /api/users/:id - Get user by ID
router.get('/:id', UserController.getUserById);

// PATCH /api/users/:id/status - Update user status
router.patch('/:id/status', UserController.updateUserStatus);

// GET /api/users/hospital/:hospitalId - Get users by hospital ID
router.get('/hospital/:hospitalId', UserController.getUsersByHospitalId);

export default router;
