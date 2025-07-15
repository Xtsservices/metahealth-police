# Simple Authentication Flow Example
# Shows how to use the mobile OTP authentication step by step

Write-Host "=== MOBILE OTP AUTHENTICATION FLOW EXAMPLE ===" -ForegroundColor Green

$baseUrl = "http://localhost:3100/api/auth"
$headers = @{'Content-Type' = 'application/json'}

# Use an existing user's phone number (from hospital registration)
$userPhone = "555-111-2222"  # Replace with actual user phone

Write-Host "`nStep 1: Generate OTP for mobile number" -ForegroundColor Cyan
Write-Host "POST $baseUrl/generate-otp" -ForegroundColor Gray

$otpRequest = @{
    phone = $userPhone
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $otpRequest -ForegroundColor White

try {
    $otpResponse = Invoke-RestMethod -Uri "$baseUrl/generate-otp" -Method POST -Headers $headers -Body $otpRequest
    
    Write-Host "`n✅ OTP Generated Successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $otpResponse | ConvertTo-Json -Depth 3
    
    $phoneNumber = $otpResponse.data.phone
    $otp = $otpResponse.data.otp  # Only available in development mode
    
    if ($otp) {
        Write-Host "`nStep 2: Verify OTP and Login" -ForegroundColor Cyan
        Write-Host "POST $baseUrl/verify-otp" -ForegroundColor Gray
        
        $verifyRequest = @{
            phone = $phoneNumber
            otp = $otp
        } | ConvertTo-Json
        
        Write-Host "Request Body:" -ForegroundColor Yellow
        Write-Host $verifyRequest -ForegroundColor White
        
        try {
            $loginResponse = Invoke-RestMethod -Uri "$baseUrl/verify-otp" -Method POST -Headers $headers -Body $verifyRequest
            
            Write-Host "`n✅ Login Successful!" -ForegroundColor Green
            Write-Host "Response:" -ForegroundColor Yellow
            $loginResponse | ConvertTo-Json -Depth 3
            
            $sessionToken = $loginResponse.data.session.token
            $userName = $loginResponse.data.user.name
            $userRole = $loginResponse.data.user.role
            
            Write-Host "`n👤 User Information:" -ForegroundColor Cyan
            Write-Host "  Name: $userName" -ForegroundColor White
            Write-Host "  Role: $userRole" -ForegroundColor White
            Write-Host "  Phone: $phoneNumber" -ForegroundColor White
            Write-Host "  Session Token: $($sessionToken.Substring(0,8))..." -ForegroundColor White
            
            # Step 3: Validate session
            Write-Host "`nStep 3: Validate Session" -ForegroundColor Cyan
            Write-Host "GET $baseUrl/validate-session?token=$($sessionToken.Substring(0,8))..." -ForegroundColor Gray
            
            try {
                $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/validate-session?token=$sessionToken" -Method GET -Headers $headers
                
                Write-Host "`n✅ Session Valid!" -ForegroundColor Green
                Write-Host "User is authenticated and can access protected resources" -ForegroundColor White
                
                # Step 4: Logout
                Write-Host "`nStep 4: Logout" -ForegroundColor Cyan
                Write-Host "POST $baseUrl/logout" -ForegroundColor Gray
                
                $logoutRequest = @{
                    token = $sessionToken
                } | ConvertTo-Json
                
                Write-Host "Request Body:" -ForegroundColor Yellow
                Write-Host $logoutRequest -ForegroundColor White
                
                try {
                    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/logout" -Method POST -Headers $headers -Body $logoutRequest
                    
                    Write-Host "`n✅ Logout Successful!" -ForegroundColor Green
                    Write-Host "Session has been invalidated" -ForegroundColor White
                    
                } catch {
                    Write-Host "`n❌ Logout Failed" -ForegroundColor Red
                    Write-Host $_.Exception.Message -ForegroundColor Red
                }
                
            } catch {
                Write-Host "`n❌ Session Validation Failed" -ForegroundColor Red
                Write-Host $_.Exception.Message -ForegroundColor Red
            }
            
        } catch {
            Write-Host "`n❌ OTP Verification Failed" -ForegroundColor Red
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error: $($errorResponse.message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "`n⚠️  OTP not available in response (production mode)" -ForegroundColor Yellow
        Write-Host "In production, OTP would be sent via SMS" -ForegroundColor Yellow
        Write-Host "You would need to manually enter the OTP received on your phone" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ OTP Generation Failed" -ForegroundColor Red
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($errorResponse.message)" -ForegroundColor Red
}

Write-Host "`n=== AUTHENTICATION FLOW COMPLETE ===" -ForegroundColor Green

Write-Host "`n📱 How to use in your application:" -ForegroundColor Cyan
Write-Host "1. Call generate-otp with user's phone number" -ForegroundColor White
Write-Host "2. User receives OTP via SMS (or in dev mode, from API response)" -ForegroundColor White
Write-Host "3. Call verify-otp with phone number and OTP" -ForegroundColor White
Write-Host "4. Store the session token for authenticated requests" -ForegroundColor White
Write-Host "5. Include session token in protected API calls" -ForegroundColor White
Write-Host "6. Call logout when user wants to sign out" -ForegroundColor White

Write-Host "`n🔐 Security Features:" -ForegroundColor Cyan
Write-Host "✅ OTP expires in 5 minutes" -ForegroundColor Green
Write-Host "✅ OTP can only be used once" -ForegroundColor Green
Write-Host "✅ Session tokens expire in 24 hours" -ForegroundColor Green
Write-Host "✅ Only active users can login" -ForegroundColor Green
Write-Host "✅ One session per user (new login invalidates old session)" -ForegroundColor Green
Write-Host "✅ Phone number validation and sanitization" -ForegroundColor Green
