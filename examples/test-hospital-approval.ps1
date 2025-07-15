# Hospital Approval API Test Scripts

## Prerequisites
# 1. Start the server: npm start
# 2. Register a hospital first to have a pending hospital
# 3. Note the hospital ID from registration response

# Set headers for API calls
$headers = @{'Content-Type' = 'application/json'}

## Test 1: Get Pending Hospitals
Write-Host "=== Getting Pending Hospitals ===" -ForegroundColor Green
try {
    $pendingHospitals = Invoke-RestMethod -Uri 'http://localhost:3100/api/dashboard/pending-hospitals' -Method GET -Headers $headers
    $pendingHospitals | ConvertTo-Json -Depth 5
    
    if ($pendingHospitals.data -and $pendingHospitals.data.Count -gt 0) {
        $hospitalId = $pendingHospitals.data[0].hospital.id
        Write-Host "Found pending hospital ID: $hospitalId" -ForegroundColor Yellow
    } else {
        Write-Host "No pending hospitals found. Please register a hospital first." -ForegroundColor Red
    }
} catch {
    Write-Host "Error getting pending hospitals: $($_.Exception.Message)" -ForegroundColor Red
}

## Test 2: Register a Test Hospital (if needed)
Write-Host "`n=== Registering Test Hospital ===" -ForegroundColor Green
$hospitalData = @'
{
  "name": "Test Approval Hospital",
  "licenseNumber": "TAH-2024-001",
  "gstNumber": "12CCCCC3333C3Z3",
  "panNumber": "CCCCC3333C",
  "address": {
    "street": "300 Test Street",
    "city": "Test City",
    "state": "TS",
    "zipCode": "12345",
    "country": "USA"
  },
  "contactInfo": {
    "countryCode": "+1",
    "phone": "555-333-4444",
    "email": "admin@testapproval.com",
    "pointOfContact": "Dr. Test Admin"
  }
}
'@

try {
    $registrationResult = Invoke-RestMethod -Uri 'http://localhost:3100/api/hospitals/register' -Method POST -Headers $headers -Body $hospitalData
    $hospitalId = $registrationResult.data.hospital.id
    Write-Host "Hospital registered successfully. ID: $hospitalId" -ForegroundColor Green
    $registrationResult | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Hospital registration failed: $($_.Exception.Message)" -ForegroundColor Red
    # Try to get existing pending hospital ID
    try {
        $existingPending = Invoke-RestMethod -Uri 'http://localhost:3100/api/dashboard/pending-hospitals' -Method GET -Headers $headers
        if ($existingPending.data -and $existingPending.data.Count -gt 0) {
            $hospitalId = $existingPending.data[0].hospital.id
            Write-Host "Using existing pending hospital ID: $hospitalId" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not get existing pending hospitals" -ForegroundColor Red
        exit 1
    }
}

## Test 3: Approve Hospital
if ($hospitalId) {
    Write-Host "`n=== Approving Hospital ===" -ForegroundColor Green
    $approvalData = @'
{
  "approvedBy": "super-admin-user-id"
}
'@

    try {
        $approvalResult = Invoke-RestMethod -Uri "http://localhost:3100/api/dashboard/approve-hospital/$hospitalId" -Method PUT -Headers $headers -Body $approvalData
        Write-Host "Hospital approved successfully!" -ForegroundColor Green
        $approvalResult | ConvertTo-Json -Depth 3
    } catch {
        Write-Host "Hospital approval failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

## Test 4: Check Hospital Status After Approval
if ($hospitalId) {
    Write-Host "`n=== Checking Hospital Status ===" -ForegroundColor Green
    try {
        $hospitalStatus = Invoke-RestMethod -Uri "http://localhost:3100/api/hospitals/$hospitalId" -Method GET -Headers $headers
        Write-Host "Hospital Status: $($hospitalStatus.data.status)" -ForegroundColor Yellow
        $hospitalStatus.data | ConvertTo-Json -Depth 2
    } catch {
        Write-Host "Error checking hospital status: $($_.Exception.Message)" -ForegroundColor Red
    }
}

## Test 5: Check User Status After Approval
Write-Host "`n=== Checking Users Status ===" -ForegroundColor Green
try {
    $users = Invoke-RestMethod -Uri 'http://localhost:3100/api/users' -Method GET -Headers $headers
    Write-Host "Total users: $($users.data.Count)" -ForegroundColor Yellow
    foreach ($user in $users.data) {
        if ($user.hospitalId -eq $hospitalId) {
            Write-Host "Hospital Admin User Status: $($user.status)" -ForegroundColor Yellow
            $user | ConvertTo-Json -Depth 2
        }
    }
} catch {
    Write-Host "Error checking users: $($_.Exception.Message)" -ForegroundColor Red
}

## Test 6: Get Dashboard Stats
Write-Host "`n=== Getting Dashboard Statistics ===" -ForegroundColor Green
try {
    $dashStats = Invoke-RestMethod -Uri 'http://localhost:3100/api/dashboard/stats' -Method GET -Headers $headers
    Write-Host "Dashboard Statistics:" -ForegroundColor Yellow
    $dashStats | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error getting dashboard stats: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
