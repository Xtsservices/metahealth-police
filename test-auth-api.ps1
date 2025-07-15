# Test Authentication API - Mobile OTP Login
# Tests the complete mobile OTP authentication flow

Write-Host "=== TESTING MOBILE OTP AUTHENTICATION ===" -ForegroundColor Green

$baseUrl = "http://localhost:3100/api/auth"
$headers = @{'Content-Type' = 'application/json'}

# Test variables
$testPhone = "555-111-2222"  # Use a phone number from existing users
$invalidPhone = "123"
$invalidOtp = "123456"

Write-Host "`n📱 Testing Mobile OTP Authentication Flow" -ForegroundColor Cyan

# Test 1: Generate OTP with valid phone number
Write-Host "`n1. Testing OTP GENERATION with valid phone:" -ForegroundColor Yellow
$otpData = @{
    phone = $testPhone
} | ConvertTo-Json

try {
    $otpResponse = Invoke-RestMethod -Uri "$baseUrl/generate-otp" -Method POST -Headers $headers -Body $otpData
    Write-Host "✅ SUCCESS: OTP generated successfully" -ForegroundColor Green
    Write-Host "  Phone: $($otpResponse.data.phone)" -ForegroundColor White
    Write-Host "  OTP Expiry: $($otpResponse.data.otpExpiry)" -ForegroundColor White
    
    # Store OTP for verification test (only in development)
    $generatedOtp = $otpResponse.data.otp
    if ($generatedOtp) {
        Write-Host "  Generated OTP (dev mode): $generatedOtp" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ FAILED: OTP generation failed" -ForegroundColor Red
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "  Error: $($errorResponse.message)" -ForegroundColor Red
}

# Test 2: Generate OTP with invalid phone number
Write-Host "`n2. Testing OTP generation with INVALID phone:" -ForegroundColor Yellow
$invalidOtpData = @{
    phone = $invalidPhone
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/generate-otp" -Method POST -Headers $headers -Body $invalidOtpData
    Write-Host "❌ UNEXPECTED: Invalid phone was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*Invalid phone number*") {
        Write-Host "✅ SUCCESS: Invalid phone properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Unexpected error message" -ForegroundColor Red
    }
}

# Test 3: Generate OTP with missing phone number
Write-Host "`n3. Testing OTP generation with MISSING phone:" -ForegroundColor Yellow
$missingPhoneData = @{} | ConvertTo-Json

try {
    $missingResponse = Invoke-RestMethod -Uri "$baseUrl/generate-otp" -Method POST -Headers $headers -Body $missingPhoneData
    Write-Host "❌ UNEXPECTED: Missing phone was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*Phone number is required*") {
        Write-Host "✅ SUCCESS: Missing phone properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Unexpected error message" -ForegroundColor Red
    }
}

# Test 4: Generate OTP for non-existent user
Write-Host "`n4. Testing OTP generation for NON-EXISTENT user:" -ForegroundColor Yellow
$nonExistentData = @{
    phone = "999-999-9999"
} | ConvertTo-Json

try {
    $nonExistentResponse = Invoke-RestMethod -Uri "$baseUrl/generate-otp" -Method POST -Headers $headers -Body $nonExistentData
    Write-Host "❌ UNEXPECTED: Non-existent user was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*No user found*") {
        Write-Host "✅ SUCCESS: Non-existent user properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Unexpected error message" -ForegroundColor Red
    }
}

# Test 5: Verify OTP with correct OTP (if we have one)
if ($generatedOtp) {
    Write-Host "`n5. Testing OTP VERIFICATION with correct OTP:" -ForegroundColor Yellow
    $verifyData = @{
        phone = $testPhone
        otp = $generatedOtp
    } | ConvertTo-Json

    try {
        $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/verify-otp" -Method POST -Headers $headers -Body $verifyData
        Write-Host "✅ SUCCESS: OTP verification successful" -ForegroundColor Green
        Write-Host "  User: $($verifyResponse.data.user.name)" -ForegroundColor White
        Write-Host "  Role: $($verifyResponse.data.user.role)" -ForegroundColor White
        Write-Host "  Session Token: $($verifyResponse.data.session.token.Substring(0,8))..." -ForegroundColor White
        Write-Host "  Session Expires: $($verifyResponse.data.session.expiresAt)" -ForegroundColor White
        
        # Store session token for further tests
        $sessionToken = $verifyResponse.data.session.token
        
    } catch {
        Write-Host "❌ FAILED: OTP verification failed" -ForegroundColor Red
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor Red
    }
} else {
    Write-Host "`n5. Skipping OTP verification test (no OTP available)" -ForegroundColor Yellow
}

# Test 6: Verify OTP with incorrect OTP
Write-Host "`n6. Testing OTP verification with INCORRECT OTP:" -ForegroundColor Yellow
$wrongOtpData = @{
    phone = $testPhone
    otp = "999999"
} | ConvertTo-Json

try {
    $wrongOtpResponse = Invoke-RestMethod -Uri "$baseUrl/verify-otp" -Method POST -Headers $headers -Body $wrongOtpData
    Write-Host "❌ UNEXPECTED: Wrong OTP was accepted!" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.message -like "*Invalid or expired OTP*") {
        Write-Host "✅ SUCCESS: Wrong OTP properly rejected" -ForegroundColor Green
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
    } else {
        Write-Host "❌ FAILED: Unexpected error message" -ForegroundColor Red
    }
}

# Test 7: Validate session (if we have a session token)
if ($sessionToken) {
    Write-Host "`n7. Testing SESSION VALIDATION:" -ForegroundColor Yellow
    
    try {
        $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/validate-session?token=$sessionToken" -Method GET -Headers $headers
        Write-Host "✅ SUCCESS: Session validation successful" -ForegroundColor Green
        Write-Host "  User: $($sessionResponse.data.user.name)" -ForegroundColor White
        Write-Host "  Role: $($sessionResponse.data.user.role)" -ForegroundColor White
        
    } catch {
        Write-Host "❌ FAILED: Session validation failed" -ForegroundColor Red
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor Red
    }
} else {
    Write-Host "`n7. Skipping session validation test (no session token)" -ForegroundColor Yellow
}

# Test 8: Logout (if we have a session token)
if ($sessionToken) {
    Write-Host "`n8. Testing LOGOUT:" -ForegroundColor Yellow
    $logoutData = @{
        token = $sessionToken
    } | ConvertTo-Json

    try {
        $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/logout" -Method POST -Headers $headers -Body $logoutData
        Write-Host "✅ SUCCESS: Logout successful" -ForegroundColor Green
        Write-Host "  Message: $($logoutResponse.message)" -ForegroundColor White
        
    } catch {
        Write-Host "❌ FAILED: Logout failed" -ForegroundColor Red
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Error: $($errorResponse.message)" -ForegroundColor Red
    }

    # Test 9: Validate session after logout (should fail)
    Write-Host "`n9. Testing session validation AFTER logout (should fail):" -ForegroundColor Yellow
    
    try {
        $sessionAfterLogout = Invoke-RestMethod -Uri "$baseUrl/validate-session?token=$sessionToken" -Method GET -Headers $headers
        Write-Host "❌ UNEXPECTED: Session still valid after logout!" -ForegroundColor Red
    } catch {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorResponse.message -like "*Invalid or expired session*") {
            Write-Host "✅ SUCCESS: Session properly invalidated after logout" -ForegroundColor Green
            Write-Host "  Error: $($errorResponse.message)" -ForegroundColor White
        } else {
            Write-Host "❌ FAILED: Unexpected error message" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n8-9. Skipping logout tests (no session token)" -ForegroundColor Yellow
}

Write-Host "`n=== AUTHENTICATION TEST SUMMARY ===" -ForegroundColor Green
Write-Host "✅ OTP generation should work for valid users" -ForegroundColor Green
Write-Host "✅ Invalid phone numbers should be rejected" -ForegroundColor Green
Write-Host "✅ Non-existent users should be rejected" -ForegroundColor Green
Write-Host "✅ Correct OTP should allow login" -ForegroundColor Green
Write-Host "✅ Incorrect OTP should be rejected" -ForegroundColor Green
Write-Host "✅ Session validation should work for valid tokens" -ForegroundColor Green
Write-Host "✅ Logout should invalidate session" -ForegroundColor Green

Write-Host "`nAuthentication Endpoints:" -ForegroundColor Cyan
Write-Host "POST /api/auth/generate-otp     - Generate OTP for mobile" -ForegroundColor Cyan
Write-Host "POST /api/auth/verify-otp       - Verify OTP and login" -ForegroundColor Cyan
Write-Host "POST /api/auth/logout           - Logout user" -ForegroundColor Cyan
Write-Host "GET  /api/auth/validate-session - Validate session token" -ForegroundColor Cyan

Write-Host "`nNote: Make sure you have users in the database with active status to test with!" -ForegroundColor Yellow
