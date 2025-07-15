import { Request, Response } from 'express';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../middleware/tokenValidation';

export class AppointmentDocumentController {
    // Upload document for appointment (supports both multipart and base64)
    static async uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { appointmentId, documentType, description, fileData, fileName, mimeType } = req.body;
            const file = req.file;

            // Check for either multipart file or base64 data
            if (!file && !fileData) {
                res.status(400).json({
                    success: false,
                    message: 'No file uploaded. Provide either multipart file or base64 fileData'
                });
                return;
            }

            // For base64 uploads, validate required fields
            if (fileData && (!fileName || !mimeType)) {
                res.status(400).json({
                    success: false,
                    message: 'For base64 uploads, fileName and mimeType are required'
                });
                return;
            }

            // Validate required fields
            if (!appointmentId || !documentType) {
                // Delete uploaded file if validation fails (for multipart uploads)
                if (file && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                res.status(400).json({
                    success: false,
                    message: 'appointmentId and documentType are required'
                });
                return;
            }

            // Validate document type
            const validDocumentTypes = ['lab_report', 'prescription', 'operation_sheet', 'other'];
            if (!validDocumentTypes.includes(documentType)) {
                // Delete uploaded file if validation fails (for multipart uploads)
                if (file && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                res.status(400).json({
                    success: false,
                    message: 'Invalid document type. Must be one of: lab_report, prescription, operation_sheet, other'
                });
                return;
            }

            // Check if appointment exists
            const appointmentQuery = `
                SELECT a.id, a.status, p.name as patient_name, h.name as hospital_name
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
                WHERE a.id = $1
            `;
            const appointmentResult = await client.query(appointmentQuery, [appointmentId]);

            if (appointmentResult.rows.length === 0) {
                // Delete uploaded file if appointment not found (for multipart uploads)
                if (file && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                
                res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
                return;
            }

            // For hospital admins, verify they can upload to this appointment
            if (req.user?.role === 'hospital_admin') {
                const hospitalCheckQuery = `
                    SELECT id FROM appointments 
                    WHERE id = $1 AND hospital_id = $2
                `;
                const hospitalCheck = await client.query(hospitalCheckQuery, [appointmentId, req.user.hospital_id]);
                
                if (hospitalCheck.rows.length === 0) {
                    // Delete uploaded file if unauthorized (for multipart uploads)
                    if (file && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    
                    res.status(403).json({
                        success: false,
                        message: 'You can only upload documents for appointments in your hospital'
                    });
                    return;
                }
            }

            // Handle file processing and convert to base64 for database storage
            let fileInfo: {
                originalname: string;
                size: number;
                mimetype: string;
                base64Data: string;
            };

            if (file) {
                // Multipart upload - convert file to base64
                try {
                    // Read file content and convert to base64
                    const fileBuffer = fs.readFileSync(file.path);
                    const base64String = fileBuffer.toString('base64');
                    
                    // Validate file size (50MB limit)
                    const maxSize = 50 * 1024 * 1024; // 50MB
                    if (file.size > maxSize) {
                        // Delete uploaded file
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                        
                        res.status(400).json({
                            success: false,
                            message: 'File too large. Maximum size is 50MB'
                        });
                        return;
                    }

                    fileInfo = {
                        originalname: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype,
                        base64Data: base64String
                    };

                    // Delete the temporary uploaded file after reading
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }

                } catch (error) {
                    // Clean up file on error
                    if (file && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                    
                    console.error('Error processing uploaded file:', error);
                    res.status(500).json({
                        success: false,
                        message: 'Error processing uploaded file'
                    });
                    return;
                }
            } else {
                // Base64 upload from JSON payload
                try {
                    // Extract base64 data
                    let base64Data = fileData;
                    if (fileData.startsWith('data:')) {
                        // Data URL format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
                        const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
                        if (!matches) {
                            res.status(400).json({
                                success: false,
                                message: 'Invalid data URL format'
                            });
                            return;
                        }
                        base64Data = matches[2];
                    }

                    // Clean up base64 string (remove whitespace/newlines)
                    base64Data = base64Data.replace(/\s/g, '');

                    // Validate base64 format by trying to decode it
                    if (!base64Data || base64Data.length === 0) {
                        res.status(400).json({
                            success: false,
                            message: 'Empty base64 data provided'
                        });
                        return;
                    }

                    // Validate base64 and get file size
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileSize = buffer.length;

                    // Validate file size (50MB limit)
                    const maxSize = 50 * 1024 * 1024; // 50MB
                    if (fileSize > maxSize) {
                        res.status(400).json({
                            success: false,
                            message: 'File too large. Maximum size is 50MB'
                        });
                        return;
                    }

                    fileInfo = {
                        originalname: fileName,
                        size: fileSize,
                        mimetype: mimeType,
                        base64Data: base64Data
                    };

                } catch (error) {
                    console.error('Error processing base64 file:', error);
                    res.status(400).json({
                        success: false,
                        message: `Invalid base64 data: ${error instanceof Error ? error.message : 'Unable to decode base64 string'}`
                    });
                    return;
                }
            }

            // Save document information to database with base64 content
            const documentId = uuidv4();
            
            // First check if file_data column exists
            const columnCheckQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'appointment_documents' AND column_name = 'file_data'
            `;
            const columnCheck = await client.query(columnCheckQuery);
            
            if (columnCheck.rows.length === 0) {
                // Add the file_data column if it doesn't exist
                const addColumnQuery = `
                    ALTER TABLE appointment_documents 
                    ADD COLUMN IF NOT EXISTS file_data TEXT
                `;
                await client.query(addColumnQuery);
            }
            
            const insertDocumentQuery = `
                INSERT INTO appointment_documents (
                    id, appointment_id, document_type, document_name, file_data, 
                    file_size, mime_type, uploaded_by, uploaded_by_id, description,
                    created_date, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id, appointment_id, document_type, document_name, file_size, 
                         mime_type, uploaded_by, description, created_date
            `;

            console.log('=== Document Upload Debug ===');
            console.log('Upload method:', file ? 'multipart' : 'base64');
            console.log('File name:', fileInfo.originalname);
            console.log('File size:', fileInfo.size);
            console.log('MIME type:', fileInfo.mimetype);
            console.log('Base64 data length:', fileInfo.base64Data?.length || 0);
            console.log('Base64 preview:', fileInfo.base64Data?.substring(0, 50) + '...');
            
            const documentValues = [
                documentId,
                appointmentId,
                documentType,
                fileInfo.originalname,
                fileInfo.base64Data, // Store base64 data instead of file path
                fileInfo.size,
                fileInfo.mimetype,
                req.user?.role || 'admin',
                req.user?.id || null,
                description || null
            ];

            console.log('Executing database insert...');
            const result = await client.query(insertDocumentQuery, documentValues);
            const newDocument = result.rows[0];
            console.log('✅ Document stored successfully with ID:', newDocument.id);

            res.status(201).json({
                success: true,
                message: 'Document uploaded successfully',
                data: {
                    id: newDocument.id,
                    appointmentId: newDocument.appointment_id,
                    documentType: newDocument.document_type,
                    documentName: newDocument.document_name,
                    fileSize: newDocument.file_size,
                    mimeType: newDocument.mime_type,
                    uploadedBy: newDocument.uploaded_by,
                    description: newDocument.description,
                    createdDate: newDocument.created_date,
                    appointment: {
                        patientName: appointmentResult.rows[0].patient_name,
                        hospitalName: appointmentResult.rows[0].hospital_name
                    }
                }
            });

        } catch (error) {
            // Delete uploaded file if database operation fails
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            console.error('Error uploading document:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while uploading document'
            });
        } finally {
            client.release();
        }
    }

    // Upload multiple documents for appointment
    static async uploadMultipleDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { appointmentId, documentType, description } = req.body;
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
                return;
            }

            // Validate required fields
            if (!appointmentId || !documentType) {
                // Delete uploaded files if validation fails
                files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
                
                res.status(400).json({
                    success: false,
                    message: 'appointmentId and documentType are required'
                });
                return;
            }

            // Validate document type
            const validDocumentTypes = ['lab_report', 'prescription', 'operation_sheet', 'other'];
            if (!validDocumentTypes.includes(documentType)) {
                // Delete uploaded files if validation fails
                files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
                
                res.status(400).json({
                    success: false,
                    message: 'Invalid document type. Must be one of: lab_report, prescription, operation_sheet, other'
                });
                return;
            }

            // Check if appointment exists
            const appointmentQuery = `
                SELECT a.id, a.status, p.name as patient_name, h.name as hospital_name
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
                WHERE a.id = $1
            `;
            const appointmentResult = await client.query(appointmentQuery, [appointmentId]);

            if (appointmentResult.rows.length === 0) {
                // Delete uploaded files if appointment not found
                files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
                
                res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
                return;
            }

            // For hospital admins, verify they can upload to this appointment
            if (req.user?.role === 'hospital_admin') {
                const hospitalCheckQuery = `
                    SELECT id FROM appointments 
                    WHERE id = $1 AND hospital_id = $2
                `;
                const hospitalCheck = await client.query(hospitalCheckQuery, [appointmentId, req.user.hospital_id]);
                
                if (hospitalCheck.rows.length === 0) {
                    // Delete uploaded files if unauthorized
                    files.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                    
                    res.status(403).json({
                        success: false,
                        message: 'You can only upload documents for appointments in your hospital'
                    });
                    return;
                }
            }

            // Start transaction for multiple inserts
            await client.query('BEGIN');

            const uploadedDocuments = [];

            try {
                // Save each document to database with base64 storage
                for (const file of files) {
                    // Read file content and convert to base64
                    const fileBuffer = fs.readFileSync(file.path);
                    const base64String = fileBuffer.toString('base64');
                    
                    const documentId = uuidv4();
                    
                    const insertDocumentQuery = `
                        INSERT INTO appointment_documents (
                            id, appointment_id, document_type, document_name, file_data, 
                            file_size, mime_type, uploaded_by, uploaded_by_id, description,
                            created_date, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id, appointment_id, document_type, document_name, file_size, 
                                 mime_type, uploaded_by, description, created_date
                    `;

                    const documentValues = [
                        documentId,
                        appointmentId,
                        documentType,
                        file.originalname,
                        base64String, // Store base64 data instead of file path
                        file.size,
                        file.mimetype,
                        req.user?.role || 'admin',
                        req.user?.id || null,
                        description || null
                    ];

                    const result = await client.query(insertDocumentQuery, documentValues);
                    uploadedDocuments.push(result.rows[0]);
                    
                    // Delete the temporary uploaded file after reading
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                }

                await client.query('COMMIT');

                res.status(201).json({
                    success: true,
                    message: `${files.length} documents uploaded successfully`,
                    data: {
                        appointmentId: appointmentId,
                        documentType: documentType,
                        documentsCount: files.length,
                        documents: uploadedDocuments.map(doc => ({
                            id: doc.id,
                            documentName: doc.document_name,
                            fileSize: doc.file_size,
                            mimeType: doc.mime_type,
                            uploadedBy: doc.uploaded_by,
                            description: doc.description,
                            createdDate: doc.created_date
                        })),
                        appointment: {
                            patientName: appointmentResult.rows[0].patient_name,
                            hospitalName: appointmentResult.rows[0].hospital_name
                        }
                    }
                });

            } catch (dbError) {
                await client.query('ROLLBACK');
                throw dbError;
            }

        } catch (error) {
            // Delete uploaded files if operation fails
            if (req.files) {
                (req.files as Express.Multer.File[]).forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
            
            console.error('Error uploading multiple documents:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while uploading documents'
            });
        } finally {
            client.release();
        }
    }

    // Get documents for an appointment
    static async getAppointmentDocuments(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { documentType,appointmentId } = req.query;

            // Check if appointment exists
            const appointmentQuery = `
                SELECT a.id, a.status, p.name as patient_name, h.name as hospital_name
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
                WHERE a.id = $1
            `;
            const appointmentResult = await client.query(appointmentQuery, [appointmentId]);

            if (appointmentResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
                return;
            }

            // Build query for documents
            let documentsQuery = `
                SELECT 
                    id, appointment_id, document_type, document_name, file_data,
                    file_size, mime_type, uploaded_by, uploaded_by_id, description,
                    created_date, updated_at
                FROM appointment_documents
                WHERE appointment_id = $1
            `;

            const queryParams = [appointmentId];

            // Add document type filter if provided
            if (documentType && typeof documentType === 'string') {
                const validDocumentTypes = ['lab_report', 'prescription', 'operation_sheet', 'other'];
                if (validDocumentTypes.includes(documentType)) {
                    documentsQuery += ` AND document_type = $2`;
                    queryParams.push(documentType);
                }
            }

            documentsQuery += ` ORDER BY created_date DESC`;

            const documentsResult = await client.query(documentsQuery, queryParams);

            console.log('=== Get Documents Debug ===');
            console.log('Total documents found:', documentsResult.rows.length);
            
            // Group documents by type
            const groupedDocuments: {
                labReports: any[];
                prescriptions: any[];
                operationSheets: any[];
                other: any[];
            } = {
                labReports: [],
                prescriptions: [],
                operationSheets: [],
                other: []
            };

            documentsResult.rows.forEach(doc => {
                // Ensure base64 data is properly formatted
                let formattedFileData = doc.file_data;
                if (formattedFileData && !formattedFileData.startsWith('data:')) {
                    // Add data URL prefix for proper base64 format
                    formattedFileData = `data:${doc.mime_type};base64,${doc.file_data}`;
                }

                console.log(`Document ${doc.document_name}:`, {
                    hasFileData: !!doc.file_data,
                    fileDataLength: doc.file_data?.length || 0,
                    mimeType: doc.mime_type,
                    isFormatted: formattedFileData?.startsWith('data:')
                });

                const document = {
                    id: doc.id,
                    appointmentId: doc.appointment_id,
                    documentType: doc.document_type,
                    documentName: doc.document_name,
                    fileData: formattedFileData, // Base64 data in data URL format
                    fileSize: doc.file_size,
                    mimeType: doc.mime_type,
                    uploadedBy: doc.uploaded_by,
                    uploadedById: doc.uploaded_by_id,
                    description: doc.description,
                    createdDate: doc.created_date,
                    updatedAt: doc.updated_at
                };

                switch (doc.document_type) {
                    case 'lab_report':
                        groupedDocuments.labReports.push(document);
                        break;
                    case 'prescription':
                        groupedDocuments.prescriptions.push(document);
                        break;
                    case 'operation_sheet':
                        groupedDocuments.operationSheets.push(document);
                        break;
                    default:
                        groupedDocuments.other.push(document);
                }
            });

            const totalCount = documentsResult.rows.length;

            res.status(200).json({
                success: true,
                message: 'Appointment documents retrieved successfully',
                data: {
                    appointmentId: appointmentId,
                    appointment: {
                        patientName: appointmentResult.rows[0].patient_name,
                        hospitalName: appointmentResult.rows[0].hospital_name,
                        status: appointmentResult.rows[0].status
                    },
                    documents: groupedDocuments,
                    totalCount: totalCount,
                    filter: {
                        documentType: documentType || null
                    }
                }
            });

        } catch (error) {
            console.error('Error retrieving appointment documents:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while retrieving documents'
            });
        } finally {
            client.release();
        }
    }

    // Download document
    static async downloadDocument(req: Request, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { documentId } = req.params;

            // Get document information including base64 data
            const documentQuery = `
                SELECT 
                    ad.id, ad.document_name, ad.file_data, ad.mime_type,
                    a.id as appointment_id, p.name as patient_name, h.name as hospital_name
                FROM appointment_documents ad
                JOIN appointments a ON ad.appointment_id = a.id
                JOIN patients p ON a.patient_id = p.id
                JOIN hospitals h ON a.hospital_id = h.id
                WHERE ad.id = $1
            `;

            const documentResult = await client.query(documentQuery, [documentId]);

            if (documentResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
                return;
            }

            const document = documentResult.rows[0];

            // Check if document has base64 data
            if (!document.file_data) {
                res.status(404).json({
                    success: false,
                    message: 'Document data not found'
                });
                return;
            }

            try {
                // Convert base64 to buffer
                const fileBuffer = Buffer.from(document.file_data, 'base64');

                // Set appropriate headers
                res.setHeader('Content-Type', document.mime_type);
                res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
                res.setHeader('Content-Length', fileBuffer.length.toString());

                // Send the file buffer
                res.send(fileBuffer);

            } catch (error) {
                console.error('Error converting base64 to buffer:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error processing document data'
                });
            }

        } catch (error) {
            console.error('Error downloading document:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while downloading document'
            });
        } finally {
            client.release();
        }
    }

    // Delete document
    static async deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
        const client = await pool.connect();
        
        try {
            const { documentId } = req.params;

            // Get document information
            const documentQuery = `
                SELECT 
                    ad.id, ad.uploaded_by_id,
                    a.hospital_id
                FROM appointment_documents ad
                JOIN appointments a ON ad.appointment_id = a.id
                WHERE ad.id = $1
            `;

            const documentResult = await client.query(documentQuery, [documentId]);

            if (documentResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
                return;
            }

            const document = documentResult.rows[0];

            // Check permissions
            const canDelete = 
                req.user?.role === 'super_admin' || 
                (req.user?.role === 'hospital_admin' && req.user.hospital_id === document.hospital_id) ||
                (req.user?.id === document.uploaded_by_id);

            if (!canDelete) {
                res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this document'
                });
                return;
            }

            // Delete from database (base64 data will be automatically removed)
            const deleteQuery = `DELETE FROM appointment_documents WHERE id = $1`;
            await client.query(deleteQuery, [documentId]);

            res.status(200).json({
                success: true,
                message: 'Document deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error while deleting document'
            });
        } finally {
            client.release();
        }
    }
}
