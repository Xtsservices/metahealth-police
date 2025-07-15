# Test script for creating patient with appointment
$baseUrl = "http://localhost:3100/api"

Write-Host "=== Testing Patient Creation with Appointment ===" -ForegroundColor Green

# First, let's get a hospital ID (assuming there's at least one hospital)
Write-Host "`n1. Getting hospital list..." -ForegroundColor Yellow
try {
    $hospitalsResponse = Invoke-RestMethod -Uri "$baseUrl/hospitals" -Method Get
    if ($hospitalsResponse.success -and $hospitalsResponse.data.length -gt 0) {
        $hospitalId = $hospitalsResponse.data[0].id
        $hospitalName = $hospitalsResponse.data[0].name
        Write-Host "Using Hospital: $hospitalName (ID: $hospitalId)" -ForegroundColor Cyan
    } else {
        Write-Host "No hospitals found. Please create a hospital first." -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "Error getting hospitals: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# Test 1: Create patient only (without appointment)
Write-Host "`n2. Creating patient without appointment..." -ForegroundColor Yellow
$patientOnlyData = @{
    name = "John Doe"
    mobile = "9876543210"
    aadhar = "123456789012"
    policeIdNo = "POL001"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/patients" -Method Post -Body $patientOnlyData -ContentType "application/json"
    Write-Host "✓ Patient created successfully:" -ForegroundColor Green
    Write-Host ($response1 | ConvertTo-Json -Depth 3) -ForegroundColor White
} catch {
    Write-Host "✗ Error creating patient: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Create patient with appointment
Write-Host "`n3. Creating patient with appointment..." -ForegroundColor Yellow

# Calculate tomorrow's date and time
$tomorrow = (Get-Date).AddDays(1)
$appointmentDate = $tomorrow.ToString("yyyy-MM-dd")
$appointmentTime = "14:30"

$patientWithAppointmentData = @{
    name = "Jane Smith"
    mobile = "9123456789"
    aadhar = "987654321012"
    policeIdNo = "POL002"
    hospitalId = $hospitalId
    appointmentDate = $appointmentDate
    appointmentTime = $appointmentTime
    purpose = "Regular health checkup"
    notes = "Patient requires consultation for routine medical examination"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/patients" -Method Post -Body $patientWithAppointmentData -ContentType "application/json"
    Write-Host "✓ Patient and appointment created successfully:" -ForegroundColor Green
    Write-Host ($response2 | ConvertTo-Json -Depth 3) -ForegroundColor White
    
    $patientId = $response2.data.patient.id
    $appointmentId = $response2.data.appointment.id
    
    # Test 3: Verify appointment was created by checking patient's appointments
    Write-Host "`n4. Verifying appointment creation..." -ForegroundColor Yellow
    try {
        $appointmentsResponse = Invoke-RestMethod -Uri "$baseUrl/appointments/patient/$patientId" -Method Get
        Write-Host "✓ Patient appointments:" -ForegroundColor Green
        Write-Host ($appointmentsResponse | ConvertTo-Json -Depth 3) -ForegroundColor White
    } catch {
        Write-Host "✗ Error getting patient appointments: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "✗ Error creating patient with appointment: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}

# Test 4: Try to create patient with incomplete appointment data (should fail)
Write-Host "`n5. Testing validation - incomplete appointment data..." -ForegroundColor Yellow
$incompleteAppointmentData = @{
    name = "Bob Johnson"
    mobile = "9555666777"
    aadhar = "111222333444"
    policeIdNo = "POL003"
    hospitalId = $hospitalId
    # Missing appointmentDate, appointmentTime, and purpose
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/patients" -Method Post -Body $incompleteAppointmentData -ContentType "application/json"
    Write-Host "✗ This should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✓ Validation worked correctly - incomplete appointment data rejected:" -ForegroundColor Green
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host $errorBody -ForegroundColor Yellow
    }
}

Write-Host "`n=== Patient Creation with Appointment Tests Complete ===" -ForegroundColor Green
