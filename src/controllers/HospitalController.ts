import { Request, Response } from 'express';
import { Hospital, HospitalRegistrationRequest } from '../models/Hospital';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for hospitals (in a real app, this would be a database)
const hospitals: Hospital[] = [];

export class HospitalController {
    // Register a new hospital
    static async registerHospital(req: Request, res: Response): Promise<void> {
        try {
            const registrationData: HospitalRegistrationRequest = req.body;

            // Validate required fields
            const { name, address, contactInfo, licenseNumber, gstNumber, panNumber } = registrationData;

            if (!name || !address || !contactInfo || !licenseNumber || !gstNumber || !panNumber) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields',
                    required: ['name', 'address', 'contactInfo', 'licenseNumber', 'gstNumber', 'panNumber']
                });
                return;
            }

            // Check if hospital with same license number already exists
            const existingHospital = hospitals.find(h => h.licenseNumber === licenseNumber);
            if (existingHospital) {
                res.status(409).json({
                    success: false,
                    message: 'Hospital with this license number already exists'
                });
                return;
            }

            // Create new hospital
            const newHospital: Hospital = {
                id: uuidv4(),
                ...registrationData,
                registrationDate: new Date(),
                status: 'inactive' // Default status is inactive
            };

            hospitals.push(newHospital);

            res.status(201).json({
                success: true,
                message: 'Hospital registered successfully',
                data: {
                    id: newHospital.id,
                    name: newHospital.name,
                    licenseNumber: newHospital.licenseNumber,
                    registrationDate: newHospital.registrationDate,
                    status: newHospital.status
                }
            });
        } catch (error) {
            console.error('Error registering hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error during hospital registration'
            });
        }
    }

    // Get all hospitals
    static async getAllHospitals(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({
                success: true,
                message: 'Hospitals retrieved successfully',
                data: hospitals,
                count: hospitals.length
            });
        } catch (error) {
            console.error('Error retrieving hospitals:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving hospitals'
            });
        }
    }

    // Get hospital by ID
    static async getHospitalById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const hospital = hospitals.find(h => h.id === id);

            if (!hospital) {
                res.status(404).json({
                    success: false,
                    message: 'Hospital not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Hospital retrieved successfully',
                data: hospital
            });
        } catch (error) {
            console.error('Error retrieving hospital:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving hospital'
            });
        }
    }

    // Update hospital status
    static async updateHospitalStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['active', 'inactive', 'suspended'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: active, inactive, or suspended'
                });
                return;
            }

            const hospitalIndex = hospitals.findIndex(h => h.id === id);
            if (hospitalIndex === -1) {
                res.status(404).json({
                    success: false,
                    message: 'Hospital not found'
                });
                return;
            }

            hospitals[hospitalIndex].status = status;

            res.status(200).json({
                success: true,
                message: 'Hospital status updated successfully',
                data: {
                    id: hospitals[hospitalIndex].id,
                    name: hospitals[hospitalIndex].name,
                    status: hospitals[hospitalIndex].status
                }
            });
        } catch (error) {
            console.error('Error updating hospital status:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while updating hospital status'
            });
        }
    }
}
