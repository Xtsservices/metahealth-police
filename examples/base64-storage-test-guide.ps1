# Base64 Storage Document Upload API Guide
# Base URL for all requests
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Base64 Storage Document Upload System ===" -ForegroundColor Green

# System Overview
Write-Host "`n📋 System Overview:" -ForegroundColor Yellow
Write-Host "✅ Normal file uploads are converted to base64 and stored in database" -ForegroundColor White
Write-Host "✅ JSON uploads with base64 data are stored directly in database" -ForegroundColor White
Write-Host "✅ No physical files are stored on disk - everything in database" -ForegroundColor White
Write-Host "✅ Downloads convert base64 back to files for users" -ForegroundColor White

# Upload Methods
Write-Host "`n🔄 Upload Methods Supported:" -ForegroundColor Yellow

Write-Host "`n1. Traditional Multipart Upload (Converted to Base64):" -ForegroundColor Magenta
$multipartExample = @"
POST $baseUrl/appointment-documents/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- document: [File] (will be converted to base64 and stored in DB)
- appointmentId: "appointment-uuid"
- documentType: "lab_report"
- description: "Blood test results"
"@
Write-Host $multipartExample -ForegroundColor Gray

Write-Host "`n2. Direct Base64 JSON Upload:" -ForegroundColor Magenta
$base64Example = @"
POST $baseUrl/appointment-documents/upload
Content-Type: application/json
Authorization: Bearer {token}

{
  "appointmentId": "appointment-uuid",
  "documentType": "lab_report",
  "description": "Blood test results",
  "fileData": "iVBORw0KGgoAAAANSUhEUgAA...",
  "fileName": "blood_test.pdf",
  "mimeType": "application/pdf"
}
"@
Write-Host $base64Example -ForegroundColor Gray

# PowerShell Testing Examples
Write-Host "`n💻 PowerShell Testing Examples:" -ForegroundColor Yellow

Write-Host "`n--- Test Multipart Upload (Auto-converts to Base64) ---" -ForegroundColor Magenta
$psMultipartExample = @"
# Create a test file
`$testFile = 'C:\temp\test_document.pdf'
Set-Content -Path `$testFile -Value 'This is a test PDF document content'

# Prepare form data for multipart upload
`$form = @{
    appointmentId = 'your-appointment-uuid-here'
    documentType = 'lab_report'
    description = 'Blood test results from laboratory'
    document = Get-Item `$testFile
}

# Set headers
`$headers = @{
    'Authorization' = 'Bearer your-token-here'
}

# Upload document (will be converted to base64 internally)
`$response = Invoke-RestMethod -Uri '$baseUrl/appointment-documents/upload' -Method Post -Form `$form -Headers `$headers

# Display response
Write-Host (`$response | ConvertTo-Json -Depth 3)
"@
Write-Host $psMultipartExample -ForegroundColor Gray

Write-Host "`n--- Test Direct Base64 Upload ---" -ForegroundColor Magenta
$psBase64Example = @"
# Convert file to base64
`$filePath = "C:\temp\test_document.pdf"
`$fileBytes = [System.IO.File]::ReadAllBytes(`$filePath)
`$base64String = [System.Convert]::ToBase64String(`$fileBytes)

# Prepare JSON payload
`$payload = @{
    appointmentId = "your-appointment-uuid-here"
    documentType = "lab_report"
    description = "Blood test results from laboratory"
    fileData = `$base64String
    fileName = "test_document.pdf"
    mimeType = "application/pdf"
} | ConvertTo-Json

# Set headers
`$headers = @{
    'Authorization' = 'Bearer your-token-here'
    'Content-Type' = 'application/json'
}

# Upload document as base64
`$response = Invoke-RestMethod -Uri '$baseUrl/appointment-documents/upload' -Method Post -Body `$payload -Headers `$headers

# Display response
Write-Host (`$response | ConvertTo-Json -Depth 3)
"@
Write-Host $psBase64Example -ForegroundColor Gray

# Download Testing
Write-Host "`n📥 Download Testing:" -ForegroundColor Yellow
Write-Host "`nDownload converts base64 back to file:" -ForegroundColor Magenta
$downloadExample = @"
GET $baseUrl/appointment-documents/download/{documentId}

# PowerShell Example:
`$documentId = "your-document-uuid-here"
`$outputFile = "C:\temp\downloaded_document.pdf"

Invoke-WebRequest -Uri "$baseUrl/appointment-documents/download/`$documentId" -OutFile `$outputFile

Write-Host "Document downloaded to: `$outputFile"
"@
Write-Host $downloadExample -ForegroundColor Gray

# Get Documents Testing
Write-Host "`n📋 Get Documents Testing:" -ForegroundColor Yellow
$getDocsExample = @"
GET $baseUrl/appointment-documents/appointment/{appointmentId}

# PowerShell Example:
`$appointmentId = "your-appointment-uuid-here"
`$response = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/appointment/`$appointmentId" -Method Get

# Display documents
Write-Host (`$response | ConvertTo-Json -Depth 4)
"@
Write-Host $getDocsExample -ForegroundColor Gray

# Expected Responses
Write-Host "`n📊 Expected Success Response (Upload):" -ForegroundColor Yellow

$successResponse = @"
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "doc-uuid-here",
    "appointmentId": "appointment-uuid-here",
    "documentType": "lab_report",
    "documentName": "test_document.pdf",
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

# System Benefits
Write-Host "`n✅ Base64 Storage Benefits:" -ForegroundColor Yellow
Write-Host "🔒 No file system dependencies - everything in database" -ForegroundColor Green
Write-Host "🔄 Easy backup and restore - database contains everything" -ForegroundColor Green
Write-Host "📱 Perfect for cloud deployments and containers" -ForegroundColor Green
Write-Host "🔧 Simplified file management - no file cleanup needed" -ForegroundColor Green
Write-Host "🌐 Cross-platform compatibility" -ForegroundColor Green
Write-Host "💾 Transactional integrity - files and metadata together" -ForegroundColor Green

# Considerations
Write-Host "`n⚠️  Important Considerations:" -ForegroundColor Yellow
Write-Host "📏 File size limit: 50MB (due to base64 encoding overhead)" -ForegroundColor White
Write-Host "💾 Database storage: ~33% larger than original file size" -ForegroundColor White
Write-Host "🚀 Best for small to medium files (< 10MB recommended)" -ForegroundColor White
Write-Host "⚡ Download speed depends on database performance" -ForegroundColor White

# Testing Workflow
Write-Host "`n🧪 Complete Testing Workflow:" -ForegroundColor Yellow
Write-Host "1. Start the server: npm start" -ForegroundColor White
Write-Host "2. Login to get authentication token" -ForegroundColor White
Write-Host "3. Create a patient with appointment" -ForegroundColor White
Write-Host "4. Test multipart upload (auto-converts to base64)" -ForegroundColor White
Write-Host "5. Test direct base64 upload" -ForegroundColor White
Write-Host "6. Get documents for appointment" -ForegroundColor White
Write-Host "7. Download documents (converts base64 back to file)" -ForegroundColor White
Write-Host "8. Delete documents" -ForegroundColor White

# Database Schema
Write-Host "`n🗄️  Database Schema Changes:" -ForegroundColor Yellow
Write-Host "✅ Added: appointment_documents.file_data (TEXT) - stores base64" -ForegroundColor Green
Write-Host "⚠️  Deprecated: appointment_documents.file_path (nullable now)" -ForegroundColor Yellow
Write-Host "📊 Added: Indexes for better query performance" -ForegroundColor Green

Write-Host "`n=== System Ready for Testing! ===" -ForegroundColor Green
Write-Host "Both upload methods work - files are stored as base64 in database" -ForegroundColor Cyan
