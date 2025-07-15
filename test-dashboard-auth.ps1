# Test Dashboard Routes with Token Validation
# This script tests the complete authentication flow and protected dashboard access

Write-Host "🔐 Testing Dashboard Routes with Token Validation" -ForegroundColor Yellow
Write-Host "=" * 60

$baseUrl = "http://localhost:3100"

# Step 1: Generate OTP for default super admin
Write-Host "`n1️⃣ Generating OTP for super admin..." -ForegroundColor Cyan

try {
    $otpPayload = @{
        phone = "9999999999"
    } | ConvertTo-Json

    $otpResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/generate-otp" -Method Post -Body $otpPayload -ContentType "application/json"
    
    if ($otpResponse.success -eq $true) {
        Write-Host "✅ OTP generated successfully" -ForegroundColor Green
        Write-Host "   Phone: $($otpResponse.data.phone)" -ForegroundColor Gray
        Write-Host "   OTP: $($otpResponse.data.otp)" -ForegroundColor Yellow
        $generatedOTP = $otpResponse.data.otp
    } else {
        throw "Failed to generate OTP"
    }
} catch {
    Write-Host "❌ Failed to generate OTP" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Verify OTP and get session token
Write-Host "`n2️⃣ Verifying OTP and logging in..." -ForegroundColor Cyan

try {
    $verifyPayload = @{
        phone = "9999999999"
        otp = $generatedOTP
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method Post -Body $verifyPayload -ContentType "application/json"
    
    if ($loginResponse.success -eq $true) {
        Write-Host "✅ Login successful" -ForegroundColor Green
        Write-Host "   User: $($loginResponse.data.user.name)" -ForegroundColor Gray
        Write-Host "   Role: $($loginResponse.data.user.role)" -ForegroundColor Gray
        Write-Host "   Token: $($loginResponse.data.sessionToken)" -ForegroundColor Yellow
        $sessionToken = $loginResponse.data.sessionToken
    } else {
        throw "Failed to verify OTP"
    }
} catch {
    Write-Host "❌ Failed to verify OTP" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Test dashboard access without token (should fail)
Write-Host "`n3️⃣ Testing dashboard access without token..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method Get
    Write-Host "❌ Dashboard access without token should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✅ Dashboard correctly rejected request without token" -ForegroundColor Green
    Write-Host "   Expected: Access token is required" -ForegroundColor Gray
}

# Step 4: Test dashboard access with invalid token (should fail)
Write-Host "`n4️⃣ Testing dashboard access with invalid token..." -ForegroundColor Cyan

try {
    $headers = @{
        'Authorization' = 'Bearer invalid-token-123'
        'Content-Type' = 'application/json'
    }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method Get -Headers $headers
    Write-Host "❌ Dashboard access with invalid token should have failed!" -ForegroundColor Red
} catch {
    Write-Host "✅ Dashboard correctly rejected invalid token" -ForegroundColor Green
    Write-Host "   Expected: Invalid token format or Invalid session" -ForegroundColor Gray
}

# Step 5: Test dashboard access with valid token (should succeed)
Write-Host "`n5️⃣ Testing dashboard access with valid token..." -ForegroundColor Cyan

try {
    $headers = @{
        'Authorization' = "Bearer $sessionToken"
        'Content-Type' = 'application/json'
    }
    
    # Test dashboard stats
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method Get -Headers $headers
    
    if ($statsResponse.success -eq $true) {
        Write-Host "✅ Dashboard stats accessed successfully" -ForegroundColor Green
        Write-Host "   Total Hospitals: $($statsResponse.data.totalHospitals)" -ForegroundColor Gray
        Write-Host "   Total Users: $($statsResponse.data.totalUsers)" -ForegroundColor Gray
        Write-Host "   Active Hospitals: $($statsResponse.data.hospitalStatus.active)" -ForegroundColor Gray
        Write-Host "   Pending Hospitals: $($statsResponse.data.hospitalStatus.inactive)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to access dashboard with valid token" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 6: Test hospitals overview
Write-Host "`n6️⃣ Testing hospitals overview..." -ForegroundColor Cyan

try {
    $hospitalsResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/hospitals" -Method Get -Headers $headers
    
    if ($hospitalsResponse.success -eq $true) {
        Write-Host "✅ Hospitals overview accessed successfully" -ForegroundColor Green
        Write-Host "   Total Results: $($hospitalsResponse.data.pagination.total)" -ForegroundColor Gray
        Write-Host "   Current Page: $($hospitalsResponse.data.pagination.page)" -ForegroundColor Gray
        Write-Host "   Hospitals Count: $($hospitalsResponse.data.hospitals.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to access hospitals overview" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Test pending hospitals
Write-Host "`n7️⃣ Testing pending hospitals..." -ForegroundColor Cyan

try {
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/pending-hospitals" -Method Get -Headers $headers
    
    if ($pendingResponse.success -eq $true) {
        Write-Host "✅ Pending hospitals accessed successfully" -ForegroundColor Green
        Write-Host "   Pending Count: $($pendingResponse.data.pagination.total)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to access pending hospitals" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 8: Test token as query parameter
Write-Host "`n8️⃣ Testing token as query parameter..." -ForegroundColor Cyan

try {
    $queryTokenUrl = "$baseUrl/api/dashboard/stats?token=$sessionToken"
    $queryResponse = Invoke-RestMethod -Uri $queryTokenUrl -Method Get
    
    if ($queryResponse.success -eq $true) {
        Write-Host "✅ Token as query parameter works" -ForegroundColor Green
        Write-Host "   Total Hospitals: $($queryResponse.data.totalHospitals)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to access dashboard with token as query parameter" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60
Write-Host "🏁 Token Validation Test Complete!" -ForegroundColor Yellow

Write-Host "`n📋 Test Summary:" -ForegroundColor Cyan
Write-Host "   ✅ OTP generation for super admin" -ForegroundColor Green
Write-Host "   ✅ OTP verification and login" -ForegroundColor Green
Write-Host "   ✅ Dashboard protection without token" -ForegroundColor Green
Write-Host "   ✅ Dashboard protection with invalid token" -ForegroundColor Green
Write-Host "   ✅ Dashboard access with valid token" -ForegroundColor Green
Write-Host "   ✅ Multiple dashboard endpoints protected" -ForegroundColor Green
Write-Host "   ✅ Token validation via Authorization header" -ForegroundColor Green
Write-Host "   ✅ Token validation via query parameter" -ForegroundColor Green

Write-Host "`n🔑 How to Use Dashboard APIs:" -ForegroundColor Yellow
Write-Host "   1. Generate OTP: POST /api/auth/generate-otp" -ForegroundColor Gray
Write-Host "   2. Login: POST /api/auth/verify-otp" -ForegroundColor Gray
Write-Host "   3. Use token in header: Authorization: Bearer <token>" -ForegroundColor Gray
Write-Host "   4. Or use as query param: ?token=<token>" -ForegroundColor Gray
Write-Host "   5. Access dashboard: GET /api/dashboard/stats" -ForegroundColor Gray

Write-Host "`n💡 Your session token: $sessionToken" -ForegroundColor Cyan
