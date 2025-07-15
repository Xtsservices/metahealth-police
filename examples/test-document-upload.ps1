# Test script for appointment document upload functionality
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Testing Appointment Document Upload Functionality ===" -ForegroundColor Green

# Function to create a test file
function Create-TestFile {
    param(
        [string]$fileName,
        [string]$content = "This is a test document for appointment."
    )
    
    $testFilePath = Join-Path $env:TEMP $fileName
    Set-Content -Path $testFilePath -Value $content
    return $testFilePath
}

# First, let's login as a hospital admin to get a token
Write-Host "`n1. Logging in as hospital admin..." -ForegroundColor Yellow

$otpData = @{
    phone = "555-111-2222"  # Replace with actual hospital admin phone
} | ConvertTo-Json

try {
    $otpResponse = Invoke-RestMethod -Uri "$baseUrl/auth/generate-otp" -Method Post -Body $otpData -ContentType "application/json"
    Write-Host "OTP Response: $($otpResponse.message)" -ForegroundColor Cyan
    
    if ($otpResponse.data.otp) {
        $otp = $otpResponse.data.otp
        Write-Host "OTP (dev mode): $otp" -ForegroundColor Yellow
        
        # Verify OTP and get token
        $verifyData = @{
            phone = "555-111-2222"
            otp = $otp
        } | ConvertTo-Json
        
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/verify-otp" -Method Post -Body $verifyData -ContentType "application/json"
        $token = $loginResponse.data.session.token
        $hospitalId = $loginResponse.data.hospital.id
        Write-Host "Login successful! Hospital ID: $hospitalId" -ForegroundColor Green
        
        # Create a test patient with appointment first
        Write-Host "`n2. Creating patient with appointment..." -ForegroundColor Yellow
        
        $tomorrow = (Get-Date).AddDays(1)
        $appointmentDate = $tomorrow.ToString("yyyy-MM-dd")
        
        $patientData = @{
            name = "Test Patient For Documents"
            mobile = "9555777888"
            aadhar = "555777888999"
            policeIdNo = "POL_DOC_001"
            appointmentDate = $appointmentDate
            appointmentTime = "15:00"
            purpose = "Document upload test appointment"
            notes = "This appointment is for testing document upload functionality"
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $patientResponse = Invoke-RestMethod -Uri "$baseUrl/patients/createPatient" -Method Post -Body $patientData -Headers $headers
        $appointmentId = $patientResponse.data.appointment.id
        Write-Host "✓ Patient and appointment created. Appointment ID: $appointmentId" -ForegroundColor Green
        
        # Test 1: Upload lab report
        Write-Host "`n3. Uploading lab report..." -ForegroundColor Yellow
        
        $labReportFile = Create-TestFile -fileName "lab_report.txt" -content "Lab Report: Blood Test Results - All values normal"
        
        # Create form data for file upload
        $form = @{
            appointmentId = $appointmentId
            documentType = "lab_report"
            description = "Blood test results from laboratory"
            document = Get-Item $labReportFile
        }
        
        try {
            $uploadResponse1 = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/upload" -Method Post -Form $form -Headers @{"Authorization" = "Bearer $token"}
            Write-Host "✓ Lab report uploaded successfully:" -ForegroundColor Green
            Write-Host ($uploadResponse1 | ConvertTo-Json -Depth 3) -ForegroundColor White
        } catch {
            Write-Host "✗ Error uploading lab report: $($_.Exception.Message)" -ForegroundColor Red
        } finally {
            Remove-Item $labReportFile -ErrorAction SilentlyContinue
        }
        
        # Test 2: Upload prescription
        Write-Host "`n4. Uploading prescription..." -ForegroundColor Yellow
        
        $prescriptionFile = Create-TestFile -fileName "prescription.txt" -content "Prescription: Paracetamol 500mg - Take twice daily after meals"
        
        $form = @{
            appointmentId = $appointmentId
            documentType = "prescription"
            description = "Post-consultation prescription"
            document = Get-Item $prescriptionFile
        }
        
        try {
            $uploadResponse2 = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/upload" -Method Post -Form $form -Headers @{"Authorization" = "Bearer $token"}
            Write-Host "✓ Prescription uploaded successfully:" -ForegroundColor Green
            Write-Host ($uploadResponse2 | ConvertTo-Json -Depth 3) -ForegroundColor White
        } catch {
            Write-Host "✗ Error uploading prescription: $($_.Exception.Message)" -ForegroundColor Red
        } finally {
            Remove-Item $prescriptionFile -ErrorAction SilentlyContinue
        }
        
        # Test 3: Upload operation sheet
        Write-Host "`n5. Uploading operation sheet..." -ForegroundColor Yellow
        
        $opSheetFile = Create-TestFile -fileName "operation_sheet.txt" -content "Operation Sheet: Minor surgical procedure - Successful completion"
        
        $form = @{
            appointmentId = $appointmentId
            documentType = "operation_sheet"
            description = "Post-operative summary"
            document = Get-Item $opSheetFile
        }
        
        try {
            $uploadResponse3 = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/upload" -Method Post -Form $form -Headers @{"Authorization" = "Bearer $token"}
            Write-Host "✓ Operation sheet uploaded successfully:" -ForegroundColor Green
            Write-Host ($uploadResponse3 | ConvertTo-Json -Depth 3) -ForegroundColor White
        } catch {
            Write-Host "✗ Error uploading operation sheet: $($_.Exception.Message)" -ForegroundColor Red
        } finally {
            Remove-Item $opSheetFile -ErrorAction SilentlyContinue
        }
        
        # Test 4: Get all documents for the appointment
        Write-Host "`n6. Retrieving all documents for appointment..." -ForegroundColor Yellow
        
        try {
            $documentsResponse = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/appointment/$appointmentId" -Method Get
            Write-Host "✓ Documents retrieved successfully:" -ForegroundColor Green
            Write-Host ($documentsResponse | ConvertTo-Json -Depth 4) -ForegroundColor White
        } catch {
            Write-Host "✗ Error retrieving documents: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Test 5: Upload multiple documents at once
        Write-Host "`n7. Uploading multiple documents..." -ForegroundColor Yellow
        
        $file1 = Create-TestFile -fileName "additional_report1.txt" -content "Additional medical report 1"
        $file2 = Create-TestFile -fileName "additional_report2.txt" -content "Additional medical report 2"
        
        # Note: Multiple file upload with Invoke-RestMethod in PowerShell is complex
        # This would typically be done with a proper form-data implementation
        Write-Host "Multiple file upload would require advanced form handling - demonstrating concept" -ForegroundColor Yellow
        
        Remove-Item $file1, $file2 -ErrorAction SilentlyContinue
        
        # Test 6: Try to upload invalid file type (should fail)
        Write-Host "`n8. Testing file validation - invalid file type..." -ForegroundColor Yellow
        
        $invalidFile = Create-TestFile -fileName "test.exe" -content "This is not a valid medical document"
        
        $form = @{
            appointmentId = $appointmentId
            documentType = "lab_report"
            description = "This should fail"
            document = Get-Item $invalidFile
        }
        
        try {
            $uploadResponse4 = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/upload" -Method Post -Form $form -Headers @{"Authorization" = "Bearer $token"}
            Write-Host "✗ This should have failed!" -ForegroundColor Red
        } catch {
            Write-Host "✓ File validation worked correctly - invalid file type rejected:" -ForegroundColor Green
            Write-Host $_.Exception.Message -ForegroundColor Yellow
        } finally {
            Remove-Item $invalidFile -ErrorAction SilentlyContinue
        }
        
    } else {
        Write-Host "✗ No OTP received. Please check if hospital admin exists." -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error during testing: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure server is running and hospital admin exists with phone 555-111-2222" -ForegroundColor Yellow
}

Write-Host "`n=== Appointment Document Upload Tests Complete ===" -ForegroundColor Green
