# Appointment Document Upload Functionality

This document describes the file upload functionality for appointments, allowing hospitals to upload lab reports, prescriptions, operation sheets, and other medical documents.

## Features

- ✅ **Multiple Document Types**: Support for lab reports, prescriptions, operation sheets, and other documents
- ✅ **File Type Validation**: Only allows medical document formats (PDF, images, DOC, DOCX, TXT, XLS, XLSX)
- ✅ **File Size Limits**: Maximum 50MB per file, up to 5 files per upload
- ✅ **Access Control**: Hospital admins can only upload to their own hospital's appointments
- ✅ **Secure Storage**: Files stored securely with unique names and metadata in database
- ✅ **Document Management**: Upload, download, view, and delete documents
- ✅ **Grouped Retrieval**: Documents organized by type for easy viewing

## API Endpoints

### Upload Single Document
```http
POST /api/appointment-documents/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- document: File (required)
- appointmentId: UUID (required)
- documentType: lab_report|prescription|operation_sheet|other (required)
- description: String (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "doc-uuid",
    "appointmentId": "appointment-uuid",
    "documentType": "lab_report",
    "documentName": "lab_results.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "uploadedBy": "hospital_admin",
    "description": "Blood test results",
    "createdDate": "2025-07-15T10:30:00Z",
    "appointment": {
      "patientName": "John Doe",
      "hospitalName": "City General Hospital"
    }
  }
}
```

### Upload Multiple Documents
```http
POST /api/appointment-documents/upload-multiple
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- documents[]: Files (required, max 5 files)
- appointmentId: UUID (required)
- documentType: lab_report|prescription|operation_sheet|other (required)
- description: String (optional)
```

### Get Documents for Appointment
```http
GET /api/appointment-documents/appointment/{appointmentId}
Query Parameters:
- documentType: lab_report|prescription|operation_sheet|other (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment documents retrieved successfully",
  "data": {
    "appointmentId": "appointment-uuid",
    "appointment": {
      "patientName": "John Doe",
      "hospitalName": "City General Hospital",
      "status": "completed"
    },
    "documents": {
      "labReports": [
        {
          "id": "doc-uuid",
          "documentName": "blood_test.pdf",
          "fileSize": 1024000,
          "mimeType": "application/pdf",
          "uploadedBy": "hospital_admin",
          "description": "Blood test results",
          "createdDate": "2025-07-15T10:30:00Z"
        }
      ],
      "prescriptions": [...],
      "operationSheets": [...],
      "other": [...]
    },
    "totalCount": 4
  }
}
```

### Download Document
```http
GET /api/appointment-documents/download/{documentId}
```

**Response:** File download with appropriate headers

### Delete Document
```http
DELETE /api/appointment-documents/{documentId}
Authorization: Bearer {token}
```

## Document Types

| Type | Description | Use Case |
|------|-------------|----------|
| `lab_report` | Laboratory test results | Blood tests, urine tests, X-rays, etc. |
| `prescription` | Doctor's prescription | Medication lists, dosage instructions |
| `operation_sheet` | Surgical procedure notes | Pre-op, post-op documentation |
| `other` | Miscellaneous documents | Referrals, insurance forms, etc. |

## File Restrictions

### Allowed File Types
- **PDF**: `application/pdf`
- **Images**: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`
- **Documents**: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Text**: `text/plain`
- **Spreadsheets**: `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Size Limits
- **Single file**: Maximum 50MB
- **Multiple upload**: Maximum 5 files per request
- **Total storage**: No specific limit (managed by server storage)

## Security Features

### Access Control
- **Hospital Admins**: Can upload documents only for appointments in their hospital
- **Super Admins**: Can upload documents for any appointment
- **Authentication**: Bearer token required for all upload/delete operations

### File Security
- **Unique naming**: Files stored with UUID-based names to prevent conflicts
- **Path validation**: Prevents directory traversal attacks
- **Type validation**: Only allowed MIME types accepted
- **Size validation**: Prevents overly large file uploads

## Usage Examples

### PowerShell Example
```powershell
# Upload lab report
$form = @{
    appointmentId = "appointment-uuid"
    documentType = "lab_report"
    description = "Blood test results"
    document = Get-Item "C:\path\to\lab_report.pdf"
}

$headers = @{
    "Authorization" = "Bearer your-token-here"
}

$response = Invoke-RestMethod -Uri "http://localhost:3100/api/appointment-documents/upload" -Method Post -Form $form -Headers $headers
```

### JavaScript/Fetch Example
```javascript
const formData = new FormData();
formData.append('document', fileInput.files[0]);
formData.append('appointmentId', 'appointment-uuid');
formData.append('documentType', 'prescription');
formData.append('description', 'Post-consultation prescription');

const response = await fetch('/api/appointment-documents/upload', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer your-token-here'
    },
    body: formData
});
```

## Error Handling

### Common Error Responses

**File too large:**
```json
{
  "success": false,
  "message": "File size too large. Maximum size is 50MB."
}
```

**Invalid file type:**
```json
{
  "success": false,
  "message": "Invalid file type. Only PDF, images, DOC, DOCX, TXT, XLS, and XLSX files are allowed."
}
```

**Unauthorized access:**
```json
{
  "success": false,
  "message": "You can only upload documents for appointments in your hospital"
}
```

**Appointment not found:**
```json
{
  "success": false,
  "message": "Appointment not found"
}
```

## Database Schema

### appointment_documents Table
```sql
CREATE TABLE appointment_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('lab_report', 'prescription', 'operation_sheet', 'other')),
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    uploaded_by_id UUID,
    description TEXT,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

Run the test script to verify functionality:
```bash
# PowerShell
./examples/test-document-upload.ps1
```

The test script will:
1. Login as hospital admin
2. Create a patient with appointment
3. Upload various document types
4. Retrieve and verify uploaded documents
5. Test file validation and error handling

## File Storage

Files are stored in the `/uploads/documents/` directory with the following structure:
```
uploads/
└── documents/
    ├── 1642234567890_123456789_lab_report.pdf
    ├── 1642234567891_987654321_prescription.jpg
    └── 1642234567892_456789123_operation_sheet.docx
```

Each file is named with a timestamp and random number to ensure uniqueness and prevent conflicts.
