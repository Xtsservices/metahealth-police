# Test Pagination for Hospital Dashboard APIs
# Tests pagination functionality for hospital status overview and pending hospitals

Write-Host "=== TESTING HOSPITAL DASHBOARD PAGINATION ===" -ForegroundColor Green

$baseUrl = "http://localhost:3100/api/dashboard"
$headers = @{'Content-Type' = 'application/json'}

# Test 1: Default pagination (page 1, limit 10)
Write-Host "`n1. Testing DEFAULT pagination:" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Default pagination" -ForegroundColor Green
    Write-Host "  Current Page: $($result.pagination.currentPage)" -ForegroundColor White
    Write-Host "  Records Per Page: $($result.pagination.recordsPerPage)" -ForegroundColor White
    Write-Host "  Total Pages: $($result.pagination.totalPages)" -ForegroundColor White
    Write-Host "  Total Records: $($result.pagination.totalRecords)" -ForegroundColor White
    Write-Host "  Has Next Page: $($result.pagination.hasNextPage)" -ForegroundColor White
    Write-Host "  Has Previous Page: $($result.pagination.hasPreviousPage)" -ForegroundColor White
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: Default pagination" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Custom pagination
Write-Host "`n2. Testing CUSTOM pagination (page=2, limit=5):" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?page=2&limit=5" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Custom pagination" -ForegroundColor Green
    Write-Host "  Current Page: $($result.pagination.currentPage)" -ForegroundColor White
    Write-Host "  Records Per Page: $($result.pagination.recordsPerPage)" -ForegroundColor White
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: Custom pagination" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Pagination with status filter
Write-Host "`n3. Testing PAGINATION with STATUS filter (status=active, page=1, limit=3):" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=active&page=1&limit=3" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Pagination with status filter" -ForegroundColor Green
    Write-Host "  Status Filter: $($result.filter.status)" -ForegroundColor White
    Write-Host "  Current Page: $($result.pagination.currentPage)" -ForegroundColor White
    Write-Host "  Total Records: $($result.pagination.totalRecords)" -ForegroundColor White
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: Pagination with status filter" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Invalid page number (should return error)
Write-Host "`n4. Testing INVALID page number (page=0):" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?page=0" -Method GET -Headers $headers
    Write-Host "❌ UNEXPECTED: Invalid page number was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*Page number must be greater than 0*") {
        Write-Host "✅ SUCCESS: Invalid page number properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Wrong error message" -ForegroundColor Red
    }
}

# Test 5: Invalid limit (should return error)
Write-Host "`n5. Testing INVALID limit (limit=150):" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?limit=150" -Method GET -Headers $headers
    Write-Host "❌ UNEXPECTED: Invalid limit was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*Limit must be between 1 and 100*") {
        Write-Host "✅ SUCCESS: Invalid limit properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Wrong error message" -ForegroundColor Red
    }
}

# Test 6: Negative limit (should return error)
Write-Host "`n6. Testing NEGATIVE limit (limit=-5):" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?limit=-5" -Method GET -Headers $headers
    Write-Host "❌ UNEXPECTED: Negative limit was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*Limit must be between 1 and 100*") {
        Write-Host "✅ SUCCESS: Negative limit properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Wrong error message" -ForegroundColor Red
    }
}

# Test 7: Page beyond available data
Write-Host "`n7. Testing PAGE beyond available data (page=9999):" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?page=9999" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: High page number handled" -ForegroundColor Green
    Write-Host "  Current Page: $($result.pagination.currentPage)" -ForegroundColor White
    Write-Host "  Total Pages: $($result.pagination.totalPages)" -ForegroundColor White
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
    Write-Host "  Has Next Page: $($result.pagination.hasNextPage)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: High page number not handled" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Pending hospitals pagination
Write-Host "`n8. Testing PENDING HOSPITALS pagination:" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/pending-hospitals?page=1&limit=5" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Pending hospitals pagination" -ForegroundColor Green
    Write-Host "  Current Page: $($result.pagination.currentPage)" -ForegroundColor White
    Write-Host "  Total Records: $($result.pagination.totalRecords)" -ForegroundColor White
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: Pending hospitals pagination" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Edge case - limit of 1
Write-Host "`n9. Testing EDGE CASE - limit=1:" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?limit=1" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Limit=1 handled" -ForegroundColor Green
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
    Write-Host "  Total Pages: $($result.pagination.totalPages)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: Limit=1 not handled" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Edge case - maximum limit
Write-Host "`n10. Testing EDGE CASE - limit=100:" -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/hospitals?limit=100" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Maximum limit handled" -ForegroundColor Green
    Write-Host "  Records Per Page: $($result.pagination.recordsPerPage)" -ForegroundColor White
    Write-Host "  Records Returned: $($result.count)" -ForegroundColor White
} catch {
    Write-Host "❌ FAILED: Maximum limit not handled" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== PAGINATION TEST SUMMARY ===" -ForegroundColor Green
Write-Host "✅ Default pagination should work (page=1, limit=10)" -ForegroundColor Green
Write-Host "✅ Custom pagination should work" -ForegroundColor Green
Write-Host "✅ Pagination with filters should work" -ForegroundColor Green
Write-Host "✅ Invalid page numbers should be rejected" -ForegroundColor Green
Write-Host "✅ Invalid limits should be rejected" -ForegroundColor Green
Write-Host "✅ Page beyond data should return empty results" -ForegroundColor Green
Write-Host "✅ Pending hospitals pagination should work" -ForegroundColor Green

Write-Host "`nPagination Parameters:" -ForegroundColor Cyan
Write-Host "- page: Page number (default: 1, min: 1)" -ForegroundColor Cyan
Write-Host "- limit: Records per page (default: 10, min: 1, max: 100)" -ForegroundColor Cyan
Write-Host "- Can be combined with status filter" -ForegroundColor Cyan

Write-Host "`nExample URLs:" -ForegroundColor Cyan
Write-Host "GET /api/dashboard/hospitals?page=2&limit=5" -ForegroundColor Cyan
Write-Host "GET /api/dashboard/hospitals?status=active&page=1&limit=10" -ForegroundColor Cyan
Write-Host "GET /api/dashboard/pending-hospitals?page=1&limit=20" -ForegroundColor Cyan
