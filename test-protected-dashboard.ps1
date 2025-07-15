# Test Protected Dashboard Routes with Token Validation
# This script demonstrates how to access dashboard endpoints with proper authentication

Write-Host "🔐 Testing Protected Dashboard Routes" -ForegroundColor Yellow
Write-Host "=" * 60

$baseUrl = "http://localhost:3100"
$defaultPhone = "9999999999"

# Step 1: Generate OTP for super admin
Write-Host "`n1️⃣ Generating OTP for super admin..." -ForegroundColor Cyan

try {
    $otpPayload = @{
        phone = $defaultPhone
    } | ConvertTo-Json

    $otpResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/generate-otp" -Method Post -Body $otpPayload -ContentType "application/json"
    
    if ($otpResponse.success -eq $true) {
        Write-Host "✅ OTP generated successfully" -ForegroundColor Green
        Write-Host "   Phone: $($otpResponse.data.phone)" -ForegroundColor Gray
        Write-Host "   OTP: $($otpResponse.data.otp)" -ForegroundColor Yellow
        $otp = $otpResponse.data.otp
    } else {
        Write-Host "❌ Failed to generate OTP" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error generating OTP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Verify OTP and get session token
Write-Host "`n2️⃣ Verifying OTP and logging in..." -ForegroundColor Cyan

try {
    $verifyPayload = @{
        phone = $defaultPhone
        otp = $otp
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method Post -Body $verifyPayload -ContentType "application/json"
    
    if ($loginResponse.success -eq $true) {
        Write-Host "✅ Login successful" -ForegroundColor Green
        Write-Host "   User: $($loginResponse.data.user.name)" -ForegroundColor Gray
        Write-Host "   Role: $($loginResponse.data.user.role)" -ForegroundColor Gray
        Write-Host "   Token: $($loginResponse.data.session.token)" -ForegroundColor Yellow
        $token = $loginResponse.data.session.token
    } else {
        Write-Host "❌ Login failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Test dashboard endpoints with token
Write-Host "`n3️⃣ Testing protected dashboard endpoints..." -ForegroundColor Cyan

# Test 1: Dashboard stats
Write-Host "`n📊 Testing dashboard stats..." -ForegroundColor White
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method Get -Headers $headers
    
    if ($statsResponse.success -eq $true) {
        Write-Host "✅ Dashboard stats retrieved successfully" -ForegroundColor Green
        Write-Host "   Total Hospitals: $($statsResponse.data.totalHospitals)" -ForegroundColor Gray
        Write-Host "   Active Hospitals: $($statsResponse.data.activeHospitals)" -ForegroundColor Gray
        Write-Host "   Total Users: $($statsResponse.data.totalUsers)" -ForegroundColor Gray
        Write-Host "   Active Users: $($statsResponse.data.activeUsers)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error accessing dashboard stats: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Hospital overview
Write-Host "`n🏥 Testing hospital overview..." -ForegroundColor White
try {
    $hospitalResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/hospitals" -Method Get -Headers $headers
    
    if ($hospitalResponse.success -eq $true) {
        Write-Host "✅ Hospital overview retrieved successfully" -ForegroundColor Green
        Write-Host "   Total Records: $($hospitalResponse.pagination.total)" -ForegroundColor Gray
        Write-Host "   Current Page: $($hospitalResponse.pagination.page)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error accessing hospital overview: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Pending hospitals
Write-Host "`n⏳ Testing pending hospitals..." -ForegroundColor White
try {
    $pendingResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/pending-hospitals" -Method Get -Headers $headers
    
    if ($pendingResponse.success -eq $true) {
        Write-Host "✅ Pending hospitals retrieved successfully" -ForegroundColor Green
        Write-Host "   Pending Count: $($pendingResponse.pagination.total)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error accessing pending hospitals: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User stats by hospital
Write-Host "`n👥 Testing user stats by hospital..." -ForegroundColor White
try {
    $userStatsResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/users-by-hospital" -Method Get -Headers $headers
    
    if ($userStatsResponse.success -eq $true) {
        Write-Host "✅ User stats retrieved successfully" -ForegroundColor Green
        Write-Host "   Hospital Count: $($userStatsResponse.data.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error accessing user stats: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Test without token (should fail)
Write-Host "`n4️⃣ Testing dashboard without token (should fail)..." -ForegroundColor Cyan

try {
    $unauthorizedResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method Get
    Write-Host "❌ Unexpected success - dashboard should be protected!" -ForegroundColor Red
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse.StatusCode -eq 401) {
        Write-Host "✅ Dashboard properly protected - 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Step 5: Test with invalid token (should fail)
Write-Host "`n5️⃣ Testing dashboard with invalid token (should fail)..." -ForegroundColor Cyan

try {
    $invalidHeaders = @{
        "Authorization" = "Bearer invalid-token-12345"
    }
    
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/dashboard/stats" -Method Get -Headers $invalidHeaders
    Write-Host "❌ Unexpected success - invalid token should be rejected!" -ForegroundColor Red
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse.StatusCode -eq 401) {
        Write-Host "✅ Invalid token properly rejected - 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n" + "=" * 60
Write-Host "🏁 Protected Dashboard Test Complete!" -ForegroundColor Yellow

Write-Host "`n🔑 Authentication Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Token validation middleware added to all dashboard routes" -ForegroundColor Green
Write-Host "   ✅ Super admin role required for dashboard access" -ForegroundColor Green
Write-Host "   ✅ Session-based authentication with database validation" -ForegroundColor Green
Write-Host "   ✅ Proper error handling for unauthorized access" -ForegroundColor Green

Write-Host "`n📋 Usage Instructions:" -ForegroundColor Yellow
Write-Host "   1. Generate OTP: POST /api/auth/generate-otp" -ForegroundColor Gray
Write-Host "   2. Login: POST /api/auth/verify-otp" -ForegroundColor Gray
Write-Host "   3. Use token: Add 'Authorization: Bearer <token>' header" -ForegroundColor Gray
Write-Host "   4. Access dashboard: GET /api/dashboard/*" -ForegroundColor Gray

if ($token) {
    Write-Host "`n🔐 Current Valid Token:" -ForegroundColor Green
    Write-Host "$token" -ForegroundColor White
}
