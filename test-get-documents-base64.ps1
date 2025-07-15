# Test Get Appointment Documents with Base64
Write-Host "=== Testing Get Appointment Documents with Base64 ===" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3100/api"
$appointmentId = "YOUR_APPOINTMENT_ID_HERE"  # Replace with actual appointment ID
$token = "YOUR_JWT_TOKEN_HERE"                # Replace with actual token

# Headers
$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "Testing endpoint: GET $baseUrl/appointment-documents/appointment/$appointmentId" -ForegroundColor Yellow

try {
    # Get appointment documents
    $response = Invoke-RestMethod -Uri "$baseUrl/appointment-documents/appointment/$appointmentId" -Method Get -Headers $headers
    
    Write-Host "✅ Request successful!" -ForegroundColor Green
    Write-Host "Total documents found: $($response.data.totalCount)" -ForegroundColor Cyan
    
    # Check each document type
    $allDocuments = @()
    $allDocuments += $response.data.documents.labReports
    $allDocuments += $response.data.documents.prescriptions
    $allDocuments += $response.data.documents.operationSheets
    $allDocuments += $response.data.documents.other
    
    Write-Host "`n📋 Document Analysis:" -ForegroundColor Yellow
    
    foreach ($doc in $allDocuments) {
        Write-Host "`n--- Document: $($doc.documentName) ---" -ForegroundColor Magenta
        Write-Host "Type: $($doc.documentType)" -ForegroundColor White
        Write-Host "MIME Type: $($doc.mimeType)" -ForegroundColor White
        Write-Host "File Size: $($doc.fileSize) bytes" -ForegroundColor White
        
        if ($doc.fileData) {
            $base64Length = $doc.fileData.Length
            $isDataUrl = $doc.fileData.StartsWith("data:")
            
            Write-Host "Base64 Data Length: $base64Length characters" -ForegroundColor Cyan
            Write-Host "Is Data URL Format: $isDataUrl" -ForegroundColor Cyan
            
            if ($isDataUrl) {
                # Extract just the base64 part
                $base64Part = $doc.fileData -replace "^data:[^;]+;base64,", ""
                Write-Host "Pure Base64 Length: $($base64Part.Length) characters" -ForegroundColor Cyan
                Write-Host "Base64 Preview: $($base64Part.Substring(0, [Math]::Min(50, $base64Part.Length)))..." -ForegroundColor Gray
                
                # Verify it's valid base64
                try {
                    $bytes = [System.Convert]::FromBase64String($base64Part)
                    Write-Host "✅ Valid Base64 - Decoded to $($bytes.Length) bytes" -ForegroundColor Green
                    
                    # Calculate expected vs actual size
                    $expectedSize = [Math]::Floor($base64Part.Length * 3 / 4)
                    Write-Host "Expected decoded size: ~$expectedSize bytes" -ForegroundColor Gray
                    
                } catch {
                    Write-Host "❌ Invalid Base64!" -ForegroundColor Red
                    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "⚠️  Raw base64 (no data URL prefix)" -ForegroundColor Yellow
                Write-Host "Base64 Preview: $($doc.fileData.Substring(0, [Math]::Min(50, $doc.fileData.Length)))..." -ForegroundColor Gray
                
                try {
                    $bytes = [System.Convert]::FromBase64String($doc.fileData)
                    Write-Host "✅ Valid Base64 - Decoded to $($bytes.Length) bytes" -ForegroundColor Green
                } catch {
                    Write-Host "❌ Invalid Base64!" -ForegroundColor Red
                    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "❌ No fileData found!" -ForegroundColor Red
        }
        
        Write-Host "Created: $($doc.createdDate)" -ForegroundColor White
        Write-Host "Uploaded by: $($doc.uploadedBy)" -ForegroundColor White
    }
    
    # Test creating a file from base64
    if ($allDocuments.Count -gt 0 -and $allDocuments[0].fileData) {
        Write-Host "`n🧪 Testing Base64 to File Conversion:" -ForegroundColor Yellow
        $testDoc = $allDocuments[0]
        $outputDir = "C:\temp\base64-test"
        
        if (!(Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force
        }
        
        try {
            # Extract base64 data
            $base64Data = $testDoc.fileData
            if ($base64Data.StartsWith("data:")) {
                $base64Data = $base64Data -replace "^data:[^;]+;base64,", ""
            }
            
            # Convert to bytes and save
            $bytes = [System.Convert]::FromBase64String($base64Data)
            $outputPath = Join-Path $outputDir "downloaded_$($testDoc.documentName)"
            [System.IO.File]::WriteAllBytes($outputPath, $bytes)
            
            Write-Host "✅ File created successfully: $outputPath" -ForegroundColor Green
            Write-Host "File size: $((Get-Item $outputPath).Length) bytes" -ForegroundColor Cyan
            
        } catch {
            Write-Host "❌ Failed to create file: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n📊 Summary:" -ForegroundColor Yellow
    Write-Host "- Lab Reports: $($response.data.documents.labReports.Count)" -ForegroundColor White
    Write-Host "- Prescriptions: $($response.data.documents.prescriptions.Count)" -ForegroundColor White
    Write-Host "- Operation Sheets: $($response.data.documents.operationSheets.Count)" -ForegroundColor White
    Write-Host "- Other: $($response.data.documents.other.Count)" -ForegroundColor White
    
    # Display full response structure
    Write-Host "`n📋 Full Response Structure:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "❌ Request failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Instructions ===" -ForegroundColor Cyan
Write-Host "1. Replace 'YOUR_JWT_TOKEN_HERE' with a valid JWT token" -ForegroundColor White
Write-Host "2. Replace 'YOUR_APPOINTMENT_ID_HERE' with a valid appointment UUID" -ForegroundColor White
Write-Host "3. Ensure your server is running on localhost:3100" -ForegroundColor White
Write-Host "4. Check server logs for debug information" -ForegroundColor White

Write-Host "`n=== Expected Response Format ===" -ForegroundColor Green
Write-Host @"
{
  "success": true,
  "data": {
    "documents": {
      "labReports": [
        {
          "id": "doc-uuid",
          "documentName": "test.pdf",
          "fileData": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKM...",
          "fileSize": 1024,
          "mimeType": "application/pdf",
          ...
        }
      ]
    }
  }
}
"@ -ForegroundColor Gray
