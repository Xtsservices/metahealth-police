import { Request, Response, NextFunction } from 'express';

// Validation middleware for patient creation
export const validatePatientCreation = (req: Request, res: Response, next: NextFunction): void => {
    const { 
        name, 
        mobile, 
        aadhar, 
        policeIdNo,
        // Optional appointment fields (hospitalId comes from token)
        appointmentDate,
        appointmentTime,
        purpose,
        notes
    } = req.body;
    const errors: string[] = [];

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push('Name is required and must be a non-empty string');
    } else if (name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    } else if (name.trim().length > 255) {
        errors.push('Name must be less than 255 characters');
    }

    // Validate mobile
    if (!mobile || typeof mobile !== 'string') {
        errors.push('Mobile number is required');
    } else {
        const mobileRegex = /^[6-9]\d{9}$/;
        if (!mobileRegex.test(mobile.trim())) {
            errors.push('Invalid mobile number format. Must be 10 digits starting with 6-9');
        }
    }

    // Validate Aadhar
    if (!aadhar || typeof aadhar !== 'string') {
        errors.push('Aadhar number is required');
    } else {
        const aadharRegex = /^\d{12}$/;
        if (!aadharRegex.test(aadhar.trim())) {
            errors.push('Invalid Aadhar number. Must be exactly 12 digits');
        }
    }

    // Validate Police ID
    if (!policeIdNo || typeof policeIdNo !== 'string' || policeIdNo.trim().length === 0) {
        errors.push('Police ID number is required and must be a non-empty string');
    } else if (policeIdNo.trim().length < 3) {
        errors.push('Police ID number must be at least 3 characters long');
    } else if (policeIdNo.trim().length > 50) {
        errors.push('Police ID number must be less than 50 characters');
    }

    // Validate appointment fields if any are provided
    const appointmentFields = [appointmentDate, appointmentTime, purpose];
    const hasAnyAppointmentField = appointmentFields.some(field => field !== undefined && field !== null);
    
    if (hasAnyAppointmentField) {
        // If any appointment field is provided, all required fields must be provided
        // Note: hospitalId will be validated from token in the controller

        if (!appointmentDate || typeof appointmentDate !== 'string') {
            errors.push('Appointment date is required when creating appointment');
        } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(appointmentDate)) {
                errors.push('Invalid appointment date format. Use YYYY-MM-DD');
            }
        }

        if (!appointmentTime || typeof appointmentTime !== 'string') {
            errors.push('Appointment time is required when creating appointment');
        } else {
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(appointmentTime)) {
                errors.push('Invalid appointment time format. Use HH:MM (24-hour format)');
            }
        }

        if (!purpose || typeof purpose !== 'string' || purpose.trim().length === 0) {
            errors.push('Purpose is required when creating appointment');
        } else if (purpose.trim().length > 500) {
            errors.push('Purpose must be less than 500 characters');
        }

        // Validate notes if provided
        if (notes !== undefined && notes !== null) {
            if (typeof notes !== 'string') {
                errors.push('Notes must be a string');
            } else if (notes.trim().length > 1000) {
                errors.push('Notes must be less than 1000 characters');
            }
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
        return;
    }

    next();
};

// Validation middleware for patient update
export const validatePatientUpdate = (req: Request, res: Response, next: NextFunction): void => {
    const { name, mobile, aadhar, policeIdNo, status } = req.body;
    const errors: string[] = [];

    // Validate name if provided
    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            errors.push('Name must be a non-empty string');
        } else if (name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        } else if (name.trim().length > 255) {
            errors.push('Name must be less than 255 characters');
        }
    }

    // Validate mobile if provided
    if (mobile !== undefined) {
        if (typeof mobile !== 'string') {
            errors.push('Mobile number must be a string');
        } else {
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(mobile.trim())) {
                errors.push('Invalid mobile number format. Must be 10 digits starting with 6-9');
            }
        }
    }

    // Validate Aadhar if provided
    if (aadhar !== undefined) {
        if (typeof aadhar !== 'string') {
            errors.push('Aadhar number must be a string');
        } else {
            const aadharRegex = /^\d{12}$/;
            if (!aadharRegex.test(aadhar.trim())) {
                errors.push('Invalid Aadhar number. Must be exactly 12 digits');
            }
        }
    }

    // Validate Police ID if provided
    if (policeIdNo !== undefined) {
        if (typeof policeIdNo !== 'string' || policeIdNo.trim().length === 0) {
            errors.push('Police ID number must be a non-empty string');
        } else if (policeIdNo.trim().length < 3) {
            errors.push('Police ID number must be at least 3 characters long');
        } else if (policeIdNo.trim().length > 50) {
            errors.push('Police ID number must be less than 50 characters');
        }
    }

    // Validate status if provided
    if (status !== undefined) {
        const validStatuses = ['active', 'inactive', 'suspended'];
        if (!validStatuses.includes(status)) {
            errors.push('Invalid status. Must be one of: active, inactive, suspended');
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
        return;
    }

    next();
};

// Validation middleware for appointment creation
export const validateAppointmentCreation = (req: Request, res: Response, next: NextFunction): void => {
    const { patientId, hospitalId, appointmentDate, appointmentTime, purpose } = req.body;
    const errors: string[] = [];

    // Validate patientId
    if (!patientId || typeof patientId !== 'string') {
        errors.push('Patient ID is required');
    } else {
        // UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(patientId)) {
            errors.push('Invalid Patient ID format');
        }
    }

    // Validate hospitalId
    if (!hospitalId || typeof hospitalId !== 'string') {
        errors.push('Hospital ID is required');
    } else {
        // UUID format validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(hospitalId)) {
            errors.push('Invalid Hospital ID format');
        }
    }

    // Validate appointmentDate
    if (!appointmentDate || typeof appointmentDate !== 'string') {
        errors.push('Appointment date is required');
    } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(appointmentDate)) {
            errors.push('Invalid date format. Use YYYY-MM-DD');
        } else {
            const date = new Date(appointmentDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (date < today) {
                errors.push('Appointment date cannot be in the past');
            }
        }
    }

    // Validate appointmentTime
    if (!appointmentTime || typeof appointmentTime !== 'string') {
        errors.push('Appointment time is required');
    } else {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(appointmentTime)) {
            errors.push('Invalid time format. Use HH:MM (24-hour format)');
        }
    }

    // Validate purpose
    if (!purpose || typeof purpose !== 'string' || purpose.trim().length === 0) {
        errors.push('Purpose is required and must be a non-empty string');
    } else if (purpose.trim().length < 5) {
        errors.push('Purpose must be at least 5 characters long');
    } else if (purpose.trim().length > 500) {
        errors.push('Purpose must be less than 500 characters');
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
        return;
    }

    next();
};

// Validation middleware for appointment update
export const validateAppointmentUpdate = (req: Request, res: Response, next: NextFunction): void => {
    const { appointmentDate, appointmentTime, status, purpose } = req.body;
    const errors: string[] = [];

    // Validate appointmentDate if provided
    if (appointmentDate !== undefined) {
        if (typeof appointmentDate !== 'string') {
            errors.push('Appointment date must be a string');
        } else {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(appointmentDate)) {
                errors.push('Invalid date format. Use YYYY-MM-DD');
            }
        }
    }

    // Validate appointmentTime if provided
    if (appointmentTime !== undefined) {
        if (typeof appointmentTime !== 'string') {
            errors.push('Appointment time must be a string');
        } else {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(appointmentTime)) {
                errors.push('Invalid time format. Use HH:MM (24-hour format)');
            }
        }
    }

    // Validate status if provided
    if (status !== undefined) {
        const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(status)) {
            errors.push('Invalid status. Must be one of: scheduled, confirmed, completed, cancelled, no_show');
        }
    }

    // Validate purpose if provided
    if (purpose !== undefined) {
        if (typeof purpose !== 'string' || purpose.trim().length === 0) {
            errors.push('Purpose must be a non-empty string');
        } else if (purpose.trim().length < 5) {
            errors.push('Purpose must be at least 5 characters long');
        } else if (purpose.trim().length > 500) {
            errors.push('Purpose must be less than 500 characters');
        }
    }

    if (errors.length > 0) {
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors
        });
        return;
    }

    next();
};
