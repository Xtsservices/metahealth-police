import { Request, Response, NextFunction } from 'express';

// Validate OTP generation request
export const validateOTPGeneration = (req: Request, res: Response, next: NextFunction): void => {
    const { phone } = req.body;

    if (!phone) {
        res.status(400).json({
            success: false,
            message: 'Phone number is required',
            field: 'phone'
        });
        return;
    }

    if (typeof phone !== 'string') {
        res.status(400).json({
            success: false,
            message: 'Phone number must be a string',
            field: 'phone'
        });
        return;
    }

    const trimmedPhone = phone.trim();
    
    if (trimmedPhone.length < 10 || trimmedPhone.length > 15) {
        res.status(400).json({
            success: false,
            message: 'Phone number must be between 10-15 characters',
            field: 'phone'
        });
        return;
    }

    // Basic phone number validation
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(trimmedPhone)) {
        res.status(400).json({
            success: false,
            message: 'Invalid phone number format. Use digits, spaces, hyphens, parentheses, and optional + prefix',
            field: 'phone'
        });
        return;
    }

    // Sanitize phone number for consistency
    req.body.phone = trimmedPhone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, hyphens, parentheses
    
    next();
};

// Validate OTP verification request
export const validateOTPVerification = (req: Request, res: Response, next: NextFunction): void => {
    const { phone, otp } = req.body;

    // Validate phone
    if (!phone) {
        res.status(400).json({
            success: false,
            message: 'Phone number is required',
            field: 'phone'
        });
        return;
    }

    // Validate OTP
    if (!otp) {
        res.status(400).json({
            success: false,
            message: 'OTP is required',
            field: 'otp'
        });
        return;
    }

    if (typeof otp !== 'string') {
        res.status(400).json({
            success: false,
            message: 'OTP must be a string',
            field: 'otp'
        });
        return;
    }

    const trimmedOtp = otp.trim();
    
    // OTP should be 6 digits
    if (!/^\d{6}$/.test(trimmedOtp)) {
        res.status(400).json({
            success: false,
            message: 'OTP must be exactly 6 digits',
            field: 'otp'
        });
        return;
    }

    // Sanitize inputs
    req.body.phone = phone.replace(/[\s\-\(\)]/g, '');
    req.body.otp = trimmedOtp;
    
    next();
};

// Validate logout request
export const validateLogout = (req: Request, res: Response, next: NextFunction): void => {
    const { token } = req.body;

    if (!token) {
        res.status(400).json({
            success: false,
            message: 'Session token is required',
            field: 'token'
        });
        return;
    }

    if (typeof token !== 'string') {
        res.status(400).json({
            success: false,
            message: 'Session token must be a string',
            field: 'token'
        });
        return;
    }

    // Basic UUID validation for session token
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token.trim())) {
        res.status(400).json({
            success: false,
            message: 'Invalid session token format',
            field: 'token'
        });
        return;
    }

    req.body.token = token.trim();
    next();
};
