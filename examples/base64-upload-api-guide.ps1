# Base64 Document Upload API Guide
# Base URL for all requests
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Base64 Document Upload API Guide ===" -ForegroundColor Green

# API Endpoint Information
Write-Host "`n📋 API Endpoint Details:" -ForegroundColor Yellow
Write-Host "Method: POST" -ForegroundColor Cyan
Write-Host "URL: $baseUrl/appointment-documents/upload" -ForegroundColor Cyan
Write-Host "Content-Type: application/json (for base64) OR multipart/form-data (for files)" -ForegroundColor Cyan
Write-Host "Authentication: Bearer token required" -ForegroundColor Cyan

# Supported Upload Formats
Write-Host "`n🔄 Supported Upload Formats:" -ForegroundColor Yellow
Write-Host "1. Multipart/Form-Data (traditional file upload)" -ForegroundColor White
Write-Host "2. Base64 JSON (new - encoded file in JSON)" -ForegroundColor White

# Base64 Upload Payload Structure
Write-Host "`n📦 Base64 Upload Payload Structure:" -ForegroundColor Yellow

$base64PayloadExample = @"
{
  "appointmentId": "appointment-uuid-here",
  "documentType": "lab_report",
  "description": "Blood test results",
  "fileData": "base64-encoded-file-data-here",
  "fileName": "blood_test.pdf",
  "mimeType": "application/pdf"
}
"@

Write-Host $base64PayloadExample -ForegroundColor Gray

# Required Fields for Base64 Upload
Write-Host "`n✅ Required Fields for Base64 Upload:" -ForegroundColor Yellow
Write-Host "appointmentId: UUID of the appointment (required)" -ForegroundColor White
Write-Host "documentType: Type of document (required)" -ForegroundColor White
Write-Host "fileData: Base64 encoded file content (required)" -ForegroundColor White
Write-Host "fileName: Original filename with extension (required)" -ForegroundColor White
Write-Host "mimeType: MIME type of the file (required)" -ForegroundColor White
Write-Host "description: File description (optional)" -ForegroundColor Gray

# Document Types
Write-Host "`n📂 Valid Document Types:" -ForegroundColor Yellow
Write-Host "lab_report - Laboratory test results, X-rays, scans" -ForegroundColor White
Write-Host "prescription - Doctor's prescriptions and medication lists" -ForegroundColor White
Write-Host "operation_sheet - Surgical procedure notes and operation reports" -ForegroundColor White
Write-Host "other - Miscellaneous medical documents" -ForegroundColor White

# Base64 Format Options
Write-Host "`n🔤 Base64 Format Options:" -ForegroundColor Yellow
Write-Host "1. Raw Base64: 'iVBORw0KGgoAAAANSUhEUgAA...'" -ForegroundColor White
Write-Host "2. Data URL: 'data:application/pdf;base64,iVBORw0KGgoAAAANSUhEUgAA...'" -ForegroundColor White

# PowerShell Examples
Write-Host "`n💻 PowerShell Examples:" -ForegroundColor Yellow

Write-Host "`n--- Convert File to Base64 ---" -ForegroundColor Magenta
$psConvertExample = @"
# Convert file to base64
`$filePath = "C:\temp\test_document.pdf"
`$fileBytes = [System.IO.File]::ReadAllBytes(`$filePath)
`$base64String = [System.Convert]::ToBase64String(`$fileBytes)

# Get file info
`$fileName = [System.IO.Path]::GetFileName(`$filePath)
`$extension = [System.IO.Path]::GetExtension(`$filePath)

# Determine MIME type
`$mimeType = switch (`$extension.ToLower()) {
    ".pdf" { "application/pdf" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".png" { "image/png" }
    ".doc" { "application/msword" }
    ".docx" { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    ".txt" { "text/plain" }
    default { "application/octet-stream" }
}

Write-Host "File: `$fileName"
Write-Host "MIME Type: `$mimeType"
Write-Host "Base64 Length: `$(`$base64String.Length) characters"
"@
Write-Host $psConvertExample -ForegroundColor Gray

Write-Host "`n--- Upload Base64 Document ---" -ForegroundColor Magenta
$psUploadExample = @"
# Prepare the payload
`$payload = @{
    appointmentId = "your-appointment-uuid-here"
    documentType = "lab_report"
    description = "Blood test results from laboratory"
    fileData = `$base64String
    fileName = `$fileName
    mimeType = `$mimeType
} | ConvertTo-Json

# Set headers
`$headers = @{
    'Authorization' = 'Bearer your-token-here'
    'Content-Type' = 'application/json'
}

# Upload document
`$response = Invoke-RestMethod -Uri '$baseUrl/appointment-documents/upload' -Method Post -Body `$payload -Headers `$headers

# Display response
Write-Host (`$response | ConvertTo-Json -Depth 3)
"@
Write-Host $psUploadExample -ForegroundColor Gray

# JavaScript/Fetch Examples
Write-Host "`n🌐 JavaScript/Fetch Examples:" -ForegroundColor Yellow

Write-Host "`n--- Convert File to Base64 (Browser) ---" -ForegroundColor Magenta
$jsConvertExample = @"
// Convert file to base64 in browser
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Extract base64 part from data URL
            const base64 = reader.result.split(',')[1];
            resolve({
                base64: base64,
                fileName: file.name,
                mimeType: file.type
            });
        };
        reader.onerror = error => reject(error);
    });
}

// Usage with file input
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

fileToBase64(file).then(result => {
    console.log('Base64:', result.base64);
    console.log('File Name:', result.fileName);
    console.log('MIME Type:', result.mimeType);
});
"@
Write-Host $jsConvertExample -ForegroundColor Gray

Write-Host "`n--- Upload Base64 Document (JavaScript) ---" -ForegroundColor Magenta
$jsUploadExample = @"
// Upload base64 document
async function uploadBase64Document(appointmentId, documentType, fileData, fileName, mimeType, description, token) {
    const payload = {
        appointmentId: appointmentId,
        documentType: documentType,
        description: description,
        fileData: fileData, // Raw base64 string
        fileName: fileName,
        mimeType: mimeType
    };

    const response = await fetch('$baseUrl/appointment-documents/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    return result;
}

// Example usage
const result = await uploadBase64Document(
    'your-appointment-uuid',
    'lab_report',
    'iVBORw0KGgoAAAANSUhEUgAA...', // base64 string
    'blood_test.pdf',
    'application/pdf',
    'Blood test results',
    'your-auth-token'
);

console.log(result);
"@
Write-Host $jsUploadExample -ForegroundColor Gray

# cURL Examples
Write-Host "`n🔧 cURL Examples:" -ForegroundColor Yellow

Write-Host "`n--- Upload Base64 Document ---" -ForegroundColor Magenta
$curlExample = @"
curl -X POST $baseUrl/appointment-documents/upload \
  -H "Authorization: Bearer your-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "your-appointment-uuid-here",
    "documentType": "lab_report",
    "description": "Blood test results",
    "fileData": "iVBORw0KGgoAAAANSUhEUgAA...",
    "fileName": "blood_test.pdf",
    "mimeType": "application/pdf"
  }'
"@
Write-Host $curlExample -ForegroundColor Gray

# Expected Response
Write-Host "`n📊 Expected Success Response:" -ForegroundColor Yellow

$successResponse = @"
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "doc-uuid-here",
    "appointmentId": "appointment-uuid-here",
    "documentType": "lab_report",
    "documentName": "blood_test.pdf",
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
"@
Write-Host $successResponse -ForegroundColor Gray

# Error Examples
Write-Host "`n❌ Common Error Responses:" -ForegroundColor Yellow

Write-Host "`nMissing required fields for base64:" -ForegroundColor Red
$errorResponse1 = @"
{
  "success": false,
  "message": "For base64 uploads, fileName and mimeType are required"
}
"@
Write-Host $errorResponse1 -ForegroundColor Gray

Write-Host "`nInvalid base64 format:" -ForegroundColor Red
$errorResponse2 = @"
{
  "success": false,
  "message": "Invalid base64 format. Provide either data URL or raw base64 string"
}
"@
Write-Host $errorResponse2 -ForegroundColor Gray

Write-Host "`nFile too large:" -ForegroundColor Red
$errorResponse3 = @"
{
  "success": false,
  "message": "File too large. Maximum size is 50MB"
}
"@
Write-Host $errorResponse3 -ForegroundColor Gray

# File Size and Type Limits
Write-Host "`n📏 File Limits:" -ForegroundColor Yellow
Write-Host "Maximum file size: 50MB" -ForegroundColor White
Write-Host "Supported formats: PDF, Images (JPG, PNG, GIF), Documents (DOC, DOCX), Text files, Spreadsheets" -ForegroundColor White

# MIME Types Reference
Write-Host "`n📋 Common MIME Types:" -ForegroundColor Yellow
Write-Host "PDF: application/pdf" -ForegroundColor White
Write-Host "JPEG: image/jpeg" -ForegroundColor White
Write-Host "PNG: image/png" -ForegroundColor White
Write-Host "Word: application/msword" -ForegroundColor White
Write-Host "Word (new): application/vnd.openxmlformats-officedocument.wordprocessingml.document" -ForegroundColor White
Write-Host "Text: text/plain" -ForegroundColor White
Write-Host "Excel: application/vnd.ms-excel" -ForegroundColor White

# Comparison with Multipart Upload
Write-Host "`n⚖️  Base64 vs Multipart Comparison:" -ForegroundColor Yellow
Write-Host "Base64 Advantages:" -ForegroundColor Green
Write-Host "  ✓ Pure JSON payload" -ForegroundColor Green
Write-Host "  ✓ Works with any HTTP client" -ForegroundColor Green
Write-Host "  ✓ Easier integration with APIs" -ForegroundColor Green
Write-Host "  ✓ No form-data handling needed" -ForegroundColor Green

Write-Host "Base64 Disadvantages:" -ForegroundColor Red
Write-Host "  ✗ ~33% larger payload size" -ForegroundColor Red
Write-Host "  ✗ Entire file must be in memory" -ForegroundColor Red
Write-Host "  ✗ Not suitable for very large files" -ForegroundColor Red

Write-Host "Multipart Advantages:" -ForegroundColor Green
Write-Host "  ✓ Efficient for large files" -ForegroundColor Green
Write-Host "  ✓ Streaming upload support" -ForegroundColor Green
Write-Host "  ✓ Native browser support" -ForegroundColor Green

# Usage Recommendations
Write-Host "`n💡 Usage Recommendations:" -ForegroundColor Yellow
Write-Host "Use Base64 for:" -ForegroundColor White
Write-Host "  • Small to medium files (< 10MB)" -ForegroundColor Gray
Write-Host "  • API integrations without form support" -ForegroundColor Gray
Write-Host "  • Mobile app file uploads" -ForegroundColor Gray
Write-Host "  • JSON-only architectures" -ForegroundColor Gray

Write-Host "Use Multipart for:" -ForegroundColor White
Write-Host "  • Large files (> 10MB)" -ForegroundColor Gray
Write-Host "  • Web browser uploads" -ForegroundColor Gray
Write-Host "  • Streaming scenarios" -ForegroundColor Gray
Write-Host "  • Traditional file upload forms" -ForegroundColor Gray

Write-Host "`n=== End of Base64 Upload API Guide ===" -ForegroundColor Green
