@echo off
echo ========================================
echo Cook Smart - Complete Deployment
echo ========================================
echo.

echo This script will deploy both:
echo 1. Backend API (EC2 Server)
echo 2. Website (AWS Amplify)
echo.

set /p confirm="Continue with deployment? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b
)

echo.
echo ========================================
echo Step 1: Deploying Backend
echo ========================================
echo.

echo Connecting to backend server: 34.203.8.150
ssh -i "c:\Users\toota\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "cd /home/ubuntu/cook-smart/backend/backend && echo '🚀 Starting backend deployment...' && git pull origin fresh-project-migration && echo '📦 Installing dependencies...' && npm install && echo '🔄 Restarting service...' && pm2 restart cook-smart-backend && echo '✅ Backend deployed!' && pm2 status cook-smart-backend"

if %errorlevel% neq 0 (
    echo ❌ Backend deployment failed!
    pause
    exit /b 1
)

echo.
echo ✅ Backend deployment successful!
echo.

echo ========================================
echo Step 2: Deploying Website
echo ========================================
echo.

echo Starting AWS Amplify deployment...
aws amplify start-job --app-id d1766n6qply87y --branch-name fresh-project-migration --job-type RELEASE --query "jobSummary.[jobId,status]" --output table

if %errorlevel% neq 0 (
    echo ❌ Website deployment failed to start!
    pause
    exit /b 1
)

echo.
echo ✅ Website deployment started!
echo.

echo ========================================
echo Step 3: Verification
echo ========================================
echo.

echo Testing backend health...
timeout /t 5 /nobreak > nul
curl -s https://api.cooksmartapp.com/health
echo.
echo.

echo Checking website deployment status...
aws amplify list-jobs --app-id d1766n6qply87y --branch-name fresh-project-migration --max-results 1 --query "jobSummaries[0].[jobId,status,startTime]" --output table

echo.
echo ========================================
echo Deployment Summary
echo ========================================
echo ✅ Backend: Deployed and restarted
echo 🔄 Website: Deployment in progress (check in 3-5 minutes)
echo.
echo URLs:
echo 🔗 API: https://api.cooksmartapp.com
echo 🔗 Website: https://cooksmartapp.com
echo.
echo ========================================
echo Deployment Complete!
echo ========================================
pause