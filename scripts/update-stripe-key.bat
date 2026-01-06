@echo off
REM ============================================================================
REM Cook Smart - Stripe API Key Update Script
REM ============================================================================
REM This script updates the Stripe secret key on the production server
REM Usage: update-stripe-key.bat [new_stripe_key]
REM ============================================================================

setlocal enabledelayedexpansion

REM Check if new key is provided
if "%1"=="" (
    echo.
    echo ❌ ERROR: Stripe key is required
    echo.
    echo Usage: update-stripe-key.bat [new_stripe_key]
    echo Example: update-stripe-key.bat sk_live_51SRkHl...
    echo.
    pause
    exit /b 1
)

set NEW_KEY=%1

REM Validate key format
echo %NEW_KEY% | findstr /r "^sk_live_" >nul
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Invalid Stripe key format
    echo Key must start with 'sk_live_'
    echo.
    pause
    exit /b 1
)

echo.
echo 🔑 Cook Smart - Stripe Key Update
echo ================================
echo.
echo Server: 3.238.250.151
echo New Key: %NEW_KEY:~0,20%...%NEW_KEY:~-4%
echo.

REM Confirm update
set /p CONFIRM="Continue with update? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Update cancelled.
    pause
    exit /b 0
)

echo.
echo 📡 Connecting to server...

REM Step 1: Backup current .env file
echo 💾 Creating backup...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && cp .env .env.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
if errorlevel 1 (
    echo ❌ Failed to create backup
    pause
    exit /b 1
)

REM Step 2: Update the Stripe key
echo 🔄 Updating Stripe key...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=%NEW_KEY%/g' .env"
if errorlevel 1 (
    echo ❌ Failed to update key
    echo 🔄 Restoring backup...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && cp .env.backup.* .env"
    pause
    exit /b 1
)

REM Step 3: Verify the update
echo ✅ Verifying update...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && grep 'STRIPE_SECRET_KEY=%NEW_KEY%' .env" >nul
if errorlevel 1 (
    echo ❌ Verification failed - key not found in .env
    echo 🔄 Restoring backup...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && cp .env.backup.* .env"
    pause
    exit /b 1
)

REM Step 4: Restart backend service
echo 🔄 Restarting backend service...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 restart cook-smart-backend"
if errorlevel 1 (
    echo ❌ Failed to restart service
    pause
    exit /b 1
)

REM Step 5: Wait for service to start
echo ⏳ Waiting for service to start...
timeout /t 5 /nobreak >nul

REM Step 6: Check service status
echo 🔍 Checking service status...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 status cook-smart-backend | grep online"
if errorlevel 1 (
    echo ❌ Service is not running properly
    echo 📋 Checking logs...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 logs cook-smart-backend --lines 10"
    pause
    exit /b 1
)

REM Step 7: Test API health
echo 🏥 Testing API health...
curl -s https://api.cooksmartapp.com/health | findstr "OK" >nul
if errorlevel 1 (
    echo ⚠️  API health check failed, but service is running
    echo This might be normal during startup
) else (
    echo ✅ API is responding correctly
)

echo.
echo 🎉 SUCCESS: Stripe key updated successfully!
echo ================================
echo.
echo ✅ Backup created
echo ✅ Key updated in .env file  
echo ✅ Backend service restarted
echo ✅ Service is running
echo.
echo 💡 Next steps:
echo 1. Test a payment transaction
echo 2. Check Stripe dashboard for activity
echo 3. Monitor logs for any issues
echo.
echo 📋 Backup location: /home/ubuntu/cook-smart/backend/.env.backup.*
echo.
pause