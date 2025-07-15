# Test Base64 Document Upload
Write-Host "=== Testing Base64 Document Upload ===" -ForegroundColor Green

# Create a simple test file
$testContent = "This is a test document for base64 upload verification. Date: $(Get-Date)"
$testFile = "C:\temp\test_base64_upload.txt"

# Ensure temp directory exists
if (!(Test-Path "C:\temp")) {
    New-Item -ItemType Directory -Path "C:\temp" -Force
}

# Create test file
Set-Content -Path $testFile -Value $testContent -Encoding UTF8
Write-Host "Created test file: $testFile" -ForegroundColor Yellow

# Convert to base64
$fileBytes = [System.IO.File]::ReadAllBytes($testFile)
$base64String = [System.Convert]::ToBase64String($fileBytes)

Write-Host "Original file size: $($fileBytes.Length) bytes" -ForegroundColor Cyan
Write-Host "Base64 string length: $($base64String.Length) characters" -ForegroundColor Cyan
Write-Host "Base64 preview: $($base64String.Substring(0, [Math]::Min(50, $base64String.Length)))..." -ForegroundColor Cyan

# Prepare JSON payload for base64 upload
$payload = @{
    appointmentId = "550e8400-e29b-41d4-a716-446655440000"  # Replace with valid appointment ID
    documentType = "other"
    description = "Test base64 upload document"
    fileData = $base64String
    fileName = "test_base64_upload.txt"
    mimeType = "text/plain"
} | ConvertTo-Json

Write-Host "`nJSON payload prepared (length: $($payload.Length) characters)" -ForegroundColor Magenta

# Test API endpoint
$baseUrl = "http://localhost:3100/api"
$uploadUrl = "$baseUrl/appointment-documents/upload"

# Headers
$headers = @{
    'Authorization' = 'Bearer YOUR_TOKEN_HERE'  # Replace with valid token
    'Content-Type' = 'application/json'
}

Write-Host "`nTesting base64 upload to: $uploadUrl" -ForegroundColor Yellow
Write-Host "Headers:" -ForegroundColor Gray
$headers | Format-Table -AutoSize

Write-Host "`nPayload structure:" -ForegroundColor Gray
$payload | ConvertFrom-Json | Format-List

# Uncomment the lines below to actually test the API
<#
try {
    $response = Invoke-RestMethod -Uri $uploadUrl -Method Post -Body $payload -Headers $headers
    Write-Host "✅ Upload successful!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
#>

Write-Host "`n=== Instructions ===" -ForegroundColor Cyan
Write-Host "1. Replace 'YOUR_TOKEN_HERE' with a valid JWT token" -ForegroundColor White
Write-Host "2. Replace the appointmentId with a valid appointment UUID" -ForegroundColor White
Write-Host "3. Ensure your server is running on localhost:3100" -ForegroundColor White
Write-Host "4. Uncomment the try-catch block to test the actual upload" -ForegroundColor White
Write-Host "5. Check the server logs for debug information" -ForegroundColor White

# Clean up
Remove-Item -Path $testFile -Force
Write-Host "`nTest file cleaned up." -ForegroundColor Green
