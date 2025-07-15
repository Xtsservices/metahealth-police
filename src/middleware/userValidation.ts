import { Request, Response, NextFunction } from 'express';

export const validateUserRegistration = (req: Request, res: Response, next: NextFunction): void => {
    const { name, email, phone, role } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'Name is required and must be a non-empty string'
        });
        return;
    }

    if (!email || typeof email !== 'string') {
        res.status(400).json({
            success: false,
            message: 'Email is required'
        });
        return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
        return;
    }

    if (!phone || typeof phone !== 'string') {
        res.status(400).json({
            success: false,
            message: 'Phone number is required'
        });
        return;
    }

    // Phone number validation (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
    if (phoneDigits.length < 10) {
        res.status(400).json({
            success: false,
            message: 'Phone number must contain at least 10 digits'
        });
        return;
    }

    if (!role || !['hospital_admin', 'staff', 'doctor'].includes(role)) {
        res.status(400).json({
            success: false,
            message: 'Invalid role. Must be: hospital_admin, staff, or doctor'
        });
        return;
    }

    next();
};
