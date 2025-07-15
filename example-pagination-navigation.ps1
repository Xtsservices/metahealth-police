# Simple Pagination Navigation Example
# Shows how to navigate through paginated hospital data

Write-Host "=== PAGINATION NAVIGATION EXAMPLE ===" -ForegroundColor Green

$baseUrl = "http://localhost:3100/api/dashboard"
$headers = @{'Content-Type' = 'application/json'}

# Function to display pagination info
function Show-PaginationInfo($response) {
    $p = $response.pagination
    Write-Host "  📄 Page $($p.currentPage) of $($p.totalPages)" -ForegroundColor Cyan
    Write-Host "  📊 Showing $($response.count) of $($p.totalRecords) total records" -ForegroundColor Cyan
    Write-Host "  ⬅️  Previous: $($p.hasPreviousPage)" -ForegroundColor Cyan
    Write-Host "  ➡️  Next: $($p.hasNextPage)" -ForegroundColor Cyan
}

# Get first page
Write-Host "`n1. Getting FIRST page (5 records per page):" -ForegroundColor Yellow
try {
    $page1 = Invoke-RestMethod -Uri "$baseUrl/hospitals?page=1&limit=5" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: First page retrieved" -ForegroundColor Green
    Show-PaginationInfo $page1
    
    # Show hospital names
    Write-Host "  🏥 Hospitals on this page:" -ForegroundColor White
    foreach ($hospital in $page1.data) {
        Write-Host "    - $($hospital.name) ($($hospital.status))" -ForegroundColor Gray
    }
    
    $totalPages = $page1.pagination.totalPages
} catch {
    Write-Host "❌ FAILED: Could not get first page" -ForegroundColor Red
    exit 1
}

# Navigate to next page if available
if ($page1.pagination.hasNextPage) {
    Write-Host "`n2. Getting NEXT page:" -ForegroundColor Yellow
    try {
        $page2 = Invoke-RestMethod -Uri "$baseUrl/hospitals?page=2&limit=5" -Method GET -Headers $headers
        Write-Host "✅ SUCCESS: Second page retrieved" -ForegroundColor Green
        Show-PaginationInfo $page2
        
        # Show hospital names
        Write-Host "  🏥 Hospitals on this page:" -ForegroundColor White
        foreach ($hospital in $page2.data) {
            Write-Host "    - $($hospital.name) ($($hospital.status))" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ FAILED: Could not get second page" -ForegroundColor Red
    }
} else {
    Write-Host "`n2. No next page available (only one page of data)" -ForegroundColor Yellow
}

# Try to get last page
if ($totalPages -gt 2) {
    Write-Host "`n3. Getting LAST page:" -ForegroundColor Yellow
    try {
        $lastPage = Invoke-RestMethod -Uri "$baseUrl/hospitals?page=$totalPages&limit=5" -Method GET -Headers $headers
        Write-Host "✅ SUCCESS: Last page retrieved" -ForegroundColor Green
        Show-PaginationInfo $lastPage
        
        # Show hospital names
        Write-Host "  🏥 Hospitals on this page:" -ForegroundColor White
        foreach ($hospital in $lastPage.data) {
            Write-Host "    - $($hospital.name) ($($hospital.status))" -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ FAILED: Could not get last page" -ForegroundColor Red
    }
}

# Example with status filter
Write-Host "`n4. Pagination with STATUS FILTER (active hospitals only):" -ForegroundColor Yellow
try {
    $activeOnly = Invoke-RestMethod -Uri "$baseUrl/hospitals?status=active&page=1&limit=3" -Method GET -Headers $headers
    Write-Host "✅ SUCCESS: Active hospitals with pagination" -ForegroundColor Green
    Write-Host "  🔍 Filter: $($activeOnly.filter.status)" -ForegroundColor Cyan
    Show-PaginationInfo $activeOnly
    
    # Show hospital names
    Write-Host "  🏥 Active hospitals on this page:" -ForegroundColor White
    foreach ($hospital in $activeOnly.data) {
        Write-Host "    - $($hospital.name) ($($hospital.status))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ FAILED: Could not get active hospitals" -ForegroundColor Red
}

# Show practical navigation URLs
Write-Host "`n=== NAVIGATION URLS ===" -ForegroundColor Green
Write-Host "First Page:    GET $baseUrl/hospitals?page=1&limit=10" -ForegroundColor Cyan
Write-Host "Next Page:     GET $baseUrl/hospitals?page=2&limit=10" -ForegroundColor Cyan
Write-Host "Specific Page: GET $baseUrl/hospitals?page=3&limit=10" -ForegroundColor Cyan
Write-Host "With Filter:   GET $baseUrl/hospitals?status=active&page=1&limit=10" -ForegroundColor Cyan
Write-Host "Large Pages:   GET $baseUrl/hospitals?page=1&limit=50" -ForegroundColor Cyan
Write-Host "Small Pages:   GET $baseUrl/hospitals?page=1&limit=2" -ForegroundColor Cyan

Write-Host "`n=== PAGINATION TIPS ===" -ForegroundColor Green
Write-Host "✅ Use pagination.hasNextPage to check if more pages exist" -ForegroundColor Green
Write-Host "✅ Use pagination.totalPages to build page navigation" -ForegroundColor Green
Write-Host "✅ Use pagination.totalRecords to show total count" -ForegroundColor Green
Write-Host "✅ Combine status filters with pagination for targeted results" -ForegroundColor Green
Write-Host "✅ Default limit is 10, max is 100 records per page" -ForegroundColor Green
