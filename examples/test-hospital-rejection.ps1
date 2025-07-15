# Hospital Rejection API Test Script

## Prerequisites
# 1. Start the server: npm start
# 2. Register a hospital first to have a pending hospital

# Set headers for API calls
$headers = @{'Content-Type' = 'application/json'}

## Step 1: Register a Test Hospital for Rejection
Write-Host "=== Registering Hospital for Rejection Test ===" -ForegroundColor Green
$hospitalData = @'
{
  "name": "Test Rejection Hospital",
  "licenseNumber": "TRH-2024-001", 
  "gstNumber": "12DDDDD4444D4Z4",
  "panNumber": "DDDDD4444D",
  "address": {
    "street": "400 Rejection Street",
    "city": "Rejection City",
    "state": "RC",
    "zipCode": "54321",
    "country": "USA"
  },
  "contactInfo": {
    "countryCode": "+1",
    "phone": "555-444-5555",
    "email": "admin@testrejection.com",
    "pointOfContact": "Dr. Rejection Test"
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
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

## Step 2: Get Pending Hospitals to Confirm
Write-Host "`n=== Checking Pending Hospitals ===" -ForegroundColor Green
try {
    $pendingHospitals = Invoke-RestMethod -Uri 'http://localhost:3100/api/dashboard/pending-hospitals' -Method GET -Headers $headers
    Write-Host "Pending hospitals count: $($pendingHospitals.count)" -ForegroundColor Yellow
    $pendingHospitals.data | ForEach-Object {
        Write-Host "Hospital: $($_.hospital.name) - Status: Pending" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error getting pending hospitals: $($_.Exception.Message)" -ForegroundColor Red
}

## Step 3: Reject Hospital
Write-Host "`n=== Rejecting Hospital ===" -ForegroundColor Green
$rejectionData = @'
{
  "rejectedBy": "super-admin-user-id",
  "reason": "Incomplete documentation provided. Missing required licenses and certifications."
}
'@

try {
    $rejectionResult = Invoke-RestMethod -Uri "http://localhost:3100/api/dashboard/reject-hospital/$hospitalId" -Method PUT -Headers $headers -Body $rejectionData
    Write-Host "Hospital rejected successfully!" -ForegroundColor Green
    $rejectionResult | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Hospital rejection failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

## Step 4: Verify Hospital Status After Rejection
Write-Host "`n=== Checking Hospital Status After Rejection ===" -ForegroundColor Green
try {
    $hospitalStatus = Invoke-RestMethod -Uri "http://localhost:3100/api/hospitals/$hospitalId" -Method GET -Headers $headers
    Write-Host "Hospital Status: $($hospitalStatus.data.status)" -ForegroundColor $(if($hospitalStatus.data.status -eq 'rejected') {'Red'} else {'Yellow'})
    $hospitalStatus.data | ConvertTo-Json -Depth 2
} catch {
    Write-Host "Error checking hospital status: $($_.Exception.Message)" -ForegroundColor Red
}

## Step 5: Check Users Status After Rejection  
Write-Host "`n=== Checking User Status After Rejection ===" -ForegroundColor Green
try {
    $users = Invoke-RestMethod -Uri 'http://localhost:3100/api/users' -Method GET -Headers $headers
    foreach ($user in $users.data) {
        if ($user.hospitalId -eq $hospitalId) {
            Write-Host "Hospital Admin User Status: $($user.status)" -ForegroundColor $(if($user.status -eq 'rejected') {'Red'} else {'Yellow'})
            $user | ConvertTo-Json -Depth 2
        }
    }
} catch {
    Write-Host "Error checking users: $($_.Exception.Message)" -ForegroundColor Red
}

## Step 6: Updated Dashboard Stats
Write-Host "`n=== Updated Dashboard Statistics ===" -ForegroundColor Green
try {
    $dashStats = Invoke-RestMethod -Uri 'http://localhost:3100/api/dashboard/stats' -Method GET -Headers $headers
    Write-Host "Dashboard Statistics:" -ForegroundColor Yellow
    $dashStats | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error getting dashboard stats: $($_.Exception.Message)" -ForegroundColor Red
}

## Step 7: Try to Approve Already Rejected Hospital (Should Fail)
Write-Host "`n=== Testing Approval of Rejected Hospital (Should Fail) ===" -ForegroundColor Green
$approvalData = @'
{
  "approvedBy": "super-admin-user-id"
}
'@

try {
    $approvalResult = Invoke-RestMethod -Uri "http://localhost:3100/api/dashboard/approve-hospital/$hospitalId" -Method PUT -Headers $headers -Body $approvalData
    Write-Host "Unexpected: Rejected hospital was approved!" -ForegroundColor Red
    $approvalResult | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected: Cannot approve rejected hospital" -ForegroundColor Green
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Green
}

Write-Host "`n=== Rejection Test Complete ===" -ForegroundColor Green
