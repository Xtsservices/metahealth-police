# Test script for creating patient with mandatory appointment
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Testing Patient Creation with Mandatory Appointment ===" -ForegroundColor Green

# First, let's login as a hospital admin to get a token with hospital_id
Write-Host "`n1. Logging in as hospital admin..." -ForegroundColor Yellow

# Generate OTP for a hospital admin (assuming one exists)
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
        
        # Test 1: Create patient with default appointment values
        Write-Host "`n2. Creating patient with default appointment values..." -ForegroundColor Yellow
        
        $patientData1 = @{
            name = "John Doe"
            mobile = "9876543210"
            aadhar = "123456789012"
            policeIdNo = "POL001"
            # No appointment data provided - should use defaults
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        try {
            $response1 = Invoke-RestMethod -Uri "$baseUrl/patients/createPatient" -Method Post -Body $patientData1 -Headers $headers
            Write-Host "✓ Patient created with default appointment:" -ForegroundColor Green
            Write-Host ($response1 | ConvertTo-Json -Depth 4) -ForegroundColor White
        } catch {
            Write-Host "✗ Error creating patient with defaults: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorBody = $reader.ReadToEnd()
                Write-Host "Error details: $errorBody" -ForegroundColor Red
            }
        }
        
        # Test 2: Create patient with custom appointment values
        Write-Host "`n3. Creating patient with custom appointment values..." -ForegroundColor Yellow
        
        $tomorrow = (Get-Date).AddDays(1)
        $appointmentDate = $tomorrow.ToString("yyyy-MM-dd")
        
        $patientData2 = @{
            name = "Jane Smith"
            mobile = "9123456789"
            aadhar = "987654321012"
            policeIdNo = "POL002"
            appointmentDate = $appointmentDate
            appointmentTime = "14:30"
            purpose = "Routine health checkup"
            notes = "Patient needs comprehensive medical examination"
        } | ConvertTo-Json
        
        try {
            $response2 = Invoke-RestMethod -Uri "$baseUrl/patients/createPatient" -Method Post -Body $patientData2 -Headers $headers
            Write-Host "✓ Patient created with custom appointment:" -ForegroundColor Green
            Write-Host ($response2 | ConvertTo-Json -Depth 4) -ForegroundColor White
            
            $patientId = $response2.data.patient.id
            
            # Verify appointment was created by checking patient's appointments
            Write-Host "`n4. Verifying appointment creation..." -ForegroundColor Yellow
            try {
                $appointmentsResponse = Invoke-RestMethod -Uri "$baseUrl/appointments/patient/$patientId" -Method Get
                Write-Host "✓ Patient appointments:" -ForegroundColor Green
                Write-Host ($appointmentsResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
            } catch {
                Write-Host "✗ Error getting patient appointments: $($_.Exception.Message)" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "✗ Error creating patient with custom appointment: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorBody = $reader.ReadToEnd()
                Write-Host "Error details: $errorBody" -ForegroundColor Red
            }
        }
        
        # Test 3: Try to create patient with duplicate mobile (should fail with rollback)
        Write-Host "`n5. Testing rollback - duplicate mobile number..." -ForegroundColor Yellow
        
        $duplicatePatientData = @{
            name = "Bob Johnson"
            mobile = "9876543210"  # Same as first patient
            aadhar = "111222333444"
            policeIdNo = "POL003"
        } | ConvertTo-Json
        
        try {
            $response3 = Invoke-RestMethod -Uri "$baseUrl/patients/createPatient" -Method Post -Body $duplicatePatientData -Headers $headers
            Write-Host "✗ This should have failed due to duplicate mobile!" -ForegroundColor Red
        } catch {
            Write-Host "✓ Correctly rejected duplicate mobile - transaction rolled back:" -ForegroundColor Green
            if ($_.Exception.Response) {
                $errorResponse = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorResponse)
                $errorBody = $reader.ReadToEnd()
                Write-Host $errorBody -ForegroundColor Yellow
            }
        }
        
    } else {
        Write-Host "✗ No OTP received. Please check if hospital admin exists." -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error during login process: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure server is running and hospital admin exists with phone 555-111-2222" -ForegroundColor Yellow
}

Write-Host "`n=== Patient Creation with Mandatory Appointment Tests Complete ===" -ForegroundColor Green
