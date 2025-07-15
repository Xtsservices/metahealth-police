# Test Server Startup with Default Super Admin
# This script tests the server startup process and default super admin creation

Write-Host "🚀 Testing Server Startup with Default Super Admin" -ForegroundColor Yellow
Write-Host "=" * 60

$baseUrl = "http://localhost:3100"

# Function to check if server is running
function Test-ServerRunning {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

# Check if server is already running
Write-Host "`n🔍 Checking if server is already running..." -ForegroundColor Cyan

if (Test-ServerRunning) {
    Write-Host "✅ Server is already running at $baseUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Server is not running. Please start the server first with:" -ForegroundColor Red
    Write-Host "   npm run dev" -ForegroundColor Yellow
    Write-Host "`n💡 Expected server startup logs should include:" -ForegroundColor Cyan
    Write-Host "   🔌 Testing database connection..." -ForegroundColor Gray
    Write-Host "   👑 Initializing default super admin..." -ForegroundColor Gray
    Write-Host "   ✅ Default Super Admin created successfully: OR" -ForegroundColor Gray
    Write-Host "   ℹ️  Super admin already exists:" -ForegroundColor Gray
    exit 1
}

# Test health endpoint
Write-Host "`n🏥 Testing health endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Database: $($response.database)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test default super admin existence
Write-Host "`n👑 Testing default super admin existence..." -ForegroundColor Cyan

try {
    $checkPayload = @{
        phone = "+91-9999999999"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/check-phone" -Method Post -Body $checkPayload -ContentType "application/json"
    
    if ($response.exists -eq $true -and $response.user.role -eq "super_admin") {
        Write-Host "✅ Default super admin exists and is properly configured" -ForegroundColor Green
        Write-Host "   👤 Name: $($response.user.name)" -ForegroundColor Gray
        Write-Host "   📱 Phone: $($response.user.phone)" -ForegroundColor Gray
        Write-Host "   📧 Email: $($response.user.email)" -ForegroundColor Gray
        Write-Host "   🔑 Role: $($response.user.role)" -ForegroundColor Gray
        Write-Host "   ✅ Status: $($response.user.status)" -ForegroundColor Gray
        
        # Test OTP generation for super admin
        Write-Host "`n🔐 Testing OTP generation for super admin..." -ForegroundColor Cyan
        
        try {
            $otpPayload = @{
                phone = "+91-9999999999"
            } | ConvertTo-Json

            $otpResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/generate-otp" -Method Post -Body $otpPayload -ContentType "application/json"
            
            if ($otpResponse.success -eq $true) {
                Write-Host "✅ OTP generated successfully for super admin" -ForegroundColor Green
                Write-Host "   📱 Phone: $($otpResponse.data.phone)" -ForegroundColor Gray
                Write-Host "   🔢 OTP: $($otpResponse.data.otp)" -ForegroundColor Yellow
                Write-Host "   ⏰ Expires: $($otpResponse.data.expiresAt)" -ForegroundColor Gray
                
                Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
                Write-Host "   1. Copy the OTP above: $($otpResponse.data.otp)" -ForegroundColor Yellow
                Write-Host "   2. Use it to verify and login via /api/auth/verify-otp" -ForegroundColor Yellow
                Write-Host "   3. Access super admin dashboard at /api/dashboard/stats" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Failed to generate OTP for super admin" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Default super admin not found or misconfigured" -ForegroundColor Red
        if ($response.exists -eq $false) {
            Write-Host "   Phone +91-9999999999 does not exist in system" -ForegroundColor Red
        } else {
            Write-Host "   User exists but role is: $($response.user.role)" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "❌ Failed to check default super admin" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test info endpoint
Write-Host "`n📋 Testing info endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/info" -Method Get
    Write-Host "✅ Info endpoint working" -ForegroundColor Green
    Write-Host "   Environment: $($response.environment)" -ForegroundColor Gray
    Write-Host "   Version: $($response.version)" -ForegroundColor Gray
    Write-Host "   Uptime: $($response.uptime)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Info endpoint failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60
Write-Host "🏁 Server Startup Test Complete!" -ForegroundColor Yellow

Write-Host "`n📝 Summary of Required Startup Behavior:" -ForegroundColor Cyan
Write-Host "   ✅ Server starts successfully" -ForegroundColor Green
Write-Host "   ✅ Database connection established" -ForegroundColor Green
Write-Host "   ✅ Default super admin created/verified" -ForegroundColor Green
Write-Host "   ✅ All API endpoints accessible" -ForegroundColor Green

Write-Host "`n🔑 Default Super Admin Credentials:" -ForegroundColor Yellow
Write-Host "   📱 Phone: +91-9999999999"
Write-Host "   📧 Email: superadmin@metahealth.com"
Write-Host "   👤 Name: Super Admin"
Write-Host "   🔑 Role: super_admin"
Write-Host "   ✅ Status: active"
