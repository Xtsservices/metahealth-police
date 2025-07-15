# Get Appointment Documents API Testing Guide
# Base URL for all requests
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Get Appointment Documents API Testing Guide ===" -ForegroundColor Green

# API Endpoint Information
Write-Host "`n📋 API Endpoint Details:" -ForegroundColor Yellow
Write-Host "Method: GET" -ForegroundColor Cyan
Write-Host "URL: $baseUrl/appointment-documents/appointment/{appointmentId}" -ForegroundColor Cyan
Write-Host "Authentication: Not required for GET requests" -ForegroundColor Cyan

# URL Parameters
Write-Host "`n🔗 URL Parameters:" -ForegroundColor Yellow
Write-Host "appointmentId (required): UUID of the appointment" -ForegroundColor White

# Query Parameters
Write-Host "`n🔍 Query Parameters (Optional):" -ForegroundColor Yellow
Write-Host "documentType: Filter by document type" -ForegroundColor White
Write-Host "  - lab_report: Laboratory test results, X-rays, scans" -ForegroundColor Gray
Write-Host "  - prescription: Doctor's prescriptions and medication lists" -ForegroundColor Gray
Write-Host "  - operation_sheet: Surgical procedure notes and operation reports" -ForegroundColor Gray
Write-Host "  - other: Miscellaneous medical documents" -ForegroundColor Gray

# Example API Calls
Write-Host "`n🧪 Example API Calls:" -ForegroundColor Yellow

Write-Host "`n1. Get All Documents for an Appointment:" -ForegroundColor Magenta
$example1 = "GET $baseUrl/appointment-documents/appointment/your-appointment-uuid-here"
Write-Host $example1 -ForegroundColor White

Write-Host "`n2. Get Only Lab Reports:" -ForegroundColor Magenta
$example2 = "GET $baseUrl/appointment-documents/appointment/your-appointment-uuid-here?documentType=lab_report"
Write-Host $example2 -ForegroundColor White

Write-Host "`n3. Get Only Prescriptions:" -ForegroundColor Magenta
$example3 = "GET $baseUrl/appointment-documents/appointment/your-appointment-uuid-here?documentType=prescription"
Write-Host $example3 -ForegroundColor White

Write-Host "`n4. Get Only Operation Sheets:" -ForegroundColor Magenta
$example4 = "GET $baseUrl/appointment-documents/appointment/your-appointment-uuid-here?documentType=operation_sheet"
Write-Host $example4 -ForegroundColor White

Write-Host "`n5. Get Other Documents:" -ForegroundColor Magenta
$example5 = "GET $baseUrl/appointment-documents/appointment/your-appointment-uuid-here?documentType=other"
Write-Host $example5 -ForegroundColor White

# PowerShell Examples
Write-Host "`n💻 PowerShell Examples:" -ForegroundColor Yellow

Write-Host "`n--- Get All Documents ---" -ForegroundColor Magenta
$psExample1 = @"
# Replace with actual appointment ID
`$appointmentId = "your-appointment-uuid-here"

# Get all documents
`$response = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/appointment/`$appointmentId" -Method Get

# Display response
Write-Host (`$response | ConvertTo-Json -Depth 4)
"@
Write-Host $psExample1 -ForegroundColor Gray

Write-Host "`n--- Get Filtered Documents ---" -ForegroundColor Magenta
$psExample2 = @"
# Replace with actual appointment ID
`$appointmentId = "your-appointment-uuid-here"
`$documentType = "lab_report"

# Get filtered documents
`$response = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/appointment/`$appointmentId?documentType=`$documentType" -Method Get

# Display response
Write-Host (`$response | ConvertTo-Json -Depth 4)
"@
Write-Host $psExample2 -ForegroundColor Gray

# JavaScript/Fetch Examples
Write-Host "`n🌐 JavaScript/Fetch Examples:" -ForegroundColor Yellow

Write-Host "`n--- Get All Documents ---" -ForegroundColor Magenta
$jsExample1 = @"
// Get all documents for an appointment
const appointmentId = 'your-appointment-uuid-here';

const response = await fetch(`$baseUrl/appointment-documents/appointment/`${appointmentId}`);
const result = await response.json();

console.log('All Documents:', result);
"@
Write-Host $jsExample1 -ForegroundColor Gray

Write-Host "`n--- Get Filtered Documents ---" -ForegroundColor Magenta
$jsExample2 = @"
// Get only lab reports for an appointment
const appointmentId = 'your-appointment-uuid-here';
const documentType = 'lab_report';

const response = await fetch(`$baseUrl/appointment-documents/appointment/`${appointmentId}?documentType=`${documentType}`);
const result = await response.json();

console.log('Lab Reports:', result);
"@
Write-Host $jsExample2 -ForegroundColor Gray

# cURL Examples
Write-Host "`n🔧 cURL Examples:" -ForegroundColor Yellow

Write-Host "`n--- Get All Documents ---" -ForegroundColor Magenta
$curlExample1 = @"
curl -X GET "$baseUrl/appointment-documents/appointment/your-appointment-uuid-here"
"@
Write-Host $curlExample1 -ForegroundColor Gray

Write-Host "`n--- Get Lab Reports Only ---" -ForegroundColor Magenta
$curlExample2 = @"
curl -X GET "$baseUrl/appointment-documents/appointment/your-appointment-uuid-here?documentType=lab_report"
"@
Write-Host $curlExample2 -ForegroundColor Gray

# Expected Response Format
Write-Host "`n📊 Expected Success Response:" -ForegroundColor Yellow

$successResponse = @"
{
  "success": true,
  "message": "Appointment documents retrieved successfully",
  "data": {
    "appointmentId": "appointment-uuid-here",
    "appointment": {
      "patientName": "John Doe",
      "hospitalName": "City General Hospital",
      "status": "confirmed"
    },
    "documents": {
      "labReports": [
        {
          "id": "doc-uuid-1",
          "appointmentId": "appointment-uuid",
          "documentType": "lab_report",
          "documentName": "blood_test.pdf",
          "fileSize": 1024000,
          "mimeType": "application/pdf",
          "uploadedBy": "hospital_admin",
          "uploadedById": "user-uuid",
          "description": "Blood test results",
          "createdDate": "2025-07-15T10:30:00Z",
          "updatedAt": "2025-07-15T10:30:00Z"
        }
      ],
      "prescriptions": [
        {
          "id": "doc-uuid-2",
          "appointmentId": "appointment-uuid",
          "documentType": "prescription",
          "documentName": "prescription.pdf",
          "fileSize": 512000,
          "mimeType": "application/pdf",
          "uploadedBy": "hospital_admin",
          "uploadedById": "user-uuid",
          "description": "Post-consultation medication",
          "createdDate": "2025-07-15T11:00:00Z",
          "updatedAt": "2025-07-15T11:00:00Z"
        }
      ],
      "operationSheets": [],
      "other": []
    },
    "totalCount": 2,
    "filter": {
      "documentType": null
    }
  }
}
"@
Write-Host $successResponse -ForegroundColor Gray

# Error Responses
Write-Host "`n❌ Common Error Responses:" -ForegroundColor Yellow

Write-Host "`nAppointment not found:" -ForegroundColor Red
$errorResponse1 = @"
{
  "success": false,
  "message": "Appointment not found"
}
"@
Write-Host $errorResponse1 -ForegroundColor Gray

Write-Host "`nServer error:" -ForegroundColor Red
$errorResponse2 = @"
{
  "success": false,
  "message": "Internal server error while retrieving documents"
}
"@
Write-Host $errorResponse2 -ForegroundColor Gray

# Response Structure Explanation
Write-Host "`n📋 Response Structure:" -ForegroundColor Yellow
Write-Host "✓ Documents are grouped by type for easy access" -ForegroundColor Green
Write-Host "✓ Each document includes full metadata (size, type, upload info)" -ForegroundColor Green
Write-Host "✓ Appointment details included for context" -ForegroundColor Green
Write-Host "✓ Total count provided for pagination purposes" -ForegroundColor Green
Write-Host "✓ Filter information shows what filters were applied" -ForegroundColor Green

# Integration with Other APIs
Write-Host "`n🔗 Related APIs:" -ForegroundColor Yellow
Write-Host "Download document: GET $baseUrl/appointment-documents/download/{documentId}" -ForegroundColor Cyan
Write-Host "Upload document: POST $baseUrl/appointment-documents/upload" -ForegroundColor Cyan
Write-Host "Delete document: DELETE $baseUrl/appointment-documents/{documentId}" -ForegroundColor Cyan

# Testing Tips
Write-Host "`n💡 Testing Tips:" -ForegroundColor Yellow
Write-Host "1. First create a patient with appointment to get appointmentId" -ForegroundColor White
Write-Host "2. Upload some test documents of different types" -ForegroundColor White
Write-Host "3. Test the getAppointmentDocuments API with and without filters" -ForegroundColor White
Write-Host "4. Verify the document grouping works correctly" -ForegroundColor White
Write-Host "5. Test with non-existent appointmentId to verify error handling" -ForegroundColor White

Write-Host "`n=== End of Get Appointment Documents API Guide ===" -ForegroundColor Green
