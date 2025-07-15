import { Request, Response, NextFunction } from 'express';

export const validateHospitalRegistration = (req: Request, res: Response, next: NextFunction): void => {
    const { name, address, contactInfo, licenseNumber, gstNumber, panNumber } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'Hospital name is required and must be a non-empty string'
        });
        return;
    }

    if (!address || typeof address !== 'object') {
        res.status(400).json({
            success: false,
            message: 'Address is required and must be an object'
        });
        return;
    }

    const { street, city, state, zipCode, country } = address;
    if (!street || !city || !state || !zipCode || !country) {
        res.status(400).json({
            success: false,
            message: 'Address must include street, city, state, zipCode, and country'
        });
        return;
    }

    if (!contactInfo || typeof contactInfo !== 'object') {
        res.status(400).json({
            success: false,
            message: 'Contact information is required and must be an object'
        });
        return;
    }

    const { phone, email, countryCode, pointOfContact } = contactInfo;
    if (!phone || !email || !countryCode || !pointOfContact) {
        res.status(400).json({
            success: false,
            message: 'Contact information must include countryCode, phone, email, and pointOfContact'
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

    if (!licenseNumber || typeof licenseNumber !== 'string' || licenseNumber.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'License number is required and must be a non-empty string'
        });
        return;
    }

    if (!gstNumber || typeof gstNumber !== 'string' || gstNumber.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'GST number is required and must be a non-empty string'
        });
        return;
    }

    // Basic GST format validation (15 characters)
    if (gstNumber.length !== 15) {
        res.status(400).json({
            success: false,
            message: 'GST number must be 15 characters long'
        });
        return;
    }

    if (!panNumber || typeof panNumber !== 'string' || panNumber.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'PAN number is required and must be a non-empty string'
        });
        return;
    }

    // Basic PAN format validation (10 characters)
    if (panNumber.length !== 10) {
        res.status(400).json({
            success: false,
            message: 'PAN number must be 10 characters long'
        });
        return;
    }

    // Basic phone number validation
    if (phone.length < 10) {
        res.status(400).json({
            success: false,
            message: 'Phone number must be at least 10 digits'
        });
        return;
    }

    // Point of contact validation
    if (!pointOfContact || typeof pointOfContact !== 'string' || pointOfContact.trim().length === 0) {
        res.status(400).json({
            success: false,
            message: 'Point of contact name is required'
        });
        return;
    }

    next();
};
