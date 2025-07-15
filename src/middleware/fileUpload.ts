import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const documentsDir = path.join(uploadsDir, 'documents');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp_originalname
        const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const fileName = `${uniqueSuffix}${fileExtension}`;
        cb(null, fileName);
    }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allowed file types for medical documents
    const allowedMimeTypes = [
        'application/pdf',           // PDF files
        'image/jpeg',               // JPEG images
        'image/jpg',                // JPG images
        'image/png',                // PNG images
        'image/gif',                // GIF images
        'application/msword',       // DOC files
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX files
        'text/plain',               // TXT files
        'application/vnd.ms-excel', // XLS files
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // XLSX files
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, images, DOC, DOCX, TXT, XLS, and XLSX files are allowed.'));
    }
};

// Configure multer
export const uploadDocument = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 5 // Maximum 5 files per request
    }
});

// Single file upload middleware
export const uploadSingleDocument = uploadDocument.single('document');

// Multiple files upload middleware
export const uploadMultipleDocuments = uploadDocument.array('documents', 5);

// Error handling middleware for multer
export const handleUploadError = (error: any, req: any, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size too large. Maximum size is 50MB.'
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files. Maximum 5 files allowed.'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected file field.'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: 'File upload error: ' + error.message
                });
        }
    } else if (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    next();
};
