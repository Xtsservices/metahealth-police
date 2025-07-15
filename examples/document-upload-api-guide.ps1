# Complete API Testing Guide for Document Upload
# Base URL for all requests
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Document Upload API Testing Guide ===" -ForegroundColor Green

# Step 1: Login to get authentication token
Write-Host "`n1. First, login to get authentication token..." -ForegroundColor Yellow

$loginPayload = @{
    phone = "555-111-2222"  # Replace with actual hospital admin phone
} | ConvertTo-Json

Write-Host "Generate OTP Payload:" -ForegroundColor Cyan
Write-Host $loginPayload -ForegroundColor White

Write-Host "`nGenerate OTP API Call:" -ForegroundColor Cyan
Write-Host "POST $baseUrl/auth/generate-otp" -ForegroundColor White
Write-Host "Content-Type: application/json" -ForegroundColor Gray
Write-Host "Body: $loginPayload" -ForegroundColor Gray

# Simulate OTP verification
$verifyPayload = @{
    phone = "555-111-2222"
    otp = "123456"  # Use actual OTP from SMS/response
} | ConvertTo-Json

Write-Host "`nVerify OTP Payload:" -ForegroundColor Cyan
Write-Host $verifyPayload -ForegroundColor White

Write-Host "`nVerify OTP API Call:" -ForegroundColor Cyan
Write-Host "POST $baseUrl/auth/verify-otp" -ForegroundColor White
Write-Host "Content-Type: application/json" -ForegroundColor Gray
Write-Host "Body: $verifyPayload" -ForegroundColor Gray

# Step 2: Create patient with appointment
Write-Host "`n2. Create patient with appointment to get appointmentId..." -ForegroundColor Yellow

$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$patientPayload = @{
    name = "Test Patient"
    mobile = "9876543210"
    aadhar = "123456789012"
    policeIdNo = "POL001"
    appointmentDate = $tomorrow
    appointmentTime = "14:30"
    purpose = "Document upload test"
    notes = "Created for testing document upload"
} | ConvertTo-Json

Write-Host "Create Patient Payload:" -ForegroundColor Cyan
Write-Host $patientPayload -ForegroundColor White

Write-Host "`nCreate Patient API Call:" -ForegroundColor Cyan
Write-Host "POST $baseUrl/patients/createPatient" -ForegroundColor White
Write-Host "Authorization: Bearer {token-from-login}" -ForegroundColor Gray
Write-Host "Content-Type: application/json" -ForegroundColor Gray
Write-Host "Body: $patientPayload" -ForegroundColor Gray

# Step 3: Upload Document Examples
Write-Host "`n3. Document Upload Examples..." -ForegroundColor Yellow

Write-Host "`n--- UPLOAD SINGLE DOCUMENT ---" -ForegroundColor Magenta

Write-Host "`nAPI Endpoint:" -ForegroundColor Cyan
Write-Host "POST $baseUrl/appointment-documents/upload" -ForegroundColor White

Write-Host "`nHeaders:" -ForegroundColor Cyan
Write-Host "Authorization: Bearer {token-from-login}" -ForegroundColor White
Write-Host "Content-Type: multipart/form-data" -ForegroundColor White

Write-Host "`nForm Data Payload:" -ForegroundColor Cyan
Write-Host "document: [File] - The actual file to upload" -ForegroundColor White
Write-Host "appointmentId: 'uuid-from-patient-creation'" -ForegroundColor White
Write-Host "documentType: 'lab_report'" -ForegroundColor White
Write-Host "description: 'Blood test results from laboratory'" -ForegroundColor White

# PowerShell Example
Write-Host "`n--- PowerShell Example ---" -ForegroundColor Magenta

$powershellExample = @"
# Create a test file
`$testFile = 'C:\temp\test_lab_report.txt'
Set-Content -Path `$testFile -Value 'This is a test lab report document'

# Prepare form data
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

# Upload document
`$response = Invoke-RestMethod -Uri '$baseUrl/appointment-documents/upload' -Method Post -Form `$form -Headers `$headers

# Display response
Write-Host (`$response | ConvertTo-Json -Depth 3)
"@

Write-Host $powershellExample -ForegroundColor Gray

# JavaScript/Fetch Example
Write-Host "`n--- JavaScript/Fetch Example ---" -ForegroundColor Magenta

$jsExample = @"
// Create form data
const formData = new FormData();
formData.append('document', fileInput.files[0]); // File from input element
formData.append('appointmentId', 'your-appointment-uuid-here');
formData.append('documentType', 'lab_report');
formData.append('description', 'Blood test results from laboratory');

// Upload document
const response = await fetch('$baseUrl/appointment-documents/upload', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer your-token-here'
        // Don't set Content-Type for multipart/form-data - browser will set it
    },
    body: formData
});

const result = await response.json();
console.log(result);
"@

Write-Host $jsExample -ForegroundColor Gray

# cURL Example
Write-Host "`n--- cURL Example ---" -ForegroundColor Magenta

$curlExample = @"
curl -X POST $baseUrl/appointment-documents/upload \
  -H "Authorization: Bearer your-token-here" \
  -F "document=@/path/to/your/file.pdf" \
  -F "appointmentId=your-appointment-uuid-here" \
  -F "documentType=lab_report" \
  -F "description=Blood test results from laboratory"
"@

Write-Host $curlExample -ForegroundColor Gray

# Document Types
Write-Host "`n--- Available Document Types ---" -ForegroundColor Magenta
Write-Host "lab_report - Laboratory test results, X-rays, scans" -ForegroundColor White
Write-Host "prescription - Doctor's prescriptions and medication lists" -ForegroundColor White
Write-Host "operation_sheet - Surgical procedure notes and operation reports" -ForegroundColor White
Write-Host "other - Miscellaneous medical documents" -ForegroundColor White

# File Types Allowed
Write-Host "`n--- Allowed File Types ---" -ForegroundColor Magenta
Write-Host "PDF files: .pdf" -ForegroundColor White
Write-Host "Images: .jpg, .jpeg, .png, .gif" -ForegroundColor White
Write-Host "Documents: .doc, .docx" -ForegroundColor White
Write-Host "Text files: .txt" -ForegroundColor White
Write-Host "Spreadsheets: .xls, .xlsx" -ForegroundColor White
Write-Host "Maximum file size: 50MB" -ForegroundColor Yellow

# Expected Response
Write-Host "`n--- Expected Success Response ---" -ForegroundColor Magenta

$successResponse = @"
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "doc-uuid-here",
    "appointmentId": "appointment-uuid-here", 
    "documentType": "lab_report",
    "documentName": "test_lab_report.txt",
    "fileSize": 1024,
    "mimeType": "text/plain",
    "uploadedBy": "hospital_admin",
    "description": "Blood test results from laboratory",
    "createdDate": "2025-07-15T10:30:00Z",
    "appointment": {
      "patientName": "Test Patient",
      "hospitalName": "City General Hospital"
    }
  }
}
"@

Write-Host $successResponse -ForegroundColor Gray

# Error Examples
Write-Host "`n--- Common Error Responses ---" -ForegroundColor Magenta

Write-Host "`nMissing file:" -ForegroundColor Red
$errorResponse1 = @"
{
  "success": false,
  "message": "No file uploaded"
}
"@
Write-Host $errorResponse1 -ForegroundColor Gray

Write-Host "`nInvalid document type:" -ForegroundColor Red
$errorResponse2 = @"
{
  "success": false,
  "message": "Invalid document type. Must be one of: lab_report, prescription, operation_sheet, other"
}
"@
Write-Host $errorResponse2 -ForegroundColor Gray

Write-Host "`nAppointment not found:" -ForegroundColor Red
$errorResponse3 = @"
{
  "success": false,
  "message": "Appointment not found"
}
"@
Write-Host $errorResponse3 -ForegroundColor Gray

Write-Host "`nUnauthorized access:" -ForegroundColor Red
$errorResponse4 = @"
{
  "success": false,
  "message": "You can only upload documents for appointments in your hospital"
}
"@
Write-Host $errorResponse4 -ForegroundColor Gray

Write-Host "`n--- Other Document Management APIs ---" -ForegroundColor Magenta

Write-Host "`nGet appointment documents:" -ForegroundColor Cyan
Write-Host "GET $baseUrl/appointment-documents/appointment/{appointmentId}" -ForegroundColor White

Write-Host "`nDownload document:" -ForegroundColor Cyan
Write-Host "GET $baseUrl/appointment-documents/download/{documentId}" -ForegroundColor White

Write-Host "`nDelete document:" -ForegroundColor Cyan
Write-Host "DELETE $baseUrl/appointment-documents/{documentId}" -ForegroundColor White
Write-Host "Authorization: Bearer {token}" -ForegroundColor Gray

Write-Host "`nUpload multiple documents:" -ForegroundColor Cyan
Write-Host "POST $baseUrl/appointment-documents/upload-multiple" -ForegroundColor White
Write-Host "Form Data: documents[] = [File Array], appointmentId, documentType, description" -ForegroundColor Gray

Write-Host "`n=== End of API Testing Guide ===" -ForegroundColor Green
