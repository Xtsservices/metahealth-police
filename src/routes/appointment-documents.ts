import { Router } from 'express';
import { AppointmentDocumentController } from '../controllers/AppointmentDocumentController';
import { validateToken } from '../middleware/tokenValidation';
import { uploadSingleDocument, uploadMultipleDocuments, handleUploadError } from '../middleware/fileUpload';

const router = Router();

// POST /api/appointment-documents/upload - Upload single document for appointment
router.post('/upload', 
    validateToken, 
    uploadSingleDocument, 
    handleUploadError, 
    AppointmentDocumentController.uploadDocument
);

// POST /api/appointment-documents/upload-multiple - Upload multiple documents for appointment
router.post('/upload-multiple', 
    validateToken, 
    uploadMultipleDocuments, 
    handleUploadError, 
    AppointmentDocumentController.uploadMultipleDocuments
);

// GET /api/appointment-documents/appointment/:appointmentId - Get all documents for an appointment
router.get('/appointment', AppointmentDocumentController.getAppointmentDocuments);

// GET /api/appointment-documents/download/:documentId - Download a document
router.get('/download/:documentId', AppointmentDocumentController.downloadDocument);

// DELETE /api/appointment-documents/:documentId - Delete a document
router.delete('/:documentId', validateToken, AppointmentDocumentController.deleteDocument);

export default router;
