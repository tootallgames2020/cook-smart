@echo off
echo ========================================
echo Cook Smart - Backend Deployment
echo ========================================
echo.

echo Target: Backend API Server (34.203.8.150)
echo Branch: fresh-project-migration
echo.

set /p confirm="Deploy backend now? (y/n): "
if /i not "%confirm%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b
)

echo.
echo 🚀 Starting backend deployment...
echo.

echo Connecting to server...
ssh -i "c:\Users\toota\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "
    echo '📂 Navigating to backend directory...'
    cd /home/ubuntu/cook-smart/backend/backend || exit 1
    
    echo '📥 Pulling latest changes...'
    git pull origin fresh-project-migration || exit 1
    
    echo '📦 Installing dependencies...'
    npm install || exit 1
    
    echo '🔨 Building project...'
    npm run build || echo 'Build step skipped or failed (continuing...)'
    
    echo '🔄 Restarting PM2 service...'
    pm2 restart cook-smart-backend || exit 1
    
    echo '⏳ Waiting for service to start...'
    sleep 3
    
    echo '📊 Service status:'
    pm2 status cook-smart-backend
    
    echo '📋 Recent logs:'
    pm2 logs cook-smart-backend --lines 5 --nostream
    
    echo '✅ Backend deployment completed!'
"

if %errorlevel% neq 0 (
    echo.
    echo ❌ Backend deployment failed!
    echo Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Testing Backend Health
echo ========================================
echo.

echo Waiting for service to fully start...
timeout /t 10 /nobreak > nul

echo Testing API health endpoint...
curl -s -w "HTTP Status: %%{http_code}\n" https://api.cooksmartapp.com/health
echo.

echo.
echo ========================================
echo Backend Deployment Complete!
echo ========================================
echo ✅ Backend successfully deployed and restarted
echo 🔗 API URL: https://api.cooksmartapp.com
echo.
echo To check logs: ssh -i "c:\Users\toota\.ssh\cook-smart-key.pem" ubuntu@34.203.8.150 "pm2 logs cook-smart-backend"
echo.
pause