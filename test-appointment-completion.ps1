# Test Appointment Completion with Document Validation
Write-Host "=== Testing Appointment Completion with Document Validation ===" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3100/api"
$appointmentId = "YOUR_APPOINTMENT_ID_HERE"  # Replace with actual appointment ID
$token = "YOUR_JWT_TOKEN_HERE"                # Replace with actual token

# Headers
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "Testing appointment completion validation..." -ForegroundColor Yellow
Write-Host "Appointment ID: $appointmentId" -ForegroundColor Cyan

# Test 1: Try to complete appointment without required documents
Write-Host "`n=== Test 1: Complete without required documents ===" -ForegroundColor Magenta

$payload1 = @{
    status = "completed"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/appointments/$appointmentId" -Method Put -Body $payload1 -Headers $headers
    Write-Host "❌ Unexpected success! Should have failed due to missing documents." -ForegroundColor Red
    Write-Host ($response1 | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "✅ Expected failure - missing documents validation working!" -ForegroundColor Green
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $errorResponse = $responseBody | ConvertFrom-Json
        Write-Host "Error message: $($errorResponse.message)" -ForegroundColor Yellow
        if ($errorResponse.data) {
            Write-Host "Current documents:" -ForegroundColor Cyan
            Write-Host "- Lab Reports: $($errorResponse.data.currentDocuments.labReports)" -ForegroundColor White
            Write-Host "- Prescriptions: $($errorResponse.data.currentDocuments.prescriptions)" -ForegroundColor White
            Write-Host "- Total: $($errorResponse.data.currentDocuments.total)" -ForegroundColor White
            Write-Host "Missing documents: $($errorResponse.data.missingDocuments -join ', ')" -ForegroundColor Red
        }
    }
}

# Test 2: Upload required documents first
Write-Host "`n=== Test 2: Upload required documents ===" -ForegroundColor Magenta

# Create test files for upload
$tempDir = "C:\temp\appointment-test"
if (!(Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force
}

# Create lab report file
$labReportContent = "Lab Report - Blood Test Results`nPatient: John Doe`nDate: $(Get-Date)`nResults: Normal"
$labReportFile = Join-Path $tempDir "lab_report.txt"
Set-Content -Path $labReportFile -Value $labReportContent -Encoding UTF8

# Create prescription file
$prescriptionContent = "Prescription`nPatient: John Doe`nDate: $(Get-Date)`nMedication: Paracetamol 500mg`nDosage: 1 tablet every 8 hours"
$prescriptionFile = Join-Path $tempDir "prescription.txt"
Set-Content -Path $prescriptionFile -Value $prescriptionContent -Encoding UTF8

Write-Host "Created test files:" -ForegroundColor Cyan
Write-Host "- Lab Report: $labReportFile" -ForegroundColor White
Write-Host "- Prescription: $prescriptionFile" -ForegroundColor White

# Upload lab report
Write-Host "`nUploading lab report..." -ForegroundColor Yellow
try {
    $labBytes = [System.IO.File]::ReadAllBytes($labReportFile)
    $labBase64 = [System.Convert]::ToBase64String($labBytes)
    
    $labPayload = @{
        appointmentId = $appointmentId
        documentType = "lab_report"
        description = "Blood test results"
        fileData = $labBase64
        fileName = "lab_report.txt"
        mimeType = "text/plain"
    } | ConvertTo-Json
    
    $labResponse = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/upload" -Method Post -Body $labPayload -Headers $headers
    Write-Host "✅ Lab report uploaded successfully!" -ForegroundColor Green
    Write-Host "Document ID: $($labResponse.data.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to upload lab report: $($_.Exception.Message)" -ForegroundColor Red
}

# Upload prescription
Write-Host "`nUploading prescription..." -ForegroundColor Yellow
try {
    $prescriptionBytes = [System.IO.File]::ReadAllBytes($prescriptionFile)
    $prescriptionBase64 = [System.Convert]::ToBase64String($prescriptionBytes)
    
    $prescriptionPayload = @{
        appointmentId = $appointmentId
        documentType = "prescription"
        description = "Patient prescription"
        fileData = $prescriptionBase64
        fileName = "prescription.txt"
        mimeType = "text/plain"
    } | ConvertTo-Json
    
    $prescriptionResponse = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/upload" -Method Post -Body $prescriptionPayload -Headers $headers
    Write-Host "✅ Prescription uploaded successfully!" -ForegroundColor Green
    Write-Host "Document ID: $($prescriptionResponse.data.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to upload prescription: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Try to complete appointment with all required documents
Write-Host "`n=== Test 3: Complete with all required documents ===" -ForegroundColor Magenta

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/appointments/$appointmentId" -Method Put -Body $payload1 -Headers $headers
    Write-Host "✅ Appointment completed successfully!" -ForegroundColor Green
    Write-Host "Status: $($response3.data.status)" -ForegroundColor Cyan
    Write-Host "Message: $($response3.message)" -ForegroundColor Cyan
    
    if ($response3.data.documents) {
        Write-Host "`nDocument Summary:" -ForegroundColor Yellow
        Write-Host "Total Documents: $($response3.data.documents.totalDocuments)" -ForegroundColor White
        
        foreach ($docType in $response3.data.documents.documentsByType.PSObject.Properties) {
            Write-Host "- $($docType.Name): $($docType.Value.count) documents" -ForegroundColor White
            $docType.Value.documents | ForEach-Object { Write-Host "  * $_" -ForegroundColor Gray }
        }
    }
    
    Write-Host "`nFull Response:" -ForegroundColor Yellow
    $response3 | ConvertTo-Json -Depth 4
    
} catch {
    Write-Host "❌ Failed to complete appointment: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}

# Test 4: Verify appointment status
Write-Host "`n=== Test 4: Verify appointment status ===" -ForegroundColor Magenta

try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/appointments/$appointmentId" -Method Get -Headers $headers
    Write-Host "✅ Appointment status verified!" -ForegroundColor Green
    Write-Host "Current Status: $($statusResponse.data.status)" -ForegroundColor Cyan
    Write-Host "Document Count: $($statusResponse.data.documentCount)" -ForegroundColor Cyan
    Write-Host "Last Updated: $($statusResponse.data.updatedAt)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get appointment status: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Try to complete already completed appointment
Write-Host "`n=== Test 5: Try to complete already completed appointment ===" -ForegroundColor Magenta

try {
    $response5 = Invoke-RestMethod -Uri "$baseUrl/appointments/$appointmentId" -Method Put -Body $payload1 -Headers $headers
    Write-Host "✅ Update successful (already completed)" -ForegroundColor Green
    Write-Host "Status: $($response5.data.status)" -ForegroundColor Cyan
} catch {
    Write-Host "ℹ️  Response for already completed appointment:" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host $responseBody -ForegroundColor Gray
    }
}

# Cleanup
Write-Host "`n=== Cleanup ===" -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Test files cleaned up." -ForegroundColor Green

Write-Host "`n=== Instructions ===" -ForegroundColor Cyan
Write-Host "1. Replace 'YOUR_JWT_TOKEN_HERE' with a valid JWT token" -ForegroundColor White
Write-Host "2. Replace 'YOUR_APPOINTMENT_ID_HERE' with a valid appointment UUID" -ForegroundColor White
Write-Host "3. Ensure your server is running on localhost:3100" -ForegroundColor White
Write-Host "4. Check server logs for detailed debug information" -ForegroundColor White

Write-Host "`n=== Expected Behavior ===" -ForegroundColor Green
Write-Host "✅ Step 1: Fail to complete without documents" -ForegroundColor White
Write-Host "✅ Step 2: Upload lab_report and prescription" -ForegroundColor White
Write-Host "✅ Step 3: Successfully complete with all documents" -ForegroundColor White
Write-Host "✅ Step 4: Verify completed status" -ForegroundColor White
Write-Host "✅ Step 5: Handle already completed status" -ForegroundColor White
