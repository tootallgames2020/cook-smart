@echo off
REM ============================================================================
REM Cook Smart - Complete Stripe Configuration Update Script
REM ============================================================================
REM This script updates all Stripe-related keys on the production server
REM Usage: update-stripe-config.bat
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo 🔑 Cook Smart - Stripe Configuration Update
echo ==========================================
echo.

REM Get current keys from user
echo Enter your Stripe keys (leave blank to skip):
echo.

set /p SECRET_KEY="Secret Key (sk_live_...): "
set /p PUBLISHABLE_KEY="Publishable Key (pk_live_...): "
set /p WEBHOOK_SECRET="Webhook Secret (whsec_...): "

REM Validate at least one key is provided
if "%SECRET_KEY%"=="" if "%PUBLISHABLE_KEY%"=="" if "%WEBHOOK_SECRET%"=="" (
    echo.
    echo ❌ ERROR: At least one key must be provided
    echo.
    pause
    exit /b 1
)

echo.
echo 📋 Update Summary:
echo ================

if not "%SECRET_KEY%"=="" (
    echo Secret Key: %SECRET_KEY:~0,20%...%SECRET_KEY:~-4%
    REM Validate secret key format
    echo %SECRET_KEY% | findstr /r "^sk_live_" >nul
    if errorlevel 1 (
        echo ❌ ERROR: Invalid secret key format (must start with sk_live_)
        pause
        exit /b 1
    )
)

if not "%PUBLISHABLE_KEY%"=="" (
    echo Publishable Key: %PUBLISHABLE_KEY:~0,20%...%PUBLISHABLE_KEY:~-4%
    REM Validate publishable key format
    echo %PUBLISHABLE_KEY% | findstr /r "^pk_live_" >nul
    if errorlevel 1 (
        echo ❌ ERROR: Invalid publishable key format (must start with pk_live_)
        pause
        exit /b 1
    )
)

if not "%WEBHOOK_SECRET%"=="" (
    echo Webhook Secret: %WEBHOOK_SECRET:~0,10%...%WEBHOOK_SECRET:~-4%
    REM Validate webhook secret format
    echo %WEBHOOK_SECRET% | findstr /r "^whsec_" >nul
    if errorlevel 1 (
        echo ❌ ERROR: Invalid webhook secret format (must start with whsec_)
        pause
        exit /b 1
    )
)

echo.
set /p CONFIRM="Continue with update? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Update cancelled.
    pause
    exit /b 0
)

echo.
echo 📡 Connecting to server...

REM Create timestamped backup
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo 💾 Creating backup...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && cp .env .env.backup.%TIMESTAMP%"
if errorlevel 1 (
    echo ❌ Failed to create backup
    pause
    exit /b 1
)

REM Update keys one by one
if not "%SECRET_KEY%"=="" (
    echo 🔄 Updating secret key...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=%SECRET_KEY%/g' .env"
    if errorlevel 1 (
        echo ❌ Failed to update secret key
        goto :restore_backup
    )
)

if not "%PUBLISHABLE_KEY%"=="" (
    echo 🔄 Updating publishable key...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_PUBLISHABLE_KEY=.*/STRIPE_PUBLISHABLE_KEY=%PUBLISHABLE_KEY%/g' .env"
    if errorlevel 1 (
        echo ❌ Failed to update publishable key
        goto :restore_backup
    )
)

if not "%WEBHOOK_SECRET%"=="" (
    echo 🔄 Updating webhook secret...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=%WEBHOOK_SECRET%/g' .env"
    if errorlevel 1 (
        echo ❌ Failed to update webhook secret
        goto :restore_backup
    )
)

echo ✅ Verifying updates...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && grep '^STRIPE_' .env"

echo 🔄 Restarting backend service...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 restart cook-smart-backend"
if errorlevel 1 (
    echo ❌ Failed to restart service
    goto :restore_backup
)

echo ⏳ Waiting for service to start...
timeout /t 5 /nobreak >nul

echo 🔍 Checking service status...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 status cook-smart-backend | grep online"
if errorlevel 1 (
    echo ❌ Service is not running properly
    echo 📋 Checking logs...
    ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 logs cook-smart-backend --lines 10"
    goto :restore_backup
)

echo 🏥 Testing API health...
curl -s https://api.cooksmartapp.com/health | findstr "OK" >nul
if errorlevel 1 (
    echo ⚠️  API health check failed, but service is running
) else (
    echo ✅ API is responding correctly
)

echo.
echo 🎉 SUCCESS: Stripe configuration updated successfully!
echo ================================================
echo.
echo ✅ Configuration backup created
echo ✅ Stripe keys updated
echo ✅ Backend service restarted
echo ✅ Service is running
echo.
echo 💡 Next steps:
echo 1. Test payment functionality
echo 2. Verify webhook endpoints in Stripe dashboard
echo 3. Monitor logs for any issues
echo.
echo 📋 Backup: /home/ubuntu/cook-smart/backend/.env.backup.%TIMESTAMP%
echo.
pause
exit /b 0

:restore_backup
echo.
echo 🔄 Restoring backup due to error...
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "cd /home/ubuntu/cook-smart/backend && cp .env.backup.%TIMESTAMP% .env"
ssh -i cook-smart-fixed.pem ubuntu@3.238.250.151 "pm2 restart cook-smart-backend"
echo ❌ Update failed - configuration restored to previous state
pause
exit /b 1