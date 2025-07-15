# Test Default Super Admin Creation
# This script tests the automatic creation of a default super admin user

Write-Host "🧪 Testing Default Super Admin Creation" -ForegroundColor Yellow
Write-Host "=" * 50

$baseUrl = "http://localhost:3100"

# Test 1: Check if super admin was created automatically
Write-Host "`n1️⃣ Testing if super admin exists..." -ForegroundColor Cyan

try {
    # Generate OTP for the default super admin phone
    $defaultPhone = "+91-9999999999"
    
    $otpPayload = @{
        phone = $defaultPhone
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/generate-otp" -Method Post -Body $otpPayload -ContentType "application/json"
    
    if ($response.success -eq $true) {
        Write-Host "✅ Default super admin exists and can generate OTP" -ForegroundColor Green
        Write-Host "   Phone: $($response.data.phone)" -ForegroundColor Gray
        Write-Host "   OTP: $($response.data.otp)" -ForegroundColor Gray
        Write-Host "   Expires: $($response.data.expiresAt)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to generate OTP for default super admin" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Check phone existence
Write-Host "`n2️⃣ Testing phone existence check..." -ForegroundColor Cyan

try {
    $checkPayload = @{
        phone = "+91-9999999999"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/check-phone" -Method Post -Body $checkPayload -ContentType "application/json"
    
    if ($response.exists -eq $true) {
        Write-Host "✅ Phone exists in system" -ForegroundColor Green
        Write-Host "   Phone: $($response.user.phone)" -ForegroundColor Gray
        Write-Host "   Name: $($response.user.name)" -ForegroundColor Gray
        Write-Host "   Role: $($response.user.role)" -ForegroundColor Gray
        Write-Host "   Status: $($response.user.status)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to check phone existence" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Check non-existent phone
Write-Host "`n3️⃣ Testing non-existent phone..." -ForegroundColor Cyan

try {
    $checkPayload = @{
        phone = "+91-1234567890"  # Non-existent phone
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/check-phone" -Method Post -Body $checkPayload -ContentType "application/json"
    
    if ($response.exists -eq $false) {
        Write-Host "✅ Correctly identified non-existent phone" -ForegroundColor Green
        Write-Host "   Phone: +91-1234567890 does not exist" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to check non-existent phone" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get all users to verify default admin is in the list
Write-Host "`n4️⃣ Checking all users to verify default admin..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Get
    
    if ($response.success -eq $true) {
        $superAdmins = $response.data | Where-Object { $_.role -eq "super_admin" }
        
        if ($superAdmins.Count -gt 0) {
            Write-Host "✅ Found $($superAdmins.Count) super admin(s)" -ForegroundColor Green
            foreach ($admin in $superAdmins) {
                Write-Host "   👑 Super Admin:" -ForegroundColor Yellow
                Write-Host "      ID: $($admin.id)" -ForegroundColor Gray
                Write-Host "      Name: $($admin.name)" -ForegroundColor Gray
                Write-Host "      Phone: $($admin.phone)" -ForegroundColor Gray
                Write-Host "      Email: $($admin.email)" -ForegroundColor Gray
                Write-Host "      Status: $($admin.status)" -ForegroundColor Gray
                Write-Host "      Created: $($admin.created_date)" -ForegroundColor Gray
            }
        } else {
            Write-Host "❌ No super admin found in users list" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Failed to get users list" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 50
Write-Host "🏁 Default Super Admin Test Complete!" -ForegroundColor Yellow
Write-Host "`nDefault Super Admin Credentials:" -ForegroundColor Cyan
Write-Host "📱 Phone: +91-9999999999" -ForegroundColor Green
Write-Host "📧 Email: superadmin@metahealth.com" -ForegroundColor Green
Write-Host "👤 Name: Super Admin" -ForegroundColor Green
Write-Host "🔑 Role: super_admin" -ForegroundColor Green
Write-Host "`n💡 Use the phone number above to generate OTP and login!" -ForegroundColor Yellow
