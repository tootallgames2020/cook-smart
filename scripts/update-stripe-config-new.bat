@echo off
setlocal enabledelayedexpansion

echo 💳 Cook Smart Stripe Configuration Update
echo =========================================
echo.
echo Server: 54.209.131.6 (ELASTIC IP)
echo Instance: i-0ad64147425a307ac
echo.

REM Get current timestamp for backup
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%%dt:~4,2%%dt:~6,2%_%dt:~8,2%%dt:~10,2%%dt:~12,2%"

REM Get Stripe keys from user
set /p SECRET_KEY="Enter Stripe Secret Key (or press Enter to skip): "
set /p PUBLISHABLE_KEY="Enter Stripe Publishable Key (or press Enter to skip): "
set /p WEBHOOK_SECRET="Enter Stripe Webhook Secret (or press Enter to skip): "

if "%SECRET_KEY%"=="" if "%PUBLISHABLE_KEY%"=="" if "%WEBHOOK_SECRET%"=="" (
    echo ❌ No keys provided. Exiting.
    pause
    exit /b 1
)

echo.
echo 🔑 Enabling SSH access...
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

if errorlevel 1 (
    echo ❌ Failed to enable SSH access
    pause
    exit /b 1
)

echo ✅ SSH access enabled
echo.

echo 💾 Creating backup...
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && cp .env .env.backup.%TIMESTAMP%"

if errorlevel 1 (
    echo ❌ Failed to create backup
    pause
    exit /b 1
)

REM Update keys if provided
if not "%SECRET_KEY%"=="" (
    echo 🔄 Updating secret key...
    ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=%SECRET_KEY%/g' .env"
    
    if errorlevel 1 (
        echo ❌ Failed to update secret key
        goto :restore_backup
    )
)

if not "%PUBLISHABLE_KEY%"=="" (
    echo 🔄 Updating publishable key...
    ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_PUBLISHABLE_KEY=.*/STRIPE_PUBLISHABLE_KEY=%PUBLISHABLE_KEY%/g' .env"
    
    if errorlevel 1 (
        echo ❌ Failed to update publishable key
        goto :restore_backup
    )
)

if not "%WEBHOOK_SECRET%"=="" (
    echo 🔄 Updating webhook secret...
    ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && sed -i 's/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET=%WEBHOOK_SECRET%/g' .env"
    
    if errorlevel 1 (
        echo ❌ Failed to update webhook secret
        goto :restore_backup
    )
)

echo ✅ Verifying updates...
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && grep '^STRIPE_' .env"

echo.
echo 🔄 Restarting backend service...
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 restart cook-smart-backend"

if errorlevel 1 (
    echo ❌ Failed to restart service
    goto :restore_backup
)

echo.
echo 🔍 Checking service status...
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 status cook-smart-backend | grep online"

if errorlevel 1 (
    echo ❌ Service is not running properly
    echo 📋 Checking logs...
    ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 logs cook-smart-backend --lines 10"
    goto :restore_backup
)

echo.
echo ✅ Stripe configuration updated successfully!
echo 🌐 Testing API...
curl -s https://api.cooksmartapp.com/health
echo.
pause
exit /b 0

:restore_backup
echo.
echo 🔄 Restoring backup due to error...
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && cp .env.backup.%TIMESTAMP% .env"
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 restart cook-smart-backend"
echo ❌ Update failed - configuration restored to previous state
pause
exit /b 1