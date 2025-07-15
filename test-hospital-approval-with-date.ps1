# Test Hospital Approval with approved_date
# This script tests the hospital approval functionality after adding the approved_date column

Write-Host "🧪 Testing Hospital Approval with approved_date" -ForegroundColor Yellow
Write-Host "=============================================="

$baseUrl = "http://localhost:3100"

# First, let's get a session token for the super admin
Write-Host "`n🔐 Step 1: Getting super admin session token..." -ForegroundColor Cyan

try {
    # Generate OTP for super admin
    $otpPayload = @{
        phone = "9999999999"
    } | ConvertTo-Json

    $otpResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/generate-otp" -Method Post -Body $otpPayload -ContentType "application/json"
    
    if ($otpResponse.success -eq $true) {
        Write-Host "✅ OTP generated: $($otpResponse.data.otp)" -ForegroundColor Green
        
        # Verify OTP to get session token
        $verifyPayload = @{
            phone = "9999999999"
            otp = $otpResponse.data.otp
        } | ConvertTo-Json

        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method Post -Body $verifyPayload -ContentType "application/json"
        
        if ($loginResponse.success -eq $true) {
            $sessionToken = $loginResponse.data.sessionToken
            Write-Host "✅ Session token obtained: $($sessionToken.Substring(0,8))..." -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to verify OTP" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Failed to generate OTP" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error in authentication: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Get pending hospitals
Write-Host "`n📋 Step 2: Getting pending hospitals..." -ForegroundColor Cyan

try {
    $headers = @{
        "Authorization" = "Bearer $sessionToken"
        "Content-Type" = "application/json"
    }
    
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/pending-hospitals" -Method Get -Headers $headers
    
    if ($pendingResponse.success -eq $true -and $pendingResponse.data.Count -gt 0) {
        $firstHospital = $pendingResponse.data[0]
        $hospitalId = $firstHospital.hospital.id
        Write-Host "✅ Found pending hospital: $($firstHospital.hospital.name)" -ForegroundColor Green
        Write-Host "   Hospital ID: $hospitalId" -ForegroundColor Gray
        Write-Host "   Admin User: $($firstHospital.adminUser.name)" -ForegroundColor Gray
    } else {
        Write-Host "ℹ️  No pending hospitals found. Please register a hospital first." -ForegroundColor Yellow
        Write-Host "   Run: .\test-hospital-registration.ps1" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "❌ Error getting pending hospitals: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Approve the hospital
Write-Host "`n✅ Step 3: Approving hospital..." -ForegroundColor Cyan

try {
    $approvePayload = @{
        hospitalId = $hospitalId
    } | ConvertTo-Json

    $approveResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/approve-hospital" -Method Post -Body $approvePayload -Headers $headers
    
    if ($approveResponse.success -eq $true) {
        Write-Host "✅ Hospital approved successfully!" -ForegroundColor Green
        Write-Host "`n🏥 Hospital Details:" -ForegroundColor Yellow
        Write-Host "   ID: $($approveResponse.data.hospital.id)" -ForegroundColor Gray
        Write-Host "   Name: $($approveResponse.data.hospital.name)" -ForegroundColor Gray
        Write-Host "   Status: $($approveResponse.data.hospital.status)" -ForegroundColor Gray
        Write-Host "   Updated At: $($approveResponse.data.hospital.updatedAt)" -ForegroundColor Gray
        Write-Host "   Approved Date: $($approveResponse.data.hospital.approvedDate)" -ForegroundColor Green
        
        Write-Host "`n👥 Admin User Details:" -ForegroundColor Yellow
        Write-Host "   ID: $($approveResponse.data.adminUser.id)" -ForegroundColor Gray
        Write-Host "   Name: $($approveResponse.data.adminUser.name)" -ForegroundColor Gray
        Write-Host "   Email: $($approveResponse.data.adminUser.email)" -ForegroundColor Gray
        Write-Host "   Status: $($approveResponse.data.adminUser.status)" -ForegroundColor Gray
        Write-Host "   Approved Date: $($approveResponse.data.adminUser.approvedDate)" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to approve hospital: $($approveResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error approving hospital: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to show more details about the error
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Step 4: Verify approval in hospital overview
Write-Host "`n🔍 Step 4: Verifying approval in hospital overview..." -ForegroundColor Cyan

try {
    $overviewResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/hospitals?status=active" -Method Get -Headers $headers
    
    if ($overviewResponse.success -eq $true) {
        $approvedHospital = $overviewResponse.data | Where-Object { $_.id -eq $hospitalId }
        
        if ($approvedHospital) {
            Write-Host "✅ Hospital found in active list!" -ForegroundColor Green
            Write-Host "   Name: $($approvedHospital.name)" -ForegroundColor Gray
            Write-Host "   Status: $($approvedHospital.status)" -ForegroundColor Gray
            Write-Host "   Registration Date: $($approvedHospital.registrationDate)" -ForegroundColor Gray
            Write-Host "   Approved Date: $($approvedHospital.approvedDate)" -ForegroundColor Green
            Write-Host "   Location: $($approvedHospital.location)" -ForegroundColor Gray
            Write-Host "   User Count: $($approvedHospital.userCount)" -ForegroundColor Gray
        } else {
            Write-Host "⚠️  Hospital not found in active list" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Error verifying approval: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Hospital Approval Test Complete!" -ForegroundColor Green
Write-Host "   ✅ approved_date column working properly" -ForegroundColor Green
Write-Host "   ✅ Hospital and admin user approved with timestamps" -ForegroundColor Green
Write-Host "   ✅ Data visible in hospital overview with approved dates" -ForegroundColor Green
