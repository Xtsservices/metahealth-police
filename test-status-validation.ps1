# Comprehensive Test for Fixed Hospital Status Filtering
# Tests both valid and invalid status values

Write-Host "=== TESTING FIXED HOSPITAL STATUS FILTERING ===" -ForegroundColor Green

$baseUrl = "http://localhost:3100/api/dashboard"
$headers = @{'Content-Type' = 'application/json'}

# Test valid statuses
$validStatuses = @('active', 'inactive', 'suspended', 'rejected')

Write-Host "`n1. Testing VALID statuses:" -ForegroundColor Yellow
foreach ($status in $validStatuses) {
    Write-Host "`n  Testing status: $status" -ForegroundColor Cyan
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=$status" -Method GET -Headers $headers
        Write-Host "  ✅ SUCCESS: Status '$status' accepted" -ForegroundColor Green
        Write-Host "  Message: $($result.message)" -ForegroundColor White
        Write-Host "  Count: $($result.count)" -ForegroundColor White
        if ($result.filter) {
            Write-Host "  Filter Applied: $($result.filter.status)" -ForegroundColor White
        }
    } catch {
        Write-Host "  ❌ FAILED: Status '$status' should be valid!" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test invalid statuses
$invalidStatuses = @('red', 'invalid', 'pending', 'approved', 'xyz', '123')

Write-Host "`n2. Testing INVALID statuses (should return 400 errors):" -ForegroundColor Yellow
foreach ($status in $invalidStatuses) {
    Write-Host "`n  Testing invalid status: $status" -ForegroundColor Cyan
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=$status" -Method GET -Headers $headers
        Write-Host "  ❌ FAILED: Invalid status '$status' was accepted!" -ForegroundColor Red
        Write-Host "  Response: $($result | ConvertTo-Json -Depth 2)" -ForegroundColor Red
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorResponse.success -eq $false) {
            Write-Host "  ✅ SUCCESS: Invalid status '$status' properly rejected" -ForegroundColor Green
            Write-Host "  Error Message: $($errorResponse.message)" -ForegroundColor White
            if ($errorResponse.validStatuses) {
                Write-Host "  Valid Statuses: $($errorResponse.validStatuses -join ', ')" -ForegroundColor White
            }
        } else {
            Write-Host "  ❌ UNEXPECTED: Wrong error format" -ForegroundColor Red
        }
    }
}

# Test case sensitivity
Write-Host "`n3. Testing CASE SENSITIVITY:" -ForegroundColor Yellow
$caseTestStatuses = @('ACTIVE', 'InActive', 'SUSPENDED', 'Rejected')
foreach ($status in $caseTestStatuses) {
    Write-Host "`n  Testing case: $status" -ForegroundColor Cyan
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=$status" -Method GET -Headers $headers
        Write-Host "  ✅ SUCCESS: Case-insensitive '$status' accepted" -ForegroundColor Green
        Write-Host "  Normalized to: $($result.filter.status)" -ForegroundColor White
    } catch {
        Write-Host "  ❌ FAILED: Case-insensitive '$status' should work!" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test no filter (should return all)
Write-Host "`n4. Testing NO FILTER (should return all):" -ForegroundColor Yellow
try {
    $allResult = Invoke-RestMethod -Uri "$baseUrl/hospitals" -Method GET -Headers $headers
    Write-Host "  ✅ SUCCESS: No filter returns all hospitals" -ForegroundColor Green
    Write-Host "  Message: $($allResult.message)" -ForegroundColor White
    Write-Host "  Count: $($allResult.count)" -ForegroundColor White
    Write-Host "  Filter: $($allResult.filter)" -ForegroundColor White
} catch {
    Write-Host "  ❌ FAILED: No filter should work!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test empty status parameter
Write-Host "`n5. Testing EMPTY STATUS parameter:" -ForegroundColor Yellow
try {
    $emptyResult = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=" -Method GET -Headers $headers
    Write-Host "  ✅ SUCCESS: Empty status parameter handled" -ForegroundColor Green
    Write-Host "  Message: $($emptyResult.message)" -ForegroundColor White
    Write-Host "  Count: $($emptyResult.count)" -ForegroundColor White
} catch {
    Write-Host "  ❌ FAILED: Empty status parameter should return all!" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Green
Write-Host "✅ Valid statuses should be accepted and filter properly" -ForegroundColor Green
Write-Host "✅ Invalid statuses should return 400 error with helpful message" -ForegroundColor Green
Write-Host "✅ Case-insensitive filtering should work" -ForegroundColor Green
Write-Host "✅ No filter should return all hospitals" -ForegroundColor Green
Write-Host "✅ Empty status parameter should return all hospitals" -ForegroundColor Green

Write-Host "`nValid statuses: active, inactive, suspended, rejected" -ForegroundColor Cyan
