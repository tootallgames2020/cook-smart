@echo off
echo 📊 Cook Smart Backend Status Check
echo ==================================
echo.
echo Server: 54.209.131.6 (ELASTIC IP)
echo Instance: i-0ad64147425a307ac
echo.

REM Step 1: Enable SSH access
echo 🔑 Enabling SSH access...
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

if errorlevel 1 (
    echo ❌ Failed to enable SSH access
    pause
    exit /b 1
)

echo ✅ SSH access enabled
echo.

REM Step 2: Check PM2 status
echo 📋 PM2 Process Status:
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 status"

echo.
echo 📝 Recent Logs:
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 logs cook-smart-backend --lines 10"

echo.
echo 🌐 API Health Check:
curl -s https://api.cooksmartapp.com/health

echo.
echo 💾 Disk Usage:
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "df -h"

echo.
echo 🧠 Memory Usage:
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "free -h"

pause