@echo off
echo 🚀 Cook Smart Backend Deployment
echo ================================
echo.
echo Server: 54.209.131.6 (ELASTIC IP)
echo Instance: i-0ad64147425a307ac
echo.

REM Step 1: Enable SSH access via EC2 Instance Connect
echo 🔑 Enabling SSH access...
aws ec2-instance-connect send-ssh-public-key --instance-id i-0ad64147425a307ac --instance-os-user ubuntu --ssh-public-key "$(ssh-keygen -y -f secrets/cook-smart-key.pem)"

if errorlevel 1 (
    echo ❌ Failed to enable SSH access
    echo Make sure AWS CLI is configured and you have permissions
    pause
    exit /b 1
)

echo ✅ SSH access enabled (valid for 60 seconds)
echo.

REM Step 2: Deploy backend
echo 📦 Deploying backend...
ssh -i secrets/cook-smart-key.pem -o StrictHostKeyChecking=no ubuntu@54.209.131.6 "cd /home/ubuntu/cook-smart/backend && git pull origin fresh-project-migration && npm run build && pm2 restart cook-smart-backend || pm2 start dist/server.js --name cook-smart-backend"

if errorlevel 1 (
    echo ❌ Deployment failed
    echo 📋 Checking logs...
    ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 logs cook-smart-backend --lines 20"
    pause
    exit /b 1
)

echo ✅ Deployment successful!
echo.

REM Step 3: Verify deployment
echo 🔍 Verifying deployment...
ssh -i secrets/cook-smart-key.pem ubuntu@54.209.131.6 "pm2 status cook-smart-backend"

echo.
echo 🌐 Testing API health...
curl -s https://api.cooksmartapp.com/health

echo.
echo ✅ Deployment complete!
echo 📱 API is ready at: https://api.cooksmartapp.com
pause