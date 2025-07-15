# Test Hospital Status Overview with Filtering
# Make sure the server is running on http://localhost:3100

Write-Host "Testing Hospital Status Overview API with Filtering" -ForegroundColor Green

$baseUrl = "http://localhost:3100/api/dashboard"
$headers = @{'Content-Type' = 'application/json'}

Write-Host "`n1. Get ALL hospitals (no filter):" -ForegroundColor Yellow
try {
    $allHospitals = Invoke-RestMethod -Uri "$baseUrl/hospitals" -Method GET -Headers $headers
    Write-Host "Response:" -ForegroundColor Cyan
    $allHospitals | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Get ACTIVE hospitals only:" -ForegroundColor Yellow
try {
    $activeHospitals = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=active" -Method GET -Headers $headers
    Write-Host "Response:" -ForegroundColor Cyan
    $activeHospitals | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Get INACTIVE hospitals only:" -ForegroundColor Yellow
try {
    $inactiveHospitals = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=inactive" -Method GET -Headers $headers
    Write-Host "Response:" -ForegroundColor Cyan
    $inactiveHospitals | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Get SUSPENDED hospitals only:" -ForegroundColor Yellow
try {
    $suspendedHospitals = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=suspended" -Method GET -Headers $headers
    Write-Host "Response:" -ForegroundColor Cyan
    $suspendedHospitals | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5. Get REJECTED hospitals only:" -ForegroundColor Yellow
try {
    $rejectedHospitals = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=rejected" -Method GET -Headers $headers
    Write-Host "Response:" -ForegroundColor Cyan
    $rejectedHospitals | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n6. Test invalid status (should return error):" -ForegroundColor Yellow
try {
    $invalidStatus = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=red" -Method GET -Headers $headers
    Write-Host "Unexpected: Invalid status was accepted!" -ForegroundColor Red
    $invalidStatus | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected: Invalid status rejected" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error Response:" -ForegroundColor Cyan
    $errorResponse | ConvertTo-Json -Depth 2
}

Write-Host "`n7. Test another invalid status (should return error):" -ForegroundColor Yellow
try {
    $invalidStatus2 = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=invalid" -Method GET -Headers $headers
    Write-Host "Unexpected: Invalid status was accepted!" -ForegroundColor Red
    $invalidStatus2 | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Expected: Invalid status rejected" -ForegroundColor Green
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error Response:" -ForegroundColor Cyan
    $errorResponse | ConvertTo-Json -Depth 2
}

Write-Host "`nTesting completed!" -ForegroundColor Green
Write-Host "Available status filters: active, inactive, suspended, rejected" -ForegroundColor Cyan
Write-Host "Usage: GET /api/dashboard/hospitals?status=<status>" -ForegroundColor Cyan
